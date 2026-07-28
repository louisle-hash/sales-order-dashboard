# GitHub Pages publish package

This folder is ready to upload to a GitHub repository.

## 1. Supabase foundation

The production app uses the dedicated project **American Star Sales Supply
Chain**. Its versioned schema is stored under `supabase/migrations/`.

Do not run the legacy `supabase-schema.sql` file for a new installation.
Never put a secret or service-role key in the HTML dashboard.

## 2. Publish on GitHub Pages

1. Create a GitHub repository.
2. Upload the files from this folder to the repository root.
3. Open **Settings → Pages**.
4. Choose **Deploy from a branch**, branch `main`, folder `/ (root)`.
5. Open the Pages URL provided by GitHub.

## 3. Connect the dashboard

1. Sign in with an internal account.
2. Open **Supabase data sync** in the dashboard.
3. Test the connection.
4. Keep automatic upload enabled if every successful Excel import should be saved.

The Excel import is parsed in the browser. Authorized uploads are sent to
Supabase in batches and verified before the import is marked complete. Reloading
the page reuses the browser cache when it matches the latest complete cloud
revision.

## 4. Enable the AI analyst

The floating AI assistant sends only the current filtered aggregates and top-ranked summaries to a Supabase Edge Function. The function calls Cloudflare Workers AI so the browser never receives a provider credential.

1. In the Cloudflare dashboard, open **Workers AI → Use REST API**, create a Workers AI API token, and copy the Account ID.

2. Add both values in **Supabase Dashboard → Edge Functions → Secrets**, or run this command locally:

   ```bash
   supabase secrets set \
     CLOUDFLARE_ACCOUNT_ID='YOUR_ACCOUNT_ID' \
     CLOUDFLARE_API_TOKEN='YOUR_API_TOKEN' \
     CLOUDFLARE_AI_MODEL='@cf/openai/gpt-oss-20b' \
     --project-ref qkomdvikqfptfdhbedny
   ```

3. Apply the rate-limit migration and deploy the function when setting up a new Supabase project:

   ```bash
   supabase db push --project-ref qkomdvikqfptfdhbedny
   supabase functions deploy sales-analyst --no-verify-jwt --project-ref qkomdvikqfptfdhbedny
   ```

4. Never paste the Cloudflare API token into the dashboard, GitHub repository, or browser storage.

The deployed function uses origin restrictions, request-size validation, per-IP
rate limits, short chat history and a server-side model configuration.

## Security

The publishable key is visible by design and carries only anonymous privileges.
RLS is enabled on every application table. Anonymous dashboard reads remain
temporarily enabled during the account rollout; uploads, configuration writes
and all operational supply-chain data require an authenticated authorized role.
