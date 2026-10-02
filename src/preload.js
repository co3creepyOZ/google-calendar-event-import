const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('previewHistory',{
  load:()=>ipcRenderer.invoke('preview-history-load'),
  save:data=>ipcRenderer.invoke('preview-history-save',data),
  remove:entry=>ipcRenderer.invoke('preview-history-remove',entry)
});
contextBridge.exposeInMainWorld('timetableSource',{load:url=>ipcRenderer.invoke('load-rozklad',url)});
contextBridge.exposeInMainWorld('calendarApp', { saveCsv: csv => ipcRenderer.invoke('save-csv', csv), saveIcs: ics => ipcRenderer.invoke('save-ics', ics), fetchTimetable: url => ipcRenderer.invoke('fetch-timetable', url) });
