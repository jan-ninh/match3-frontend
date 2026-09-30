# Frontend hosting inputs

Use a static host for the Vite build. No Vite development/preview server should serve production traffic. The coordinated backend/database runbook is `match3-backend/DEPLOYMENT.md` in this workspace.

- Node: `.node-version` (22.23.3).
- Separate frontend Git repo: root directory empty/repo root; branch `portfolio-refresh` after explicit publication approval.
- Build: `npm ci --include=dev && npm run build`; publish `dist`.
- Build environment: `VITE_API_URL=https://<exact-api-host>` without `/api`, path, query or credentials. An absent/invalid setting fails the build. HTTP loopback is permitted for isolated local production-build tests. `VITE_API_URL=/` means an intentional same-origin API proxy; Render static hosting alone does not supply that proxy.
- Every `VITE_*` setting is public. No Mongo URI, passwords, refresh/access tokens or signing secret belongs here.
- SPA fallback: rewrite `/*` to `/index.html` with status 200, not a redirect. Existing static files remain assets. `render.yaml` records the rule, requires the public API input, and disables automatic deploys. Creating/importing the service still starts a deployment and requires separate approval.
- Actual routes: `/`, `/game-map`, `/game-map/play-game?level=1`, `/game-map/leaderboard`, `/game-map/profile`. `/map`, `/gameplay/...`, `/leaderboard` and `/profile` are not existing application routes; the rewrite cannot invent them.
- API URL is baked at build time. Rebuild after changing it. Override ignored development/production environment files via the hosting build environment, without uploading those files.
- Bearer private calls omit cookies; auth register/login/refresh/logout use credentialed transport. Demo and Guest progression have no backend dependency.

Before a later deployment, review the advisories and cookie topology in the backend runbook. The local preparation has not verified hosted HTTPS, Render routing or third-party-cookie policies.

References: [Render static rewrites](https://render.com/docs/redirects-rewrites), [Blueprint specification](https://render.com/docs/blueprint-spec).
