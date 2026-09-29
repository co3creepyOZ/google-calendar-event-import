'use strict';
const fs=require('node:fs');
const path=require('node:path');

// Called before app readiness or creation of any Chromium session.
function configureLocalStorage(app){
  const root=app.isPackaged?path.dirname(app.getPath('exe')):app.getAppPath();
  const destination=path.join(root,'local-storage');
  const previous=app.getPath('userData');
  if(!fs.existsSync(destination)){
    // A failed copy never becomes the active profile. Leave partial staging
    // data intact for recovery rather than deleting user files automatically.
    const staging=fs.mkdtempSync(path.join(root,'.storage-migration-'));
    if(fs.existsSync(previous)){
      fs.cpSync(previous,staging,{
        recursive:true,errorOnExist:true,force:false,
        filter:source=>!['SingletonLock','SingletonCookie','SingletonSocket','LOCK','lockfile'].includes(path.basename(source))
      });
    }
    fs.renameSync(staging,destination);
  }
  fs.accessSync(destination,fs.constants.R_OK|fs.constants.W_OK);
  app.setPath('userData',destination);
  app.setPath('sessionData',destination);
  app.setAppLogsPath(path.join(destination,'logs'));
  return destination;
}
module.exports={configureLocalStorage};
