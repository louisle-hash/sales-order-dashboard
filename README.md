# GitHub Pages publish package

This folder is ready to upload to a GitHub repository.

## 1. Configure Supabase

1. Create a Supabase project.
2. Open **SQL Editor** and run `supabase-schema.sql` once.
3. Copy the **Project URL** and **anon/public key** from **Project Settings → API**.
4. Never use the service-role key in the HTML dashboard.

## 2. Publish on GitHub Pages

1. Create a GitHub repository.
2. Upload the files from this folder to the repository root.
3. Open **Settings → Pages**.
4. Choose **Deploy from a branch**, branch `main`, folder `/ (root)`.
5. Open the Pages URL provided by GitHub.

## 3. Connect the dashboard

1. Open **Supabase data sync** in the dashboard.
2. Enter the Supabase Project URL and anon/public key.
3. Test the connection and save.
4. Enable automatic upload if every successful Excel import should be saved.

The Excel import is parsed in the browser. When auto-upload is enabled, rows are then sent to Supabase in batches. Reloading the page restores the workbook embedded in `index.html`.

## Security

The standalone dashboard and embedded workbook are public to anyone who can access the GitHub Pages URL. The anon key is also visible by design. Use Supabase RLS policies and never embed a service-role key. For private data, use authenticated policies or a protected Edge Function instead of the permissive sample policies.
