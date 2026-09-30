$ErrorActionPreference = 'Stop'
$appFolder = Split-Path -Parent $PSScriptRoot
$launcher = Join-Path $appFolder 'Start Calendar Generator.cmd'
$icon = Join-Path $appFolder 'assets\app-icon.ico'
if (!(Test-Path -LiteralPath $launcher) -or !(Test-Path -LiteralPath $icon)) { throw 'Launcher or app icon is missing.' }
$desktopFolder = [Environment]::GetFolderPath('Desktop')
$shortcutPath = Join-Path $desktopFolder 'Google Calendar Event Generator.lnk'
$shell = New-Object -ComObject WScript.Shell
if (Test-Path -LiteralPath $shortcutPath) {
  $existing = $shell.CreateShortcut($shortcutPath)
  if ($existing.TargetPath -ne $launcher) {
    throw 'A shortcut with this name points to another app. Rename it before trying again.'
  }
}
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $launcher
$shortcut.WorkingDirectory = $appFolder
$shortcut.IconLocation = "$icon,0"
$shortcut.Description = 'School timetable to Google Calendar'
$shortcut.Save()
Write-Output "Desktop shortcut created: $shortcutPath"
