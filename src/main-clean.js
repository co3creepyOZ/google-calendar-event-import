const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');
const https = require('node:https');
try {
  require('./local-storage.cjs').configureLocalStorage(app);
} catch(error) {
  dialog.showErrorBox('Не вдалося відкрити локальне сховище',
    'Закрийте всі вікна програми та перевірте права запису в папку програми. Попередні дані збережено.\n\n'+error.message);
  process.exit(1);
}
if(!app.requestSingleInstanceLock())process.exit(0);
app.on('second-instance',()=>{
  const win=BrowserWindow.getAllWindows()[0];
  if(win){if(win.isMinimized())win.restore();win.focus();}
});
require('./timetable-source.cjs').register();
require('./preview-store.cjs').register();
function createWindow() {
  const {loadWindowState,rememberWindowState}=require('./window-state.cjs');
  const state=loadWindowState(app.getPath('userData'),require('electron').screen.getPrimaryDisplay().workAreaSize);
  const win = new BrowserWindow({ width: state.width, height: state.height, show: false, icon: path.join(__dirname, '..', 'assets', 'app-icon.png'), webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false } });
  rememberWindowState(win,app.getPath('userData'));
  win.once('ready-to-show',()=>{if(state.maximized)win.maximize();win.show();});
  win.removeMenu();
  const helpLinks=new Set(['https://client.rozklad.org/','https://chromewebstore.google.com/detail/obsidian-web-clipper/cnjifjpddelmedmihgijeibhnjfabmlf']);
  win.webContents.setWindowOpenHandler(({url})=>{
    if(helpLinks.has(url))require('electron').shell.openExternal(url).catch(error=>dialog.showErrorBox('Не вдалося відкрити посилання',error.message));
    return {action:'deny'};
  });
  win.loadFile(path.join(__dirname, 'app.html'));
}
app.whenReady().then(() => { createWindow(); app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow(); }); });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
ipcMain.handle('save-csv', async (_, csv) => {
  const result = await dialog.showSaveDialog({ defaultPath: 'google-calendar-events.csv', filters: [{ name: 'CSV files', extensions: ['csv'] }] });
  if (result.canceled || !result.filePath) return { canceled: true };
  await fs.writeFile(result.filePath, csv, 'utf8');
  return { canceled: false, filePath: result.filePath };
});
ipcMain.handle('save-ics', async (_, ics) => {
  if (typeof ics !== 'string' || !ics.startsWith('BEGIN:VCALENDAR')) throw new Error('Invalid calendar file');
  const result = await dialog.showSaveDialog({ defaultPath: 'google-calendar-events.ics', filters: [{ name: 'iCalendar', extensions: ['ics'] }] });
  if (result.canceled || !result.filePath) return { canceled: true };
  await fs.writeFile(result.filePath, ics, 'utf8');
  return { canceled: false, filePath: result.filePath };
});
ipcMain.handle('fetch-timetable', async (_, url) => new Promise((resolve, reject) => {
  https.get(url, response => { let data = ''; response.setEncoding('utf8'); response.on('data', chunk => data += chunk); response.on('end', () => response.statusCode >= 200 && response.statusCode < 300 ? resolve(data) : reject(new Error('HTTP ' + response.statusCode))); }).on('error', reject);
}));
