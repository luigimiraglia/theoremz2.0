// scripts/test-temp-access.ts
/**
 * Script di test per il sistema di accessi temporanei
 * Esegui con: npx tsx scripts/test-temp-access.ts
 */

import { 
  hasTempAccess, 
  getTempAccessInfo, 
  getAllTempAccessEmails,
  getActiveTempAccessEmails,
  createTempAccessEntry,
  formatExpiryDate 
} from '../lib/temp-access';

console.log('🧪 Test Sistema Accessi Temporanei\n');

// Test delle email di esempio
const testEmails = [
  'test.temporaneo@example.com',
  'test.scaduto@example.com',
  'non.esistente@example.com'
];

testEmails.forEach(email => {
  console.log(`📧 Email: ${email}`);
  console.log(`   Ha accesso: ${hasTempAccess(email)}`);
  
  const info = getTempAccessInfo(email);
  if (info) {
    console.log(`   Scade: ${formatExpiryDate(info.expiresAt)}`);
    console.log(`   Motivo: ${info.reason || 'Non specificato'}`);
  } else {
    console.log(`   Nessun accesso temporaneo`);
  }
  console.log('');
});

// Test delle funzioni di utilità
console.log('📊 Statistiche:');
console.log(`   Email totali configurate: ${getAllTempAccessEmails().length}`);
console.log(`   Email con accesso attivo: ${getActiveTempAccessEmails().length}`);
console.log('');

// Test creazione nuova entry
console.log('🛠️  Generazione nuovo accesso (14 giorni):');
const newEntry = createTempAccessEntry('nuovo.utente@example.com', 14, 'Test automatico');
console.log('   Codice da aggiungere in temp-access.ts:');
console.log(`   {`);
console.log(`     email: "${newEntry.email}",`);
console.log(`     expiresAt: "${newEntry.expiresAt}",`);
console.log(`     reason: "${newEntry.reason}",`);
console.log(`     grantedAt: "${newEntry.grantedAt}"`);
console.log(`   }`);
console.log('');

console.log('✅ Test completato!');