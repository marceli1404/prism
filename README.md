# PRISM — Pull Request Intelligence & Status Monitor

A single-page dashboard that tracks pull requests across multiple GitHub repositories (owned repos, forks, and collaborator/community repos) in one view, with live status, checks, and filtering.

Live: https://marceli1404.github.io/prism/

## What it does

- Renders `prs.json`, a snapshot of PRs pulled via the GitHub search API (`repo:<slug> author:<user> type:pr`) across a configured list of repositories.
- Lets you sign in with GitHub (OAuth device flow) to fetch live PR state, review status, and CI check runs directly from the GitHub API in the browser.
- Supports light/dark theme, with preferences stored in `localStorage`.

## Files

- `index.html` — the dashboard itself (markup, styles, and all client-side JS).
- `prs.json` — the PR data snapshot rendered by the dashboard.
- `refresh.ps1` — PowerShell script that regenerates `prs.json` by querying `gh api search/issues` for each repo in its `$repos` list and writing the results out.
- `proxy.js` — a small local Node HTTP server used only for local development. It serves the static files and proxies the two GitHub OAuth device-flow endpoints (`/api/device-code`, `/api/device-token`) so the browser isn't blocked by CORS when signing in. In production (GitHub Pages), the device flow talks to `/device-code` and `/device-token` instead, which are expected to be served by a separate backend (e.g. a Cloudflare Worker) — not included in this repo.

## Running locally

Requires Node.js and the [GitHub CLI](https://cli.github.com/) (`gh`, authenticated) if you want to regenerate the data.

```bash
# 1. Serve the dashboard + local OAuth proxy
node proxy.js
# open http://localhost:8080

# 2. (optional) Refresh prs.json with your own repo list
#    Edit the $repos array in refresh.ps1 first, then:
pwsh ./refresh.ps1
```

`refresh.ps1` writes to `prs.json` in the same directory; the page reloads it live via `fetch('prs.json?' + Date.now())`.
