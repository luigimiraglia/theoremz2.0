// components/TempAccessAdmin.tsx
"use client";

import { useState } from "react";
import {
  getAllTempAccessEmails,
  getActiveTempAccessEmails,
  formatExpiryDate,
  createTempAccessEntry,
  type TempAccessEntry,
} from "@/lib/temp-access";

export default function TempAccessAdmin() {
  const [allEmails] = useState<TempAccessEntry[]>(getAllTempAccessEmails());
  const [activeEmails] = useState<TempAccessEntry[]>(
    getActiveTempAccessEmails()
  );

  const [newEmail, setNewEmail] = useState("");
  const [newDays, setNewDays] = useState(14);
  const [newReason, setNewReason] = useState("");

  const generateNewEntry = () => {
    if (!newEmail.trim()) return;

    const entry = createTempAccessEntry(
      newEmail,
      newDays,
      newReason || undefined
    );

    // Copia il codice negli appunti
    const code = `{
  email: "${entry.email}",
  expiresAt: "${entry.expiresAt}",
  reason: "${entry.reason || "Accesso temporaneo"}",
  grantedAt: "${entry.grantedAt}"
}`;

    navigator.clipboard.writeText(code);
    alert(
      "Codice copiato negli appunti! Aggiungilo manualmente al file temp-access.ts"
    );

    // Reset form
    setNewEmail("");
    setNewDays(14);
    setNewReason("");
  };

  const now = new Date();

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">
        Gestione Accessi Temporanei
      </h2>

      {/* Form per generare nuovo accesso */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-medium mb-3">Genera Nuovo Accesso</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="email@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Giorni
            </label>
            <input
              type="number"
              value={newDays}
              onChange={(e) => setNewDays(parseInt(e.target.value) || 14)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="1"
              max="365"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Motivo (opzionale)
            </label>
            <input
              type="text"
              value={newReason}
              onChange={(e) => setNewReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Trial, Demo, ecc."
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={generateNewEntry}
              disabled={!newEmail.trim()}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Genera Codice
            </button>
          </div>
        </div>
      </div>

      {/* Lista accessi attivi */}
      <div className="mb-6">
        <h3 className="text-lg font-medium mb-3 text-green-700">
          Accessi Attivi ({activeEmails.length})
        </h3>
        {activeEmails.length === 0 ? (
          <p className="text-gray-500 italic">
            Nessun accesso temporaneo attivo
          </p>
        ) : (
          <div className="space-y-2">
            {activeEmails.map((entry, index) => {
              const expiresAt = new Date(entry.expiresAt);
              const daysLeft = Math.ceil(
                (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
              );

              return (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg"
                >
                  <div>
                    <span className="font-medium text-green-800">
                      {entry.email}
                    </span>
                    {entry.reason && (
                      <span className="ml-2 text-sm text-green-600">
                        ({entry.reason})
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-green-700">
                      {daysLeft > 0
                        ? `${daysLeft} giorni rimanenti`
                        : "Scade oggi"}
                    </div>
                    <div className="text-xs text-green-600">
                      Scade: {formatExpiryDate(entry.expiresAt)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Lista tutti gli accessi (inclusi scaduti) */}
      <div>
        <h3 className="text-lg font-medium mb-3 text-gray-700">
          Tutti gli Accessi ({allEmails.length})
        </h3>
        {allEmails.length === 0 ? (
          <p className="text-gray-500 italic">
            Nessun accesso temporaneo configurato
          </p>
        ) : (
          <div className="space-y-2">
            {allEmails.map((entry, index) => {
              const expiresAt = new Date(entry.expiresAt);
              const isExpired = now > expiresAt;
              const daysLeft = Math.ceil(
                (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
              );

              return (
                <div
                  key={index}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    isExpired
                      ? "bg-red-50 border-red-200"
                      : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <div>
                    <span
                      className={`font-medium ${isExpired ? "text-red-800" : "text-gray-800"}`}
                    >
                      {entry.email}
                    </span>
                    {entry.reason && (
                      <span
                        className={`ml-2 text-sm ${isExpired ? "text-red-600" : "text-gray-600"}`}
                      >
                        ({entry.reason})
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <div
                      className={`text-sm font-medium ${isExpired ? "text-red-700" : "text-gray-700"}`}
                    >
                      {isExpired ? "SCADUTO" : `${daysLeft} giorni rimanenti`}
                    </div>
                    <div
                      className={`text-xs ${isExpired ? "text-red-600" : "text-gray-600"}`}
                    >
                      {isExpired ? "Scaduto" : "Scade"}:{" "}
                      {formatExpiryDate(entry.expiresAt)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Istruzioni */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="font-medium text-blue-800 mb-2">Come usare:</h4>
        <ol className="text-sm text-blue-700 space-y-1">
          <li>1. Compila il form sopra con email, giorni e motivo</li>
          <li>
            2. Clicca &quot;Genera Codice&quot; per copiare il codice negli
            appunti
          </li>
          <li>
            3. Incolla il codice nell&apos;array TEMP_ACCESS_EMAILS in
            lib/temp-access.ts
          </li>
          <li>
            4. Fai il deploy o riavvia l&apos;app per applicare le modifiche
          </li>
        </ol>
      </div>
    </div>
  );
}
