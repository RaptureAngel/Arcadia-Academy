# Arcadia Desk Handover

## Project Overview

Arcadia Desk is a private local React/Vite productivity RPG with a Tauri desktop shell. The user selects a character, punches in, completes regular tasks and project-pack steps, earns XP, tracks daily quota, and archives work logs.

The app now supports both:

- Browser mode using `localStorage`.
- Tauri desktop mode using `localStorage` as a mirror/fallback plus an optional desktop JSON save file.

## Tech Stack

- React + Vite
- JavaScript
- CSS
- Tauri v2 desktop shell
- Tauri plugins:
  - `@tauri-apps/plugin-fs`
  - `@tauri-apps/plugin-dialog`
- Browser persistence: `localStorage`
- Desktop persistence: JSON save file plus backup rotation
- Git for checkpoints

Run browser dev mode:

```bash
npm run dev
```

Build check:

```bash
npm.cmd run build
```

Run Tauri dev mode:

```bash
npm.cmd run tauri:dev
```

Build Tauri desktop app:

```bash
npm.cmd run tauri:build
```

## Current Structure Highlights

```text
arcadia-desk/
  HANDOVER.md
  PROJECT_STATE.md
  package.json
  src-tauri/
    tauri.conf.json
    capabilities/
  src/
    App.jsx
    App.css
    components/
      CharacterDossier.jsx
      DataManagementPanel.jsx
      EditTaskForm.jsx
      ProjectFocusOverlay.jsx
      SettingsView.jsx
      TaskList.jsx
    utils/
      storage.js
      workLogExport.js
      dashboardInsights.js
      characters.js
      projects.js
      tasks.js
      xp.js
```

Important asset path: `public/characters/` must stay lowercase.

## Current Major Features

- Workday states: Not Punched In, Working, On Lunch, Punched Out.
- Office/Class context labels are presentation-only.
- Regular tasks with timer-based XP v2.
- Deep Work / Study Hall overlay for regular tasks.
- Project packs with fixed template step XP.
- Project Focus / Project Study overlay for active project steps.
- Dashboard display modes:
  - Daily Quota
  - Weekly Insights
  - Client/Subject Attention
- Character Library with add/edit/delete/select.
- Character Dossier overlay with Information, Progress, and Records tabs.
- Client Library.
- Template Library.
- Archive/work-log history.
- End-of-Day Summary before manual archive/punch-out archive.
- Manual Export Save and Import Save.
- Reset Work, which clears work data but preserves libraries and quota.

## Desktop Storage State

`src/utils/storage.js` owns the browser/Tauri storage boundary.

Tauri desktop storage uses the existing Arcadia save payload:

```js
{
  metadata: {
    appName: "Arcadia Desk",
    exportedAt: "...",
    version: 1
  },
  data: { ...localStorageSlices }
}
```

Desktop save behavior:

- App-data save is default/fallback.
- User can choose a save folder.
- Chosen folder stores `arcadia-desk-save.json`.
- `Backups/` stores timestamped save backups.
- Newest 5 backups are kept.
- `Work Logs/` stores auto-saved `.txt` logs on archive.
- `localStorage` remains a mirror/fallback.
- Existing Export Save and Import Save remain backup tools.
- Corrupt desktop saves are not overwritten automatically.

The chosen save folder path is stored in a Tauri-only config file, not in the Arcadia save payload.

## LocalStorage Keys

```js
activeEmployeeId: "arcadia-desk-active-employee-id"
employees: "arcadia-desk-employees"
tasks: "arcadia-desk-tasks"
projects: "arcadia-desk-projects"
activeDate: "arcadia-desk-active-date"
history: "arcadia-desk-history"
workday: "arcadia-desk-workday"
dailyQuota: "arcadia-desk-daily-quota"
customProjectTemplates: "arcadia-desk-custom-project-templates"
clientLibrary: "arcadia-desk-client-library"
characterLibrary: "arcadia-desk-character-library"
```

Do not rename these keys without explicit approval and a migration plan.

## Reset Work

Reset Work clears:

- tasks
- projects
- history/work logs
- workday state
- active date
- active character selection

Reset Work preserves:

- Character Library
- Client Library
- Template Library
- daily quota

## Recent Refactor Checkpoints

- Task UI refactor completed:
  - `EditTaskForm`
  - `TaskList`
- Settings presentation refactor completed:
  - `SettingsView`
  - `DataManagementPanel` remains presentation-only.
- `App.jsx` still owns state, handlers, persistence orchestration, and mechanics.

## Important Guardrails

- Do not change saved data shape without explicit approval.
- Do not change localStorage keys without explicit approval.
- Do not break browser mode.
- Do not break Tauri mode.
- Do not add broad filesystem permissions.
- Do not add OneDrive API/cloud login; treat OneDrive as a normal local folder.
- Do not silently delete or prune history.
- Do not remove manual Export Save or Import Save yet.
- Do not overwrite corrupt desktop saves automatically.
- Do not change XP logic, timers, workday behavior, archive semantics, projects, tasks, characters, clients, or templates unless explicitly requested.
- Keep Office/Class context labels presentation-only.
- Keep project step XP fixed from templates.
- Keep changes scoped and planning-first.
- Run `npm.cmd run build` after implementation changes.
- Commit after each stable milestone.

## New Chat Startup

For the next chat/agent:

1. Read `PROJECT_STATE.md` and `HANDOVER.md`.
2. Run `git status`.
3. Inspect the files relevant to the requested change before editing.
4. Confirm whether the work touches browser storage, Tauri storage, save shape, localStorage keys, or filesystem permissions.
5. Keep implementation scoped and avoid opportunistic refactors.
6. Run `npm.cmd run build` after source changes.
7. Commit after the feature is stable.

Recommended next feature:

- Character Images Folder / Image Import v1.

Suggested starting files for that feature:

- `src/utils/storage.js`
- `src/utils/characters.js`
- `src/App.jsx`
- `src/components/CharacterLibraryPanel.jsx`
- `src/components/CharacterDossier.jsx`
- `src-tauri/capabilities/default.json`
- `package.json`

## Suggested Next Roadmap

1. Character Images Folder / Image Import v1.
2. Character image model planning.
3. Full-body/outfit presentation later.
4. Cosmetic/RP polish for Character Dossier and Project Focus.
5. More App.jsx refactor checkpoints.
6. Dashboard Insights v2 after current dashboard summaries settle.
7. Native export/import polish after desktop storage is stable.
