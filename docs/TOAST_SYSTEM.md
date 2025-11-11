# Toast Notifications System

Sistema completo di notifiche toast per Theoremz, con stile coerente al design del sito.

## 🎯 Caratteristiche

- ✅ **4 tipi di notifiche**: success, error, info, warning
- ✅ **Tema chiaro/scuro**: Supporto completo dark mode
- ✅ **Animazioni fluide**: Slide-in, progress bar, hover effects
- ✅ **Auto-dismiss**: Chiusura automatica configurabile
- ✅ **Accessibilità**: ARIA labels, focus management, prefers-reduced-motion
- ✅ **TypeScript**: Completamente tipizzato
- ✅ **Performance**: Usa React Context, ottimizzato con useCallback

## 📦 Componenti

### `ToastProvider`
Wrapper che fornisce il context alle applicazioni. Va aggiunto nel layout root.

```tsx
// app/layout.tsx
import { ToastProvider } from "@/components/Toast";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html>
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
```

### `useToast` Hook
Hook per accedere alle funzioni toast da componenti client.

```tsx
"use client";
import { useToast } from "@/components/Toast";

export function MyComponent() {
  const toast = useToast();

  return (
    <button onClick={() => toast.success("Successo!", "Operazione completata")}>
      Mostra Toast
    </button>
  );
}
```

## 🚀 Uso Basico

### Success
```tsx
const { useToast } = require("@/components/Toast");
const toast = useToast();

// Versione semplice
toast.success("Salvato", "Le modifiche sono state salvate");

// Con durata personalizzata (ms)
toast.success("Salvato", "Le modifiche sono state salvate", 3000);
```

### Error
```tsx
toast.error("Errore", "Si è verificato un problema");
toast.error("Errore di validazione", "Per favore, riprova", 5000);
```

### Info
```tsx
toast.info("Informazione", "Nuovo messaggio per te");
```

### Warning
```tsx
toast.warning("Attenzione", "Stai per eliminare un elemento");
```

## 🛠️ Utilizzo Avanzato

### Con Azione
```tsx
toast.addToast({
  type: "success",
  title: "File scaricato",
  message: "Vuoi aprirlo?",
  action: {
    label: "Apri",
    onClick: () => {
      window.open("/file.pdf");
    },
  },
});
```

### Con Toast Utilities
Usa le funzioni helper predefinite per casi comuni:

```tsx
import { commonToasts } from "@/lib/toastUtils";

// Errore generico
commonToasts.genericError(toast, error);

// Successo generico
commonToasts.success(toast, "Operazione riuscita");

// Copiato negli appunti
commonToasts.copied(toast);

// Login richiesto
commonToasts.loginRequired(toast);

// Connessione offline
commonToasts.offline(toast);
```

### Con Promise
```tsx
import { executeWithToast } from "@/lib/toastUtils";

const result = await executeWithToast(
  fetchData(),
  toast,
  {
    loading: "Caricamento dati...",
    success: "Dati caricati con successo",
    error: "Errore nel caricamento dei dati",
  }
);
```

## 🎨 Stili

I toast seguono il design del sito:

### Colori per tipo
- **Success** (Emerald): Background chiaro + icona verde
- **Error** (Red): Background rosso chiaro + icona rossa
- **Warning** (Amber): Background ambrato + icona ambrata
- **Info** (Blue): Background blu chiaro + icona blu

### Light Mode
```
Success: bg-emerald-50, text-emerald-900
Error:   bg-red-50,     text-red-900
Warning: bg-amber-50,   text-amber-900
Info:    bg-blue-50,    text-blue-900
```

### Dark Mode
```
Success: bg-emerald-950/30, text-emerald-200
Error:   bg-red-950/30,     text-red-200
Warning: bg-amber-950/30,   text-amber-200
Info:    bg-blue-950/30,    text-blue-200
```

## ⏱️ Durate Predefinite

- **Success**: 4000ms (4 secondi)
- **Error**: 6000ms (6 secondi)
- **Info/Warning**: 5000ms (5 secondi)
- **Custom**: Puoi specificare qualsiasi durata

