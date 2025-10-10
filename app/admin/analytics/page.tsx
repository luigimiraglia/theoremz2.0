"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/AuthContext";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
} from "recharts";

type DashboardData = {
  period: { days: number; startDate: string; endDate: string };
  totals: {
    unique_visitors: number;
    total_pageviews: number;
    new_sessions: number;
    quiz_parent_clicks: number;
    quiz_student_clicks: number;
    black_page_visits: number;
    popup_clicks: number;
    conversions: number;
  };
  dailyStats: any[];
  conversionFunnel: any[];
  topPages: any[];
  sessionStats: any[];
  recentEvents: any[];
  // Nuovi dati specifici richiesti
  funnelEntries: {
    daily: { date: string; count: number }[];
    total: number;
    weeklyTrend: number;
  };
  totalVisits: {
    daily: { date: string; count: number }[];
    total: number;
    weeklyTrend: number;
  };
  blackPageVisits: {
    daily: { date: string; count: number }[];
    total: number;
    weeklyTrend: number;
  };
  mentorPageVisits: {
    daily: { date: string; count: number }[];
    total: number;
    weeklyTrend: number;
  };
  functionalityUsage: {
    daily: any[];
    weekly: any[];
    monthly: any[];
  };
  blackPageSources: {
    daily: any[];
    weekly: any[];
    monthly: any[];
  };
  // Nuovi dati business specifici
  quizMetrics: {
    startStats: {
      student: number;
      parent: number;
      total: number;
      studentPercentage: number;
      parentPercentage: number;
    };
    completionStats: {
      student: {
        started: number;
        completed: number;
        completionRate: number;
      };
      parent: {
        started: number;
        completed: number;
        completionRate: number;
      };
    };
    planClicks: {
      student: number;
      parent: number;
      total: number;
    };
  };
  activeUsers: {
    email: string;
    visit_count: number;
    last_visit: string;
  }[];
  blackUserLogs: {
    email: string;
    page_visits: number;
    last_visit: string;
    is_authenticated: number; // 1 for authenticated, 0 for anonymous
  }[];
  blackBuyMetrics: {
    totalClicks: number;
    dailyClicks: { date: string; count: number }[];
    clicksByPlan: { plan: string; price: string; clicks: number }[];
    conversionRate: number;
    pageViews: number;
  };
};

