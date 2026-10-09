const cfg=window.BASEBALL_CONFIG;
const $=id=>document.getElementById(id);
const eventDays=Math.max(1,Number(cfg.eventDays)||7);
const maxAttempts=Math.max(1,Number(cfg.dailyAttempts)||10);
const safeId=String(cfg.eventId||'baseball').replace(/[^a-zA-Z0-9_-]/g,'-');
const storageKey='starro-baseball-'+safeId;
const nowTW=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const toUTC=d=>Date.parse(d+'T00:00:00Z');
const start=cfg.eventStart;
const currentDay=()=>Math.floor((toUTC(nowTW())-toUTC(start))/86400000)+1;
const today=()=>nowTW();
const last=new Date(toUTC(start)+(eventDays-1)*86400000).toISOString().slice(0,10);
const active=()=>currentDay()>=1&&currentDay()<=eventDays;
const emptyStats=()=>({nickname:'',points:0,hr:0,hits:0,ab:0,daily:{},history:[]});
let mine=emptyStats(), uid=null, db=null, fb=null, online=false, playing=false, lock=false;
let pitchStart=0, duration=2000, raf=0, pitchCount=0, timer=0, lastPitchId=0;
function readLocal(){try{return {...emptyStats(),...JSON.parse(localStorage.getItem(storageKey)||'{}')}}catch{return emptyStats()}}
function localSave(){localStorage.setItem(storageKey,JSON.stringify(mine))}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function used(){return Number(mine.daily?.[today()]||0)}
function rem(){return Math.max(0,maxAttempts-used())}
function mode(s){$('mode').textContent=s}
function message(s){$('playMsg').textContent=s}
function render(){
 $('dates').textContent=start+' ～ '+last;
 $('day').textContent=currentDay()<1?'尚未開始':currentDay()>eventDays?'已結束':`第 ${currentDay()} / ${eventDays} 天`;
 $('remaining').textContent=rem()+' / '+maxAttempts;
 $('myPoints').textContent=Number(mine.points||0).toLocaleString('zh-TW');
 $('myHR').textContent=mine.hr||0;$('myHits').textContent=mine.hits||0;$('myAB').textContent=mine.ab||0;
 $('history').innerHTML=(mine.history||[]).slice(0,8).map(h=>`<span class="pill ${h.type==='全壘打'?'hr':''}">${escapeHtml(h.type)} ${Number(h.points)||0}分</span>`).join('')||'尚未開始';
 $('nickname').value=mine.nickname||'';
 $('startBtn').disabled=playing||lock||!mine.nickname||!active()||!rem();
 $('swingBtn').disabled=!playing||lock;
 $('identityHelp').textContent=online?'已連線共享排行榜（暱稱可更新；裝置以匿名帳號識別）':'試玩模式：成績只存在這台裝置，清除瀏覽器資料會遺失。';
}
function leaderRows(records){const arr=records.filter(r=>r&&r.nickname).sort((a,b)=>(b.points||0)-(a.points||0)||(b.hr||0)-(a.hr||0)||(b.hits||0)-(a.hits||0)).slice(0,30);
 $('leaders').innerHTML=arr.map((r,i)=>`<div class="leader-row"><div class="rank">${['🥇','🥈','🥉'][i]||'#'+(i+1)}</div><div><div class="leader-name">${escapeHtml(String(r.nickname).slice(0,22))}</div><div class="leader-sub">全壘打 ${Number(r.hr)||0} · 安打 ${Number(r.hits)||0} · 打數 ${Number(r.ab)||0}</div></div><div class="leader-score">${(Number(r.points)||0).toLocaleString('zh-TW')} <small>分</small></div></div>`).join('')||'<div class="empty">尚無成績</div>';
}
function tick(time){if(!playing)return;const p=Math.min(1,(time-pitchStart)/duration);$('needle').style.left=(p*100)+'%';$('ball').style.opacity='1';$('ball').style.left=(49 + 2*Math.sin(p*7))+'%';$('ball').style.top=(46+35*p)+'%';$('ball').style.transform=`rotate(-45deg) scale(${0.6+p*1.3})`;
 if(p>=1){hit(1,true);return}raf=requestAnimationFrame(tick)}
