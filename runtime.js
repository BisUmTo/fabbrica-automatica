(function(root){
'use strict';
const fail=message=>{throw Error(message);};
const finite=value=>{const n=Number(value);if(!Number.isFinite(n))fail('Il risultato deve essere un numero finito. Controlla le operazioni.');return n;};
const whole=(value,min,max)=>{const n=finite(value);if(!Number.isInteger(n)||n<min||n>max)fail(`Scegli un intero tra ${min} e ${max}.`);return n;};
function compile(blocks){
 if(blocks.length>400)fail('Limite: massimo 200 blocchi più le chiusure dei cicli.');let pos=0;
 function parse(nested=false){const nodes=[];while(pos<blocks.length){const source=pos,a={...blocks[pos++],source};if(a.type==='end'||a.type==='else'){if(!nested)fail('Blocco senza apertura.');return {nodes,stop:a.type};}if(['repeat','if','forever','while','repeatDynamic','for','procedure'].includes(a.type)){const part=parse(true);a.body=part.nodes;if(a.type==='if'&&part.stop==='else'){const alt=parse(true);a.other=alt.nodes;if(alt.stop!=='end')fail('Manca il blocco fine.');}else if(part.stop!=='end')fail('Manca il blocco fine.');}nodes.push(a);}if(nested)fail('Manca il blocco fine.');return {nodes};}
 const tree=parse().nodes,out=[],definitions=new Map();let work=0;
 for(const a of tree)if(a.type==='procedure'){const key=a.name.toLocaleLowerCase();if(definitions.has(key))fail('Due funzioni hanno lo stesso nome: '+a.name);if(new Set(a.params.map(p=>p.id)).size!==a.params.length)fail('I parametri della funzione devono avere nomi diversi.');definitions.set(key,a);}
 function emit(nodes){if(++work>10000)fail('Limite: troppi cicli annidati.');for(const a of nodes){if(out.length>1000)fail('Limite: programma troppo lungo (1000 istruzioni).');
  if(a.type==='procedure')fail('Definisci le funzioni fuori dal programma principale.');
  else if(a.type==='forever'){const start=out.length;emit(a.body);out.push({type:'loop',skip:start,source:a.source});}
  else if(a.type==='repeat'){const n=whole(a.n,1,100);for(let j=0;j<n;j++)emit(a.body);}
  else if(a.type==='if'||a.type==='while'){const start=out.length,head={type:'if',sensor:a.sensor,condition:a.condition,source:a.source,skip:0};out.push(head);emit(a.body);if(a.type==='while')out.push({type:'loop',skip:start,source:a.source});else if(a.other){const jump={type:'jump',skip:0,source:a.source};out.push(jump);head.skip=out.length;emit(a.other);jump.skip=out.length;}if(!a.other)head.skip=out.length;}
  else if(a.type==='repeatDynamic'||a.type==='for'){const head=out.length;out.push({...a,type:a.type==='for'?'forStart':'repeatStart',skip:0,body:undefined});emit(a.body);out.push({type:'next',head,source:a.source});out[head].skip=out.length;}
  else if(a.type==='call'){const def=definitions.get(a.name.toLocaleLowerCase());if(!def)fail('Funzione non definita: '+a.name);if(a.args.length!==def.params.length)fail('Controlla i parametri della funzione '+a.name);out.push({...a,params:def.params,target:0});}
  else out.push(a);
 }}
 emit(tree.filter(a=>a.type!=='procedure'));
 if(definitions.size){out.push({type:'halt',source:0});for(const a of definitions.values()){a.target=out.length;emit(a.body);out.push({type:'return',source:a.source});}for(const a of out)if(a.type==='call')a.target=definitions.get(a.name.toLocaleLowerCase()).target;}
 if(out.length>1000)fail('Limite: programma troppo lungo (1000 istruzioni).');return out;
}
class Runner{
 constructor(code,sensor,read){this.code=code;this.sensor=sensor;this.read=read;this.pc=0;this.source=-1;this.variables=new Map();this.names=new Map();this.frames=[{locals:new Map(),loops:new Map()}];this.done=false;this.settle();}
 get frame(){return this.frames.at(-1);}
 get(id){return this.frame.locals.has(id)?this.frame.locals.get(id):(this.variables.get(id)??0);}
 set(id,value,name=id){this.names.set(id,name);if(this.frame.locals.has(id))this.frame.locals.set(id,value);else this.variables.set(id,value);}
 value(e,state,depth=0){
  if(e===null||e===undefined)fail('Manca un valore: collega un numero, una variabile o un sensore.');if(typeof e!=='object')return e;if(depth>40)fail('Espressione troppo annidata.');
  const val=x=>this.value(x,state,depth+1),num=x=>finite(val(x));
  switch(e.kind){
   case'number':return finite(e.value);case'boolean':return !!e.value;case'variable':return this.get(e.id);case'sensor':return this.sensor(state,e.sensor);case'read':return finite(this.read(state,e.key));
   case'not':return !val(e.value);
   case'logic':if(e.op==='AND')return !!val(e.left)&&!!val(e.right);if(e.op==='OR')return !!val(e.left)||!!val(e.right);break;
   case'compare':{const a=val(e.left),b=val(e.right);switch(e.op){case'EQ':return a===b;case'NEQ':return a!==b;case'LT':return a<b;case'LTE':return a<=b;case'GT':return a>b;case'GTE':return a>=b;}break;}
   case'arithmetic':{const a=num(e.left),b=num(e.right);if((e.op==='DIVIDE'||e.op==='MODULO')&&b===0)fail('Non puoi dividere per zero.');const ops={ADD:()=>a+b,MINUS:()=>a-b,MULTIPLY:()=>a*b,DIVIDE:()=>a/b,POWER:()=>a**b,MODULO:()=>a%b};if(ops[e.op])return finite(ops[e.op]());break;}
  }fail('Espressione non disponibile.');
 }
 settle(){let guard=0;while(this.code[this.pc]?.type==='jump'){if(++guard>1000)fail('Troppi salti senza un’azione.');this.pc=this.code[this.pc].skip;}this.done=this.pc>=this.code.length||this.code[this.pc]?.type==='halt';}
 step(state){
  if(this.done)return {done:true};const a=this.code[this.pc];this.source=a.source;let action=null,message='';const value=e=>this.value(e,state),loop=this.frame.loops;
  switch(a.type){
   case'if':{const yes=a.condition?!!value(a.condition):this.sensor(state,a.sensor);this.pc=yes?this.pc+1:a.skip;message='? Condizione: '+(yes?'VERO':'FALSO');break;}
   case'loop':this.pc=a.skip;message='↻ Nuovo ciclo';break;
   case'set':case'change':{const v=a.type==='change'?finite(this.get(a.variable))+finite(value(a.value)):value(a.value);this.set(a.variable,typeof v==='number'?finite(v):v,a.name);message=`${a.name} = ${this.get(a.variable)}`;this.pc++;break;}
   case'call':{if(this.frames.length>=33)fail('Troppe chiamate annidate (32): controlla la ricorsione della funzione '+a.name+'.');const args=a.args.map(value);this.frames.push({locals:new Map(a.params.map((p,i)=>[p.id,args[i]])),loops:new Map(),returnPC:this.pc+1,name:a.name});for(const p of a.params)this.names.set(p.id,p.name);this.pc=a.target;message='Chiama '+a.name;break;}
   case'return':{if(this.frames.length===1)fail('Ritorno fuori da una funzione.');const frame=this.frames.pop();this.pc=frame.returnPC;message='Fine funzione '+frame.name;break;}
   case'repeatStart':{const count=whole(value(a.count),0,10000);if(count===0)this.pc=a.skip;else{loop.set(this.pc,{count});this.pc++;}message=`Ripeti ${count} volte`;break;}
   case'forStart':{const from=finite(value(a.from)),to=finite(value(a.to)),by=Math.abs(finite(value(a.by)));if(by===0)fail('Il passo del ciclo deve essere maggiore di zero.');const delta=from<=to?by:-by;loop.set(this.pc,{to,delta,variable:a.variable,name:a.name});this.set(a.variable,from,a.name);this.pc++;message=`${a.name} = ${from}`;break;}
   case'next':{const info=loop.get(a.head);if(!info)fail('Ciclo non inizializzato.');let again;if(info.variable){const previous=finite(this.get(info.variable)),next=finite(previous+info.delta);if(next===previous)fail('Il passo del ciclo è troppo piccolo.');this.set(info.variable,next,info.name);again=info.delta>0?next<=info.to:next>=info.to;}else again=--info.count>0;if(again)this.pc=a.head+1;else{loop.delete(a.head);this.pc++;}message=again?'↻ Nuova iterazione':'Fine ciclo';break;}
   default:action={...a};for(const k of ['x','y','seconds','from','to'])if(action[k]!==undefined)action[k]=value(action[k]);this.pc++;
  }
  this.settle();return {action,message,source:a.source,done:this.done};
 }
 snapshot(){const values=new Map(this.variables);for(const [id,v] of this.frame.locals)values.set(id,v);return [...values].map(([id,value])=>({name:this.names.get(id)||id,value}));}
}
const readLabels={x:'posizione x',y:'posizione y',wheat:'grano nel magazzino',ore:'minerale nel magazzino',kits:'kit nel magazzino',coins:'crediti',bag:'risorse nello zaino',orders:'ordini consegnati',ticks:'tick',level:'livello del serbatoio',remaining:'pezzi sul nastro'};
function expression(e){if(e===null||e===undefined)return '?';if(typeof e!=='object')return String(e);switch(e.kind){case'number':return String(e.value);case'boolean':return e.value?'vero':'falso';case'variable':return e.name||e.id;case'sensor':return e.sensor;case'read':return readLabels[e.key]||e.key;case'not':return 'non ('+expression(e.value)+')';default:{const ops={ADD:'+',MINUS:'-',MULTIPLY:'*',DIVIDE:'/',POWER:'^',MODULO:'mod',EQ:'=',NEQ:'!=',LT:'<',LTE:'<=',GT:'>',GTE:'>=',AND:'e',OR:'o'};return '('+expression(e.left)+' '+(ops[e.op]||e.op)+' '+expression(e.right)+')';}}}
const api={compile,Runner,expression,readLabels};if(typeof module!=='undefined')module.exports=api;else root.LabRuntime=api;
})(typeof window!=='undefined'?window:globalThis);
