# Fabbrica Automatica

[Apri il laboratorio](https://bisumto.github.io/fabbrica-automatica/)

Laboratorio in italiano per una quinta ITT: dieci sfide graduate di robotica e logica, più un mondo aperto in cui programmare una fattoria industriale. Editor **Blockly 13.3.0**, simulazioni e report PDF interamente nel browser, senza account o backend.

## Percorso

1. Il primo pick & place — coordinate e sequenze
2. Il percorso dell'AGV — orientamento e cicli
3. Block stacking — precondizioni e pianificazione
4. Lupo, capra e cavolo — invarianti di sicurezza
5. Fermati al sensore — condizioni e ostacoli
6. Smistamento sul nastro — selezione e ripetizione
7. Livello sotto controllo — attuatori e retroazione
8. Pallet in ordine — pianificazione con più passaggi
9. Incrocio sicuro — interblocchi e temporizzazioni
10. Torre di Hanoi — scomposizione del problema
11. La fabbrica infinita — coltivazione, logistica, produzione e automazione

## Il livello infinito

Il robot parte nei campi. Il grano matura in quattro tick; dopo la raccolta occorre riseminare. La miniera fornisce minerale. Lo zaino trasporta al massimo sei risorse.

- Campi: (1,4), (2,4), (1,5), (2,5).
- Miniera: (1,1).
- Magazzino: (3,3), per depositare il carico.
- Assemblatore: (5,3); due grano e un minerale in magazzino producono un kit.
- Banchina: (7,3), per consegnare la commessa.

Gli ordini richiedono 1, 2, 2, 3, 3… kit e pagano 20 crediti per kit. Non c'è un traguardo conclusivo. Si possono comprare una mietitrice (30 crediti), una trivella (50) e una linea automatica (80). Queste macchine raccolgono, alimentano il magazzino e producono mentre il tempo simulato avanza.

Ogni azione fa avanzare il tempo; uno spostamento costa la distanza percorsa in tick. Il ciclo **per sempre** può continuare finché viene messo in pausa. Anche un ciclo vuoto cede il controllo all'interfaccia, senza bloccare il browser. I sensori consentono di evitare raccolti prematuri, zaini pieni, materiali mancanti e spedizioni incomplete. L'acquisto delle macchine può richiedere di riprogettare il programma: controllare i sensori prima delle azioni.

Il mondo resta salvato cambiando sfida, modificando il programma e ricaricando la pagina. Nel livello 11 il pulsante di riavvio riparte dal primo blocco **conservando il mondo**. Nelle dieci sfide finite il riavvio ripristina la configurazione iniziale.

## Blocchi standard e funzioni

Oltre alle azioni del simulatore, tutti i livelli offrono le categorie **Controllo, Logica, Matematica, Variabili e Funzioni**. **Sensori** compare dove il mondo espone letture. Le definizioni native di Blockly possono essere rinominate e ricevere parametri tramite l’ingranaggio: i blocchi di chiamata si aggiornano automaticamente.

- I blocchi staccati e le funzioni non richiamate possono restare nell’editor come bozze, anche incomplete. Restano salvati, ma non vengono eseguiti né inclusi nei programmi del report. Basta ricollegarli per usarli.
- Le funzioni eseguono una sequenza di azioni (procedure, senza valore di ritorno). La definizione sta separata dall’avvio; il richiamo si incastra nel programma. I parametri sono locali alla chiamata; le altre variabili sono globali.
- I blocchi di movimento, attesa e spostamento dischi con ingressi numerici accettano variabili, parametri e calcoli. La libreria mostra solo queste versioni componibili: sono stati rimossi i duplicati con numeri incorporati e la condizione con sensore fisso. I vecchi blocchi restano compatibili con i salvataggi esistenti.
- Sono disponibili `finché / fino a`, ripetizioni con un valore calcolato, cicli con contatore, `se / altrimenti se / altrimenti`, confronti, `e / o / non`, aritmetica e resto della divisione.
- I sensori booleani si possono combinare. Le letture numeriche dipendono dalla sfida: posizione, livello del serbatoio, pezzi sul nastro oppure magazzino, crediti, zaino, ordini e tick della fabbrica.
- Il pannello sotto l’editor mostra le variabili durante l’esecuzione. Ripristino, modifica e nuovo avvio le azzerano; la pausa le conserva. Il mondo della fabbrica resta salvato come prima.

Esempio didattico: definire `raccogli campo(colonna, riga)` con spostamento, raccolta e semina, poi chiamarla per più campi. Nella Torre di Hanoi si possono usare funzioni ricorsive con parametri. Le chiamate annidate sono limitate a 32; i cicli vengono eseguiti un’istruzione alla volta e restano sempre interrompibili. Solo le azioni del mondo fanno avanzare il tempo: un ciclo in attesa della maturazione deve contenere anche un blocco `attendi`.

## Report e dati locali

Il pulsante **Scarica report PDF** sostituisce la guida docente. Il report include nome facoltativo, classe, esercizi completati, avvii, azioni eseguite, errori di esecuzione, migliori soluzioni registrate, ultimi programmi avviati (comprese funzioni, parametri ed espressioni) e stato della fabbrica. Le bozze sono distinte dai programmi eseguiti. Non assegna voti.

Tutti questi dati restano in `localStorage`. Nessun nome, programma o report viene inviato a un server. I salvataggi dipendono da browser e origine: il sito GitHub Pages non vede i dati di un'anteprima su localhost. La chiave del prototipo precedente è mantenuta per compatibilità sulla stessa origine. I vecchi completamenti non ricevono tentativi inventati.

## Aprire e sviluppare

La cartella `dist` contiene tutti i file da distribuire, comprese le librerie e i media locali. Non richiede una build. Per l'anteprima:

```sh
npm start
```

Aprire `http://127.0.0.1:8767`. Per verificare le simulazioni:

```sh
npm ci --ignore-scripts
npm test
```

Le verifiche coprono le dieci soluzioni, i vincoli di sicurezza, la conversione Blockly, i cicli infiniti, conservazione delle risorse, acquisti e automazioni, funzioni con parametri e ricorsione, variabili, cicli condizionali, letture e la generazione del PDF.

## Struttura

- `dist/engine.js`: simulazioni, verifiche e collegamento all’interprete.
- `dist/runtime.js`: compilatore, interprete a passi, espressioni e chiamate di funzione.
- `dist/farm.js`: economia e stato del mondo infinito.
- `dist/blockly-adapter.js`: blocchi e conversione delle sequenze.
- `dist/app.js`: interfaccia, esecuzione e salvataggio.
- `dist/report.js`: report PDF con paginazione.
- `dist/vendor`: Blockly (Apache 2.0) e jsPDF (MIT), con licenze incluse.

La pubblicazione GitHub Pages usa il contenuto di `dist` sul ramo `gh-pages`. I percorsi relativi supportano il sottopercorso della repository.

Questo è un ambiente didattico: coordinate, traiettorie e processi sono modelli semplificati e non comandano hardware Dobot reale.
