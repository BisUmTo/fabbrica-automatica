 'use strict';
const $=id=>document.getElementById(id),E=window.Lab,B=window.Blockly,A=window.BlockAdapter;
// Keep the storage key to preserve programs created in the original prototype.
const KEY='officina-blocchi-blockly-v2';
let saved={programs:{},completed:[]};
try{const raw=JSON.parse(localStorage.getItem(KEY));if(raw&&raw.programs&&typeof raw.programs==='object'&&Array.isArray(raw.completed))saved=raw;}catch{}
saved.activity=saved.activity||{};saved.profile=saved.profile||{name:'',classe:'5 ITT'};let runOpen=false;
let id='pickplace',state,blocks=[],compiled=null,pc=0,active=-1,running=false,timer=null,finished=false,history=[],messages=[],workspace=null,muting=false;
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const kind=()=>E.mission(id).kind;
const sensors={...Factory.sensors,clear:'strada libera',red:'pezzo rosso',below:'livello < 60 L',holding:'pinza piena'};
const names={farm_collect:'Raccogli risorsa',farm_plant:'Semina grano',farm_deposit:'Scarica al magazzino',farm_craft:'Produci 1 kit',farm_ship:'Consegna ordine',pick:'prendi',drop:'rilascia',forward:'avanza di 1 casella'};
const available={factory:['farm_go','farm_collect','farm_plant','farm_deposit','farm_craft','farm_ship','farm_upgrade','wait'],robot:['move','pick','drop'],river:['cross'],grid:['forward','turn'],sort:['sort'],tank:['valve','wait'],traffic:['light','wait'],hanoi:['disk']};
const allowedSensors=()=>kind()==='factory'?Object.keys(Factory.sensors):kind()==='robot'?['holding']:kind()==='grid'?['clear']:kind()==='sort'?['red']:kind()==='tank'?['below']:[];
function persist(){if(id==='factory'&&state)saved.factory=E.copy(state);if(workspace)saved.programs[id]=B.serialization.workspaces.save(workspace);try{localStorage.setItem(KEY,JSON.stringify(saved));}catch{document.querySelector('.local-tag').textContent='Salvataggio non disponibile';}}
function nav(){
 $('missions').innerHTML=E.missions.map((m,i)=>`<button class="mission-link ${m.id===id?'active':''}" data-mission="${m.id}" ${m.id===id?'aria-current="page"':''}><span class="nav-num">${String(i+1).padStart(2,'0')}</span><span class="nav-icon">${m.icon}</span><span>${m.title}</span>${saved.completed.includes(m.id)?'<span class="done" aria-label="Completata">✓</span>':''}</button>`).join('');
 const count=E.missions.filter(m=>m.kind!=='factory'&&saved.completed.includes(m.id)).length;$('count').textContent=`${count} / 10 + ∞`;$('progress').style.width=`${count*10}%`;
}
function toolbox(){
 const action=type=>({kind:'block',type:'lab_'+type});
 const controls=[action('repeat')];if(kind()==='factory')controls.push(action('forever'));if(allowedSensors().length)controls.push({...action('if'),fields:{sensor:allowedSensors()[0]}});
 return {kind:'categoryToolbox',contents:[{kind:'category',name:'Azioni',colour:'#5075d8',contents:available[kind()].map(action)},{kind:'category',name:'Controllo',colour:'#c68a2d',contents:controls}]};
}
function selectMission(next){
 if(!E.mission(next))next='pickplace';endRun('Interrotto al cambio di sfida');if(state)persist();stop();id=next;state=null;const m=E.mission(id);
 muting=true;B.Events.disable();
 try{workspace.updateToolbox(toolbox());B.serialization.workspaces.load(saved.programs[id]||A.fromFlat([]),workspace);}catch{B.serialization.workspaces.load(A.fromFlat([]),workspace);}finally{B.Events.enable();muting=false;}
 configureSensors();workspace.clearUndo();history=[];reset();nav();$('title').textContent=m.title;$('eyebrow').textContent=`SFIDA ${String(E.missions.indexOf(m)+1).padStart(2,'0')} / 11  ·  ${m.tag}`;$('concept').textContent=m.concept;$('brief').textContent=m.brief;$('goal').textContent=m.goal;$('breadcrumb').textContent=m.tag[0]+m.tag.slice(1).toLowerCase();$('level').textContent=m.kind==='factory'?'∞ Mondo aperto':'●'.repeat(m.level)+'○'.repeat(3-m.level)+'  '+['','Base','Intermedio','Avanzato'][m.level];$('time').textContent=m.kind==='factory'?'Senza limite':'◷  '+m.time;document.body.classList.toggle('factory-mode',id==='factory');$('reset').title=id==='factory'?'Riavvia il programma, conserva la fabbrica':'Ripristina la simulazione';$('reset').setAttribute('aria-label',$('reset').title);
 renderProgram();workspace.scrollCenter();if(location.hash.slice(1)!==id)window.history.replaceState(null,'','#'+id);
}
function configureSensors(){if(!allowedSensors().length)return;B.Events.disable();try{for(const block of workspace.getAllBlocks(false))if(block.type==='lab_if'){const field=block.getField('sensor'),value=field.getValue();field.setOptions(allowedSensors().map(s=>[sensors[s],s]));field.setValue(allowedSensors().includes(value)?value:allowedSensors()[0]);}}finally{B.Events.enable();}}
function checkpoint(){history.push(B.serialization.workspaces.save(workspace));if(history.length>30)history.shift();}
function loadProgram(flat){muting=true;B.Events.disable();try{B.serialization.workspaces.load(A.fromFlat(flat),workspace);}finally{B.Events.enable();muting=false;}configureSensors();workspace.clearUndo();edited();workspace.scrollCenter();}
function edited(){reset();persist();renderProgram();}
function renderProgram(){const n=workspace?workspace.getAllBlocks(false).length-1:0;$('block-count').textContent=`${Math.max(n,0)} blocchi`;updateControls();}
function updateControls(){
 $('run').innerHTML=running?'Ⅱ &nbsp; Pausa':'▶ &nbsp; Esegui';$('step').disabled=running;$('clear').disabled=running||!workspace||workspace.getAllBlocks(false).length<2;$('undo').disabled=running;$('execution-lock').hidden=!running;
}
function highlight(){if(workspace)workspace.highlightBlock(active>=0?blocks[active]?.blockId:null);}
function description(a){
 switch(a.type){case'farm_go':return `Vai a (${a.x}, ${a.y})`;case'farm_upgrade':return 'Installa '+Factory.upgrades[a.upgrade]?.name;case'move':return `Vai a (${a.x}, ${a.y}) · ${a.mode==='jump'?'JUMP':'diretto'}`;case'cross':return `Attraversa ${a.cargo==='solo'?'da solo':'con '+a.cargo}`;case'turn':return 'Gira a '+a.direction;case'sort':return 'Smista in '+a.bin;case'valve':return a.value+' valvola';case'light':return `Semaforo ${a.lane}: ${a.color}`;case'disk':return `Disco da ${a.from} a ${a.to}`;case'wait':return `Attendi ${a.seconds} s`;default:return names[a.type]||a.type;}
}
function feedback(text,type=''){$('feedback').textContent=text;$('feedback').className='feedback '+type;}
function stop(){running=false;clearTimeout(timer);timer=null;updateControls();}
function endRun(result,success=false,error=null){if(!runOpen)return;runOpen=false;const a=saved.activity[id];if(!a)return;a.result=result;a.lastAt=new Date().toISOString();if(error){a.errors++;a.lastError=error;}if(success){a.successes++;a.best=a.best===null?state.moves:Math.min(a.best,state.moves);}persist();}
function reset(){endRun('Esecuzione interrotta o programma modificato');stop();state=id==='factory'?(state||E.copy(saved.factory||E.initial(id))):E.initial(id);compiled=null;pc=0;active=-1;finished=false;messages=[];feedback(id==='factory'?'La fabbrica è salva. Modifica il programma e continua a costruire.':'Pronto. Costruisci la sequenza e osserva ogni azione.');$('world-status').textContent=id==='factory'?'FABBRICA IN PAUSA':'STATO INIZIALE';renderWorld();renderLog();highlight();}
function renderLog(){$('steps-count').textContent=`${state.moves} azioni`;$('log').innerHTML=messages.length?messages.slice(-20).map((m,i)=>`<li>${escape(m)}</li>`).join(''):'<li>Il simulatore è pronto. Tocca un blocco per iniziare.</li>';$('log').scrollTop=$('log').scrollHeight;}
function prepare(){
 if(finished)reset();if(compiled)return true;try{blocks=A.toFlat(workspace);for(const b of blocks){if(b.type==='forever'&&id!=='factory')throw Error('Il ciclo per sempre è disponibile nel livello 11.');if(b.type==='if'&&!allowedSensors().includes(b.sensor))throw Error('Questo sensore non è disponibile nella sfida.');}}catch(err){feedback(err.message,'error');return false;}if(!blocks.length){feedback('Aggiungi almeno un blocco al programma.');return false;}
 try{compiled=E.compile(blocks);if(!compiled.length){feedback('Il programma non contiene azioni. Aggiungi un blocco dentro il ciclo.');compiled=null;return false;}const a=saved.activity[id]||(saved.activity[id]={attempts:0,errors:0,successes:0,actions:0,best:null});a.attempts++;a.lastProgram=E.copy(blocks);a.result='In corso';a.lastAt=new Date().toISOString();runOpen=true;persist();return true;}catch(err){feedback(err.message,'error');return false;}
}
function finish(){finished=true;stop();if(id==='factory'){endRun('Sequenza terminata; fabbrica conservata');feedback('Sequenza terminata. La produzione resta salvata: continua, migliora il programma oppure usa “per sempre”.');$('world-status').textContent='FABBRICA IN PAUSA';persist();return;}const success=E.won(id,state);$('world-status').textContent=success?'OBIETTIVO RAGGIUNTO':'PROGRAMMA TERMINATO';feedback(success?`Sfida completata! ${state.moves} azioni eseguite. Riesci a spiegare perché funziona?`:'Programma terminato. L’obiettivo non è ancora raggiunto: osserva lo stato e modifica la sequenza.',success?'success':'');endRun(success?'Obiettivo raggiunto':'Obiettivo non ancora raggiunto',success);if(success&&!saved.completed.includes(id)){saved.completed.push(id);persist();nav();}}
function tick(){
 if(!prepare())return stop();
 while(compiled[pc]?.type==='jump')pc=compiled[pc].skip;
 if(pc>=compiled.length)return finish();const a=compiled[pc];active=a.source;highlight();
 try{
  if(a.type==='loop'){pc=a.skip;messages.push('∞ Nuovo ciclo');}
  else if(a.type==='if'){const result=E.condition(id,state,a.sensor);pc=result?pc+1:a.skip;messages.push(`? ${sensors[a.sensor]}: ${result?'VERO':'FALSO'}`);}
  else{state=E.act(id,state,a);pc++;if(saved.activity[id])saved.activity[id].actions++;messages.push(`${String(state.moves).padStart(2,'0')}  ${description(a)}`);}
  messages=messages.slice(-100);renderWorld();renderLog();feedback(state.notice||(a.type==='if'||a.type==='loop'?messages.at(-1):description(a)),state.notice?'success':'');persist();$('world-status').textContent=running?'IN ESECUZIONE':'PASSO COMPLETATO';
  while(compiled[pc]?.type==='jump')pc=compiled[pc].skip;
  if(pc>=compiled.length)return finish();
 }catch(err){finished=true;stop();endRun('Errore di esecuzione',false,err.message);feedback(`Blocco ${active+1}: ${err.message}`,'error');messages.push('! '+err.message);renderLog();$('world-status').textContent='CONTROLLA IL PROGRAMMA';return;}
 if(running)timer=setTimeout(tick,Number($('speed').value));
}
const colors={A:'#8cacff',B:'#f3bd58',C:'#ec8e88'};
const svgText=(x,y,t,attrs='')=>`<text x="${x}" y="${y}" ${attrs}>${escape(t)}</text>`;
const cube=(x,y,label,small=false)=>`<g class="svg-cube" transform="translate(${x},${y})"><rect x="-24" y="-24" width="48" height="48" rx="5" fill="${colors[label]||'#8cacff'}"/><path d="M-24 -16 L-16 -24 H23 L24 -18 H-17 V23 L-24 17Z" fill="#ffffff30"/>${svgText(0,6,label,'text-anchor="middle" fill="#172a40" font-weight="750" font-size="19"')}</g>`;
function svg(content){return `<svg viewBox="0 0 480 325" role="img" aria-label="${escape(E.mission(id).title+' — stato della simulazione')}"><defs><pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M 24 0 L 0 0 0 24" fill="none" stroke="#8babc0" stroke-opacity=".09" stroke-width="1"/></pattern></defs><rect width="480" height="325" fill="#172a40"/><rect width="480" height="325" fill="url(#grid)"/>${content}</svg>`;}
function robotScene(){
 const s=state,X=x=>90+(x-1)*145,Y=y=>308-(y-1)*48;
 let c=svgText(20,25,'VISTA FRONTALE','class="svg-label"')+svgText(460,25,'x / y','class="svg-label" text-anchor="end"');
 for(let y=2;y<=5;y++){c+=`<line x1="45" y1="${Y(y)}" x2="448" y2="${Y(y)}" stroke="#7992b21a"/>`+svgText(25,Y(y)+4,y,'class="legend-text"');}
 for(let x=1;x<=3;x++){c+=`<line x1="${X(x)}" y1="50" x2="${X(x)}" y2="278" stroke="#7992b11a" stroke-dasharray="4 5"/>`+svgText(X(x),310,'0'+x,'text-anchor="middle" fill="#a2b5cf" font-size="12" font-family="monospace"');}
 const target=id==='stack'?1:3;
 c+=`<rect x="${X(target)-38}" y="274" width="76" height="10" rx="2" fill="#6ddaba" opacity=".8"/><line x1="48" y1="284" x2="442" y2="284" stroke="#b5c6db" stroke-width="2"/>`;
 s.stacks.forEach((pile,i)=>pile.forEach((v,j)=>c+=cube(X(i+1),Y(j+2),v)));
 const rx=X(s.x),ry=Y(s.y);
 c+=`<line x1="rx" y1="40" x2="rx" y2="${ry-27}" stroke="#94a8c0" stroke-width="7"/>`.replaceAll('rx',String(rx));
 c+=`<g transform="translate(${rx},${ry})"><rect x="-18" y="-33" width="36" height="15" rx="4" fill="#ffae56"/><circle cx="0" cy="-26" r="3" fill="#4c3b2b"/><path d="M-17 -20 L-27 -6 L-27 7 L-18 10 M17 -20 L27 -6 L27 7 L18 10" fill="none" stroke="#f1b469" stroke-width="5" stroke-linejoin="round"/></g>`;
 if(s.held)c+=cube(rx,ry,s.held);
 c+=svgText(rx+30,ry-23,`(${s.x},${s.y})`,'fill="#ffbe74" font-size="10"');
 return svg(c);
}
function riverScene(){
 const s=state;let c=`<path d="M165 0 Q185 80 160 160 T180 325 H318 Q300 230 325 140 T310 0Z" fill="#285277"/><path d="M213 0 Q233 85 208 168 T228 325 M266 0 Q286 80 262 168 T282 325" fill="none" stroke="#679bb933" stroke-width="2" stroke-dasharray="18 16"/>`;
 c+=svgText(80,32,'SPONDA SINISTRA','text-anchor="middle" class="svg-label"')+svgText(399,32,'SPONDA DESTRA','text-anchor="middle" class="svg-label"');
 const labels={capra:'🐐',lupo:'🐺',cavolo:'🥬',contadino:'👨‍🌾'};
 Object.entries(labels).forEach(([key,emoji],i)=>{const x=s.sides[key]?396:80,y=79+i*61;c+=`<rect x="${x-53}" y="${y-25}" width="106" height="48" rx="7" fill="#ffffff09"/>`+svgText(x-29,y+6,emoji,'font-size="27" text-anchor="middle"')+svgText(x-7,y+4,key,'fill="#dbe6f4" font-size="12"');});
 const bx=s.sides.contadino?286:196;
 c+=`<g transform="translate(${bx},244)"><path d="M-32 0 H32 L20 19 H-20Z" fill="#dda767"/><path d="M-26 -5 H26" stroke="#f6cf99" stroke-width="4"/></g>`+svgText(241,145,'FIUME','text-anchor="middle" fill="#7fa3c2" font-size="10" letter-spacing="3"');
 return svg(c);
}
function gridScene(){
 const s=state,cell=46,ox=128,oy=47;let c=svgText(20,25,'AREA DI MOVIMENTO','class="svg-label"');
 for(let x=1;x<=5;x++)for(let y=1;y<=5;y++){const px=ox+(x-1)*cell,py=oy+(5-y)*cell,wall=s.obstacles.some(p=>p[0]===x&&p[1]===y),goal=x===(id==='sensor'?4:5)&&y===(id==='sensor'?1:5);c+=`<rect x="${px}" y="${py}" width="42" height="42" rx="4" fill="${wall?'#52677e':goal?'#388c75':'#ffffff06'}" stroke="${goal?'#78d8b5':'#728fa42b'}"/>`;if(wall)c+=svgText(px+21,py+28,'×','text-anchor="middle" fill="#8b9db2" font-size="24"');if(goal)c+=svgText(px+21,py+28,'◎','text-anchor="middle" fill="#89e2c7" font-size="24"');}
 for(let n=1;n<=5;n++){c+=svgText(ox+(n-1)*cell+21,300,n,'class="legend-text" text-anchor="middle"')+svgText(105,oy+(5-n)*cell+26,n,'class="legend-text"');}
 const x=ox+(s.x-1)*cell+21,y=oy+(5-s.y)*cell+21;
 c+=`<g transform="translate(${x},${y}) rotate(${-s.dir*90})"><rect x="-16" y="-14" width="32" height="28" rx="6" fill="#f5b653"/><path d="M-5 -7 L7 0 L-5 7" stroke="#5e461e" stroke-width="3" fill="none"/></g>`;
 return svg(c);
}
function sortScene(){let c=svgText(20,25,'NASTRO DI SMISTAMENTO','class="svg-label"');c+=`<rect x="25" y="90" width="429" height="65" rx="25" fill="#2d4059" stroke="#526b87"/>`;for(let x=43;x<440;x+=26)c+=`<circle cx="${x}" cy="141" r="6" fill="#192c41"/>`;state.queue.forEach((v,i)=>{c+=`<rect x="${390-i*62}" y="94" width="37" height="36" rx="5" fill="${v==='R'?'#eb8a87':'#83abf5'}"/>`+svgText(408-i*62,118,v,'text-anchor="middle" fill="#172a40" font-weight="700" font-size="17"');});c+=`<rect x="382" y="63" width="52" height="105" rx="6" stroke="#83dfc0" fill="none" stroke-dasharray="5 4"/>`+svgText(409,52,'SENSORE','text-anchor="middle" fill="#83dfc0" font-size="9"');
 ['R','B'].forEach((b,i)=>{const x=130+i*205;c+=`<path d="M${x-53} 221 V282 H${x+53} V221" fill="#ffffff07" stroke="${i?'#83abf5':'#eb8a87'}" stroke-width="3"/>`+svgText(x,210,'CONTENITORE '+b,'text-anchor="middle" class="svg-label"')+svgText(x,265,state.bins[b].length+' / 3','text-anchor="middle" fill="#dfebf8" font-size="23"');});return svg(c);}
