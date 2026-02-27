"use client";

import { useState, useEffect, useCallback } from "react";
import { Send, Eye, Edit3, Check, X, Loader2, Mail, MailCheck, MailX, Reply } from "lucide-react";

interface Email {
  id: string;
  prospectId: string;
  subject: string;
  body: string;
  status: string;
  sentAt: string | null;
  createdAt: string;
  prospect: { companyName: string; email: string | null };
}

const STATUS_TABS = [
  { value: "all", label: "Tous", icon: Mail },
  { value: "draft", label: "Brouillons", icon: Edit3 },
  { value: "approved", label: "Approuvés", icon: Check },
  { value: "sent", label: "Envoyés", icon: MailCheck },
  { value: "replied", label: "Réponses", icon: Reply },
  { value: "bounced", label: "Rejetés", icon: MailX },
];

export default function EmailsPage() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [editing, setEditing] = useState(false);
  const [editSubject, setEditSubject] = useState("");
  const [editBody, setEditBody] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchEmails = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("status", statusFilter);
    const res = await fetch(`/api/email/send?${params}`);
    if (res.ok) setEmails(await res.json());
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => { fetchEmails(); }, [fetchEmails]);

  const handleApprove = async (email: Email) => {
    setActionLoading(email.id);
    await fetch("/api/email/send", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emailId: email.id, status: "approved" }),
    });
    await fetchEmails();
    setActionLoading(null);
  };

  const handleSend = async (email: Email) => {
    if (!email.prospect.email) return;
    setActionLoading(email.id);
    await fetch("/api/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emailId: email.id }),
    });
    await fetchEmails();
    setActionLoading(null);
    setSelectedEmail(null);
  };

  const handleSave = async () => {
    if (!selectedEmail) return;
    setActionLoading(selectedEmail.id);
    await fetch("/api/email/send", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emailId: selectedEmail.id, subject: editSubject, body: editBody }),
    });
    setEditing(false);
    await fetchEmails();
    setActionLoading(null);
  };

  const openPreview = (email: Email) => {
    setSelectedEmail(email);
    setEditSubject(email.subject);
    setEditBody(email.body);
    setEditing(false);
  };

  const statusCounts = emails.reduce<Record<string, number>>((acc, e) => {
    acc[e.status] = (acc[e.status] || 0) + 1;
    return acc;
  }, {});

  const filteredEmails = statusFilter === "all" ? emails : emails.filter((e) => e.status === statusFilter);

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Emails</h1>

      {/* Status tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {STATUS_TABS.map((tab) => {
          const Icon = tab.icon;
          const count = tab.value === "all" ? emails.length : (statusCounts[tab.value] || 0);
          return (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                statusFilter === tab.value
                  ? "bg-blue-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:text-white"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-black/20">{count}</span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Email list */}
        <div className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-gray-500">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Chargement...
            </div>
          ) : filteredEmails.length === 0 ? (
            <div className="text-center py-12 text-gray-500">Aucun email</div>
          ) : (
            filteredEmails.map((email) => (
              <div
                key={email.id}
                onClick={() => openPreview(email)}
                className={`p-4 bg-gray-900 border rounded-xl cursor-pointer transition-colors ${
                  selectedEmail?.id === email.id ? "border-blue-500" : "border-gray-800 hover:border-gray-700"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white truncate">{email.prospect.companyName}</p>
                    <p className="text-xs text-gray-400 truncate">{email.prospect.email || "Email manquant"}</p>
                    <p className="text-sm text-gray-300 mt-1 truncate">{email.subject}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      email.status === "draft" ? "bg-yellow-900/50 text-yellow-400" :
                      email.status === "approved" ? "bg-blue-900/50 text-blue-400" :
                      email.status === "sent" ? "bg-green-900/50 text-green-400" :
                      email.status === "replied" ? "bg-purple-900/50 text-purple-400" :
                      "bg-red-900/50 text-red-400"
                    }`}>{email.status}</span>
                    <span className="text-xs text-gray-500">{new Date(email.createdAt).toLocaleDateString("fr-FR")}</span>
                  </div>
                </div>

                {/* Quick actions */}
                <div className="flex gap-2 mt-3">
                  {email.status === "draft" && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleApprove(email); }}
                      disabled={actionLoading === email.id}
                      className="text-xs px-3 py-1 bg-blue-600/20 text-blue-400 rounded hover:bg-blue-600/30 transition-colors"
                    >
                      {actionLoading === email.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Approuver"}
                    </button>
                  )}
                  {email.status === "approved" && email.prospect.email && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleSend(email); }}
                      disabled={actionLoading === email.id}
                      className="text-xs px-3 py-1 bg-green-600/20 text-green-400 rounded hover:bg-green-600/30 transition-colors flex items-center gap-1"
                    >
                      {actionLoading === email.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Send className="w-3 h-3" /> Envoyer</>}
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Preview panel */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 sticky top-6">
          {selectedEmail ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">Aperçu</h2>
                <div className="flex gap-2">
                  {!editing && selectedEmail.status === "draft" && (
                    <button
                      onClick={() => setEditing(true)}
                      className="text-xs px-3 py-1.5 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 flex items-center gap-1"
                    >
                      <Edit3 className="w-3 h-3" /> Modifier
                    </button>
                  )}
                  {editing && (
                    <>
                      <button onClick={() => setEditing(false)} className="text-xs px-3 py-1.5 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600">
                        <X className="w-3 h-3" />
                      </button>
                      <button onClick={handleSave} className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-500 flex items-center gap-1">
                        {actionLoading === selectedEmail.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Check className="w-3 h-3" /> Sauvegarder</>}
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="mb-3">
                <span className="text-xs text-gray-500">À :</span>
                <p className="text-sm text-white">{selectedEmail.prospect.email || "—"}</p>
              </div>

              {editing ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-500">Objet</label>
                    <input
                      type="text"
                      value={editSubject}
                      onChange={(e) => setEditSubject(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Corps</label>
                    <textarea
                      value={editBody}
                      onChange={(e) => setEditBody(e.target.value)}
                      rows={12}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <div className="mb-3">
                    <span className="text-xs text-gray-500">Objet</span>
                    <p className="text-sm font-medium text-white">{selectedEmail.subject}</p>
                  </div>
                  <div className="p-4 bg-gray-800/50 rounded-lg">
                    <div className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed" dangerouslySetInnerHTML={{ __html: selectedEmail.body }} />
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2 mt-4 pt-4 border-t border-gray-800">
                {selectedEmail.status === "draft" && (
                  <button
                    onClick={() => handleApprove(selectedEmail)}
                    disabled={actionLoading === selectedEmail.id}
                    className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" /> Approuver
                  </button>
                )}
                {selectedEmail.status === "approved" && selectedEmail.prospect.email && (
                  <button
                    onClick={() => handleSend(selectedEmail)}
                    disabled={actionLoading === selectedEmail.id}
                    className="flex-1 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-medium rounded-lg flex items-center justify-center gap-2"
                  >
                    <Send className="w-4 h-4" /> Envoyer
                  </button>
                )}
                {selectedEmail.status === "sent" && (
                  <span className="text-sm text-green-400 flex items-center gap-1">
                    <MailCheck className="w-4 h-4" /> Envoyé le {new Date(selectedEmail.sentAt!).toLocaleDateString("fr-FR")}
                  </span>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <Eye className="w-8 h-8 mb-2" />
              <p className="text-sm">Sélectionnez un email pour le prévisualiser</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
