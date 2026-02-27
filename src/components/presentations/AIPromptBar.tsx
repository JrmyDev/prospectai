"use client";

import React, { useState, useRef, useCallback } from 'react';
import { Sparkles, Send, Loader2, ChevronUp } from 'lucide-react';

interface AIPromptBarProps {
  onSubmit: (prompt: string, action: AIAction) => Promise<void>;
  isLoading: boolean;
}

export type AIAction = 'edit-slide' | 'add-slide' | 'generate-all';

const SUGGESTIONS = [
  { label: 'Améliorer le texte', prompt: 'Améliore le texte de cette slide pour le rendre plus percutant et professionnel' },
  { label: 'Ajouter une slide', prompt: 'Ajoute une nouvelle slide qui présente les avantages clés de notre offre' },
  { label: 'Simplifier', prompt: 'Simplifie cette slide en réduisant le texte au strict essentiel' },
  { label: 'Stats clés', prompt: 'Ajoute une slide de statistiques avec des chiffres clés et percutants' },
];

export default function AIPromptBar({ onSubmit, isLoading }: AIPromptBarProps) {
  const [prompt, setPrompt] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = useCallback(async () => {
    const trimmed = prompt.trim();
    if (!trimmed || isLoading) return;

    const isAddSlide = /ajout|nouvelle? slide|crée? une slide|insert/i.test(trimmed);
    const action: AIAction = isAddSlide ? 'add-slide' : 'edit-slide';

    await onSubmit(trimmed, action);
    setPrompt('');
    setShowSuggestions(false);
  }, [prompt, isLoading, onSubmit]);

  const handleSuggestion = useCallback(async (s: typeof SUGGESTIONS[0]) => {
    setPrompt(s.prompt);
    setShowSuggestions(false);
    const isAddSlide = /ajout|nouvelle? slide/i.test(s.prompt);
    await onSubmit(s.prompt, isAddSlide ? 'add-slide' : 'edit-slide');
    setPrompt('');
  }, [onSubmit]);

  return (
    <div className="border-t border-slate-200 bg-white relative">
      {/* Suggestions dropdown */}
      {showSuggestions && (
        <div className="absolute bottom-full left-0 right-0 bg-white border-t border-slate-200 shadow-lg">
          <div className="p-2 flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s.label}
                onClick={() => handleSuggestion(s)}
                disabled={isLoading}
                className="px-3 py-1.5 text-xs bg-slate-50 hover:bg-blue-50 hover:text-blue-600 border border-slate-200 rounded-full transition-colors disabled:opacity-50"
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input bar */}
      <div className="flex items-center gap-2 p-3">
        <button
          onClick={() => setShowSuggestions(!showSuggestions)}
          className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
          title="Suggestions"
        >
          <ChevronUp size={16} className={`transition-transform ${showSuggestions ? 'rotate-180' : ''}`} />
        </button>
        <div className="flex-1 flex items-center gap-2 bg-slate-50 rounded-lg border border-slate-200 px-3 py-2 focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-400">
          <Sparkles size={16} className="text-blue-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            onFocus={() => setShowSuggestions(false)}
            placeholder="Décrivez les modifications souhaitées..."
            className="flex-1 bg-transparent text-sm outline-none placeholder-slate-400"
            disabled={isLoading}
          />
          <button
            onClick={handleSubmit}
            disabled={!prompt.trim() || isLoading}
            className="p-1.5 rounded-md bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          </button>
        </div>
      </div>
    </div>
  );
}
