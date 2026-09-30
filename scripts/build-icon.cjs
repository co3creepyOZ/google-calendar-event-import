// Run with Electron to package PNG resolutions into a Windows ICO file.
const {app,nativeImage}=require('electron');
const fs=require('node:fs'),path=require('node:path');
app.whenReady().then(()=>{
  try{
    const source=nativeImage.createFromPath(path.join(__dirname,'../assets/app-icon.png'));
    if(source.isEmpty())throw Error('Cannot load app-icon.png');
    const sizes=[16,24,32,48,64,128,256];
    const images=sizes.map(size=>source.resize({width:size,height:size,quality:'best'}).toPNG());
    const header=Buffer.alloc(6+16*sizes.length);
    header.writeUInt16LE(1,2);header.writeUInt16LE(sizes.length,4);
    let offset=header.length;
    images.forEach((image,i)=>{
      const entry=6+i*16;
      header[entry]=header[entry+1]=sizes[i]===256?0:sizes[i];
      header.writeUInt16LE(1,entry+4);header.writeUInt16LE(32,entry+6);
      header.writeUInt32LE(image.length,entry+8);header.writeUInt32LE(offset,entry+12);
      offset+=image.length;
    });
    fs.writeFileSync(path.join(__dirname,'../assets/app-icon.ico'),Buffer.concat([header,...images]));
    console.log('Created app-icon.ico with seven resolutions (16–256 px).');
  }catch(error){console.error(error);process.exitCode=1;}
  finally{app.quit();}
});
