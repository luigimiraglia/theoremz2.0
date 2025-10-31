# Script di Fix Immagini Sanity

Questo script aggiorna i link delle immagini nei documenti Sanity usando le mappature dal file CSV.

## Prerequisiti

1. **Token API Sanity**: Devi avere un token API con permessi di scrittura
   - Vai su https://www.sanity.io/manage/personal/tokens
   - Crea un nuovo token con permessi "Editor" o "Admin"

## Uso

### 1. Imposta il token API

```bash
export SANITY_API_TOKEN="il-tuo-token-qui"
```

### 2. Esegui lo script

```bash
node scripts/fix-sanity-images.mjs
```

## Cosa fa lo script

1. Legge il file `image-rename-undo-1760676828915.csv`
2. Raggruppa le modifiche per documento
3. Per ogni documento:
   - Verifica che esista
   - Controlla che il valore vecchio sia ancora presente
   - Aggiorna solo i campi che hanno il vecchio link
   - Salta i campi già aggiornati o con valori diversi
4. Fornisce un report dettagliato

## Esempio di output

```
🚀 Avvio script di aggiornamento immagini Sanity

📊 Trovate 593 mappature nel CSV

📄 Documenti da aggiornare: 127

🔍 Elaborando documento: apotema-e-numero-fisso
   ✓ Documento trovato
   🔄 Applicazione di 4 aggiornamenti...
   ✓ Aggiornato: content[6].url
      Da: https://theoremz.com/images/ap-triangolo.webp
      A:  https://theoremz.com/images/apotema-e-numero-fisso-1.webp
   ...
   ✅ Completato: 4 aggiornati, 0 saltati

============================================================
📊 RIEPILOGO FINALE
============================================================
Documenti totali:       127
Documenti aggiornati:   127
Documenti falliti:      0
Campi aggiornati:       593
Campi saltati:          0
============================================================

✅ Tutti i documenti sono stati processati con successo!
```

## Note

- Lo script fa una pausa di 100ms tra ogni documento per non sovraccaricare l'API Sanity
- Vengono aggiornati solo i campi che hanno esattamente il vecchio valore
- I campi già aggiornati o con valori diversi vengono saltati
- Ogni modifica viene loggata per tracciabilità
