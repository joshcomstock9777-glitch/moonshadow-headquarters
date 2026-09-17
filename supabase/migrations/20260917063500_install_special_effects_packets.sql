/*
  Install special-effects packet capabilities on Skin Studio.
  Packets installed:
  - NSFW effects packet
  - Blood & Gore packet
  - Explosion packet
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
          'APPLY_NSFW_EFFECTS_PACKET',
          'APPLY_BLOOD_GORE_PACKET',
          'APPLY_EXPLOSION_PACKET'
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
        || ARRAY['effects_packet']::text[]
      ) AS input_name
    ) deduped
  ),
  produced_outputs = (
    SELECT array_agg(output_name ORDER BY output_name)
    FROM (
      SELECT DISTINCT output_name
      FROM unnest(
        coalesce(dock_machines.produced_outputs, ARRAY[]::text[])
        || ARRAY['effects_composite']::text[]
      ) AS output_name
    ) deduped
  ),
  notes = 'Special-effects packets installed: NSFW, Blood & Gore, Explosion. Keep fail-closed publishing and route final outputs through trusted Path/Publisher evidence.',
  manifest = jsonb_set(
    jsonb_set(
      jsonb_set(
        coalesce(dock_machines.manifest, '{}'::jsonb),
        '{what_can_do}',
        to_jsonb(ARRAY[
          'Generate images from text',
          'Edit existing images',
          'Version history',
          'Apply NSFW effects packet',
          'Apply blood & gore packet',
          'Apply explosion packet'
        ]::text[])
      ),
      '{what_accepts}',
      to_jsonb(ARRAY[
        'Prompt',
        'Style',
        'Format',
        'Reference image',
        'Effects packet'
      ]::text[])
    ),
    '{what_returns}',
    to_jsonb(ARRAY['Image file', 'Image URL', 'Effects composite']::text[])
  )
WHERE id = 'skin-studio';
