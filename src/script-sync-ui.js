'use strict';
if(window.scriptSync){
  let scriptConnected=false,scriptBusy=false;
  const message=text=>$('script-status').textContent=text;
  function controls(){
    $('script-connect').disabled=scriptBusy;
    $('script-disconnect').disabled=scriptBusy;
    $('script-push').disabled=scriptBusy||!scriptConnected||!exportReady;
  }
  async function run(fn){
    if(scriptBusy)return;scriptBusy=true;controls();
    try{await fn();}catch(e){message(e.message);}
    finally{scriptBusy=false;controls();}
  }
  const describe=info=>'Підключено: '+info.name+' · '+info.calendarId+' · '+info.timeZone;
  function restoreFields(info){
    $('script-url').value=info.url;
    $('script-key').value='';
    $('script-key').placeholder='Ключ збережено на цьому пристрої';
    $('script-connect').textContent='Перевірити підключення';
  }
  $('script-connect').addEventListener('click',()=>run(async()=>{
    const info=await window.scriptSync.connect({url:$('script-url').value.trim(),key:$('script-key').value.trim()});
    scriptConnected=true;restoreFields(info);message(describe(info)+' · URL і ключ збережено.');
  }));
  $('script-disconnect').addEventListener('click',()=>run(async()=>{
    await window.scriptSync.disconnect();scriptConnected=false;
    $('script-key').value='';$('script-url').value='';
    $('script-key').placeholder='Ключ із журналу setup';
    $('script-connect').textContent='Підключити';
    message('Локальні дані Apps Script повністю видалено.');
  }));
  $('script-source').addEventListener('click',async()=>{
    try{$('script-code').value=await window.scriptSync.source();$('script-code').hidden=false;$('script-code').focus();$('script-code').select();}
    catch(e){message(e.message);}
  });
  $('script-push').addEventListener('click',()=>run(async()=>{
    if(!exportReady)return;
    const events=generatedEvents.map(e=>({title:eventTitle(e),date:key(e.date),lesson:e.n,start:e.start,end:e.end,group:e.group,room:e.room,color:gradeColor(gradeOf(e))}));
    message('Синхронізація… не закривайте програму.');
    const result=await window.scriptSync.sync({events,reminder:$('reminder').value});
    message(result.canceled?'Синхронізацію скасовано.':'Створено: '+result.created+'. Оновлено: '+result.updated+'.'+(result.error?' Помилка: '+result.error+' Повторіть синхронізацію після виправлення.':''));
  }));
  $('go').addEventListener('click',controls);
  for(const id of ['md','bells','year'])$(id).addEventListener('input',controls);
  $('file').addEventListener('change',controls);
  run(async()=>{
    const info=await window.scriptSync.status();
    if(info){
      scriptConnected=true;restoreFields(info);
      message('Збережене підключення відновлено'+(info.name?': '+info.name:'')+'. URL і ключ залишаються до відключення. Доступ перевіряється під час синхронізації.');
    }
  });
}
