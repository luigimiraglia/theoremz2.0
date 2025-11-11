/**
 * Esempio di Integrazione del Sistema Toast
 * 
 * Questo file mostra come integrare i toast in componenti reali
 * come form, API calls, file uploads, ecc.
 */

// ============================================
// ESEMPIO 1: Form Submission
// ============================================

import { useToast } from "@/components/Toast";
import { commonToasts } from "@/lib/toastUtils";
import { useRouter } from "next/navigation";

export function ExampleForm() {
  const toast = useToast();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    try {
      const response = await fetch("/api/submit", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Errore durante l'invio");
      }

      toast.success("Inviato", "Il modulo è stato inviato con successo");
      // Reindirizza o reset form
      setTimeout(() => router.refresh(), 1000);
    } catch (error) {
      commonToasts.genericError(toast, error);
    }
  };

  return <form onSubmit={handleSubmit}>{/* form fields */}</form>;
}

// ============================================
// EXEMPLO 2: Copia negli Appunti
// ============================================

export function CopyButton({ text }: { text: string }) {
  const toast = useToast();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      commonToasts.copied(toast);
    } catch (error) {
      toast.error("Errore", "Impossibile copiare il testo");
    }
  };

  return <button onClick={handleCopy}>Copia</button>;
}

// ============================================
// ESEMPIO 3: File Upload
// ============================================

export function FileUploader() {
  const toast = useToast();

  const handleUpload = async (file: File) => {
    if (!file) return;

    // Validazione
    if (file.size > 10 * 1024 * 1024) {
      commonToasts.validationError(toast, "File troppo grande (max 10MB)");
      return;
    }

    const loadingId = toast.info("Caricamento", `Sto caricando ${file.name}...`, 30000);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Errore di caricamento");

      toast.removeToast(loadingId);
      toast.success("Caricato", `${file.name} caricato con successo`, {
        action: {
          label: "Visualizza",
          onClick: () => {
            // Naviga al file
          },
        },
      });
    } catch (error) {
      toast.removeToast(loadingId);
      commonToasts.genericError(toast, error);
    }
  };

  return (
    <input
      type="file"
      onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) handleUpload(file);
      }}
    />
  );
}

// ============================================
// ESEMPIO 4: Gestione Autenticazione
// ============================================

export function LoginForm() {
  const toast = useToast();
  const router = useRouter();

  const handleLogin = async (email: string, password: string) => {
    if (!email || !password) {
      commonToasts.validationError(toast);
      return;
    }

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const { error } = await response.json();
        if (response.status === 401) {
          toast.error("Accesso negato", "Email o password non validi");
        } else {
          throw new Error(error || "Errore di login");
        }
        return;
      }

      toast.success("Accesso effettuato", "Benvenuto!");
      setTimeout(() => router.push("/dashboard"), 1000);
    } catch (error) {
      commonToasts.serverError(toast);
    }
  };

  return <div>{/* form */}</div>;
}

// ============================================
// ESEMPIO 5: CRUD Operations con Toast
// ============================================

