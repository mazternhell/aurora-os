# Sam API Setup

Aurora OS keeps the public dashboard on GitHub Pages and sends PMO review requests through a Cloudflare Worker. The Worker stores the OpenAI API key as a secret; the key is never shipped to the browser.

## 1. Install Wrangler

```bash
cd worker
npm install
npx wrangler login --use-keyring
```

Wrangler is installed locally so every developer and CI run uses the project-pinned version.

## 2. Deploy the Worker

From the `worker` directory, first verify the account and configuration:

```bash
npx wrangler whoami
npm run deploy:dry-run
npx wrangler secret put OPENAI_API_KEY
npx wrangler secret put DASHBOARD_TOKEN
npm run deploy
```

Use a long, random value for `DASHBOARD_TOKEN`. This is separate from the OpenAI API key.

The deploy command prints a URL similar to:

```text
https://aurora-sam-pmo.<your-subdomain>.workers.dev
```

## 3. Connect the dashboard

Open Aurora OS, expand **Sam connection**, and enter:

- Worker URL: the deployed Workers URL
- Dashboard access token: the same value used for `DASHBOARD_TOKEN`

The connection details are stored only in that browser's local storage.

## 4. CORS setting

`worker/wrangler.jsonc` currently permits requests from:

```text
https://mazternhell.github.io
```

Change `ALLOWED_ORIGIN` if Aurora OS later moves to a custom domain.

## Security rules

- Never commit `OPENAI_API_KEY`.
- Never hardcode the OpenAI key in `app.js`, HTML, or GitHub Actions.
- Rotate `DASHBOARD_TOKEN` if it is exposed.
- Sam recommends dashboard changes but does not automatically apply priority or milestone edits.

## Local fallback

The **Run Local Review** button remains available when the Worker or OpenAI API cannot be reached.
