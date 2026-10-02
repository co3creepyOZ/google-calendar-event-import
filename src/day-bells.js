'use strict';
const bellDayNames=['Понеділок','Вівторок','Середа','Четвер','П’ятниця','Субота'];
let selectedBellDay=1;
try{dayBellConfig=dayBellConfig?BellModel.validateWeek(dayBellConfig):BellModel.initial($('bells').value);}
catch{dayBellConfig=BellModel.initial($('bells').defaultValue);}
const bellContainer=$('bells').parentElement;
for(const child of [...bellContainer.children])child.hidden=true;
const bellEditor=document.createElement('div');
bellEditor.className='day-bell-editor';
bellEditor.innerHTML='<div id="bell-day-tabs" class="bell-day-tabs" role="tablist" aria-label="День розкладу дзвінків">'+bellDayNames.map((n,i)=>'<button type="button" id="bell-tab-'+(i+1)+'" role="tab" data-day="'+(i+1)+'" aria-controls="bell-day-panel" aria-label="'+n+'" title="'+n+'" aria-selected="'+(i===0)+'" tabindex="'+(i===0?'0':'-1')+'">'+['Пн','Вт','Ср','Чт','Пт','Сб'][i]+'</button>').join('')+'</div>'+
  '<div class="bell-controls"><label>Перший урок<input id="bell-start" type="time"></label><label>Тривалість уроку, хв<input id="bell-length" type="number" min="1" max="180" step="1"></label><label>Кількість уроків<input id="bell-count" type="number" min="1" max="16" step="1"></label><label>Однакова перерва, хв<input id="bell-pause" type="number" min="0" max="180" step="1" value="10"></label></div>'+
  '<button id="bell-uniform" type="button">Застосувати цю перерву між усіма уроками</button>'+
  '<div id="bell-breaks" class="bell-breaks"></div><button id="bell-calculate" type="button" class="primary">Розрахувати день</button>'+
  '<p id="bell-feedback" class="hint" role="status"></p><div id="bell-preview"></div>'+
  '<details><summary>Точне редагування часу</summary><label for="bell-exact">Номер=початок-кінець</label><textarea id="bell-exact" rows="8" spellcheck="false"></textarea><button id="bell-apply-exact" type="button">Застосувати точний час</button></details>'+
  '<details><summary>Копіювати цей день</summary><fieldset id="bell-targets"><legend>Дні призначення</legend>'+bellDayNames.map((n,i)=>'<label><input type="checkbox" value="'+(i+1)+'"> '+n+'</label>').join('')+'</fieldset><div class="actions"><button id="bell-clone-selected" type="button">Копіювати у вибрані дні</button><button id="bell-clone-all" type="button">Копіювати на Пн–Сб</button></div></details>';
