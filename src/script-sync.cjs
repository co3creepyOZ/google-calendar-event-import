const {app,ipcMain,dialog,safeStorage}=require('electron');
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const file=()=>path.join(app.getPath('userData'),'apps-script-sync.enc');
function validateConnection(c){
  if(!c||!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(c.url)||!/^[a-f0-9]{64}$/i.test(c.key))throw Error('Use the deployment /exec URL and 64-character connection key.');
}
async function read(){try{return JSON.parse(safeStorage.decryptString(await fs.readFile(file())));}catch(e){if(e.code==='ENOENT')return null;throw Error('Cannot read connection. Reconnect Apps Script.');}}
async function request(c,data){
  validateConnection(c);
  const payload=JSON.stringify({...data,timestamp:Date.now(),nonce:crypto.randomBytes(16).toString('hex')});
  const signature=crypto.createHmac('sha256',c.key).update(payload).digest('base64url');
  let response=await fetch(c.url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({payload,signature}),redirect:'manual',signal:AbortSignal.timeout(120000)});
  if([301,302,303].includes(response.status)){
    const url=new URL(response.headers.get('location'));
    if(url.protocol!=='https:'||url.hostname!=='script.googleusercontent.com')throw Error('Check deployment access: it must allow Anyone.');
    response=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(120000)});
  }
  if(!response.ok)throw Error('Apps Script HTTP '+response.status);
  let result;try{result=await response.json();}catch{throw Error('Expected JSON. Check the deployment URL and access settings.');}
  if(!result.ok)throw Error(result.error||'Apps Script request failed.');
  return result;
}
function register(){
  let busy=false;
  const handle=(name,fn)=>ipcMain.handle(name,async(event,...args)=>{
    if(event.senderFrame.url!==require('node:url').pathToFileURL(path.join(__dirname,'app.html')).href)throw Error('Invalid caller');
    if(busy)throw Error('Sync is already running');busy=true;
    try{return await fn(...args);}finally{busy=false;}
  });
  handle('script-connect',async c=>{
    c={url:c?.url,key:c?.key};
    if(!c.key){
      const saved=await read();
      if(saved?.url===c.url)c.key=saved.key;
    }
    validateConnection(c);
    const info=await request(c,{action:'info'});
    if(!safeStorage.isEncryptionAvailable())throw Error('Windows encryption unavailable');
    const metadata={name:info.name,calendarId:info.calendarId,timeZone:info.timeZone};
    await fs.writeFile(file(),safeStorage.encryptString(JSON.stringify({...c,profile:info.profile,metadata})));
    return {...metadata,url:c.url,saved:true};
  });
  // Restore locally even offline. Sync always verifies the remote profile before writing.
  handle('script-status',async()=>{
    const c=await read();
    if(!c)return null;
    validateConnection(c);
    return {url:c.url,saved:true,...c.metadata};
  });
  handle('script-disconnect',async()=>{await fs.rm(file(),{force:true});return true;});
  handle('script-source',async()=>fs.readFile(path.join(__dirname,'..','apps-script','Code.gs'),'utf8'));
  handle('script-sync',async data=>{
    if(!data||!Array.isArray(data.events)||!data.events.length||data.events.length>200)throw Error('Sync requires 1–200 lessons.');
    const c=await read();if(!c)throw Error('Connect Apps Script first.');
    const info=await request(c,{action:'info'});
    if(info.profile!==c.profile)throw Error('Google profile changed. Reconnect before syncing.');
    const answer=await dialog.showMessageBox({type:'question',buttons:['Скасувати','Синхронізувати'],cancelId:0,defaultId:0,message:'Синхронізувати '+data.events.length+' уроків із «'+info.name+'»?',detail:'Календар: '+info.calendarId+'\nЧасовий пояс: '+info.timeZone+'\nНові уроки буде створено, наявні — оновлено. Видалення не виконуються.'});
    if(answer.response!==1)return {canceled:true};
    return request(c,{action:'sync',profile:c.profile,events:data.events,reminder:data.reminder});
  });
}
module.exports={register,validateConnection,request};
