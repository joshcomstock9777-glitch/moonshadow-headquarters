/*
  Mark house social promotion connections as Path-routed (metadata only).
  Auth and connected status remain fail-closed until backend evidence exists.
*/

UPDATE public.connections
SET
  detail = CASE
    WHEN detail IS NULL OR btrim(detail) = '' THEN
      'Path-proven social promotion route via Moonshadow Path is configured. Platform credentials must be set server-side before this connection can be treated as connected.'
    WHEN detail ILIKE '%House-level % promotion route%'
      OR detail ILIKE '%House-level YouTube publishing + promotion route%'
      OR detail ILIKE '%Single control point for cross-platform publishing and promotion routing%'
    THEN
      'Path-proven social promotion route via Moonshadow Path is configured. Platform credentials must be set server-side before this connection can be treated as connected.'
    ELSE detail
  END
WHERE id IN (
  'social-promotion-hub',
  'youtube-comedy-house', 'youtube-horror-house', 'youtube-technology-house', 'youtube-financial-house', 'youtube-kids-house', 'youtube-music-video-house',
  'instagram-comedy-house', 'instagram-horror-house', 'instagram-technology-house', 'instagram-financial-house', 'instagram-kids-house', 'instagram-music-video-house',
  'facebook-comedy-house', 'facebook-horror-house', 'facebook-technology-house', 'facebook-financial-house', 'facebook-kids-house', 'facebook-music-video-house',
  'tiktok-comedy-house', 'tiktok-horror-house', 'tiktok-technology-house', 'tiktok-financial-house', 'tiktok-kids-house', 'tiktok-music-video-house',
  'x-comedy-house', 'x-horror-house', 'x-technology-house', 'x-financial-house', 'x-kids-house', 'x-music-video-house'
);
