"use client";

import React from 'react';
import {
  Download, FileText, Plus, Undo2, Redo2, ZoomIn, ZoomOut,
  Type, Image, Square, BarChart3, Quote, Sparkles,
} from 'lucide-react';
import type { SlideFormat, ElementType, ThemePreset } from '@/lib/presentations/types';

interface ToolbarProps {
  format: SlideFormat;
  themePreset: ThemePreset;
  onChangePreset: (preset: ThemePreset) => void;
  onAddElement: (type: ElementType) => void;
  onExportPDF: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  isSaving: boolean;
  isExporting: boolean;
}

const ELEMENT_BUTTONS: { type: ElementType; label: string; icon: React.ReactNode }[] = [
  { type: 'heading', label: 'Titre', icon: <Type size={14} /> },
  { type: 'body', label: 'Texte', icon: <FileText size={14} /> },
  { type: 'image', label: 'Image', icon: <Image size={14} /> },
  { type: 'shape', label: 'Forme', icon: <Square size={14} /> },
  { type: 'stat', label: 'Stat', icon: <BarChart3 size={14} /> },
  { type: 'quote', label: 'Citation', icon: <Quote size={14} /> },
];

const PRESETS: { value: ThemePreset; label: string }[] = [
  { value: 'modern', label: 'Moderne' },
  { value: 'corporate', label: 'Corporate' },
  { value: 'creative', label: 'Créatif' },
  { value: 'minimal', label: 'Minimal' },
];

export default function Toolbar({
  format,
  themePreset,
  onChangePreset,
  onAddElement,
  onExportPDF,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  isSaving,
  isExporting,
}: ToolbarProps) {
  return (
    <div className="flex items-center gap-1 border-b border-slate-200 bg-white px-4 py-2">
      {/* Format badge */}
      <span className="px-2 py-0.5 rounded bg-slate-100 text-[11px] font-medium text-slate-500 mr-2">
        {format}
      </span>

      {/* Theme preset */}
      <select
        value={themePreset}
        onChange={(e) => onChangePreset(e.target.value as ThemePreset)}
        className="text-xs border border-slate-200 rounded px-2 py-1 bg-white mr-3"
      >
        {PRESETS.map((p) => (
          <option key={p.value} value={p.value}>{p.label}</option>
        ))}
      </select>

      {/* Separator */}
      <div className="w-px h-5 bg-slate-200 mx-1" />

      {/* Undo / Redo */}
      <button
        onClick={onUndo}
        disabled={!canUndo}
        className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
        title="Annuler"
      >
        <Undo2 size={15} />
      </button>
      <button
        onClick={onRedo}
        disabled={!canRedo}
        className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
        title="Rétablir"
      >
        <Redo2 size={15} />
      </button>

      {/* Separator */}
      <div className="w-px h-5 bg-slate-200 mx-1" />

      {/* Add element buttons */}
      {ELEMENT_BUTTONS.map((btn) => (
        <button
          key={btn.type}
          onClick={() => onAddElement(btn.type)}
          className="flex items-center gap-1 px-2 py-1 rounded text-xs hover:bg-slate-100 text-slate-600"
          title={`Ajouter : ${btn.label}`}
        >
          {btn.icon}
          <span className="hidden lg:inline">{btn.label}</span>
        </button>
      ))}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Saving indicator */}
      {isSaving && (
        <span className="text-[11px] text-slate-400 mr-2 animate-pulse">Sauvegarde...</span>
      )}

      {/* Export */}
      <button
        onClick={onExportPDF}
        disabled={isExporting}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500 text-white text-xs font-medium hover:bg-blue-600 disabled:opacity-50 transition-colors"
      >
        <Download size={14} />
        {isExporting ? 'Export...' : 'Exporter PDF'}
      </button>
    </div>
  );
}
