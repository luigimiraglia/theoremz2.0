"use client";

import { useToast } from "@/components/Toast";
import { commonToasts } from "@/lib/toastUtils";

/**
 * Componente di demo per il sistema di toast notifications
 * Mostra tutti i tipi di toast e come usarli
 */
export function ToastDemo() {
  const toast = useToast();

  return (
    <div className="space-y-6 p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold">Toast Notifications Demo</h1>

      {/* Toast di successo */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Success Toasts</h2>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => toast.success("Salvato", "Le modifiche sono state salvate")}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Successo Semplice
          </button>
          <button
            onClick={() => toast.success("Operazione Completata", "Il file è stato caricato con successo", 3000)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Successo Breve
          </button>
          <button
            onClick={() => commonToasts.copied(toast)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Copiato
          </button>
          <button
            onClick={() => commonToasts.saved(toast)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Salvato
          </button>
        </div>
      </section>

      {/* Toast di errore */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Error Toasts</h2>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => toast.error("Errore", "Si è verificato un errore durante il salvataggio")}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Errore Generico
          </button>
          <button
            onClick={() => commonToasts.genericError(toast, new Error("Errore di connessione"))}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Errore Catturato
          </button>
          <button
            onClick={() => commonToasts.validationError(toast, "Email")}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Validazione Fallita
          </button>
          <button
            onClick={() => commonToasts.serverError(toast)}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Errore Server
          </button>
        </div>
      </section>

      {/* Toast di info */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Info Toasts</h2>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => toast.info("Informazione", "Hai un nuovo messaggio")}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Info Semplice
          </button>
          <button
            onClick={() => commonToasts.loginRequired(toast)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Login Richiesto
          </button>
          <button
            onClick={() => toast.info("Caricamento", "Sto elaborando i dati...", 10000)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Caricamento
          </button>
          <button
            onClick={() => commonToasts.subscriptionRequired(toast)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Sottoscrizione Richiesta
          </button>
        </div>
      </section>

      {/* Toast di warning */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Warning Toasts</h2>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => toast.warning("Attenzione", "Stai per eliminare questo elemento")}
            className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Warning Semplice
          </button>
          <button
            onClick={() => commonToasts.offline(toast)}
            className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Offline (Non auto-chiude)
          </button>
          <button
            onClick={() => commonToasts.timeout(toast)}
            className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Timeout
          </button>
          <button
            onClick={() => commonToasts.permissionDenied(toast)}
            className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Permesso Negato
          </button>
        </div>
      </section>

      {/* Toast con Azioni */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Toast con Azioni</h2>
        <button
          onClick={() =>
            toast.addToast({
              type: "success",
              title: "File scaricato",
              message: "Desideri aprire il file?",
              action: {
                label: "Apri",
                onClick: () => alert("Apertura file..."),
              },
            })
          }
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          Toast con Azione
        </button>
      </section>

      {/* Stack di Toast */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Stack di Toast</h2>
        <button
          onClick={() => {
            for (let i = 1; i <= 3; i++) {
              setTimeout(() => {
                toast.info(`Notifica ${i}`, `Questo è il toast numero ${i}`);
              }, i * 300);
            }
          }}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          Mostra 3 Toast in Sequenza
        </button>
      </section>

      {/* Note */}
      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 rounded-lg p-4">
        <p className="text-sm text-blue-900 dark:text-blue-200">
          💡 <strong>Nota:</strong> Apri la console per vedere gli ID dei toast. I toast scompaiono automaticamente
          dopo la durata specificata (success: 4s, error: 6s, info/warning: 5s).
        </p>
      </div>
    </div>
  );
}
