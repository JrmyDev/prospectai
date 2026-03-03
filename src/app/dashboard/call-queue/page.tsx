"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Phone, ChevronLeft, ChevronRight, CalendarClock, Building2, MapPin, RefreshCcw } from "lucide-react";

type Prospect = {
  id: string;
  company: string;
  phone: string | null;
  city: string | null;
  sector: string | null;
  status: string;
  callStatus: string | null;
  nextCallAt: string | null;
  lastCallAt: string | null;
  analysis: {
    scoreGlobal: number;
    hasWebsite: boolean;
    websiteScore: number | null;
    googleRating: number | null;
    googleReviewsCount: number | null;
  } | null;
};

const DAILY_DEFAULT = 20;

function normalizePhone(phone: string | null) {
  if (!phone) return null;
  return phone.replace(/[^+\d]/g, "");
}

function quickHook(p: Prospect) {
  const hasWebsite = p.analysis?.hasWebsite ?? Boolean(p.analysis?.websiteScore);
  if (!hasWebsite) return "angle: réservations directes via mini-site + tunnel simple";
  if ((p.analysis?.websiteScore ?? 100) < 45) return "angle: améliorer conversion mobile + CTA réservation";
  if ((p.analysis?.googleReviewsCount ?? 0) < 25) return "angle: relance avis + réactivation clients";
  return "angle: no-show et rappel auto WhatsApp/SMS";
}

