(function(root){
'use strict';
const fieldKeys={farm_go:['x','y'],farm_upgrade:['upgrade'],move:['x','y','mode'],cross:['cargo'],turn:['direction'],sort:['bin'],valve:['value'],light:['lane','color'],disk:['from','to'],wait:['seconds'],repeat:['n'],if:['sensor']};
const num=(name,value,min,max)=>({type:'field_number',name,value,min,max,precision:1});
const dd=(name,options)=>({type:'field_dropdown',name,options:options.map(o=>Array.isArray(o)?o:[String(o),String(o)])});
const statement=name=>({type:'input_statement',name});
function define(B){
 const action=(type,message,args=[],colour=220,tip='')=>({type:'lab_'+type,message0:message,args0:args,previousStatement:null,nextStatement:null,colour:({220:"#5275dc",165:"#369e87",35:"#ce9131"})[colour]||colour,tooltip:tip,inputsInline:true});
 B.defineBlocksWithJsonArray([
 {type:'lab_start',message0:'quando premi Esegui',nextStatement:null,colour:'#ce9131',hat:'cap',tooltip:'Collega qui il programma. I blocchi staccati non vengono eseguiti.'},
 action('move','vai a x %1 y %2 modalità %3',[num('x',1,1,3),num('y',2,2,5),dd('mode',[['JUMP','jump'],['diretta','linear']])],220,'JUMP: solleva la pinza, spostala sopra la destinazione, poi scendi.'),
 action('farm_go','vai a x %1 y %2',[num('x',1,1,7),num('y',4,1,5)]),
 action('farm_collect','raccogli risorsa',[],165),action('farm_plant','semina grano',[],165),action('farm_deposit','scarica al magazzino',[],165),action('farm_craft','produci 1 kit',[],165),action('farm_ship','consegna ordine',[],165),action('farm_upgrade','installa %1',[dd('upgrade',[['mietitrice · 30 crediti','harvester'],['trivella · 50 crediti','drill'],['linea automatica · 80 crediti','assembler']])],165),
 {...action('forever','per sempre',[],35),message1:'%1',args1:[statement('DO')]},
 action('pick','prendi',[],165,'Prendi il cubo in cima alla pila: la pinza deve essere vuota e alla quota del cubo.'),
 action('drop','rilascia',[],165,'Rilascia il cubo su un appoggio.'),
 action('cross','attraversa %1',[dd('cargo',[['con capra','capra'],['con lupo','lupo'],['con cavolo','cavolo'],['da solo','solo']])]),
 action('forward','avanza di 1 casella'),
 action('turn','gira a %1',[dd('direction',['sinistra','destra'])]),
 action('sort','smista nel contenitore %1',[dd('bin',[['R · rosso','R'],['B · blu','B']])],165),
 action('valve','%1 la valvola',[dd('value',['apri','chiudi'])],165),
 action('light','semaforo %1 %2',[dd('lane',['A','B']),dd('color',['verde','giallo','rosso'])],165),
 action('disk','sposta disco da %1 a %2',[dd('from',[1,2,3]),dd('to',[1,2,3])],165),
 action('wait','attendi %1 secondi',[num('seconds',1,1,10)],35),
 {...action('repeat','ripeti %1 volte',[num('n',3,1,100)],35),message1:'%1',args1:[statement('DO')]},
 {...action('if','se %1',[dd('sensor',[['strada libera','clear'],['pezzo rosso','red'],['livello < 60 L','below'],['pinza piena','holding'],['raccolto maturo','cropReady'],['zaino pieno','bagFull'],['risorse nello zaino','bagNotEmpty'],['materiali per un kit','canCraft'],['kit per l’ordine','canShip'],['30 crediti per mietitrice','canHarvestUpgrade'],['50 crediti per trivella','canDrillUpgrade'],['80 crediti per linea','canAssemblyUpgrade']])],35),message1:'allora %1',args1:[statement('DO')],message2:'altrimenti %1',args2:[statement('ELSE')]}
 ]);
}
function fromFlat(flat){
 let i=0;
 function chain(){let first=null,last=null;while(i<flat.length){const a=flat[i++];if(a.type==='end'||a.type==='else')return {first,stop:a.type};const n={type:'lab_'+a.type};if(fieldKeys[a.type])n.fields=Object.fromEntries(fieldKeys[a.type].map(k=>[k,['from','to'].includes(k)?String(a[k]):a[k]]));if(a.type==='repeat'||a.type==='if'||a.type==='forever'){const part=chain();n.inputs={};if(part.first)n.inputs.DO={block:part.first};if(a.type==='if'&&part.stop==='else'){const other=chain();if(other.first)n.inputs.ELSE={block:other.first};}}if(last)last.next={block:n};else first=n;last=n;}return {first};}
 const first=chain().first,start={type:'lab_start',x:28,y:30,deletable:false};if(first)start.next={block:first};return {blocks:{languageVersion:0,blocks:[start]}};
}
function toFlat(ws){
 const tops=ws.getTopBlocks(true),starts=tops.filter(b=>b.type==='lab_start');
 if(starts.length!==1)throw Error('Serve un solo blocco iniziale “quando premi Esegui”.');
 if(tops.length>1)throw Error('Collega tutti i blocchi al programma: ci sono blocchi staccati.');
 const out=[];
 function visit(b){while(b){const type=b.type.replace('lab_',''),a={type,blockId:b.id};if(fieldKeys[type])for(const k of fieldKeys[type]){const v=b.getFieldValue(k);a[k]=['x','y','n','seconds','from','to'].includes(k)?Number(v):v;}out.push(a);if(type==='if'||type==='repeat'||type==='forever'){visit(b.getInputTargetBlock('DO'));if(type==='if'&&b.getInputTargetBlock('ELSE')){out.push({type:'else',blockId:b.id});visit(b.getInputTargetBlock('ELSE'));}out.push({type:'end',blockId:b.id});}b=b.getNextBlock();}}
 visit(starts[0].getNextBlock());return out;
}
const api={define,fromFlat,toFlat};if(typeof module!=='undefined')module.exports=api;else root.BlockAdapter=api;
})(typeof window!=='undefined'?window:globalThis);
