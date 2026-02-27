"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Globe, MapPin, Phone, Mail, Star, Zap,
  FileCode, Send, ExternalLink, Building2, Calendar, Eye,
} from "lucide-react";
import Link from "next/link";

interface Prospect {
  id: string;
  company: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  sector: string | null;
  source: string;
  siteUrl: string | null;
  googleMapsUrl: string | null;
  linkedinUrl: string | null;
  siret: string | null;
  revenue: string | null;
  companyCreatedAt: string | null;
  status: string;
  callStatus: string | null;
  nextCallAt: string | null;
  lastCallAt: string | null;
  emailStatus: string | null;
  analysis: {
    scoreGlobal: number;
    hasWebsite: boolean;
    websiteScore: number | null;
    websiteScorePerf: number | null;
    websiteScoreSeo: number | null;
    websiteScoreDesign: number | null;
    websiteScoreMobile: number | null;
    googleRating: number | null;
    googleReviewsCount: number | null;
    googleBusinessOptimized: boolean;
    socialPresence: string | null;
    servicesRecommended: string | null;
  } | null;
  generatedSite: {
    id: string;
    vercelUrl: string | null;
    status: string;
    templateUsed: string | null;
  } | null;
  emails: {
    id: string;
    subject: string;
    body: string;
    status: string;
    sentAt: string | null;
    createdAt: string;
  }[];
  events: {
    id: string;
    type: string;
    message: string | null;
    metadata: string | null;
    createdAt: string;
  }[];
}

