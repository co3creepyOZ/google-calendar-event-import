'use strict';
const fs=require('node:fs');
const path=require('node:path');
function loadWindowState(folder,workArea){
  let saved={};
  try{saved=JSON.parse(fs.readFileSync(path.join(folder,'window-state.json'),'utf8'))||{};}catch{}
  const size=(value,fallback,limit)=>Math.min(limit,Math.max(320,Number.isInteger(value)&&value>0?value:fallback));
  return {width:size(saved.width,1180,workArea.width),height:size(saved.height,820,workArea.height),maximized:saved.maximized===true};
}
function rememberWindowState(win,folder,onError=console.error){
  win.on('close',()=>{
    try{
      const {width,height}=win.getNormalBounds();
      const state={width,height,maximized:win.isMaximized()};
      const file=path.join(folder,'window-state.json');
      fs.writeFileSync(file+'.tmp',JSON.stringify(state,null,2),'utf8');
      fs.renameSync(file+'.tmp',file);
    }catch(error){onError(error);}
  });
}
module.exports={loadWindowState,rememberWindowState};
