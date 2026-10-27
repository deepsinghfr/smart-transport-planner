/* ---------- Data (the "transport database") ---------- */
const MODES={train:{c:'#1d4ed8',i:'🚆',n:'Train'},bus:{c:'#e08a00',i:'🚌',n:'Bus'},auto:{c:'#0f9d58',i:'🛺',n:'Auto'},walk:{c:'#6b7a86',i:'🚶',n:'Walk'}};
const TYPES={station:['🚆','Railway stations'],bus:['🚌','Bus stops'],hospital:['🏥','Hospitals'],college:['🎓','Colleges'],landmark:['📍','Landmarks']};
const BASE=[
{id:'virar',n:'Virar Station',t:'station',la:19.4559,ln:72.8118},
{id:'nsp',n:'Nalasopara Station',t:'station',la:19.4172,ln:72.8196},
{id:'vasai',n:'Vasai Road Station',t:'station',la:19.3827,ln:72.8318},
{id:'naigaon',n:'Naigaon Station',t:'station',la:19.3510,ln:72.8460},
{id:'vbd',n:'Virar Bus Depot',t:'bus',la:19.4570,ln:72.8070},
{id:'nsw',n:'Nalasopara West Bus Stop',t:'bus',la:19.4170,ln:72.8000},
{id:'vsbd',n:'Vasai Bus Depot',t:'bus',la:19.3800,ln:72.8200},
{id:'evs',n:'Evershine City Bus Stop',t:'bus',la:19.4063,ln:72.8478},
{id:'vh',n:'Virar Municipal Hospital',t:'hospital',la:19.4600,ln:72.8000},
{id:'vsh',n:'Vasai Sub-District Hospital',t:'hospital',la:19.3830,ln:72.8250},
{id:'vart',n:'Vartak College',t:'college',la:19.3860,ln:72.8040},
{id:'viva',n:'Viva College',t:'college',la:19.4510,ln:72.7980},
{id:'fort',n:'Vasai Fort',t:'landmark',la:19.3347,ln:72.7970},
{id:'arn',n:'Arnala Beach',t:'landmark',la:19.4650,ln:72.7250},
{id:'jiv',n:'Jivdani Temple',t:'landmark',la:19.4916,ln:72.8255},
{id:'gc',n:'Global City, Virar',t:'landmark',la:19.4390,ln:72.7960}];
const TRAIN=['virar','nsp','vasai','naigaon'], TT=[7,6,5];

/* ---------- Storage helpers (localStorage = our database) ---------- */
const $=s=>document.querySelector(s);
const load=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch(e){return d}};
const save=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};
let cfg=load('vv_cfg',{autoBase:23,autoKm:15,busKm:1.3}), custom=load('vv_custom',[]), user=load('vv_user',null);
const places=()=>[...BASE,...custom];
const byId=id=>places().find(p=>p.id===id);

/* ---------- Routing engine ---------- */
const hav=(a,b)=>{const r=x=>x*Math.PI/180,R=6371,dl=r(b.la-a.la),dn=r(b.ln-a.ln);
  const h=Math.sin(dl/2)**2+Math.cos(r(a.la))*Math.cos(r(b.la))*Math.sin(dn/2)**2;return 2*R*Math.asin(Math.sqrt(h))};
function edges(a,b,al){const d=hav(a,b),o=[];
  if(al.walk&&d<=1.5){const k=d*1.3;o.push({m:'walk',t:k/5*60,c:0,km:k})}
  if(al.auto&&d>=.3&&d<=12){const k=d*1.3;o.push({m:'auto',t:k/22*60+3,c:Math.round(Math.max(cfg.autoBase,cfg.autoBase+(k-1.5)*cfg.autoKm)),km:k})}
  if(al.bus&&d>=1.2&&d<=16){const k=d*1.4;o.push({m:'bus',t:k/18*60+8,c:Math.round(8+k*cfg.busKm),km:k})}
  if(al.train){const i=TRAIN.indexOf(a.id),j=TRAIN.indexOf(b.id);
    if(i>=0&&j>=0&&i!==j){const lo=Math.min(i,j),hi=Math.max(i,j);let t=5,km=0;
      for(let x=lo;x<hi;x++){t+=TT[x];km+=hav(byId(TRAIN[x]),byId(TRAIN[x+1]))}
      let via=TRAIN.slice(lo,hi+1);if(i>j)via.reverse();
      o.push({m:'train',t,c:hi-lo===1?5:10,km,via})}}
  return o}