function tankScene(){const s=state,h=s.level*2.35;let c=svgText(20,25,'CONTROLLO DI LIVELLO','class="svg-label"');c+=`<path d="M84 54 H192 V79" stroke="#6c839e" stroke-width="13" fill="none"/><rect x="${115}" y="41" width="28" height="26" rx="4" fill="${s.open?'#82dcb8':'#f3b859'}"/><path d="M159 73 V281 Q159 290 170 290 H311 Q321 290 321 280 V73" fill="#ffffff07" stroke="#7f95b0" stroke-width="3"/><rect x="162" y="${287-h}" width="156" height="${h}" rx="2" fill="#477edf" opacity=".85"/><line x1="145" x2="340" y1="146" y2="146" stroke="#83dfbb" stroke-dasharray="6 5"/>`+svgText(353,150,'60 L','fill="#83dfbb" font-size="13"')+svgText(240,252,s.level+' L','text-anchor="middle" fill="#ffffff" font-size="35" font-weight="650"')+svgText(83,88,s.open?'APERTA':'CHIUSA','fill="#b3c3d6" font-size="10"');for(let n=0;n<=80;n+=20)c+=svgText(136,291-n*2.35,n,'text-anchor="end" class="legend-text"');return svg(c);}
function trafficScene(){let c=svgText(20,25,'INTERBLOCCO SEMAFORICO','class="svg-label"');['A','B'].forEach((lane,i)=>{const x=135+i*205;c+=svgText(x,58,'STRADA '+lane,'text-anchor="middle" class="svg-label"')+`<rect x="${x-34}" y="76" width="68" height="167" rx="16" fill="#0c192a" stroke="#354b65"/><line x1="${x}" x2="${x}" y1="243" y2="293" stroke="#465c76" stroke-width="10"/>`;['rosso','giallo','verde'].forEach((v,j)=>c+=`<circle cx="${x}" cy="${106+j*52}" r="18" fill="${state.lights[lane]===v?{rosso:'#f7807b',giallo:'#f4c75b',verde:'#70dbae'}[v]:'#24354b'}"/>`);c+=svgText(x,315,state.served[lane]?'CICLO COMPLETATO':'IN ATTESA','text-anchor="middle" fill="#97afc9" font-size="9"');});return svg(c);}
function hanoiScene(){let c=svgText(20,25,'TRE PIOLI · TRE DISCHI','class="svg-label"');for(let i=0;i<3;i++){const x=85+i*155;c+=`<line x1="${x}" x2="${x}" y1="118" y2="277" stroke="#748ba7" stroke-width="8" stroke-linecap="round"/><rect x="${x-57}" y="273" width="114" height="8" rx="3" fill="#7e93ac"/>`+svgText(x,308,i+1,'class="legend-text" text-anchor="middle"');state.pegs[i].forEach((d,j)=>{c+=`<rect x="${x-(d*14+13)}" y="${242-j*33}" width="${d*28+26}" height="29" rx="6" fill="${['','#8cacff','#f3bd58','#ec8e88'][d]}"/>`+svgText(x,262-j*33,d,'text-anchor="middle" fill="#243750" font-size="14" font-weight="700"');});}return svg(c);}
function renderWorld(){
 const render={factory:factoryScene,robot:robotScene,river:riverScene,grid:gridScene,sort:sortScene,tank:tankScene,traffic:trafficScene,hanoi:hanoiScene};$('scene').innerHTML=render[kind()]();let fields=[];
 if(kind()==='robot')fields=[['POSIZIONE',`(${state.x}, ${state.y})`],['PINZA',state.held||'vuota'],['AZIONI',state.moves]];
 if(kind()==='river')fields=[['BARCA',state.sides.contadino?'destra':'sinistra'],['A DESTRA',Object.values(state.sides).filter(x=>x).length+' / 4'],['TRAVERSATE',state.moves]];
 if(kind()==='grid')fields=[['POSIZIONE',`(${state.x}, ${state.y})`],['DIREZIONE',['est','nord','ovest','sud'][state.dir]],['SENSORE',E.condition(id,state,'clear')?'libero':'ostacolo']];
 if(kind()==='sort')fields=[['SENSORE',state.queue[0]||'vuoto'],['SMISTATI',6-state.queue.length],['RIMASTI',state.queue.length]];
 if(kind()==='tank')fields=[['LIVELLO',state.level+' L'],['VALVOLA',state.open?'aperta':'chiusa'],['TEMPO',state.time+' s']];
 if(kind()==='traffic')fields=[['TEMPO',state.time+' s'],['A',state.lights.A],['B',state.lights.B]];
 if(kind()==='hanoi')fields=[['MOSSE',state.moves],['OBIETTIVO',state.pegs[2].length+' / 3'],['MINIMO','7 mosse']];
 if(kind()==='factory')fields=[['ROBOT',`(${state.x}, ${state.y})`],['ZAINO',`${state.bag.wheat} grano · ${state.bag.ore} minerale / 6`],['TICK',state.ticks]];renderFactoryPanels();
 $('telemetry').innerHTML=fields.map(([k,v])=>`<span>${k} <b>${escape(v)}</b></span>`).join('');
}
function modal(title,body,actions=[]){$('modal-title').textContent=title;$('modal-body').innerHTML=body;$('modal-actions').replaceChildren();for(const a of actions){const b=document.createElement('button');b.className=a.primary?'primary':'secondary';b.textContent=a.label;b.onclick=a.action;$('modal-actions').append(b);}if(!$('modal').open)$('modal').showModal();}
function report(){
 stop();persist();modal('Scarica il tuo report',`<p>Il PDF contiene le sfide affrontate, i tentativi, gli errori, i programmi avviati e la produzione della fabbrica. I dati restano sul dispositivo.</p><label class="report-field">Nome e cognome (facoltativo)<input id="report-name" maxlength="80" value="${escape(saved.profile.name)}" autocomplete="name"></label><label class="report-field">Classe<input id="report-class" maxlength="40" value="${escape(saved.profile.classe)}"></label><p class="report-note">Il report descrive l’attività registrata, senza assegnare un voto.</p>`,[{label:'Scarica PDF',primary:true,action:()=>{saved.profile={name:$('report-name').value.trim().slice(0,80),classe:$('report-class').value.trim().slice(0,40)||'5 ITT'};persist();let draft;try{draft={title:E.mission(id).title,program:A.toFlat(workspace)};}catch(err){draft={title:E.mission(id).title,error:err.message};}try{FactoryReport.create(window.jspdf.jsPDF,{...saved,currentDraft:draft},E.missions).save('fabbrica-automatica-report.pdf');$('modal').close();}catch(err){feedback('Impossibile creare il PDF: '+err.message,'error');}}}]);
}