export default function ProspectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [prospect, setProspect] = useState<Prospect | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [emailStatusUpdating, setEmailStatusUpdating] = useState(false);
  const [callOutcome, setCallOutcome] = useState("no_answer");
  const [callDurationSec, setCallDurationSec] = useState<number | "">("");
  const [callNotes, setCallNotes] = useState("");
  const [callNextAt, setCallNextAt] = useState("");
  const [noteText, setNoteText] = useState("");

  const fetchProspect = async () => {
    const res = await fetch(`/api/prospects/${id}`);
    if (res.ok) setProspect(await res.json());
    setLoading(false);
  };

  useEffect(() => { fetchProspect(); }, [id]);

  const handleAction = async (action: string) => {
    setActionLoading(action);
    try {
      let endpoint = "";
      let body = {};

      switch (action) {
        case "analyze":
          endpoint = "/api/analysis/score";
          body = { prospectId: id };
          break;
        case "generate_site":
          endpoint = "/api/generate/website";
          body = { prospectId: id };
          break;
        case "deploy_site":
          endpoint = "/api/generate/deploy";
          body = { prospectId: id };
          break;
        case "generate_email":
          endpoint = "/api/generate/email";
          body = { prospectId: id };
          break;
        case "generate_phone_script":
          endpoint = "/api/generate/phone-script";
          body = { prospectId: id };
          break;
        case "log_call":
          endpoint = `/api/prospects/${id}/call`;
          body = {
            outcome: callOutcome,
            durationSec: callDurationSec || null,
            notes: callNotes,
            nextCallAt: callNextAt || null,
          };
          break;
        case "add_note":
          endpoint = `/api/prospects/${id}/note`;
          body = { note: noteText };
          break;
      }

      await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      await fetchProspect();
      if (action === "add_note") setNoteText("");
      if (action === "log_call") {
        setCallNotes("");
        setCallDurationSec("");
        setCallOutcome("no_answer");
        setCallNextAt("");
      }
    } finally {
      setActionLoading("");
    }
  };

  const handleSendEmail = async (emailId: string) => {
    if (!confirm("Envoyer cet email ?")) return;
    setActionLoading("send_email");
    await fetch("/api/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emailId }),
    });
    await fetchProspect();
    setActionLoading("");
  };

  const handleStatusChange = async (nextStatus: string) => {
    setStatusUpdating(true);
    await fetch(`/api/prospects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    await fetchProspect();
    setStatusUpdating(false);
  };

  const handleEmailStatusChange = async (nextStatus: string) => {
    setEmailStatusUpdating(true);
    await fetch(`/api/prospects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emailStatus: nextStatus }),
    });
    await fetchProspect();
    setEmailStatusUpdating(false);
  };

  if (loading) return <div className="text-gray-400">Chargement...</div>;
  if (!prospect) return <div className="text-gray-400">Prospect non trouvé</div>;

  const services = prospect.analysis?.servicesRecommended
    ? JSON.parse(prospect.analysis.servicesRecommended)
    : [];
  const social = prospect.analysis?.socialPresence
    ? JSON.parse(prospect.analysis.socialPresence)
    : {};
  const events = prospect.events || [];

  const formatEventType = (type: string) => {
    switch (type) {
      case "prospect_created":
        return "Prospect créé";
      case "contact_updated":
        return "Coordonnées mises à jour";
      case "status_changed":
        return "Statut modifié";
      case "analysis_run":
        return "Analyse exécutée";
      case "website_generated":
        return "Site généré";
      case "website_deployed":
        return "Site déployé";
      case "email_generated":
        return "Email généré";
      case "email_sent":
        return "Email envoyé";
      case "phone_script_generated":
        return "Script téléphonique généré";
      case "call_logged":
        return "Appel téléphonique";
      case "note_added":
        return "Note";
      case "email_status_changed":
        return "Statut email modifié";
      default:
        return type;
    }
  };

  const phoneScriptEvent = events.find((e) => e.type === "phone_script_generated");
  let phoneScript = "";
  let phoneScriptMeta: Record<string, any> | null = null;
  try {
    phoneScriptMeta = phoneScriptEvent?.metadata ? JSON.parse(phoneScriptEvent.metadata) : null;
    phoneScript = phoneScriptMeta?.script || "";
  } catch {
    phoneScript = "";
  }

  const ScoreBar = ({ label, value }: { label: string; value: number | null }) => (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-gray-400">{label}</span>
        <span className={value != null ? (value >= 70 ? "text-green-400" : value >= 40 ? "text-yellow-400" : "text-red-400") : "text-gray-600"}>
          {value ?? "—"}/100
        </span>
      </div>
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            (value ?? 0) >= 70 ? "bg-green-500" : (value ?? 0) >= 40 ? "bg-yellow-500" : "bg-red-500"
          }`}
          style={{ width: `${value ?? 0}%` }}
        />
      </div>
    </div>
  );

  return (
    <div>
      {/* Header */}
      <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Retour
      </button>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">{prospect.company}</h1>
          <div className="flex items-center gap-3 mt-1 text-sm text-gray-400">
            {prospect.sector && <span>{prospect.sector}</span>}
            {prospect.city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{prospect.city}</span>}
            {prospect.source && <span className="text-xs px-2 py-0.5 bg-gray-800 rounded">{prospect.source.replace(/_/g, " ")}</span>}
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <Link
            href={`/dashboard/proposals?prospectId=${prospect.id}`}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm rounded-lg"
          >
            Proposition PDF
          </Link>
          <select
            value={prospect.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            disabled={statusUpdating}
            className="px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-sm text-gray-300 focus:outline-none"
          >
            <option value="new">Nouveau</option>
            <option value="contacted">Contacté</option>
            <option value="analyzed">Analysé</option>
            <option value="site_generated">Site généré</option>
            <option value="email_sent">Email envoyé</option>
            <option value="replied">Répondu</option>
            <option value="converted">Converti</option>
            <option value="non_interesse">Non intéressé</option>
            <option value="closed_definitive">Fermé définitivement</option>
          </select>
          <select
            value={prospect.emailStatus || ""}
            onChange={(e) => handleEmailStatusChange(e.target.value)}
            disabled={emailStatusUpdating}
            className="px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-sm text-gray-300 focus:outline-none"
          >
            <option value="">Email (non défini)</option>
            <option value="to_send">À envoyer</option>
            <option value="sent">Envoyé</option>
            <option value="replied">Répondu</option>
            <option value="bounced">Bounce</option>
            <option value="not_needed">Non nécessaire</option>
          </select>
          <button onClick={() => handleAction("analyze")} disabled={!!actionLoading}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm rounded-lg flex items-center gap-2">
            <Zap className={`w-4 h-4 ${actionLoading === "analyze" ? "animate-pulse" : ""}`} />
            Analyser
          </button>
          {!prospect.siteUrl && (
            <button onClick={() => handleAction("generate_site")} disabled={!!actionLoading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm rounded-lg flex items-center gap-2">
              <FileCode className={`w-4 h-4 ${actionLoading === "generate_site" ? "animate-pulse" : ""}`} />
              Générer site
            </button>
          )}
          <button onClick={() => handleAction("generate_email")} disabled={!!actionLoading}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white text-sm rounded-lg flex items-center gap-2">
            <Mail className={`w-4 h-4 ${actionLoading === "generate_email" ? "animate-pulse" : ""}`} />
            Générer email
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Info */}
        <div className="space-y-6">
          {/* Contact */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-gray-400 uppercase mb-4">Contact</h2>
            <div className="space-y-3">
              {(prospect.firstName || prospect.lastName) && (
                <div className="flex items-center gap-2 text-gray-300">
                  <Building2 className="w-4 h-4 text-gray-500" />
                  {prospect.firstName} {prospect.lastName}
                </div>
              )}
              {prospect.phone && (
                <a href={`tel:${prospect.phone}`} className="flex items-center gap-2 text-gray-300 hover:text-blue-400">
                  <Phone className="w-4 h-4 text-gray-500" />{prospect.phone}
                </a>
              )}
              {prospect.email && (
                <a href={`mailto:${prospect.email}`} className="flex items-center gap-2 text-gray-300 hover:text-blue-400">
                  <Mail className="w-4 h-4 text-gray-500" />{prospect.email}
                </a>
              )}
              {prospect.address && (
                <div className="flex items-center gap-2 text-gray-300">
                  <MapPin className="w-4 h-4 text-gray-500" />{prospect.address}
                </div>
              )}
              {prospect.siteUrl && (
                <a href={prospect.siteUrl} target="_blank" rel="noopener" className="flex items-center gap-2 text-blue-400 hover:underline">
                  <Globe className="w-4 h-4" />{new URL(prospect.siteUrl).hostname}
                </a>
              )}
              {prospect.siret && (
                <div className="flex items-center gap-2 text-gray-300 text-xs">
                  <span className="text-gray-500">SIRET:</span>{prospect.siret}
                </div>
              )}
              {prospect.companyCreatedAt && (
                <div className="flex items-center gap-2 text-gray-300 text-xs">
                  <Calendar className="w-4 h-4 text-gray-500" />Créée le {prospect.companyCreatedAt}
                </div>
              )}
            </div>
          </div>

          {/* Links */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-gray-400 uppercase mb-4">Liens</h2>
            <div className="space-y-2">
              {prospect.googleMapsUrl && (
                <a href={prospect.googleMapsUrl} target="_blank" rel="noopener" className="flex items-center gap-2 text-sm text-blue-400 hover:underline">
                  <ExternalLink className="w-3 h-3" />Google Maps
                </a>
              )}
              {prospect.linkedinUrl && (
                <a href={prospect.linkedinUrl} target="_blank" rel="noopener" className="flex items-center gap-2 text-sm text-blue-400 hover:underline">
                  <ExternalLink className="w-3 h-3" />LinkedIn
                </a>
              )}
            </div>
          </div>

          {/* Services recommandés */}
          {services.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h2 className="text-sm font-semibold text-gray-400 uppercase mb-4">Services recommandés</h2>
              <div className="space-y-3">
                {services.map((s: { name: string; priority: string; reason: string }, i: number) => (
                  <div key={i} className="p-3 bg-gray-800/50 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-white">{s.name}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                        s.priority === "high" ? "bg-red-900/50 text-red-400" :
                        s.priority === "medium" ? "bg-yellow-900/50 text-yellow-400" :
                        "bg-gray-700 text-gray-400"
                      }`}>{s.priority}</span>
                    </div>
                    <p className="text-xs text-gray-400">{s.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Script téléphonique */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-400 uppercase">Script téléphonique</h2>
              <button
                onClick={() => handleAction("generate_phone_script")}
                disabled={!!actionLoading}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs rounded-lg"
              >
                {actionLoading === "generate_phone_script" ? "Génération..." : "Générer"}
              </button>
            </div>
            {phoneScript ? (
              <div className="text-sm text-gray-200 whitespace-pre-wrap">{phoneScript}</div>
            ) : (
              <p className="text-sm text-gray-500">Aucun script généré pour le moment.</p>
            )}
          </div>

          {/* Log appel */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-400 uppercase">Ajouter un appel</h2>
              <button
                onClick={() => handleAction("log_call")}
                disabled={!!actionLoading}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs rounded-lg"
              >
                {actionLoading === "log_call" ? "Ajout..." : "Enregistrer"}
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3">
              <select
                value={callOutcome}
                onChange={(e) => setCallOutcome(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200"
              >
                <option value="no_answer">Pas de réponse</option>
                <option value="voicemail">Répondeur</option>
                <option value="reached">A eu la personne</option>
                <option value="meeting_set">RDV pris</option>
                <option value="not_interested">Pas intéressé</option>
              </select>
              <input
                type="datetime-local"
                value={callNextAt}
                onChange={(e) => setCallNextAt(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200"
              />
              <input
                type="number"
                min={0}
                placeholder="Durée (secondes)"
                value={callDurationSec}
                onChange={(e) => setCallDurationSec(e.target.value ? Number(e.target.value) : "")}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200"
              />
              <textarea
                placeholder="Notes sur l'appel"
                value={callNotes}
                onChange={(e) => setCallNotes(e.target.value)}
                rows={3}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200"
              />
            </div>
          </div>

          {/* Note */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-400 uppercase">Ajouter une note</h2>
              <button
                onClick={() => handleAction("add_note")}
                disabled={!!actionLoading || !noteText.trim()}
                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs rounded-lg"
              >
                {actionLoading === "add_note" ? "Ajout..." : "Enregistrer"}
              </button>
            </div>
            <textarea
              placeholder="Note libre sur le prospect"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              rows={3}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 w-full"
            />
          </div>

          {/* Historique */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-gray-400 uppercase mb-4">Historique</h2>
            {events.length === 0 ? (
              <p className="text-sm text-gray-500">Aucun événement</p>
            ) : (
              <div className="space-y-3">
                {events.slice(0, 20).map((ev) => {
                  let meta: Record<string, any> | null = null;
                  try { meta = ev.metadata ? JSON.parse(ev.metadata) : null; } catch { meta = null; }
                  const changes = Array.isArray(meta?.changes) ? meta?.changes : [];
                  const note = typeof meta?.note === "string" ? meta.note : "";
                  const outcome = typeof meta?.outcome === "string" ? meta.outcome : "";
                  const duration = typeof meta?.durationSec === "number" ? meta.durationSec : null;
                  const callNotes = typeof meta?.notes === "string" ? meta.notes : "";
                  return (
                    <div key={ev.id} className="p-3 bg-gray-800/50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-white">{formatEventType(ev.type)}</span>
                        <span className="text-xs text-gray-500">
                          {new Date(ev.createdAt).toLocaleString("fr-FR")}
                        </span>
                      </div>
                      {ev.message && <div className="text-xs text-gray-400 mt-1">{ev.message}</div>}
                      {changes.length > 0 && (
                        <div className="mt-2 text-xs text-gray-400 space-y-1">
                          {changes.map((c: any, i: number) => (
                            <div key={i}>
                              {c.field}: {c.from || "—"} → {c.to || "—"}
                            </div>
                          ))}
                        </div>
                      )}
                      {note && (
                        <div className="mt-2 text-xs text-gray-300 whitespace-pre-wrap">{note}</div>
                      )}
                      {(outcome || duration != null || callNotes) && (
                        <div className="mt-2 text-xs text-gray-400 space-y-1">
                          {outcome && <div>Résultat: {outcome.replace(/_/g, " ")}</div>}
                          {duration != null && <div>Durée: {duration}s</div>}
                          {callNotes && <div>Notes: {callNotes}</div>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Middle Column - Analysis */}
        <div className="space-y-6">
          {/* Global Score */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center">
            <h2 className="text-sm font-semibold text-gray-400 uppercase mb-4">Score global</h2>
            <div className={`text-5xl font-bold ${
              (prospect.analysis?.scoreGlobal ?? 0) >= 70 ? "text-green-400" :
              (prospect.analysis?.scoreGlobal ?? 0) >= 40 ? "text-yellow-400" : "text-red-400"
            }`}>
              {prospect.analysis?.scoreGlobal ?? "—"}
            </div>
            <p className="text-sm text-gray-500 mt-1">/100</p>
            {(prospect.analysis?.scoreGlobal ?? 100) < 40 && (
              <p className="text-xs text-orange-400 mt-2">🔥 Hot lead — opportunité forte</p>
            )}
          </div>

          {/* Detailed Scores */}
          {prospect.analysis && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h2 className="text-sm font-semibold text-gray-400 uppercase mb-4">Scores détaillés</h2>
              <div className="space-y-4">
                <ScoreBar label="Performance" value={prospect.analysis.websiteScorePerf} />
                <ScoreBar label="SEO" value={prospect.analysis.websiteScoreSeo} />
                <ScoreBar label="Design" value={prospect.analysis.websiteScoreDesign} />
                <ScoreBar label="Mobile" value={prospect.analysis.websiteScoreMobile} />
                <ScoreBar label="Site web (global)" value={prospect.analysis.websiteScore} />
              </div>
            </div>
          )}

          {/* Google Business */}
          {prospect.analysis?.googleRating && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h2 className="text-sm font-semibold text-gray-400 uppercase mb-4">Fiche Google</h2>
              <div className="flex items-center gap-3 mb-3">
                <Star className="w-5 h-5 text-yellow-400" />
                <span className="text-2xl font-bold text-white">{prospect.analysis.googleRating}</span>
                <span className="text-sm text-gray-400">({prospect.analysis.googleReviewsCount} avis)</span>
              </div>
              <div className={`text-xs px-2 py-1 rounded-full inline-block ${
                prospect.analysis.googleBusinessOptimized ? "bg-green-900/50 text-green-400" : "bg-red-900/50 text-red-400"
              }`}>
                {prospect.analysis.googleBusinessOptimized ? "✓ Optimisée" : "✗ Non optimisée"}
              </div>
            </div>
          )}

          {/* Social */}
          {Object.keys(social).length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h2 className="text-sm font-semibold text-gray-400 uppercase mb-4">Réseaux sociaux</h2>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(social).map(([platform, present]) => (
                  <div key={platform} className={`p-2 rounded-lg text-center text-xs ${
                    present ? "bg-green-900/30 text-green-400" : "bg-gray-800 text-gray-500"
                  }`}>
                    {platform} {present ? "✓" : "✗"}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Generated Site + Emails */}
        <div className="space-y-6">
          {/* Generated Site */}
          {prospect.generatedSite && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h2 className="text-sm font-semibold text-gray-400 uppercase mb-4">Site généré</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    prospect.generatedSite.status === "deployed" ? "bg-green-900/50 text-green-400" : "bg-yellow-900/50 text-yellow-400"
                  }`}>{prospect.generatedSite.status}</span>
                  <span className="text-xs text-gray-500">{prospect.generatedSite.templateUsed}</span>
                </div>
                {prospect.generatedSite.vercelUrl && (
                  <a href={prospect.generatedSite.vercelUrl} target="_blank" rel="noopener"
                    className="block text-sm text-blue-400 hover:underline">
                    {prospect.generatedSite.vercelUrl}
                  </a>
                )}
                <Link href={`/dashboard/preview/${prospect.id}`}
                  className="block border border-gray-700 rounded-lg overflow-hidden group relative cursor-pointer">
                  <iframe
                    src={`/api/generate/website?prospectId=${prospect.id}`}
                    className="w-full h-48 bg-white pointer-events-none"
                    title="Preview"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 text-sm text-white bg-blue-600 px-4 py-2 rounded-lg shadow-lg">
                      <Eye className="w-4 h-4" /> Prévisualiser
                    </span>
                  </div>
                </Link>
                <div className="flex gap-2">
                  <Link href={`/dashboard/preview/${prospect.id}`}
                    className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg text-center flex items-center justify-center gap-1.5">
                    <Eye className="w-4 h-4" /> Prévisualiser
                  </Link>
                  {prospect.generatedSite.status === "draft" && (
                    <button onClick={() => handleAction("deploy_site")} disabled={!!actionLoading}
                      className="flex-1 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-sm rounded-lg">
                      {actionLoading === "deploy_site" ? "Déploiement..." : "🚀 Déployer"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Emails */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-gray-400 uppercase mb-4">
              Emails ({prospect.emails.length})
            </h2>
            {prospect.emails.length === 0 ? (
              <p className="text-sm text-gray-500">Aucun email généré</p>
            ) : (
              <div className="space-y-3">
                {prospect.emails.map((email) => (
                  <div key={email.id} className="p-3 bg-gray-800/50 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-white truncate">{email.subject}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                        email.status === "sent" ? "bg-green-900/50 text-green-400" :
                        email.status === "draft" ? "bg-gray-700 text-gray-400" :
                        email.status === "approved" ? "bg-blue-900/50 text-blue-400" :
                        "bg-orange-900/50 text-orange-400"
                      }`}>{email.status}</span>
                    </div>
                    <div className="text-xs text-gray-400 line-clamp-2 mb-2"
                      dangerouslySetInnerHTML={{ __html: email.body.slice(0, 150) + "..." }}
                    />
                    {(email.status === "draft" || email.status === "approved") && prospect.email && (
                      <button onClick={() => handleSendEmail(email.id)} disabled={!!actionLoading}
                        className="text-xs px-3 py-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded flex items-center gap-1">
                        <Send className="w-3 h-3" /> Envoyer
                      </button>
                    )}
                    {!prospect.email && email.status === "draft" && (
                      <p className="text-xs text-red-400">⚠ Pas d&apos;email pour ce prospect</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
