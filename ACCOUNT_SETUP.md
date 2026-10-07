# Optional sign-in (Google, Discord, GitHub) for synced progress

The book works fully without accounts: progress is kept in the reader's browser. Sign-in only
adds syncing between devices. A static GitHub Pages site cannot run a login on its own, so this
uses a free [Supabase](https://supabase.com) project as the backend. The site code is already in
place (`site/src/components/AccountControls.astro`, `site/src/scripts/account.js`) and **renders
nothing until `site/src/data/account-config.json` has a URL and key**, so nothing breaks before
you set it up.

## One-time setup (about 20 minutes)

1. **Create a Supabase project** (free tier). Note the *Project URL* and the *anon public key*
   (Project Settings → API). The anon key is meant to be public; the table below is protected by
   row-level security so each user can only touch their own row. Never put the `service_role` key
   anywhere in this repository.
2. **Run this SQL** (SQL Editor):
   ```sql
   create table public.progress (
     user_id uuid primary key references auth.users on delete cascade,
     data jsonb not null default '{}',
     updated_at timestamptz not null default now()
   );
   alter table public.progress enable row level security;
   create policy "own row read"   on public.progress for select using (auth.uid() = user_id);
   create policy "own row insert" on public.progress for insert with check (auth.uid() = user_id);
   create policy "own row update" on public.progress for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
   create policy "own row delete" on public.progress for delete using (auth.uid() = user_id);
   ```
3. **Authentication → URL Configuration**: set *Site URL* to
   `https://mustcodeal.github.io/rust-game-hacking-book/` and add
   `https://mustcodeal.github.io/rust-game-hacking-book/**` to *Redirect URLs*.
4. **Authentication → Providers**: enable each provider you want and paste its client ID and secret.
   For each one, register an OAuth app and give it Supabase's callback URL
   (`https://<project>.supabase.co/auth/v1/callback`):
   - Google: Google Cloud Console → APIs & Services → Credentials → OAuth client ID (Web application).
   - GitHub: GitHub → Settings → Developer settings → OAuth Apps → New OAuth App.
   - Discord: Discord Developer Portal → Applications → OAuth2 (add the redirect, copy ID and secret).
5. **Edit `site/src/data/account-config.json`**: set `supabaseUrl`, `anonKey`, and keep only the
   providers you enabled in `providers`. Commit, then publish (`cd site && node scripts/publish-pages.mjs`).
   After publishing, an **Account** section appears next to **Reading sound** in the reader panel.

## What is stored

One row per signed-in user: finished lessons, typing-practice bests, quiz attempts,
Markdown notes, margin comments, and the latest reading position
(`public.progress.data`). The row contains no e-mail or name. Supabase
itself keeps the sign-in identity. Signing out leaves progress in the browser. A user can ask you to
delete their row (or delete the user in the Supabase dashboard; the row is removed with them).

## How syncing behaves

- On sign-in and on each page load while signed in, local and cloud progress are **merged** (finished
  lessons are unioned, the faster typing result stays, a finished quiz attempt beats an unfinished one),
  and the latest edit of each Markdown note is retained). Margin comments are merged individually
  by stable ID. Legacy comments receive deterministic IDs; deleting a comment retains an
  `{id, at, deleted: true}` record so an older device cannot bring it back.
- Visible pages pull and merge remote progress every 20 seconds, including when local progress did
  not change. Saving after a completed lesson or comment edit first reads and merges the remote
  row. A pending request does not hide the controls or overwrite a later local note edit. The
  latest reading position is kept, rather than a full sequence of visited pages.
- Tokens come back in the URL fragment after the provider redirect and are removed from the address bar
  immediately; the session is kept in the browser's `localStorage` (`gha-account-session`).
- The merge logic (`mergeProgress` in `account.js`) is covered by `node site/scripts/check-account.mjs`.

## Testing without a real project

`site/scripts/check-account.mjs` checks existing progress, legacy comment IDs, conflict/deletion
handling, snapshot/application, and 512 three-device merge cases. Chromium checks exercise Notes
and a stand-in account transport, including delayed requests and sign-out (see
BOOK_REVISION_PROGRESS.md, T39). A configured external project and real provider login still need
the owner's setup and verification. The client merge is not a server-side atomic transaction;
simultaneous remote writes remain subject to the backend's row-update behavior.