export function ExampleResource() {
  const toast = useToast();

  // CREATE
  const handleCreate = async (data: any) => {
    try {
      const response = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error("Errore nella creazione");

      toast.success("Creato", "Nuovo elemento creato con successo");
    } catch (error) {
      commonToasts.genericError(toast, error);
    }
  };

  // READ (con toast di caricamento)
  const handleRead = async (id: string) => {
    const loadingId = toast.info("Caricamento", "Sto caricando i dati...", 30000);

    try {
      const response = await fetch(`/api/items/${id}`);

      if (!response.ok) throw new Error("Errore nel caricamento");

      const data = await response.json();
      toast.removeToast(loadingId);
      return data;
    } catch (error) {
      toast.removeToast(loadingId);
      toast.error("Errore", "Impossibile caricare i dati");
      return null;
    }
  };

  // UPDATE
  const handleUpdate = async (id: string, data: any) => {
    try {
      const response = await fetch(`/api/items/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error("Errore nell'aggiornamento");

      commonToasts.saved(toast);
    } catch (error) {
      commonToasts.genericError(toast, error);
    }
  };

  // DELETE
  const handleDelete = async (id: string) => {
    // Conferma prima di eliminare
    toast.warning("Attenzione", "Stai per eliminare questo elemento", {
      action: {
        label: "Elimina comunque",
        onClick: async () => {
          try {
            const response = await fetch(`/api/items/${id}`, {
              method: "DELETE",
            });

            if (!response.ok) throw new Error("Errore nell'eliminazione");

            commonToasts.deleted(toast);
          } catch (error) {
            commonToasts.genericError(toast, error);
          }
        },
      },
    });
  };

  return <div>{/* crud buttons */}</div>;
}

// ============================================
// ESEMPIO 6: Connessione Offline
// ============================================

export function OfflineHandler() {
  const toast = useToast();

  // Ascolta eventi online/offline
  const setupOfflineListener = () => {
    window.addEventListener("offline", () => {
      commonToasts.offline(toast);
    });

    window.addEventListener("online", () => {
      commonToasts.online(toast);
    });
  };

  return <div onMount={setupOfflineListener}>{/* content */}</div>;
}

// ============================================
// ESEMPIO 7: Validazione Form Avanzata
// ============================================

export function AdvancedForm() {
  const toast = useToast();

  const validateEmail = (email: string): boolean => {
    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!isValid) {
      commonToasts.validationError(toast, "Email");
    }
    return isValid;
  };

  const validatePassword = (password: string): boolean => {
    if (password.length < 8) {
      commonToasts.validationError(toast, "Password (minimo 8 caratteri)");
      return false;
    }
    return true;
  };

  const handleSubmit = (email: string, password: string) => {
    // Validazione multipla
    const validations = [
      validateEmail(email),
      validatePassword(password),
    ];

    if (!validations.every(Boolean)) {
      return;
    }

    // Procedi con il submit
    toast.success("Validazione completata", "Invio in corso...");
  };

  return <div>{/* form */}</div>;
}

// ============================================
// ESEMPIO 8: Gestione Sottoscrizione
// ============================================

export function SubscriptionGate({ children }: { children: React.ReactNode }) {
  const toast = useToast();
  const [isSubscribed, setIsSubscribed] = React.useState(false);

  const handleFeatureClick = () => {
    if (!isSubscribed) {
      commonToasts.subscriptionRequired(toast);
      return;
    }
    // Procedi con la feature
  };

  return (
    <div onClick={handleFeatureClick}>
      {children}
    </div>
  );
}

// ============================================
// EXEMPLO 9: Con Promise Wrapper
// ============================================

import { executeWithToast } from "@/lib/toastUtils";

export function DataFetcher() {
  const toast = useToast();

  const fetchLessons = async () => {
    const lessons = await executeWithToast(
      fetch("/api/lessons").then((res) => res.json()),
      toast,
      {
        loading: "Sto caricando le lezioni...",
        success: "Lezioni caricate con successo",
        error: "Errore nel caricamento delle lezioni",
      }
    );

    return lessons;
  };

  return (
    <button onClick={fetchLessons}>
      Carica Lezioni
    </button>
  );
}

// ============================================
// ESEMPIO 10: Toast con Azione Complex
// ============================================

export function UndoDelete() {
  const toast = useToast();

  const handleDelete = async (id: string, item: any) => {
    // Elimina immediatamente ma permetti l'undo
    try {
      await fetch(`/api/items/${id}`, { method: "DELETE" });

      toast.addToast({
        type: "success",
        title: `${item.name} eliminato`,
        message: "Clicca Annulla per ripristinare",
        duration: 5000,
        action: {
          label: "Annulla",
          onClick: async () => {
            // Ripristina l'elemento
            await fetch(`/api/items/${id}/restore`, { method: "POST" });
            toast.success("Ripristinato", "L'elemento è stato ripristinato");
          },
        },
      });
    } catch (error) {
      commonToasts.genericError(toast, error);
    }
  };

  return <button onClick={() => handleDelete("123", { name: "Item" })}>Elimina</button>;
}

/**
 * IMPORTANTI:
 * 
 * 1. Sempre usa "use client" nei componenti che usano hook
 * 2. Wrappa le operazioni async in try/catch
 * 3. Rimuovi i toast loading manualmente quando finisci
 * 4. Usa commonToasts per i casi comuni
 * 5. Personalizza i messaggi per il contesto dell'utente
 * 6. Non abusare - usa toast solo per feedback importante
 * 7. Scegli la durata giusta per il tipo di toast
 * 8. Usa azioni solo quando necessario e utile
 * 
 */
