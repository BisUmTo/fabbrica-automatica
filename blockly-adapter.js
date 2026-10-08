(function(root){
'use strict';
const fieldKeys={farm_go:['x','y'],farm_upgrade:['upgrade'],farm_boost:['upgrade'],move:['x','y','mode'],cross:['cargo'],turn:['direction'],sort:['bin'],valve:['value'],light:['lane','color'],disk:['from','to'],wait:['seconds'],repeat:['n'],if:['sensor']};
const num=(name,value,min,max)=>({type:'field_number',name,value,min,max,precision:1});
const dd=(name,options)=>({type:'field_dropdown',name,options:options.map(o=>Array.isArray(o)?o:[String(o),String(o)])});
const statement=name=>({type:'input_statement',name});
const input=name=>({type:'input_value',name,check:'Number'});
function define(B){
 const action=(type,message,args=[],colour=220,tip='')=>({type:'lab_'+type,message0:message,args0:args,previousStatement:null,nextStatement:null,colour:({220:"#5275dc",165:"#369e87",35:"#ce9131"})[colour]||colour,tooltip:tip,inputsInline:true});
 B.defineBlocksWithJsonArray([
 {type:'lab_start',message0:'quando premi Esegui',nextStatement:null,colour:'#ce9131',hat:'cap',tooltip:'Collega qui il programma. I blocchi staccati non vengono eseguiti.'},
 action('farm_boost','potenzia velocità di %1',[dd('upgrade',[['mietitrice','harvester'],['trivella','drill'],['linea automatica','assembler']])],165,'Acquista il prossimo livello di velocità di una macchina già installata.'),
 action('farm_go_value','vai alle coordinate x %1 y %2',[input('x'),input('y')]),
 action('move_value','vai alle coordinate x %1 y %2 modalità %3',[input('x'),input('y'),dd('mode',[['JUMP','jump'],['diretta','linear']])]),
 action('wait_value','attendi %1 secondi',[input('seconds')],35),
 action('disk_value','sposta disco da %1 a %2',[input('from'),input('to')]),
 {type:'lab_sensor',message0:'sensore %1',args0:[dd('sensor',[['strada libera','clear'],['pezzo rosso','red'],['livello < 60 L','below'],['pinza piena','holding'],['raccolto maturo','cropReady'],['zaino pieno','bagFull'],['risorse nello zaino','bagNotEmpty'],['materiali per un kit','canCraft'],['kit per l’ordine','canShip'],['30 crediti per mietitrice','canHarvestUpgrade'],['50 crediti per trivella','canDrillUpgrade'],['80 crediti per linea','canAssemblyUpgrade'],['posso potenziare la mietitrice','canHarvestBoost'],['posso potenziare la trivella','canDrillBoost'],['posso potenziare la linea','canAssemblyBoost']])],output:'Boolean',colour:'#369e87'},
 {type:'lab_read',message0:'leggi %1',args0:[dd('key',[['posizione x','x'],['posizione y','y'],['grano nel magazzino','wheat'],['minerale nel magazzino','ore'],['kit nel magazzino','kits'],['crediti','coins'],['risorse nello zaino','bag'],['ordini consegnati','orders'],['tick','ticks'],['livello del serbatoio','level'],['pezzi sul nastro','remaining']])],output:'Number',colour:'#369e87'},
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
 action('wait','attendi %1 secondi',[num('seconds',1,1)],35),
 {...action('repeat','ripeti %1 volte',[num('n',3,1,100)],35),message1:'%1',args1:[statement('DO')]},
 {...action('if','se %1',[dd('sensor',[['strada libera','clear'],['pezzo rosso','red'],['livello < 60 L','below'],['pinza piena','holding'],['raccolto maturo','cropReady'],['zaino pieno','bagFull'],['risorse nello zaino','bagNotEmpty'],['materiali per un kit','canCraft'],['kit per l’ordine','canShip'],['30 crediti per mietitrice','canHarvestUpgrade'],['50 crediti per trivella','canDrillUpgrade'],['80 crediti per linea','canAssemblyUpgrade'],['posso potenziare la mietitrice','canHarvestBoost'],['posso potenziare la trivella','canDrillBoost'],['posso potenziare la linea','canAssemblyBoost']])],35),message1:'allora %1',args1:[statement('DO')],message2:'altrimenti %1',args2:[statement('ELSE')]}
 ]);
}
function fromFlat(flat){
 let i=0;
 function chain(){let first=null,last=null;while(i<flat.length){const a=flat[i++];if(a.type==='end'||a.type==='else')return {first,stop:a.type};const n={type:'lab_'+a.type};if(fieldKeys[a.type])n.fields=Object.fromEntries(fieldKeys[a.type].map(k=>[k,['from','to'].includes(k)?String(a[k]):a[k]]));if(a.type==='repeat'||a.type==='if'||a.type==='forever'){const part=chain();n.inputs={};if(part.first)n.inputs.DO={block:part.first};if(a.type==='if'&&part.stop==='else'){const other=chain();if(other.first)n.inputs.ELSE={block:other.first};}}if(last)last.next={block:n};else first=n;last=n;}return {first};}
 const first=chain().first,start={type:'lab_start',x:28,y:30,deletable:false};if(first)start.next={block:first};return {blocks:{languageVersion:0,blocks:[start]}};
}
function toFlat(ws,{report=false}={}){
 const tops=ws.getTopBlocks(true),starts=tops.filter(b=>b.type==='lab_start'),defs=tops.filter(b=>b.type==='procedures_defnoreturn');
 if(starts.length!==1)throw Error('Serve un solo blocco iniziale “quando premi Esegui”.');
 if(!report&&ws.getAllBlocks(false).length>200)throw Error('Limite: massimo 200 blocchi.');
 const needed=new Set(),included=new Set();
 const out=[],variable=b=>{const model=b.getField('VAR').getVariable();return {variable:model.getId(),name:model.getName()};};
 function expression(b){
  if(!b){if(report)return null;throw Error('Manca un valore: collega un numero, una variabile o un sensore.');}
  const e=name=>expression(b.getInputTargetBlock(name));
  switch(b.type){
   case'math_number':return {kind:'number',value:Number(b.getFieldValue('NUM'))};
   case'variables_get':{const v=variable(b);return {kind:'variable',id:v.variable,name:v.name};}
   case'logic_boolean':return {kind:'boolean',value:b.getFieldValue('BOOL')==='TRUE'};
   case'logic_negate':return {kind:'not',value:e('BOOL')};
   case'logic_operation':return {kind:'logic',op:b.getFieldValue('OP'),left:e('A'),right:e('B')};
   case'logic_compare':return {kind:'compare',op:b.getFieldValue('OP'),left:e('A'),right:e('B')};
   case'math_arithmetic':return {kind:'arithmetic',op:b.getFieldValue('OP'),left:e('A'),right:e('B')};
   case'math_modulo':return {kind:'arithmetic',op:'MODULO',left:e('DIVIDEND'),right:e('DIVISOR')};
   case'lab_sensor':return {kind:'sensor',sensor:b.getFieldValue('sensor')};
   case'lab_read':return {kind:'read',key:b.getFieldValue('key')};
   default:throw Error('Valore non supportato: '+b.type);
  }
 }
 function visit(b){while(b){const type=b.type.replace('lab_',''),a={type,blockId:b.id},e=name=>expression(b.getInputTargetBlock(name));
  if(type==='procedures_callnoreturn'){needed.add(b.getProcedureCall().toLocaleLowerCase());out.push({...a,type:'call',name:b.getProcedureCall(),args:(b.saveExtraState()?.params||[]).map((_,i)=>e('ARG'+i))});}
  else if(type==='variables_set'||type==='math_change')out.push({...a,...variable(b),type:type==='variables_set'?'set':'change',value:e(type==='variables_set'?'VALUE':'DELTA')});
  else if(type==='controls_if'){
   let count=0;while(b.getInput('IF'+count)){if(count)out.push({type:'else',blockId:b.id});out.push({...a,type:'if',condition:e('IF'+count)});visit(b.getInputTargetBlock('DO'+count));count++;}
   if(b.getInput('ELSE')){out.push({type:'else',blockId:b.id});visit(b.getInputTargetBlock('ELSE'));}for(let i=0;i<count;i++)out.push({type:'end',blockId:b.id});
  }else if(['controls_whileUntil','controls_repeat_ext','controls_for'].includes(type)){
   if(type==='controls_whileUntil'){let condition=e('BOOL');if(b.getFieldValue('MODE')==='UNTIL')condition={kind:'not',value:condition};out.push({...a,type:'while',condition});}
   if(type==='controls_repeat_ext')out.push({...a,type:'repeatDynamic',count:e('TIMES')});
   if(type==='controls_for')out.push({...a,...variable(b),type:'for',from:e('FROM'),to:e('TO'),by:e('BY')});
   visit(b.getInputTargetBlock('DO'));out.push({type:'end',blockId:b.id});
  }else if(type.endsWith('_value')){const base=type.slice(0,-6);if(!['farm_go','move','disk','wait'].includes(base))throw Error('Blocco non supportato.');const action={...a,type:base};for(const k of fieldKeys[base])action[k]=k==='mode'?b.getFieldValue(k):e(k);out.push(action);}
  else{
   if(!b.type.startsWith('lab_'))throw Error('Blocco non supportato: '+b.type);
   if(fieldKeys[type])for(const k of fieldKeys[type]){const v=b.getFieldValue(k);a[k]=['x','y','n','seconds','from','to'].includes(k)?Number(v):v;}out.push(a);
   if(type==='if'||type==='repeat'||type==='forever'){visit(b.getInputTargetBlock('DO'));if(type==='if'&&b.getInputTargetBlock('ELSE')){out.push({type:'else',blockId:b.id});visit(b.getInputTargetBlock('ELSE'));}out.push({type:'end',blockId:b.id});}
  }
  b=b.getNextBlock();
 }}
 if(report)out.push({type:'section',title:'Programma principale'});
 visit(starts[0].getNextBlock());
 if(report){out.push({type:'section',title:'Tutte le funzioni definite (anche non richiamate)'});for(const b of defs)needed.add(b.getFieldValue('NAME').toLocaleLowerCase());}
 // Only inspect reachable definitions: unfinished functions can stay parked too.
 for(const name of needed){if(included.has(name))continue;included.add(name);const b=defs.find(d=>d.getFieldValue('NAME').toLocaleLowerCase()===name);if(!b)continue;out.push({type:'procedure',name:b.getFieldValue('NAME'),params:b.getVarModels().map(v=>({id:v.getId(),name:v.getName()})),blockId:b.id});visit(b.getInputTargetBlock('STACK'));out.push({type:'end',blockId:b.id});}
 if(report){let i=0;for(const b of tops){if(b.type==='lab_start'||b.type==='procedures_defnoreturn')continue;out.push({type:'section',title:`Blocchi staccati · gruppo ${++i} (non eseguiti)`});if(b.outputConnection)out.push({type:'value',value:expression(b)});else visit(b);}}
 return out;
}
function reportDrafts(B,programs,missions){
 const drafts=[];
 for(const m of missions){const source=programs[m.id];if(!source)continue;const ws=new B.Workspace();B.Events.disable();try{B.serialization.workspaces.load(source,ws);drafts.push({title:m.title,program:toFlat(ws,{report:true})});}catch(err){drafts.push({title:m.title,error:err.message,source:JSON.stringify(source,null,2)});}finally{ws.dispose();B.Events.enable();}}
 return drafts;
}
// Blockly's native definitions keep rename, parameter mutation and call blocks in sync.
function procedureFlyout(B,ws){return B.Procedures.flyoutCategory(ws).filter(item=>{const type=item.getAttribute?item.getAttribute('type'):item.type;return !['procedures_defreturn','procedures_callreturn','procedures_ifreturn'].includes(type);});}
function validate(flat,options){
 const control=['procedure','call','set','change','if','repeat','repeatDynamic','while','for','end','else'];
 const check=value=>{if(!value||typeof value!=='object')return;if(value.kind==='sensor'&&!options.sensors.includes(value.sensor))throw Error('Questo sensore non è disponibile nella sfida.');if(value.kind==='read'&&!options.values.includes(value.key))throw Error('Questo valore non è disponibile nella sfida.');for(const v of Object.values(value))check(v);};
 for(const a of flat){if(a.type==='forever'){if(!options.forever)throw Error('Il ciclo per sempre è disponibile nel livello 11.');}else if(!control.includes(a.type)&&!options.actions.includes(a.type))throw Error('Blocco non disponibile in questa sfida.');if(a.sensor&&!options.sensors.includes(a.sensor))throw Error('Questo sensore non è disponibile nella sfida.');check(a);}
}
const api={define,fromFlat,toFlat,reportDrafts,procedureFlyout,validate};if(typeof module!=='undefined')module.exports=api;else root.BlockAdapter=api;
})(typeof window!=='undefined'?window:globalThis);
