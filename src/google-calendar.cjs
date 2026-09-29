const {app,ipcMain,dialog,shell,safeStorage}=require('electron');
const fs=require('node:fs/promises');
const path=require('node:path');
const http=require('node:http');
const crypto=require('node:crypto');
let credentials, tokens, busy=false;
const file=()=>path.join(app.getPath('userData'),'google-calendar.enc');
async function persist(){
  if(!safeStorage.isEncryptionAvailable())throw Error('Windows encryption is unavailable.');
  await fs.writeFile(file(),safeStorage.encryptString(JSON.stringify({credentials,tokens})));
}
async function load(){
  if(credentials)return;
  try{const saved=JSON.parse(safeStorage.decryptString(await fs.readFile(file())));credentials=saved.credentials;tokens=saved.tokens;}
  catch(e){if(e.code!=='ENOENT')throw Error('Cannot read saved Google connection. Load OAuth JSON again.');}
}
async function tokenRequest(params){
  const r=await fetch('https://oauth2.googleapis.com/token',{method:'POST',body:new URLSearchParams(params),signal:AbortSignal.timeout(30000)});
  const data=await r.json();
  if(!r.ok)throw Error('Google authentication failed: '+(data.error||r.status));
  return {...data,expires:Date.now()+data.expires_in*1000};
}
async function access(){
  await load();
  if(!tokens)throw Error('Sign in to Google first.');
  if(tokens.expires<Date.now()+60000){
    if(!tokens.refresh_token)throw Error('Please sign in again.');
    tokens={...tokens,...await tokenRequest({client_id:credentials.client_id,client_secret:credentials.client_secret,refresh_token:tokens.refresh_token,grant_type:'refresh_token'})};
    await persist();
  }
  return tokens.access_token;
}
async function api(route,options={}){
  const token=await access();
  const r=await fetch('https://www.googleapis.com/calendar/v3'+route,{...options,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},signal:AbortSignal.timeout(30000)});
  const data=await r.json();
  if(!r.ok){const error=Error(data.error?.message||'Google Calendar request failed');error.status=r.status;throw error;}
  return data;
}
async function calendars(){
  const items=[];let page;
  do{const result=await api('/users/me/calendarList?minAccessRole=writer'+(page?'&pageToken='+encodeURIComponent(page):''));items.push(...result.items||[]);page=result.nextPageToken;}while(page);
  return items.map(c=>({id:c.id,name:c.summary,timeZone:c.timeZone,primary:!!c.primary}));
}
async function signIn(){
  await load();
  if(!credentials)throw Error('Load Google OAuth Desktop client JSON first.');
  const verifier=crypto.randomBytes(32).toString('base64url'),state=crypto.randomBytes(24).toString('hex');
  let server,timer;
  try{
    const code=await new Promise((resolve,reject)=>{
      server=http.createServer((req,res)=>{
        const url=new URL(req.url,'http://127.0.0.1');
        if(url.pathname!=='/callback'||url.searchParams.get('state')!==state){res.writeHead(400);res.end('Invalid callback');return;}
        res.setHeader('Content-Type','text/plain; charset=utf-8');
        res.end('You can close this tab and return to Lesson Planner.');
        if(url.searchParams.get('error'))reject(Error('Google sign-in was declined.'));
        else if(url.searchParams.get('code'))resolve({code:url.searchParams.get('code'),redirect_uri:'http://127.0.0.1:'+server.address().port+'/callback'});
        else reject(Error('Missing authorization code.'));
      });
      server.on('error',reject);
      server.listen(0,'127.0.0.1',()=>{
        const params=new URLSearchParams({client_id:credentials.client_id,redirect_uri:'http://127.0.0.1:'+server.address().port+'/callback',response_type:'code',scope:'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.calendarlist.readonly',access_type:'offline',prompt:'consent',state,code_challenge:crypto.createHash('sha256').update(verifier).digest('base64url'),code_challenge_method:'S256'});
        shell.openExternal('https://accounts.google.com/o/oauth2/v2/auth?'+params).catch(reject);
      });
      timer=setTimeout(()=>reject(Error('Sign-in timed out. Try again.')),180000);
    });
    tokens=await tokenRequest({...code,client_id:credentials.client_id,client_secret:credentials.client_secret,code_verifier:verifier,grant_type:'authorization_code'});
    await persist();
    return await calendars();
  }finally{clearTimeout(timer);server?.close();}
}
function closestColor(hex,colors){
  const rgb=s=>s.slice(1).match(/../g).map(x=>parseInt(x,16)),source=rgb(hex);
  return Object.entries(colors).sort((a,b)=>{
    const distance=c=>rgb(c.background).reduce((sum,v,i)=>sum+(v-source[i])**2,0);
    return distance(a[1])-distance(b[1]);
  })[0]?.[0];
}
function validateEvent(e){
  if(!e||typeof e.title!=='string'||!e.title.trim()||e.title.length>1000||!/^\d{4}-\d{2}-\d{2}$/.test(e.date)||!/^#[a-f0-9]{6}$/i.test(e.color))throw Error('Invalid event.');
  if(![e.start,e.end].every(t=>/^([01]\d|2[0-3]):[0-5]\d$/.test(t))||e.start>=e.end)throw Error('Invalid lesson time.');
}
function register(){
  const handle=(name,fn)=>ipcMain.handle(name,async(event,...args)=>{
    const expected=require('node:url').pathToFileURL(path.join(__dirname,'app.html')).href;
    if(event.senderFrame.url!==expected)throw Error('Invalid caller.');
    if(busy)throw Error('Another Google operation is in progress.');
    busy=true;try{return await fn(...args);}finally{busy=false;}
  });
  handle('google-config',async()=>{
    const result=await dialog.showOpenDialog({title:'Google OAuth Desktop client JSON',properties:['openFile'],filters:[{name:'JSON',extensions:['json']}]});
    if(result.canceled)return false;
    const data=JSON.parse(await fs.readFile(result.filePaths[0],'utf8')).installed;
    if(!data||typeof data.client_id!=='string'||!data.client_id.endsWith('.apps.googleusercontent.com')||typeof data.client_secret!=='string')throw Error('Choose an OAuth Desktop app client JSON.');
    credentials={client_id:data.client_id,client_secret:data.client_secret};tokens=null;await persist();return true;
  });
  handle('google-signin',signIn);
  handle('google-status',async()=>{await load();return {configured:!!credentials,connected:!!tokens};});
  handle('google-calendars',calendars);
  handle('google-disconnect',async()=>{
    // Delete only this app's saved Google connection, including the OAuth client.
    await fs.rm(file(),{force:true});
    tokens=null;
    credentials=null;
    return true;
  });
  handle('google-create',async(payload)=>{
    if(!payload||!Array.isArray(payload.events)||!payload.events.length||payload.events.length>1000)throw Error('Generate 1–1000 events first.');
    payload.events.forEach(validateEvent);
    if(!['none','0','5','10','15','30','60','1440'].includes(payload.reminder))throw Error('Invalid reminder.');
    const calendar=(await calendars()).find(c=>c.id===payload.calendarId);
    if(!calendar)throw Error('Select a writable calendar.');
    const confirmation=await dialog.showMessageBox({type:'question',buttons:['Скасувати','Створити події'],defaultId:0,cancelId:0,message:'Створити '+payload.events.length+' подій у «'+calendar.name+'»?',detail:'Часовий пояс: '+calendar.timeZone+'. Кольори буде наближено до палітри Google. Ідентичні події, створені цим застосунком, буде пропущено.'});
    if(confirmation.response!==1)return {canceled:true};
    const colors=(await api('/colors')).event;
    let created=0,skipped=0;
    for(const e of payload.events){
      const id=crypto.createHash('sha256').update(JSON.stringify([calendar.id,e.date,e.start,e.end,e.title,e.room])).digest('hex');
      const body={id,summary:e.title,description:e.group||'',location:e.room||'',start:{dateTime:e.date+'T'+e.start+':00',timeZone:calendar.timeZone},end:{dateTime:e.date+'T'+e.end+':00',timeZone:calendar.timeZone},colorId:closestColor(e.color,colors),reminders:{useDefault:false,overrides:payload.reminder==='none'?[]:[{method:'popup',minutes:Number(payload.reminder)}]}};
      try{await api('/calendars/'+encodeURIComponent(calendar.id)+'/events',{method:'POST',body:JSON.stringify(body)});created++;}
      catch(error){if(error.status===409){skipped++;continue;}return {created,skipped,error:error.message};}
    }
    return {created,skipped};
  });
}
module.exports={register,closestColor,validateEvent};
