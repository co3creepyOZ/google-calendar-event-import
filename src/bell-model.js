(function(root){
  const minutes=t=>Number(t.slice(0,2))*60+Number(t.slice(3));
  const time=n=>String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');
  function parse(text){
    const map={};let previousEnd=-1,previousNumber=0;
    if(typeof text!=='string'||!text.trim())throw Error('Додайте час дзвінків.');
    for(const line of text.trim().split(/\r?\n/).filter(x=>x.trim())){
      const m=line.match(/^\s*([1-9]\d*)\s*=\s*((?:[01]\d|2[0-3]):[0-5]\d)\s*[-–]\s*((?:[01]\d|2[0-3]):[0-5]\d)\s*$/);
      if(!m||m[2]>=m[3]||Number(m[1])<=previousNumber||minutes(m[2])<previousEnd)throw Error('Перевірте час та порядок уроків: '+line);
      map[m[1]]=[m[2],m[3]];previousEnd=minutes(m[3]);previousNumber=Number(m[1]);
    }
    return map;
  }
  function calculate(start,length,count,breaks){
    if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(start)||!Number.isInteger(length)||length<1||length>180||!Number.isInteger(count)||count<1||count>16)throw Error('Вкажіть початок, тривалість 1–180 хв та 1–16 уроків.');
    if(!Array.isArray(breaks)||breaks.length!==count-1||breaks.some(n=>!Number.isInteger(n)||n<0||n>180))throw Error('Перерви мають бути від 0 до 180 хв.');
    let cursor=minutes(start);const lines=[];
    for(let i=0;i<count;i++){
      if(cursor+length>=1440)throw Error('Розклад має завершитися до опівночі.');
      lines.push((i+1)+'='+time(cursor)+'-'+time(cursor+length));cursor+=length+(breaks[i]||0);
    }
    return lines.join('\n');
  }
  function describe(text){
    const rows=Object.values(parse(text));
    return {start:rows[0][0],length:minutes(rows[0][1])-minutes(rows[0][0]),count:rows.length,breaks:rows.slice(1).map((r,i)=>minutes(r[0])-minutes(rows[i][1]))};
  }
  function validateWeek(week){
    if(!week||typeof week!=='object')throw Error('Некоректні налаштування днів.');
    for(let d=1;d<=6;d++)parse(week[d]);
    return week;
  }
  function initial(text){parse(text);return Object.fromEntries(Array.from({length:6},(_,i)=>[i+1,text]));}
  function clone(week,source,targets){
    validateWeek(week);
    if(!week[source]||!targets.length||targets.some(d=>![1,2,3,4,5,6].includes(Number(d))))throw Error('Оберіть дні для копіювання.');
    const next={...week};for(const d of targets)next[d]=week[source];return next;
  }
  const api={parse,calculate,describe,validateWeek,initial,clone};
  if(typeof module!=='undefined')module.exports=api;else root.BellModel=api;
})(typeof window==='undefined'?globalThis:window);
