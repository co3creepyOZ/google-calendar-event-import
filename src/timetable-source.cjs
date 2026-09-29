const {ipcMain}=require('electron');
const {pathToFileURL}=require('node:url'),path=require('node:path');
const {extract}=require('./timetable-format.js');
function validURL(value){
  const url=new URL(value);
  if(url.protocol!=='https:'||url.hostname!=='client.rozklad.org'||url.port||url.username||url.password||!/^\/files\/rozklad\/rr\/r_\d+\.html$/.test(url.pathname))throw Error('Вкажіть HTTPS-посилання client.rozklad.org/files/rozklad/rr/r_….html');
  return url;
}
async function load(value){
  const url=validURL(value);
  const response=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(30000)});
  if(!response.ok)throw Error('Розклад недоступний: HTTP '+response.status);
  const reader=response.body.getReader();let size=0,chunks=[];
  try{
    while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>5_000_000)throw Error('Сторінка завелика.');chunks.push(value);}
  }finally{await reader.cancel();}
  const html=Buffer.concat(chunks).toString('utf8');
  return {data:extract(html),updated:html.match(/оновлено\s+([\d.]+\s+[\d:]+)/)?.[1]||''};
}
function register(){
  ipcMain.handle('load-rozklad',async(event,url)=>{
    if(event.senderFrame.url!==pathToFileURL(path.join(__dirname,'app.html')).href)throw Error('Invalid caller');
    return load(url);
  });
}
module.exports={register,validURL,load};
