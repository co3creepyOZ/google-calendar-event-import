'use strict';
// Store data, never rendered HTML or connection credentials.
(async()=>{
  const storageKey='lesson-preview-history-v1';
  const controls=document.createElement('div');
  controls.className='preview-history';
  controls.innerHTML='<button type="button" id="save-preview">Зберегти перегляд</button><select id="preview-history" aria-label="Збережені перегляди"><option value="">Історія переглядів</option></select>';
  document.querySelector('.preview .summary').append(controls);
  let entries=[];
  let ready=false;
  $('save-preview').disabled=true;
  function decode(entry){
    if(entry?.version!==1||!entry.data||!Array.isArray(entry.data.days)||!entry.data.days.length||!Array.isArray(entry.data.events))throw Error('Некоректний запис історії.');
    const date=value=>{if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))throw Error('Некоректна дата.');const d=new Date(value+'T12:00:00');if(!Number.isFinite(+d)||key(d)!==value)throw Error('Некоректна дата.');return d;};
    const bells=map=>{if(!map||typeof map!=='object')throw Error('Некоректні дзвінки.');for(const [n,pair] of Object.entries(map)){if(!/^\d+$/.test(n)||!Array.isArray(pair)||pair.length!==2||pair.some(t=>typeof t!=='string'||!/^([01]\d|2[0-3]):[0-5]\d$/.test(t))||pair[0]>=pair[1])throw Error('Некоректні дзвінки.');}return map;};
    bells(entry.data.bells);
    Object.values(entry.data.dayBells||{}).forEach(bells);
    if(!['none','0','5','10','15','30','60','1440'].includes(entry.reminder))throw Error('Некоректне сповіщення.');
    if(!entry.colors||Object.entries(entry.colors).some(([g,c])=>!/^(?:[1-9]|1[0-2]|other)$/.test(g)||!/^#[0-9a-f]{6}$/i.test(c)))throw Error('Некоректні кольори.');
    return {...entry.data,days:entry.data.days.map(date),events:entry.data.events.map(e=>{
      if(['n','start','end','subject','group'].some(k=>typeof e[k]!=='string')||(e.room!=null&&typeof e.room!=='string'))throw Error('Некоректна подія.');
      return {...e,date:date(e.date)};
    })};
  }
  function options(){
    const select=$('preview-history');
    select.replaceChildren(new Option('Історія переглядів ('+entries.length+')',''));
    entries.forEach((entry,i)=>select.add(new Option(entry.label,String(i))));
  }
  function restore(entry){
    const data=decode(entry);
    gradeColors={...entry.colors};
    $('reminder').value=entry.reminder;
    render(data);
    const tab=['calendar','list','csv'].includes(entry.tab)?entry.tab:'calendar';
    $('tab-'+tab).click();
    showWorkspace('preview',false);
    status('Відновлено збережений перегляд. Вхідний розклад і дзвінки в налаштуваннях не змінено.');
  }
  $('save-preview').addEventListener('click',async()=>{
    if(!ready)return;
    if(!currentPreview||!exportReady){status('Спочатку згенеруйте актуальний перегляд із подіями.',true);return;}
    $('save-preview').disabled=true;
    try{
      const savedAt=new Date().toISOString();
      const data={...currentPreview,days:currentPreview.days.map(key),events:currentPreview.events.map(e=>({...e,date:key(e.date)}))};
      const entry={version:1,savedAt,data,colors:{...gradeColors},reminder:$('reminder').value,tab:document.querySelector('.tabs [aria-selected="true"]').id.replace('tab-',''),label:$('range').textContent+' · '+data.events.length+' подій · '+new Date(savedAt).toLocaleString('uk-UA')};
      decode(entry);
      const next=[entry,...entries];
      const file=await window.previewHistory.save(next);
      entries=JSON.parse(JSON.stringify(next));options();$('preview-history').value='0';
      status('Перегляд збережено: '+file);
    }catch(e){status('Не вдалося зберегти перегляд: '+e.message,true);}
    finally{$('save-preview').disabled=false;}
  });
  $('preview-history').addEventListener('change',()=>{
    if($('preview-history').value==='')return;
    try{restore(entries[Number($('preview-history').value)]);}catch(e){status('Не вдалося відкрити перегляд: '+e.message,true);}
  });
  try{
    let raw=await window.previewHistory.load();
    if(raw===null){
      raw=JSON.parse(localStorage.getItem(storageKey)||'[]');
      if(!Array.isArray(raw))throw Error('Некоректна історія.');
      raw.forEach(decode);
      // Keep the original localStorage copy as a migration backup.
      if(raw.length)await window.previewHistory.save(raw);
    }
    if(!Array.isArray(raw))throw Error('Некоректна історія.');
    let skipped=0;
    entries=raw.filter(entry=>{try{decode(entry);return true;}catch{skipped++;return false;}});
    options();
    if(entries.length){restore(entries[0]);$('preview-history').value='0';}
    if(skipped)status('Деякі пошкоджені записи історії не вдалося відкрити.',true);
    ready=true;$('save-preview').disabled=false;
  }catch(e){options();status('Не вдалося прочитати історію переглядів: '+e.message,true);}
})();
