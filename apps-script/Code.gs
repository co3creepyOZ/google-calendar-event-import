// Enable the Calendar advanced service before running setup().
function setup() {
  const properties = PropertiesService.getScriptProperties();
  if (!properties.getProperty('SYNC_KEY')) properties.setProperty('SYNC_KEY', Utilities.getUuid().replace(/-/g,'')+Utilities.getUuid().replace(/-/g,''));
  if (!properties.getProperty('PROFILE_ID')) properties.setProperty('PROFILE_ID', Utilities.getUuid());
  if (!properties.getProperty('CALENDAR_ID')) properties.setProperty('CALENDAR_ID','primary');
  const calendar = Calendar.Calendars.get(properties.getProperty('CALENDAR_ID'));
  console.log('Calendar: '+calendar.summary);
  console.log('Private connection key (do not share): '+properties.getProperty('SYNC_KEY'));
}
function doPost(request) {
  let lock;
  try {
    const config=PropertiesService.getScriptProperties();
    const envelope=JSON.parse(request.postData.contents);
    const secret=config.getProperty('SYNC_KEY');
    if(!secret || typeof envelope.payload!=='string' || envelope.payload.length>500000 || typeof envelope.signature!=='string')throw Error('Invalid request');
    const signature=Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(envelope.payload,secret)).replace(/=+$/,'');
    let mismatch=signature.length^envelope.signature.length;
    for(let i=0;i<signature.length;i++)mismatch|=signature.charCodeAt(i)^(envelope.signature.charCodeAt(i)||0);
    if(mismatch)throw Error('Invalid connection key');
    const data=JSON.parse(envelope.payload);
    if(!Number.isFinite(data.timestamp)||Math.abs(Date.now()-data.timestamp)>300000||!/^[a-f0-9]{32}$/.test(data.nonce))throw Error('Expired request');
    lock=LockService.getScriptLock();lock.waitLock(10000);
    const cache=CacheService.getScriptCache();
    if(cache.get(data.nonce))throw Error('Request already processed');
    cache.put(data.nonce,'1',600);
    const id=config.getProperty('CALENDAR_ID'),profile=config.getProperty('PROFILE_ID');
    if(!id||!profile)throw Error('Run setup first');
    const calendar=Calendar.Calendars.get(id);
    const info={profile,calendarId:calendar.id,name:calendar.summary,timeZone:calendar.timeZone};
    if(data.action==='info')return json_({ok:true,...info});
    if(data.action!=='sync'||data.profile!==profile||!Array.isArray(data.events)||!data.events.length||data.events.length>200)throw Error('Invalid sync request');
    if(!['none','0','5','10','15','30','60','1440'].includes(data.reminder))throw Error('Invalid reminder');
    const keys={};
    data.events.forEach(e=>{
      if(!e||typeof e.title!=='string'||!e.title.trim()||e.title.length>1000||typeof e.group!=='string'||typeof e.room!=='string'||!/^[1-9]\d*$/.test(e.lesson)||!/^\d{4}-\d{2}-\d{2}$/.test(e.date)||!/^#[a-f0-9]{6}$/i.test(e.color))throw Error('Invalid lesson');
      if(![e.start,e.end].every(t=>/^([01]\d|2[0-3]):[0-5]\d$/.test(t))||e.start>=e.end)throw Error('Invalid time');
      const stable=JSON.stringify([profile,calendar.id,e.date,e.lesson,e.group]);
      e.syncId=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,stable).map(b=>('0'+((b+256)%256).toString(16)).slice(-2)).join('');
      if(keys[e.syncId])throw Error('Duplicate class/group in one lesson slot');keys[e.syncId]=true;
    });
    const colors=Calendar.Colors.get().event;
    let created=0,updated=0;
    for(const e of data.events){
      try{
        // Lookup only our deterministic ID; never scan or modify unrelated events.
        const matches=Calendar.Events.list(id,{privateExtendedProperty:'plannerKey='+e.syncId,showDeleted:false,maxResults:2}).items||[];
        const body={summary:e.title,description:e.group,location:e.room,start:{dateTime:e.date+'T'+e.start+':00',timeZone:calendar.timeZone},end:{dateTime:e.date+'T'+e.end+':00',timeZone:calendar.timeZone},colorId:nearest_(e.color,colors),reminders:{useDefault:false,overrides:data.reminder==='none'?[]:[{method:'popup',minutes:Number(data.reminder)}]},extendedProperties:{private:{plannerProfile:profile,plannerKey:e.syncId}}};
        if(matches.length){
          if(matches.length!==1||matches[0].extendedProperties.private.plannerProfile!==profile)throw Error('Event ownership conflict');
          Calendar.Events.patch(body,id,matches[0].id,{sendUpdates:'none'});updated++;
        }else{
          body.id=e.syncId;
          Calendar.Events.insert(body,id,{sendUpdates:'none'});created++;
        }
      }catch(error){return json_({ok:true,...info,created,updated,error:String(error.message||error)});}
    }
    return json_({ok:true,...info,created,updated});
  }catch(error){return json_({ok:false,error:String(error.message||error)});}
  finally{if(lock&&lock.hasLock())lock.releaseLock();}
}
function nearest_(hex,colors){
  const rgb=s=>s.slice(1).match(/../g).map(x=>parseInt(x,16)),source=rgb(hex);
  return Object.keys(colors).sort((a,b)=>{
    const dist=k=>rgb(colors[k].background).reduce((sum,v,i)=>sum+(v-source[i])**2,0);
    return dist(a)-dist(b);
  })[0];
}
function json_(data){return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);}
