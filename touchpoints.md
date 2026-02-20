# Touchpoint Register (SSOT)

Ziel: Parallelentwicklung (mehrere Branches/Novas gleichzeitig), mit minimalen Merge-Konflikten.

Begriffe
- **Touchpoint**: Datei, die Code/Features **zusammensteckt** (Composition Root), **registriert** (Registry/Manifest) oder **exportiert** (Barrel/Public API).
- **Feature-Modul**: neuer Ordner + neue Dateien, die ein Feature kapseln (UI/Engine getrennt), ohne bestehende Orchestrierungsdateien zu verändern.

---

## Policy (Hard Rules)

1) Default: **Neue Features = neue Dateien/Ordner** (Feature-Modul).
2) Bestehende Dateien dürfen **nur** geändert werden, wenn sie im Register unten als Touchpoint gelistet sind.
3) Touchpoint-Edits sind **additiv + lokal**:
   - kein Reformat, kein Reorder, keine Umbenennungen
   - ideal: **1 import + 1 Zeile** (Registrierung/Mount) oder klar markierter Insert-Block
4) Wenn Integration ohne Änderung einer Nicht‑Touchpoint‑Datei unmöglich ist:
   - bevorzugt: **neuen Extension‑Point** bauen (Addon/Plugin‑Host oder Auto‑Discovery Loader)
   - alternativ: **genau 1 neue Datei** wird als Touchpoint aufgenommen (mit Begründung)
5) Jede Feature-Änderung/PR/Branch muss dokumentieren:
   - welche Touchpoints berührt wurden (Pfad + 1 Satz Zweck)
   - welche neuen Module hinzugekommen sind (Ordnerpfad)

Empfehlung (Merge-Freundlichkeit)
- Touchpoints bekommen (später) **Marker-Blöcke**, z. B.:
  - `// TOUCHPOINT: <name> (append-only)`
  - damit alle Änderungen im gleichen, klaren Bereich passieren.

---

## Touchpoint Register

> Hinweis: Diese Liste ist projekt-spezifisch. Pfade sind relativ zur Repo-Root.

### UI Composition Roots (Hosts/Providers/Layout/Router)

- `src/main.tsx`
- `src/app/App.tsx`
- `src/app/layouts/MainLayout.tsx`
- `src/app/layouts/GameLayout.tsx`

- `src/features/overlays/OverlayProvider.tsx`
- `src/features/overlays/OverlayHost.tsx`
- `src/features/overlays/OverlayHostStage.tsx`

- `src/features/devtools-host/ui/DevtoolsHost.tsx`
- `src/features/devtools-host/ui/GameStage.tsx`
- `src/features/devtools-host/ui/GameContainer.tsx`

- `src/features/grid/Grid.tsx`
- `src/features/grid/ui/Grid.tsx`

### Registries / Manifests (Listen/Maps/Factories)

- `src/gamelogic/cascade/effects/registry.ts`
- `src/gamelogic/itemeffects/index.ts`
- `src/gamelogic/levels/index.ts`
- `src/features/audio/sfx/sfxManifest.ts`

### Barrels / Public APIs (Exports)

- `src/components/index.ts`
- `src/pages/index.ts`
- `src/devtools/index.ts`

- `src/features/grid/index.ts`
- `src/features/overlays/index.ts`
- `src/features/devtools-host/index.ts`
- `src/features/devtools-host/lib/index.ts`
- `src/features/devtools-host/ui/index.ts`
- `src/features/audio/index.ts`

- `src/types/index.ts`

### HUD Sections (Exception Touchpoint)

> Begründung: Level 07 benötigt die Progress-Bar **direkt unter den Objective-Hints** im Center-Stack.  
> Das ist ohne minimalen Insert in `HudCenter.tsx` nicht robust/responsive umsetzbar.

- `src/features/devtools-host/ui/hud/sections/HudCenter.tsx`

---

## How to use (Team/Parallel)

Wenn mehrere Novas parallel arbeiten:
1) Jede Nova implementiert das Feature **als neues Modul** (neuer Ordner + neue Dateien).
2) Verdrahtung ist nur über Touchpoints erlaubt:
   - entweder über **Auto‑Discovery** (0 Touchpoint-Edits)
   - oder über **einen** Registry/Host‑Touchpoint (append-only)
3) Wenn eine Nova mehr als 1–2 Touchpoints anfassen muss: STOP → Design ändern (Extension‑Point).

---

## Change Control

- Neue Touchpoints nur hinzufügen, wenn sie als “Composition Root/Registry/Barrel” dienen und langfristig stabil sind.
- Entfernen/Umstrukturieren von Touchpoints nur in einem separaten Refactor-Branch (nicht parallel zu Feature-Branches).
