# Google Calendar Event Import

A Windows-focused Electron desktop app that turns school timetables from [Rozklad](https://client.rozklad.org/) or Markdown into Google Calendar events. The interface is in Ukrainian.

## Features

- Load your school's timetable URL and choose a teacher or class, or paste/import Markdown captured with Obsidian Web Clipper.
- Filter groups globally or per lesson, review overlapping lessons, and optionally select the correct group.
- Preview the week in a calendar, event list, or CSV view. Sunday is hidden; Saturday appears only when lessons are scheduled.
- Configure bell times per day and copy them to selected days. Fresh defaults: eight 45-minute lessons starting at 08:30, with breaks of 10 / 10 / 20 / 10 / 10 / 10 / 10 minutes, Monday–Saturday.
- Customize grade colors and notifications (five minutes by default, including a no-notification option).
- Export CSV or ICS for manual calendar import. Direct OAuth and Apps Script sync have been removed.
- Check multiple rooms on the **Кабінети** page, with selectable tiles and compact weekly records showing class, subject teacher, and lesson.
- Save preview snapshots, restore the latest saved preview on startup, remove selected snapshots with confirmation, and remember the window size.

CSV import does not carry event colors or notification settings. ICS supports reminders. Grade colors apply to the local preview only.

## Install on Windows

Download and extract this repository, or clone it. Keep all files together in a folder your Windows account can write to; avoid protected locations such as `Program Files`.

### Option 1: Windows launcher

1. Double-click **Start Calendar Generator.cmd** in the project root.
2. If Node.js/npm is missing, the console asks whether to install Node.js LTS:
   - **Y** installs through Windows Package Manager (`winget`). Windows may ask for administrator approval or license confirmation.
   - **N** cancels without installing anything.
3. The runner installs dependencies using the lockfile, then opens the app. Setup stages and live installer output show progress.

If `winget` is unavailable, install the current LTS release from [nodejs.org](https://nodejs.org/), then run the launcher again. If installation succeeds but Node.js is not found, close the console and restart the launcher to refresh its environment.

First-time installation needs an internet connection. Once dependencies are installed, the launcher starts Electron directly. URL loading still requires internet access.

### Option 2: Terminal

Install Node.js LTS with npm, open a terminal in the project root, and run:

```powershell
npm ci --include=dev
npm start
```

Do not omit development dependencies: this source distribution uses Electron from `devDependencies`. This repository is a runnable source distribution, not a standalone Windows installer.

## First use
### Create a desktop shortcut automatically

From PowerShell in the project root, run:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\scripts\Create Desktop Shortcut.ps1"
```

This creates **Google Calendar Event Generator** on your Windows desktop with the bundled calendar icon. It points to `Start Calendar Generator.cmd`, so first-time dependency setup still works. The script uses the actual desktop location, including OneDrive desktops, and resolves app paths automatically. The execution-policy override applies only to this command; it does not change your system policy.

Running the script again updates the shortcut if it already targets this app. It refuses to overwrite a same-named shortcut pointing to a different location. If you move the app folder, remove or rename the old shortcut and run the script from the new folder. Administrator access is not needed to create the shortcut.

The ready-to-use icon is included at `assets/app-icon.ico`; no image tools or dependencies are needed for shortcut creation. Developers can regenerate it from `assets/app-icon.png` after installing dependencies:

```powershell
.\node_modules\electron\dist\electron.exe .\scripts\build-icon.cjs
```

### Load your timetable

1. Open **Розклад** and select URL or Markdown input. Expand the help panel for capture instructions.
2. Supply your school's URL and select a teacher/class, or paste Markdown/open a `.md` file. Keep date headings and empty-day tables intact.
3. Check the year, bell times, groups, colors, and reminder settings.
4. Generate and review the events. Resolve ambiguous lessons if needed.
5. Export CSV or ICS for calendar import. Click **Зберегти перегляд** to retain a snapshot.

No school timetable, Google credentials, or saved previews are bundled. Existing settings from an older installation on the same Windows account may be migrated automatically.

## Room availability and calendar import

Open **Кабінети**, load your school's timetable URL, and select one or more rooms. The calendar shows class, subject teacher, and subject for occupied slots. Clear all selections with **Очистити вибір**.

All A/B variants count as potentially occupied. A light amber warning appears for unknown room assignments. Missing bookings do not guarantee actual room availability. Checks use the whole school timetable, not teacher/group filters.

To import events, use Google Calendar → Settings → Import & export. Choose CSV or ICS, not both, to avoid duplicates. See [Windows launcher details](docs/WINDOWS-RUNNER.md).

## Local data and updates

The app creates `local-storage/` beside the source files on first launch:

- Settings, bell schedules, source preferences, and browser data are stored in the Electron profile.
- `history/` contains one JSON file per saved preview.
- To remove a snapshot, select it in **Історія переглядів**, click **Видалити**, and confirm. Google Calendar events are not deleted. A recoverable `.deleted` copy remains in the history folder; deleting the last snapshot leaves no saved preview to restore on the next launch.
- `window-state.json` stores the window size and maximized state.
- Legacy encrypted Google/Apps Script files may remain from older versions, but the app no longer reads or uses them.

This directory is ignored by Git. Back it up before updating; do not commit or distribute it. Close the app before copying profile data.

Older AppData profiles and history files are migrated when applicable, with recovery backups retained. Removing only the new storage directory is not a guaranteed reset if an older profile still exists.

## Project layout

```text
src/                         Electron app, renderer, styles and services
assets/                      App icon in PNG and Windows ICO formats
scripts/                     Desktop shortcut creation and icon build scripts
docs/                        Setup guides
package.json                 App entry point and npm scripts
package-lock.json            Locked dependency versions
Start Calendar Generator.cmd Windows setup and launcher
local-storage/               Created at runtime; not included in Git
```

This clean distribution excludes installed dependencies, local profiles, saved history, test artifacts, and archived prototypes.

## License

See the repository's [GNU GPL v3 license](LICENSE). Third-party dependencies retain their own licenses.
