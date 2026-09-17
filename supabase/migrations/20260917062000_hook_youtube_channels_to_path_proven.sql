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
  detail = 'Path-proven publisher route via Moonshadow Path is configured. Channel OAuth/API credentials must be set server-side before trusted publish confirmation can promote this connection to connected.'
WHERE id = 'youtube' OR id LIKE 'youtube-%';
