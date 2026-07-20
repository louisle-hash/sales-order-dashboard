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

## 4. Enable the AI analyst

The floating AI assistant sends only the current filtered aggregates and top-ranked summaries to a Supabase Edge Function. The function calls Cloudflare Workers AI so the browser never receives a provider credential.

1. In the Cloudflare dashboard, open **Workers AI → Use REST API**, create a Workers AI API token, and copy the Account ID.

2. Add both values in **Supabase Dashboard → Edge Functions → Secrets**, or run this command locally:

   ```bash
   supabase secrets set \
     CLOUDFLARE_ACCOUNT_ID='YOUR_ACCOUNT_ID' \
     CLOUDFLARE_API_TOKEN='YOUR_API_TOKEN' \
     CLOUDFLARE_AI_MODEL='@cf/openai/gpt-oss-20b' \
     --project-ref mfqptbdjkeggtykjjhgc
   ```

3. Apply the rate-limit migration and deploy the function when setting up a new Supabase project:

   ```bash
   supabase db push --project-ref mfqptbdjkeggtykjjhgc
   supabase functions deploy sales-analyst --no-verify-jwt --project-ref mfqptbdjkeggtykjjhgc
   ```

4. Never paste the Cloudflare API token into the dashboard, GitHub repository, or browser storage.

The deployed function uses origin restrictions, request-size validation, per-IP rate limits, short chat history and a server-side model configuration. Cloudflare Workers AI includes a daily free allocation; requests stop when that allocation is exhausted on the Free plan. Public GitHub Pages access is still public by definition; add Supabase Auth and authenticated policies before using the dashboard for confidential external access.

## Security

The standalone dashboard and embedded workbook are public to anyone who can access the GitHub Pages URL. The anon key is also visible by design. Use Supabase RLS policies and never embed a service-role key. For private data, use authenticated policies or a protected Edge Function instead of the permissive sample policies.
