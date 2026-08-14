# Match-3 Browser Game

A browser-based single-player Match-3 game built with **React, TypeScript and Vite** as the final project of the WBS Coding School Full Stack Web & App Development program.

The project combines a React frontend with dedicated gameplay logic, level progression, powers, UI flows, local persistence and a separate Node.js/Express backend.

### [▶ Play the live demo](https://match3-frontend.onrender.com/)

**Frontend:** https://github.com/jan-ninh/match3-frontend  
**Backend:** https://github.com/jan-ninh/match3-backend

---

## Key Features

- 12-level campaign with level map and progression
- 9×9 Match-3 board
- match detection and cascade resolution
- win and lose flows
- local progress persistence with `localStorage`
- gameplay powers including Bomb, Laser Row and Reshuffle
- profile and leaderboard pages
- settings and gameplay overlays
- audio and sound effects
- separate frontend and backend deployments

---

## Tech Stack

### Frontend

- React
- TypeScript
- Vite
- React Router
- Tailwind CSS
- localStorage
- ESLint
- Prettier

### Backend & Integration

- Node.js
- TypeScript
- Express
- REST-based frontend/backend communication
- CORS
- environment variables
- backend health check

### Deployment

- Git / GitHub
- Render Static Site
- Render Web Service
- environment-based API configuration

---

## My Contribution

This was a **two-person final project**.

My main responsibility was the technical implementation and structure of the **frontend and gameplay-related systems**.

I worked primarily on:

- frontend architecture and React/TypeScript structure
- gameplay logic
- game-state and phase handling
- match detection and cascade flows
- win/lose logic
- level and scenario structure
- progression and level unlocking
- routing and application flows
- overlays and modals
- powers and items
- audio / SFX integration
- debugging and refactoring
- frontend/backend integration
- deployment

The backend was implemented primarily by my project partner. I reviewed and integrated it into the application and made targeted corrections where necessary.

---

## Architecture Highlights

One of the most important parts of the project was separating **gameplay responsibility from UI responsibility**.

As the application grew, the frontend evolved toward a clearer separation between the React UI and the gameplay layer.

The gameplay side handles concepts such as:

- board and game state
- game phases
- input locks
- valid moves
- match detection
- cascades
- win/lose outcomes
- powers
- scenario-specific rules

React is primarily responsible for:

- rendering
- player interaction
- navigation
- overlays
- HUD elements
- application and presentation flows

This separation became especially useful when debugging interactions between gameplay state, animations and UI behavior.

### Match Resolution

A Match-3 turn follows a structured flow:

1. validate the player's move
2. detect matches
3. resolve effects
4. clear matched tiles
5. apply gravity
6. refill the board
7. detect additional matches
8. continue cascades until the board is stable
9. evaluate the current game state

Player input is locked while the board is resolving to avoid conflicting state changes.

### Progression

Completed levels and unlocked progression are persisted locally with `localStorage`.

Gameplay determines the result of a level, while progression and persistence are handled separately from the UI that displays the updated state.

---

## Debugging & Refactoring

The project became considerably more complex as gameplay systems began interacting with each other.

A major part of my work involved:

- tracing state-dependent gameplay bugs
- resolving UI/gameplay synchronization issues
- fixing TypeScript and build problems
- clarifying responsibilities between systems
- separating gameplay logic from React rendering
- refactoring growing components and flows
- debugging frontend/backend communication and deployment

The project taught me that getting a feature to work is only the first step. As complexity grows, clear responsibilities and understandable state transitions become just as important.

---

## Project Context

The game was created as the final project of the **WBS Coding School Full Stack Web & App Development** program.

My strongest focus during the project was on **React, TypeScript, frontend architecture and gameplay systems**.

What interested me most was building the rules and mechanics behind the game and solving situations where several states, systems and gameplay conditions interacted with each other.

---

## Running Locally

Clone the frontend repository:

```bash
git clone https://github.com/jan-ninh/match3-frontend.git
cd match3-frontend
npm install
