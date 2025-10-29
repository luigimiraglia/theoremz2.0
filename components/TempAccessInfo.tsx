// components/TempAccessInfo.tsx
"use client";

import { useAuth } from "@/lib/AuthContext";
import { formatExpiryDate } from "@/lib/temp-access";

export default function TempAccessInfo() {
  const { subscriptionInfo } = useAuth();

  if (!subscriptionInfo?.tempAccessInfo) return null;

  const { expiresAt, reason, grantedAt } = subscriptionInfo.tempAccessInfo;
  const expiryDate = formatExpiryDate(expiresAt);
  const grantedDate = grantedAt ? formatExpiryDate(grantedAt) : null;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg
            className="h-5 w-5 text-amber-400"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-amber-800">
            Accesso Temporaneo Attivo
          </h3>
          <div className="mt-2 text-sm text-amber-700">
            <p>
              Hai accesso temporaneo alle funzionalità premium fino al{" "}
              <span className="font-semibold">{expiryDate}</span>
            </p>
            {reason && (
              <p className="mt-1">
                <span className="font-medium">Motivo:</span> {reason}
              </p>
            )}
            {grantedDate && (
              <p className="mt-1 text-xs">
                <span className="font-medium">Concesso il:</span> {grantedDate}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