function solve(S,D,al,wf){
  const P=places(),s=P.findIndex(p=>p.id===S),g=P.findIndex(p=>p.id===D);
  const best=new Map([[s+'-',{n:s,m:'-',w:0,t:0,c:0,p:null}]]),closed=new Set();
  for(;;){let u=null;for(const[k,v]of best)if(!closed.has(k)&&(!u||v.w<u.w))u=v;
    if(!u)return null;closed.add(u.n+u.m);
    if(u.n===g)return legs(u,P);
    for(let j=0;j<P.length;j++){if(j===u.n)continue;
      for(const e of edges(P[u.n],P[j],al)){
        const pen=u.m!=='-'&&u.m!==e.m?3:0,k=j+e.m;if(closed.has(k))continue;
        const w=u.w+wf(e.t+pen,e.c),o=best.get(k);
        if(!o||w<o.w)best.set(k,{n:j,m:e.m,w,t:u.t+e.t+pen,c:u.c+e.c,p:u,e,f:u.n})}}}}
function legs(u,P){const total={t:u.t,c:u.c},seq=[];
  for(let x=u;x.p;x=x.p)seq.unshift({m:x.m,path:x.e.via||[P[x.f].id,P[x.n].id],t:x.e.t+(x.p.m!=='-'&&x.p.m!==x.m?3:0),c:x.e.c,km:x.e.km});
  const L=[];for(const q of seq){const l=L[L.length-1];
    if(l&&l.m===q.m){l.path.push(...q.path.slice(1));l.t+=q.t;l.c+=q.c;l.km+=q.km}else L.push({...q,path:[...q.path]})}
  return{...total,legs:L,km:L.reduce((a,l)=>a+l.km,0),walk:L.filter(l=>l.m==='walk').reduce((a,l)=>a+l.t,0)}}
const CRIT=[['Fastest',(t,c)=>t],['Cheapest',(t,c)=>c*3+t*.15],['Balanced',(t,c)=>t+c*.8]];
function plan(S,D,al){const out=new Map();
  for(const[name,wf]of CRIT){const r=solve(S,D,al,wf);if(!r)continue;
    const sig=r.legs.map(l=>l.m+l.path.join('>')).join('|');
    if(out.has(sig))out.get(sig).tags.push(name);else out.set(sig,{...r,tags:[name]})}
  return[...out.values()]}

/* ---------- Map ---------- */
let map=null,baseG,routeG;
try{
  map=L.map('map').setView([19.41,72.83],11);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap contributors'}).addTo(map);
  baseG=L.layerGroup().addTo(map);routeG=L.layerGroup().addTo(map);
}catch(e){console.warn('Map library failed to load',e);$('#map').innerHTML='<p style="padding:20px;color:#5a7480">The map could not load. Check your internet connection and refresh. Route results still work.</p>'}
const icon=(e,big)=>!map?null:L.divIcon({className:'pin'+(big?' big':''),html:e,iconSize:null});
function drawBase(){if(!map)return;baseG.clearLayers();
  L.polyline(TRAIN.map(id=>{const p=byId(id);return[p.la,p.ln]}),{color:MODES.train.c,weight:3,opacity:.35,dashArray:'2 7'}).addTo(baseG);
  places().forEach(p=>L.marker([p.la,p.ln],{icon:icon(TYPES[p.t][0]),title:p.n}).addTo(baseG)
    .bindPopup(`<b>${p.n}</b><br>${TYPES[p.t][1].replace(/s$/,'')}<br><button onclick="setPt('src','${p.id}')">From here</button><button onclick="setPt('dst','${p.id}')">To here</button>`))}
window.setPt=(w,id)=>{$('#'+w).value=id;if(map)map.closePopup()};
function draw(r,S,D){if(!map)return;routeG.clearLayers();const bs=[];
  r.legs.forEach(l=>{const pts=l.path.map(id=>{const p=byId(id);return[p.la,p.ln]});bs.push(...pts);
    L.polyline(pts,{color:MODES[l.m].c,weight:6,opacity:.9,dashArray:l.m==='walk'?'1 10':null,lineCap:'round'}).addTo(routeG)});
  const a=byId(S),b=byId(D);
  L.marker([a.la,a.ln],{icon:icon('🟢',1),zIndexOffset:900}).addTo(routeG);
  L.marker([b.la,b.ln],{icon:icon('🏁',1),zIndexOffset:900}).addTo(routeG);
  map.fitBounds(bs,{padding:[50,50]})}

