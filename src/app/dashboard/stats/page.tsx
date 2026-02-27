"use client";

import { useState, useEffect } from "react";
import { Loader2, TrendingUp, Users, Mail, Globe, BarChart3 } from "lucide-react";

interface Stats {
  funnel: {
    scraped: number;
    analyzed: number;
    siteGenerated: number;
    emailSent: number;
    replied: number;
  };
  bySource: { source: string; _count: { id: number } }[];
  bySector: { sector: string; _count: { id: number } }[];
  byCity: { city: string; _count: { id: number } }[];
  emails: {
    total: number;
    draft: number;
    approved: number;
    sent: number;
    replied: number;
    bounced: number;
  };
  recentJobs: {
    id: string;
    type: string;
    status: string;
    resultsCount: number;
    createdAt: string;
  }[];
}

export default function StatsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const res = await fetch("/api/stats");
      if (res.ok) setStats(await res.json());
      setLoading(false);
    };
    fetchStats();
  }, []);

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Chargement...
      </div>
    );
  }

  const funnelSteps = [
    { label: "Scrapés", value: stats.funnel.scraped, color: "bg-blue-500", icon: Users },
    { label: "Analysés", value: stats.funnel.analyzed, color: "bg-indigo-500", icon: BarChart3 },
    { label: "Site généré", value: stats.funnel.siteGenerated, color: "bg-purple-500", icon: Globe },
    { label: "Email envoyé", value: stats.funnel.emailSent, color: "bg-green-500", icon: Mail },
    { label: "Répondu", value: stats.funnel.replied, color: "bg-emerald-500", icon: TrendingUp },
  ];

  const maxFunnel = Math.max(...funnelSteps.map((s) => s.value), 1);

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Statistiques</h1>

      {/* Funnel */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-4">Funnel de conversion</h2>
        <div className="space-y-3">
          {funnelSteps.map((step) => {
            const Icon = step.icon;
            const pct = Math.round((step.value / maxFunnel) * 100);
            return (
              <div key={step.label} className="flex items-center gap-3">
                <Icon className="w-5 h-5 text-gray-400 shrink-0" />
                <span className="text-sm text-gray-300 w-32 shrink-0">{step.label}</span>
                <div className="flex-1 bg-gray-800 rounded-full h-8 relative overflow-hidden">
                  <div
                    className={`h-full ${step.color} rounded-full transition-all duration-500`}
                    style={{ width: `${Math.max(pct, 2)}%` }}
                  />
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white">
                    {step.value}
                  </span>
                </div>
                {step.value > 0 && funnelSteps[0].value > 0 && (
                  <span className="text-xs text-gray-500 w-12 text-right">
                    {Math.round((step.value / funnelSteps[0].value) * 100)}%
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* By Source */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3">Par source</h3>
          <div className="space-y-2">
            {stats.bySource.length === 0 ? (
              <p className="text-sm text-gray-500">Aucune donnée</p>
            ) : (
              stats.bySource.map((item) => (
                <div key={item.source} className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">{item.source.replace(/_/g, " ")}</span>
                  <span className="text-sm font-medium text-white">{item._count.id}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* By Sector */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3">Par secteur</h3>
          <div className="space-y-2">
            {stats.bySector.length === 0 ? (
              <p className="text-sm text-gray-500">Aucune donnée</p>
            ) : (
              stats.bySector.slice(0, 8).map((item) => (
                <div key={item.sector} className="flex items-center justify-between">
                  <span className="text-sm text-gray-300 truncate">{item.sector || "—"}</span>
                  <span className="text-sm font-medium text-white">{item._count.id}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* By City */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3">Par ville</h3>
          <div className="space-y-2">
            {stats.byCity.length === 0 ? (
              <p className="text-sm text-gray-500">Aucune donnée</p>
            ) : (
              stats.byCity.slice(0, 8).map((item) => (
                <div key={item.city} className="flex items-center justify-between">
                  <span className="text-sm text-gray-300 truncate">{item.city || "—"}</span>
                  <span className="text-sm font-medium text-white">{item._count.id}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Email Stats */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-4">Emails</h2>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          {[
            { label: "Total", value: stats.emails.total, color: "text-white" },
            { label: "Brouillons", value: stats.emails.draft, color: "text-yellow-400" },
            { label: "Approuvés", value: stats.emails.approved, color: "text-blue-400" },
            { label: "Envoyés", value: stats.emails.sent, color: "text-green-400" },
            { label: "Réponses", value: stats.emails.replied, color: "text-purple-400" },
            { label: "Rejetés", value: stats.emails.bounced, color: "text-red-400" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-gray-500">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Jobs */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Derniers jobs de scraping</h2>
        <div className="space-y-2">
          {stats.recentJobs.length === 0 ? (
            <p className="text-sm text-gray-500">Aucun job</p>
          ) : (
            stats.recentJobs.map((job) => (
              <div key={job.id} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                <div className="flex items-center gap-3">
                  <span className={`w-2 h-2 rounded-full ${
                    job.status === "completed" ? "bg-green-400" :
                    job.status === "running" ? "bg-blue-400 animate-pulse" :
                    "bg-red-400"
                  }`} />
                  <span className="text-sm text-gray-300">{job.type.replace(/_/g, " ")}</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>{job.resultsCount} résultats</span>
                  <span>{new Date(job.createdAt).toLocaleDateString("fr-FR")}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