export default function CallQueuePage() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [limit, setLimit] = useState(DAILY_DEFAULT);
  const [index, setIndex] = useState(0);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [city, setCity] = useState("");
  const [onlyCallbacks, setOnlyCallbacks] = useState(false);

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      limit: "200",
      hasPhone: "true",
      excludeStatus: "non_interesse,closed_definitive",
      sortBy: "updatedAt",
      sortOrder: "desc",
    });
    if (city.trim()) params.set("city", city.trim());
    if (onlyCallbacks) params.set("callStatus", "callback");

    const res = await fetch(`/api/prospects?${params.toString()}`);
    const data = await res.json();
    const rows: Prospect[] = (data.prospects ?? [])
      .filter((p: Prospect) => Boolean(normalizePhone(p.phone)))
      .sort((a: Prospect, b: Prospect) => {
        const aCb = a.callStatus === "callback" ? 0 : 1;
        const bCb = b.callStatus === "callback" ? 0 : 1;
        if (aCb !== bCb) return aCb - bCb;

        const aDue = a.nextCallAt ? new Date(a.nextCallAt).getTime() : Number.MAX_SAFE_INTEGER;
        const bDue = b.nextCallAt ? new Date(b.nextCallAt).getTime() : Number.MAX_SAFE_INTEGER;
        if (aDue !== bDue) return aDue - bDue;

        return (b.analysis?.scoreGlobal ?? 0) - (a.analysis?.scoreGlobal ?? 0);
      })
      .slice(0, limit);

    setProspects(rows);
    setIndex(0);
    setNotes("");
    setLoading(false);
  }, [city, onlyCallbacks, limit]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const current = prospects[index] ?? null;
  const phone = normalizePhone(current?.phone ?? null);

  const progress = useMemo(() => {
    if (prospects.length === 0) return "0 / 0";
    return `${index + 1} / ${prospects.length}`;
  }, [index, prospects.length]);

  const moveNext = () => {
    setNotes("");
    setIndex((i) => Math.min(i + 1, Math.max(0, prospects.length - 1)));
  };

  const movePrev = () => {
    setNotes("");
    setIndex((i) => Math.max(i - 1, 0));
  };

  const saveOutcome = async (outcome: "no_answer" | "callback" | "reached" | "meeting_set" | "not_interested" | "voicemail") => {
    if (!current) return;
    setSaving(true);
    const payload: Record<string, unknown> = {
      outcome,
      notes,
      occurredAt: new Date().toISOString(),
    };
    if (outcome === "callback") {
      const date = new Date();
      date.setDate(date.getDate() + 2);
      date.setHours(10, 0, 0, 0);
      payload.nextCallAt = date.toISOString();
    }

    await fetch(`/api/prospects/${current.id}/call`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSaving(false);
    moveNext();
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Call Queue</h1>
        <Link href="/dashboard/prospects" className="text-sm text-blue-400 hover:underline">Voir tous les prospects</Link>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 md:p-4 flex flex-wrap items-center gap-2">
        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="Ville (optionnel)"
          className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white"
        />
        <label className="text-sm text-gray-300 flex items-center gap-2 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg">
          <input type="checkbox" checked={onlyCallbacks} onChange={(e) => setOnlyCallbacks(e.target.checked)} />
          Rappels uniquement
        </label>
        <select
          value={String(limit)}
          onChange={(e) => setLimit(Number(e.target.value))}
          className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white"
        >
          {[10, 20, 30, 50].map((n) => <option key={n} value={n}>{n} appels</option>)}
        </select>
        <button onClick={fetchQueue} className="ml-auto px-3 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm text-white flex items-center gap-2">
          <RefreshCcw className="w-4 h-4" /> Rafraîchir
        </button>
      </div>

      {loading ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-gray-400 text-center">Chargement…</div>
      ) : !current ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-gray-400 text-center">Aucun prospect appelable avec ces filtres.</div>
      ) : (
        <>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 md:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs px-2 py-1 rounded-full bg-blue-900/40 text-blue-300">{progress}</span>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                {current.callStatus && <span className="px-2 py-1 rounded-full bg-gray-800 text-gray-300">{current.callStatus}</span>}
                {current.nextCallAt && (
                  <span className="px-2 py-1 rounded-full bg-amber-900/40 text-amber-300 flex items-center gap-1">
                    <CalendarClock className="w-3 h-3" />
                    {new Date(current.nextCallAt).toLocaleString("fr-FR")}
                  </span>
                )}
              </div>
            </div>

            <div>
              <h2 className="text-xl md:text-2xl font-semibold text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-gray-400" />
                {current.company}
              </h2>
              <div className="mt-1 text-sm text-gray-400 flex flex-wrap items-center gap-3">
                {current.city && <span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{current.city}</span>}
                {current.sector && <span>{current.sector}</span>}
                <span className="text-gray-500">score: {current.analysis?.scoreGlobal ?? "—"}</span>
              </div>
            </div>

            <div className="p-3 bg-gray-800/60 rounded-lg border border-gray-700">
              <p className="text-xs text-gray-400 mb-1">Angle d’approche</p>
              <p className="text-sm text-gray-100">{quickHook(current)}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <a
                href={phone ? `tel:${phone}` : "#"}
                className={`w-full px-4 py-3 rounded-lg text-center font-medium flex items-center justify-center gap-2 ${phone ? "bg-green-600 hover:bg-green-500 text-white" : "bg-gray-700 text-gray-400 pointer-events-none"}`}
              >
                <Phone className="w-4 h-4" /> Appeler {phone ?? "(pas de numéro)"}
              </a>
              <Link href={`/dashboard/prospects/${current.id}`} className="w-full px-4 py-3 rounded-lg text-center font-medium bg-gray-800 border border-gray-700 hover:bg-gray-700 text-gray-200">
                Ouvrir la fiche complète
              </Link>
            </div>

            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes rapides (optionnel)…"
              rows={3}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-100"
            />

            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              <button disabled={saving} onClick={() => saveOutcome("no_answer")} className="px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm">Pas de réponse</button>
              <button disabled={saving} onClick={() => saveOutcome("voicemail")} className="px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm">Répondeur</button>
              <button disabled={saving} onClick={() => saveOutcome("callback")} className="px-3 py-2 rounded-lg bg-amber-700 hover:bg-amber-600 text-white text-sm">Rappel J+2</button>
              <button disabled={saving} onClick={() => saveOutcome("reached")} className="px-3 py-2 rounded-lg bg-blue-700 hover:bg-blue-600 text-white text-sm">Joint</button>
              <button disabled={saving} onClick={() => saveOutcome("meeting_set")} className="px-3 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-sm">RDV pris</button>
              <button disabled={saving} onClick={() => saveOutcome("not_interested")} className="px-3 py-2 rounded-lg bg-red-700 hover:bg-red-600 text-white text-sm">Non intéressé</button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button onClick={movePrev} disabled={index === 0} className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-300 disabled:opacity-40 flex items-center gap-2"><ChevronLeft className="w-4 h-4" /> Précédent</button>
            <button onClick={moveNext} disabled={index >= prospects.length - 1} className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-300 disabled:opacity-40 flex items-center gap-2">Suivant <ChevronRight className="w-4 h-4" /></button>
          </div>
        </>
      )}
    </div>
  );
}
