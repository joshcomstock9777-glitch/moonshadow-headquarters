export interface Gig {
  id: string
  source: string | null
  url: string | null
  client: string | null
  title: string
  genre: string
  brief: string | null
  word_count: number | null
  budget_usd: number | null
  deadline: string | null
  status: string
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Draft {
  id: string
  gig_id: string | null
  title: string
  genre: string
  brief: string | null
  outline: string | null
  scaffold: string | null
  final_copy: string | null
  word_count_target: number | null
  status: string
  created_at: string
  updated_at: string
}

export type GigInput = Omit<Gig, 'id' | 'created_at' | 'updated_at'>
export type DraftInput = Omit<Draft, 'id' | 'created_at' | 'updated_at'>
