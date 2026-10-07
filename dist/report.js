(function(root){
'use strict';
function clean(value){return String(value??'').replace(/[→↦]/g,' > ').replace(/∞/g,'infinito').replace(/[“”]/g,'"').replace(/[‘’]/g,"'").replace(/[–—]/g,'-').replace(/[^\x20-\x7e\xa0-\xff\n]/g,'');}
function programLines(program){let depth=0;return (program||[]).map(a=>{if(a.type==='end'||a.type==='else')depth=Math.max(0,depth-1);const labels={move:`vai a (${a.x}, ${a.y}) ${a.mode||''}`,pick:'prendi',drop:'rilascia',cross:'attraversa '+a.cargo,forward:'avanza di 1',turn:'gira a '+a.direction,sort:'smista in '+a.bin,valve:a.value+' valvola',light:`semaforo ${a.lane}: ${a.color}`,disk:`disco da ${a.from} a ${a.to}`,wait:`attendi ${a.seconds}`,repeat:`ripeti ${a.n} volte`,if:'se '+a.sensor,else:'altrimenti',end:'fine',forever:'per sempre',farm_go:`vai a (${a.x}, ${a.y})`,farm_collect:'raccogli risorsa',farm_plant:'semina grano',farm_deposit:'scarica al magazzino',farm_craft:'produci 1 kit',farm_ship:'consegna ordine',farm_upgrade:'installa '+a.upgrade};const line='  '.repeat(depth)+(labels[a.type]||a.type);if(['repeat','if','else','forever'].includes(a.type))depth++;return line;});}
function create(jsPDF,saved,missions,date=new Date()){
 const doc=new jsPDF({unit:'mm',format:'a4'});doc.setProperties({title:'Fabbrica Automatica - Report di laboratorio',subject:'Attivita locale dello studente',creator:'Fabbrica Automatica'});let y=28;const left=18,width=174;
 const page=()=>{doc.addPage();y=24;};
 const line=(text,size=10,color=[42,58,79],bold=false)=>{doc.setFont('helvetica',bold?'bold':'normal');doc.setFontSize(size);doc.setTextColor(...color);const lines=doc.splitTextToSize(clean(text),width);for(const l of lines){if(y>276)page();doc.text(l,left,y);y+=size*.48+1;}return y;};
 const title=t=>{if(y>250)page();y+=5;line(t,13,[43,78,147],true);y+=2;};
 doc.setFillColor(20,34,55);doc.rect(0,0,210,17,'F');doc.setTextColor(255,255,255);doc.setFontSize(11);doc.text('FABBRICA AUTOMATICA / REPORT DI LABORATORIO',18,11);
 line('Il mio percorso di automazione',21,[27,44,69],true);y+=3;
 line('Studente: '+(saved.profile?.name||'Non indicato'),11);line('Classe: '+(saved.profile?.classe||'5 ITT'),11);line('Esportato: '+date.toLocaleString('it-IT',{timeZone:'Europe/Rome'}),9,[103,116,136]);
 const finite=missions.filter(m=>m.kind!=='factory');const complete=finite.filter(m=>(saved.completed||[]).includes(m.id)).length;
 title(`${complete} / ${finite.length} esercizi completati`);
 line('Dati conservati in questo browser. Le misure partono dall’introduzione del report; eventuali progressi precedenti restano indicati senza inventare tentativi o tempi.',9,[103,116,136]);
 for(const [i,m] of missions.entries()){
  const a=saved.activity?.[m.id];const done=(saved.completed||[]).includes(m.id);title(`${String(i+1).padStart(2,'0')}  ${m.title}`);
  line(m.kind==='factory'?'Mondo aperto: nessuna conclusione finale.':done?'Stato: completato':a?.attempts?'Stato: provato, da completare':'Stato: non ancora eseguito');
  if(a){line(`Avvii: ${a.attempts||0} | Azioni eseguite: ${a.actions||0} | Errori: ${a.errors||0} | Esecuzioni riuscite: ${a.successes||0}`);if(a.best!==null&&a.best!==undefined)line('Miglior soluzione: '+a.best+' azioni.');if(a.result)line('Ultimo esito: '+a.result);if(a.lastError)line('Ultimo errore registrato: '+a.lastError,9,[147,61,65]);}
 }
 if(saved.factory){const s=saved.factory;title('La fabbrica infinita - produzione');line(`Ordini consegnati: ${s.orders} | Kit spediti: ${s.shipped} | Kit prodotti: ${s.produced}`);line(`Crediti disponibili: ${s.coins} | Tick simulati: ${s.ticks} | Azioni: ${s.moves}`);line(`Magazzino: ${s.stock.wheat} grano, ${s.stock.ore} minerale, ${s.stock.kits} kit`);line('Macchine installate: '+(Object.keys(s.upgrades).filter(k=>s.upgrades[k]).map(k=>({harvester:'mietitrice',drill:'trivella',assembler:'linea automatica'})[k]).join(', ')||'nessuna'));}
 title('Programmi eseguiti più recentemente');
 let any=false;for(const m of missions){const a=saved.activity?.[m.id];if(!a?.lastProgram?.length)continue;any=true;title(m.title);line('Ultimo programma avviato (può essere incompleto o contenere errori).',9,[103,116,136]);for(const l of programLines(a.lastProgram))line(l,9);}
 if(!any)line('Nessun programma ancora avviato.');
 if(saved.currentDraft){title('Bozza corrente - '+saved.currentDraft.title);line('Questa bozza non è una prova di completamento.',9,[103,116,136]);if(saved.currentDraft.error)line(saved.currentDraft.error,9);else for(const l of programLines(saved.currentDraft.program))line(l,9);}
 title('Riflessione');line('Che cosa ho automatizzato? Quale errore mi ha aiutato a capire? Come posso rendere il programma più breve o più robusto?');
 for(let i=0;i<3;i++){y+=12;if(y>275)page();doc.setDrawColor(215,223,233);doc.line(left,y,192,y);}
 const count=doc.getNumberOfPages();for(let i=1;i<=count;i++){doc.setPage(i);doc.setFontSize(8);doc.setTextColor(115,129,147);doc.text('Fabbrica Automatica - report locale, non una valutazione automatica',18,289);doc.text(`${i} / ${count}`,192,289,{align:'right'});}
 return doc;
}
const api={create,programLines};if(typeof module!=='undefined')module.exports=api;else root.FactoryReport=api;
})(typeof window!=='undefined'?window:globalThis);
