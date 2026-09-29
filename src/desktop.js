'use strict';
// Move existing controls, retaining their values and registered event listeners.
const main = document.querySelector('main');
const source = document.querySelector('.source');
const preview = document.querySelector('.preview');
source.id='workspace-schedule';
preview.id='workspace-preview';
const settings=document.createElement('section');
settings.id='workspace-settings';settings.className='card workspace';
settings.innerHTML='<h2>Налаштування</h2><p class="workspace-lead">Рік, час уроків та кольори вашого розкладу.</p>';
const connections=document.createElement('section');
connections.id='workspace-connections';connections.className='card workspace';
connections.innerHTML='<h2>Google Calendar</h2><p class="workspace-lead">Підключіть календар один раз, а потім надсилайте перевірені уроки.</p>';
const bellsDetails=$('bells').closest('details');
bellsDetails.open=true;
settings.append(bellsDetails);
const reminderLabelNode=document.querySelector('label[for=reminder]');
const reminderHelp=$('reminder').nextElementSibling;
const notificationSection=document.createElement('div');
notificationSection.className='notification-settings';
notificationSection.append(reminderLabelNode,$('reminder'),reminderHelp);
settings.append(notificationSection,$('grade-colors').closest('details'));
const saveSettings=$('save-config').closest('.actions');
saveSettings.classList.add('settings-save');
settings.append(saveSettings);
const scriptConnection=$('script-connect').closest('details');
scriptConnection.open=true;
scriptConnection.querySelector('summary').textContent='Особистий календар · Apps Script';
const oauthConnection=$('google-config').closest('details');
oauthConnection.querySelector('summary').textContent='Інший спосіб · Google OAuth';
connections.append(scriptConnection,oauthConnection);
main.append(connections,settings);
document.querySelector('.intro').remove();
document.querySelector('.header-note').textContent='Ваш розклад. Ваш календар.';
const navigation=document.createElement('nav');
navigation.className='workspace-nav';navigation.setAttribute('aria-label','Основна навігація');
const pages=[
  ['preview','Перегляд','01'],
  ['schedule','Розклад','02'],
  ['connections','Google Calendar','↗'],
  ['settings','Налаштування','⚙']
];
navigation.innerHTML=pages.map(([id,label,icon])=>'<button type="button" data-page="'+id+'" aria-controls="workspace-'+id+'"><span aria-hidden="true">'+icon+'</span>'+label+'</button>').join('');
document.querySelector('header').after(navigation);
const footer=document.createElement('footer');
footer.className='app-status';
footer.append($('status'));
main.after(footer);
source.querySelector('h2').textContent='Розклад уроків';
preview.querySelector('h2').textContent='Перегляд тижня';
$('md').placeholder='Вставте Markdown із датами й таблицями уроків або відкрийте файл .md…';
$('go').textContent='Створити перегляд →';
$('save').textContent='CSV ↓';
$('save-ics').textContent='ICS ↓';
$('save').title='Завантажити CSV для Google Calendar';
$('save-ics').title='Завантажити ICS зі сповіщеннями';
const toolbar=document.createElement('div');
toolbar.className='preview-actions';
const edit=document.createElement('button');edit.type='button';edit.textContent='Редагувати';
edit.addEventListener('click',()=>showWorkspace('schedule'));
const sync=document.createElement('button');sync.type='button';sync.textContent='Google Calendar ↗';
sync.addEventListener('click',()=>showWorkspace('connections'));
toolbar.append(edit,$('save'),$('save-ics'),sync);
preview.querySelector('.section-heading').append(toolbar);
const quickSettings=document.createElement('button');
quickSettings.type='button';quickSettings.className='quiet';quickSettings.textContent='Дзвінки та сповіщення';
quickSettings.addEventListener('click',()=>showWorkspace('settings'));
$('go').after(quickSettings);
let currentPage='schedule';
function showWorkspace(id,focus=true) {
  currentPage=id;
  for(const [page] of pages){
    const panel=$('workspace-'+page);
    panel.hidden=page!==id;
    const button=navigation.querySelector('[data-page="'+page+'"]');
    if(page===id)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');
  }
  if(focus){
    const heading=$('workspace-'+id).querySelector('h2');
    heading.tabIndex=-1;heading.focus({preventScroll:true});
    window.scrollTo(0,0);
  }
}
navigation.addEventListener('click',event=>{
  const button=event.target.closest('[data-page]');if(button)showWorkspace(button.dataset.page);
});
navigation.addEventListener('keydown',event=>{
  if(!['ArrowRight','ArrowLeft','Home','End'].includes(event.key))return;
  const buttons=[...navigation.querySelectorAll('button')],index=buttons.indexOf(document.activeElement);
  if(index<0)return;
  event.preventDefault();
  const next=event.key==='Home'?0:event.key==='End'?buttons.length-1:(index+(event.key==='ArrowRight'?1:buttons.length-1))%buttons.length;
  buttons[next].focus();
});
$('go').addEventListener('click',()=>{if(exportReady)showWorkspace('preview');});
// Expose status messages from hidden settings/connections in the persistent footer.
for(const id of ['config-status','google-status','script-status']){
  new MutationObserver(()=>{
    const message=$(id).textContent;
    if(message && (currentPage==='connections'||id==='config-status'))status(message);
  }).observe($(id),{childList:true,characterData:true,subtree:true});
}
showWorkspace('preview',false);
