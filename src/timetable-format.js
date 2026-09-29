(function(root){
  function extract(html){
    const match=html.match(/\bvar\s+data\s*=\s*(\{[^\r\n]*\})\s*;/);
    if(!match)throw Error('Сторінка не містить підтримуваних даних розкладу.');
    const data=JSON.parse(match[1]);
    if(!data.days||!data.teachers||!data.classes||!data.predms||!data.auds)throw Error('Неповні дані розкладу.');
    return data;
  }
  const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function classConfirms(data,teacherId,line,day,number){
    let ids=(line.cc||[]).map(String);
    if(!ids.length)ids=Object.keys(data.classes).filter(id=>data.classes[id].name===line.c_s);
    if(!ids.length)return null;
    let unknown=false;
    for(const id of ids){
      const slots=data.classes[id]?.roz?.[day];
      if(!slots||!Object.prototype.hasOwnProperty.call(slots,number)){unknown=true;continue;}
      const match=slots[number].some(candidate=>
        String(candidate.p)===String(line.p)&&Number(candidate.pn||0)===Number(line.pn||0)&&
        (line.sid==null||candidate.sid==null||String(candidate.sid)===String(line.sid))&&
        (candidate.nums||[]).some(a=>String(a.t)===String(teacherId)&&Number(a.g||0)===Number(line.g||0)));
      if(!match)return false;
    }
    return unknown?null:true;
  }
  function selected(data,mode,id,filters={}){
    if(!['teachers','classes'].includes(mode))throw Error('Оберіть вчителя або клас.');
    const item=data[mode]?.[id];if(!item)throw Error('Вибраного вчителя або класу немає на цій сторінці.');
    const days=Object.keys(data.days).sort((a,b)=>Number(a)-Number(b));
    const headers=days.map(day=>{
      const text=data.days[day].replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
      if(!/(пн|вт|ср|чт|пт|сб|нд)\s*\d{1,2}\.\d{1,2}/i.test(text))throw Error('Невідомий формат дат на сторінці.');
      return text;
    });
    const lessons=[],warnings=[],conflicts=[];
    const tables=days.map(day=>{
      const rows=[];
      for(const [number,entries] of Object.entries(item.roz?.[day]||{}).sort((a,b)=>a[0]-b[0])){
        const slotKey=JSON.stringify([day,number]);
        const slotStart=lessons.length;
        const crossCheck=mode==='teachers'&&filters.teacherActive===true&&entries.length>1;
        for(const line of entries){
          const assignments=mode==='teachers'?[{g:line.g,a:line.a,t:id}]:(line.nums?.length?line.nums:[{g:line.g,a:0,t:0}]);
          for(const assignment of assignments){
            const prefix=Number(line.pn)===1?'A: ':Number(line.pn)===2?'B: ':'';
            const className=mode==='teachers'?(line.c_s||(line.cc||[]).map(c=>data.classes[c]?.name||'').join(', ')):item.name;
            const group=prefix+className+(Number(assignment.g)?' (гр'+assignment.g+')':'');
            const subject=data.predms[line.p];
            if(!subject)throw Error('Невідомий предмет: '+line.p);
            const lessonKey=JSON.stringify([data.days[day].replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim(),number,className,String(line.p)]);
            const rule=filters.overrides?.[lessonKey]??filters.defaultGroup??'all';
            const groupNumber=String(Number(assignment.g)||0);
            // Whole-class lessons apply to every numbered group.
            if(rule==='none'||(rule!=='all'&&groupNumber!=='0'&&rule!==groupNumber))continue;
            if(crossCheck){
              const confirmed=classConfirms(data,id,line,day,number);
              if(confirmed===false){
                warnings.push('Пропущено '+className+' (гр'+groupNumber+'), урок '+number+': немає відповідного запису в розкладі класу.');
                continue;
              }
              if(confirmed===null)warnings.push('Не вдалося перевірити розклад класу '+className+', урок '+number+'.');
            }
            const room=Number(assignment.a)?String(data.auds[assignment.a]||'').trim():'';
            const candidateKey=JSON.stringify([className,String(line.p),groupNumber,String(line.pn||0),String(line.sid||'')]);
            const slotChoice=filters.conflictChoices?.[slotKey];
            if(crossCheck&&slotChoice&&slotChoice!==candidateKey)continue;
            lessons.push({teacher:data.teachers[assignment.t]?.name||'',day,number,lessonKey,className,subject,groupNumber,variant:prefix.trim().replace(':',''),room,candidateKey});
            rows.push('<tr><td>'+escape(number)+'</td><td>'+escape(group+': '+subject)+'</td><td>'+escape(room)+'</td></tr>');
          }
        }
        if(crossCheck&&lessons.length-slotStart>1){
          const candidates=lessons.slice(slotStart).map(l=>l.className+' (гр'+l.groupNumber+')').join(', ');
          const message='Неоднозначний активний урок: '+headers[days.indexOf(day)]+', №'+number+' — '+candidates+'. Розклад класу не визначає єдиний варіант.';
          if(filters.allowAmbiguous===true)warnings.push(message+' Усі відповідні варіанти включено за вашим вибором.');
          else conflicts.push({slotKey,date:headers[days.indexOf(day)],number,lessons:lessons.slice(slotStart)});
        }
      }
      return '<table>'+rows.join('')+'</table>';
    });
    if(conflicts.length){
      const error=Error('Неоднозначний розклад: '+conflicts.length+' комірок. Можна вибрати групи нижче або залишити всі варіанти.');
      error.code='AMBIGUOUS_TEACHER_SLOT';
      error.conflicts=conflicts;
      throw error;
    }
    return {markdown:headers.join('\n')+'\n\n'+tables.join('\n\n'),lessons,warnings};
  }
  const api={extract,selected};
  if(typeof module!=='undefined')module.exports=api;else root.TimetableFormat=api;
})(typeof window==='undefined'?globalThis:window);
