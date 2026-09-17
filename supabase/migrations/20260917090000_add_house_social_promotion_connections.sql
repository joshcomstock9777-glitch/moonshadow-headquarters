/*
  Add per-house publishing and social promotion connections.
  One row per platform per house keeps auth and health evidence isolated.
*/

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.connections
    WHERE id IN (
      'social-promotion-hub',
      'youtube-comedy-house', 'youtube-horror-house', 'youtube-technology-house', 'youtube-financial-house', 'youtube-kids-house', 'youtube-music-video-house',
      'instagram-comedy-house', 'instagram-horror-house', 'instagram-technology-house', 'instagram-financial-house', 'instagram-kids-house', 'instagram-music-video-house',
      'facebook-comedy-house', 'facebook-horror-house', 'facebook-technology-house', 'facebook-financial-house', 'facebook-kids-house', 'facebook-music-video-house',
      'tiktok-comedy-house', 'tiktok-horror-house', 'tiktok-technology-house', 'tiktok-financial-house', 'tiktok-kids-house', 'tiktok-music-video-house',
      'x-comedy-house', 'x-horror-house', 'x-technology-house', 'x-financial-house', 'x-kids-house', 'x-music-video-house'
    )
      AND category IS DISTINCT FROM 'publishing'
  ) THEN
    RAISE EXCEPTION 'House publishing connection IDs already exist under a non-publishing category; resolve conflicts before applying this migration.';
  END IF;
END;
$$;

INSERT INTO public.connections (id, name, category, status, detail)
VALUES
  ('social-promotion-hub', 'Social Promotion Hub', 'publishing', 'needs-auth', 'Single control point for cross-platform publishing and promotion routing. Configure provider credentials server-side.'),

  ('youtube-comedy-house', 'YouTube — Comedy House', 'publishing', 'needs-auth', 'House-level YouTube publishing + promotion route for Comedy House.'),
  ('youtube-horror-house', 'YouTube — Horror House', 'publishing', 'needs-auth', 'House-level YouTube publishing + promotion route for Horror House.'),
  ('youtube-technology-house', 'YouTube — Technology House', 'publishing', 'needs-auth', 'House-level YouTube publishing + promotion route for Technology House.'),
  ('youtube-financial-house', 'YouTube — Financial House', 'publishing', 'needs-auth', 'House-level YouTube publishing + promotion route for Financial House including fraud-prevention content.'),
  ('youtube-kids-house', 'YouTube — Kids House', 'publishing', 'needs-auth', 'House-level YouTube publishing + promotion route for Kids House with child-safe requirements.'),
  ('youtube-music-video-house', 'YouTube — Music Video House', 'publishing', 'needs-auth', 'House-level YouTube publishing + promotion route for Music Video House.'),

  ('instagram-comedy-house', 'Instagram — Comedy House', 'publishing', 'needs-auth', 'House-level Instagram promotion route for Comedy House clips/reels.'),
  ('instagram-horror-house', 'Instagram — Horror House', 'publishing', 'needs-auth', 'House-level Instagram promotion route for Horror House clips/reels.'),
  ('instagram-technology-house', 'Instagram — Technology House', 'publishing', 'needs-auth', 'House-level Instagram promotion route for Technology House clips/reels.'),
  ('instagram-financial-house', 'Instagram — Financial House', 'publishing', 'needs-auth', 'House-level Instagram promotion route for Financial House clips/reels.'),
  ('instagram-kids-house', 'Instagram — Kids House', 'publishing', 'needs-auth', 'House-level Instagram promotion route for Kids House clips/reels.'),
  ('instagram-music-video-house', 'Instagram — Music Video House', 'publishing', 'needs-auth', 'House-level Instagram promotion route for Music Video House clips/reels.'),

  ('facebook-comedy-house', 'Facebook — Comedy House', 'publishing', 'needs-auth', 'House-level Facebook promotion route for Comedy House.'),
  ('facebook-horror-house', 'Facebook — Horror House', 'publishing', 'needs-auth', 'House-level Facebook promotion route for Horror House.'),
  ('facebook-technology-house', 'Facebook — Technology House', 'publishing', 'needs-auth', 'House-level Facebook promotion route for Technology House.'),
  ('facebook-financial-house', 'Facebook — Financial House', 'publishing', 'needs-auth', 'House-level Facebook promotion route for Financial House including fraud-prevention content.'),
  ('facebook-kids-house', 'Facebook — Kids House', 'publishing', 'needs-auth', 'House-level Facebook promotion route for Kids House.'),
  ('facebook-music-video-house', 'Facebook — Music Video House', 'publishing', 'needs-auth', 'House-level Facebook promotion route for Music Video House.'),

  ('tiktok-comedy-house', 'TikTok — Comedy House', 'publishing', 'needs-auth', 'House-level TikTok promotion route for Comedy House clips/reels.'),
  ('tiktok-horror-house', 'TikTok — Horror House', 'publishing', 'needs-auth', 'House-level TikTok promotion route for Horror House clips/reels.'),
  ('tiktok-technology-house', 'TikTok — Technology House', 'publishing', 'needs-auth', 'House-level TikTok promotion route for Technology House clips/reels.'),
  ('tiktok-financial-house', 'TikTok — Financial House', 'publishing', 'needs-auth', 'House-level TikTok promotion route for Financial House clips/reels.'),
  ('tiktok-kids-house', 'TikTok — Kids House', 'publishing', 'needs-auth', 'House-level TikTok promotion route for Kids House clips/reels.'),
  ('tiktok-music-video-house', 'TikTok — Music Video House', 'publishing', 'needs-auth', 'House-level TikTok promotion route for Music Video House clips/reels.'),

  ('x-comedy-house', 'X — Comedy House', 'publishing', 'needs-auth', 'House-level X promotion route for Comedy House.'),
  ('x-horror-house', 'X — Horror House', 'publishing', 'needs-auth', 'House-level X promotion route for Horror House.'),
  ('x-technology-house', 'X — Technology House', 'publishing', 'needs-auth', 'House-level X promotion route for Technology House.'),
  ('x-financial-house', 'X — Financial House', 'publishing', 'needs-auth', 'House-level X promotion route for Financial House including fraud-prevention content.'),
  ('x-kids-house', 'X — Kids House', 'publishing', 'needs-auth', 'House-level X promotion route for Kids House.'),
  ('x-music-video-house', 'X — Music Video House', 'publishing', 'needs-auth', 'House-level X promotion route for Music Video House.')
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  status = CASE
    WHEN connections.status IN ('connected', 'ready-to-connect', 'development') THEN connections.status
    ELSE EXCLUDED.status
  END,
  detail = CASE
    WHEN connections.status IN ('connected', 'ready-to-connect', 'development')
      AND connections.detail IS NOT NULL
      AND btrim(connections.detail) <> ''
    THEN connections.detail
    ELSE EXCLUDED.detail
  END;
