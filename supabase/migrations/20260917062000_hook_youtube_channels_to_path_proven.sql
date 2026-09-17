/*
  Hook YouTube channel connections to the Moonshadow Path-proven publisher route.

  These rows remain fail-closed: they are only moved to ready-to-connect because
  the route contract is known, while final connected state still requires trusted
  backend evidence after real publish confirmation.
*/

UPDATE public.connections
SET
  status = CASE
    WHEN status = 'needs-auth' THEN 'ready-to-connect'
    ELSE status
  END,
  detail = CASE
    WHEN detail IS NULL OR btrim(detail) = '' THEN
      'Path-proven publisher route via Moonshadow Path is configured. Channel OAuth/API credentials must be set server-side before trusted publish confirmation can promote this connection to connected.'
    WHEN detail ILIKE '%OAuth/API credentials required for the%'
      OR detail ILIKE '%OAuth to publish videos and manage uploads.%'
      OR detail ILIKE '%Shared YouTube publisher integration boundary%'
    THEN
      'Path-proven publisher route via Moonshadow Path is configured. Channel OAuth/API credentials must be set server-side before trusted publish confirmation can promote this connection to connected.'
    ELSE detail
  END
WHERE id = 'youtube' OR id LIKE 'youtube-%';