/* ---------- UI ---------- */
const fmt=m=>{m=Math.round(m);return m>=60?`${Math.floor(m/60)}h ${m%60}m`:`${m} min`};
function fillSelects(){const keep=[$('#src').value,$('#dst').value];
  const html=Object.entries(TYPES).map(([t,[i,n]])=>`<optgroup label="${i} ${n}">${places().filter(p=>p.t===t).map(p=>`<option value="${p.id}">${esc(p.n)}</option>`).join('')}</optgroup>`).join('');
  $('#src').innerHTML=$('#dst').innerHTML=html;
  $('#src').value=byId(keep[0])?keep[0]:'virar';$('#dst').value=byId(keep[1])?keep[1]:'fort'}
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function allowed(){const o={};document.querySelectorAll('#modes input').forEach(i=>o[i.value]=i.checked);return o}
function verb(l,P){const a=byId(l.path[0]).n,b=byId(l.path[l.path.length-1]).n;
  return({train:`Take the train from <b>${esc(a)}</b> to <b>${esc(b)}</b>`,bus:`Take a bus from <b>${esc(a)}</b> to <b>${esc(b)}</b>`,
    auto:`Take an auto from <b>${esc(a)}</b> to <b>${esc(b)}</b>`,walk:`Walk from <b>${esc(a)}</b> to <b>${esc(b)}</b>`})[l.m]}
let current=[];
function run(){const S=$('#src').value,D=$('#dst').value,al=allowed(),R=$('#results');
  if(S===D){R.innerHTML='<div class="empty">Source and destination are the same. Pick a different destination.</div>';return}
  if(!Object.values(al).some(Boolean)){R.innerHTML='<div class="empty">Select at least one way to travel.</div>';return}
  current=plan(S,D,al);
  if(!current.length){R.innerHTML='<div class="empty">No route found with these travel modes. Turn on more modes, such as autos, and try again.</div>';return}
  R.innerHTML=current.map((r,i)=>`<article class="card" tabindex="0" data-i="${i}">
    <div class="top"><div><div>${r.tags.map(t=>`<span class="tag">${t}</span>`).join('')}</div><div class="big">${fmt(r.t)} <small>${r.km.toFixed(1)} km</small></div></div>
    <div class="fare">₹${r.c}<div style="font-size:.75rem;font-weight:500;color:var(--muted)">estimated fare</div></div></div>
    <div class="seq">${r.legs.map(l=>`<span class="mp" style="background:${MODES[l.m].c}">${MODES[l.m].i} ${MODES[l.m].n} ${fmt(l.t)}</span>`).join('›')}</div>
    <ol class="steps">${r.legs.map(l=>`<li style="--c:${MODES[l.m].c}">${verb(l)}<small>${fmt(l.t)} · ₹${l.c} · ${l.km.toFixed(1)} km${l.m==='train'?` · ${l.path.length-1} stop${l.path.length>2?'s':''}`:''}</small></li>`).join('')}</ol>
    <small style="color:var(--muted)">Walking: ${fmt(r.walk)}</small></article>`).join('');
  select(0);
  if(user){const h=load('vh_'+user.name,[]).filter(x=>x[0]!==S||x[1]!==D);h.unshift([S,D]);save('vh_'+user.name,h.slice(0,4));quick()}}
function select(i){document.querySelectorAll('.card').forEach(c=>c.classList.toggle('on',+c.dataset.i===i));draw(current[i],$('#src').value,$('#dst').value)}
$('#results').addEventListener('click',e=>{const c=e.target.closest('.card');if(c)select(+c.dataset.i)});
$('#results').addEventListener('keydown',e=>{if(e.key==='Enter'){const c=e.target.closest('.card');if(c)select(+c.dataset.i)}});
$('#go').onclick=run;
$('#swap').onclick=()=>{const a=$('#src').value;$('#src').value=$('#dst').value;$('#dst').value=a;run()};
$('#modes').insertAdjacentHTML('beforeend',Object.entries(MODES).map(([k,m])=>`<label class="chip"><input type="checkbox" value="${k}" checked>${m.i} ${m.n}</label>`).join(''));
function quick(){const pop=[['virar','fort'],['nsp','vart'],['vasai','arn'],['virar','vsh']],rec=user?load('vh_'+user.name,[]):[];
  const b=(p,l)=>byId(p[0])&&byId(p[1])?`<button data-s="${p[0]}" data-d="${p[1]}">${esc(byId(p[0]).n.replace(' Station',''))} to ${esc(byId(p[1]).n.replace(' Station',''))}</button>`:'';
  $('#quick').innerHTML=(rec.length?'<span>Recent:</span>'+rec.map(b).join(''):'')+'<span>Popular:</span>'+pop.map(b).join('')}
