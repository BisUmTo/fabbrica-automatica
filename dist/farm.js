(function(root){
'use strict';
const upgrades={harvester:{name:'Mietitrice',price:30,description:'Raccoglie e risemina i campi ogni 12 tick.'},drill:{name:'Trivella',price:50,description:'Porta 1 minerale al magazzino ogni 6 tick.'},assembler:{name:'Linea automatica',price:80,description:'Il nastro alimenta l’assemblatore: 1 kit ogni 4 tick, se ci sono materiali.'}};
const sensors={cropReady:'il raccolto qui è maturo',bagFull:'lo zaino è pieno',bagNotEmpty:'ho risorse nello zaino',canCraft:'ci sono materiali per un kit',canShip:'ci sono kit per l’ordine',canHarvestUpgrade:'ho 30 crediti e manca la mietitrice',canDrillUpgrade:'ho 50 crediti e manca la trivella',canAssemblyUpgrade:'ho 80 crediti e manca la linea'};
const copy=s=>JSON.parse(JSON.stringify(s));const fail=m=>{throw Error(m);};
function initial(){return {version:1,x:1,y:4,ticks:0,moves:0,bag:{wheat:0,ore:0},stock:{wheat:0,ore:0,kits:0},plots:[{x:1,y:4,age:4},{x:2,y:4,age:4},{x:1,y:5,age:4},{x:2,y:5,age:4}],coins:0,orders:0,shipped:0,produced:0,harvested:0,mined:0,upgrades:{harvester:false,drill:false,assembler:false},notice:'La prima commessa: produci e consegna un kit.'};}
function order(s){const quantity=1+Math.floor((s.orders+1)/2);return {number:s.orders+1,quantity,reward:20*quantity};}
function plot(s){return s.plots.find(p=>p.x===s.x&&p.y===s.y);}
function condition(s,key){const p=plot(s);switch(key){case'cropReady':return !!p&&p.age>=4;case'bagFull':return s.bag.wheat+s.bag.ore>=6;case'bagNotEmpty':return s.bag.wheat+s.bag.ore>0;case'canCraft':return s.stock.wheat>=2&&s.stock.ore>=1;case'canShip':return s.stock.kits>=order(s).quantity;case'canHarvestUpgrade':return !s.upgrades.harvester&&s.coins>=30;case'canDrillUpgrade':return !s.upgrades.drill&&s.coins>=50;case'canAssemblyUpgrade':return !s.upgrades.assembler&&s.coins>=80;default:return false;}}
function craft(s){s.stock.wheat-=2;s.stock.ore--;s.stock.kits++;s.produced++;}
function advance(s,n){for(let i=0;i<n;i++){s.ticks++;for(const p of s.plots)if(p.age!==null)p.age=Math.min(4,p.age+1);if(s.upgrades.harvester&&s.ticks%12===0)for(const p of s.plots){if(p.age>=4){s.stock.wheat++;s.harvested++;p.age=0;}else if(p.age===null)p.age=0;}if(s.upgrades.drill&&s.ticks%6===0){s.stock.ore++;s.mined++;}if(s.upgrades.assembler&&s.ticks%4===0&&condition(s,'canCraft'))craft(s);}}
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
 case'wait':ticks=Number(a.seconds??1);if(!Number.isInteger(ticks)||ticks<1||ticks>10)fail('Attendi da 1 a 10 tick.');break;
 default:fail('Blocco non disponibile nella fabbrica.');
 }
 s.moves++;advance(s,ticks);return s;
}
function example(){return [{type:'forever'},{type:'farm_go',x:1,y:4},{type:'farm_collect'},{type:'farm_plant'},{type:'farm_go',x:2,y:4},{type:'farm_collect'},{type:'farm_plant'},{type:'farm_go',x:1,y:1},{type:'farm_collect'},{type:'farm_go',x:3,y:3},{type:'farm_deposit'},{type:'farm_go',x:5,y:3},{type:'farm_craft'},{type:'farm_go',x:7,y:3},{type:'if',sensor:'canShip'},{type:'farm_ship'},{type:'end'},{type:'end'}];}
const api={initial,act,condition,order,upgrades,sensors,example};if(typeof module!=='undefined')module.exports=api;else root.Factory=api;
})(typeof window!=='undefined'?window:globalThis);
