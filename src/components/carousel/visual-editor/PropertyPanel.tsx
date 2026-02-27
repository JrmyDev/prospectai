"use client";

import React, { useState } from 'react';
import { VisualElement } from '@/lib/carousel/types';
import { AVAILABLE_FONTS } from '@/lib/carousel/constants';
import {
  AlignLeft, AlignCenter, AlignRight, Bold, Type, Circle,
  Trash2, Copy, Lock, Unlock, ChevronDown, ChevronRight,
  Image, LetterText, Palette, Box, Layers, Eye, EyeOff, Upload,
  ArrowUp, ArrowDown, ChevronsUp, ChevronsDown,
} from 'lucide-react';

interface PropertyPanelProps {
  element: VisualElement;
  onUpdate: (updated: VisualElement) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onBringForward: () => void;
  onSendBackward: () => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
}

const SectionHeader: React.FC<{ title: string; icon: React.ReactNode; defaultOpen?: boolean; children: React.ReactNode }> = ({ title, icon, defaultOpen = true, children }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-slate-100 last:border-b-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full px-4 py-2.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider hover:bg-slate-50 transition-colors"
      >
        {icon}
        <span className="flex-1 text-left">{title}</span>
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
      </button>
      {open && <div className="px-4 pb-3 space-y-2.5">{children}</div>}
    </div>
  );
};

