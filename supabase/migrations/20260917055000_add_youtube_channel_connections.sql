-- Add channel-level YouTube publishing connection rows.
-- These rows allow Headquarters to track auth/health per channel.

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
