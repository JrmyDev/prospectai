"use client";

import React from 'react';
import {
  Type, Image, Palette, Square, ChevronDown, Lock, Unlock, Trash2,
  AlignLeft, AlignCenter, AlignRight, Bold, Italic,
} from 'lucide-react';
import { LAYOUT_OPTIONS } from '@/lib/presentations/layouts';
import type {
  SlideElement,
  PresentationSlide,
  PresentationTheme,
  SlideBackground,
  SlideLayout,
} from '@/lib/presentations/types';

// ─── Helpers ───────────────────────────────────────────────────────────────

function ColorInput({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <label className="flex items-center gap-2 text-xs text-slate-600">
      <input
        type="color"
        value={value || '#000000'}
        onChange={(e) => onChange(e.target.value)}
        className="w-6 h-6 rounded cursor-pointer border border-slate-300"
      />
      {label}
    </label>
  );
}

function NumberField({ value, onChange, label, min, max, step }: {
  value: number | undefined; onChange: (v: number) => void; label: string; min?: number; max?: number; step?: number;
}) {
  return (
    <label className="flex items-center gap-2 text-xs text-slate-600">
      <span className="w-20 shrink-0">{label}</span>
      <input
        type="number"
        value={value ?? ''}
        min={min}
        max={max}
        step={step ?? 1}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded border border-slate-300 px-2 py-1 text-xs"
      />
    </label>
  );
}