function startPitch(){if(playing||lock||!active()||!rem()||!mine.nickname)return;cancelAnimationFrame(raf);clearTimeout(timer);playing=true;pitchCount++;lastPitchId++;duration=1800+Math.random()*550;$('status').textContent='投手投球中！';$('pitchNum').textContent='本次第 '+pitchCount+' 球';$('resultFlash').textContent='';$('startBtn').disabled=true;$('swingBtn').disabled=false;message('球接近中央時按「揮棒」或空白鍵！');pitchStart=performance.now();raf=requestAnimationFrame(tick)}
function outcome(p,automatic){if(automatic||p<.29||p>.71)return {type:'揮空',points:0,hits:0,hr:0};let err=Math.abs(.5-p);let roll=Math.random();if(err<.035){if(roll<.78)return {type:'全壘打',points:100,hits:1,hr:1};if(roll<.9)return {type:'三壘安打',points:60,hits:1,hr:0};return {type:'二壘安打',points:40,hits:1,hr:0}}if(err<.09){if(roll<.38)return {type:'全壘打',points:100,hits:1,hr:1};if(roll<.62)return {type:'二壘安打',points:40,hits:1,hr:0};if(roll<.85)return {type:'一壘安打',points:20,hits:1,hr:0};return {type:'飛球出局',points:0,hits:0,hr:0}}if(roll<.15)return {type:'二壘安打',points:40,hits:1,hr:0};if(roll<.5)return {type:'一壘安打',points:20,hits:1,hr:0};return {type:'滾地出局',points:0,hits:0,hr:0}}
async function hit(position=null,auto=false){if(!playing||lock)return;let p=position===null?Math.min(1,(performance.now()-pitchStart)/duration):position;playing=false;lock=true;cancelAnimationFrame(raf);$('swingBtn').disabled=true;$('bat').classList.remove('swing');void $('bat').offsetWidth;$('bat').classList.add('swing');const r=outcome(p,auto);$('resultFlash').textContent=r.type+' +'+r.points;$('status').textContent=r.type;message(online?'成績正在同步…':'本機成績儲存中…');
 try{if(online){const ref=fb.ref(db,`events/${safeId}/players/${uid}`);const tx=await fb.runTransaction(ref,old=>{const s={...emptyStats(),...(old||{})};const count=Number(s.daily?.[today()]||0);if(count>=maxAttempts||!active())return;const history=[{type:r.type,points:r.points,date:today()},...(Array.isArray(s.history)?s.history:[])].slice(0,12);return {...s,nickname:mine.nickname,points:(Number(s.points)||0)+r.points,hr:(Number(s.hr)||0)+r.hr,hits:(Number(s.hits)||0)+r.hits,ab:(Number(s.ab)||0)+1,daily:{...(s.daily||{}),[today()]:count+1},history}});if(!tx.committed){message('今天次數已用完，沒有扣除本次打擊。')}else{mine={...emptyStats(),...tx.snapshot.val()};message(r.type+`，獲得 ${r.points} 分！`)}}
 else{if(rem()>0){mine.points+=r.points;mine.hr+=r.hr;mine.hits+=r.hits;mine.ab++;mine.daily[today()]=used()+1;mine.history=[{type:r.type,points:r.points,date:today()},...mine.history].slice(0,12);localSave();message(r.type+`，獲得 ${r.points} 分！`);leaderRows([mine])}}
 }catch(err){console.error(err);message('網路儲存失敗，本球未記入成績，請重新整理再試。')}
 lock=false;render();if(rem()&&active()){timer=setTimeout(()=>{if(!playing&&!lock)startPitch()},1300)}else{message(active()?'今日 10 次打擊已完成，明天再來！':'活動尚未開始或已結束。')}
}
async function saveName(){let n=$('nickname').value.trim().replace(/[<>\n\r]/g,'').slice(0,22);if(!n){message('請輸入 Discord 暱稱。');return}if(playing||lock){message('請在本球結束後再改暱稱。');return}try{if(online){await fb.update(fb.ref(db,`events/${safeId}/players/${uid}`),{nickname:n})}mine.nickname=n;localSave();render();if(!online)leaderRows([mine]);message('暱稱已儲存，可以開始遊戲！')}catch(e){message('暱稱儲存失敗，請確認連線。')}}
async function refresh(){if(online){try{const snap=await fb.get(fb.ref(db,`events/${safeId}/players`));leaderRows(Object.values(snap.val()||{}));message('排行榜已更新。')}catch(e){message('排行榜讀取失敗。')}}else leaderRows([mine])}
$('saveName').addEventListener('click',saveName);$('startBtn').addEventListener('click',startPitch);$('swingBtn').addEventListener('click',()=>hit());$('refreshBtn').addEventListener('click',refresh);
document.addEventListener('keydown',e=>{if(e.code==='Space'&&!['INPUT','TEXTAREA','BUTTON'].includes(document.activeElement?.tagName)){e.preventDefault();if(playing)hit()}});
$('shareBtn').addEventListener('click',async()=>{const content=`⚾ 繁星仙境 ${eventDays}天全壘打挑戰賽\n👤 ${mine.nickname||'未設定'}\n🏆 總積分：${mine.points||0}\n💥 全壘打：${mine.hr||0}\n🏃 安打：${mine.hits||0}\n🎯 打數：${mine.ab||0}\n📅 ${currentDay()<1?'尚未開始':currentDay()>eventDays?'活動結束':'第 '+currentDay()+' 天'}\n🎮 ${location.href}`;try{await navigator.clipboard.writeText(content);message('戰績已複製，可貼到 Discord！')}catch{message('複製失敗，請使用 HTTPS 開啟網頁。')}});
async function connect(){const c=cfg.firebase||{};if(!c.apiKey||!c.databaseURL||!c.projectId){mine=readLocal();mode('🧪 本機試玩');render();leaderRows([mine]);message('本機試玩模式：輸入暱稱即可打擊。');return}
 try{const [appMod,authMod,dbMod]=await Promise.all([import('https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js'),import('https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js'),import('https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js')]);const app=appMod.initializeApp(c);const auth=authMod.getAuth(app);const cred=await authMod.signInAnonymously(auth);uid=cred.user.uid;db=dbMod.getDatabase(app);fb=dbMod;const meRef=fb.ref(db,`events/${safeId}/players/${uid}`);const snapshot=await fb.get(meRef);mine={...emptyStats(),...(snapshot.val()||{})};online=true;mode('🟢 多人連線');$('boardNote').textContent='即時同步已啟用 · 最多顯示前 30 名。';fb.onValue(fb.ref(db,`events/${safeId}/players`),snap=>{leaderRows(Object.values(snap.val()||{}))},err=>{console.error(err);message('排行榜同步失敗，請檢查 Firebase 規則。')});render();message(mine.nickname?'歡迎回來！按開始投球。':'先設定 Discord 暱稱。')
 }catch(err){console.error(err);online=false;mine=readLocal();mode('⚠️ 連線失敗・試玩');render();leaderRows([mine]);message('Firebase 連線失敗，暫以本機試玩（不會同步至排行榜）。請檢查設定、匿名登入及資料庫規則。')}}
render();connect();
