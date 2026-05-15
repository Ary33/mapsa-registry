# MAPSA Registry — Supabase Setup Guide

## Step 1: Create the Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in (GitHub login works)
2. Click **New Project**
3. Settings:
   - **Name:** `mapsa-registry`
   - **Database Password:** generate a strong one and save it somewhere secure
   - **Region:** East US or whichever is closest to your expected users (for Oaxaca-based admin work, US regions are fine since Vercel edges handle latency)
4. Wait ~2 minutes for provisioning

## Step 2: Get Your API Keys

1. Go to **Settings → API** in the Supabase dashboard
2. Copy these three values:
   - **Project URL** — looks like `https://abcdefgh.supabase.co`
   - **anon / public key** — the long `eyJ...` string under "Project API keys"
   - **service_role key** — click "Reveal" to see it (this is secret — never expose client-side)

## Step 3: Add Environment Variables

### Locally
Create `.env.local` in your project root (it's already gitignored):

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...your-anon-key
SUPABASE_SERVICE_ROLE_KEY=eyJ...your-service-role-key
```

### On Vercel
1. Go to your Vercel project → **Settings → Environment Variables**
2. Add all three variables above
3. Set them for **Production**, **Preview**, and **Development** environments
4. Redeploy after adding (Vercel → Deployments → three-dot menu → Redeploy)

## Step 4: Install the Supabase Client Library

```bash
npm install @supabase/supabase-js
```

Commit the updated `package.json` and `package-lock.json`.

## Step 5: Run the Database Migration

1. In Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Paste the entire contents of `supabase/migrations/001_initial_schema.sql`
4. Click **Run**
5. You should see "Success. No rows returned" (the INSERTs for email domains will show row counts)

### Verify it worked:
- Go to **Table Editor** — you should see all tables: `profiles`, `records`, `images`, `elements`, `groupings`, `annotations`, `sources`, `overlays`, `photo_requests`, `audit_log`, `allowed_email_domains`
- Go to **Authentication → Providers** — Email provider should be enabled by default
- Go to **Storage** — you should see three buckets: `inscription-photos`, `overlays`, `avatars`

## Step 6: Enable Email Auth (verify settings)

1. Go to **Authentication → Providers → Email**
2. Ensure "Enable Email Signup" is ON
3. "Confirm email" should be ON (researchers must verify their email)
4. Optionally customize the confirmation email template under **Authentication → Email Templates**

## Step 7: Sign Up and Promote Yourself to Admin

1. Start your dev server (`npm run dev`) or use the deployed Vercel URL
2. Sign up with your preferred email address
3. Confirm your email via the link Supabase sends
4. In the Supabase SQL Editor, run:

```sql
UPDATE profiles SET role = 'admin'
WHERE email = 'your-actual-email@example.com';
```

You are now the admin. All subsequent signups from recognized institutional domains will be auto-approved as `researcher`. Signups from unrecognized domains will land as `pending` for you to approve.

## Step 8: Approve Pending Users (ongoing)

To approve a pending researcher:

```sql
UPDATE profiles SET role = 'researcher'
WHERE email = 'their-email@example.com';
```

Later we'll build an admin UI for this so you don't need the SQL Editor.

## What Each File Does

| File | Purpose |
|------|---------|
| `supabase/migrations/001_initial_schema.sql` | Full database schema, RLS policies, storage buckets, email domain list |
| `.env.local.example` | Template for environment variables |
| `src/lib/supabase.ts` | Browser-side Supabase client (used in components) |
| `src/lib/supabase-admin.ts` | Server-side client with service role key (used in API routes only) |

## Next Steps After Setup

Once Supabase is running and you're promoted to admin:

1. **Auth UI** — Build login/signup pages in the Next.js app
2. **Admin record management** — Pages where you create records, upload photos, position overlays
3. **Scholar annotation UI** — Pages where researchers create groupings, annotations, interpretations
4. **Seed data migration** — Move existing TypeScript seed data into the database

We'll build these one at a time.
