# Match-3

A cyberpunk Match-3 campaign with 11 stages, built with React and TypeScript around deterministic gameplay systems, responsive interaction and an optional full-stack account experience.

**[Play the Live Demo](https://match3-arcade.onrender.com)**  
**No account required.** Create an account to save progress and access the leaderboard.

<p align="center">
  <img src="docs/screenshots/match3-level-2.png" alt="Match-3 Level 2 gameplay with Collect Data Chips objective" width="720">
</p>

## Engineering Highlights

- **Deterministic gameplay engine** with reducer-driven phases for matching, clearing, gravity, refill, cascades, deadlock handling and win or loss resolution
- **Clear engine and UI boundaries** that keep gameplay rules, rendering, animation and interaction responsibilities separated
- **Responsive 8x8 game board** with pointer and drag input that preserves native gameplay coordinates across desktop, tablet and mobile layouts
- **Game Feel and interaction design** with powers, targeting, animation timing, FX, SFX and stage-specific feedback
- **Campaign system with varied objectives** including collection, obstacles, signal routing, leaks, terminals, timed Match Rush and sweep mechanics
- **Server-authoritative account progression** with MongoDB transactions, idempotent operation receipts and recovery after ambiguous writes
- **Full-stack production integration** with session recovery, a canonical campaign leaderboard, MongoDB Atlas, Render and a same-origin API path

## My Focus

The original project was built in a two-person team. I had primary technical responsibility for the central frontend and gameplay areas, including game logic, grid and input handling, UI flows, progression, powers, routing, overlays, audio integration, debugging, refactoring and Game Feel.

I later continued developing the portfolio version independently across frontend and backend integration. This included account and session reliability, server-authoritative gameplay and campaign flows, transactional recovery, leaderboard consolidation, deployment, live debugging and responsive presentation.

A recurring focus throughout the project was identifying the real source of truth behind a problem and keeping gameplay rules, UI state and persistence responsibilities clearly separated.

## Gameplay

The campaign contains **11 regular stages** with progressively changing objectives and gameplay conditions. Completing Stage 11 finalizes the campaign and unlocks an optional **Stage 12 Sandbox**, which remains separate from the finalized campaign result.

Demo mode keeps its own local progression and can be played without registration. Account mode adds persistent progression, profile data, campaign state and leaderboard ranking.

<p align="center">
  <img src="docs/screenshots/match3-level-map.png" alt="Match-3 campaign level map with progression and unlocks" width="680">
</p>

The stage structure moves beyond standard Match-3 collection goals. Later scenarios introduce signal paths, terminals, timed objectives and board pressure while reusing the same underlying engine.

<p align="center">
  <img src="docs/screenshots/match3-level-5.png" alt="Match-3 Level 5 Uplink Charge with timer and progress objective" width="720">
</p>

## Architecture

Gameplay decisions, presentation and persistent account state are deliberately separated.

```text
Player Input
     |
React UI + HUD
     |
Gameplay Engine
     |
     +---- Demo Mode ----> Local Progression
     |
     +---- Account Mode -> API Integration
                              |
                         Express API
                              |
                    Persistent Account State
                              |
                         MongoDB Atlas
```

The browser runs the Match-3 game itself. The gameplay engine owns board rules and state transitions. In account mode, the backend owns persistent account, campaign and leaderboard truth.

## Tech Stack

**Frontend:** React 19, TypeScript, Vite, React Router 7, Tailwind CSS 4, Framer Motion

**Backend:** Node.js 22, Express 5, TypeScript, MongoDB, Mongoose, Zod, JWT, bcrypt

**Infrastructure:** MongoDB Atlas, Render, Git, GitHub

## Repositories

- **Frontend:** [match3-frontend](https://github.com/jan-ninh/match3-frontend)
- **Backend:** [match3-backend](https://github.com/jan-ninh/match3-backend)

## Run Locally

<details>
<summary><strong>Frontend setup</strong></summary>

```bash
npm install
```

Copy `.env.example` to `.env` and configure `VITE_API_URL` for the backend.

```bash
npm run dev
```

Demo mode can be played without an account. Full account functionality requires the separate backend repository.

</details>
