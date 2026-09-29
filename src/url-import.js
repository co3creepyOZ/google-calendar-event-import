'use strict';
let loadedTimetable=null,loadedURL='',loadVersion=0;
let allowAmbiguousOnce=false;
let conflictChoicesOnce={};
let sourcePreferences={source:'markdown',url:$('timetable-url').value,mode:'teachers',teachers:'',classes:''};
try{
  const saved=JSON.parse(localStorage.getItem('timetable-source')||'null');
  if(saved&&['markdown','url'].includes(saved.source)&&['teachers','classes'].includes(saved.mode)){
    sourcePreferences={...sourcePreferences,...saved};
    $('source-mode').value=saved.source;$('schedule-mode').value=saved.mode;
    if(typeof saved.url==='string')$('timetable-url').value=saved.url;
  }
}catch{}
function saveSource(){
  sourcePreferences.source=$('source-mode').value;
  sourcePreferences.url=$('timetable-url').value.trim();
  sourcePreferences.mode=$('schedule-mode').value;
  try{localStorage.setItem('timetable-source',JSON.stringify(sourcePreferences));}
  catch{$('url-status').textContent='Не вдалося зберегти вибір локально.';}
}
function invalidateSource(){
  conflictChoicesOnce={};
  allowAmbiguousOnce=false;
  $('ambiguity-error').hidden=true;
  $('save').disabled=true;invalidateIcs();$('script-push').disabled=true;
  status('Джерело змінено. Створіть новий перегляд.');
}
function sourceVisibility(){
  const isURL=$('source-mode').value==='url';
  $('url-input').hidden=!isURL;$('markdown-input').hidden=isURL;
  $('file').closest('label').hidden=isURL;
}
function populateOptions(){
  const mode=$('schedule-mode').value;
  const entries=Object.entries(loadedTimetable?.[mode]||{}).sort((a,b)=>a[1].name.localeCompare(b[1].name,'uk',{numeric:true}));
  $('schedule-item').innerHTML='<option value="">Оберіть '+(mode==='teachers'?'вчителя':'клас')+'</option>'+entries.map(([id,item])=>'<option value="'+esc(id)+'">'+esc(item.name)+'</option>').join('');
  $('schedule-item').disabled=!entries.length;
  const saved=sourcePreferences[mode];
  if(entries.some(([id])=>id===saved))$('schedule-item').value=saved;
  renderGroupFilters();
}
$('source-mode').addEventListener('change',()=>{sourceVisibility();saveSource();invalidateSource();});
$('schedule-mode').addEventListener('change',()=>{populateOptions();saveSource();invalidateSource();});
$('schedule-item').addEventListener('change',()=>{
  sourcePreferences[$('schedule-mode').value]=$('schedule-item').value;
  saveSource();invalidateSource();renderGroupFilters();
});
$('timetable-url').addEventListener('input',()=>{
  loadVersion++;loadedTimetable=null;loadedURL='';populateOptions();saveSource();invalidateSource();
});
$('load-timetable').addEventListener('click',async()=>{
  const version=++loadVersion,url=$('timetable-url').value.trim();
  $('load-timetable').disabled=true;loadedTimetable=null;populateOptions();invalidateSource();
  $('url-status').textContent='Завантаження сторінки…';saveSource();
  try{
    const result=await window.timetableSource.load(url);
    if(version!==loadVersion)return;
    loadedTimetable=result.data;loadedURL=url;populateOptions();
    $('url-status').textContent='Завантажено: '+Object.keys(result.data.teachers).length+' вчителів, '+Object.keys(result.data.classes).length+' класів.'+(result.updated?' Оновлено на сайті: '+result.updated:'');
  }catch(e){if(version===loadVersion)$('url-status').textContent=e.message;}
  finally{$('load-timetable').disabled=false;}
});
function selectedSchedule(){
  const allowAmbiguous=allowAmbiguousOnce;
  const conflictChoices=conflictChoicesOnce;
  allowAmbiguousOnce=false;
  conflictChoicesOnce={};
  if($('source-mode').value!=='url')return parse($('md').value);
  if(!loadedTimetable||loadedURL!==$('timetable-url').value.trim())throw Error('Завантажте сторінку розкладу.');
  const selected=TimetableFormat.selected(loadedTimetable,$('schedule-mode').value,$('schedule-item').value,{...currentGroupFilters(),allowAmbiguous,conflictChoices});
  const result=parse(selected.markdown);
  result.events.forEach((event,index)=>{event.teacher=selected.lessons[index].teacher;});
  result.warnings=selected.warnings;
  return result;
}
function groupScope(){
  const url=new URL($('timetable-url').value);
  return JSON.stringify([url.origin+url.pathname,$('schedule-mode').value,$('schedule-item').value,$('year').value]);
}
function currentGroupFilters(){
  return sourcePreferences.groupFilters?.[groupScope()]||{defaultGroup:'all',overrides:{}};
}
function saveGroupFilters(filters){
  sourcePreferences.groupFilters??={};
  sourcePreferences.groupFilters[groupScope()]=filters;
  saveSource();invalidateSource();
}
function groupOptions(groups,selected,inherit=false){
  const options=[...(inherit?[['inherit','Як для всіх уроків']]:[]),['all','Усі групи'],...groups.map(g=>[g,'Група '+g]),['none','Не включати']];
  return options.map(([value,label])=>'<option value="'+value+'"'+(value===selected?' selected':'')+'>'+label+'</option>').join('');
}
function renderGroupFilters(){
  const ready=loadedTimetable&&$('schedule-item').value;
  $('group-filters').hidden=!ready;
  if(!ready){$('lesson-groups').innerHTML='';return;}
  const all=TimetableFormat.selected(loadedTimetable,$('schedule-mode').value,$('schedule-item').value).lessons;
  const filters=currentGroupFilters();
  $('teacher-active-label').hidden=$('schedule-mode').value!=='teachers';
  $('teacher-active-hint').hidden=$('schedule-mode').value!=='teachers';
  $('teacher-active').checked=filters.teacherActive===true;
  const groups=[...new Set(all.map(l=>l.groupNumber).filter(g=>g!=='0'))].sort((a,b)=>a-b);
  // Keep saved choices visible even when a refreshed page no longer has that group.
  if(/^[1-9]\d*$/.test(filters.defaultGroup)&&!groups.includes(filters.defaultGroup))groups.push(filters.defaultGroup);
  $('default-group').innerHTML=groupOptions(groups,filters.defaultGroup||'all');
  const lessons=new Map();
  for(const lesson of all){
    if(!lessons.has(lesson.lessonKey))lessons.set(lesson.lessonKey,{...lesson,groups:new Set()});
    if(lesson.groupNumber!=='0')lessons.get(lesson.lessonKey).groups.add(lesson.groupNumber);
  }
  $('lesson-groups').innerHTML='<table><thead><tr><th>День / урок</th><th>Клас · предмет</th><th>Група</th></tr></thead><tbody>'+[...lessons.values()].map(l=>{
    const choice=filters.overrides?.[l.lessonKey]??'inherit';
    const available=[...l.groups].sort((a,b)=>a-b);
    if(/^[1-9]\d*$/.test(choice)&&!available.includes(choice))available.push(choice);
    return '<tr><td>'+esc(loadedTimetable.days[l.day].replace(/<[^>]*>/g,' '))+' · №'+esc(l.number)+'</td><td>'+esc(l.className)+' · '+esc(l.subject)+'</td><td><select data-lesson-key="'+esc(l.lessonKey)+'" aria-label="'+esc(l.className+' '+l.subject+' урок '+l.number)+'">'+groupOptions(available,choice,true)+'</select></td></tr>';
  }).join('')+'</tbody></table>';
}
$('default-group').addEventListener('change',()=>{
  const filters=currentGroupFilters();
  saveGroupFilters({...filters,defaultGroup:$('default-group').value});
});
$('teacher-active').addEventListener('change',()=>{
  saveGroupFilters({...currentGroupFilters(),teacherActive:$('teacher-active').checked});
});
$('lesson-groups').addEventListener('change',event=>{
  const key=event.target.dataset.lessonKey;if(!key)return;
  const filters=currentGroupFilters(),overrides={...filters.overrides};
  if(event.target.value==='inherit')delete overrides[key];else overrides[key]=event.target.value;
  saveGroupFilters({...filters,overrides});
});
$('year').addEventListener('input',renderGroupFilters);
sourceVisibility();
$('ambiguity-list').addEventListener('click',event=>{
  const option=event.target.closest('.conflict-option');
  const clear=event.target.closest('.clear-conflict');
  if(!option&&!clear)return;
  const slot=(option||clear).closest('.conflict-slot');
  const activate=option&&option.getAttribute('aria-pressed')!=='true';
  slot.querySelectorAll('.conflict-option').forEach(button=>{
    button.setAttribute('aria-pressed',String(!!activate&&button===option));
  });
  slot.querySelector('.clear-conflict').disabled=!activate;
  slot.querySelector('.conflict-selection-status').textContent=activate?'Включено лише вибраний варіант.':'Без вибору — буде включено всі варіанти.';
  if(clear)slot.querySelector('.conflict-option').focus();
});
$('generate-all-variants').addEventListener('click',()=>{
  allowAmbiguousOnce=true;
  conflictChoicesOnce=Object.fromEntries([...document.querySelectorAll('.conflict-option[aria-pressed="true"]')].map(button=>[button.dataset.slotKey,button.dataset.candidateKey]));
  $('go').click();
});
