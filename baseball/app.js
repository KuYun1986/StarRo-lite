const cfg=window.BASEBALL_CONFIG,$=id=>document.getElementById(id);
const API='https://dakobubi-survival-backend-production.up.railway.app',KEY='dakobubi_survival_session';
const pitchers=['古雲','一生','豪耶','石董','森上','挪威','光波','阿卷'];
let token=sessionStorage.getItem(KEY)||'',mine={points:0,hr:0,hits:0,ab:0},used=0,playing=false,lock=false,pitch=null,pitchStart=0,raf=0,day=0;
const start=cfg.eventStart,days=cfg.eventDays||7,limit=cfg.dailyAttempts||10;
const end=new Date(Date.parse(start+'T00:00:00Z')+(days-1)*86400000).toISOString().slice(0,10);
const safe=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function message(s){$('playMsg').textContent=s}
async function api(path,method='GET',body){
 const r=await fetch(API+path,{method,headers:{Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,cache:'no-store'});
 const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.detail||'連線失敗');return d;
}
function ranking(rows){$('leaders').innerHTML=(rows||[]).map((r,i)=>'<div class="leader-row"><div class="rank">'+(['🥇','🥈','🥉'][i]||'#'+(i+1))+'</div><div><div class="leader-name">'+safe(r.nickname)+'</div><div class="leader-sub">全壘打 '+r.hr+' · 安打 '+r.hits+' · 打數 '+r.ab+'</div></div><div class="leader-score">'+r.points+' <small>分</small></div></div>').join('')||'<div class="empty">尚無成績</div>'}
function render(){
 $('dates').textContent=start+' ～ '+end;
 $('day').textContent=day<1?'尚未開始':day>days?'已結束':'第 '+day+' / '+days+' 天';
 $('remaining').textContent=Math.max(0,limit-used)+' / '+limit;
 for(const [id,key] of [['myPoints','points'],['myHR','hr'],['myHits','hits'],['myAB','ab']])$(id).textContent=mine[key]||0;
 $('startBtn').disabled=!token||playing||lock||day<1||day>days||used>=limit;
 $('swingBtn').disabled=!playing||lock;
 $('mode').textContent=token?'🟢 Discord 排行榜':'🔐 請登入 Discord';
 $('identityHelp').textContent=token?'使用 Discord 帳號記錄成績，跨裝置同步。':'請先登入 Discord 才能計分。';
 $('nickname').readOnly=true;
 $('saveName').textContent=token?'已連結 Discord':'Discord 登入';
 $('boardNote').textContent='Railway 即時排行榜 · 最多 30 名 · 依總分、全壘打、安打排序';
}
function tick(t){
 if(!playing)return;
 const p=Math.min(1,(t-pitchStart)/pitch.duration);
 $('needle').style.left=(p*100)+'%';
 $('ball').style.opacity='1';$('ball').style.left=(49+2*Math.sin(p*7))+'%';$('ball').style.top=(46+35*p)+'%';
 $('ball').style.transform='rotate(-45deg) scale('+(0.6+p*1.3)+')';
 if(p>=1){swing(true);return}raf=requestAnimationFrame(tick);
}
async function startPitch(){
 if(!token||playing||lock||used>=limit)return;
 lock=true;render();message('投手準備中…');
 try{
  pitch=await api('/baseball/pitch','POST');
  $('status').textContent='⚾ '+pitch.pitcher+' 投球中';
  $('pitchNum').textContent='第 '+(used+1)+' 球｜'+pitch.pitcher;
  $('resultFlash').textContent='';
  playing=true;lock=false;render();
  message('本球投手：'+pitch.pitcher+'｜球速隨機，抓準時機揮棒！');
  pitchStart=performance.now();raf=requestAnimationFrame(tick);
 }catch(e){lock=false;message(e.message+'（若上一球未完成，請稍後再試）');render()}
}
async function swing(auto=false){
 if(!playing||lock)return;
 playing=false;lock=true;cancelAnimationFrame(raf);render();
 $('bat').classList.remove('swing');void $('bat').offsetWidth;$('bat').classList.add('swing');
 message('正在確認打擊結果…');
 try{
  const r=await api('/baseball/swing','POST',{pitchId:pitch.pitchId});
  mine=r.me;used=r.used;day=r.day;ranking(r.ranking);
  $('resultFlash').textContent=r.type+' +'+r.points;
  $('status').textContent=r.type;
  $('history').insertAdjacentHTML('afterbegin','<span class="pill '+(r.type==='全壘打'?'hr':'')+'">'+safe(r.type)+' '+r.points+'分</span> ');
  message(r.type+'，獲得 '+r.points+' 分！'+(used>=limit?' 今日已完成10球。':' 按「開始投球」挑戰下一球。'));
 }catch(e){message('本球紀錄失敗：'+e.message)}
 pitch=null;lock=false;render();
}
async function refresh(){
 if(!token){render();return}
 try{const d=await api('/baseball/state');mine=d.me;used=d.used;day=d.day;ranking(d.ranking);render()}catch(e){message(e.message);if(/登入|過期/.test(e.message)){token='';sessionStorage.removeItem(KEY);render()}}
}
$('startBtn').addEventListener('click',startPitch);
$('swingBtn').addEventListener('click',()=>swing());
$('refreshBtn').addEventListener('click',refresh);
$('saveName').addEventListener('click',()=>{if(!token)location.href=API+'/auth/login?baseball=true'});
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
 if(!token)message('請按「Discord 登入」，才能開始棒球挑戰並參加排行榜。');
}
init();
