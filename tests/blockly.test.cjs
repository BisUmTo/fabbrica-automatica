const {test}=require('node:test');const assert=require('node:assert/strict');const B=require('blockly');const E=require('../dist/engine.js');const A=require('../dist/blockly-adapter.js');A.define(B);
test('all ten programs survive Blockly serialization with nested control flow',()=>{for(const m of E.missions.filter(m=>m.kind!=='factory')){const ws=new B.Workspace();B.serialization.workspaces.load(A.fromFlat(E.solution(m.id)),ws);const flat=A.toFlat(ws);const code=E.compile(flat);let s=E.initial(m.id),pc=0;for(let guard=0;pc<code.length&&guard<1000;guard++){const a=code[pc];if(a.type==='if')pc=E.condition(m.id,s,a.sensor)?pc+1:a.skip;else if(a.type==='jump')pc=a.skip;else{s=E.act(m.id,s,a);pc++;}}assert.ok(E.won(m.id,s),m.id);ws.dispose();}});
test('detached drafts remain saved but do not affect execution',()=>{
 const ws=new B.Workspace();B.serialization.workspaces.load(A.fromFlat(E.solution('pickplace')),ws);
 const loose=ws.newBlock('lab_drop'),incomplete=ws.newBlock('controls_if'),value=ws.newBlock('math_number');
 const draft=ws.newBlock('procedures_defnoreturn'),unfinished=ws.newBlock('lab_move_value');draft.getInput('STACK').connection.connect(unfinished.previousConnection);
 const restored=new B.Workspace();B.serialization.workspaces.load(B.serialization.workspaces.save(ws),restored);
 for(const b of [loose,incomplete,value,draft,unfinished])assert.ok(restored.getBlockById(b.id),'parked block survives reload');
 const flat=A.toFlat(restored);assert.equal(flat.length,4);const runner=E.createRunner('pickplace',flat);let state=E.initial('pickplace');while(!runner.done){const result=runner.step(state);if(result.action)state=E.act('pickplace',state,result.action);}assert.ok(E.won('pickplace',state));ws.dispose();restored.dispose();
});
test('a detached stack is excluded until connected to the start',()=>{
 const ws=new B.Workspace();B.serialization.workspaces.load(A.fromFlat([]),ws);const loose=ws.newBlock('lab_pick');assert.deepEqual(A.toFlat(ws),[]);
 ws.getTopBlocks(false).find(b=>b.type==='lab_start').nextConnection.connect(loose.previousConnection);assert.equal(A.toFlat(ws)[0].type,'pick');ws.dispose();
});
test('factory program runs hundreds of cycles without ending or losing material',()=>{const ws=new B.Workspace();B.serialization.workspaces.load(A.fromFlat(E.solution('factory')),ws);const code=E.compile(A.toFlat(ws));let s=E.initial('factory'),pc=0;for(let n=0;n<2000;n++){const a=code[pc];assert.ok(a,'endless program must not fall off the end');if(a.type==='if')pc=E.condition('factory',s,a.sensor)?pc+1:a.skip;else if(a.type==='jump'||a.type==='loop')pc=a.skip;else{s=E.act('factory',s,a);pc++;}}assert.ok(s.orders>10);assert.ok(s.coins>100);assert.ok(s.stock.kits>=0);assert.ok(s.bag.wheat+s.bag.ore<=6);ws.dispose();});
test('empty forever loop yields instead of using a synchronous jump cycle',()=>{const code=E.compile([{type:'forever'},{type:'end'}]);assert.deepEqual(code,[{type:'loop',skip:0,source:0}]);});
