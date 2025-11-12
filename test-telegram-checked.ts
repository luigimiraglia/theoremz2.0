/**
 * Test Script per il Bot Telegram - Comando /checked
 * 
 * Uso:
 * npx ts-node test-telegram-checked.ts
 */

const TG_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "YOUR_BOT_TOKEN";
const CHAT_ID = process.env.TEST_CHAT_ID || "YOUR_CHAT_ID";

async function sendTestMessage() {
  const TG = `https://api.telegram.org/bot${TG_BOT_TOKEN}`;

  // Test 1: Simple HTML message
  console.log("📤 Test 1: Invio messaggio HTML semplice...");
  const res1 = await fetch(`${TG}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: CHAT_ID,
      text: "✅ Contatto registrato per <b>Emma Rossi</b>\nUltimo contatto: 11/11/2025 14:30\nReadiness: 95/100",
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
  });
  const data1 = await res1.json();
  console.log("Risultato:", data1.ok ? "✅ OK" : `❌ ERRORE: ${data1.description}`);

  // Test 2: HTML message con caratteri speciali nel nome
  console.log("\n📤 Test 2: Messaggio con caratteri speciali...");
  const res2 = await fetch(`${TG}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: CHAT_ID,
      text: "✅ Contatto registrato per <b>François D&apos;Ambrosio</b>\nUltimo contatto: 11/11/2025 14:30\nReadiness: 95/100",
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
  });
  const data2 = await res2.json();
  console.log("Risultato:", data2.ok ? "✅ OK" : `❌ ERRORE: ${data2.description}`);

  // Test 3: Markdown con backtick (DOVREBBE FALLIRE)
  console.log("\n📤 Test 3: Messaggio Markdown con backtick (test negativo)...");
  const res3 = await fetch(`${TG}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: CHAT_ID,
      text: "Uso: `/checked email@example.com [nota]` oppure `/checked cognome [nota]`",
      parse_mode: "Markdown",
      disable_web_page_preview: true,
    }),
  });
  const data3 = await res3.json();
  console.log("Risultato:", data3.ok ? "✅ OK (inaspettato)" : `❌ ERRORE ATTESO: ${data3.description}`);

  // Test 4: Plain text senza formatting
  console.log("\n📤 Test 4: Messaggio plain text (nessun parse_mode)...");
  const res4 = await fetch(`${TG}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: CHAT_ID,
      text: "✅ Contatto registrato per Emma Rossi",
      disable_web_page_preview: true,
    }),
  });
  const data4 = await res4.json();
  console.log("Risultato:", data4.ok ? "✅ OK" : `❌ ERRORE: ${data4.description}`);
}

sendTestMessage().catch(console.error);
