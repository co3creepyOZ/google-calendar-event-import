'use strict';
const $ = id => document.getElementById(id);
let csv = '';
let dayBellConfig=null;
const eventTitle = event => [event.group, event.subject].filter(Boolean).join(' — ');
let generatedEvents = [];
let exportReady = false;
let currentPreview = null;
const gradePalette = ['#a62662','#df4567','#d97565','#dd4826','#e58b21','#299c89','#487ce2','#8575cb','#a35dcc','#73564a','#64748b','#7cb342'];
let gradeColors = {};
try {
  const saved=JSON.parse(localStorage.getItem('lesson-grade-colors')||'{}');
  for (const [grade,color] of Object.entries(saved||{})) {
    if (/^(?:[1-9]|1[0-2]|other)$/.test(grade) && /^#[0-9a-f]{6}$/i.test(color)) gradeColors[grade]=color;
  }
} catch {}
const gradeOf = event => event.group.match(/(?:^|:\s*)(1[0-2]|[1-9])(?=\s*[-–—]|\s|$)/)?.[1] || 'other';
const gradeColor = grade => gradeColors[grade] || (grade==='other' ? '#64748b' : gradePalette[(Number(grade)-1)%gradePalette.length]);
function applyGradeColors() {
  document.querySelectorAll('.lesson[data-grade]').forEach(card=>{
    const color=gradeColor(card.dataset.grade);
    card.style.backgroundColor=color+'18';
    card.style.borderLeftColor=color;
    const badge=card.querySelector('.tag');
    if(badge){badge.style.backgroundColor=color+'28';badge.style.color='#152940';}
  });
}
function renderGradePickers() {
  const grades=[...new Set([...Array.from({length:12},(_,i)=>String(i+1)),...generatedEvents.map(gradeOf)])].sort((a,b)=>(a==='other'?99:Number(a))-(b==='other'?99:Number(b)));
  $('grade-colors').innerHTML=grades.map(grade=>'<details class="grade-picker"><summary><span class="grade-dot" data-color="'+gradeColor(grade)+'"></span>'+(grade==='other'?'Інші':grade+' клас')+'<span class="palette-chevron">⌄</span></summary><div class="palette-panel"><p>Колір · '+(grade==='other'?'інші':grade+' клас')+'</p><div class="swatch-grid" role="group" aria-label="Кольори для '+grade+' класу">'+calendarSwatches.map(([color,name])=>'<button type="button" class="color-swatch" data-grade="'+grade+'" data-color="'+color+'" aria-label="'+name+'" title="'+name+'" aria-pressed="'+(gradeColor(grade).toLowerCase()===color)+'"></button>').join('')+'</div><label class="custom-color">＋ Власний колір<input type="color" data-grade="'+grade+'" value="'+gradeColor(grade)+'" aria-label="Власний колір для '+grade+' класу"></label></div></details>').join('');
  paintPalette();
}
const calendarSwatches = [
  ['#b71c50','Бордовий'],['#d81b60','Малиновий'],['#e67c73','Кораловий'],['#d50000','Червоний'],
  ['#f4511e','Мандариновий'],['#ef6c00','Помаранчевий'],['#f09300','Бурштиновий'],['#f6bf26','Жовтий'],
  ['#e4c441','Золотистий'],['#c0ca33','Лимонний'],['#7cb342','Салатовий'],['#0b8043','Зелений'],
  ['#33b679','М’ятний'],['#009688','Бірюзовий'],['#039be5','Блакитний'],['#4285f4','Синій'],
  ['#7986cb','Лавандовий'],['#3f51b5','Індиго'],['#b39ddb','Бузковий'],['#9e69af','Ліловий'],
  ['#8e24aa','Фіолетовий'],['#795548','Коричневий'],['#616161','Графітовий'],['#a79b8e','Сіро-бежевий']
];
function paintPalette() {
  document.querySelectorAll('#grade-colors [data-color]').forEach(el=>{
    el.style.backgroundColor=el.dataset.color;
    if(el.classList.contains('color-swatch')){
      const selected=gradeColor(el.dataset.grade).toLowerCase()===el.dataset.color;
      el.setAttribute('aria-pressed',String(selected));
      el.textContent=selected?'✓':'';
      const rgb=el.dataset.color.slice(1).match(/../g).map(x=>parseInt(x,16));
      el.style.color=(rgb[0]*299+rgb[1]*587+rgb[2]*114)/1000>155?'#152940':'#ffffff';
    }
  });
}
function saveGradeColor(grade,color) {
  gradeColors[grade]=color;
  try{localStorage.setItem('lesson-grade-colors',JSON.stringify(gradeColors));}catch{}
  applyGradeColors();
}
$('grade-colors').addEventListener('click',event=>{
  const swatch=event.target.closest('.color-swatch');
  if(!swatch)return;
  saveGradeColor(swatch.dataset.grade,swatch.dataset.color);
  const picker=swatch.closest('.grade-picker');
  picker.querySelector('.grade-dot').dataset.color=swatch.dataset.color;
  picker.querySelector('input[type=color]').value=swatch.dataset.color;
  paintPalette();
});
$('grade-colors').addEventListener('keydown',event=>{
  const picker=event.target.closest('.grade-picker');
  if(event.key==='Escape'&&picker){picker.open=false;picker.querySelector('summary').focus();}
  const swatch=event.target.closest('.color-swatch');
  if(!swatch)return;
  const buttons=[...picker.querySelectorAll('.color-swatch')],i=buttons.indexOf(swatch);
  const step={ArrowRight:1,ArrowLeft:-1,ArrowDown:8,ArrowUp:-8}[event.key];
  if(step){event.preventDefault();buttons[(i+step+buttons.length)%buttons.length].focus();}
});
$('grade-colors').addEventListener('input',event=>{
  const grade=event.target.dataset?.grade, color=event.target.value;
  if(!grade || !/^#[0-9a-f]{6}$/i.test(color))return;
  saveGradeColor(grade,color);
  event.target.closest('.grade-picker').querySelector('.grade-dot').dataset.color=color;
  paintPalette();
});
$('reset-colors').addEventListener('click',()=>{
  gradeColors={};
  try{localStorage.setItem('lesson-grade-colors','{}');}catch{}
  renderGradePickers();applyGradeColors();
});
function reminderLabel() {
  const value = $('reminder').value;
  return value === 'none' ? 'Без сповіщення' : value === '0' ? 'На початку уроку' : 'За '+value+' хв';
}
function makeIcs(events, reminder) {
  if (!['none','0','5','10','15','30','60','1440'].includes(reminder)) throw Error('Некоректне сповіщення.');
  const escapeText = text => String(text).replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');
  const stamp = new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
  const lines = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Lesson Planner//Calendar Export//UK','CALSCALE:GREGORIAN'];
  events.forEach(e => {
    const date = key(e.date).replaceAll('-','');
    lines.push('BEGIN:VEVENT','UID:'+crypto.randomUUID()+'@lesson-planner','DTSTAMP:'+stamp,
      'DTSTART:'+date+'T'+e.start.replace(':','')+'00','DTEND:'+date+'T'+e.end.replace(':','')+'00',
      'SUMMARY:'+escapeText(eventTitle(e)),'DESCRIPTION:'+escapeText(e.group),'LOCATION:'+escapeText(e.room));
    if (reminder !== 'none') lines.push('BEGIN:VALARM','ACTION:DISPLAY','DESCRIPTION:'+escapeText(eventTitle(e)),'TRIGGER:-PT'+reminder+'M','END:VALARM');
    lines.push('END:VEVENT');
  });
  lines.push('END:VCALENDAR');
  // Fold at 75 UTF-8 octets without splitting Unicode characters.
  return lines.map(line => {
    let folded='',length=0;
    for (const char of line) {
      const bytes=new TextEncoder().encode(char).length;
      if(length+bytes>75){folded+='\r\n ';length=1;}
      folded+=char;length+=bytes;
    }
    return folded;
  }).join('\r\n')+'\r\n';
}
function invalidateIcs() { exportReady=false; $('save-ics').disabled=true; $('google-create').disabled=true; }
const pad = n => String(n).padStart(2, '0');
const key = d => [d.getFullYear(), pad(d.getMonth()+1), pad(d.getDate())].join('-');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const names = ['понеділок','вівторок','середа','четвер','п’ятниця','субота','неділя'];
function status(message, error=false) {
  $('status').textContent = message;
  $('status').classList.toggle('error', error);
}
function selectTab(tab, focus=false) {
  document.querySelectorAll('.tabs [role=tab]').forEach(button => {
    const selected = button === tab;
    button.setAttribute('aria-selected', String(selected));
    button.tabIndex = selected ? 0 : -1;
    $(button.getAttribute('aria-controls')).hidden = !selected;
  });
  if (focus) tab.focus();
}
const tabs = [...document.querySelectorAll('.tabs [role=tab]')];
tabs.forEach((tab,i) => {
  tab.addEventListener('click', () => selectTab(tab));
  tab.addEventListener('keydown', e => {
    const index = e.key === 'ArrowRight' ? (i+1)%tabs.length : e.key === 'ArrowLeft' ? (i+tabs.length-1)%tabs.length : e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length-1 : -1;
    if (index >= 0) { e.preventDefault(); selectTab(tabs[index], true); }
  });
});
function parse(text) {
  const clean = text.replace(/^---\s*\r?\n[\s\S]*?\r?\n---\s*\r?\n/, '');
  const year = Number($('year').value);
  if (!Number.isInteger(year) || year<2000 || year>2100) throw Error('Вкажіть рік від 2000 до 2100.');
  const days = [...clean.matchAll(/(пн|вт|ср|чт|пт|сб|нд)\s*(\d{1,2})\.(\d{1,2})/gi)].map(m => {
    const d = new Date(year, Number(m[3])-1, Number(m[2]));
    if (d.getMonth() !== Number(m[3])-1 || d.getDate() !== Number(m[2])) throw Error('Некоректна дата: '+m[2]+'.'+m[3]);
    return d;
  });
  if (!days.length) throw Error('Не знайдено днів. Додайте заголовок на зразок «пн 28.09вт 29.09».');
  const bells = {};
  $('bells').value.split(/\r?\n/).filter(x=>x.trim()).forEach(line => {
    const m = line.match(/^\s*(\d+)\s*=\s*(\d{2}:\d{2})\s*[-–]\s*(\d{2}:\d{2})\s*$/);
    if (!m || ![m[2],m[3]].every(t=>/^([01]\d|2[0-3]):[0-5]\d$/.test(t)) || m[2]>=m[3]) throw Error('Перевірте час дзвінків: '+line);
    bells[m[1]] = [m[2],m[3]];
  });
  const dayBells={};
  if(dayBellConfig){
    BellModel.validateWeek(dayBellConfig);
    for(let d=1;d<=6;d++)dayBells[d]=BellModel.parse(dayBellConfig[d]);
    dayBells[0]=dayBells[1];
  }
  const blocks = clean.match(/<table\b[^>]*>[\s\S]*?<\/table>|^[ \t]*\|[^\r\n]*(?:\r?\n[ \t]*\|[^\r\n]*)*/gmi) || [];
  if (blocks.length !== days.length) throw Error('Знайдено '+days.length+' днів і '+blocks.length+' таблиць. Додайте таблицю для кожного дня, включно з порожніми.');
  const events = [];
  blocks.forEach((block,index) => {
    let rows;
    if (/^\s*<table/i.test(block)) {
      const doc = new DOMParser().parseFromString(block,'text/html');
      let remaining = 0, inherited = '';
      rows = [...doc.querySelectorAll('tr')].map(tr => {
        const cells = [...tr.children].filter(c=>/^(TD|TH)$/.test(c.tagName));
        const values = cells.map(c=>c.textContent.replace(/\s+/g,' ').trim());
        if (remaining>0) { remaining--; return [inherited,...values]; }
        if (/^\d+$/.test(values[0]||'')) { inherited=values[0]; remaining=Math.max(0, Number(cells[0].getAttribute('rowspan')||1)-1); }
        return values;
      });
    } else {
      rows = block.trim().split(/\r?\n/).map(line=>line.trim().replace(/^\||\|$/g,'').split('|').map(x=>x.trim()));
    }
    rows.forEach(c => {
      if (!/^\d+$/.test(c[0]||'') || !c[1]?.trim()) return;
      const daily=dayBells[days[index].getDay()]||bells;
      if (!daily[c[0]]) throw Error('Немає часу для уроку №'+c[0]+' на '+days[index].toLocaleDateString('uk-UA'));
      const raw = c[1], split = raw.lastIndexOf(':');
      events.push({date:days[index], n:c[0], start:daily[c[0]][0], end:daily[c[0]][1], subject:split>=0?raw.slice(split+1).trim():raw, group:split>=0?raw.slice(0,split).trim():'', room:c[2]||''});
    });
  });
  return {days,bells,dayBells,events};
}
function render({days,bells,dayBells={},events}) {
  const monday = new Date(days[0]); monday.setDate(monday.getDate()-(monday.getDay()+6)%7);
  const week = Array.from({length:6},(_,i)=>{const d=new Date(monday);d.setDate(d.getDate()+i);return d;})
    .filter(d=>d.getDay()!==6||events.some(e=>key(e.date)===key(d)));
  let html='<table class="timetable"><thead><tr><th>Урок / час</th>'+week.map((d,i)=>'<th><span>'+d.getDate()+'.'+pad(d.getMonth()+1)+'</span>'+names[i]+'</th>').join('')+'</tr></thead><tbody>';
  const different=new Set(week.map(d=>JSON.stringify(dayBells[d.getDay()]||bells))).size>1;
  const numbers=[...new Set(week.flatMap(d=>Object.keys(dayBells[d.getDay()]||bells)))].sort((a,b)=>a-b);
  numbers.forEach(n=>{
    html+='<tr><th scope="row"><b>Урок '+esc(n)+'</b>'+(!different&&bells[n]?'<span>'+esc(bells[n][0])+'</span><span>'+esc(bells[n][1])+'</span>':'')+'</th>';
    week.forEach((d,i)=>{
      const slot=(dayBells[d.getDay()]||bells)[n];
      html+='<td'+(i>4?' class="weekend"':'')+'>'+(different?'<div class="daily-time">'+(slot?esc(slot[0]+'–'+slot[1]):'—')+'</div>':'')+events.filter(e=>key(e.date)===key(d)&&e.n===n).map(e=>'<div class="lesson" data-grade="'+gradeOf(e)+'"><strong>'+esc(eventTitle(e))+'</strong>'+(e.room?'<span class="tag">Кабінет '+esc(e.room)+'</span>':'')+'</div>').join('')+'</td>';
    });
    html+='</tr>';
  });
  $('cal').innerHTML=html+'</tbody></table>';
  $('list').innerHTML='<table><thead><tr>'+['Дата','Урок','Час','Назва події','Кабінет'].map(x=>'<th>'+x+'</th>').join('')+'</tr></thead><tbody>'+events.map(e=>'<tr>'+[e.date.toLocaleDateString('uk-UA'),e.n,e.start+'–'+e.end,eventTitle(e),e.room||'—'].map(x=>'<td>'+esc(x)+'</td>').join('')+'</tr>').join('')+'</tbody></table>';
  const rows=[['Subject','Start Date','Start Time','End Date','End Time','All Day Event','Description','Location','Private'],...events.map(e=>{
    const date=pad(e.date.getMonth()+1)+'/'+pad(e.date.getDate())+'/'+e.date.getFullYear();
    return [eventTitle(e),date,e.start,date,e.end,'False',e.group,e.room,'False'];
  })];
  csv=rows.map(row=>row.map(x=>'"'+String(x).replaceAll('"','""')+'"').join(',')).join('\r\n');
  $('csv').textContent=csv;
  $('empty').hidden=true;
  $('count').textContent=events.length+' подій';
  $('range').textContent=days[0].toLocaleDateString('uk-UA')+' — '+days[days.length-1].toLocaleDateString('uk-UA');
  $('save').disabled=!events.length;
  generatedEvents=events;
  renderGradePickers();
  applyGradeColors();
  exportReady=events.length>0;
  $('google-create').disabled=!exportReady || !$('google-calendar').value;
  $('save-ics').disabled=!exportReady;
  $('reminder-summary').textContent='Сповіщення: '+reminderLabel()+' (ICS)';
  currentPreview={days,bells,dayBells,events};
}
$('go').addEventListener('click',()=>{
  $('ambiguity-error').hidden=true;
  try { const result=typeof selectedSchedule==='function'?selectedSchedule():parse($('md').value);render(result);status(result.warnings?.length?result.warnings.join(' '):'Готово. Перевірте події у вкладках нижче.'); }
  catch(e) {
    $('save').disabled=true;invalidateIcs();$('script-push').disabled=true;status(e.message,true);
    if(e.code==='AMBIGUOUS_TEACHER_SLOT'){
      $('ambiguity-message').textContent=e.message;
      $('ambiguity-list').innerHTML=(e.conflicts||[]).map(conflict=>
        '<section class="conflict-slot"><h3>'+esc(conflict.date)+' · Урок '+esc(conflict.number)+'</h3><ul>'+
        conflict.lessons.map(l=>'<li><button type="button" class="conflict-option" aria-pressed="false" data-slot-key="'+esc(conflict.slotKey)+'" data-candidate-key="'+esc(l.candidateKey)+'"><strong>'+esc(l.className)+(l.groupNumber==='0'?' · увесь клас':' · група '+esc(l.groupNumber))+'</strong><span>'+esc(l.subject)+(l.variant?' · варіант '+esc(l.variant):'')+(l.room?' · кабінет '+esc(l.room):'')+'</span></button></li>').join('')+'</ul><p class="conflict-selection-status" aria-live="polite">Без вибору — буде включено всі варіанти.</p><button type="button" class="clear-conflict" disabled>Очистити вибір</button></section>'
      ).join('');
      $('ambiguity-error').hidden=false;
      $('ambiguity-error').focus({preventScroll:true});
      $('ambiguity-error').scrollIntoView({behavior:'smooth',block:'center'});
    }
  }
});
for (const id of ['md','year','bells']) $(id).addEventListener('input',()=>{ $('save').disabled=true; status('Дані змінено. Згенеруйте події, щоб оновити перегляд.'); });
for (const id of ['md','year','bells']) $(id).addEventListener('input',invalidateIcs);
$('reminder').addEventListener('change',()=>{
  $('reminder-summary').textContent='Сповіщення: '+reminderLabel()+' (ICS)';
  status('Сповіщення оновлено для ICS. CSV використовує налаштування календаря Google.');
});
$('save-ics').addEventListener('click',async()=>{
  if(!exportReady)return;
  try {
    const result=await window.calendarApp.saveIcs(makeIcs(generatedEvents,$('reminder').value));
    if(!result.canceled)status('ICS збережено: '+result.filePath);
  } catch(e){status('Не вдалося зберегти ICS: '+e.message,true);}
});
$('file').addEventListener('change',async()=>{
  const file=$('file').files[0];if(!file)return;
  invalidateIcs();
  try{$('md').value=await file.text();$('save').disabled=true;status('Завантажено: '+file.name+'. Натисніть «Згенерувати події».');}
  catch(e){status('Не вдалося прочитати файл: '+e.message,true);}
  $('file').value='';
});
$('save').addEventListener('click',async()=>{
  try { const result=await window.calendarApp.saveCsv(csv);if(!result.canceled)status('Файл збережено: '+result.filePath); }
  catch(e) { status('Не вдалося зберегти файл: '+e.message,true); }
});
function validateConfiguration(config) {
  if(config?.dayBells)BellModel.validateWeek(config.dayBells);
  if (!config || config.version!==1 || !Number.isInteger(config.year) || config.year<2000 || config.year>2100) throw Error('Вкажіть рік від 2000 до 2100.');
  if(typeof config.bells!=='string' || !config.bells.trim()) throw Error('Додайте час дзвінків.');
  const seen=new Set();
  for(const line of config.bells.trim().split(/\r?\n/).filter(x=>x.trim())){
    const m=line.match(/^\s*([1-9]\d*)\s*=\s*((?:[01]\d|2[0-3]):[0-5]\d)\s*[-–]\s*((?:[01]\d|2[0-3]):[0-5]\d)\s*$/);
    if(!m || m[2]>=m[3] || seen.has(m[1])) throw Error('Перевірте час і номери уроків: '+line);
    seen.add(m[1]);
  }
  if(!['none','0','5','10','15','30','60','1440'].includes(config.reminder)) throw Error('Некоректне сповіщення.');
  if(!config.colors || typeof config.colors!=='object' || Array.isArray(config.colors)) throw Error('Некоректні кольори.');
  for(const [grade,color] of Object.entries(config.colors)){
    if(!/^(?:[1-9]|1[0-2]|other)$/.test(grade) || !/^#[0-9a-f]{6}$/i.test(color)) throw Error('Некоректний колір класу.');
  }
  return config;
}
function saveConfiguration() {
  try {
    const config=validateConfiguration({version:1,year:Number($('year').value),bells:$('bells').value.trim(),dayBells:dayBellConfig,colors:{...gradeColors},reminder:$('reminder').value});
    localStorage.setItem('lesson-configuration',JSON.stringify(config));
    localStorage.setItem('lesson-grade-colors',JSON.stringify(config.colors));
    $('config-status').textContent='Конфігурацію збережено. Її буде відновлено після запуску.';
  } catch(e) { $('config-status').textContent='Не вдалося зберегти: '+e.message; }
}
function restoreConfiguration() {
  try {
    const raw=localStorage.getItem('lesson-configuration');
    if(!raw)return;
    const config=validateConfiguration(JSON.parse(raw));
    $('year').value=String(config.year);
    $('bells').value=config.bells;
    dayBellConfig=config.dayBells?{...config.dayBells}:null;
    $('reminder').value=config.reminder;
    // Colors also autosave; use the latest choices if available.
    if(localStorage.getItem('lesson-grade-colors')===null)gradeColors={...config.colors};
    $('reminder-summary').textContent='Сповіщення: '+reminderLabel()+' (ICS)';
    $('config-status').textContent='Збережену конфігурацію відновлено.';
  } catch(e) { $('config-status').textContent='Збережені налаштування недоступні. Використано стандартні значення.'; }
}
$('save-config').addEventListener('click',saveConfiguration);
for(const id of ['year','bells','reminder'])$(id).addEventListener('input',()=>{
  $('config-status').textContent='Є незбережені зміни налаштувань.';
});
restoreConfiguration();
renderGradePickers();
if(typeof window!=='undefined' && window.googleCalendar) {
  let googleBusy=false;
  let googleConfigured=false;
  function controls(){
    for(const id of ['google-config','google-signin'])$(id).disabled=googleBusy;
    $('google-disconnect').disabled=googleBusy||!googleConfigured;
    $('google-create').disabled=googleBusy||!exportReady||!$('google-calendar').value;
  }
  function showCalendars(calendars){
    $('google-calendar').innerHTML=calendars.map(c=>'<option value="'+esc(c.id)+'"'+(c.primary?' selected':'')+'>'+esc(c.name)+' · '+esc(c.timeZone)+'</option>').join('');
    $('google-calendar').disabled=!calendars.length;
  }
  async function operation(fn){
    if(googleBusy)return;
    googleBusy=true;controls();
    try{await fn();}catch(e){$('google-status').textContent=e.message;}
    finally{googleBusy=false;controls();}
  }
  $('google-config').addEventListener('click',()=>operation(async()=>{
    if(await window.googleCalendar.configure()){googleConfigured=true;showCalendars([]);$('google-status').textContent='OAuth налаштовано. Увійдіть у Google.';}
  }));
  $('google-signin').addEventListener('click',()=>operation(async()=>{
    $('google-status').textContent='Завершіть вхід у браузері. Очікування до 3 хвилин…';
    showCalendars(await window.googleCalendar.signIn());$('google-status').textContent='Google підключено. Виберіть календар.';
  }));
  $('google-disconnect').addEventListener('click',()=>operation(async()=>{
    await window.googleCalendar.disconnect();googleConfigured=false;showCalendars([]);$('google-status').textContent='Вихід виконано. Усі збережені дані Google видалено. Для підключення завантажте OAuth JSON знову.';
  }));
  $('google-calendar').addEventListener('change',controls);
  $('google-create').addEventListener('click',()=>operation(async()=>{
    if(!exportReady)return;
    $('google-status').textContent='Створення подій…';
    const result=await window.googleCalendar.create({calendarId:$('google-calendar').value,reminder:$('reminder').value,events:generatedEvents.map(e=>({title:eventTitle(e),date:key(e.date),start:e.start,end:e.end,group:e.group,room:e.room,color:gradeColor(gradeOf(e))}))});
    $('google-status').textContent=result.canceled?'Створення скасовано.':'Створено: '+result.created+'. Пропущено повторів: '+result.skipped+'.'+(result.error?' Помилка: '+result.error+' Повторіть спробу для решти подій.':'');
  }));
  operation(async()=>{
    const state=await window.googleCalendar.status();
    googleConfigured=state.configured;
    if(state.connected){showCalendars(await window.googleCalendar.calendars());$('google-status').textContent='Google підключено.';}
    else if(state.configured)$('google-status').textContent='OAuth налаштовано. Увійдіть у Google.';
  });
}
