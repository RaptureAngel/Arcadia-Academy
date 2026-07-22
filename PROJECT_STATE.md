# Arcadia Desk Project State

## Current State

Arcadia Desk is a private local productivity/RPG app built with React/Vite and wrapped in a Tauri desktop shell. Browser mode still works and uses `localStorage`. Tauri mode adds an opt-in desktop JSON save system with user-chosen save folders, backup rotation, and auto-saved work-log text files.

The app is feature-rich enough for real use and should be changed carefully. Most new work should start with inspection and a scoped plan, then implementation, build verification, and a Git checkpoint.

## Latest Completed Milestones

- Tauri desktop shell is implemented.
  - `npm run tauri:dev` runs the desktop app.
  - `npm run tauri:build` is configured to build installers/executables.
  - Tauri window title is `Arcadia Desk`; native title bar is still used.
- Desktop storage foundation is implemented.
  - Browser mode uses the existing `localStorage` keys.
  - Tauri mode can save `arcadia-desk-save.json` using the existing `{ metadata, data }` save payload.
  - App-data storage remains the default/fallback.
  - User-chosen save folders are supported.
  - `localStorage` remains a mirror/fallback in Tauri.
  - Export Save and Import Save remain manual backup tools.
- User-chosen save folder v1 is implemented.
  - Chosen folder stores `arcadia-desk-save.json`.
  - Folder conflicts are held as pending state until the user chooses Use Folder Save, Replace With Current Save, or Keep Current Folder.
  - Corrupt saves are not overwritten automatically.
- Backup Rotation v1 is implemented.
  - Backups live in `Backups/` under the active desktop save location.
  - Backup files are timestamped.
  - Newest 5 backups are kept.
- Work Log `.txt` Auto-Save v1 is implemented.
  - Tauri archives auto-save readable logs into `Work Logs/`.
  - File names use `arcadia-work-log-YYYY-MM-DD.txt`.
  - Manual Copy/Download Work Log remains available.
- Storage safety is implemented.
  - Duplicate same-date archive/history entries are guarded.
  - `getLevel()` has a defensive cap for corrupt huge XP values.
  - `saveData()` catches storage write failures.
- Component extraction milestones completed.
  - `EditTaskForm`
  - `TaskList`
  - `DataManagementPanel`
  - `SettingsView`
  - `AppTabs`
  - `EmployeePanel`
  - `DailyProgressPanel`
  - `RecentHistoryPanel`
  - `EndOfDaySummaryModal`
- Active features include:
  - regular tasks with timers and XP v2
  - Deep Work / Study Hall overlay for regular tasks
  - project packs and Project Focus / Project Study overlay
  - dashboard panel modes: Daily Quota, Weekly Insights, Client/Subject Attention
  - Character Library
  - Character Dossier overlay
  - Client Library
  - Template Library
  - Office/Class context labels as presentation-only wording
  - Archive tab with work-log/history details

## Persistence Summary

Browser mode:

- Uses `localStorage`.
- Uses the same save/export/import payload shape as before.

Tauri mode:

- Starts from `localStorage` synchronously, then hydrates from a valid desktop save when available.
- Active desktop save file is `arcadia-desk-save.json`.
- Default/fallback location is Tauri app data.
- Optional chosen folder is stored in a separate Tauri config file, not inside the Arcadia save payload.
- Chosen folder contains:
  - `arcadia-desk-save.json`
  - `Backups/`
  - `Work Logs/`
- `localStorage` remains the compatibility mirror/fallback.

Current localStorage keys:

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

Do not rename these keys or change saved data shape without explicit approval and a migration plan.

## Reset Work Behavior

Reset Work is not a factory reset.

It clears:

- tasks
- projects
- history/work logs
- workday state
- active date
- active character selection

It preserves:

- Character Library
- Client Library
- Template Library
- daily quota

## Current Architecture Notes

- `src/App.jsx` still owns most state, handlers, save orchestration, archive logic, workday logic, and project/task mechanics.
- Settings presentation was extracted into `src/components/SettingsView.jsx`.
- Data management UI lives in `src/components/DataManagementPanel.jsx`; save mechanics remain in `App.jsx` and `src/utils/storage.js`.
- Task list rendering was extracted into `src/components/TaskList.jsx`; edit form rendering uses `src/components/EditTaskForm.jsx`.
- Desktop storage helpers live in `src/utils/storage.js`.
- Tauri config lives in `src-tauri/tauri.conf.json`.

## Next Recommended Feature

Character Images Folder / Image Import v1.

Recommended direction:

- Tauri-only image folder support first.
- Treat OneDrive as a normal local synced folder.
- Avoid changing character data shape unless the image path model is explicitly planned.
- Keep browser mode working.
- Do not add outfit arrays/galleries yet.

## Future Roadmap

- Character image model and safe image import.
- Full-body/outfit presentation later.
- Cosmetic/RP polish for Character Dossier and Project Focus.
- More App.jsx refactor checkpoints.
- Dashboard insights v2 only after current summaries prove useful.
- Native export/import polish after desktop storage is stable.

## Do Not Break Rules

- Do not change saved data shape without explicit approval.
- Do not change localStorage keys without explicit approval.
- Do not break browser mode.
- Do not break Tauri mode.
- Do not add broad filesystem permissions.
- Do not add OneDrive API/cloud login; treat OneDrive as a normal local folder.
- Do not silently delete or prune history.
- Do not remove manual Export Save or Import Save yet.
- Do not overwrite corrupt desktop saves automatically.
- Do not change XP awarding unless explicitly requested.
- Do not change project progression unless explicitly requested.
- Do not change timers, workday gating, archive semantics, or work-log contents casually.
- Keep Office/Class context labels presentation-only.
- Keep project step XP fixed from templates.
- Keep changes scoped and planning-first.
- Run `npm.cmd run build` after implementation changes.
- Commit after each stable milestone.

## New Chat Transfer Prompt

```text
Read PROJECT_STATE.md and HANDOVER.md first. Then inspect the relevant files before editing. Preserve browser mode, Tauri mode, saved data shape, localStorage keys, and current desktop save behavior. Keep edits scoped, explain changes practically, run npm.cmd run build after implementation changes, and commit after stable milestones.
```
