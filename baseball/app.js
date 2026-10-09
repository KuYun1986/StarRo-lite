const cfg=window.BASEBALL_CONFIG,$=id=>document.getElementById(id);
const API='https://dakobubi-survival-backend-production.up.railway.app',KEY='dakobubi_survival_session';
const pitchers=['古雲','一生','豪耶','石董','森上','挪威','光波','阿卷'];
let swingPosition=0;let countdownActive=false;let isAdmin=false,adminChecked=false;let token=sessionStorage.getItem(KEY)||'',mine={points:0,hr:0,hits:0,ab:0},used=0,playing=false,lock=false,pitch=null,pitchStart=0,raf=0,day=0;
const start=cfg.eventStart,days=cfg.eventDays||7,limit=cfg.dailyAttempts||10;
const end=new Date(Date.parse(start+'T00:00:00Z')+(days-1)*86400000).toISOString().slice(0,10);
const safe=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function message(s){$('playMsg').textContent=s}
function discordLogin(){location.href=API+'/auth/login?baseball=true'}
async function api(path,method='GET',body){
 const r=await fetch(API+path,{method,headers:{Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,cache:'no-store'});
 const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.detail||'連線失敗');return d;
}
function ranking(rows){$('leaders').innerHTML=(rows||[]).map((r,i)=>'<div class="leader-row"><div class="rank">'+(['🥇','🥈','🥉'][i]||'#'+(i+1))+'</div><div><div class="leader-name">'+safe(r.nickname)+'</div><div class="leader-sub">全壘打 '+r.hr+' · 安打 '+r.hits+' · 打數 '+r.ab+'</div></div><div class="leader-score">'+r.points+' <small>分</small></div></div>').join('')||'<div class="empty">尚無成績</div>'}
function render(){
 $('dates').textContent=start+' ～ '+end;
 $('day').textContent=day<1?'尚未開始':day>days?'已結束':'第 '+day+' / '+days+' 天';
 $('remaining').textContent=Math.max(0,limit-used)+' / '+limit;
 $('fieldUsed').textContent=used+' / '+limit;
 $('fieldRemaining').textContent=Math.max(0,limit-used)+' / '+limit;
 for(const [id,key] of [['fieldPoints','points'],['fieldHR','hr'],['fieldHits','hits'],['fieldAB','ab']])$(id).textContent=mine[key]||0;
 for(const [id,key] of [['myPoints','points'],['myHR','hr'],['myHits','hits'],['myAB','ab']])$(id).textContent=mine[key]||0;
 $('startBtn').disabled=!token||playing||lock||countdownActive||day<1||day>days||used>=limit;
 $('swingBtn').disabled=!playing||lock;
 $('baseballAdmin').hidden=!isAdmin;
 $('mode').textContent=token?'🟢 Discord 已登入':'🔐 尚未登入';
 $('discordLogin').textContent=token?'✓ Discord 已登入':'🎮 Discord 登入';
 $('discordLogin').disabled=!!token;
 $('identityHelp').textContent=!token?'請先登入 Discord 才能計分。':!adminChecked?'正在確認管理員權限…':isAdmin?'管理員身分已驗證，可以使用下方棒球管理系統。':'使用 Discord 帳號記錄成績，跨裝置同步。';
 $('nickname').readOnly=true;
 $('saveName').textContent=token?'已連結 Discord':'Discord 登入';
 $('boardNote').textContent='Railway 即時排行榜 · 最多 30 名 · 依總分、全壘打、安打排序';
}
function tick(t){
 if(!playing)return;
 const p=Math.min(1,(t-pitchStart)/pitch.duration);
 swingPosition=p;
 const ready=Math.abs(p-.5)<.065;
 const tier=Math.abs(p-.5)<.014?'hr':Math.abs(p-.5)<.036?'triple':Math.abs(p-.5)<.11?'double':p>=.29&&p<=.71?'single':'miss';
 const zone=$('strikeZone');zone.classList.remove('tier-hr','tier-triple','tier-double','tier-single','tier-miss');zone.classList.add('tier-'+tier);
 $('strikeZone').classList.toggle('ready',ready);
 $('swingCue').classList.toggle('ready',ready);
 $('strikeCue').textContent=ready?'🔥 現在揮棒！':'🎯 球進框中央時揮棒';
 $('swingCue').textContent=ready?'🎯 球進框了！可以揮棒！':'🎯 球進框時可揮棒';
 $('ball').style.opacity='1';$('ball').style.left=(54-3.5*p)+'%';$('ball').style.top=(52+13*p)+'%';
 $('ball').style.transform='scale('+(0.5+p*2.2)+')';
 if(p>=1){swing(true);return}raf=requestAnimationFrame(tick);
}
async function startPitch(){
 if(!token||playing||lock||countdownActive||used>=limit)return;
 lock=true;render();message('正在抽選本次投手…');
 try{
  pitch=await api('/baseball/pitch','POST');
  $('currentPitcher').textContent=pitch.pitcher;
  $('pitchSpeed').textContent=(pitch.duration/1000).toFixed(2)+' 秒';
  $('status').textContent='⚾ '+pitch.pitcher+' 準備投球';
  $('pitchNum').textContent='第 '+(used+1)+' 球｜'+pitch.pitcher;
  $('resultFlash').textContent='';
  $('swingCue').textContent='⏳ 倒數 3 秒，準備看球揮棒';
  countdownActive=true;render();
  const cd=$('countdown');cd.hidden=false;
  for(let n=3;n>=1;n--){
   cd.textContent=n;
   message('本次投手：'+pitch.pitcher+'｜'+n+' 秒後投球，準備按揮棒！');
   await new Promise(resolve=>setTimeout(resolve,1000));
  }
  cd.hidden=true;countdownActive=false;
  playing=true;lock=false;render();
  $('status').textContent='⚾ '+pitch.pitcher+' 投球中！';
  $('pitcherPerson').classList.remove('throwing');void $('pitcherPerson').offsetWidth;$('pitcherPerson').classList.add('throwing');
  message('球速每球不同！白色移動指針對準中央固定白線時揮棒！');
  pitchStart=performance.now();swingPosition=0;raf=requestAnimationFrame(tick);
 }catch(e){countdownActive=false;$('countdown').hidden=true;lock=false;message(e.message+'（若上一球未完成，請稍後再試）');render()}
}
async function swing(auto=false){
 if(!playing||lock)return;
 const capturedPosition=auto?1:Math.min(1,(performance.now()-pitchStart)/pitch.duration);
 playing=false;lock=true;cancelAnimationFrame(raf);
 $('strikeZone').classList.remove('ready');$('swingCue').classList.remove('ready');
 $('animeSwingFlash').classList.remove('active');void $('animeSwingFlash').offsetWidth;$('animeSwingFlash').classList.add('active');render();
 $('bat').classList.remove('swing');void $('bat').offsetWidth;$('bat').classList.add('swing');
 message('正在確認打擊結果…');
 try{
  const r=await api('/baseball/swing','POST',{pitchId:pitch.pitchId,position:capturedPosition});
  mine=r.me;used=r.used;day=r.day;ranking(r.ranking);
  $('resultFlash').textContent=r.type+' +'+r.points;
 const hitColor=({'全壘打':'hr','三壘安打':'triple','二壘安打':'double','一壘安打':'single'})[r.type]||'miss';
 $('resultFlash').classList.remove('result-hr','result-triple','result-double','result-single','result-miss');$('resultFlash').classList.add('result-'+hitColor);
  $('status').textContent=r.type;
  $('history').insertAdjacentHTML('afterbegin','<span class="pill '+(r.type==='全壘打'?'hr':'')+'">'+safe(r.type)+' '+r.points+'分</span> ');
  $('swingCue').textContent=r.type+'｜'+r.points+' 分';
  message(r.type+'，獲得 '+r.points+' 分！'+(used>=limit?' 今日已完成10球。':' 按「開始投球」挑戰下一球。'));
 }catch(e){message('本球紀錄失敗：'+e.message)}
 pitch=null;lock=false;render();
}
async function refresh(){
 if(!token){render();return}
 try{
 const d=await api('/baseball/state');
 mine=d.me;used=d.used;day=d.day;ranking(d.ranking);
 // Use the same admin identity source as the survival control panel.
 // This also works if Railway is serving an older baseball/state response.
 try{const survival=await api('/state');isAdmin=!!survival.me?.admin}
 catch(e){isAdmin=!!d.admin}
 adminChecked=true;render()
}catch(e){message(e.message);if(/登入|過期/.test(e.message)){token='';sessionStorage.removeItem(KEY);render()}}
}
$('startBtn').addEventListener('click',startPitch);
$('swingBtn').addEventListener('click',()=>swing());
$('refreshBtn').addEventListener('click',refresh);
$('resetBaseball').addEventListener('click',async()=>{
 if(!isAdmin)return;
 const v=prompt('此操作將永久清除棒球全部玩家分數與每日打擊次數，生存戰不受影響。\\n請輸入 RESET BASEBALL 確認：');
 if(v!=='RESET BASEBALL')return;
 const btn=$('resetBaseball');btn.disabled=true;
 try{const r=await api('/baseball/admin/reset','POST',{confirm:v});$('adminMsg').textContent=r.message;await refresh();$('history').textContent='尚未開始';message('棒球成績已由管理員清空。')}
 catch(e){$('adminMsg').textContent='操作失敗：'+e.message}
 finally{btn.disabled=false}
});
$('saveName').addEventListener('click',()=>{if(!token)discordLogin()});
$('discordLogin').addEventListener('click',discordLogin);
document.addEventListener('keydown',e=>{if(e.code==='Space'&&!['INPUT','TEXTAREA','BUTTON'].includes(document.activeElement?.tagName)){e.preventDefault();if(playing)swing()}});
$('shareBtn').addEventListener('click',async()=>{const txt='⚾ 7天棒球挑戰賽\n🏆 '+mine.points+' 分\n💥 全壘打 '+mine.hr+' 支\n🏃 安打 '+mine.hits+' 支\n'+location.href.split('#')[0];try{await navigator.clipboard.writeText(txt);message('成績已複製，可以貼到 Discord！')}catch{message('複製失敗')}});
async function init(){
 if(location.hash.startsWith('#ticket=')){
  try{const r=await fetch(API+'/auth/exchange',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ticket:decodeURIComponent(location.hash.slice(8))})});const d=await r.json();if(!r.ok)throw Error(d.detail||'登入失敗');token=d.token;sessionStorage.setItem(KEY,token)}catch(e){message(e.message)}
  history.replaceState(null,'',location.pathname+location.search);
 }
 $('nickname').placeholder='Discord 帳號登入後自動識別';
 $('nickname').value=token?'已登入 Discord':'尚未登入';
 render();await refresh();
 if(!token)message('直接按上方「Discord 登入」即可參賽，不用先進入極限生存戰。');
}
init();
