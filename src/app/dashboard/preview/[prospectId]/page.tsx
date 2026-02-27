"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ExternalLink, Rocket, Monitor, Tablet, Smartphone, RotateCcw, Code } from "lucide-react";

interface ProspectInfo {
  id: string;
  company: string;
  sector: string | null;
  generatedSite: {
    id: string;
    status: string;
    vercelUrl: string | null;
    templateUsed: string | null;
  } | null;
}

const VIEWPORTS = [
  { id: "desktop", label: "Desktop", icon: Monitor, width: "100%" },
  { id: "tablet", label: "Tablette", icon: Tablet, width: "768px" },
  { id: "mobile", label: "Mobile", icon: Smartphone, width: "375px" },
];

export default function PreviewPage() {
  const { prospectId } = useParams<{ prospectId: string }>();
  const router = useRouter();
  const [prospect, setProspect] = useState<ProspectInfo | null>(null);
  const [viewport, setViewport] = useState("desktop");
  const [showCode, setShowCode] = useState(false);
  const [htmlCode, setHtmlCode] = useState("");
  const [deploying, setDeploying] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);

  useEffect(() => {
    fetch(`/api/prospects/${prospectId}`)
      .then((r) => r.ok ? r.json() : null)
      .then(setProspect);
  }, [prospectId]);

  useEffect(() => {
    if (showCode && !htmlCode) {
      fetch(`/api/generate/website?prospectId=${prospectId}`)
        .then((r) => r.text())
        .then(setHtmlCode);
    }
  }, [showCode, htmlCode, prospectId]);

  const handleDeploy = async () => {
    setDeploying(true);
    try {
      await fetch("/api/generate/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prospectId }),
      });
      const res = await fetch(`/api/prospects/${prospectId}`);
      if (res.ok) setProspect(await res.json());
    } finally {
      setDeploying(false);
    }
  };

  const currentVp = VIEWPORTS.find((v) => v.id === viewport)!;

  if (!prospect) {
    return <div className="flex items-center justify-center h-screen text-gray-400">Chargement...</div>;
  }

  if (!prospect.generatedSite) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <p className="text-gray-400">Aucun site généré pour ce prospect</p>
        <button onClick={() => router.back()} className="text-sm text-blue-400 hover:underline">Retour</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-800 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Retour
          </button>
          <div className="h-4 w-px bg-gray-700" />
          <div>
            <span className="text-sm font-medium text-white">{prospect.company}</span>
            <span className="text-xs text-gray-500 ml-2">{prospect.generatedSite.templateUsed}</span>
          </div>
          <span className={`text-[10px] px-2 py-0.5 rounded-full ${
            prospect.generatedSite.status === "deployed" ? "bg-green-900/50 text-green-400" : "bg-yellow-900/50 text-yellow-400"
          }`}>{prospect.generatedSite.status}</span>
        </div>

        {/* Viewport switcher */}
        <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-0.5">
          {VIEWPORTS.map((vp) => {
            const Icon = vp.icon;
            return (
              <button
                key={vp.id}
                onClick={() => setViewport(vp.id)}
                className={`p-1.5 rounded transition-colors ${
                  viewport === vp.id ? "bg-gray-700 text-white" : "text-gray-500 hover:text-white"
                }`}
                title={vp.label}
              >
                <Icon className="w-4 h-4" />
              </button>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCode(!showCode)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-colors ${
              showCode ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white"
            }`}
          >
            <Code className="w-3 h-3" /> Code
          </button>
          <button
            onClick={() => setIframeKey((k) => k + 1)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-gray-800 text-gray-400 hover:text-white rounded-lg transition-colors"
            title="Recharger"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
          <button
            onClick={() => window.open(`/api/generate/website?prospectId=${prospectId}`, "_blank")}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-gray-800 text-gray-400 hover:text-white rounded-lg transition-colors"
          >
            <ExternalLink className="w-3 h-3" /> Nouvel onglet
          </button>
          {prospect.generatedSite.vercelUrl && (
            <a
              href={prospect.generatedSite.vercelUrl}
              target="_blank"
              rel="noopener"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-green-600/20 text-green-400 hover:bg-green-600/30 rounded-lg transition-colors"
            >
              <ExternalLink className="w-3 h-3" /> Voir en prod
            </a>
          )}
          {prospect.generatedSite.status === "draft" && (
            <button
              onClick={handleDeploy}
              disabled={deploying}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white rounded-lg transition-colors"
            >
              <Rocket className={`w-3 h-3 ${deploying ? "animate-pulse" : ""}`} />
              {deploying ? "Déploiement..." : "Déployer"}
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Preview iframe */}
        <div className={`flex-1 flex justify-center bg-gray-950 overflow-auto p-4 ${showCode ? "w-1/2" : "w-full"}`}>
          <div
            className="bg-white rounded-lg shadow-2xl overflow-hidden transition-all duration-300"
            style={{
              width: currentVp.width,
              maxWidth: "100%",
              height: "100%",
            }}
          >
            <iframe
              key={iframeKey}
              src={`/api/generate/website?prospectId=${prospectId}`}
              className="w-full h-full border-0"
              title={`Preview - ${prospect.company}`}
            />
          </div>
        </div>

        {/* Code panel */}
        {showCode && (
          <div className="w-1/2 border-l border-gray-800 bg-gray-950 overflow-auto">
            <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-800 sticky top-0">
              <span className="text-xs text-gray-400">index.html</span>
              <button
                onClick={() => { navigator.clipboard.writeText(htmlCode); }}
                className="text-xs text-blue-400 hover:underline"
              >
                Copier
              </button>
            </div>
            <pre className="p-4 text-xs text-gray-300 font-mono whitespace-pre-wrap break-all">
              {htmlCode || "Chargement..."}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
