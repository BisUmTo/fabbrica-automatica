const {test}=require('node:test');const assert=require('node:assert/strict');
const B=require('blockly');const E=require('../dist/engine.js');const A=require('../dist/blockly-adapter.js');const R=require('../dist/report.js');A.define(B);
const n=value=>({kind:'number',value}),v=(id,name=id)=>({kind:'variable',id,name});
function run(id,flat,limit=2000){const runner=E.createRunner(id,flat);let state=E.initial(id),steps=0;while(!runner.done&&steps++<limit){const r=runner.step(state);if(r.action)state=E.act(id,state,r.action);}return {runner,state,steps};}
test('parameterized procedures reuse a route and keep parameters local',()=>{
 const p=[{type:'set',variable:'x',name:'x',value:n(7)},{type:'call',name:'campo',args:[n(1)]},{type:'call',name:'campo',args:[n(2)]},{type:'farm_go',x:v('x'),y:n(3)},{type:'procedure',name:'campo',params:[{id:'x',name:'x'}]},{type:'farm_go',x:v('x'),y:n(4)},{type:'farm_collect'},{type:'farm_plant'},{type:'end'}];
 const {state,runner}=run('factory',p);assert.ok(runner.done);assert.equal(state.bag.wheat,2);assert.equal(state.x,7);assert.equal(state.y,3);assert.equal(runner.variables.get('x'),7);
});
test('native Blockly functions and expressions survive save/load and execute',()=>{
 const ws=new B.Workspace();B.serialization.workspaces.load({blocks:{languageVersion:0,blocks:[{type:'lab_start',next:{block:{type:'procedures_callnoreturn',extraState:{name:'campo',params:['colonna']},inputs:{ARG0:{block:{type:'math_number',fields:{NUM:2}}}}}}},{type:'procedures_defnoreturn',fields:{NAME:'campo'},extraState:{params:[{name:'colonna',id:'col'}]},inputs:{STACK:{block:{type:'lab_farm_go_value',inputs:{x:{block:{type:'variables_get',fields:{VAR:{id:'col',name:'colonna'}}}},y:{block:{type:'math_number',fields:{NUM:4}}}},next:{block:{type:'lab_farm_collect'}}}}}}]}},ws);
 const stored=B.serialization.workspaces.save(ws),restored=new B.Workspace();B.serialization.workspaces.load(stored,restored);const {state}=run('factory',A.toFlat(restored));assert.equal(state.x,2);assert.equal(state.bag.wheat,1);ws.dispose();restored.dispose();
});
test('while uses the current sensor and until terminates without overshooting',()=>{
 const {state,runner}=run('sensor',[{type:'while',condition:{kind:'sensor',sensor:'clear'}},{type:'forward'},{type:'end'}]);assert.ok(runner.done);assert.equal(state.x,4);assert.equal(state.moves,3);
 const tank=run('tank',[{type:'valve',value:'apri'},{type:'while',condition:{kind:'not',value:{kind:'not',value:{kind:'sensor',sensor:'below'}}}},{type:'wait',seconds:1},{type:'end'},{type:'valve',value:'chiudi'}]);assert.ok(E.won('tank',tank.state));
});
test('variables, arithmetic, comparisons and counted loops control production',()=>{
 const {state,runner}=run('factory',[{type:'set',variable:'amount',name:'quantità',value:n(2)},{type:'repeatDynamic',count:{kind:'arithmetic',op:'ADD',left:v('amount'),right:n(1)}},{type:'wait',seconds:n(1)},{type:'end'},{type:'for',variable:'i',name:'i',from:n(1),to:n(2),by:n(1)},{type:'farm_go',x:v('i'),y:n(4)},{type:'farm_collect'},{type:'end'}]);assert.ok(runner.done);assert.equal(state.bag.wheat,2);assert.equal(state.x,2);
});
test('infinite empty loops yield; recursion depth and non-finite arithmetic fail clearly',()=>{
 const {runner}=run('factory',[{type:'while',condition:{kind:'boolean',value:true}},{type:'end'}],100);assert.equal(runner.done,false);
 assert.throws(()=>run('factory',[{type:'call',name:'f',args:[]},{type:'procedure',name:'f',params:[]},{type:'call',name:'f',args:[]},{type:'end'}]),/chiamate|ricorsione/i);
 assert.throws(()=>run('factory',[{type:'wait',seconds:{kind:'arithmetic',op:'DIVIDE',left:n(1),right:n(0)}}]),/zero|finito/i);
 assert.throws(()=>E.createRunner('factory',[{type:'call',name:'manca',args:[]}]),/funzione/i);
});
test('all existing solutions still run through the interactive interpreter',()=>{for(const m of E.missions.filter(m=>m.kind!=='factory')){const {state,runner}=run(m.id,E.solution(m.id));assert.ok(runner.done,m.id);assert.ok(E.won(m.id,state),m.id);}});
test('reports show readable functions and expressions instead of object strings',()=>{const lines=R.programLines([{type:'call',name:'campo',args:[n(2)]},{type:'procedure',name:'campo',params:[{id:'x',name:'colonna'}]},{type:'farm_go',x:v('x','colonna'),y:n(4)},{type:'end'}]).join('\n');assert.match(lines,/campo\(2\)/);assert.match(lines,/colonna/);assert.doesNotMatch(lines,/\[object Object\]/);});
test('recursive parameterized Hanoi preserves caller values across nested calls',()=>{
 const sub=(left,right)=>({kind:'arithmetic',op:'MINUS',left,right}),other=sub(sub(n(6),v('from')),v('to'));
 const flat=[{type:'call',name:'hanoi',args:[n(3),n(1),n(3)]},{type:'procedure',name:'hanoi',params:['n','from','to'].map(id=>({id,name:id}))},{type:'if',condition:{kind:'compare',op:'GT',left:v('n'),right:n(0)}},{type:'call',name:'hanoi',args:[sub(v('n'),n(1)),v('from'),other]},{type:'disk',from:v('from'),to:v('to')},{type:'call',name:'hanoi',args:[sub(v('n'),n(1)),other,v('to')]},{type:'end'},{type:'end'}];const {state,runner}=run('hanoi',flat);assert.ok(runner.done);assert.ok(E.won('hanoi',state));assert.equal(state.moves,7);
});
test('native sensors keep the selected reading after Blockly serialization',()=>{
 const compare={type:'logic_compare',fields:{OP:'EQ'},inputs:{A:{block:{type:'lab_read',fields:{key:'coins'}}},B:{block:{type:'math_number',fields:{NUM:0}}}}};
 const until={type:'controls_whileUntil',fields:{MODE:'UNTIL'},inputs:{BOOL:{block:{type:'lab_sensor',fields:{sensor:'cropReady'}}},DO:{block:{type:'lab_wait',fields:{seconds:1}}}},next:{block:{type:'lab_farm_collect'}}};
 const branch={type:'controls_if',inputs:{IF0:{block:compare},DO0:{block:until}}};
 const ws=new B.Workspace();B.serialization.workspaces.load({blocks:{languageVersion:0,blocks:[{type:'lab_start',next:{block:branch}}]}},ws);
 const restored=new B.Workspace();B.serialization.workspaces.load(B.serialization.workspaces.save(ws),restored);const flat=A.toFlat(restored);assert.equal(flat[0].condition.left.key,'coins');assert.equal(flat[1].condition.value.sensor,'cropReady');const {state}=run('factory',flat);assert.equal(state.bag.wheat,1);assert.equal(state.moves,1);ws.dispose();restored.dispose();
});
test('logic short circuits and forbidden readings in functions fail before execution',()=>{
 const short={kind:'logic',op:'AND',left:{kind:'boolean',value:false},right:{kind:'arithmetic',op:'DIVIDE',left:n(1),right:n(0)}};const {state}=run('factory',[{type:'if',condition:short},{type:'farm_collect'},{type:'else'},{type:'wait',seconds:1},{type:'end'}]);assert.equal(state.bag.wheat,0);assert.equal(state.ticks,1);
 assert.throws(()=>A.validate([{type:'procedure',name:'f',params:[]},{type:'if',condition:{kind:'sensor',sensor:'canShip'}},{type:'end'},{type:'end'}],{actions:['forward'],sensors:['clear'],values:['x','y'],forever:false}),/sensore/);
});
