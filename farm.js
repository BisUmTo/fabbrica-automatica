(function(root){
'use strict';
const upgrades={harvester:{name:'Mietitrice',job:'Raccoglie e risemina i campi.',price:30,intervals:[12,8,4],description:'Raccoglie e risemina i campi ogni 12 tick.'},drill:{name:'Trivella',job:'Porta minerale al magazzino.',price:50,intervals:[6,3,1],description:'Porta 1 minerale al magazzino ogni 6 tick.'},assembler:{name:'Linea automatica',job:'Produce kit quando ci sono materiali.',price:80,intervals:[4,2,1],description:'Il nastro alimenta l’assemblatore: 1 kit ogni 4 tick, se ci sono materiali.'}};
const sensors={cropReady:'il raccolto qui è maturo',bagFull:'lo zaino è pieno',bagNotEmpty:'ho risorse nello zaino',canCraft:'ci sono materiali per un kit',canShip:'ci sono kit per l’ordine',canHarvestUpgrade:'ho 30 crediti e manca la mietitrice',canDrillUpgrade:'ho 50 crediti e manca la trivella',canAssemblyUpgrade:'ho 80 crediti e manca la linea',canHarvestBoost:'posso potenziare la mietitrice',canDrillBoost:'posso potenziare la trivella',canAssemblyBoost:'posso potenziare la linea'};
const copy=s=>JSON.parse(JSON.stringify(s));const fail=m=>{throw Error(m);};
function initial(){return {version:1,x:1,y:4,ticks:0,moves:0,bag:{wheat:0,ore:0},stock:{wheat:0,ore:0,kits:0},plots:[{x:1,y:4,age:4},{x:2,y:4,age:4},{x:1,y:5,age:4},{x:2,y:5,age:4}],coins:0,orders:0,shipped:0,produced:0,harvested:0,mined:0,upgrades:{harvester:false,drill:false,assembler:false},notice:'La prima commessa: produci e consegna un kit.'};}
function order(s){const quantity=1+Math.floor((s.orders+1)/2);return {number:s.orders+1,quantity,reward:20*quantity};}
function plot(s){return s.plots.find(p=>p.x===s.x&&p.y===s.y);}
function machine(s,key){const u=upgrades[key];if(!u)fail('Macchina non riconosciuta.');const level=Number(s.upgrades[key])||0,max=level>=u.intervals.length;return {...u,level,max,interval:level?u.intervals[level-1]:null,nextInterval:max?null:u.intervals[level],price:max?null:u.price*2**level};}
function canBoost(s,key){const m=machine(s,key);return m.level>0&&!m.max&&s.coins>=m.price;}
function condition(s,key){const p=plot(s);switch(key){case'cropReady':return !!p&&p.age>=4;case'bagFull':return s.bag.wheat+s.bag.ore>=6;case'bagNotEmpty':return s.bag.wheat+s.bag.ore>0;case'canCraft':return s.stock.wheat>=2&&s.stock.ore>=1;case'canShip':return s.stock.kits>=order(s).quantity;case'canHarvestUpgrade':return !s.upgrades.harvester&&s.coins>=30;case'canDrillUpgrade':return !s.upgrades.drill&&s.coins>=50;case'canAssemblyUpgrade':return !s.upgrades.assembler&&s.coins>=80;case'canHarvestBoost':return canBoost(s,'harvester');case'canDrillBoost':return canBoost(s,'drill');case'canAssemblyBoost':return canBoost(s,'assembler');default:return false;}}
function craft(s){s.stock.wheat-=2;s.stock.ore--;s.stock.kits++;s.produced++;}
function advance(s,n){
 const periods=Object.fromEntries(Object.keys(upgrades).map(k=>[k,machine(s,k).interval]));
 function tick(){s.ticks++;for(const p of s.plots)if(p.age!==null)p.age=Math.min(4,p.age+1);if(periods.harvester&&s.ticks%periods.harvester===0)for(const p of s.plots){if(p.age>=4){s.stock.wheat++;s.harvested++;p.age=0;}else if(p.age===null)p.age=0;}if(periods.drill&&s.ticks%periods.drill===0){s.stock.ore++;s.mined++;}if(periods.assembler&&s.ticks%periods.assembler===0&&condition(s,'canCraft'))craft(s);}
 // All machine periods divide 24. Above one period's maximum consumption,
 // surplus stock cannot change the production schedule, so equal cycles can be batched.
 const period=24,caps={wheat:48,ore:24};
 const signature=()=>JSON.stringify([s.plots.map(p=>p.age),Math.min(caps.wheat,s.stock.wheat),Math.min(caps.ore,s.stock.ore)]);
 const totals=()=>[s.stock.wheat,s.stock.ore,s.stock.kits,s.harvested,s.mined,s.produced];
 while(n>=period){const beforeKey=signature(),before=totals();for(let i=0;i<period;i++)tick();n-=period;if(beforeKey!==signature())continue;
  const delta=totals().map((v,i)=>v-before[i]);let cycles=Math.floor(n/period);
  for(const [i,key] of ['wheat','ore'].entries())if(delta[i]<0)cycles=Math.min(cycles,Math.max(0,Math.floor((s.stock[key]-caps[key])/-delta[i])));
  if(cycles){s.stock.wheat+=delta[0]*cycles;s.stock.ore+=delta[1]*cycles;s.stock.kits+=delta[2]*cycles;s.harvested+=delta[3]*cycles;s.mined+=delta[4]*cycles;s.produced+=delta[5]*cycles;s.ticks+=period*cycles;n-=period*cycles;}
 }
 for(let i=0;i<n;i++)tick();
}
function at(s,x,y,name){if(s.x!==x||s.y!==y)fail(`Raggiungi ${name} (${x}, ${y}).`);}
function act(state,a){const s=copy(state);let ticks=1;s.notice='';
 switch(a.type){
 case'farm_go':{const x=Number(a.x),y=Number(a.y);if(!Number.isInteger(x)||x<1||x>7||!Number.isInteger(y)||y<1||y>5)fail('Coordinate fuori dalla mappa: x 1–7, y 1–5.');ticks=Math.max(1,Math.abs(s.x-x)+Math.abs(s.y-y));s.x=x;s.y=y;break;}
 case'farm_collect':{if(condition(s,'bagFull'))fail('Zaino pieno: scarica al magazzino (3, 3).');const p=plot(s);if(p){if(p.age===null)fail('Campo vuoto: semina prima di raccogliere.');if(p.age<4)fail('Il grano non è ancora maturo: attendi o controlla il sensore.');s.bag.wheat++;s.harvested++;p.age=null;}else if(s.x===1&&s.y===1){s.bag.ore++;s.mined++;}else fail('Qui non ci sono risorse: vai su un campo oppure alla miniera (1, 1).');break;}
 case'farm_plant':{const p=plot(s);if(!p)fail('Puoi seminare soltanto sui quattro campi.');if(p.age!==null)fail('Il campo è già seminato.');p.age=0;break;}
 case'farm_deposit':at(s,3,3,'il magazzino');s.stock.wheat+=s.bag.wheat;s.stock.ore+=s.bag.ore;s.bag={wheat:0,ore:0};break;
 case'farm_craft':at(s,5,3,'l’assemblatore');if(!condition(s,'canCraft'))fail('Servono 2 grano e 1 minerale nel magazzino per produrre un kit.');craft(s);break;
 case'farm_ship':{at(s,7,3,'la banchina');const o=order(s);if(!condition(s,'canShip'))fail(`L’ordine richiede ${o.quantity} kit nel magazzino.`);s.stock.kits-=o.quantity;s.orders++;s.shipped+=o.quantity;s.coins+=o.reward;s.notice=`Ordine ${o.number} consegnato! +${o.reward} crediti. Nuova commessa disponibile.`;break;}
 case'farm_upgrade':{const u=upgrades[a.upgrade];if(!u)fail('Macchina non riconosciuta.');if(s.upgrades[a.upgrade])fail('Potenziamento già installato.');if(s.coins<u.price)fail(`Servono ${u.price} crediti per ${u.name.toLowerCase()}.`);s.coins-=u.price;s.upgrades[a.upgrade]=true;s.notice=`${u.name} installata: ${u.description}`;break;}
 case'farm_boost':{const m=machine(s,a.upgrade);if(!m.level)fail('Installa prima la macchina.');if(m.max)fail('La macchina è già al livello massimo.');if(s.coins<m.price)fail(`Servono ${m.price} crediti per potenziare ${m.name.toLowerCase()}.`);s.coins-=m.price;s.upgrades[a.upgrade]=m.level+1;s.notice=`${m.name}: livello ${m.level+1}, ciclo ridotto da ${m.interval} a ${m.nextInterval} tick.`;break;}
 case'wait':ticks=Number(a.seconds??1);if(!Number.isSafeInteger(ticks)||ticks<1)fail('Inserisci un numero intero positivo di secondi, rappresentabile con precisione.');break;
 default:fail('Blocco non disponibile nella fabbrica.');
 }
 if(!Number.isSafeInteger(s.ticks+ticks))fail('Il tempo totale supera la precisione degli interi del simulatore.');
 s.moves++;advance(s,ticks);return s;
}
function example(){return [{type:'forever'},{type:'farm_go',x:1,y:4},{type:'farm_collect'},{type:'farm_plant'},{type:'farm_go',x:2,y:4},{type:'farm_collect'},{type:'farm_plant'},{type:'farm_go',x:1,y:1},{type:'farm_collect'},{type:'farm_go',x:3,y:3},{type:'farm_deposit'},{type:'farm_go',x:5,y:3},{type:'farm_craft'},{type:'farm_go',x:7,y:3},{type:'if',sensor:'canShip'},{type:'farm_ship'},{type:'end'},{type:'end'}];}
const api={initial,act,condition,order,machine,upgrades,sensors,example};if(typeof module!=='undefined')module.exports=api;else root.Factory=api;
})(typeof window!=='undefined'?window:globalThis);
