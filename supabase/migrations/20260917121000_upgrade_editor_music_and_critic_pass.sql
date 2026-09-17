/*
  Extend Moonshadow Editor concierge with critic pass and music instrument workflows.
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
          'CONCIERGE_CRITIC_PASS',
          'COMPOSE_NOTE_BY_NOTE',
          'COMPOSE_LICK_BY_LICK',
          'ARRANGE_FULL_TRACK',
          'PLAY_DRUMS',
          'PLAY_GUITAR',
          'PLAY_KEYS',
          'PLAY_BASS',
          'ENFORCE_CONTINUITY_BIBLE',
          'GENERATE_HOOK_VARIANTS',
          'RUN_THUMBNAIL_DUEL',
          'RUN_SOCIAL_AUTOPILOT_PLAYBOOK'
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
          'critic_pass_mode',
          'continuity_bible_id',
          'music_mode',
          'instrument_stack',
          'hook_lab_mode',
          'thumbnail_duel_mode'
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
          'critic_fix_plan',
          'continuity_report',
          'music_arrangement',
          'hook_variants',
          'thumbnail_variants',
          'autopilot_variant_pack'
        ]::text[]
      ) AS output_name
    ) deduped
  ),
  notes = trim(both from concat_ws(
    ' ',
    dock_machines.notes,
    'Editor upgraded with concierge critic pass, continuity Bible checks, and music composition modes (note-by-note, lick-by-lick, full arrangement) including drums, guitar, keys, and bass.'
  )),
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
              'Concierge critic pass quality audits',
              'Continuity Bible enforcement checks',
              'Music composition note-by-note',
              'Music composition lick-by-lick',
              'Full multi-instrument arrangement',
              'Hook variant generation',
              'Thumbnail duel variant generation',
              'Social autopilot variant prep'
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
            'Critic pass mode',
            'Continuity bible id',
            'Music mode',
            'Instrument stack',
            'Hook lab mode',
            'Thumbnail duel mode'
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
          'Critic fix plan',
          'Continuity report',
          'Music arrangement',
          'Hook variants',
          'Thumbnail variants',
          'Autopilot variant pack'
        ]::text[])
      ) s
    )
  )
WHERE id = 'moonshadow-editor';
