/*
  Commission Moonshadow Editor concierge capabilities and operating modes.
  Modes:
  - Do With You
  - Teach You
  - Do It Himself
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
          'CONCIERGE_DO_WITH_YOU',
          'CONCIERGE_TEACH_YOU',
          'CONCIERGE_DO_FOR_YOU',
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
        || ARRAY['concierge_mode', 'lesson_goal', 'effects_packet']::text[]
      ) AS input_name
    ) deduped
  ),
  produced_outputs = (
    SELECT array_agg(output_name ORDER BY output_name)
    FROM (
      SELECT DISTINCT output_name
      FROM unnest(
        coalesce(dock_machines.produced_outputs, ARRAY[]::text[])
        || ARRAY['guided_edit', 'lesson_walkthrough', 'autonomous_edit']::text[]
      ) AS output_name
    ) deduped
  ),
  notes = trim(both from concat_ws(' ', dock_machines.notes, 'Editor concierge commissioned with three modes: do with you, teach you, and do it himself; packet/effects chains supported through render instructions.')),
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
              'Concierge do-with-you editing',
              'Concierge teach-you training',
              'Concierge autonomous editing',
              'Apply packet effects chains'
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
          SELECT unnest(ARRAY['Concierge mode', 'Lesson goal', 'Effects packet']::text[])
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
        SELECT unnest(ARRAY['Guided edit', 'Lesson walkthrough', 'Autonomous edit']::text[])
      ) s
    )
  )
WHERE id = 'moonshadow-editor';
