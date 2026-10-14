# Idea → Clip → YouTube checklist

Check items off as they are done. `[x]` = done in code. Items marked **YOU** need your own accounts/secrets; nobody else can create them for you.

## A. Foundation
- [x] HQ app, Supabase tables (projects, jobs, publish_items, connections)
- [x] Publish gating (quality / rights / continuity)
- [ ] **YOU** Apply all migrations to your Supabase project
- [ ] **YOU** Give your user `app_metadata.hq_role = owner` (Supabase dashboard → Auth → Users)

## A2. Own the environment (no Bolt)
- [x] `.github/workflows/deploy-supabase.yml` auto-applies migrations and deploys functions on merge (skips safely until secrets exist)
- [ ] **YOU** Add repo secrets: `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, `SUPABASE_PROJECT_REF` (GitHub → Settings → Secrets and variables → Actions)
- [ ] **YOU** Connect repo to Cloudflare Pages / Netlify / Vercel (build `npm run build`, output `dist`, env `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)
- [ ] Verify first `supabase db push` run (migration filenames are non-standard; may need renaming)

## B. Script writer (idea → script + storyboard)
- [x] `supabase/functions/generate-script` edge function (saves a `clip` project with the plan in `notes`)
- [ ] **YOU** Create an OpenAI API key; set it as a secret: `OPENAI_API_KEY` (Supabase → Edge Functions → Secrets)
- [ ] **YOU** Deploy: `supabase functions deploy generate-script`
- [ ] "Paste an idea" box in the HQ UI that calls the function

## C. Video rendering
- [ ] Choose renderer (hosted video API, or ffmpeg/Remotion on a hosted worker; Chromebook can't render locally)
- [ ] `render-clip` function/worker: shots → video file in Supabase Storage
- [ ] Create `clips` Storage bucket
- [ ] Link finished file to job / publish_item

## D. YouTube upload
- [ ] **YOU** Google Cloud project, enable YouTube Data API v3, create OAuth client
- [ ] **YOU** Set secrets `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- [ ] OAuth connect flow storing refresh token (server-side only)
- [ ] `upload-youtube` function (`videos.insert`) run only after publish gates pass
- [ ] Mark publish_item `published` only after YouTube returns a video id

## E. Glue
- [ ] Job runner: idea → script → render → review → publish with status per step
