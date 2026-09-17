/*
  Normalize storyboard V2 payloads so each shot carries generate-contract fields:
  - destination
  - character_shot
*/

CREATE OR REPLACE FUNCTION public.normalize_storyboard_v2_shots()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  payload jsonb;
  normalized_shots jsonb;
  board_destination text;
BEGIN
  IF NEW.shots IS NULL OR btrim(NEW.shots) = '' THEN
    RETURN NEW;
  END IF;

  BEGIN
    payload := NEW.shots::jsonb;
  EXCEPTION
    WHEN others THEN
      RETURN NEW;
  END;

  IF jsonb_typeof(payload) <> 'object'
     OR NOT (payload ? 'shots')
     OR jsonb_typeof(payload->'shots') <> 'array' THEN
    RETURN NEW;
  END IF;

  board_destination := nullif(btrim(payload->>'destination'), '');

  SELECT jsonb_agg(
    CASE
      WHEN jsonb_typeof(shot) = 'object' THEN
        jsonb_set(
          jsonb_set(
            jsonb_set(
              shot,
              '{destination}',
              to_jsonb(
                coalesce(
                  nullif(btrim(shot->>'destination'), ''),
                  board_destination,
                  'other'
                )
              ),
              true
            ),
            '{character_shot}',
            to_jsonb(derived.character_flag),
            true
          ),
          '{characterShot}',
          to_jsonb(derived.character_flag),
          true
        )
      ELSE shot
    END
  )
  INTO normalized_shots
  FROM jsonb_array_elements(payload->'shots') AS t(shot)
  LEFT JOIN LATERAL (
    SELECT
      CASE
        WHEN shot ? 'character_shot' AND jsonb_typeof(shot->'character_shot') = 'boolean'
          THEN (shot->>'character_shot')::boolean
        WHEN shot ? 'characterShot' AND jsonb_typeof(shot->'characterShot') = 'boolean'
          THEN (shot->>'characterShot')::boolean
        ELSE (
          nullif(btrim(shot->>'character'), '') IS NOT NULL
          OR nullif(btrim(shot->>'subject'), '') IS NOT NULL
          OR nullif(btrim(shot->>'speaker'), '') IS NOT NULL
          OR (
            shot ? 'characters'
            AND jsonb_typeof(shot->'characters') = 'array'
            AND jsonb_array_length(shot->'characters') > 0
          )
        )
      END AS character_flag
  ) AS derived ON jsonb_typeof(shot) = 'object';

  payload := jsonb_set(payload, '{shots}', coalesce(normalized_shots, '[]'::jsonb), false);
  NEW.shots := payload::text;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS jobs_storyboard_v2_normalize ON public.jobs;
CREATE TRIGGER jobs_storyboard_v2_normalize
BEFORE INSERT OR UPDATE OF shots ON public.jobs
FOR EACH ROW
EXECUTE FUNCTION public.normalize_storyboard_v2_shots();

COMMENT ON FUNCTION public.normalize_storyboard_v2_shots() IS
  'Normalizes storyboard V2 JSON in jobs.shots so each shot carries destination and character_shot required by generate contract V2.';