const PropertyPanel: React.FC<PropertyPanelProps> = ({
  element,
  onUpdate,
  onDelete,
  onDuplicate,
  onBringForward,
  onSendBackward,
  onBringToFront,
  onSendToBack,
}) => {
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onUpdate({ ...element, imageUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Element type badge & actions */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-white">
        <div className="flex items-center gap-2">
          {element.type === 'text' && <Type size={14} className="text-blue-500" />}
          {element.type === 'image' && <Image size={14} className="text-green-500" />}
          {element.type === 'shape' && <Circle size={14} className="text-purple-500" />}
          <span className="text-xs font-bold capitalize text-slate-700">{element.type} Element</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onUpdate({ ...element, locked: !element.locked })}
            className={`p-1.5 rounded transition-colors ${element.locked ? 'bg-orange-50 text-orange-500' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
            title={element.locked ? 'Unlock' : 'Lock'}
          >
            {element.locked ? <Lock size={13} /> : <Unlock size={13} />}
          </button>
          <button
            onClick={onDuplicate}
            className="p-1.5 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
            title="Duplicate"
          >
            <Copy size={13} />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            title="Delete"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Scrollable properties */}
      <div className="flex-1 overflow-y-auto">

        {/* Position & Size */}
        <SectionHeader title="Transform" icon={<Box size={12} />}>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-slate-400 font-medium">X</label>
              <input
                type="number"
                value={Math.round(element.x)}
                onChange={(e) => onUpdate({ ...element, x: Number(e.target.value) })}
                className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-md bg-white focus:ring-1 focus:ring-blue-300 outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 font-medium">Y</label>
              <input
                type="number"
                value={Math.round(element.y)}
                onChange={(e) => onUpdate({ ...element, y: Number(e.target.value) })}
                className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-md bg-white focus:ring-1 focus:ring-blue-300 outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 font-medium">Width</label>
              <input
                type="number"
                value={Math.round(element.width)}
                onChange={(e) => onUpdate({ ...element, width: Math.max(10, Number(e.target.value)) })}
                className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-md bg-white focus:ring-1 focus:ring-blue-300 outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 font-medium">Height</label>
              <input
                type="number"
                value={Math.round(element.height)}
                onChange={(e) => onUpdate({ ...element, height: Math.max(10, Number(e.target.value)) })}
                className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-md bg-white focus:ring-1 focus:ring-blue-300 outline-none"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-1">
            <div>
              <label className="text-[10px] text-slate-400 font-medium">Rotation</label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={-180}
                  max={180}
                  value={element.rotation ?? 0}
                  onChange={(e) => onUpdate({ ...element, rotation: Number(e.target.value) })}
                  className="flex-1 h-1 accent-blue-500"
                />
                <span className="text-[10px] text-slate-500 w-8 text-right">{element.rotation ?? 0}°</span>
              </div>
            </div>
            <div>
              <label className="text-[10px] text-slate-400 font-medium">Opacity</label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={(element.opacity ?? 1) * 100}
                  onChange={(e) => onUpdate({ ...element, opacity: Number(e.target.value) / 100 })}
                  className="flex-1 h-1 accent-blue-500"
                />
                <span className="text-[10px] text-slate-500 w-8 text-right">{Math.round((element.opacity ?? 1) * 100)}%</span>
              </div>
            </div>
          </div>
        </SectionHeader>

        {/* Layer ordering */}
        <SectionHeader title="Layer" icon={<Layers size={12} />} defaultOpen={false}>
          <div className="grid grid-cols-4 gap-1">
            <button onClick={onBringToFront} className="p-1.5 bg-slate-50 rounded text-slate-500 hover:bg-blue-50 hover:text-blue-600 transition-colors" title="Bring to Front">
              <ChevronsUp size={14} className="mx-auto" />
            </button>
            <button onClick={onBringForward} className="p-1.5 bg-slate-50 rounded text-slate-500 hover:bg-blue-50 hover:text-blue-600 transition-colors" title="Bring Forward">
              <ArrowUp size={14} className="mx-auto" />
            </button>
            <button onClick={onSendBackward} className="p-1.5 bg-slate-50 rounded text-slate-500 hover:bg-blue-50 hover:text-blue-600 transition-colors" title="Send Backward">
              <ArrowDown size={14} className="mx-auto" />
            </button>
            <button onClick={onSendToBack} className="p-1.5 bg-slate-50 rounded text-slate-500 hover:bg-blue-50 hover:text-blue-600 transition-colors" title="Send to Back">
              <ChevronsDown size={14} className="mx-auto" />
            </button>
          </div>
        </SectionHeader>

        {/* Text properties */}
        {element.type === 'text' && (
          <SectionHeader title="Typography" icon={<LetterText size={12} />}>
            {/* Font Family */}
            <div>
              <label className="text-[10px] text-slate-400 font-medium">Font</label>
              <select
                value={element.fontFamily || 'Inter'}
                onChange={(e) => onUpdate({ ...element, fontFamily: e.target.value })}
                className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-md bg-white focus:ring-1 focus:ring-blue-300 outline-none"
                style={{ fontFamily: element.fontFamily || 'Inter' }}
              >
                {AVAILABLE_FONTS.map(f => (
                  <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>{f.label}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {/* Font Size */}
              <div>
                <label className="text-[10px] text-slate-400 font-medium">Size</label>
                <input
                  type="number"
                  value={element.fontSize || 16}
                  onChange={(e) => onUpdate({ ...element, fontSize: Math.max(8, Number(e.target.value)) })}
                  className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-md bg-white focus:ring-1 focus:ring-blue-300 outline-none"
                />
              </div>
              {/* Line Height */}
              <div>
                <label className="text-[10px] text-slate-400 font-medium">Line Height</label>
                <input
                  type="number"
                  step={0.1}
                  value={element.lineHeight || 1.4}
                  onChange={(e) => onUpdate({ ...element, lineHeight: Number(e.target.value) })}
                  className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-md bg-white focus:ring-1 focus:ring-blue-300 outline-none"
                />
              </div>
            </div>

            {/* Bold & Text Transform */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => onUpdate({ ...element, fontWeight: element.fontWeight === 'bold' ? 'normal' : 'bold' })}
                className={`p-1.5 rounded text-xs transition-colors ${element.fontWeight === 'bold' ? 'bg-blue-100 text-blue-700' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                title="Bold"
              >
                <Bold size={14} />
              </button>
              <div className="w-px h-5 bg-slate-200 mx-1" />
              <button
                onClick={() => onUpdate({ ...element, textAlign: 'left' })}
                className={`p-1.5 rounded transition-colors ${element.textAlign === 'left' || !element.textAlign ? 'bg-blue-100 text-blue-700' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
              >
                <AlignLeft size={14} />
              </button>
              <button
                onClick={() => onUpdate({ ...element, textAlign: 'center' })}
                className={`p-1.5 rounded transition-colors ${element.textAlign === 'center' ? 'bg-blue-100 text-blue-700' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
              >
                <AlignCenter size={14} />
              </button>
              <button
                onClick={() => onUpdate({ ...element, textAlign: 'right' })}
                className={`p-1.5 rounded transition-colors ${element.textAlign === 'right' ? 'bg-blue-100 text-blue-700' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
              >
                <AlignRight size={14} />
              </button>
              <div className="w-px h-5 bg-slate-200 mx-1" />
              <select
                value={element.textTransform || 'none'}
                onChange={(e) => onUpdate({ ...element, textTransform: e.target.value as any })}
                className="text-[10px] px-1.5 py-1 border border-slate-200 rounded bg-white outline-none"
              >
                <option value="none">Normal</option>
                <option value="uppercase">UPPER</option>
                <option value="lowercase">lower</option>
              </select>
            </div>

            {/* Letter Spacing */}
            <div>
              <label className="text-[10px] text-slate-400 font-medium">Letter Spacing</label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={-2}
                  max={10}
                  step={0.5}
                  value={element.letterSpacing ?? 0}
                  onChange={(e) => onUpdate({ ...element, letterSpacing: Number(e.target.value) })}
                  className="flex-1 h-1 accent-blue-500"
                />
                <span className="text-[10px] text-slate-500 w-8 text-right">{element.letterSpacing ?? 0}px</span>
              </div>
            </div>

            {/* Text Color */}
            <div>
              <label className="text-[10px] text-slate-400 font-medium">Color</label>
              <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-md p-1.5">
                <input
                  type="color"
                  value={element.color || '#000000'}
                  onChange={(e) => onUpdate({ ...element, color: e.target.value })}
                  className="w-6 h-6 border-0 p-0 cursor-pointer rounded"
                />
                <input
                  type="text"
                  value={element.color || '#000000'}
                  onChange={(e) => onUpdate({ ...element, color: e.target.value })}
                  className="flex-1 text-[10px] font-mono outline-none uppercase text-slate-600"
                />
              </div>
            </div>
          </SectionHeader>
        )}

        {/* Image properties */}
        {element.type === 'image' && (
          <SectionHeader title="Image" icon={<Image size={12} />}>
            {element.imageUrl && (
              <div className="w-full h-20 rounded overflow-hidden border border-slate-200 mb-2">
                <img src={element.imageUrl} className="w-full h-full object-cover" alt="" />
              </div>
            )}
            <label className="flex items-center justify-center gap-2 py-2 px-3 text-xs bg-blue-50 text-blue-700 rounded-md border border-blue-100 hover:bg-blue-100 cursor-pointer transition">
              <Upload size={13} />
              {element.imageUrl ? 'Replace Image' : 'Upload Image'}
              <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
            </label>
            <div>
              <label className="text-[10px] text-slate-400 font-medium">Or paste URL</label>
              <input
                type="text"
                placeholder="https://..."
                value={element.imageUrl || ''}
                onChange={(e) => onUpdate({ ...element, imageUrl: e.target.value })}
                className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-md bg-white focus:ring-1 focus:ring-blue-300 outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 font-medium">Fit</label>
              <select
                value={element.objectFit || 'cover'}
                onChange={(e) => onUpdate({ ...element, objectFit: e.target.value as any })}
                className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-md bg-white focus:ring-1 focus:ring-blue-300 outline-none"
              >
                <option value="cover">Cover</option>
                <option value="contain">Contain</option>
                <option value="fill">Fill</option>
              </select>
            </div>
          </SectionHeader>
        )}

        {/* Appearance (background, border, radius) */}
        <SectionHeader title="Appearance" icon={<Palette size={12} />} defaultOpen={element.type !== 'text'}>
          <div>
            <label className="text-[10px] text-slate-400 font-medium">Background</label>
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-md p-1.5">
              <input
                type="color"
                value={element.backgroundColor || (element.type === 'shape' ? '#3b82f6' : '#ffffff')}
                onChange={(e) => onUpdate({ ...element, backgroundColor: e.target.value })}
                className="w-6 h-6 border-0 p-0 cursor-pointer rounded"
              />
              <input
                type="text"
                value={element.backgroundColor || (element.type === 'shape' ? '#3b82f6' : '')}
                onChange={(e) => onUpdate({ ...element, backgroundColor: e.target.value })}
                placeholder="transparent"
                className="flex-1 text-[10px] font-mono outline-none uppercase text-slate-600"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-slate-400 font-medium">Radius</label>
              <input
                type="number"
                value={element.borderRadius ?? 0}
                onChange={(e) => onUpdate({ ...element, borderRadius: Math.max(0, Number(e.target.value)) })}
                className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-md bg-white focus:ring-1 focus:ring-blue-300 outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 font-medium">Border Width</label>
              <input
                type="number"
                value={element.borderWidth ?? 0}
                onChange={(e) => onUpdate({ ...element, borderWidth: Math.max(0, Number(e.target.value)) })}
                className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-md bg-white focus:ring-1 focus:ring-blue-300 outline-none"
              />
            </div>
          </div>
          {(element.borderWidth ?? 0) > 0 && (
            <div>
              <label className="text-[10px] text-slate-400 font-medium">Border Color</label>
              <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-md p-1.5">
                <input
                  type="color"
                  value={element.borderColor || '#000000'}
                  onChange={(e) => onUpdate({ ...element, borderColor: e.target.value })}
                  className="w-6 h-6 border-0 p-0 cursor-pointer rounded"
                />
                <input
                  type="text"
                  value={element.borderColor || '#000000'}
                  onChange={(e) => onUpdate({ ...element, borderColor: e.target.value })}
                  className="flex-1 text-[10px] font-mono outline-none uppercase text-slate-600"
                />
              </div>
            </div>
          )}
        </SectionHeader>
      </div>
    </div>
  );
};

export default PropertyPanel;
