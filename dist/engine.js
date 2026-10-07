(function(root){
'use strict';
const Runtime=typeof module!=='undefined'?require('./runtime.js'):root.LabRuntime;
const F=typeof module!=='undefined'?require('./farm.js'):root.Factory;
const missions=[
{id:'stack',title:'Block stacking',tag:'ROBOTICA',level:2,time:'12 min',icon:'▥',concept:'Sequenze · coordinate · precondizioni',brief:'Impila i cubi nella colonna 1: A alla base, B al centro, C in cima.',rule:'La pinza prende solo il cubo in cima. Rilascia su un appoggio. Coordinate: x = colonna, y = quota; il primo cubo è a y = 2. In modalità JUMP il robot sale prima di spostarsi.',hint:'C impedisce di raggiungere A. Usa la colonna 3 come deposito temporaneo: sposta C, poi B, infine C.',goal:'Colonna 1: A → B → C dal basso',kind:'robot'},
{id:'pickplace',title:'Il primo pick & place',tag:'ROBOTICA',level:1,time:'5 min',icon:'⌖',concept:'Coordinate · presa · rilascio',brief:'Sposta il cubo A dalla colonna 1 alla colonna 3.',rule:'Vai sul cubo (1, 2), chiudi la pinza, raggiungi (3, 2) e rilascia. Il piano di lavoro si trova a y = 1.',hint:'Servono quattro azioni: vai, prendi, vai, rilascia.',goal:'A nella colonna 3, pinza vuota',kind:'robot'},
{id:'pallet',title:'Pallet in ordine',tag:'ROBOTICA',level:2,time:'10 min',icon:'▦',concept:'Pianificazione · memoria dello stato',brief:'I tre cubi sono separati. Costruisci una pila A–B–C nella colonna 3.',rule:'Preleva solo dall’alto. La quota di rilascio cresce insieme alla pila. Il cubo C deve essere spostato prima di costruire la base.',hint:'Parcheggia C sopra B. Trasferisci A sulla colonna 3, libera B spostando C, poi completa la pila.',goal:'Colonna 3: A → B → C dal basso',kind:'robot'},
{id:'river',title:'Lupo, capra e cavolo',tag:'LOGICA',level:2,time:'12 min',icon:'≈',concept:'Vincoli · stati · pianificazione',brief:'Porta tutti sulla sponda destra senza lasciare nessuno in pericolo.',rule:'Il contadino guida sempre la barca e porta al massimo un oggetto. Senza di lui, lupo e capra oppure capra e cavolo non possono stare sulla stessa sponda. Puoi tornare da solo.',hint:'La prima passeggera è la capra. Per far arrivare il lupo, dovrai riportare indietro qualcuno.',goal:'Tutti a destra, almeno 7 traversate',kind:'river'},
{id:'path',title:'Il percorso dell’AGV',tag:'AUTOMAZIONE',level:1,time:'7 min',icon:'↱',concept:'Sequenze · orientamento · cicli',brief:'Guida il carrello dalla partenza al punto di consegna verde.',rule:'Avanza di una casella nella direzione corrente. Le svolte ruotano di 90°. Non puoi attraversare gli ostacoli né uscire dalla griglia.',hint:'Percorri la corsia inferiore fino alla colonna 5, poi gira a sinistra. Un ciclo evita di ripetere quattro blocchi uguali.',goal:'Raggiungi (5, 5)',kind:'grid'},
{id:'sensor',title:'Fermati al sensore',tag:'AUTOMAZIONE',level:2,time:'8 min',icon:'◉',concept:'Condizioni · sensori · cicli',brief:'Avvicina l’AGV alla barriera senza urtarla: fermati a (4, 1).',rule:'Il sensore “strada libera” controlla la casella davanti al carrello. Usa una condizione dentro un ciclo per avanzare solo quando è sicuro.',hint:'Ripeti 5 volte: se strada libera, avanza. Quando trova il muro il carrello resta fermo.',goal:'Fermo a (4, 1), nessuna collisione',kind:'grid'},
{id:'sort',title:'Smistamento sul nastro',tag:'AUTOMAZIONE',level:2,time:'10 min',icon:'⇥',concept:'Selezione · sensori · ripetizione',brief:'Smista i sei pezzi: rossi nel contenitore R, blu nel contenitore B.',rule:'Il sensore legge il primo pezzo sul nastro. Un comando di smistamento lo rimuove e porta subito avanti il successivo. Non smistare quando il nastro è vuoto.',hint:'Ripeti sei volte una decisione completa: SE pezzo rosso smista R, ALTRIMENTI smista B.',goal:'3 pezzi rossi in R e 3 blu in B',kind:'sort'},
{id:'tank',title:'Livello sotto controllo',tag:'AUTOMAZIONE',level:2,time:'10 min',icon:'◫',concept:'Attuatori · soglia · retroazione',brief:'Riempi il serbatoio fino a 60 litri, poi chiudi la valvola.',rule:'Apri la valvola: ogni attesa di 1 secondo aggiunge 10 litri. Il sensore controlla se il livello è inferiore a 60. Capacità massima: 80 litri.',hint:'Apri, ripeti 8 volte “se livello < 60, attendi”, poi chiudi. Il sensore evita di oltrepassare la soglia.',goal:'60 litri e valvola chiusa',kind:'tank'},
{id:'traffic',title:'Incrocio sicuro',tag:'AUTOMAZIONE',level:2,time:'10 min',icon:'⋮',concept:'Interblocchi · temporizzazione',brief:'Fai passare le due strade in sicurezza e termina con entrambi i semafori rossi.',rule:'Mai due verdi insieme. Ogni verde deve durare almeno 2 secondi; passa dal giallo per almeno 1 secondo prima del rosso. Attendi 1 secondo con entrambi rossi prima di dare il verde all’altra strada.',hint:'A verde, attesa 2, A giallo, attesa 1, A rosso, attesa 1. Poi fai lo stesso per B.',goal:'Un ciclo per A e B, entrambi rossi',kind:'traffic'},
{id:'hanoi',title:'La torre di Hanoi',tag:'LOGICA',level:3,time:'15 min',icon:'△',concept:'Scomposizione · vincoli · algoritmi',brief:'Trasferisci i tre dischi dal piolo 1 al piolo 3.',rule:'Sposta un disco alla volta, prendendolo dalla cima. Un disco grande non può stare sopra uno più piccolo.',hint:'Per spostare il disco grande devi prima trasferire i due piccoli sul piolo 2. La soluzione minima richiede 7 mosse.',goal:'Tutti i dischi sul piolo 3',kind:'hanoi'}
];
const order=['pickplace','path','stack','river','sensor','sort','tank','pallet','traffic','hanoi'];
missions.sort((a,b)=>order.indexOf(a.id)-order.indexOf(b.id));
for(const m of missions)if(['pallet','traffic'].includes(m.id))m.level=3;
missions.push({id:'factory',title:'La fabbrica infinita',tag:'MONDO APERTO',level:4,time:'∞',icon:'∞',concept:'Coltiva · produci · automatizza · espandi',brief:'Trasforma una fattoria in una fabbrica: coltiva grano, estrai minerale, produci kit e reinvesti i ricavi in macchine automatiche.',rule:'Ogni azione fa avanzare il tempo. Il grano matura in 4 tick e va riseminato dopo la raccolta. Lo zaino contiene 6 risorse. Scarica al magazzino (3,3); all’assemblatore (5,3), 2 grano + 1 minerale diventano 1 kit. Consegna l’ordine alla banchina (7,3). Gli ordini crescono senza fine. Il mondo resta salvato quando modifichi i blocchi; Pausa ferma anche le macchine.',hint:'Comincia dai campi (1,4) e (2,4): raccogli e risemina. Prendi un minerale in (1,1), scarica tutto in (3,3), produci in (5,3) e consegna in (7,3). Puoi definire una funzione “raccogli campo” con i parametri colonna e riga, da richiamare per ogni campo. Poi racchiudi il percorso in “per sempre” e usa “se ci sono kit per l’ordine” prima di consegnare.',goal:'Completa ordini e costruisci la tua automazione',kind:'factory'});
const copy=x=>JSON.parse(JSON.stringify(x));
const mission=id=>missions.find(m=>m.id===id);
function initial(id){
 const kind=mission(id).kind;
 if(kind==='factory')return F.initial();
 if(kind==='robot') return {stacks:id==='stack'?[['A','C'],['B'],[]]:id==='pallet'?[['A'],['B'],['C']]:[['A'],[],[]],x:2,y:5,held:null,moves:0};
 if(kind==='river')return {sides:{contadino:0,capra:0,lupo:0,cavolo:0},moves:0};
 if(kind==='grid')return {x:1,y:1,dir:0,obstacles:id==='sensor'?[[5,1]]:[[2,2],[3,2],[3,3],[3,4],[4,4]],moves:0};
 if(kind==='sort')return {queue:['R','B','B','R','B','R'],bins:{R:[],B:[]},moves:0};
 if(kind==='tank')return {level:20,open:false,time:0,moves:0};
 if(kind==='traffic')return {lights:{A:'rosso',B:'rosso'},elapsed:{A:0,B:0},served:{A:false,B:false},clear:1,time:0,moves:0};
 return {pegs:[[3,2,1],[],[]],moves:0};
}
const fail=msg=>{throw new Error(msg);};
const integer=(v,a,b)=>{v=Number(v);if(!Number.isInteger(v)||v<a||v>b)fail(`Scegli un intero tra ${a} e ${b}.`);return v;};
function act(id,state,a){
 if(id==='factory')return F.act(state,a);
 const s=copy(state),kind=mission(id).kind;s.moves++;
 if(a.type==='wait'){
  const n=integer(a.seconds??1,1,10);
  if(kind==='tank'){s.time+=n;if(s.open)s.level+=10*n;if(s.level>80)fail('Trabocco: il livello ha superato gli 80 litri.');}
  if(kind==='traffic'){s.time+=n;s.elapsed.A+=n;s.elapsed.B+=n;if(Object.values(s.lights).every(x=>x==='rosso'))s.clear+=n;}
  return s;
 }
 if(kind==='robot'){
  if(a.type==='move'){
   const x=integer(a.x,1,3),y=integer(a.y,2,5);
   if(a.mode==='linear' && x!==s.x){const low=Math.min(s.x,x),high=Math.max(s.x,x);for(let c=low;c<=high;c++)if(s.stacks[c-1].length+1>=Math.min(s.y,y))fail('Traiettoria diretta occupata: usa JUMP per passare sopra i cubi.');}
   if(y<s.stacks[x-1].length+1 || (s.held&&y<=s.stacks[x-1].length+1))fail('Posizione occupata da un cubo.');s.x=x;s.y=y;
  }else if(a.type==='pick'){
   if(s.held)fail('La pinza contiene già un cubo.');const pile=s.stacks[s.x-1];
   if(s.y<pile.length+1)fail('C’è un altro cubo sopra: prendi prima quello in cima.');
   if(!pile.length||s.y!==pile.length+1)fail('Nessun cubo da prendere a questa quota.');s.held=pile.pop();
  }else if(a.type==='drop'){
   if(!s.held)fail('La pinza è vuota.');const pile=s.stacks[s.x-1];if(s.y!==pile.length+2)fail('Manca un appoggio: rilascia subito sopra il piano o la pila.');pile.push(s.held);s.held=null;
  }else fail('Blocco non disponibile in questa sfida.');
 }else if(kind==='river'){
  if(a.type!=='cross')fail('Usa il blocco attraversa.');const {cargo}=a,side=s.sides.contadino;
  if(cargo!=='solo'&&!['capra','lupo','cavolo'].includes(cargo))fail('Passeggero non valido.');
  if(cargo!=='solo'&&s.sides[cargo]!==side)fail('Il passeggero non è sulla sponda del contadino.');
  s.sides.contadino=1-side;if(cargo!=='solo')s.sides[cargo]=1-side;
  for(const pair of [['lupo','capra'],['capra','cavolo']])if(s.sides[pair[0]]===s.sides[pair[1]]&&s.sides.contadino!==s.sides[pair[0]])fail(`Pericolo: ${pair.join(' e ')} restano senza contadino sulla sponda ${s.sides[pair[0]]?'destra':'sinistra'}.`);
 }else if(kind==='grid'){
  if(a.type==='turn')s.dir=(s.dir+(a.direction==='sinistra'?1:3))%4;
  else if(a.type==='forward'){if(!condition(id,s,'clear'))fail('Collisione: la casella davanti non è libera.');const d=[[1,0],[0,1],[-1,0],[0,-1]][s.dir];s.x+=d[0];s.y+=d[1];}
  else fail('Blocco non disponibile in questa sfida.');
 }else if(kind==='sort'){
  if(a.type!=='sort')fail('Usa il blocco smista.');if(!s.queue.length)fail('Il nastro è vuoto.');if(a.bin!==s.queue[0])fail(`Pezzo ${s.queue[0]==='R'?'rosso':'blu'} nel contenitore sbagliato.`);s.bins[a.bin].push(s.queue.shift());
 }else if(kind==='tank'){
  if(a.type!=='valve')fail('Usa la valvola oppure attendi.');s.open=a.value==='apri';
 }else if(kind==='traffic'){
  if(a.type!=='light')fail('Usa semaforo oppure attendi.');const lane=a.lane,other=lane==='A'?'B':'A',prev=s.lights[lane],color=a.color;
  if(!['A','B'].includes(lane)||!['rosso','giallo','verde'].includes(color))fail('Semaforo non valido.');
  if(color===prev)return s;
  if(color==='verde'&&(prev!=='rosso'||s.lights[other]!=='rosso'||s.clear<1))fail('Interblocco: servono entrambi rossi per almeno 1 secondo.');
  if(color==='giallo'&&(prev!=='verde'||s.elapsed[lane]<2))fail('Prima del giallo servono almeno 2 secondi di verde.');
  if(color==='rosso'&&(prev!=='giallo'||s.elapsed[lane]<1))fail('Prima del rosso serve almeno 1 secondo di giallo.');
  if(color==='rosso')s.served[lane]=true;s.lights[lane]=color;s.elapsed[lane]=0;s.clear=0;
 }else{
  if(a.type!=='disk')fail('Usa il blocco sposta disco.');const from=integer(a.from,1,3)-1,to=integer(a.to,1,3)-1;
  if(from===to)fail('Scegli due pioli diversi.');const d=s.pegs[from].at(-1);if(!d)fail('Il piolo di partenza è vuoto.');if(s.pegs[to].length&&s.pegs[to].at(-1)<d)fail('Un disco grande non può stare sopra uno piccolo.');s.pegs[from].pop();s.pegs[to].push(d);
 }
 return s;
}
function condition(id,s,sensor){
 if(id==='factory')return F.condition(s,sensor);
 if(sensor==='clear'){const d=[[1,0],[0,1],[-1,0],[0,-1]][s.dir],x=s.x+d[0],y=s.y+d[1];return x>=1&&x<=5&&y>=1&&y<=5&&!s.obstacles.some(p=>p[0]===x&&p[1]===y);}
 if(sensor==='red')return s.queue[0]==='R';
 if(sensor==='below')return s.level<60;
 if(sensor==='holding')return !!s.held;
 return false;
}
function won(id,s){
 if(id==='factory')return false;
 const kind=mission(id).kind;
 if(kind==='robot')return !s.held&&(id==='pickplace'?s.stacks[2].join('')==='A':s.stacks[id==='stack'?0:2].join('')==='ABC');
 if(kind==='river')return Object.values(s.sides).every(x=>x===1);
 if(kind==='grid')return s.x===(id==='sensor'?4:5)&&s.y===(id==='sensor'?1:5);
 if(kind==='sort')return s.queue.length===0&&s.bins.R.length===3&&s.bins.B.length===3;
 if(kind==='tank')return s.level===60&&!s.open;
 if(kind==='traffic')return s.served.A&&s.served.B&&s.lights.A==='rosso'&&s.lights.B==='rosso';
 return s.pegs[2].join() === '3,2,1';
}
const compile=Runtime.compile;
function createRunner(id,blocks){return new Runtime.Runner(compile(blocks),(s,key)=>condition(id,s,key),(s,key)=>{
 if(key==='x'||key==='y')return s[key];
 if(id==='factory'){if(['wheat','ore','kits'].includes(key))return s.stock[key];if(key==='bag')return s.bag.wheat+s.bag.ore;if(['coins','orders','ticks'].includes(key))return s[key];}
 if(key==='level'&&id==='tank')return s.level;if(key==='remaining'&&id==='sort')return s.queue.length;
 fail('Questo valore non è disponibile nella sfida.');
});}
const move=(x,y)=>({type:'move',x,y,mode:'jump'}), pick={type:'pick'},drop={type:'drop'};
const transfer=(x,y,u,v)=>[move(x,y),pick,move(u,v),drop];
function solution(id){
 if(id==='factory')return F.example();
 if(id==='stack')return [...transfer(1,3,3,2),...transfer(2,2,1,3),...transfer(3,2,1,4)];
 if(id==='pickplace')return transfer(1,2,3,2);
 if(id==='pallet')return [...transfer(3,2,2,3),...transfer(1,2,3,2),...transfer(2,3,1,2),...transfer(2,2,3,3),...transfer(1,2,3,4)];
 if(id==='river')return ['capra','solo','lupo','capra','cavolo','solo','capra'].map(cargo=>({type:'cross',cargo}));
 if(id==='path')return [{type:'repeat',n:4},{type:'forward'},{type:'end'},{type:'turn',direction:'sinistra'},{type:'repeat',n:4},{type:'forward'},{type:'end'}];
 if(id==='sensor')return [{type:'repeat',n:5},{type:'if',sensor:'clear'},{type:'forward'},{type:'end'},{type:'end'}];
 if(id==='sort')return [{type:'repeat',n:6},{type:'if',sensor:'red'},{type:'sort',bin:'R'},{type:'else'},{type:'sort',bin:'B'},{type:'end'},{type:'end'}];
 if(id==='tank')return [{type:'valve',value:'apri'},{type:'repeat',n:8},{type:'if',sensor:'below'},{type:'wait',seconds:1},{type:'end'},{type:'end'},{type:'valve',value:'chiudi'}];
 if(id==='traffic')return ['A','B'].flatMap(lane=>[{type:'light',lane,color:'verde'},{type:'wait',seconds:2},{type:'light',lane,color:'giallo'},{type:'wait',seconds:1},{type:'light',lane,color:'rosso'},{type:'wait',seconds:1}]);
 return [[1,3],[1,2],[3,2],[1,3],[2,1],[2,3],[1,3]].map(([from,to])=>({type:'disk',from,to}));
}
const api={missions,mission,initial,act,won,condition,compile,createRunner,solution,copy};
if(typeof module!=='undefined')module.exports=api;else root.Lab=api;
})(typeof window!=='undefined'?window:globalThis);
