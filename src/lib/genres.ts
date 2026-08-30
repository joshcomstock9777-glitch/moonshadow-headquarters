export const GENRES = [
  'short-story',
  'erotica',
  'horror-sci-fi',
  'sci-fi',
  'romance',
  'poetry',
  'songwriting',
  'article',
] as const

export type Genre = (typeof GENRES)[number]

export const GENRE_LABELS: Record<Genre, string> = {
  'short-story': 'Short Story',
  erotica: 'Erotica',
  'horror-sci-fi': 'Horror Sci-Fi',
  'sci-fi': 'Sci-Fi',
  romance: 'Romance',
  poetry: 'Poetry',
  songwriting: 'Songwriting',
  article: 'Article',
}

export const GIG_STATUSES = [
  'new',
  'triaged',
  'applied',
  'accepted',
  'declined',
  'invoiced',
  'paid',
] as const

export type GigStatus = (typeof GIG_STATUSES)[number]

export const GIG_STATUS_LABELS: Record<GigStatus, string> = {
  new: 'New',
  triaged: 'Triaged',
  applied: 'Applied',
  accepted: 'Accepted',
  declined: 'Declined',
  invoiced: 'Invoiced',
  paid: 'Paid',
}

export const DRAFT_STATUSES = [
  'idea',
  'outlining',
  'drafting',
  'editing',
  'delivered',
  'paid',
] as const

export type DraftStatus = (typeof DRAFT_STATUSES)[number]

export const DRAFT_STATUS_LABELS: Record<DraftStatus, string> = {
  idea: 'Idea',
  outlining: 'Outlining',
  drafting: 'Drafting',
  editing: 'Editing',
  delivered: 'Delivered',
  paid: 'Paid',
}
