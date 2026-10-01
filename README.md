# Match-3

A cyberpunk Match-3 game built with React and TypeScript, combining deterministic gameplay systems, responsive interaction and a persistent full-stack account mode.

**[Play the Live Demo](https://match3-arcade.onrender.com)**  
Demo mode is immediately playable without an account.

## Engineering Highlights

- **Deterministic gameplay engine** with reducer-driven phases for matching, clearing, gravity, refill, cascades, deadlock handling and win or loss resolution
- **Clear engine and UI boundaries** so gameplay rules, rendering, animation and user interaction remain separate and easier to reason about
- **Responsive 9x9 game board** with pointer and drag input that preserves native gameplay coordinates across desktop, tablet and mobile layouts
- **Game Feel and interaction design** with powers, targeting, animation timing, FX, SFX and stage-specific feedback
- **Server-authoritative account progression** with transaction-backed updates, idempotent operation receipts and recovery after ambiguous writes
- **Persistent campaign and leaderboard** with one canonical campaign state, Stage 11 finalization and an isolated Stage 12 sandbox
- **Production integration** with session recovery, MongoDB Atlas, Render deployment and a same-origin API path for reliable browser sessions

## My Focus

In the original two-person project, I had primary technical responsibility for the central frontend and gameplay areas, including game logic, grid and input handling, UI flows, progression, powers, routing, overlays, audio integration, debugging, refactoring and Game Feel.

I later continued evolving the portfolio version independently across frontend and backend integration. This included account and session reliability, server-authoritative gameplay and campaign flows, transactional recovery, leaderboard consolidation, deployment, live debugging and responsive presentation.

A recurring focus throughout the project was finding the actual source of truth behind a problem and keeping gameplay rules, UI state and persistence responsibilities clearly separated.

## Gameplay

The campaign contains **11 regular stages**, each built around different objectives and gameplay conditions. Completing the campaign unlocks an additional sandbox stage.

Demo mode keeps its own local progression and can be played without registration. Account mode adds persistent progression, profile data, campaign state and leaderboard ranking.

## Architecture

The project deliberately separates gameplay decisions from presentation and persistence.

```text
Player Input
     |
React UI
     |
Gameplay Engine
     |
Progress / Account Integration
     |
Node.js + Express API
     |
MongoDB Atlas
```

The gameplay engine owns rules and state transitions. React translates that state into the board, HUD, effects and overlays. Persistent account state is handled through the backend instead of treating the browser as the source of truth.

## Tech Stack

**Frontend:** React, TypeScript, Vite, React Router, Tailwind CSS, Framer Motion

**Backend:** Node.js, Express, TypeScript, MongoDB, Mongoose, Zod, JWT, bcrypt

**Infrastructure:** MongoDB Atlas, Render, Git, GitHub

## Repositories

- **Frontend:** [match3-frontend](https://github.com/jan-ninh/match3-frontend)
- **Backend:** [match3-backend](https://github.com/jan-ninh/match3-backend)

<details>
<summary><strong>Run locally</strong></summary>

### Frontend

```bash
npm install
```

Copy `.env.example` to `.env` and configure `VITE_API_URL` for the backend.

```bash
npm run dev
```

Demo mode can be used without an account. Full account functionality requires the separate backend repository.

</details>
