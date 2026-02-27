"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { SlideElement, PresentationTheme } from '@/lib/presentations/types';
import { Lock } from 'lucide-react';

interface SlideElementEditorProps {
  element: SlideElement;
  theme: PresentationTheme;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (updated: SlideElement) => void;
  isPreview?: boolean;
}

export default function SlideElementEditor({
  element: el,
  theme,
  isSelected,
  onSelect,
  onUpdate,
  isPreview = false,
}: SlideElementEditorProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState('');
  const dragStart = useRef({ x: 0, y: 0, elX: 0, elY: 0 });
  const resizeStart = useRef({ x: 0, y: 0, elW: 0, elH: 0, elX: 0, elY: 0 });
  const textRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const font = el.fontFamily === 'heading' ? theme.fontHeading : theme.fontBody;

  // ── Drag ──────────────────────────────────────────────────────────────
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isPreview || el.locked || isEditing) return;
    e.stopPropagation();
    onSelect();
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, elX: el.x, elY: el.y };
  };

  // ── Resize ────────────────────────────────────────────────────────────
  const handleResizeMouseDown = (e: React.MouseEvent, handle: string) => {
    if (isPreview || el.locked) return;
    e.stopPropagation();
    e.preventDefault();
    setIsResizing(true);
    setResizeHandle(handle);
    resizeStart.current = { x: e.clientX, y: e.clientY, elW: el.width, elH: el.height, elX: el.x, elY: el.y };
  };

  // ── Double-click to edit text ─────────────────────────────────────────
  const handleDoubleClick = (e: React.MouseEvent) => {
    if (isPreview || el.locked) return;
    e.stopPropagation();
    if (el.type !== 'image' && el.type !== 'shape') {
      setIsEditing(true);
      onSelect();
      setTimeout(() => {
        if (textRef.current) {
          textRef.current.focus();
          const sel = window.getSelection();
          const range = document.createRange();
          range.selectNodeContents(textRef.current);
          sel?.removeAllRanges();
          sel?.addRange(range);
        }
      }, 10);
    }
  };

  const handleTextBlur = () => {
    setIsEditing(false);
    if (textRef.current) {
      const newContent = textRef.current.innerText;
      if (el.type === 'stat') {
        // For stat, split into value (first line) and label (rest)
        const lines = newContent.split('\n');
        onUpdate({ ...el, statValue: lines[0] || '', statLabel: lines.slice(1).join('\n') || el.statLabel || '' });
      } else {
        onUpdate({ ...el, content: newContent });
      }
    }
  };

  const handleTextKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsEditing(false);
      (e.target as HTMLElement).blur();
    }
    e.stopPropagation();
  };

  // ── Mouse move/up for drag & resize ───────────────────────────────────
  useEffect(() => {
    if (!isDragging && !isResizing) return;

    const parent = containerRef.current?.parentElement;
    if (!parent) return;
    const parentRect = parent.getBoundingClientRect();

    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const dx = e.clientX - dragStart.current.x;
        const dy = e.clientY - dragStart.current.y;
        // Convert pixel delta to % of parent
        const dxPct = (dx / parentRect.width) * 100;
        const dyPct = (dy / parentRect.height) * 100;
        const newX = Math.max(-20, Math.min(100, dragStart.current.elX + dxPct));
        const newY = Math.max(-20, Math.min(100, dragStart.current.elY + dyPct));
        onUpdate({ ...el, x: Math.round(newX * 100) / 100, y: Math.round(newY * 100) / 100 });
      }
      if (isResizing) {
        const dx = e.clientX - resizeStart.current.x;
        const dy = e.clientY - resizeStart.current.y;
        const dxPct = (dx / parentRect.width) * 100;
        const dyPct = (dy / parentRect.height) * 100;
        let w = resizeStart.current.elW;
        let h = resizeStart.current.elH;
        let x = resizeStart.current.elX;
        let y = resizeStart.current.elY;

        if (resizeHandle.includes('e')) w = Math.max(2, resizeStart.current.elW + dxPct);
        if (resizeHandle.includes('s')) h = Math.max(2, resizeStart.current.elH + dyPct);
        if (resizeHandle.includes('w')) {
          w = Math.max(2, resizeStart.current.elW - dxPct);
          x = resizeStart.current.elX + (resizeStart.current.elW - w);
        }
        if (resizeHandle.includes('n')) {
          h = Math.max(2, resizeStart.current.elH - dyPct);
          y = resizeStart.current.elY + (resizeStart.current.elH - h);
        }

        onUpdate({
          ...el,
          x: Math.round(x * 100) / 100,
          y: Math.round(y * 100) / 100,
          width: Math.round(w * 100) / 100,
          height: Math.round(h * 100) / 100,
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, el, onUpdate, resizeHandle]);

  // ── Styles ────────────────────────────────────────────────────────────
  const wrapperStyle: React.CSSProperties = {
    position: 'absolute',
    left: `${el.x}%`,
    top: `${el.y}%`,
    width: `${el.width}%`,
    height: `${el.height}%`,
    opacity: el.opacity ?? 1,
    transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
    zIndex: el.zIndex ?? 1,
    cursor: isPreview ? 'default' : el.locked ? 'default' : isEditing ? 'text' : isDragging ? 'grabbing' : 'grab',
    userSelect: isEditing ? 'text' : 'none',
  };

  const textStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    fontSize: el.fontSize || 16,
    fontWeight: el.fontWeight || 'normal',
    fontFamily: `'${font}', system-ui, sans-serif`,
    color: el.color || '#000',
    textAlign: el.textAlign || 'left',
    lineHeight: el.lineHeight ? `${el.lineHeight}` : '1.4',
    letterSpacing: el.letterSpacing ? `${el.letterSpacing}px` : undefined,
    textTransform: (el.textTransform as React.CSSProperties['textTransform']) || 'none',
    padding: '4px 8px',
    overflow: 'hidden',
    wordWrap: 'break-word',
    overflowWrap: 'break-word',
    whiteSpace: 'pre-wrap',
    backgroundColor: el.backgroundColor || 'transparent',
    borderRadius: el.borderRadius || 0,
    boxSizing: 'border-box',
  };

  // ── Render content ────────────────────────────────────────────────────
  const renderContent = () => {
    if (el.type === 'image') {
      if (!el.imageUrl) {
        return (
          <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400 text-xs rounded"
            style={{ borderRadius: el.borderRadius || 0 }}>
            <span className="text-center">Cliquez pour<br />ajouter une image</span>
          </div>
        );
      }
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={el.imageUrl} alt="" draggable={false}
          style={{ width: '100%', height: '100%', objectFit: el.objectFit || 'cover', borderRadius: el.borderRadius || 0, display: 'block' }} />
      );
    }

    if (el.type === 'shape') {
      return (
        <div style={{ width: '100%', height: '100%', backgroundColor: el.backgroundColor || '#3b82f6', borderRadius: el.borderRadius || 0, border: el.borderWidth ? `${el.borderWidth}px solid ${el.borderColor || 'transparent'}` : undefined }} />
      );
    }

    if (el.type === 'stat') {
      if (isEditing) {
        return (
          <div ref={textRef} contentEditable suppressContentEditableWarning
            onBlur={handleTextBlur} onKeyDown={handleTextKeyDown}
            style={{ ...textStyle, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', outline: 'none', cursor: 'text' }}>
            {`${el.statValue || ''}\n${el.statLabel || ''}`}
          </div>
        );
      }
      return (
        <div style={{ ...textStyle, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <div style={{ fontSize: el.fontSize || 48, fontWeight: el.fontWeight || '800', color: el.color || theme.colors.primary, lineHeight: 1 }}>
            {el.statValue || '—'}
          </div>
          <div style={{ fontSize: Math.round((el.fontSize || 48) * 0.32), fontWeight: 500, color: theme.colors.textMuted, textTransform: 'uppercase', letterSpacing: 1 }}>
            {el.statLabel || 'Label'}
          </div>
        </div>
      );
    }

    // Text elements: heading, subheading, body, bulletList, quote
    if (isEditing) {
      return (
        <div ref={textRef} contentEditable suppressContentEditableWarning
          onBlur={handleTextBlur} onKeyDown={handleTextKeyDown}
          style={{ ...textStyle, outline: 'none', cursor: 'text' }}>
          {el.content || ''}
        </div>
      );
    }

    return (
      <div style={textStyle}>
        {(el.content || 'Double-cliquez pour éditer').split('\n').map((line, i) => (
          <React.Fragment key={i}>{i > 0 && <br />}{line}</React.Fragment>
        ))}
      </div>
    );
  };

  // ── Selection handles ─────────────────────────────────────────────────
  const corners = ['nw', 'ne', 'se', 'sw'] as const;
  const edges = ['n', 'e', 's', 'w'] as const;
  const handlePos: Record<string, React.CSSProperties> = {
    nw: { top: -4, left: -4, cursor: 'nw-resize' },
    ne: { top: -4, right: -4, cursor: 'ne-resize' },
    se: { bottom: -4, right: -4, cursor: 'se-resize' },
    sw: { bottom: -4, left: -4, cursor: 'sw-resize' },
    n: { top: -3, left: '50%', transform: 'translateX(-50%)', cursor: 'n-resize', width: 20, height: 6, borderRadius: 3 },
    e: { top: '50%', right: -3, transform: 'translateY(-50%)', cursor: 'e-resize', width: 6, height: 20, borderRadius: 3 },
    s: { bottom: -3, left: '50%', transform: 'translateX(-50%)', cursor: 's-resize', width: 20, height: 6, borderRadius: 3 },
    w: { top: '50%', left: -3, transform: 'translateY(-50%)', cursor: 'w-resize', width: 6, height: 20, borderRadius: 3 },
  };

  return (
    <div ref={containerRef} style={wrapperStyle} onMouseDown={handleMouseDown} onDoubleClick={handleDoubleClick}>
      {renderContent()}

      {/* Selection outline */}
      {!isPreview && isSelected && (
        <div className="absolute inset-0 pointer-events-none" style={{ border: '2px solid #3b82f6', borderRadius: el.borderRadius || 0 }} />
      )}

      {/* Locked badge */}
      {!isPreview && isSelected && el.locked && (
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-amber-500 text-white px-2 py-0.5 rounded text-[9px] flex items-center gap-1 whitespace-nowrap pointer-events-none">
          <Lock size={9} /> Verrouillé
        </div>
      )}

      {/* Resize handles */}
      {!isPreview && isSelected && !el.locked && !isEditing && (
        <>
          {corners.map((h) => (
            <div key={h} onMouseDown={(e) => handleResizeMouseDown(e, h)}
              style={{ position: 'absolute', width: 10, height: 10, backgroundColor: '#fff', border: '2px solid #3b82f6', borderRadius: 2, zIndex: 100, ...handlePos[h] }} />
          ))}
          {edges.map((h) => (
            <div key={h} onMouseDown={(e) => handleResizeMouseDown(e, h)}
              style={{ position: 'absolute', backgroundColor: '#3b82f6', zIndex: 100, ...handlePos[h] }} />
          ))}
        </>
      )}
    </div>
  );
}
