'use strict';
(()=>{
  const page=$('workspace-rooms');
  page.innerHTML='<h2>Вільні кабінети</h2><p class="hint">Перевірка всього розкладу школи, незалежно від вибраного вчителя чи групи.</p><label for="rooms-url">Посилання на розклад школи</label><div class="url-row"><input id="rooms-url" type="url" placeholder="Посилання client.rozklad.org"><button id="rooms-load" type="button">Завантажити</button></div><p id="rooms-status" class="hint" role="status">Завантажте розклад, потім оберіть один або кілька кабінетів.</p><fieldset id="rooms-options"><legend>Кабінети</legend></fieldset><p class="hint">«Вільно за розкладом» означає відсутність запису, а не підтвердження фактичної доступності. Усі варіанти A/B враховано як можливу зайнятість. У картках — клас і вчитель предмета.</p><div id="rooms-calendar" class="table-scroll"></div>';
  let model=null;
  const selectionTools=document.createElement('div');selectionTools.className='rooms-selection-tools';
  selectionTools.innerHTML='<span id="rooms-selection-count" role="status">Оберіть кабінети для порівняння</span><button id="rooms-clear" type="button" disabled>Очистити вибір</button>';
  $('rooms-options').after(selectionTools);
  function updateSelection(){
    const count=page.querySelectorAll('#rooms-options input:checked').length;
    $('rooms-selection-count').textContent=count?'Обрано кабінетів: '+count:'Оберіть кабінети для порівняння';
    $('rooms-clear').disabled=count===0;
  }
  $('rooms-clear').addEventListener('click',()=>{page.querySelectorAll('#rooms-options input:checked').forEach(input=>input.checked=false);renderRooms();});
  $('rooms-url').value=$('timetable-url').value;
  function renderRooms(){
    updateSelection();
    if(!model)return;
    const selected=[...page.querySelectorAll('#rooms-options input:checked')].map(n=>n.value);
    if(!selected.length){$('rooms-calendar').textContent='Оберіть кабінети для перегляду.';return;}
    const weekdays={'пн':1,'вт':2,'ср':3,'чт':4,'пт':5,'сб':6,'нд':0};
    const days=model.days.filter(d=>!/^нд/i.test(d.label)&&(!/^сб/i.test(d.label)||model.lessons.some(l=>l.day===d.id)));
    const bellMaps=Object.fromEntries(days.map(d=>[d.id,BellModel.parse(dayBellConfig?.[weekdays[d.label.slice(0,2).toLowerCase()]]||$('bells').value)]));
    const numbers=[...new Set([...Object.values(bellMaps).flatMap(b=>Object.keys(b)),...model.lessons.map(l=>l.number)])].sort((a,b)=>Number(a)-Number(b));
    $('rooms-calendar').innerHTML='<table class="room-table"><thead><tr><th>Урок</th>'+days.map(d=>'<th>'+esc(d.label)+'</th>').join('')+'</tr></thead><tbody>'+numbers.map(n=>'<tr><th>'+esc(n)+'</th>'+days.map(d=>'<td><div class="daily-time">'+esc((bellMaps[d.id][n]||[]).join('–'))+'</div>'+selected.map(id=>{
      const room=model.rooms.find(r=>r.id===id);const records=model.lessons.filter(l=>l.room===id&&l.day===d.id&&l.number===n);
      return '<div class="room-slot '+(records.length?'occupied':'available')+'"><strong>Каб. '+esc(room.name)+' · '+(records.length?'Зайнято':model.unknown?'Немає записів':'Вільно за розкладом')+'</strong>'+records.map(l=>'<div class="room-record"><b>'+esc(l.className)+(l.group!=='0'?' · гр'+esc(l.group):'')+(l.variant?' · '+esc(l.variant):'')+'</b><br>'+esc(l.teacher)+'<span>'+esc(l.subject)+'</span></div>').join('')+'</div>';
    }).join('')+'</td>').join('')+'</tr>').join('')+'</tbody></table>';
  }
  $('rooms-load').addEventListener('click',async()=>{
    $('rooms-load').disabled=true;model=null;$('rooms-options').innerHTML='<legend>Кабінети</legend>';$('rooms-calendar').replaceChildren();
    $('rooms-status').textContent='Завантаження…';
    $('rooms-status').classList.remove('room-warning');
    updateSelection();
    try{
      const result=await window.timetableSource.load($('rooms-url').value.trim());model=RoomModel.build(result.data);
      $('rooms-options').innerHTML='<legend>Кабінети</legend>'+model.rooms.sort((a,b)=>a.name.localeCompare(b.name,'uk',{numeric:true})).map(r=>'<label><input type="checkbox" value="'+esc(r.id)+'"> '+esc(r.name)+'</label>').join('');
      $('rooms-status').classList.toggle('room-warning',model.unknown>0);
      $('rooms-status').textContent='Кабінетів: '+model.rooms.length+'.'+(result.updated?' Оновлено: '+result.updated+'.':'')+(model.unknown?' Увага: є записи без відомого кабінету — доступність не можна гарантувати.':'');renderRooms();
    }catch(e){$('rooms-status').textContent='Не вдалося завантажити: '+e.message;}
    finally{$('rooms-load').disabled=false;}
  });
  $('rooms-url').addEventListener('input',()=>{model=null;$('rooms-calendar').replaceChildren();$('rooms-options').innerHTML='<legend>Кабінети</legend>';$('rooms-status').textContent='Посилання змінено. Завантажте розклад.';});
  $('rooms-options').addEventListener('change',renderRooms);
  $('rooms-url').addEventListener('input',updateSelection);
  $('rooms-url').addEventListener('input',()=>$('rooms-status').classList.remove('room-warning'));
  navigation.addEventListener('click',()=>{if(currentPage==='rooms')renderRooms();});
})();
