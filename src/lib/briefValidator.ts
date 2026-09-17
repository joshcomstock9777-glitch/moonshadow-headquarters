type JsonRecord = Record<string, unknown>

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function hasCharacterSignal(shot: JsonRecord): boolean {
  const character = asNonEmptyString(shot.character)
  const subject = asNonEmptyString(shot.subject)
  const speaker = asNonEmptyString(shot.speaker)
  const characters = shot.characters
  const hasCharactersArray = Array.isArray(characters) && characters.length > 0
  return Boolean(character || subject || speaker || hasCharactersArray)
}

function normalizeShot(shot: JsonRecord, boardDestination: string | null): JsonRecord {
  const shotDestination = asNonEmptyString(shot.destination) ?? boardDestination ?? 'other'
  const characterShot =
    typeof shot.character_shot === 'boolean'
      ? shot.character_shot
      : typeof shot.characterShot === 'boolean'
        ? shot.characterShot
        : hasCharacterSignal(shot)

  return {
    ...shot,
    destination: shotDestination,
    character_shot: characterShot,
    characterShot: characterShot,
  }
}

export function normalizeStoryboardV2(rawShots: string): string {
  const input = rawShots.trim()
  if (!input) return rawShots

  try {
    const parsed = JSON.parse(input) as unknown
    if (!isRecord(parsed)) return rawShots

    const shots = parsed.shots
    if (!Array.isArray(shots)) return rawShots

    const boardDestination = asNonEmptyString(parsed.destination)
    const normalizedShots = shots.map((shot) => (isRecord(shot) ? normalizeShot(shot, boardDestination) : shot))

    return JSON.stringify({
      ...parsed,
      shots: normalizedShots,
    })
  } catch {
    return rawShots
  }
}
