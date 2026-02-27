"use client";

import React, { useState, useCallback, useRef, useEffect } from 'react';
import Toolbar from './Toolbar';
import SlideNavigator from './SlideNavigator';
import SlideCanvas from './SlideCanvas';
import PropertiesPanel from './PropertiesPanel';
import AIPromptBar, { type AIAction } from './AIPromptBar';
import { generateSlideFromLayout, updatePageNumbers } from '@/lib/presentations/layouts';
import { buildTheme, THEME_PRESETS } from '@/lib/presentations/theme';
import type {
  PresentationSlide,
  PresentationTheme,
  SlideFormat,
  SlideElement,
  SlideBackground,
  SlideLayout,
  ElementType,
  ThemePreset,
} from '@/lib/presentations/types';

// ─── Undo/Redo history ────────────────────────────────────────────────────

interface HistoryState {
  slides: PresentationSlide[];
  activeSlideIndex: number;
}

function useHistory(initial: HistoryState) {
  const [past, setPast] = useState<HistoryState[]>([]);
  const [present, setPresent] = useState<HistoryState>(initial);
  const [future, setFuture] = useState<HistoryState[]>([]);

  const push = useCallback((next: HistoryState) => {
    setPast((p) => [...p.slice(-49), present]);
    setPresent(next);
    setFuture([]);
  }, [present]);

  const undo = useCallback(() => {
    if (past.length === 0) return;
    const prev = past[past.length - 1];
    setPast((p) => p.slice(0, -1));
    setFuture((f) => [present, ...f]);
    setPresent(prev);
  }, [past, present]);

  const redo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[0];
    setFuture((f) => f.slice(1));
    setPast((p) => [...p, present]);
    setPresent(next);
  }, [future, present]);

  const replace = useCallback((next: HistoryState) => {
    setPresent(next);
  }, []);

  return { state: present, push, undo, redo, replace, canUndo: past.length > 0, canRedo: future.length > 0 };
}

// ─── Main Editor ──────────────────────────────────────────────────────────

interface PresentationEditorProps {
  proposalId: string;
  initialSlides: PresentationSlide[];
  initialTheme: PresentationTheme;
  format: SlideFormat;
  brandProfile?: { id: string; primaryColor?: string | null; secondaryColor?: string | null; accentColor?: string | null; logoUrl?: string | null; companyName?: string; name?: string } | null;
}

