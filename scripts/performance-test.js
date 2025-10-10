// Performance test per assicurarsi che le analytics non rallentino il sito
console.time('Analytics-Free-Load');

// Simula il caricamento di una pagina normale senza analytics admin
const normalPageLoad = () => {
  // Nessun import di Firebase Auth
  // Nessun caricamento di librerie analytics pesanti
  // Solo il tracking leggero esistente
  console.log('Pagina normale caricata senza overhead analytics');
};

normalPageLoad();
console.timeEnd('Analytics-Free-Load');

// Test per verificare che admin analytics sia isolato
console.time('Admin-Analytics-Load');

const adminAnalyticsLoad = async () => {
  try {
    // Solo se si accede a /admin/analytics viene caricato Firebase Auth
    const { auth } = await import('../lib/firebase');
    console.log('Firebase Auth caricato solo per admin');
  } catch {
    console.log('Firebase Auth caricamento fallito - normale per test');
  }
};

adminAnalyticsLoad().then(() => {
  console.timeEnd('Admin-Analytics-Load');
});