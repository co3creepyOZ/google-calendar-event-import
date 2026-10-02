(function(root){
  function build(data){
    const rooms=Object.entries(data.auds||{}).filter(([id,name])=>Number(id)&&String(name).trim()).map(([id,name])=>({id,name:String(name).trim()}));
    const lessons=[],seen=new Set();let unknown=0;
    function add(day,number,line,assignment,className){
      const room=String(assignment.a||'0');
      if(!rooms.some(r=>r.id===room)){unknown++;return;}
      const item={day:String(day),number:String(number),room,className,teacher:data.teachers?.[assignment.t]?.name||'Вчителя не вказано',subject:data.predms?.[line.p]||'',group:String(assignment.g||0),variant:Number(line.pn)===1?'A':Number(line.pn)===2?'B':''};
      const key=JSON.stringify(item);if(!seen.has(key)){seen.add(key);lessons.push(item);}
    }
    for(const [id,c] of Object.entries(data.classes||{}))for(const [day,slots] of Object.entries(c.roz||{}))for(const [n,lines] of Object.entries(slots))for(const line of lines){
      if(!line.nums?.length)unknown++;
      for(const assignment of line.nums||[])add(day,n,line,assignment,c.name||id);
    }
    // Teacher-only records are retained conservatively, including A/B variants.
    for(const [id,t] of Object.entries(data.teachers||{}))for(const [day,slots] of Object.entries(t.roz||{}))for(const [n,lines] of Object.entries(slots))for(const line of lines)add(day,n,line,{a:line.a,t:id,g:line.g},line.c_s||(line.cc||[]).map(c=>data.classes[c]?.name||c).join(', '));
    return {rooms,lessons,unknown,days:Object.entries(data.days||{}).sort((a,b)=>Number(a[0])-Number(b[0])).map(([id,label])=>({id,label:String(label).replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim()}))};
  }
  const api={build};if(typeof module!=='undefined')module.exports=api;else root.RoomModel=api;
})(typeof window==='undefined'?globalThis:window);