const bellDayPanel=document.createElement('div');
bellDayPanel.id='bell-day-panel';bellDayPanel.setAttribute('role','tabpanel');
bellDayPanel.setAttribute('aria-labelledby','bell-tab-1');
for(const node of [...bellEditor.children].slice(1))bellDayPanel.append(node);
bellEditor.append(bellDayPanel);
bellContainer.append(bellEditor);
function markBellChange(message){
  $('bells').value=dayBellConfig[1];
  $('bells').dispatchEvent(new Event('input',{bubbles:true}));

  $('ambiguity-error').hidden=true;
  $('bell-feedback').textContent=message+' Натисніть «Зберегти конфігурацію», щоб зберегти після закриття.';
}
function paintBreaks(values){
  $('bell-breaks').innerHTML=values.map((v,i)=>'<label>Після '+(i+1)+' уроку<input type="number" min="0" max="180" step="1" value="'+v+'" data-break="'+i+'"> хв</label>').join('');
}
function loadBellDay(){
  document.querySelectorAll('#bell-day-tabs button').forEach(button=>{
    const selected=Number(button.dataset.day)===selectedBellDay;
    button.setAttribute('aria-selected',String(selected));button.tabIndex=selected?0:-1;
  });
  $('bell-day-panel').setAttribute('aria-labelledby','bell-tab-'+selectedBellDay);
  const text=dayBellConfig[selectedBellDay],info=BellModel.describe(text);
  $('bell-start').value=info.start;$('bell-length').value=info.length;$('bell-count').value=info.count;
  $('bell-pause').value=info.breaks.length?info.breaks[0]:10;
  paintBreaks(info.breaks);
  $('bell-exact').value=text;
  $('bell-preview').innerHTML='<table><thead><tr><th>Урок</th><th>Початок</th><th>Кінець</th></tr></thead><tbody>'+Object.entries(BellModel.parse(text)).map(([n,t])=>'<tr><td>'+n+'</td><td>'+t[0]+'</td><td>'+t[1]+'</td></tr>').join('')+'</tbody></table>';
  document.querySelectorAll('#bell-targets input').forEach(input=>{
    input.disabled=Number(input.value)===selectedBellDay;input.checked=false;
  });
  const duration=new Set(Object.values(BellModel.parse(text)).map(t=>Number(t[1].slice(0,2))*60+Number(t[1].slice(3))-Number(t[0].slice(0,2))*60-Number(t[0].slice(3))));
  $('bell-feedback').textContent=duration.size>1?'У цьому дні уроки різної тривалості. Розрахунок встановить одну тривалість для всіх уроків.':'Збережений для цього дня розклад показано нижче.';
}
function attemptBell(fn){try{fn();}catch(e){$('bell-feedback').textContent=e.message;}}
function draftChanged(){
  $('bell-feedback').textContent='Параметри змінено. Натисніть «Розрахувати день», щоб застосувати їх.';
}
$('bell-day-tabs').addEventListener('click',event=>{
  const button=event.target.closest('[data-day]');
  if(button){selectedBellDay=Number(button.dataset.day);loadBellDay();}
});
$('bell-day-tabs').addEventListener('keydown',event=>{
  const button=event.target.closest('[data-day]');if(!button)return;
  let next=Number(button.dataset.day);
  if(event.key==='ArrowRight')next=next%6+1;
  else if(event.key==='ArrowLeft')next=(next+4)%6+1;
  else if(event.key==='Home')next=1;
  else if(event.key==='End')next=6;
  else return;
  event.preventDefault();selectedBellDay=next;loadBellDay();$('bell-tab-'+next).focus();
});
$('bell-count').addEventListener('change',()=>attemptBell(()=>{
  const count=Number($('bell-count').value);
  if(!Number.isInteger(count)||count<1||count>16)throw Error('Кількість уроків: від 1 до 16.');
  const previous=[...document.querySelectorAll('[data-break]')].map(i=>Number(i.value));
  paintBreaks(Array.from({length:count-1},(_,i)=>previous[i]??Number($('bell-pause').value)));draftChanged();
}));
$('bell-uniform').addEventListener('click',()=>attemptBell(()=>{
  const pause=Number($('bell-pause').value),count=Number($('bell-count').value);
  if(!Number.isInteger(pause)||pause<0||pause>180||!Number.isInteger(count)||count<1||count>16)throw Error('Перевірте перерву та кількість уроків.');
  paintBreaks(Array(count-1).fill(pause));draftChanged();
}));
$('bell-calculate').addEventListener('click',()=>attemptBell(()=>{
  dayBellConfig[selectedBellDay]=BellModel.calculate($('bell-start').value,Number($('bell-length').value),Number($('bell-count').value),[...document.querySelectorAll('[data-break]')].map(i=>Number(i.value)));
  loadBellDay();markBellChange('Розклад дня розраховано.');
}));
$('bell-apply-exact').addEventListener('click',()=>attemptBell(()=>{
  const text=$('bell-exact').value.trim();BellModel.parse(text);
  dayBellConfig[selectedBellDay]=text;loadBellDay();markBellChange('Точний час застосовано.');
}));
function cloneBellDays(targets){
  dayBellConfig=BellModel.clone(dayBellConfig,selectedBellDay,targets);
  markBellChange('Скопійовано: '+targets.map(d=>bellDayNames[d-1]).join(', ')+'.');
}
$('bell-clone-all').addEventListener('click',()=>attemptBell(()=>cloneBellDays([1,2,3,4,5,6])));
$('bell-clone-selected').addEventListener('click',()=>attemptBell(()=>cloneBellDays([...document.querySelectorAll('#bell-targets input:checked')].map(i=>Number(i.value)))));
for(const id of ['bell-start','bell-length','bell-pause','bell-breaks'])$(id).addEventListener('input',draftChanged);
loadBellDay();