function SelectField({ value, onChange, label, options }: {
  value: string | undefined; onChange: (v: string) => void; label: string; options: { value: string; label: string }[];
}) {
  return (
    <label className="flex items-center gap-2 text-xs text-slate-600">
      <span className="w-20 shrink-0">{label}</span>
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded border border-slate-300 px-2 py-1 text-xs bg-white"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}

function SectionHeader({ title, icon }: { title: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 uppercase tracking-wider mt-4 mb-2 first:mt-0">
      {icon}
      {title}
    </div>
  );
}

// ─── Element Properties ────────────────────────────────────────────────────

function ElementProperties({
  element,
  onUpdate,
  onDelete,
}: {
  element: SlideElement;
  onUpdate: (el: SlideElement) => void;
  onDelete: () => void;
}) {
  const set = <K extends keyof SlideElement>(key: K, val: SlideElement[K]) =>
    onUpdate({ ...element, [key]: val });

  const isText = ['heading', 'subheading', 'body', 'bulletList', 'quote'].includes(element.type);
  const isImage = element.type === 'image';
  const isStat = element.type === 'stat';
  const isShape = element.type === 'shape';

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-800 capitalize">{element.type}</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => set('locked', !element.locked)}
            className="p-1 rounded hover:bg-slate-100"
            title={element.locked ? 'Déverrouiller' : 'Verrouiller'}
          >
            {element.locked ? <Lock size={14} /> : <Unlock size={14} />}
          </button>
          <button onClick={onDelete} className="p-1 rounded hover:bg-red-50 text-red-500" title="Supprimer">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Position & Size */}
      <SectionHeader title="Position" icon={<Square size={12} />} />
      <div className="grid grid-cols-2 gap-2">
        <NumberField label="X (%)" value={element.x} onChange={(v) => set('x', v)} min={0} max={100} step={0.5} />
        <NumberField label="Y (%)" value={element.y} onChange={(v) => set('y', v)} min={0} max={100} step={0.5} />
        <NumberField label="Largeur" value={element.width} onChange={(v) => set('width', v)} min={1} max={100} step={0.5} />
        <NumberField label="Hauteur" value={element.height} onChange={(v) => set('height', v)} min={0.1} max={100} step={0.5} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <NumberField label="Rotation" value={element.rotation ?? 0} onChange={(v) => set('rotation', v)} min={-360} max={360} />
        <NumberField label="Opacité" value={element.opacity ?? 1} onChange={(v) => set('opacity', v)} min={0} max={1} step={0.05} />
      </div>

      {/* Typography (text elements) */}
      {(isText || isStat) && (
        <>
          <SectionHeader title="Typographie" icon={<Type size={12} />} />
          <NumberField label="Taille (px)" value={element.fontSize} onChange={(v) => set('fontSize', v)} min={8} max={120} />
          <SelectField
            label="Graisse"
            value={element.fontWeight}
            onChange={(v) => set('fontWeight', v)}
            options={[
              { value: '300', label: 'Light' },
              { value: '400', label: 'Regular' },
              { value: '500', label: 'Medium' },
              { value: '600', label: 'Semi-bold' },
              { value: '700', label: 'Bold' },
              { value: '800', label: 'Extra-bold' },
            ]}
          />
          <SelectField
            label="Police"
            value={element.fontFamily}
            onChange={(v) => set('fontFamily', v as 'heading' | 'body')}
            options={[
              { value: 'heading', label: 'Titre' },
              { value: 'body', label: 'Corps' },
            ]}
          />
          <div className="flex items-center gap-1">
            <button
              onClick={() => set('textAlign', 'left')}
              className={`p-1.5 rounded ${element.textAlign === 'left' ? 'bg-slate-200' : 'hover:bg-slate-100'}`}
            >
              <AlignLeft size={14} />
            </button>
            <button
              onClick={() => set('textAlign', 'center')}
              className={`p-1.5 rounded ${element.textAlign === 'center' ? 'bg-slate-200' : 'hover:bg-slate-100'}`}
            >
              <AlignCenter size={14} />
            </button>
            <button
              onClick={() => set('textAlign', 'right')}
              className={`p-1.5 rounded ${element.textAlign === 'right' ? 'bg-slate-200' : 'hover:bg-slate-100'}`}
            >
              <AlignRight size={14} />
            </button>
          </div>
          <NumberField label="Interligne" value={element.lineHeight ?? 1.5} onChange={(v) => set('lineHeight', v)} min={0.8} max={3} step={0.1} />
          <SelectField
            label="Casse"
            value={element.textTransform ?? 'none'}
            onChange={(v) => set('textTransform', v as 'none' | 'uppercase' | 'lowercase')}
            options={[
              { value: 'none', label: 'Normal' },
              { value: 'uppercase', label: 'MAJUSCULES' },
              { value: 'lowercase', label: 'minuscules' },
            ]}
          />
        </>
      )}

      {/* Image */}
      {isImage && (
        <>
          <SectionHeader title="Image" icon={<Image size={12} />} />
          <label className="text-xs text-slate-600">
            <span className="block mb-1">URL de l&#39;image</span>
            <input
              type="text"
              value={element.imageUrl ?? ''}
              onChange={(e) => set('imageUrl', e.target.value)}
              className="w-full rounded border border-slate-300 px-2 py-1 text-xs"
              placeholder="https://..."
            />
          </label>
          <SelectField
            label="Ajustement"
            value={element.objectFit ?? 'cover'}
            onChange={(v) => set('objectFit', v as 'cover' | 'contain' | 'fill')}
            options={[
              { value: 'cover', label: 'Couvrir' },
              { value: 'contain', label: 'Contenir' },
              { value: 'fill', label: 'Étirer' },
            ]}
          />
        </>
      )}

      {/* Stat */}
      {isStat && (
        <>
          <SectionHeader title="Statistique" icon={<Type size={12} />} />
          <label className="text-xs text-slate-600">
            <span className="block mb-1">Valeur</span>
            <input
              type="text"
              value={element.statValue ?? ''}
              onChange={(e) => set('statValue', e.target.value)}
              className="w-full rounded border border-slate-300 px-2 py-1 text-xs"
            />
          </label>
          <label className="text-xs text-slate-600">
            <span className="block mb-1">Label</span>
            <input
              type="text"
              value={element.statLabel ?? ''}
              onChange={(e) => set('statLabel', e.target.value)}
              className="w-full rounded border border-slate-300 px-2 py-1 text-xs"
            />
          </label>
        </>
      )}

      {/* Colors */}
      <SectionHeader title="Couleurs" icon={<Palette size={12} />} />
      <ColorInput label="Texte" value={element.color ?? '#000000'} onChange={(v) => set('color', v)} />
      {(isShape || isStat) && (
        <ColorInput label="Fond" value={element.backgroundColor ?? '#ffffff'} onChange={(v) => set('backgroundColor', v)} />
      )}

      {/* Border / Shape */}
      {(isShape || isImage || isStat) && (
        <>
          <NumberField label="Arrondi" value={element.borderRadius ?? 0} onChange={(v) => set('borderRadius', v)} min={0} max={999} />
          <NumberField label="Bordure" value={element.borderWidth ?? 0} onChange={(v) => set('borderWidth', v)} min={0} max={20} />
          {(element.borderWidth ?? 0) > 0 && (
            <ColorInput label="Couleur bordure" value={element.borderColor ?? '#000000'} onChange={(v) => set('borderColor', v)} />
          )}
        </>
      )}
    </div>
  );
}

