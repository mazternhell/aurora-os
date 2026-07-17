# Sam API Setup

Aurora OS keeps the public dashboard on GitHub Pages and sends PMO review requests through a Cloudflare Worker. The Worker uses a Cloudflare Workers AI binding, so no OpenAI API key is required or stored.

## 1. Install Wrangler

```bash
cd worker
npm install
npx wrangler login --use-keyring
```

Wrangler is installed locally so every developer and CI run uses the project-pinned version.

## 2. Configure the dashboard token

From the `worker` directory, create the only Worker secret required by Aurora:

```bash
npx wrangler secret put DASHBOARD_TOKEN
```

Use a long, random value. Never commit it to the repository or place it in frontend code.

## 3. Verify and deploy the Worker

```bash
npx wrangler whoami
npm run deploy:dry-run
npm run deploy
```

The deploy command prints a URL similar to:

```text
https://aurora-sam-pmo.<your-subdomain>.workers.dev
```

The Worker uses the `AI` binding configured in `worker/wrangler.jsonc`. The default model can be changed using the non-secret `WORKERS_AI_MODEL` variable.

## 4. Connect the dashboard

Open Aurora OS, expand **Sam connection**, and enter:

- Worker URL: the deployed Workers URL
- Dashboard access token: the same value used for `DASHBOARD_TOKEN`

The connection details are stored only in that browser's local storage.

## 5. GitHub Actions deployment

The Worker deployment workflow requires these repository Actions secrets:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

The workflow performs dependency installation, a JavaScript syntax check, a Wrangler dry run, and then deployment. Production deployment remains manual through the **Run workflow** button.

## 6. CORS setting

`worker/wrangler.jsonc` currently permits requests from:

```text
https://mazternhell.github.io
```

Change `ALLOWED_ORIGIN` if Aurora OS later moves to a custom domain.

## Security rules

- No `OPENAI_API_KEY` is required.
- Never hardcode `DASHBOARD_TOKEN` in `app.js`, HTML, GitHub Actions, or repository files.
- Rotate `DASHBOARD_TOKEN` if it is exposed.
- Keep the Cloudflare deployment token only in GitHub Actions secrets.
- Sam recommends dashboard changes but does not automatically apply priority or milestone edits.

## Local fallback

The **Run Local Review** button remains available when the Worker or Workers AI cannot be reached.
