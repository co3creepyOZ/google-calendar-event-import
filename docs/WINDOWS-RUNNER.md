# Running on Windows

Double-click **Start Calendar Generator.cmd** in the application root folder (one level above this document).

The launcher works regardless of the current terminal directory and supports paths containing spaces. It starts the installed Electron application and closes its console after launch.

If dependencies are missing, it installs them first using npm. If Node.js or npm is missing, it asks **Y / N** before installing Node.js LTS through Windows Package Manager (`winget`). Choose **N** to cancel without installing anything. Choose **Y** to run the installer, then continue with app dependencies. Internet access is required; Windows may request administrator approval or license confirmation. If winget is unavailable, the runner provides the official Node.js download address. Setup failures remain visible in the console.

To create a desktop shortcut, right-click the launcher and select **Show more options → Send to → Desktop (create shortcut)**. Keep the launcher in the application folder; use a shortcut rather than moving the file.

This is a launcher for the existing app folder, not a standalone installer.

Setup shows three labeled stages. Node.js uses WinGet's download progress and an interactive installer window. App dependencies enable npm progress and foreground installation output, including Electron's download bar when available (it may appear only for longer downloads). These are real tool-reported indicators, not an estimated overall percentage. No global npm or WinGet settings are changed.
