/*
  Renderer commissioning wiring:
  - Ensure end-to-end renderer path contract is present on Moonshadow Editor.
  - Configure output formats for clips, reels, and long-form.
  - Ensure these production lanes exist in Content Factory.
*/

UPDATE public.dock_machines
SET
  capabilities = (
    SELECT array_agg(cap ORDER BY cap)
    FROM (
      SELECT DISTINCT cap
      FROM unnest(
        coalesce(dock_machines.capabilities, ARRAY[]::text[])
        || ARRAY[
          'RENDER_ART_FRAME',
          'RENDER_CLIP',
          'RENDER_REEL',
          'RENDER_LONG_FORM'
        ]::text[]
      ) AS cap
    ) deduped
  ),
  accepted_inputs = (
    SELECT array_agg(input_name ORDER BY input_name)
    FROM (
      SELECT DISTINCT input_name
      FROM unnest(
        coalesce(dock_machines.accepted_inputs, ARRAY[]::text[])
        || ARRAY[
          'effects_packet',
          'render_mode',
          'timeline',
          'duration_seconds',
          'aspect_ratio'
        ]::text[]
      ) AS input_name
    ) deduped
  ),
  produced_outputs = (
    SELECT array_agg(output_name ORDER BY output_name)
    FROM (
      SELECT DISTINCT output_name
      FROM unnest(
        coalesce(dock_machines.produced_outputs, ARRAY[]::text[])
        || ARRAY[
          'art_frame',
          'clip_render',
          'reel_render',
          'long_form_render'
        ]::text[]
      ) AS output_name
    ) deduped
  ),
  notes = trim(both from concat_ws(' ', dock_machines.notes, 'Renderer path contract commissioned: idea → plan → create → render art/clip/reel/long-form → package → publish evidence.')),
  manifest = jsonb_set(
    jsonb_set(
      jsonb_set(
        coalesce(dock_machines.manifest, '{}'::jsonb),
        '{what_can_do}',
        (
          SELECT to_jsonb(array_agg(item ORDER BY item))
          FROM (
            SELECT DISTINCT item
            FROM jsonb_array_elements_text(coalesce(dock_machines.manifest->'what_can_do', '[]'::jsonb)) e(item)
            UNION
            SELECT unnest(ARRAY[
              'Render art frames',
              'Render clips',
              'Render reels',
              'Render long-form masters'
            ]::text[])
          ) s
        )
      ),
      '{what_accepts}',
      (
        SELECT to_jsonb(array_agg(item ORDER BY item))
        FROM (
          SELECT DISTINCT item
          FROM jsonb_array_elements_text(coalesce(dock_machines.manifest->'what_accepts', '[]'::jsonb)) e(item)
          UNION
          SELECT unnest(ARRAY[
            'Effects packet',
            'Render mode',
            'Timeline',
            'Duration seconds',
            'Aspect ratio'
          ]::text[])
        ) s
      )
    ),
    '{what_returns}',
    (
      SELECT to_jsonb(array_agg(item ORDER BY item))
      FROM (
        SELECT DISTINCT item
        FROM jsonb_array_elements_text(coalesce(dock_machines.manifest->'what_returns', '[]'::jsonb)) e(item)
        UNION
        SELECT unnest(ARRAY[
          'Art frame',
          'Clip render',
          'Reel render',
          'Long-form render'
        ]::text[])
      ) s
    )
  )
WHERE id = 'moonshadow-editor';

INSERT INTO public.factory_lanes (name, position)
SELECT lane_name, lane_position
FROM (
  VALUES
    ('Clips', 20),
    ('Reels', 21),
    ('Long Form', 22)
) AS lanes(lane_name, lane_position)
WHERE NOT EXISTS (
  SELECT 1 FROM public.factory_lanes existing WHERE existing.name = lanes.lane_name
);
