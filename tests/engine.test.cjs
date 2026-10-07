const {test}=require('node:test');
const assert=require('node:assert/strict');
const E=require('../dist/engine.js');
test('river: seven crossings move everyone right',()=>{
 let s=E.initial('river');
 for(const cargo of ['capra','solo','lupo','capra','cavolo','solo','capra']) s=E.act('river',s,{type:'cross',cargo});
 assert.equal(E.won('river',s),true);
});
test('river: rejects unsafe departure and absent cargo',()=>{
 assert.throws(()=>E.act('river',E.initial('river'),{type:'cross',cargo:'lupo'}),/capra/i);
 const s=E.act('river',E.initial('river'),{type:'cross',cargo:'capra'});
 assert.throws(()=>E.act('river',s,{type:'cross',cargo:'lupo'}),/sponda/i);
});
test('robot: cannot pick a covered cube or release in midair',()=>{
 let s=E.initial('stack');
 assert.throws(()=>E.act('stack',s,{type:'move',x:1,y:2,mode:'jump'}),/occupata/i);
 s=E.act('stack',s,{type:'move',x:1,y:3,mode:'jump'});
 s=E.act('stack',s,{type:'pick'});
 s=E.act('stack',s,{type:'move',x:3,y:4,mode:'jump'});
 assert.throws(()=>E.act('stack',s,{type:'drop'}),/appoggio/i);
});
test('all ten sample programs solve their actual simulations',()=>{
 assert.equal(E.missions.length,11);
 for(const m of E.missions.filter(m=>m.kind!=='factory')){
  let s=E.initial(m.id), p=E.compile(E.solution(m.id)), pc=0, guard=0;
  while(pc<p.length && guard++<1000){const a=p[pc];if(a.type==='jump'){pc=a.skip;continue;}if(a.type==='if'){pc=E.condition(m.id,s,a.sensor)?pc+1:a.skip;continue;}s=E.act(m.id,s,a);pc++;}
  assert.ok(guard<1000,m.id);assert.equal(E.won(m.id,s),true,m.id);
 }
});
test('control flow: reject unmatched blocks and cap expansion',()=>{
 assert.throws(()=>E.compile([{type:'repeat',n:3}]),/fine/i);
 assert.throws(()=>E.compile([{type:'end'}]),/apertura/i);
 assert.throws(()=>E.compile([{type:'repeat',n:100},{type:'repeat',n:100},{type:'wait'},{type:'end'},{type:'end'}]),/limite/i);
});

test('empty nested loops cannot freeze the browser',()=>{assert.throws(()=>E.compile([{type:'repeat',n:100},{type:'repeat',n:100},{type:'repeat',n:100},{type:'end'},{type:'end'},{type:'end'}]),/Limite/);});
test('missions progress from basic to advanced',()=>{assert.equal(E.missions[0].id,'pickplace');assert.equal(E.missions.at(-1).id,'factory');assert.ok(E.missions.every((m,i,a)=>i===0||m.level>=a[i-1].level));});