```tsx
toast.success("Titolo", "Messaggio", 10000); // 10 secondi
```

## 📍 Posizionamento

I toast appaiono in alto a destra dello schermo:
- Posizione fissa (`fixed top-4 right-4`)
- Z-index: 50 (sopra la maggior parte degli elementi)
- Responsive: Adatto a mobile, tablet, desktop

## ♿ Accessibilità

- `role="alert"` - Assistive technologies leggono i toast
- `aria-live="polite"` - Annunci non interrompono l'utente
- `aria-atomic="true"` - Tutto il contenuto viene letto
- Tasti freccia per navigazione
- Esc per chiudere
- Supporto `prefers-reduced-motion`

## 🔧 API Completa

### Context Methods

```tsx
interface ToastContextType {
  toasts: Toast[];                           // Array di toast attuali
  addToast(toast: Omit<Toast, "id">): string;      // Aggiungi toast custom, ritorna ID
  removeToast(id: string): void;             // Rimuovi toast by ID
  success(title: string, message?: string, duration?: number): string;
  error(title: string, message?: string, duration?: number): string;
  info(title: string, message?: string, duration?: number): string;
  warning(title: string, message?: string, duration?: number): string;
}
```

### Toast Object

```tsx
interface Toast {
  id: string;                           // ID unico
  type: "success" | "error" | "info" | "warning";
  title: string;                        // Titolo (obbligatorio)
  message?: string;                     // Messaggio opzionale
  duration?: number;                    // Durata in ms (default: tipo-dipendente)
  action?: {
    label: string;                      // Testo del bottone
    onClick: () => void;                // Callback on click
  };
}
```

## 💡 Esempi

### Form Submission
```tsx
"use client";
import { useToast } from "@/components/Toast";

export function LoginForm() {
  const toast = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        body: JSON.stringify({ /* form data */ }),
      });

      if (!response.ok) throw new Error("Login fallito");
      
      toast.success("Accesso effettuato", "Benvenuto!");
      // Redirect...
    } catch (error) {
      toast.error("Errore", error instanceof Error ? error.message : "Errore sconosciuto");
    }
  };

  return <form onSubmit={handleSubmit}>{/* ... */}</form>;
}
```

### File Upload
```tsx
const handleUpload = async (file: File) => {
  const loadingId = toast.info("Caricamento", "Sto caricando il file...", 30000);
  
  try {
    await uploadFile(file);
    toast.removeToast(loadingId);
    toast.success("Caricamento completato", file.name);
  } catch (error) {
    toast.removeToast(loadingId);
    toast.error("Errore di caricamento", String(error));
  }
};
```

### Copy to Clipboard
```tsx
const handleCopy = () => {
  navigator.clipboard.writeText("text-to-copy");
  toast.success("Copiato", "Testo copiato negli appunti", 2000);
};
```

## 🚨 Troubleshooting

### Toast non appare
- Verifica che `ToastProvider` sia nel layout root
- Controlla che il componente sia `"use client"`
- Assicurati di usare `useToast` dentro un componente client

### Stili non applicati
- Verifica che Tailwind CSS sia configurato correttamente
- Controlla che il file CSS globale sia importato
- Assicurati che le animazioni siano nel `globals.css`

### Animazioni veloci
- Verifica `prefers-reduced-motion` nel browser
- Controlla il valore di `duration` passato

## 📝 Note di Sviluppo

- I toast usano `requestIdleCallback` quando disponibile
- ID unici generati con `Math.random()` (adatto per la maggior parte dei casi)
- Context non persiste tra page refreshes (per design)
- Non c'è limite massimo ai toast contemporanei (considera di limitare)

## 🎯 Best Practices

1. **Titoli brevi e significativi**: Max 2-3 parole
2. **Messaggi chiari**: Spiega l'azione completata o l'errore
3. **Non abusare**: Usa toast per feedback importante
4. **Durate appropriate**: Errori più lunghi, success più brevi
5. **Azioni rilevanti**: Aggiungi azioni solo se utili
6. **Localizzazione**: Usa sempre testo in italiano

---

**Ultimo aggiornamento**: Novembre 2025