export default function PresentationEditor({
  proposalId,
  initialSlides,
  initialTheme,
  format,
  brandProfile,
}: PresentationEditorProps) {
  // Theme state
  const [theme, setTheme] = useState<PresentationTheme>(initialTheme);

  // Slides history
  const {
    state: { slides, activeSlideIndex },
    push: pushHistory,
    undo,
    redo,
    replace: replaceHistory,
    canUndo,
    canRedo,
  } = useHistory({
    slides: updatePageNumbers(initialSlides),
    activeSlideIndex: 0,
  });

  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeSlide = slides[activeSlideIndex] || slides[0];
  const selectedElement = activeSlide?.elements.find((e) => e.id === selectedElementId) ?? null;

  // ─── Auto-save ─────────────────────────────────────────────────────────

  const saveToServer = useCallback(async (slidesData: PresentationSlide[]) => {
    setIsSaving(true);
    try {
      await fetch(`/api/proposals/${proposalId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slidesJson: JSON.stringify(slidesData) }),
      });
    } finally {
      setIsSaving(false);
    }
  }, [proposalId]);

  const debouncedSave = useCallback((slidesData: PresentationSlide[]) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveToServer(slidesData), 1500);
  }, [saveToServer]);

  // ─── Slide mutations ──────────────────────────────────────────────────

  const updateSlides = useCallback((newSlides: PresentationSlide[], newActiveIndex?: number) => {
    const updated = updatePageNumbers(newSlides);
    pushHistory({ slides: updated, activeSlideIndex: newActiveIndex ?? activeSlideIndex });
    debouncedSave(updated);
  }, [pushHistory, activeSlideIndex, debouncedSave]);

  const setActiveSlide = useCallback((index: number) => {
    replaceHistory({ slides, activeSlideIndex: index });
    setSelectedElementId(null);
  }, [slides, replaceHistory]);

  const updateCurrentSlide = useCallback((updatedSlide: PresentationSlide) => {
    const newSlides = slides.map((s, i) => (i === activeSlideIndex ? updatedSlide : s));
    updateSlides(newSlides);
  }, [slides, activeSlideIndex, updateSlides]);

  // Element CRUD
  const handleUpdateElement = useCallback((updated: SlideElement) => {
    const updatedSlide = {
      ...activeSlide,
      elements: activeSlide.elements.map((e) => (e.id === updated.id ? updated : e)),
    };
    updateCurrentSlide(updatedSlide);
  }, [activeSlide, updateCurrentSlide]);

  const handleDeleteElement = useCallback((id: string) => {
    const updatedSlide = {
      ...activeSlide,
      elements: activeSlide.elements.filter((e) => e.id !== id),
    };
    setSelectedElementId(null);
    updateCurrentSlide(updatedSlide);
  }, [activeSlide, updateCurrentSlide]);

  const handleAddElement = useCallback((type: ElementType) => {
    const newEl: SlideElement = {
      id: `el-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type,
      x: 20, y: 30, width: 60, height: type === 'image' ? 40 : 15,
      fontSize: type === 'heading' ? 36 : type === 'stat' ? 48 : 18,
      fontWeight: type === 'heading' ? '700' : '400',
      fontFamily: type === 'heading' || type === 'stat' ? 'heading' : 'body',
      color: theme.colors.text,
      textAlign: 'left',
      lineHeight: 1.6,
      content: type === 'image' ? undefined : type === 'stat' ? undefined : 'Nouveau texte',
      statValue: type === 'stat' ? '0' : undefined,
      statLabel: type === 'stat' ? 'Label' : undefined,
      imageUrl: type === 'image' ? '' : undefined,
      objectFit: type === 'image' ? 'cover' : undefined,
      backgroundColor: type === 'shape' ? theme.colors.primary : type === 'stat' ? theme.colors.surface : undefined,
      borderRadius: type === 'shape' || type === 'stat' ? 8 : undefined,
      zIndex: activeSlide.elements.length + 1,
    };
    updateCurrentSlide({
      ...activeSlide,
      elements: [...activeSlide.elements, newEl],
    });
    setSelectedElementId(newEl.id);
  }, [theme, activeSlide, updateCurrentSlide]);

  // Slide management
  const handleAddSlide = useCallback(() => {
    const newSlide = generateSlideFromLayout('titleContent', theme, format);
    const newSlides = [...slides];
    newSlides.splice(activeSlideIndex + 1, 0, newSlide);
    updateSlides(newSlides, activeSlideIndex + 1);
    setSelectedElementId(null);
  }, [slides, activeSlideIndex, theme, format, updateSlides]);

  const handleDeleteSlide = useCallback((index: number) => {
    if (slides.length <= 1) return;
    const newSlides = slides.filter((_, i) => i !== index);
    const newActive = Math.min(activeSlideIndex, newSlides.length - 1);
    updateSlides(newSlides, newActive);
    setSelectedElementId(null);
  }, [slides, activeSlideIndex, updateSlides]);

  const handleDuplicateSlide = useCallback((index: number) => {
    const clone: PresentationSlide = JSON.parse(JSON.stringify(slides[index]));
    clone.id = `slide-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    clone.elements = clone.elements.map((e) => ({
      ...e,
      id: `el-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    }));
    const newSlides = [...slides];
    newSlides.splice(index + 1, 0, clone);
    updateSlides(newSlides, index + 1);
  }, [slides, updateSlides]);

  const handleReorderSlides = useCallback((from: number, to: number) => {
    const newSlides = [...slides];
    const [moved] = newSlides.splice(from, 1);
    newSlides.splice(to, 0, moved);
    const newActive = activeSlideIndex === from ? to : activeSlideIndex;
    updateSlides(newSlides, newActive);
  }, [slides, activeSlideIndex, updateSlides]);

  // Layout change
  const handleChangeLayout = useCallback((layout: SlideLayout) => {
    const newSlide = generateSlideFromLayout(layout, theme, format);
    newSlide.id = activeSlide.id;
    updateCurrentSlide(newSlide);
    setSelectedElementId(null);
  }, [theme, format, activeSlide, updateCurrentSlide]);

  // Background change
  const handleChangeBackground = useCallback((bg: SlideBackground) => {
    updateCurrentSlide({ ...activeSlide, background: bg });
  }, [activeSlide, updateCurrentSlide]);

  // Theme preset change
  const handleChangePreset = useCallback((preset: ThemePreset) => {
    const newTheme = buildTheme(brandProfile ?? null, preset);
    setTheme(newTheme);
  }, [brandProfile]);

  // ─── PDF Export ───────────────────────────────────────────────────────

  const handleExportPDF = useCallback(async () => {
    setIsExporting(true);
    try {
      // Ensure saved first
      await saveToServer(slides);

      const res = await fetch(`/api/proposals/${proposalId}/pdf`);
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `presentation-${proposalId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF export error:', err);
    } finally {
      setIsExporting(false);
    }
  }, [proposalId, slides, saveToServer]);

  // ─── AI Prompt ────────────────────────────────────────────────────────

  const handleAISubmit = useCallback(async (prompt: string, action: AIAction) => {
    setAiLoading(true);
    try {
      if (action === 'add-slide') {
        const res = await fetch('/api/proposals/edit-slide', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt,
            action: 'add',
            proposalId,
            format,
            theme: JSON.stringify(theme),
          }),
        });
        if (!res.ok) throw new Error('AI error');
        const data = await res.json();
        if (data.slide) {
          const newSlides = [...slides];
          newSlides.splice(activeSlideIndex + 1, 0, data.slide);
          updateSlides(newSlides, activeSlideIndex + 1);
        }
      } else {
        // edit current slide
        const res = await fetch('/api/proposals/edit-slide', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt,
            action: 'edit',
            proposalId,
            slideIndex: activeSlideIndex,
            currentSlide: JSON.stringify(activeSlide),
            format,
            theme: JSON.stringify(theme),
          }),
        });
        if (!res.ok) throw new Error('AI error');
        const data = await res.json();
        if (data.slide) {
          const newSlides = slides.map((s, i) => (i === activeSlideIndex ? data.slide : s));
          updateSlides(newSlides);
        }
      }
    } catch (err) {
      console.error('AI prompt error:', err);
    } finally {
      setAiLoading(false);
    }
  }, [proposalId, format, theme, slides, activeSlideIndex, activeSlide, updateSlides]);

  // ─── Keyboard shortcuts ───────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      if (meta && e.key === 'z' && e.shiftKey) { e.preventDefault(); redo(); }
      if (meta && e.key === 'y') { e.preventDefault(); redo(); }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedElementId && document.activeElement?.tagName !== 'INPUT' && !document.querySelector('[contenteditable="true"]:focus')) {
          e.preventDefault();
          handleDeleteElement(selectedElementId);
        }
      }
      if (e.key === 'Escape') {
        setSelectedElementId(null);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo, selectedElementId, handleDeleteElement]);

  if (!activeSlide) return null;

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <Toolbar
        format={format}
        themePreset={theme.preset}
        onChangePreset={handleChangePreset}
        onAddElement={handleAddElement}
        onExportPDF={handleExportPDF}
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
        isSaving={isSaving}
        isExporting={isExporting}
      />

      <div className="flex flex-1 min-h-0">
        <SlideNavigator
          slides={slides}
          theme={theme}
          format={format}
          activeIndex={activeSlideIndex}
          onSelect={setActiveSlide}
          onAdd={handleAddSlide}
          onDelete={handleDeleteSlide}
          onDuplicate={handleDuplicateSlide}
          onReorder={handleReorderSlides}
        />

        <SlideCanvas
          slide={activeSlide}
          theme={theme}
          format={format}
          selectedElementId={selectedElementId}
          onSelectElement={setSelectedElementId}
          onUpdateElement={handleUpdateElement}
          onUpdateBackground={handleChangeBackground}
        />

        <PropertiesPanel
          slide={activeSlide}
          theme={theme}
          selectedElement={selectedElement}
          onUpdateElement={handleUpdateElement}
          onDeleteElement={handleDeleteElement}
          onChangeLayout={handleChangeLayout}
          onChangeBackground={handleChangeBackground}
        />
      </div>

      <AIPromptBar
        onSubmit={handleAISubmit}
        isLoading={aiLoading}
      />
    </div>
  );
}