export default function AnalyticsDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);

  // Controllo accesso - solo luigi.miraglia006@gmail.com
  const hasAccess = user?.email === 'luigi.miraglia006@gmail.com';

  const fetchData = useCallback(async () => {
    if (!hasAccess || !user) return;
    setLoading(true);
    try {
      // Prova prima Firebase Auth, poi fallback ad API key
      let authHeader = '';
      
      try {
        const { auth } = await import('@/lib/firebase');
        if (auth.currentUser) {
          const token = await auth.currentUser.getIdToken();
          authHeader = `Bearer ${token}`;
        } else {
          throw new Error('No authenticated user');
        }
      } catch (authError) {
        console.warn('Firebase Auth failed, using API key fallback:', authError);
        // Fallback: usa API key per produzione
        authHeader = 'ApiKey analytics_luigi_2024';
      }

      const response = await fetch(`/api/analytics/dashboard?days=${days}`, {
        headers: {
          'Authorization': authHeader
        }
      });
      const result = await response.json();
      if (result.success) {
        setData(result);
      }
    } catch (error) {
      console.error("Errore caricamento dashboard:", error);
    } finally {
      setLoading(false);
    }
  }, [days, hasAccess, user]);

  useEffect(() => {
    fetchData();
  }, [days, fetchData]);

  // Controllo accesso - UI immediata per utenti non autorizzati
  if (!authLoading && !hasAccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Accesso Negato</h2>
          <p className="text-gray-600 mb-4">Non hai i permessi per accedere a questa pagina.</p>
          <p className="text-sm text-gray-500">Solo l&apos;amministratore può visualizzare le analytics.</p>
        </div>
      </div>
    );
  }

  // Loading dell'autenticazione
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 max-w-md text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-50 rounded-full mb-4">
            <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full"></div>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Verifica Accesso</h3>
          <p className="text-gray-500">Controlliamo i tuoi permessi...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <h1 className="text-2xl font-semibold text-gray-900">Analytics</h1>
            <p className="text-sm text-gray-500 mt-1">
              Caricamento in corso...
            </p>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-50 rounded-full mb-4">
              <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full"></div>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Caricamento dati
            </h3>
            <p className="text-gray-500">
              Attendere mentre recuperiamo le statistiche...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <h1 className="text-2xl font-semibold text-gray-900">Analytics</h1>
            <p className="text-sm text-gray-500 mt-1">Errore nel caricamento</p>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-50 rounded-full mb-4">
              <svg
                className="w-6 h-6 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Errore di caricamento
            </h3>
            <p className="text-gray-500 mb-6">
              Non è stato possibile recuperare i dati analytics.
            </p>
            <button
              onClick={fetchData}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Riprova
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                Analytics
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Dal {data.period.startDate} al {data.period.endDate}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex bg-gray-100 rounded-lg p-1">
                {[7, 14, 30].map((d) => (
                  <button
                    key={d}
                    onClick={() => setDays(d)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                      days === d
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    {d}d
                  </button>
                ))}
              </div>
              <button
                onClick={fetchData}
                className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                <svg
                  className="w-4 h-4 mr-1.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Aggiorna
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Metriche centrali richieste - Funnel, Visite, Black, Mentor */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Entrate Funnel /start
                </p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {data.funnelEntries?.total?.toLocaleString() || "0"}
                </p>
                <p
                  className={`text-xs font-medium mt-1 ${
                    (data.funnelEntries?.weeklyTrend || 0) >= 0
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {(data.funnelEntries?.weeklyTrend || 0) >= 0 ? "+" : ""}
                  {(data.funnelEntries?.weeklyTrend || 0).toFixed(1)}% vs
                  periodo precedente
                </p>
              </div>
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Visite Totali Sito
                </p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {data.totalVisits?.total?.toLocaleString() || "0"}
                </p>
                <p
                  className={`text-xs font-medium mt-1 ${
                    (data.totalVisits?.weeklyTrend || 0) >= 0
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {(data.totalVisits?.weeklyTrend || 0) >= 0 ? "+" : ""}
                  {(data.totalVisits?.weeklyTrend || 0).toFixed(1)}% vs periodo
                  precedente
                </p>
              </div>
              <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Visite Pagina Black
                </p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {data.blackPageVisits?.total?.toLocaleString() || "0"}
                </p>
                <p
                  className={`text-xs font-medium mt-1 ${
                    (data.blackPageVisits?.weeklyTrend || 0) >= 0
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {(data.blackPageVisits?.weeklyTrend || 0) >= 0 ? "+" : ""}
                  {(data.blackPageVisits?.weeklyTrend || 0).toFixed(1)}% vs
                  periodo precedente
                </p>
              </div>
              <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-purple-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Visite Pagina Mentor
                </p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {data.mentorPageVisits?.total?.toLocaleString() || "0"}
                </p>
                <p
                  className={`text-xs font-medium mt-1 ${
                    (data.mentorPageVisits?.weeklyTrend || 0) >= 0
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {(data.mentorPageVisits?.weeklyTrend || 0) >= 0 ? "+" : ""}
                  {(data.mentorPageVisits?.weeklyTrend || 0).toFixed(1)}% vs
                  periodo precedente
                </p>
              </div>
              <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-orange-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Grafici Trend Giornalieri */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Funnel Entries Trend */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">
                Entrate Funnel /start
              </h3>
              <p className="text-sm text-gray-500">
                Andamento giornaliero delle prime visite al funnel
              </p>
            </div>
            <div className="p-6">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.funnelEntries?.daily || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#3B82F6"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Total Visits Trend */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">
                Visite Totali Sito
              </h3>
              <p className="text-sm text-gray-500">
                Andamento giornaliero di tutte le visite
              </p>
            </div>
            <div className="p-6">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.totalVisits?.daily || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#10B981"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Black Page Visits Trend */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">
                Visite Pagina Black
              </h3>
              <p className="text-sm text-gray-500">
                Andamento giornaliero visite alla pagina Black
              </p>
            </div>
            <div className="p-6">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.blackPageVisits?.daily || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#8B5CF6"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Mentor Page Visits Trend */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">
                Visite Pagina Mentor
              </h3>
              <p className="text-sm text-gray-500">
                Andamento giornaliero visite alla pagina Mentor
              </p>
            </div>
            <div className="p-6">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.mentorPageVisits?.daily || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#F59E0B"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* Funnel conversioni e Analytics - Design Stripe */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Funnel Conversioni */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">
                Funnel conversioni
              </h3>
              <p className="text-sm text-gray-500">
                Dal click iniziale alla conversione
              </p>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-orange-50 to-orange-100/50 rounded-lg border border-orange-200">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                      1
                    </div>
                    <span className="ml-3 text-sm font-medium text-gray-900">
                      Quiz Genitore
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-orange-600">
                      {data.totals.quiz_parent_clicks}
                    </div>
                    <div className="text-xs text-orange-600">
                      click iniziali
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-green-100/50 rounded-lg border border-green-200">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                      2
                    </div>
                    <span className="ml-3 text-sm font-medium text-gray-900">
                      Quiz Studente
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-green-600">
                      {data.totals.quiz_student_clicks}
                    </div>
                    <div className="text-xs text-green-600">engagement</div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-purple-100/50 rounded-lg border border-purple-200">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                      3
                    </div>
                    <span className="ml-3 text-sm font-medium text-gray-900">
                      Pagine Black
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-purple-600">
                      {data.totals.black_page_visits}
                    </div>
                    <div className="text-xs text-purple-600">
                      interesse alto
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-blue-100/50 rounded-lg border border-blue-200">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                      4
                    </div>
                    <span className="ml-3 text-sm font-medium text-gray-900">
                      Click Popup
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-blue-600">
                      {data.totals.popup_clicks}
                    </div>
                    <div className="text-xs text-blue-600">conversioni</div>
                  </div>
                </div>
              </div>

              {/* Tasso conversione */}
              <div className="mt-6 pt-4 border-t border-gray-100">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">
                    Tasso conversione complessivo
                  </span>
                  <span className="text-lg font-bold text-gray-900">
                    {data.totals.unique_visitors > 0
                      ? (
                          (data.totals.popup_clicks /
                            data.totals.unique_visitors) *
                          100
                        ).toFixed(2)
                      : 0}
                    %
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Top Pagine */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">
                Top pagine
              </h3>
              <p className="text-sm text-gray-500">
                Pagine più visitate nel periodo
              </p>
            </div>
            <div className="divide-y divide-gray-100">
              {data.topPages.slice(0, 8).map((page: any, idx: number) => (
                <div
                  key={idx}
                  className="px-6 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center min-w-0 flex-1">
                      <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-xs font-medium text-gray-600 mr-3">
                        {idx + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {page.page_path || "/"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4 ml-4">
                      <div className="text-right">
                        <div className="text-sm font-semibold text-gray-900">
                          {page.visits}
                        </div>
                        <div className="text-xs text-gray-500">visite</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-blue-600">
                          {page.unique_visitors}
                        </div>
                        <div className="text-xs text-gray-500">unici</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Eventi e Breakdown popup - Design Stripe */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Eventi Frequenti */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">
                Eventi più frequenti
              </h3>
              <p className="text-sm text-gray-500">
                Attività utenti nel periodo selezionato
              </p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {data.recentEvents.map((event: any, idx: number) => (
                  <div
                    key={idx}
                    className="bg-gray-50 rounded-lg p-4 text-center hover:bg-gray-100 transition-colors"
                  >
                    <div className="text-xl font-bold text-gray-900">
                      {event.count}
                    </div>
                    <div className="text-xs text-gray-600 mt-1 capitalize">
                      {event.event_name.replace("_", " ")}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Breakdown Popup Click */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">
                Click popup
              </h3>
              <p className="text-sm text-gray-500">Per funzionalità</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                  <span className="text-sm font-medium text-gray-900">
                    Esercizi
                  </span>
                </div>
                <span className="text-sm font-bold text-blue-600">
                  {data.conversionFunnel
                    .filter((c) => c.conversion_type.includes("exercise"))
                    .reduce((sum, c) => sum + c.count, 0)}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-emerald-500 rounded-full mr-2"></div>
                  <span className="text-sm font-medium text-gray-900">
                    Flashcards
                  </span>
                </div>
                <span className="text-sm font-bold text-emerald-600">
                  {data.conversionFunnel
                    .filter((c) => c.conversion_type.includes("flashcard"))
                    .reduce((sum, c) => sum + c.count, 0)}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-orange-500 rounded-full mr-2"></div>
                  <span className="text-sm font-medium text-gray-900">
                    Formulario
                  </span>
                </div>
                <span className="text-sm font-bold text-orange-600">
                  {data.conversionFunnel
                    .filter((c) => c.conversion_type.includes("formulario"))
                    .reduce((sum, c) => sum + c.count, 0)}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-purple-500 rounded-full mr-2"></div>
                  <span className="text-sm font-medium text-gray-900">
                    Appunti
                  </span>
                </div>
                <span className="text-sm font-bold text-purple-600">
                  {data.conversionFunnel
                    .filter((c) => c.conversion_type.includes("appunti"))
                    .reduce((sum, c) => sum + c.count, 0)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Utilizzo Funzionalità per Periodo */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">
              Utilizzo Funzionalità
            </h3>
            <p className="text-sm text-gray-500">
              Persone che hanno usato ogni funzionalità
            </p>
          </div>
          <div className="p-6">
            {/* Toggle per periodo */}
            <div className="flex space-x-1 bg-gray-100 rounded-lg p-1 mb-6 w-fit">
              {["daily", "weekly", "monthly"].map((period) => (
                <button
                  key={period}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                    true
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  {period === "daily"
                    ? "Giornaliero"
                    : period === "weekly"
                      ? "Settimanale"
                      : "Mensile"}
                </button>
              ))}
            </div>

            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.functionalityUsage?.daily || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill="#3B82F6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Sorgenti Pagina Black */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">
              Sorgenti Pagina Black
            </h3>
            <p className="text-sm text-gray-500">
              Da quali popup arrivano gli utenti sulla pagina Black
            </p>
          </div>
          <div className="p-6">
            {/* Toggle per periodo */}
            <div className="flex space-x-1 bg-gray-100 rounded-lg p-1 mb-6 w-fit">
              {["daily", "weekly", "monthly"].map((period) => (
                <button
                  key={period}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                    true
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  {period === "daily"
                    ? "Giornaliero"
                    : period === "weekly"
                      ? "Settimanale"
                      : "Mensile"}
                </button>
              ))}
            </div>

            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.blackPageSources?.daily || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill="#8B5CF6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Quiz & Business Metrics */}
        {data.quizMetrics && (
          <>
            {/* Quiz Start Statistics */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-8">
              <div className="px-6 py-4 border-b border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900">
                  Quiz Start Statistics
                </h3>
                <p className="text-sm text-gray-500">
                  Percentuale di persone che scelgono start studente vs start
                  genitore
                </p>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-600 mb-1">
                      Studente
                    </h4>
                    <div className="text-2xl font-bold text-blue-600">
                      {data.quizMetrics.startStats.student}
                    </div>
                    <div className="text-sm text-gray-500">
                      {data.quizMetrics.startStats.studentPercentage}% del
                      totale
                    </div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-600 mb-1">
                      Genitore
                    </h4>
                    <div className="text-2xl font-bold text-green-600">
                      {data.quizMetrics.startStats.parent}
                    </div>
                    <div className="text-sm text-gray-500">
                      {data.quizMetrics.startStats.parentPercentage}% del totale
                    </div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-600 mb-1">
                      Totale
                    </h4>
                    <div className="text-2xl font-bold text-gray-900">
                      {data.quizMetrics.startStats.total}
                    </div>
                    <div className="text-sm text-gray-500">quiz avviati</div>
                  </div>
                </div>

                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          {
                            name: "Studente",
                            value: data.quizMetrics.startStats.student,
                            fill: "#3B82F6",
                          },
                          {
                            name: "Genitore",
                            value: data.quizMetrics.startStats.parent,
                            fill: "#10B981",
                          },
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({
                          name,
                          percent,
                        }: {
                          name: string;
                          percent: number;
                        }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      ></Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Quiz Completion Rates */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-8">
              <div className="px-6 py-4 border-b border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900">
                  Quiz Completion Rates
                </h3>
                <p className="text-sm text-gray-500">
                  Quanti completano il quiz rispetto a quanti lo iniziano
                </p>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-blue-600 mb-3">
                      Studente
                    </h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Iniziati:</span>
                        <span className="font-semibold">
                          {data.quizMetrics.completionStats.student.started}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">
                          Completati:
                        </span>
                        <span className="font-semibold">
                          {data.quizMetrics.completionStats.student.completed}
                        </span>
                      </div>
                      <div className="flex justify-between border-t pt-2">
                        <span className="text-sm font-medium text-gray-900">
                          Tasso completamento:
                        </span>
                        <span className="font-bold text-blue-600">
                          {
                            data.quizMetrics.completionStats.student
                              .completionRate
                          }
                          %
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-green-600 mb-3">
                      Genitore
                    </h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Iniziati:</span>
                        <span className="font-semibold">
                          {data.quizMetrics.completionStats.parent.started}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">
                          Completati:
                        </span>
                        <span className="font-semibold">
                          {data.quizMetrics.completionStats.parent.completed}
                        </span>
                      </div>
                      <div className="flex justify-between border-t pt-2">
                        <span className="text-sm font-medium text-gray-900">
                          Tasso completamento:
                        </span>
                        <span className="font-bold text-green-600">
                          {
                            data.quizMetrics.completionStats.parent
                              .completionRate
                          }
                          %
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        {
                          name: "Studente",
                          iniziati:
                            data.quizMetrics.completionStats.student.started,
                          completati:
                            data.quizMetrics.completionStats.student.completed,
                        },
                        {
                          name: "Genitore",
                          iniziati:
                            data.quizMetrics.completionStats.parent.started,
                          completati:
                            data.quizMetrics.completionStats.parent.completed,
                        },
                      ]}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="iniziati" fill="#E5E7EB" name="Iniziati" />
                      <Bar
                        dataKey="completati"
                        fill="#3B82F6"
                        name="Completati"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Plan Clicks */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-8">
              <div className="px-6 py-4 border-b border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900">
                  Plan Clicks
                </h3>
                <p className="text-sm text-gray-500">
                  Click sul piano assegnato dopo il completamento del quiz
                </p>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-600 mb-1">
                      Piano Studente
                    </h4>
                    <div className="text-2xl font-bold text-blue-600">
                      {data.quizMetrics.planClicks.student}
                    </div>
                    <div className="text-sm text-gray-500">click</div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-600 mb-1">
                      Piano Genitore
                    </h4>
                    <div className="text-2xl font-bold text-green-600">
                      {data.quizMetrics.planClicks.parent}
                    </div>
                    <div className="text-sm text-gray-500">click</div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-600 mb-1">
                      Totale
                    </h4>
                    <div className="text-2xl font-bold text-gray-900">
                      {data.quizMetrics.planClicks.total}
                    </div>
                    <div className="text-sm text-gray-500">click</div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Active Users Breakdown */}
        {data.activeUsers && data.activeUsers.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-8">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">
                Utenti Più Attivi
              </h3>
              <p className="text-sm text-gray-500">
                Breakdown utenti più attivi per email
              </p>
            </div>
            <div className="p-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-600">
                        Email
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">
                        Visite
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">
                        Ultima Visita
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.activeUsers.slice(0, 10).map((user, index) => (
                      <tr
                        key={index}
                        className="border-b border-gray-100 hover:bg-gray-50"
                      >
                        <td className="py-3 px-4 text-sm text-gray-900">
                          {user.email}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-900">
                          {user.visit_count}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-500">
                          {new Date(user.last_visit).toLocaleDateString(
                            "it-IT"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Black Users Log */}
        {data.blackUserLogs && data.blackUserLogs.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-8">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">
                Visitatori Pagina Black
              </h3>
              <p className="text-sm text-gray-500">
                Tutti gli utenti che hanno visitato la pagina Black (autenticati e anonimi)
              </p>
              <div className="flex items-center gap-4 mt-2 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-gray-600">Utenti con email</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                  <span className="text-gray-600">Utenti anonimi</span>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-600">
                        Utente
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">
                        Visite Pagina
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">
                        Ultima Visita
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.blackUserLogs.slice(0, 20).map((log, index) => (
                      <tr
                        key={index}
                        className={`border-b border-gray-100 hover:bg-gray-50 ${log.is_authenticated ? 'bg-blue-50' : ''}`}
                      >
                        <td className="py-3 px-4 text-sm">
                          <div className="flex items-center gap-2">
                            {log.is_authenticated ? (
                              <>
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                <span className="text-gray-900 font-medium">{log.email}</span>
                              </>
                            ) : (
                              <>
                                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                                <span className="text-gray-600 italic">{log.email}</span>
                              </>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-900">
                          {log.page_visits}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-500">
                          {new Date(log.last_visit).toLocaleDateString("it-IT")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Black Buy Clicks Metrics */}
        {data.blackBuyMetrics && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-8">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">Buy Clicks Pagina Black</h3>
              <p className="text-sm text-gray-500">Click sui bottoni di acquisto e percentuale di conversione</p>
            </div>
            <div className="p-6">
              {/* Metriche principali */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-600 mb-1">Visite Pagina</h4>
                  <div className="text-2xl font-bold text-blue-600">{data.blackBuyMetrics.pageViews}</div>
                  <div className="text-sm text-gray-500">visitatori unici</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-600 mb-1">Buy Clicks</h4>
                  <div className="text-2xl font-bold text-green-600">{data.blackBuyMetrics.totalClicks}</div>
                  <div className="text-sm text-gray-500">click totali</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-600 mb-1">Tasso Conversione</h4>
                  <div className="text-2xl font-bold text-purple-600">{data.blackBuyMetrics.conversionRate}%</div>
                  <div className="text-sm text-gray-500">click/visite</div>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-600 mb-1">Piani Più Cliccati</h4>
                  <div className="text-2xl font-bold text-orange-600">
                    {data.blackBuyMetrics.clicksByPlan.length > 0 ? data.blackBuyMetrics.clicksByPlan[0].plan || 'N/A' : 'N/A'}
                  </div>
                  <div className="text-sm text-gray-500">piano top</div>
                </div>
              </div>

              {/* Grafico trend giornaliero */}
              <div className="mb-6">
                <h4 className="text-lg font-medium text-gray-900 mb-4">Trend Buy Clicks Giornaliero</h4>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.blackBuyMetrics.dailyClicks}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="count" stroke="#10B981" strokeWidth={2} name="Buy Clicks" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Breakdown per piano */}
              {data.blackBuyMetrics.clicksByPlan.length > 0 && (
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Breakdown per Piano</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 font-medium text-gray-600">Piano</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-600">Prezzo</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-600">Click</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-600">% del Totale</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.blackBuyMetrics.clicksByPlan.map((plan, index) => {
                          const percentage = data.blackBuyMetrics.totalClicks > 0 
                            ? Math.round((plan.clicks / data.blackBuyMetrics.totalClicks) * 100) 
                            : 0;
                          return (
                            <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="py-3 px-4 text-sm text-gray-900">{plan.plan || 'N/A'}</td>
                              <td className="py-3 px-4 text-sm text-gray-900">€{plan.price || 'N/A'}</td>
                              <td className="py-3 px-4 text-sm text-gray-900">{plan.clicks}</td>
                              <td className="py-3 px-4 text-sm text-gray-500">{percentage}%</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer con aggiorna dati */}
        <div className="text-center py-8">
          <div className="inline-flex items-center space-x-2 text-xs text-gray-500 mb-4">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>
              Ultimo aggiornamento: {new Date().toLocaleString("it-IT")}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