function factoryScene(){
 const s=state,X=x=>38+(x-1)*64,Y=y=>38+(5-y)*53;let c='';
 for(let x=1;x<=7;x++)for(let y=1;y<=5;y++){
 const p=s.plots.find(p=>p.x===x&&p.y===y),road=y===3||x===1&&y<4,mining=x===1&&y===1;
 c+=`<rect x="${X(x)-28}" y="${Y(y)-23}" width="59" height="48" rx="5" fill="${p?'#67523a':mining?'#53677a':road?'#34536a':'#294b44'}" stroke="#ffffff0d"/>`;
 if(p){for(let k=0;k<3;k++)c+=`<path d="M${X(x)-15+k*15} ${Y(y)+15} V${Y(y)-13}" stroke="#b1926744" stroke-width="2"/>`;if(p.age!==null)c+=svgText(X(x),Y(y)+7,p.age>=4?'🌾':p.age>=2?'🌿':'🌱','font-size="24" text-anchor="middle"');}
 if(mining)c+=svgText(X(x),Y(y)+8,'⛏','font-size="25" fill="#c8d7e9" text-anchor="middle"');
 }
 // Material flow from warehouse through the assembly station to dispatch.
 c+=`<path d="M166 145 H422" stroke="#172b3c" stroke-width="19"/><path d="M166 145 H422" stroke="${s.upgrades.assembler?'#79ddbe':'#7890a0'}" stroke-width="3" stroke-dasharray="5 9" class="${running&&s.upgrades.assembler?'belt-active':''}"/>`;
 for(const [x,label,icon,color] of [[3,'MAGAZZINO','▦','#9daff0'],[5,'ASSEMBLATORE','⚙','#f4bd61'],[7,'BANCHINA','▣','#77d6b1']]){c+=`<rect x="${X(x)-26}" y="${Y(3)-25}" width="53" height="49" rx="7" fill="#1c3349" stroke="${color}" stroke-width="2"/>`+svgText(X(x),Y(3)+8,icon,`text-anchor="middle" fill="${color}" font-size="30"`)+svgText(X(x),Y(3)+38,label,'text-anchor="middle" fill="#c1d1df" font-size="8"');}
 c+=svgText(X(1),Y(1)+38,'MINIERA','text-anchor="middle" fill="#c1d1df" font-size="8"');
 if(s.upgrades.harvester)c+=svgText(132,39,'MIETITRICE ✓','fill="#abe8b2" font-size="8"');
 if(s.upgrades.drill)c+=svgText(83,254,'TRIVELLA ✓','fill="#abe8b2" font-size="8"');
 const rx=X(s.x),ry=Y(s.y);c+=`<g transform="translate(${rx},${ry})"><circle r="20" fill="#f4c76722" stroke="#f3c66c" stroke-width="2"/><rect x="-12" y="-11" width="24" height="23" rx="5" fill="#f7c872"/><rect x="-9" y="-7" width="18" height="8" rx="3" fill="#254152"/><circle cx="-5" cy="-3" r="1.5" fill="#a7eedc"/><circle cx="5" cy="-3" r="1.5" fill="#a7eedc"/></g>`;
 for(let x=1;x<=7;x++)c+=svgText(X(x),305,x,'class="legend-text" text-anchor="middle"');for(let y=1;y<=5;y++)c+=svgText(475,Y(y)+4,y,'class="legend-text" text-anchor="end"');
 return svg(c);
}
function renderFactoryPanels(){
 const open=id==='factory';$('factory-contract').hidden=!open;$('factory-upgrades').hidden=!open;if(!open)return;const s=state,o=Factory.order(s),pct=Math.min(100,s.stock.kits/o.quantity*100);
 $('factory-contract').innerHTML=`<div class="contract-head"><span class="factory-label">COMMESSA ${String(o.number).padStart(3,'0')}</span><strong>${o.quantity} kit per il prossimo ordine</strong><span>2 grano + 1 minerale = 1 kit</span></div><div class="order-progress"><b>${s.stock.kits} / ${o.quantity}</b><div><i style="width:${pct}%"></i></div><small>Premio: ${o.reward} crediti</small></div><div class="factory-wallet"><strong>${s.coins}<small>crediti</small></strong><span>${s.orders} ordini · ${s.shipped} kit spediti</span></div>`;
 $('factory-upgrades').innerHTML=`<div class="factory-stock"><span>IL TUO MAGAZZINO</span><strong>🌾 ${s.stock.wheat} <small>grano</small></strong><strong>⛏ ${s.stock.ore} <small>minerale</small></strong><strong>▣ ${s.stock.kits} <small>kit</small></strong><span class="factory-stage">Impianto · livello ${1+Math.floor(s.orders/3)}</span></div><div class="upgrade-grid">${Object.entries(Factory.upgrades).map(([key,u],i)=>`<article class="upgrade-card ${s.upgrades[key]?'installed':''}"><span class="upgrade-icon">${['🌾','⛏','⚙'][i]}</span><div><h3>${u.name}</h3><p>${u.description}</p></div><button data-upgrade="${key}" ${s.upgrades[key]||s.coins<u.price||running?'disabled':''}>${s.upgrades[key]?'Installata ✓':u.price+' crediti · Installa'}</button></article>`).join('')}</div><p class="factory-tip">Il tempo scorre con le azioni del robot. “Per sempre” tiene attiva la produzione; “Pausa” ferma il mondo. Le macchine comprate rimangono installate.</p>`;
 $('factory-upgrades').querySelectorAll('[data-upgrade]').forEach(b=>b.onclick=()=>{if(running)return;try{state=Factory.act(state,{type:'farm_upgrade',upgrade:b.dataset.upgrade});if(saved.activity[id])saved.activity[id].actions++;persist();renderWorld();feedback(state.notice,'success');}catch(err){feedback(err.message,'error');}});
}

