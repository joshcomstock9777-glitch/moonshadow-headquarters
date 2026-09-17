-- Add channel-level YouTube publishing connection rows.
-- These rows allow Headquarters to track auth/health per channel.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.connections
    WHERE id IN (
      'youtube',
      'youtube-moonshadow',
      'youtube-kimmy',
      'youtube-comedy-studio',
      'youtube-story-culture-studio',
      'youtube-idea-lab'
    )
      AND category IS DISTINCT FROM 'publishing'
  ) THEN
    RAISE EXCEPTION 'YouTube connection IDs already exist in a non-publishing category; resolve those conflicting rows before applying this migration.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.connections
    WHERE id IN (
      'youtube',
      'youtube-moonshadow',
      'youtube-kimmy',
      'youtube-comedy-studio',
      'youtube-story-culture-studio',
      'youtube-idea-lab'
    )
      AND category = 'publishing'
      AND name NOT ILIKE '%YouTube%'
  ) THEN
    RAISE EXCEPTION 'A publishing connection with a YouTube channel ID has a non-YouTube name; resolve the conflicting row before applying this migration.';
  END IF;
END;
$$;

INSERT INTO connections (id, name, category, status, detail) VALUES
  ('youtube', 'YouTube (Shared Publisher)', 'publishing', 'needs-auth', 'Shared YouTube publisher integration boundary. Configure channel-level credentials and verification before enabling publish.'),
  ('youtube-moonshadow', 'YouTube — Moonshadow', 'publishing', 'needs-auth', 'OAuth/API credentials required for the Moonshadow channel publisher.'),
  ('youtube-kimmy', 'YouTube — Kimmy', 'publishing', 'needs-auth', 'OAuth/API credentials required for the Kimmy channel publisher.'),
  ('youtube-comedy-studio', 'YouTube — Comedy Studio', 'publishing', 'needs-auth', 'OAuth/API credentials required for the Comedy Studio channel publisher.'),
  ('youtube-story-culture-studio', 'YouTube — Story Culture Studio', 'publishing', 'needs-auth', 'OAuth/API credentials required for the Story Culture Studio channel publisher.'),
  ('youtube-idea-lab', 'YouTube — Idea Lab', 'publishing', 'needs-auth', 'OAuth/API credentials required for the Idea Lab channel publisher.')
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  status = CASE
    WHEN connections.category = 'publishing'
      AND connections.status IN ('connected', 'ready-to-connect', 'development')
    THEN connections.status
    ELSE EXCLUDED.status
  END,
  detail = CASE
    WHEN connections.category = 'publishing'
      AND connections.status IN ('connected', 'ready-to-connect', 'development')
      AND connections.detail IS NOT NULL
      AND btrim(connections.detail) <> ''
    THEN connections.detail
    ELSE EXCLUDED.detail
  END;
