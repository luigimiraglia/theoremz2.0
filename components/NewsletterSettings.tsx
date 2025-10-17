"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "./Toast";

type NewsletterData = {
  subscribed: boolean;
  frequenza: 'daily' | 'weekly' | 'monthly';
  tipo_contenuti: string[];
  materie_interesse: string[];
};

export default function NewsletterSettings() {
  const { user } = useAuth();
  const { success, error: showError } = useToast();
  const [data, setData] = useState<NewsletterData>({
    subscribed: false,
    frequenza: 'weekly',
    tipo_contenuti: ['lezioni', 'esercizi', 'tips', 'news'], // Tutto selezionato di default
    materie_interesse: ['matematica', 'fisica'] // Solo matematica e fisica
  });
  const [loading, setLoading] = useState(false);

  // Carica stato iscrizione corrente
  useEffect(() => {
    if (!user?.uid) return;

    const fetchStatus = async () => {
      try {
        const response = await fetch(`/api/newsletter?user_id=${user.uid}`);
        if (response.ok) {
          const result = await response.json();
          if (result.subscribed && result.subscription) {
            setData({
              subscribed: true,
              frequenza: result.subscription.frequenza || 'weekly',
              tipo_contenuti: result.subscription.tipo_contenuti || ['lezioni', 'esercizi'],
              materie_interesse: result.subscription.materie_interesse || []
            });
          }
        }
      } catch (error) {
        console.error('Errore caricamento stato newsletter:', error);
      }
    };

    fetchStatus();
  }, [user?.uid]);

  const handleSubscriptionChange = async (subscribed: boolean) => {
    if (!user?.uid || !user?.email) return;

    setLoading(true);
    try {
      // Ottieni dati profilo dal localStorage o dal contesto auth
      const profileData = {
        nome: user.displayName?.split(' ')[0] || '',
        cognome: user.displayName?.split(' ').slice(1).join(' ') || '',
        classe: '', // Potresti avere questi dati nel contesto
        anno_scolastico: new Date().getFullYear().toString(),
        scuola: ''
      };

      const payload = {
        user_id: user.uid,
        email: user.email,
        subscribed,
        frequenza: data.frequenza,
        tipo_contenuti: data.tipo_contenuti,
        materie_interesse: data.materie_interesse,
        source: 'profile',
        ...profileData
      };

      const response = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        setData(prev => ({ ...prev, subscribed }));
        
        // Mostra notifica di successo
        if (subscribed) {
          success("Newsletter attivata!", "Riceverai le nostre lezioni settimanali");
        } else {
          success("Newsletter disattivata", "Non riceverai più le nostre email");
        }
      } else {
        throw new Error('Errore nell\'operazione');
      }
    } catch (error) {
      console.error('Errore newsletter:', error);
      showError("Errore", "Non è stato possibile aggiornare le preferenze. Riprova.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 [.dark_&]:border-slate-700 [.dark_&]:bg-slate-900">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 [.dark_&]:text-white">
            Newsletter Theoremz
          </h3>
          <p className="text-sm text-slate-600 [.dark_&]:text-slate-400 mt-1">
            Ricevi aggiornamenti settimanali su nuove lezioni e contenuti personalizzati
          </p>
        </div>
        
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={data.subscribed}
            disabled={loading}
            onChange={(e) => handleSubscriptionChange(e.target.checked)}
          />
          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 [.dark_&]:peer-focus:ring-blue-800 rounded-full peer [.dark_&]:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all [.dark_&]:border-slate-600 peer-checked:bg-blue-600"></div>
        </label>
      </div>

      {loading && (
        <div className="mt-4 text-sm text-slate-500 [.dark_&]:text-slate-400">
          Aggiornamento in corso...
        </div>
      )}
    </div>
  );
}