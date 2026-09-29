const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('previewHistory',{
  load:()=>ipcRenderer.invoke('preview-history-load'),
  save:data=>ipcRenderer.invoke('preview-history-save',data)
});
contextBridge.exposeInMainWorld('timetableSource',{load:url=>ipcRenderer.invoke('load-rozklad',url)});
contextBridge.exposeInMainWorld('scriptSync',{
  connect:connection=>ipcRenderer.invoke('script-connect',connection),
  status:()=>ipcRenderer.invoke('script-status'),
  disconnect:()=>ipcRenderer.invoke('script-disconnect'),
  source:()=>ipcRenderer.invoke('script-source'),
  sync:payload=>ipcRenderer.invoke('script-sync',payload)
});
contextBridge.exposeInMainWorld('googleCalendar', {
  configure:()=>ipcRenderer.invoke('google-config'),
  signIn:()=>ipcRenderer.invoke('google-signin'),
  status:()=>ipcRenderer.invoke('google-status'),
  calendars:()=>ipcRenderer.invoke('google-calendars'),
  disconnect:()=>ipcRenderer.invoke('google-disconnect'),
  create:payload=>ipcRenderer.invoke('google-create',payload)
});
contextBridge.exposeInMainWorld('calendarApp', { saveCsv: csv => ipcRenderer.invoke('save-csv', csv), saveIcs: ics => ipcRenderer.invoke('save-ics', ics), fetchTimetable: url => ipcRenderer.invoke('fetch-timetable', url) });