A.define(B);
const theme=B.Theme.defineTheme('officina',{base:B.Themes.Classic,componentStyles:{workspaceBackgroundColour:'#fbfcff',toolboxBackgroundColour:'#f1f4f9',toolboxForegroundColour:'#394b64',flyoutBackgroundColour:'#e8eef9',flyoutForegroundColour:'#344660',flyoutOpacity:0.96,scrollbarColour:'#bbc8dc',insertionMarkerColour:'#f3bc55',insertionMarkerOpacity:0.5,cursorColour:'#345fe9'},fontStyle:{family:'-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif',weight:'500',size:12}});
workspace=B.inject('blockly',{toolbox:toolbox(),theme,renderer:'zelos',media:'vendor/blockly/media/',sounds:false,trashcan:true,grid:{spacing:20,length:2,colour:'#dce3ee',snap:true},zoom:{controls:true,wheel:true,startScale:.85,minScale:.35,maxScale:1.5,scaleSpeed:1.12},move:{scrollbars:true,drag:true,wheel:true},maxBlocks:200});
workspace.addChangeListener(event=>{
 if(muting||event.isUiEvent||event.type===B.Events.FINISHED_LOADING)return;
 if(event.type===B.Events.BLOCK_CREATE&&allowedSensors().length){for(const block of workspace.getAllBlocks(false)){if(block.type==='lab_if'){const field=block.getField('sensor');if(field.getOptions(false).length>1){const value=field.getValue();B.Events.disable();try{field.setOptions(allowedSensors().map(s=>[sensors[s],s]));field.setValue(allowedSensors().includes(value)?value:allowedSensors()[0]);}finally{B.Events.enable();}}}}}
 if(running)stop();reset();persist();renderProgram();
});
new ResizeObserver(()=>B.svgResize(workspace)).observe($('blockly'));
$('missions').addEventListener('click',e=>{const b=e.target.closest('[data-mission]');if(b)selectMission(b.dataset.mission);});
$('run').onclick=()=>{if(running)return stop();if(!prepare())return;running=true;updateControls();tick();};
$('step').onclick=()=>{if(!running)tick();};$('reset').onclick=reset;
$('fit').onclick=()=>workspace.zoomToFit();
$('undo').onclick=()=>{if(running)return;if(workspace.getUndoStack().length){workspace.undo(false);return;}if(history.length){muting=true;B.Events.disable();try{B.serialization.workspaces.load(history.pop(),workspace);}finally{B.Events.enable();muting=false;}workspace.clearUndo();edited();}};
$('clear').onclick=()=>{if(running)return;checkpoint();loadProgram([]);};
$('rules').onclick=()=>modal('Le regole · '+E.mission(id).title,`<p>${escape(E.mission(id).rule)}</p><p><strong>Obiettivo:</strong> ${escape(E.mission(id).goal)}</p>`);
$('hint').onclick=()=>modal('Un indizio, un passo avanti',`<p>${escape(E.mission(id).hint)}</p><p>Prova a scrivere i primi due passi e immagina lo stato che producono.</p>`);
$('report').onclick=report;
$('help').onclick=()=>modal('Programmare con Blockly',`<ol><li><strong>Apri Azioni o Controllo</strong> nella libreria dell’editor.</li><li><strong>Trascina i blocchi</strong> sul foglio e incastrali sotto “quando premi Esegui”. I blocchi staccati segnalano un errore.</li><li><strong>Modifica i parametri</strong> cliccando sui campi del blocco.</li><li><strong>Inserisci le azioni dentro i cicli e le condizioni.</strong> Puoi lasciare vuoto il ramo “altrimenti”.</li><li><strong>Un passo</strong> esegue un’azione o controlla una condizione. “Esegui” avanza automaticamente; “Pausa” lo sospende.</li><li><strong>↺ ripristina il mondo</strong> conservando il programma. Nelle sfide 1–10 una modifica riporta la simulazione all’inizio. Nel livello 11 il mondo rimane salvato: si riavvia soltanto il programma.</li></ol><p>Usa il cestino per eliminare i blocchi, i pulsanti +/− per lo zoom e ⊙ per centrare il programma. Le sfide si salvano in questo browser.</p>`);
$('close-modal').onclick=()=>$('modal').close();$('modal').addEventListener('click',e=>{if(e.target===$('modal')){const r=$('modal').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('modal').close();}});
window.addEventListener('hashchange',()=>selectMission(location.hash.slice(1)));
selectMission(location.hash.slice(1)||'pickplace');

window.addEventListener('pagehide',()=>{endRun('Sessione chiusa');persist();});
