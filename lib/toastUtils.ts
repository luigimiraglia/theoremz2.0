/**
 * Toast Notification Utilities
 *
 * Questo file contiene helper functions per usare il sistema di toast
 * in modo semplice e coerente in tutta l'applicazione.
 */

/**
 * Tipo per le opzioni personalizzate
 */
export interface ToastOptions {
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * Crea un toast di successo
 */
export const toastSuccess = (
  toast: any,
  title: string,
  message?: string,
  options?: ToastOptions
) => {
  return toast.success(title, message, options?.duration);
};

/**
 * Crea un toast di errore
 */
export const toastError = (
  toast: any,
  title: string,
  message?: string,
  options?: ToastOptions
) => {
  return toast.error(title, message, options?.duration);
};

/**
 * Crea un toast di info
 */
export const toastInfo = (
  toast: any,
  title: string,
  message?: string,
  options?: ToastOptions
) => {
  return toast.info(title, message, options?.duration);
};

/**
 * Crea un toast di warning
 */
export const toastWarning = (
  toast: any,
  title: string,
  message?: string,
  options?: ToastOptions
) => {
  return toast.warning(title, message, options?.duration);
};

/**
 * Helper per errori comuni
 */
export const commonToasts = {
  /**
   * Toast generico di errore con messaggio predefinito
   */
  genericError: (toast: any, error?: Error | string) => {
    const message = error instanceof Error ? error.message : String(error);
    return toast.error(
      "Errore",
      message || "Si è verificato un errore imprevisto",
      { duration: 6000 }
    );
  },

  /**
   * Toast di successo generica
   */
  success: (toast: any, message = "Operazione completata") => {
    return toast.success("Successo", message, { duration: 4000 });
  },

  /**
   * Toast per operazione in corso
   */
  loading: (toast: any, message = "Caricamento...") => {
    return toast.info("In corso", message, { duration: 30000 });
  },

  /**
   * Toast per salvataggio
   */
  saved: (toast: any) => {
    return toast.success("Salvato", "Le modifiche sono state salvate", {
      duration: 4000,
    });
  },

  /**
   * Toast per eliminazione
   */
  deleted: (toast: any) => {
    return toast.success("Eliminato", "L'elemento è stato eliminato", {
      duration: 4000,
    });
  },

  /**
   * Toast per connessione internet persa
   */
  offline: (toast: any) => {
    return toast.warning(
      "Connessione offline",
      "Controlla la tua connessione internet",
      { duration: 0 } // non auto-chiude
    );
  },

  /**
   * Toast per torna online
   */
  online: (toast: any) => {
    return toast.success("Connessione ripristinata", undefined, {
      duration: 3000,
    });
  },

  /**
   * Toast per copia negli appunti
   */
  copied: (toast: any) => {
    return toast.success("Copiato", "Copiato negli appunti", {
      duration: 2000,
    });
  },

  /**
   * Toast per autenticazione richiesta
   */
  loginRequired: (toast: any) => {
    return toast.info("Accesso richiesto", "Effettua l'accesso per continuare");
  },

  /**
   * Toast per sottoscrizione richiesta
   */
  subscriptionRequired: (toast: any) => {
    return toast.warning(
      "Sottoscrizione richiesta",
      "Questa funzionalità è disponibile solo per i sottoscritti"
    );
  },

  /**
   * Toast per validazione fallita
   */
  validationError: (toast: any, field?: string) => {
    const message = field
      ? `Per favore, verifica il campo: ${field}`
      : "Per favore, verifica i dati inseriti";
    return toast.error("Errore di validazione", message);
  },

  /**
   * Toast per timeout
   */
  timeout: (toast: any) => {
    return toast.error(
      "Timeout",
      "La richiesta ha impiegato troppo tempo. Riprova."
    );
  },

  /**
   * Toast per permessi negati
   */
  permissionDenied: (toast: any) => {
    return toast.error(
      "Permesso negato",
      "Non hai i permessi per eseguire questa azione"
    );
  },

  /**
   * Toast per risorsa non trovata
   */
  notFound: (toast: any) => {
    return toast.error(
      "Non trovato",
      "La risorsa che stai cercando non esiste"
    );
  },

  /**
   * Toast per server error
   */
  serverError: (toast: any) => {
    return toast.error(
      "Errore del server",
      "Si è verificato un errore sul server. Riprova più tardi."
    );
  },
};

/**
 * Wrapper per promise con toast
 */
export async function executeWithToast<T>(
  promise: Promise<T>,
  toast: any,
  messages: {
    loading?: string;
    success?: string;
    error?: string;
  } = {}
): Promise<T | null> {
  const loadingToastId = messages.loading
    ? toast.info("In corso", messages.loading, { duration: 30000 })
    : null;

  try {
    const result = await promise;

    if (loadingToastId) {
      toast.removeToast(loadingToastId);
    }

    if (messages.success) {
      toast.success("Successo", messages.success);
    }

    return result;
  } catch (error) {
    if (loadingToastId) {
      toast.removeToast(loadingToastId);
    }

    const errorMessage =
      error instanceof Error ? error.message : "Errore sconosciuto";
    toast.error(messages.error || "Errore", errorMessage);
    return null;
  }
}