// ─── Slide Background Properties ───────────────────────────────────────────

function SlideProperties({
  slide,
  theme,
  onChangeLayout,
  onChangeBackground,
}: {
  slide: PresentationSlide;
  theme: PresentationTheme;
  onChangeLayout: (layout: SlideLayout) => void;
  onChangeBackground: (bg: SlideBackground) => void;
}) {
  const bg = slide.background;
  const setBg = <K extends keyof SlideBackground>(key: K, val: SlideBackground[K]) =>
    onChangeBackground({ ...bg, [key]: val });

  return (
    <div className="space-y-3">
      <span className="text-sm font-medium text-slate-800">Propriétés de la slide</span>

      <SectionHeader title="Mise en page" icon={<Square size={12} />} />
      <select
        value={slide.layout}
        onChange={(e) => onChangeLayout(e.target.value as SlideLayout)}
        className="w-full rounded border border-slate-300 px-2 py-1.5 text-xs bg-white"
      >
        {LAYOUT_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.icon} {opt.label}
          </option>
        ))}
      </select>

      <SectionHeader title="Arrière-plan" icon={<Palette size={12} />} />
      <SelectField
        label="Type"
        value={bg.type}
        onChange={(v) => onChangeBackground({ ...bg, type: v as SlideBackground['type'] })}
        options={[
          { value: 'solid', label: 'Couleur unie' },
          { value: 'gradient', label: 'Dégradé' },
          { value: 'image', label: 'Image' },
        ]}
      />

      {bg.type === 'solid' && (
        <ColorInput label="Couleur" value={bg.color ?? theme.colors.background} onChange={(v) => setBg('color', v)} />
      )}

      {bg.type === 'gradient' && (
        <div className="space-y-2">
          <ColorInput label="Début" value={bg.gradientFrom ?? theme.colors.primary} onChange={(v) => setBg('gradientFrom', v)} />
          <ColorInput label="Fin" value={bg.gradientTo ?? theme.colors.secondary} onChange={(v) => setBg('gradientTo', v)} />
          <NumberField label="Angle (°)" value={bg.gradientAngle ?? 135} onChange={(v) => setBg('gradientAngle', v)} min={0} max={360} />
        </div>
      )}

      {bg.type === 'image' && (
        <div className="space-y-2">
          <label className="text-xs text-slate-600">
            <span className="block mb-1">URL de l&#39;image</span>
            <input
              type="text"
              value={bg.imageUrl ?? ''}
              onChange={(e) => setBg('imageUrl', e.target.value)}
              className="w-full rounded border border-slate-300 px-2 py-1 text-xs"
              placeholder="https://..."
            />
          </label>
          <label className="text-xs text-slate-600">
            <span className="block mb-1">Overlay (RGBA)</span>
            <input
              type="text"
              value={bg.overlay ?? ''}
              onChange={(e) => setBg('overlay', e.target.value)}
              className="w-full rounded border border-slate-300 px-2 py-1 text-xs"
              placeholder="rgba(0,0,0,0.4)"
            />
          </label>
        </div>
      )}
    </div>
  );
}

// ─── Main Panel ────────────────────────────────────────────────────────────

interface PropertiesPanelProps {
  slide: PresentationSlide;
  theme: PresentationTheme;
  selectedElement: SlideElement | null;
  onUpdateElement: (el: SlideElement) => void;
  onDeleteElement: (id: string) => void;
  onChangeLayout: (layout: SlideLayout) => void;
  onChangeBackground: (bg: SlideBackground) => void;
}

export default function PropertiesPanel({
  slide,
  theme,
  selectedElement,
  onUpdateElement,
  onDeleteElement,
  onChangeLayout,
  onChangeBackground,
}: PropertiesPanelProps) {
  return (
    <div className="w-72 border-l border-slate-200 bg-white overflow-y-auto p-4">
      {selectedElement ? (
        <ElementProperties
          element={selectedElement}
          onUpdate={onUpdateElement}
          onDelete={() => onDeleteElement(selectedElement.id)}
        />
      ) : (
        <SlideProperties
          slide={slide}
          theme={theme}
          onChangeLayout={onChangeLayout}
          onChangeBackground={onChangeBackground}
        />
      )}
    </div>
  );
}
