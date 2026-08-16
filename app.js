/* NFT UPGRADER v3 */
const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
  tg.setHeaderColor('#07070f');
  tg.setBackgroundColor('#07070f');
  // Отключаем вертикальный свайп чтобы не закрывал приложение при скролле
  if (tg.disableVerticalSwipes) tg.disableVerticalSwipes();
  // Включаем скролл внутри Mini App
  if (tg.enableClosingConfirmation) tg.enableClosingConfirmation();
}

// ── ITEMS ──
const ITEMS = [
  // Эти только для ставки (ваш предмет), нельзя выбрать как желаемый
  { id:1,  name:'Plush Heart',       img:'gifts/processed/plush-heart.png',        value:15,    rarity:'common',   betOnly:true  },
  { id:2,  name:'Teddy Bear',        img:'gifts/processed/teddy-bear.png',         value:15,    rarity:'common',   betOnly:true  },
  // Обычные
  { id:3,  name:'Homemade Cake',     img:'gifts/processed/homemade-cake.png',      value:50,    rarity:'common',   betOnly:false },
  { id:4,  name:'Trophy',            img:'gifts/processed/trophy.png',             value:100,   rarity:'common',   betOnly:false },
  { id:5,  name:'Instant Noodles',   img:'gifts/processed/instant-noodles.png',    value:380,   rarity:'common',   betOnly:false },
  { id:6,  name:'Ice Cream',         img:'gifts/processed/ice-cream.png',          value:399,   rarity:'common',   betOnly:false },
  { id:7,  name:'Statue of Liberty', img:'gifts/processed/statue-of-liberty.png',  value:470,   rarity:'common',   betOnly:false },
  { id:8,  name:'Lollipop',          img:'gifts/processed/lollipop.png',           value:482,   rarity:'common',   betOnly:false },
  // Необычные
  { id:9,  name:'Backpack',          img:'gifts/processed/durovs-backpack.png',    value:500,   rarity:'uncommon', betOnly:false },
  { id:10, name:'Blue Socks',        img:'gifts/processed/blue-socks.png',         value:529,   rarity:'uncommon', betOnly:false },
  { id:11, name:'Bag of Coins',      img:'gifts/processed/bag-of-coins.png',       value:560,   rarity:'uncommon', betOnly:false },
  // Редкие
  { id:12, name:'Burning Joint',     img:'gifts/processed/burning-joint.png',      value:1349,  rarity:'rare',     betOnly:false },
  { id:13, name:'Golden Watch',      img:'gifts/processed/golden-watch.png',       value:4879,  rarity:'rare',     betOnly:false },
  // Легендарные
  { id:14, name:'Sunglasses',        img:'gifts/processed/sunglasses.png',         value:10845, rarity:'legendary',betOnly:false },
];

const RARITY = {
  common:    { color:'#78909C', label:'Обычный'     },
  uncommon:  { color:'#00e676', label:'Необычный'   },
  rare:      { color:'#4d9fff', label:'Редкий'      },
  legendary: { color:'#ffd700', label:'Легендарный' },
};

const FAKE_USERS = ['Aleksey','Maria','Ivan','Dima','Sasha','Kate','Nikita','Anna','Max','Lena','Roma','Vlad'];
const FEED_PAIRS = [
  {b:0,p:2},{b:1,p:3},{b:2,p:4},{b:3,p:5},{b:4,p:6},{b:5,p:7},
  {b:6,p:8},{b:7,p:9},{b:8,p:10},{b:9,p:11},{b:10,p:12},
  {b:0,p:5},{b:1,p:6},{b:2,p:8},{b:3,p:10},{b:0,p:10},{b:1,p:12},
];

// ── STATE ──
const S = {
  yoursItem:null, wantedItem:null, winChance:0,
  isSpinning:false, currentModal:null, rarityFilter:'all', shopFilter:'all',
  balance:0, inventory:[],
};

// ── CANVAS ──
const canvas = document.getElementById('rouletteCanvas');
const ctx    = canvas.getContext('2d');
const SZ=280, CR=SZ/2;
let wheelAngle=0;

function fmt(v){ return v>=1000?(v/1000).toFixed(v>=10000?0:1)+'k':v+''; }
function calcChance(a,b){ return(!a||!b)?0:Math.min(95,Math.max(1,Math.round((a/b)*100*0.95))); }

