'use strict';
const fs=require('node:fs/promises');
const path=require('node:path');
const {createHash}=require('node:crypto');
function createStore(folder){
  const directory=path.join(folder,'local-storage','history');
  const oldDirectory=path.join(folder,'history');
  function validate(data){
    if(!Array.isArray(data)||data.some(e=>e?.version!==1||!e.data||!Array.isArray(e.data.events)||!Array.isArray(e.data.days)))throw Error('Invalid preview history');
    return data;
  }
  function filename(entry){
    const stamp=String(entry.savedAt||'undated').replace(/[^0-9A-Za-z-]/g,'-');
    const hash=createHash('sha256').update(JSON.stringify(entry)).digest('hex');
    return path.join(directory,'preview-'+stamp+'-'+hash+'.json');
  }
  async function writeEntries(entries){
    for(const entry of entries){
      const file=filename(entry);
      try{await fs.access(file);continue;}catch(e){if(e.code!=='ENOENT')throw e;}
      await fs.writeFile(file+'.tmp',JSON.stringify(entry,null,2),'utf8');
      await fs.rename(file+'.tmp',file);
    }
  }
  const initialized=(async()=>{
    await fs.mkdir(directory,{recursive:true});
    let oldFiles=[];
    try{oldFiles=await fs.readdir(oldDirectory,{withFileTypes:true});}
    catch(e){if(e.code!=='ENOENT')throw e;}
    for(const entry of oldFiles){
      if(!entry.isFile())throw Error('Unexpected folder in legacy history: '+entry.name);
      const source=path.join(oldDirectory,entry.name),target=path.join(directory,entry.name);
      try{
        const existing=await fs.readFile(target);
        if(!existing.equals(await fs.readFile(source)))throw Error('History file conflict: '+entry.name);
        await fs.unlink(source);
      }catch(e){
        if(e.code!=='ENOENT')throw e;
        await fs.rename(source,target);
      }
    }
    try{await fs.rmdir(oldDirectory);}catch(e){if(e.code!=='ENOENT')throw e;}
    for(const legacy of [path.join(directory,'preview-history.json'),path.join(folder,'preview-history.json')]){
      let entries;
      try{entries=validate(JSON.parse(await fs.readFile(legacy,'utf8')));}
      catch(e){if(e.code==='ENOENT')continue;throw e;}
      await writeEntries(entries);
      // Keep a recoverable copy, excluded from the active JSON snapshots.
      await fs.rename(legacy,legacy+'.'+Date.now()+'.bak');
    }
  })();
  initialized.catch(()=>{});
  let pending=Promise.resolve();
  return {
    async load(){
      await initialized;
      await pending;
      const files=(await fs.readdir(directory)).filter(name=>/^preview-.+-[a-f0-9]{64}\.json$/.test(name));
      if(!files.length){
        try{await fs.access(path.join(directory,'.history-initialized'));return [];}catch(e){if(e.code!=='ENOENT')throw e;}
        return null;
      }
      const entries=[];
      for(const name of files){
        const entry=JSON.parse(await fs.readFile(path.join(directory,name),'utf8'));
        validate([entry]);entries.push(entry);
      }
      return entries.sort((a,b)=>String(b.savedAt||'').localeCompare(String(a.savedAt||'')));
    },
    remove(entry){
      validate([entry]);
      const file=filename(entry);
      const operation=pending.then(async()=>{
        await initialized;
        await fs.writeFile(path.join(directory,'.history-initialized'),'1','utf8');
        // Retain a recoverable copy, but exclude it from active history.
        await fs.rename(file,file+'.'+Date.now()+'.deleted');
      });
      pending=operation.catch(()=>{});
      return operation;
    },
    save(data){
      const entries=JSON.parse(JSON.stringify(validate(data)));
      const operation=pending.then(async()=>{
        await initialized;
        await writeEntries(entries);
        return entries.length?filename(entries[0]):directory;
      });
      pending=operation.catch(()=>{});
      return operation;
    }
  };
}
function register(){
  const {app,ipcMain}=require('electron');
  const store=createStore(app.isPackaged?path.dirname(app.getPath('exe')):app.getAppPath());
  ipcMain.handle('preview-history-load',()=>store.load());
  ipcMain.handle('preview-history-save',(_,data)=>store.save(data));
  ipcMain.handle('preview-history-remove',async(event,entry)=>{
    const {dialog,BrowserWindow}=require('electron');
    const expected=require('node:url').pathToFileURL(path.join(__dirname,'app.html')).href;
    if(event.senderFrame.url!==expected)throw Error('Invalid caller');
    const result=await dialog.showMessageBox(BrowserWindow.fromWebContents(event.sender),{
      type:'warning',title:'Видалити збережений перегляд?',
      message:'Видалити цей перегляд з історії?',detail:String(entry?.label||'')+'\nПодії в Google Calendar не зміняться. Копія файлу залишиться з розширенням .deleted.',
      buttons:['Скасувати','Видалити'],defaultId:0,cancelId:0,noLink:true
    });
    if(result.response!==1)return {canceled:true};
    await store.remove(entry);return {canceled:false};
  });
}
module.exports={createStore,register};