$('#quick').onclick=e=>{const b=e.target.closest('button');if(!b)return;$('#src').value=b.dataset.s;$('#dst').value=b.dataset.d;run()};

/* ---------- Optional sign-in (stored on this device only; demo-grade, not secure) ---------- */
function nav(){const n=$('#nav');
  n.innerHTML=user?`<span>Hi, ${esc(user.name)}</span>${user.admin?'<button class="btn" id="bAdm">Admin</button>':''}<button class="btn ghost" id="bOut">Sign out</button>`:'<button class="btn" id="bIn">Sign in</button>';
  const g=id=>document.getElementById(id);
  if(g('bIn'))g('bIn').onclick=()=>{$('#authM').textContent='';authD.showModal()};
  if(g('bOut'))g('bOut').onclick=()=>{user=null;save('vv_user',null);nav();quick()};
  if(g('bAdm'))g('bAdm').onclick=openAdm}
const enc=s=>btoa(unescape(encodeURIComponent(s)));
function auth(reg){const n=$('#uN').value.trim().toLowerCase(),p=$('#uP').value,M=$('#authM');
  if(n.length<3||p.length<4){M.textContent='Username needs 3+ characters and password 4+.';return}
  const U=load('vv_users',{});
  if(reg){if(U[n]||n==='admin'){M.textContent='That username is taken.';return}U[n]=enc(p);save('vv_users',U)}
  else if(!(n==='admin'&&p==='admin123')&&U[n]!==enc(p)){M.textContent='Wrong username or password.';return}
  user={name:n,admin:n==='admin'};save('vv_user',user);authD.close();nav();quick()}
$('#login').onclick=()=>auth(false);$('#reg').onclick=()=>auth(true);

/* ---------- Admin panel ---------- */
function openAdm(){$('#aB').value=cfg.autoBase;$('#aK').value=cfg.autoKm;$('#bK').value=cfg.busKm;$('#admM').textContent='';listC();admD.showModal()}
function listC(){$('#cList').innerHTML=custom.length?custom.map(p=>`<div class="cl"><span>${TYPES[p.t][0]} ${esc(p.n)}</span><button data-id="${p.id}">Remove</button></div>`).join(''):'<small style="color:var(--muted)">None yet.</small>'}
function refresh(){fillSelects();drawBase();listC()}
$('#saveCfg').onclick=()=>{cfg={autoBase:+$('#aB').value||0,autoKm:+$('#aK').value||0,busKm:+$('#bK').value||0};save('vv_cfg',cfg);$('#admM').style.color='#0f9d58';$('#admM').textContent='Fares saved.'};
$('#addP').onclick=()=>{const n=$('#pN').value.trim(),la=parseFloat($('#pLa').value),ln=parseFloat($('#pLn').value),M=$('#admM');M.style.color='#c0392b';
  if(!n||isNaN(la)||isNaN(ln)){M.textContent='Enter a name, latitude and longitude.';return}
  if(la<19.2||la>19.6||ln<72.6||ln>73){M.textContent='Coordinates must be inside the Vasai–Virar area.';return}
  custom.push({id:'c'+Date.now(),n,t:$('#pT').value,la,ln});save('vv_custom',custom);refresh();$('#pN').value=$('#pLa').value=$('#pLn').value='';M.style.color='#0f9d58';M.textContent='Place added.'};
$('#cList').onclick=e=>{const b=e.target.closest('button');if(!b)return;custom=custom.filter(p=>p.id!==b.dataset.id);save('vv_custom',custom);refresh()};
$('#reset').onclick=()=>{if(confirm('Remove added places and restore default fares?')){custom=[];cfg={autoBase:23,autoKm:15,busKm:1.3};save('vv_custom',custom);save('vv_cfg',cfg);refresh();openAdm()}};

/* ---------- Start ---------- */
fillSelects();nav();quick();drawBase();
                                 