// ── WHEEL ──
function drawWheel(angle,chance){
  ctx.clearRect(0,0,SZ,SZ);
  const cx=CR,cy=CR,r=CR-5;
  if(chance<=0){
    ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.fillStyle='#10101e';ctx.fill();
    drawRing(cx,cy,r);return;
  }
  const wr=(chance/100)*Math.PI*2,lr=Math.PI*2-wr;
  ctx.beginPath();ctx.moveTo(cx,cy);ctx.arc(cx,cy,r,angle+wr,angle+Math.PI*2);ctx.closePath();ctx.fillStyle='#2a0f10';ctx.fill();
  ctx.beginPath();ctx.moveTo(cx,cy);ctx.arc(cx,cy,r,angle,angle+wr);ctx.closePath();ctx.fillStyle='#0a2210';ctx.fill();
  ctx.beginPath();ctx.moveTo(cx,cy);ctx.arc(cx,cy,r,angle,angle+wr);ctx.closePath();ctx.strokeStyle='rgba(0,230,118,0.35)';ctx.lineWidth=1;ctx.stroke();
  const line=(a,c)=>{ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(cx+r*Math.cos(a),cy+r*Math.sin(a));ctx.strokeStyle=c;ctx.lineWidth=2;ctx.stroke();};
  line(angle,'rgba(0,230,118,0.8)');line(angle+wr,'rgba(255,71,87,0.8)');
  const rr=r*0.65;
  const lbl=(a,t,c,s)=>{ctx.save();ctx.fillStyle=c;ctx.font=`bold ${s}px -apple-system,sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.shadowColor='rgba(0,0,0,0.9)';ctx.shadowBlur=6;ctx.fillText(t,cx+rr*Math.cos(a),cy+rr*Math.sin(a));ctx.restore();};
  if(chance>7)  lbl(angle+wr/2,`${chance}%`,'#00e676',Math.min(15,Math.max(10,chance/4)));
  if(chance<93) lbl(angle+wr+lr/2,`${100-chance}%`,'#ff4757',Math.min(15,Math.max(10,(100-chance)/4)));
  drawRing(cx,cy,r);
}
function drawRing(cx,cy,r){
  ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.strokeStyle='rgba(255,255,255,0.06)';ctx.lineWidth=3;ctx.stroke();
  for(let i=0;i<48;i++){
    const a=(i/48)*Math.PI*2,maj=i%4===0,len=maj?7:3;
    ctx.beginPath();ctx.moveTo(cx+(r-1)*Math.cos(a),cy+(r-1)*Math.sin(a));ctx.lineTo(cx+(r-len)*Math.cos(a),cy+(r-len)*Math.sin(a));
    ctx.strokeStyle=maj?'rgba(255,255,255,0.12)':'rgba(255,255,255,0.04)';ctx.lineWidth=maj?1.5:1;ctx.stroke();
  }
}

// ── STORAGE ──
function saveState(){ try{localStorage.setItem('inv',JSON.stringify(S.inventory));localStorage.setItem('bal',S.balance);}catch(e){} }
function loadState(){ try{const i=localStorage.getItem('inv'),b=localStorage.getItem('bal');if(i)S.inventory=JSON.parse(i);if(b)S.balance=parseInt(b)||0;}catch(e){} }
function invCount(id){ const e=S.inventory.find(x=>x.itemId===id);return e?e.count:0; }
function invAdd(id){ const e=S.inventory.find(x=>x.itemId===id);if(e)e.count++;else S.inventory.push({itemId:id,count:1});saveState();updateInvBadge(); }
function invRemove(id){ const e=S.inventory.find(x=>x.itemId===id);if(!e||e.count<=0)return false;e.count--;if(e.count===0)S.inventory=S.inventory.filter(x=>x.itemId!==id);saveState();updateInvBadge();return true; }
function totalInv(){ return S.inventory.reduce((s,x)=>s+x.count,0); }
function updateInvBadge(){ const b=document.getElementById('invBadge'),n=totalInv();if(n>0){b.textContent=n;b.style.display='flex';}else b.style.display='none'; }
function updateBalance(){ const el=document.getElementById('userBalance');if(el)el.textContent=fmt(S.balance)+' ⭐'; }

// ── UPDATE UI ──
function updateUI(){
  renderSlot('slotYours',S.yoursItem,'yours');
  renderSlot('slotWanted',S.wantedItem,'wanted');
  S.winChance=(S.yoursItem&&S.wantedItem)?calcChance(S.yoursItem.value,S.wantedItem.value):0;
  const ct=document.getElementById('centerText'),cp=document.getElementById('centerPercent');
  const btn=document.getElementById('upgradeBtn'),sub=document.getElementById('upgradeBtnSub');
  if(!S.yoursItem&&!S.wantedItem){ct.textContent='Выберите предметы';cp.textContent='';}
  else if(!S.yoursItem){ct.textContent='Ваш предмет';cp.textContent='';}
  else if(!S.wantedItem){ct.textContent='Желаемый предмет';cp.textContent='';}
  else{ct.textContent='Шанс победы';cp.textContent=S.winChance+'%';}
  btn.disabled=!(S.yoursItem&&S.wantedItem&&!S.isSpinning);
  sub.textContent=`Шанс выигрыша ${S.winChance}%`;
  drawWheel(wheelAngle,S.winChance);
}

function renderSlot(id,item,type){
  const slot=document.getElementById(id),label=type==='yours'?'Ваш предмет':'Желаемый предмет';
  if(!item){
    slot.classList.remove('filled');
    const ac=type==='yours'?'#555':'#4d9fff',bc=type==='yours'?'#333':'#1a5faa';
    const d=type==='yours'
      ?`<path d="M7 8L12 13L17 8" stroke="${ac}" stroke-width="2.5" stroke-linecap="round"/><path d="M7 13L12 18L17 13" stroke="${bc}" stroke-width="2.5" stroke-linecap="round"/>`
      :`<path d="M7 16L12 11L17 16" stroke="${ac}" stroke-width="2.5" stroke-linecap="round"/><path d="M7 11L12 6L17 11" stroke="${bc}" stroke-width="2.5" stroke-linecap="round"/>`;
    slot.innerHTML=`<div class="slot-label">${label}</div><div class="slot-arrow"><svg width="28" height="28" viewBox="0 0 24 24" fill="none">${d}</svg></div>`;
  } else {
    slot.classList.add('filled');
    const col=RARITY[item.rarity].color;
    const cnt=invCount(item.id);
    slot.innerHTML=`
      <div class="slot-label">${label}</div>
      <div class="slot-item">
        <img class="slot-img" src="${item.img}" alt="${item.name}">
        <div class="slot-item-name">${item.name}</div>
        <div class="slot-item-value">${fmt(item.value)} ⭐</div>
        <div class="slot-rarity-bar" style="background:linear-gradient(90deg,${col}44,${col})"></div>
        <div style="font-size:9px;color:${cnt>0?'var(--green)':'var(--text3)'}">
          ${cnt>0?`✓ В инвентаре ×${cnt}`:RARITY[item.rarity].label}
        </div>
      </div>`;
  }
  slot.onclick=()=>openItemModal(type);
}

function resetSlots(){ S.yoursItem=null;S.wantedItem=null;wheelAngle=0;updateUI(); }

// ── ITEM MODAL ──
function openItemModal(type){
  if(S.isSpinning)return;
  S.currentModal=type;
  document.getElementById('modalTitle').textContent=type==='yours'?'🎯 Ваш предмет':'🏆 Желаемый предмет';
  document.getElementById('searchInput').value='';
  S.rarityFilter='all';
  document.querySelectorAll('.rtab').forEach(b=>b.classList.remove('active'));
  document.querySelector('.rtab').classList.add('active');
  renderGrid();
  document.getElementById('itemModal').classList.add('open');
}
function closeItemModal(){ document.getElementById('itemModal').classList.remove('open');S.currentModal=null; }
function closeModalOutside(e){ if(e.target===document.getElementById('itemModal'))closeItemModal(); }
function setRarityFilter(r,btn){ S.rarityFilter=r;document.querySelectorAll('.rtab').forEach(b=>b.classList.remove('active'));btn.classList.add('active');renderGrid(); }
function filterItems(){ renderGrid(); }

function renderGrid(){
  const grid=document.getElementById('itemGrid');
  const q=document.getElementById('searchInput').value.toLowerCase().trim();
  const sel=S.currentModal==='yours'?S.yoursItem:S.wantedItem;
  let items=S.currentModal==='yours'?ITEMS.filter(i=>invCount(i.id)>0):[...ITEMS].filter(i=>!i.betOnly);
  if(S.rarityFilter!=='all')items=items.filter(i=>i.rarity===S.rarityFilter);
  if(q)items=items.filter(i=>i.name.toLowerCase().includes(q));
  if(!items.length){
    grid.innerHTML=S.currentModal==='yours'
      ?`<div class="no-items">📦 Инвентарь пуст<br><br><button onclick="closeItemModal();switchPage('shop')" style="background:linear-gradient(135deg,#1a6fff,#0d47c8);border:none;color:#fff;padding:10px 20px;border-radius:12px;font-weight:700;cursor:pointer;font-size:12px">🛍 В магазин</button></div>`
      :`<div class="no-items">Ничего не найдено 🔍</div>`;
    return;
  }
  grid.innerHTML=items.map(item=>{
    const col=RARITY[item.rarity].color,act=sel&&sel.id===item.id?'selected':'',cnt=invCount(item.id);
    return `<div class="item-card ${act}" onclick="selectItem(${item.id})">
      <img class="item-card-img" src="${item.img}" alt="${item.name}">
      <div class="item-card-name">${item.name}</div>
      <div class="item-card-value">${fmt(item.value)} ⭐</div>
      <div class="item-rarity-bar" style="background:linear-gradient(90deg,${col}44,${col})"></div>
      ${cnt>0?`<div style="font-size:9px;color:var(--green)">×${cnt}</div>`:''}
    </div>`;
  }).join('');
}

function selectItem(id){
  const item=ITEMS.find(i=>i.id===id);if(!item)return;
  if(S.currentModal==='yours'){S.yoursItem=item;if(S.wantedItem?.id===item.id)S.wantedItem=null;}
  else S.wantedItem=item;
  closeItemModal();updateUI();
  tg?.HapticFeedback?.selectionChanged();
}

// ── SHOP ──
function setShopTab(r,btn){ S.shopFilter=r;document.querySelectorAll('.shop-tab').forEach(b=>b.classList.remove('active'));btn.classList.add('active');renderShop(); }

function renderShop(){
  const grid=document.getElementById('shopGrid');
  let items=[...ITEMS];
  if(S.shopFilter!=='all')items=items.filter(i=>i.rarity===S.shopFilter);
  grid.innerHTML=items.map(item=>{
    const col=RARITY[item.rarity].color,cnt=invCount(item.id);
    return `<div class="shop-card" onclick="openBuyModal(${item.id})">
      <div class="shop-card-rarity" style="background:${col}22;color:${col}">${RARITY[item.rarity].label}</div>
      ${cnt>0?`<div class="shop-card-owned">×${cnt}</div>`:''}
      <img class="shop-card-img" src="${item.img}" alt="${item.name}">
      <div class="shop-card-name">${item.name}</div>
      <div class="shop-card-price">⭐ ${fmt(item.value)}</div>
      <button class="shop-buy-btn" onclick="event.stopPropagation();openBuyModal(${item.id})">Купить за ${fmt(item.value)} ⭐</button>
    </div>`;
  }).join('');
}

// ── BUY MODAL ──
function openBuyModal(id){
  const item=ITEMS.find(i=>i.id===id);if(!item)return;
  S.buyItem=item;
  const col=RARITY[item.rarity].color;
  document.getElementById('buyModalBody').innerHTML=`
    <img class="buy-modal-img" src="${item.img}" alt="${item.name}">
    <div class="buy-modal-name">${item.name}</div>
    <div style="font-size:11px;color:${col};font-weight:700;letter-spacing:1px">${RARITY[item.rarity].label}</div>
    <div class="buy-modal-price">⭐ ${item.value.toLocaleString()}</div>
    <div style="font-size:11px;color:var(--text3);text-align:center">Баланс: <span style="color:var(--gold);font-weight:700">${S.balance.toLocaleString()} ⭐</span></div>
    <div class="buy-modal-actions">
      <button class="buy-cancel-btn" onclick="closeBuyModal()">Отмена</button>
      <button class="buy-confirm-btn" onclick="confirmBuy(${item.id})">⭐ Купить</button>
    </div>`;
  document.getElementById('buyModal').classList.add('open');
}
function closeBuyModal(){ document.getElementById('buyModal').classList.remove('open'); }
function closeBuyModalOutside(e){ if(e.target===document.getElementById('buyModal'))closeBuyModal(); }

function confirmBuy(id){
  const item=ITEMS.find(i=>i.id===id);if(!item)return;
  // Сначала списываем с баланса если хватает
  if(S.balance >= item.value){
    S.balance -= item.value;
    invAdd(item.id);updateBalance();renderShop();renderInventory();closeBuyModal();
    showToast(`✅ ${item.name} добавлен!`,'#00e676');
    tg?.HapticFeedback?.notificationOccurred('success');
    return;
  }
  // Если баланса не хватает — счёт через Telegram
  if(tg&&tg.initData){
    closeBuyModal();
    tg.sendData(JSON.stringify({action:'buy',itemId:item.id,itemName:item.name,price:item.value}));
    showToast(`⭐ Счёт отправлен!`);return;
  }
  showToast('❌ Недостаточно Stars!');closeBuyModal();
}

function onPurchaseSuccess(itemId){
  const item=ITEMS.find(i=>i.id===itemId);if(!item)return;
  invAdd(itemId);renderShop();renderInventory();
  showToast(`✅ ${item.name} добавлен!`,'#00e676');
}

// ── INVENTORY ──
function renderInventory(){
  const grid=document.getElementById('invGrid'),empty=document.getElementById('invEmpty');
  if(S.inventory.length===0){empty.style.display='flex';grid.style.display='none';return;}
  empty.style.display='none';grid.style.display='grid';
  grid.innerHTML=S.inventory.map(e=>{
    const item=ITEMS.find(i=>i.id===e.itemId);if(!item)return'';
    const col=RARITY[item.rarity].color,used=S.yoursItem&&S.yoursItem.id===item.id;
    return `<div class="inv-card">
      ${e.count>1?`<div class="inv-card-count">×${e.count}</div>`:''}
      <img class="inv-card-img" src="${item.img}" alt="${item.name}">
      <div class="inv-card-name">${item.name}</div>
      <div class="inv-card-value">${fmt(item.value)} ⭐</div>
      <div class="inv-card-rarity" style="background:linear-gradient(90deg,${col}44,${col})"></div>
      <button class="inv-use-btn ${used?'used':''}" onclick="useFromInventory(${item.id})">
        ${used?'✓ Выбрано':'⬆ Поставить'}
      </button>
    </div>`;
  }).join('');
}

function useFromInventory(id){
  const item=ITEMS.find(i=>i.id===id);if(!item)return;
  S.yoursItem=item;updateUI();renderInventory();
  // Прокручиваем наверх к рулетке
  document.getElementById('page-upgrade').scrollTo({top:0,behavior:'smooth'});
  tg?.HapticFeedback?.selectionChanged();
  showToast(`⬆ ${item.name} выбран`);
}

// ── SPIN ──
function startUpgrade(){
  if(S.isSpinning||!S.yoursItem||!S.wantedItem)return;
  if(invCount(S.yoursItem.id)===0){showToast('❌ Предмета нет в инвентаре!');return;}
  S.isSpinning=true;
  const btn=document.getElementById('upgradeBtn');
  btn.disabled=true;btn.classList.add('spinning-btn');
  document.getElementById('rouletteRing').classList.add('spinning');
  tg?.HapticFeedback?.impactOccurred('medium');

  const chance=S.winChance,didWin=Math.random()*100<chance;
  const wr=(chance/100)*Math.PI*2,TOP=-Math.PI/2;
  let land=didWin?wr*0.08+Math.random()*wr*0.84:(()=>{const lr=Math.PI*2-wr;return wr+lr*0.08+Math.random()*lr*0.84;})();
  const target=TOP-land+(6+Math.floor(Math.random()*4))*Math.PI*2;
  const start=wheelAngle,dur=3800+Math.random()*1400,t0=performance.now();
  const ease=t=>1-Math.pow(1-t,3.5);
  let done=false;
  requestAnimationFrame(function loop(now){
    const prog=Math.min((now-t0)/dur,1);
    wheelAngle=start+(target-start)*ease(prog);
    drawWheel(wheelAngle,chance);
    if(prog<1)requestAnimationFrame(loop);
    else if(!done){done=true;wheelAngle=((target%(Math.PI*2))+Math.PI*2)%(Math.PI*2);drawWheel(wheelAngle,chance);finishSpin(didWin);}
  });
}

function finishSpin(didWin){
  S.isSpinning=false;
  document.getElementById('upgradeBtn').classList.remove('spinning-btn');
  document.getElementById('rouletteRing').classList.remove('spinning');
  tg?.HapticFeedback?.notificationOccurred(didWin?'success':'error');
  if(didWin){invRemove(S.yoursItem.id);invAdd(S.wantedItem.id);}
  else invRemove(S.yoursItem.id);
  renderInventory();
  // Отправляем результат боту для реальной ленты
  if(tg&&tg.initData){
    tg.sendData(JSON.stringify({
      action:'upgrade_result', win:didWin,
      betName:S.yoursItem.name, betImg:S.yoursItem.img, betVal:S.yoursItem.value,
      prizeName:S.wantedItem.name, prizeImg:S.wantedItem.img, prizeVal:S.wantedItem.value,
    }));
  }
  pushFeedCard(makeFeedCard(didWin,didWin?S.wantedItem.name:S.yoursItem.name,didWin?S.wantedItem.img:S.yoursItem.img,S.yoursItem.value,S.wantedItem.value,'Вы','только что'));
  setTimeout(()=>showResult(didWin),350);
}

// ── RESULT ──
function showResult(didWin){
  const prize=S.wantedItem,bet=S.yoursItem;
  document.getElementById('resultGlow').className=`result-glow ${didWin?'win':'lose'}`;
  document.getElementById('resultIcon').innerHTML=didWin?`<img src="${prize.img}" style="width:84px;height:84px;object-fit:contain">`:`<span style="font-size:60px">💨</span>`;
  document.getElementById('resultTitle').textContent=didWin?'ПОБЕДА!':'ПРОИГРЫШ';
  document.getElementById('resultTitle').className=`result-title ${didWin?'win':'lose'}`;
  document.getElementById('resultSubtitle').textContent=didWin?`Вы получили ${prize.name}!`:`${bet.name} потерян`;
  const shown=didWin?prize:bet;
  document.getElementById('resultItemCard').innerHTML=`
    <img class="result-item-img" src="${shown.img}" alt="${shown.name}">
    <div class="result-item-name">${shown.name}</div>
    <div class="result-item-val">${fmt(shown.value)} ⭐</div>`;
  if(didWin)spawnParticles();
  document.getElementById('resultOverlay').classList.add('open');
}

function spawnParticles(){
  const box=document.getElementById('resultParticles');box.innerHTML='';
  ['#00e676','#ffd700','#4d9fff','#ff4757','#ab47bc'].forEach(col=>{
    for(let j=0;j<5;j++){
      const p=document.createElement('div');p.className='particle';
      p.style.cssText=`left:${35+Math.random()*30}%;top:${35+Math.random()*30}%;background:${col};--tx:${(Math.random()-.5)*200}px;--ty:${-(Math.random()*220+80)}px;animation-delay:${Math.random()*0.3}s;animation-duration:${0.9+Math.random()*0.5}s`;
      box.appendChild(p);
    }
  });
}

function closeResult(){
  document.getElementById('resultOverlay').classList.remove('open');
  S.yoursItem=null;S.wantedItem=null;S.winChance=0;wheelAngle=0;updateUI();
}

// ── LIVE FEED ──
function timeAgo(ts){ const s=Math.round((Date.now()-ts)/1000);return s<60?`${s} сек назад`:`${Math.floor(s/60)} мин назад`; }

function makeFeedCard(win,name,img,betVal,prizeVal,user,time){
  const mult=(prizeVal/betVal).toFixed(1);
  const d=document.createElement('div');
  d.className=`feed-card ${win?'feed-win':'feed-lose'} feed-new`;
  d.innerHTML=`
    <div class="feed-status ${win?'win':'lose'}">${win?'ВЫИГРЫШ':'ПРОИГРЫШ'}</div>
    <div class="feed-mult">${mult}x</div>
    <div class="feed-img"><img src="${img}" alt="${name}"></div>
    <div class="feed-name">${name}</div>
    <div class="feed-time">${user} · ${time}</div>
    <div class="feed-values">${fmt(betVal)} → ${fmt(prizeVal)} <span class="fv-gold">⭐</span></div>`;
  return d;
}

function pushFeedCard(card){
  const track=document.getElementById('feedTrack');
  track.prepend(card);
  while(track.children.length>14)track.removeChild(track.lastChild);
}

// SSE соединение с ботом для реальной ленты
const BOT_API = 'https://web-production-dd3cb.up.railway.app';
let sseConnection = null;

function connectSSE(){
  try{
    sseConnection = new EventSource(`${BOT_API}/feed`);
    sseConnection.onmessage = e => {
      try{
        const d = JSON.parse(e.data);
        if(d.type === 'upgrade'){
          const shown = d.win
            ? {name:d.prizeName, img:d.prizeImg, value:d.prizeVal}
            : {name:d.betName,  img:d.betImg,   value:d.betVal};
          pushFeedCard(makeFeedCard(d.win, shown.name, shown.img, d.betVal, d.prizeVal, d.user||'Игрок', timeAgo(d.ts)));
        }
        if(d.type === 'balance_add'){
          S.balance += d.stars;
          saveState(); updateBalance();
          showToast(`+${d.stars} ⭐ зачислено!`, '#ffd700');
        }
        if(d.type === 'purchase' && d.itemId){
          onPurchaseSuccess(d.itemId);
        }
        // Подарок выдан админом — добавляем в инвентарь
        if(d.type === 'gift_received'){
          const userId = tg?.initDataUnsafe?.user?.id;
          if(!d.userId || d.userId === userId){
            invAdd(d.itemId);
            renderInventory();
            const item = ITEMS.find(i=>i.id===d.itemId);
            if(item) showToast(`🎁 Получен подарок: ${item.name}!`, '#ffd700');
          }
        }
      }catch(ex){}
    };
    sseConnection.onerror = () => {
      sseConnection.close();
      startFakeFeed();
    };
  }catch(ex){ startFakeFeed(); }
}

function startFakeFeed(){
  // Fallback — красивые реалистичные карточки
  const pairs=FEED_PAIRS.slice().sort(()=>Math.random()-0.5).slice(0,8);
  pairs.forEach((pair,i)=>{
    setTimeout(()=>{
      const bet=ITEMS[pair.b],prize=ITEMS[pair.p];
      if(!bet||!prize)return;
      const win=Math.random()*100<calcChance(bet.value,prize.value);
      const shown=win?prize:bet;
      const user=FAKE_USERS[Math.floor(Math.random()*FAKE_USERS.length)];
      document.getElementById('feedTrack').appendChild(
        makeFeedCard(win,shown.name,shown.img,bet.value,prize.value,user,timeAgo(Date.now()-(i+1)*18000))
      );
    },i*100);
  });
  (function sched(){
    setTimeout(()=>{
      const pair=FEED_PAIRS[Math.floor(Math.random()*FEED_PAIRS.length)];
      const bet=ITEMS[pair.b],prize=ITEMS[pair.p];
      if(!bet||!prize){sched();return;}
      const win=Math.random()*100<calcChance(bet.value,prize.value);
      const shown=win?prize:bet;
      const user=FAKE_USERS[Math.floor(Math.random()*FAKE_USERS.length)];
      pushFeedCard(makeFeedCard(win,shown.name,shown.img,bet.value,prize.value,user,'только что'));
      sched();
    },3500+Math.random()*4500);
  })();
}

function renderInventoryPage(){
  const grid = document.getElementById('invGridPage');
  const empty = document.getElementById('invEmptyPage');
  if(!grid || !empty) return;
  if(S.inventory.length === 0){
    empty.style.display = 'flex'; grid.style.display = 'none'; return;
  }
  empty.style.display = 'none'; grid.style.display = 'grid';
  grid.innerHTML = S.inventory.map(e=>{
    const item = ITEMS.find(i=>i.id===e.itemId); if(!item) return '';
    const col = RARITY[item.rarity].color;
    const used = S.yoursItem && S.yoursItem.id === item.id;
    return `<div class="inv-card">
      ${e.count>1?`<div class="inv-card-count">×${e.count}</div>`:''}
      <img class="inv-card-img" src="${item.img}" alt="${item.name}">
      <div class="inv-card-name">${item.name}</div>
      <div class="inv-card-value">${fmt(item.value)} ⭐</div>
      <div class="inv-card-rarity" style="background:linear-gradient(90deg,${col}44,${col})"></div>
      <button class="inv-use-btn ${used?'used':''}" onclick="useFromInventoryPage(${item.id})">
        ${used?'✓ Выбрано':'⬆ Поставить'}
      </button>
    </div>`;
  }).join('');
}
function useFromInventoryPage(id){
  const item = ITEMS.find(i=>i.id===id); if(!item) return;
  S.yoursItem = item;
  switchPage('upgrade');
  setTimeout(()=>{ updateUI(); renderInventory(); }, 100);
  showToast(`⬆ ${item.name} выбран`);
  tg?.HapticFeedback?.selectionChanged();
}

// ── TOPUP ──
function showTopup(){ tg?.HapticFeedback?.impactOccurred('light');setAmt(100);document.getElementById('topupModal').classList.add('open'); }
function closeTopup(){ document.getElementById('topupModal').classList.remove('open'); }
function closeTopupOutside(e){ if(e.target===document.getElementById('topupModal'))closeTopup(); }

function setAmt(n){
  n=Math.max(1,parseInt(n)||1);
  document.getElementById('topupInput').value=n;
  document.getElementById('topupDisplay').textContent=n;
  document.getElementById('topupPayLabel').textContent=n+' ⭐';
  document.querySelectorAll('.topup-chip').forEach(b=>b.classList.toggle('active',parseInt(b.textContent)===n));
  tg?.HapticFeedback?.selectionChanged();
}
function onTopupInput(val){
  const n=Math.max(1,parseInt(val)||1);
  document.getElementById('topupDisplay').textContent=isNaN(parseInt(val))?'?':n;
  document.getElementById('topupPayLabel').textContent=(isNaN(parseInt(val))?1:n)+' ⭐';
  document.querySelectorAll('.topup-chip').forEach(b=>b.classList.toggle('active',parseInt(b.textContent)===n));
}
function confirmTopup(){ buyStars(Math.max(1,parseInt(document.getElementById('topupInput').value)||1)); }
function buyStars(amount){
  amount=Math.max(1,parseInt(amount)||1);
  closeTopup();
  tg?.HapticFeedback?.impactOccurred('medium');
  if(tg&&tg.initData){ tg.sendData(JSON.stringify({action:'topup',amount}));showToast(`⭐ Запрос на ${amount} Stars отправлен...`);return; }
  S.balance+=amount;saveState();updateBalance();
  showToast(`✅ +${amount} ⭐ добавлено!`,'#ffd700');
}

// ── INNER TABS ──
function switchInnerTab(name){
  document.querySelectorAll('.inner-tab').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('.inner-panel').forEach(p=>p.classList.remove('active'));
  document.getElementById('itab-'+name).classList.add('active');
  document.getElementById('ipanel-'+name).classList.add('active');
  if(name==='shop')renderShop();
  if(name==='inventory')renderInventory();
  tg?.HapticFeedback?.selectionChanged();
}

// ── PAGE SWITCH ──
function switchPage(name){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
  const pg=document.getElementById('page-'+name),nb=document.getElementById('nav-'+name);
  if(pg)pg.classList.add('active');
  if(nb)nb.classList.add('active');
  if(name==='upgrade')renderShop();
  if(name==='inventory')renderInventoryPage();
}

// ── TOAST ──
function showToast(msg,color){
  let t=document.getElementById('toast');
  if(!t){t=document.createElement('div');t.id='toast';t.style.cssText=`position:fixed;bottom:88px;left:50%;transform:translateX(-50%) translateY(20px);background:rgba(18,18,32,0.97);border:1px solid rgba(255,255,255,0.1);color:#fff;font-size:13px;font-weight:600;padding:10px 20px;border-radius:20px;z-index:9999;transition:all 0.3s;opacity:0;backdrop-filter:blur(10px);white-space:nowrap;max-width:90vw;text-align:center`;document.body.appendChild(t);}
  t.textContent=msg;if(color)t.style.borderColor=color+'66';
  t.style.opacity='1';t.style.transform='translateX(-50%) translateY(0)';
  clearTimeout(t._t);t._t=setTimeout(()=>{t.style.opacity='0';t.style.transform='translateX(-50%) translateY(20px)';},2500);
}

// ── TELEGRAM USER ──
function initTelegramUser(){
  if(!tg||!tg.initDataUnsafe?.user) return;
  const user = tg.initDataUnsafe.user;
  const name = user.first_name || 'User';
  const userId = user.id;

  // Пробуем загрузить аватарку через бот API (localhost)
  fetch(`http://localhost:3001/photo/${userId}`)
    .then(r => r.json())
    .then(d => {
      if(d.url) document.getElementById('userAvatar').src = d.url;
      else setInitialsAvatar(name);
    })
    .catch(() => setInitialsAvatar(name));
}

function setInitialsAvatar(name){
  document.getElementById('userAvatar').src =
    `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=1a3a6e&color=4d9fff&size=80&bold=true&format=svg`;
}

// ── SYNC инвентаря с бота ──
function syncInventoryFromBot(){
  if(!tg || !tg.initDataUnsafe?.user) return;
  const userId = tg.initDataUnsafe.user.id;
  fetch(`http://localhost:3001/inventory/${userId}`)
    .then(r => r.json())
    .then(inv => {
      if(!Array.isArray(inv) || inv.length === 0) return;
      // Мерджим с локальным инвентарём
      inv.forEach(e => {
        const local = S.inventory.find(x => x.itemId === e.itemId);
        if(local){
          // Берём максимум
          local.count = Math.max(local.count, e.count);
        } else {
          S.inventory.push({itemId: e.itemId, count: e.count});
        }
      });
      saveState();
      updateInvBadge();
      renderInventory();
    })
    .catch(()=>{});
}

// ── PROMO ──
function showPromo(){
  const modal = document.getElementById('promoModal');
  const sheet = document.getElementById('promoSheet');
  modal.style.cssText = 'display:flex;position:fixed;inset:0;background:rgba(0,0,0,0.85);backdrop-filter:blur(10px);z-index:2000;align-items:flex-end;justify-content:center';
  requestAnimationFrame(()=>{ if(sheet) sheet.style.transform='translateY(0)'; });
  document.getElementById('promoInput').value = '';
  document.getElementById('promoResult').textContent = '';
  document.getElementById('promoResult').style.color = '';
  setTimeout(()=>document.getElementById('promoInput').focus(), 400);
  tg?.HapticFeedback?.impactOccurred('light');
}
function closePromo(){
  const modal = document.getElementById('promoModal');
  const sheet = document.getElementById('promoSheet');
  if(sheet) sheet.style.transform='translateY(100%)';
  setTimeout(()=>{ modal.style.display='none'; }, 350);
}
function promoParticles(){
  const box = document.getElementById('promoParticles'); if(!box) return; box.innerHTML='';
  ['#ffd700','#ff9500','#00e676','#4d9fff','#ab47bc'].forEach(col=>{
    for(let j=0;j<6;j++){
      const p=document.createElement('div');
      const tx=((Math.random()-.5)*200).toFixed(0);
      const ty=(-(Math.random()*180+60)).toFixed(0);
      const delay=(Math.random()*0.3).toFixed(2);
      p.style.cssText=`position:absolute;width:8px;height:8px;border-radius:50%;background:${col};left:${(20+Math.random()*60).toFixed(0)}%;top:${(30+Math.random()*40).toFixed(0)}%;--tx:${tx}px;--ty:${ty}px;animation:particle 0.9s ease-out ${delay}s forwards`;
      box.appendChild(p);
    }
  });
}
function activatePromo(){
  const code = document.getElementById('promoInput').value.trim().toUpperCase();
  const resEl = document.getElementById('promoResult');
  if(!code){ resEl.style.color='#ff4757'; resEl.textContent='Введи промокод'; tg?.HapticFeedback?.notificationOccurred('error'); return; }
  var uid = null;
  try{ uid = window.Telegram.WebApp.initDataUnsafe.user.id; }catch(e){}
  if(!uid){ resEl.style.color='#ff4757'; resEl.textContent='Открой через бота'; return; }
  resEl.style.color='rgba(255,255,255,0.5)'; resEl.textContent='✨ Проверяем...';
  tg?.HapticFeedback?.impactOccurred('medium');
  var xhr = new XMLHttpRequest();
  xhr.open('POST','https://web-production-dd3cb.up.railway.app/promo/use');
  xhr.setRequestHeader('Content-Type','application/json');
  xhr.onload = function(){
    var d = JSON.parse(xhr.responseText);
    if(d.ok){
      S.balance = d.balance; saveState(); updateBalance();
      resEl.style.color='#00e676'; resEl.textContent='🎉 +'+d.stars+' ⭐ зачислено!';
      promoParticles();
      tg?.HapticFeedback?.notificationOccurred('success');
      showToast('⭐ +'+d.stars+' Stars!','#ffd700');
      setTimeout(closePromo, 2000);
    } else {
      resEl.style.color='#ff4757'; resEl.textContent='❌ '+(d.error||'Ошибка');
      tg?.HapticFeedback?.notificationOccurred('error');
    }
  };
  xhr.onerror = function(){ resEl.style.color='#ff4757'; resEl.textContent='Ошибка сети'; };
  xhr.send(JSON.stringify({code:code, userId:uid}));
}

// ── INIT ──
loadState();
drawWheel(0,0);
updateUI();
updateBalance();
updateInvBadge();
initTelegramUser();
connectSSE();
renderShop();
renderInventory();
switchPage('home');

// Проверяем URL параметры при открытии
const urlParams = new URLSearchParams(window.location.search);

// ?gift=ID — получить подарок от админа
const giftId = parseInt(urlParams.get('gift'));
if(giftId){
  const item = ITEMS.find(i=>i.id===giftId);
  if(item){
    invAdd(giftId);
    renderInventory();
    setTimeout(()=>showToast(`🎁 Получен: ${item.name}!`,'#ffd700'),500);
    history.replaceState(null,'',window.location.pathname);
  }
}

// ?stars=N — получить звёзды на баланс
const starsGift = parseInt(urlParams.get('stars'));
if(starsGift && starsGift > 0){
  S.balance += starsGift;
  saveState();
  updateBalance();
  setTimeout(()=>showToast(`⭐ +${starsGift} Stars зачислено!`,'#ffd700'),500);
  history.replaceState(null,'',window.location.pathname);
}

setTimeout(syncInventoryFromBot, 1000);
