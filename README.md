# The Standing Order — deployment guide

This is a Vite + React blog, styled as a dispatch board, backed by Supabase
for storage. Follow these steps in order.

## 1. Create a Supabase project (free)

1. Go to https://supabase.com and sign up / log in.
2. Click **New project**. Pick any name and a strong database password
   (save it somewhere — you likely won't need it again, but keep it safe).
3. Wait ~2 minutes for the project to finish provisioning.

## 2. Create the posts table

1. In your Supabase project, open the **SQL Editor** (left sidebar).
2. Paste and run this:

```sql
create table posts (
  id text primary key,
  title text not null,
  category text not null,
  excerpt text,
  body text not null,
  date text not null,
  read_mins integer default 1,
  created_at timestamp with time zone default now()
);

alter table posts enable row level security;

-- Anyone can read posts (it's a public blog)
create policy "Public read access"
  on posts for select
  using (true);

-- Anyone with the anon key can insert posts.
-- The passphrase gate in the app is the only thing stopping randoms —
-- see the security note below.
create policy "Public insert access"
  on posts for insert
  with check (true);
```

## 3. Get your API keys

1. In Supabase, go to **Settings → API**.
2. Copy the **Project URL** and the **anon public** key.
3. In this project folder, copy `.env.example` to a new file called `.env`.
4. Paste in your Project URL and anon key. Optionally set a
   `VITE_COMPOSE_PASSPHRASE` — a simple word or phrase you'll type before
   publishing a post.

## 4. Test it locally (optional but recommended)

You'll need [Node.js](https://nodejs.org) installed (v18+).

```bash
npm install
npm run dev
```

Open the URL it prints (usually `http://localhost:5173`). Try reading a
post and publishing a new one to confirm Supabase is wired up correctly.

## 5. Push the code to GitHub

1. Create a new repository on https://github.com (public or private,
   either works).
2. In this project folder:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

**Important:** `.env` is already excluded via `.gitignore` so your keys
don't get pushed to GitHub. You'll re-enter them directly in Vercel instead
(next step).

## 6. Deploy on Vercel (free)

1. Go to https://vercel.com and sign up / log in (you can use your GitHub
   account to sign in, which makes this step faster).
2. Click **Add New → Project**, then select the repository you just pushed.
3. Vercel will auto-detect it's a Vite project — leave the build settings
   as default.
4. Before deploying, open **Environment Variables** and add:
   - `VITE_SUPABASE_URL` → your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` → your Supabase anon key
   - `VITE_COMPOSE_PASSPHRASE` → your chosen passphrase (optional)
5. Click **Deploy**. In a minute or two, you'll get a live URL like
   `standing-order-blog.vercel.app`.

## 7. (Optional) Add your own domain

In your Vercel project → **Settings → Domains**, add a domain you own
(e.g. `thestandingorder.in`) and follow the DNS instructions shown. Free on
Vercel's plan; you only pay your domain registrar for the domain itself.

## A note on security

The "New dispatch" passphrase is a simple deterrent, not real
authentication — someone determined enough could still find a way to post.
For real access control (so only you can publish), the next step would be
adding **Supabase Auth** (email/password login) and changing the insert
policy to check `auth.uid()` instead of allowing anyone. Ask Claude to set
this up whenever you're ready — it's a fairly small change on top of what's
here.
