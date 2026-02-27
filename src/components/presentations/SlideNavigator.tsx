"use client";

import React, { useRef, useState } from 'react';
import { Plus, Copy, Trash2, GripVertical } from 'lucide-react';
import SlideRenderer from './SlideRenderer';
import type { PresentationSlide, PresentationTheme, SlideFormat } from '@/lib/presentations/types';

interface SlideNavigatorProps {
  slides: PresentationSlide[];
  activeIndex: number;
  theme: PresentationTheme;
  format: SlideFormat;
  onSelect: (index: number) => void;
  onAdd: (afterIndex: number) => void;
  onDuplicate: (index: number) => void;
  onDelete: (index: number) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
}

export default function SlideNavigator({
  slides,
  activeIndex,
  theme,
  format,
  onSelect,
  onAdd,
  onDuplicate,
  onDelete,
  onReorder,
}: SlideNavigatorProps) {
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dropIdx, setDropIdx] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, idx: number) => {
    setDragIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropIdx(idx);
  };

  const handleDrop = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx !== null && dragIdx !== idx) {
      onReorder(dragIdx, idx);
    }
    setDragIdx(null);
    setDropIdx(null);
  };

  const handleDragEnd = () => {
    setDragIdx(null);
    setDropIdx(null);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 border-r border-slate-200">
      {/* Header */}
      <div className="px-3 py-3 border-b border-slate-200 flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Slides</span>
        <span className="text-xs text-slate-400">{slides.length}</span>
      </div>

      {/* Slide list */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1.5">
        {slides.map((slide, i) => (
          <div
            key={slide.id}
            draggable
            onDragStart={(e) => handleDragStart(e, i)}
            onDragOver={(e) => handleDragOver(e, i)}
            onDrop={(e) => handleDrop(e, i)}
            onDragEnd={handleDragEnd}
            onClick={() => onSelect(i)}
            className={`group relative rounded-lg cursor-pointer transition-all ${
              i === activeIndex
                ? 'ring-2 ring-blue-500 shadow-md'
                : 'hover:ring-1 hover:ring-slate-300'
            } ${dragIdx === i ? 'opacity-50' : ''} ${
              dropIdx === i && dragIdx !== i ? 'ring-2 ring-blue-300' : ''
            }`}
          >
            {/* Slide number */}
            <div className="absolute -left-0.5 top-1 z-10 bg-slate-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-r-md">
              {i + 1}
            </div>

            {/* Grip handle */}
            <div className="absolute left-1 top-1/2 -translate-y-1/2 z-10 opacity-0 group-hover:opacity-60 transition-opacity cursor-grab">
              <GripVertical size={12} className="text-slate-400" />
            </div>

            {/* Thumbnail */}
            <div className="rounded-lg overflow-hidden bg-white">
              <SlideRenderer slide={slide} theme={theme} format={format} />
            </div>

            {/* Hover actions */}
            <div className="absolute top-1 right-1 z-10 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => { e.stopPropagation(); onDuplicate(i); }}
                className="p-1 bg-white/90 rounded shadow-sm text-slate-500 hover:text-blue-600 transition-colors"
                title="Dupliquer"
              >
                <Copy size={11} />
              </button>
              {slides.length > 1 && (
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(i); }}
                  className="p-1 bg-white/90 rounded shadow-sm text-slate-500 hover:text-red-600 transition-colors"
                  title="Supprimer"
                >
                  <Trash2 size={11} />
                </button>
              )}
            </div>
          </div>
        ))}

        {/* Add slide button */}
        <button
          onClick={() => onAdd(slides.length - 1)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-lg border-2 border-dashed border-slate-300 text-slate-400 hover:text-blue-600 hover:border-blue-400 transition-colors text-xs font-medium"
        >
          <Plus size={14} />
          Ajouter
        </button>
      </div>
    </div>
  );
}
