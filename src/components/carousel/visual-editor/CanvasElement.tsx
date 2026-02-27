"use client";

import React, { useState, useRef, useEffect } from 'react';
import { VisualElement } from '@/lib/carousel/types';
import { Lock } from 'lucide-react';

interface CanvasElementProps {
  element: VisualElement;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (updated: VisualElement) => void;
  canvasWidth: number;
  canvasHeight: number;
  isPreview?: boolean;
}

const CanvasElement: React.FC<CanvasElementProps> = ({
  element,
  isSelected,
  onSelect,
  onUpdate,
  canvasWidth,
  canvasHeight,
  isPreview = false
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isEditingText, setIsEditingText] = useState(false);
  const [resizeHandle, setResizeHandle] = useState('');
  const [autoFontSize, setAutoFontSize] = useState<number | null>(null);
  const dragStart = useRef({ x: 0, y: 0, elX: 0, elY: 0 });
  const resizeStart = useRef({ x: 0, y: 0, elW: 0, elH: 0, elX: 0, elY: 0 });
  const textRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);

  // Auto-size text: shrink font if content overflows element bounds
  useEffect(() => {
    if (element.type !== 'text' || isEditingText || !element.content) {
      setAutoFontSize(null);
      return;
    }
    const baseFontSize = element.fontSize || 16;
    const maxH = element.height;
    const maxW = element.width;
    
    // Create an off-screen measurement div
    const measure = document.createElement('div');
    measure.style.position = 'absolute';
    measure.style.visibility = 'hidden';
    measure.style.width = `${maxW - 16}px`; // account for padding
    measure.style.fontSize = `${baseFontSize}px`;
    measure.style.fontFamily = element.fontFamily || 'Inter';
    measure.style.fontWeight = String(element.fontWeight || 'normal');
    measure.style.lineHeight = element.lineHeight ? `${element.lineHeight}` : '1.4';
    measure.style.letterSpacing = element.letterSpacing ? `${element.letterSpacing}px` : 'normal';
    measure.style.wordWrap = 'break-word';
    measure.style.overflowWrap = 'break-word';
    measure.textContent = element.content;
    document.body.appendChild(measure);
    
    let fontSize = baseFontSize;
    const minFontSize = Math.max(8, baseFontSize * 0.4);
    
    while (measure.scrollHeight > maxH && fontSize > minFontSize) {
      fontSize -= 1;
      measure.style.fontSize = `${fontSize}px`;
    }
    
    document.body.removeChild(measure);
    setAutoFontSize(fontSize < baseFontSize ? fontSize : null);
  }, [element.content, element.fontSize, element.width, element.height, element.fontFamily, element.fontWeight, element.lineHeight, element.letterSpacing, element.type, isEditingText]);

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isPreview || element.locked || isEditingText) return;
    e.stopPropagation();
    onSelect();
    setIsDragging(true);
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      elX: element.x,
      elY: element.y
    };
  };

  const handleResizeMouseDown = (e: React.MouseEvent, handle: string) => {
    if (isPreview || element.locked) return;
    e.stopPropagation();
    e.preventDefault();
    setIsResizing(true);
    setResizeHandle(handle);
    resizeStart.current = {
      x: e.clientX,
      y: e.clientY,
      elW: element.width,
      elH: element.height,
      elX: element.x,
      elY: element.y
    };
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (isPreview || element.locked) return;
    e.stopPropagation();
    if (element.type === 'text') {
      setIsEditingText(true);
      onSelect();
      setTimeout(() => {
        if (textRef.current) {
          textRef.current.focus();
          // Select all text
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
    setIsEditingText(false);
    if (textRef.current) {
      onUpdate({ ...element, content: textRef.current.innerText });
    }
  };

  const handleTextKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsEditingText(false);
      (e.target as HTMLElement).blur();
    }
    // Don't propagate to avoid triggering element shortcuts
    e.stopPropagation();
  };

  useEffect(() => {
    if (!isDragging && !isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const dx = e.clientX - dragStart.current.x;
        const dy = e.clientY - dragStart.current.y;
        const newX = Math.round(Math.max(-element.width / 2, Math.min(canvasWidth - element.width / 2, dragStart.current.elX + dx)));
        const newY = Math.round(Math.max(-element.height / 2, Math.min(canvasHeight - element.height / 2, dragStart.current.elY + dy)));
        onUpdate({ ...element, x: newX, y: newY });
      }
      if (isResizing) {
        const dx = e.clientX - resizeStart.current.x;
        const dy = e.clientY - resizeStart.current.y;
        let newW = resizeStart.current.elW;
        let newH = resizeStart.current.elH;
        let newX = resizeStart.current.elX;
        let newY = resizeStart.current.elY;

        if (resizeHandle.includes('e')) newW = Math.max(24, resizeStart.current.elW + dx);
        if (resizeHandle.includes('s')) newH = Math.max(16, resizeStart.current.elH + dy);
        if (resizeHandle.includes('w')) {
          newW = Math.max(24, resizeStart.current.elW - dx);
          newX = resizeStart.current.elX + (resizeStart.current.elW - newW);
        }
        if (resizeHandle.includes('n')) {
          newH = Math.max(16, resizeStart.current.elH - dy);
          newY = resizeStart.current.elY + (resizeStart.current.elH - newH);
        }
        onUpdate({ ...element, x: Math.round(newX), y: Math.round(newY), width: Math.round(newW), height: Math.round(newH) });
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
  }, [isDragging, isResizing, element, onUpdate, canvasWidth, canvasHeight, resizeHandle]);

  // Resize handles
  const handles = ['nw', 'ne', 'se', 'sw'];
  const edgeHandles = ['n', 'e', 's', 'w'];
  const handlePositions: Record<string, React.CSSProperties> = {
    nw: { top: -5, left: -5, cursor: 'nw-resize' },
    ne: { top: -5, right: -5, cursor: 'ne-resize' },
    se: { bottom: -5, right: -5, cursor: 'se-resize' },
    sw: { bottom: -5, left: -5, cursor: 'sw-resize' },
    n: { top: -3, left: '50%', transform: 'translateX(-50%)', cursor: 'n-resize', width: 16, height: 6, borderRadius: 3 },
    e: { top: '50%', right: -3, transform: 'translateY(-50%)', cursor: 'e-resize', width: 6, height: 16, borderRadius: 3 },
    s: { bottom: -3, left: '50%', transform: 'translateX(-50%)', cursor: 's-resize', width: 16, height: 6, borderRadius: 3 },
    w: { top: '50%', left: -3, transform: 'translateY(-50%)', cursor: 'w-resize', width: 6, height: 16, borderRadius: 3 },
  };

  const renderContent = () => {
    switch (element.type) {
      case 'text':
        return isEditingText ? (
          <div
            ref={textRef}
            contentEditable
            suppressContentEditableWarning
            onBlur={handleTextBlur}
            onKeyDown={handleTextKeyDown}
            style={{
              width: '100%',
              height: '100%',
              fontSize: element.fontSize || 16,
              fontFamily: element.fontFamily || 'Inter',
              fontWeight: element.fontWeight || 'normal',
              color: element.color || '#000000',
              textAlign: element.textAlign || 'left',
              lineHeight: element.lineHeight ? `${element.lineHeight}` : '1.4',
              letterSpacing: element.letterSpacing ? `${element.letterSpacing}px` : undefined,
              textTransform: element.textTransform || 'none',
              backgroundColor: 'transparent',
              padding: '4px 8px',
              outline: 'none',
              cursor: 'text',
              wordWrap: 'break-word',
              overflowWrap: 'break-word',
              whiteSpace: 'pre-wrap',
              overflow: 'hidden',
            }}
          >
            {element.content || ''}
          </div>
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              fontSize: autoFontSize || element.fontSize || 16,
              fontFamily: element.fontFamily || 'Inter',
              fontWeight: element.fontWeight || 'normal',
              color: element.color || '#000000',
              textAlign: element.textAlign || 'left',
              lineHeight: element.lineHeight ? `${element.lineHeight}` : '1.4',
              letterSpacing: element.letterSpacing ? `${element.letterSpacing}px` : undefined,
              textTransform: element.textTransform || 'none',
              backgroundColor: 'transparent',
              padding: '4px 8px',
              overflow: 'hidden',
              wordWrap: 'break-word',
              overflowWrap: 'break-word',
              whiteSpace: 'pre-wrap',
              display: 'flex',
              alignItems: 'flex-start',
            }}
          >
            <span style={{ width: '100%' }}>{element.content || 'Double-click to edit'}</span>
          </div>
        );

      case 'image':
        return element.imageUrl ? (
          <img
            src={element.imageUrl}
            alt=""
            draggable={false}
            style={{
              width: '100%',
              height: '100%',
              objectFit: (element.objectFit as any) || 'cover',
              borderRadius: element.borderRadius || 0,
              display: 'block',
            }}
          />
        ) : (
          <div 
            className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400 text-xs"
            style={{ borderRadius: element.borderRadius || 0 }}
          >
            <span>No Image</span>
          </div>
        );

      case 'shape':
        return (
          <div
            style={{
              width: '100%',
              height: '100%',
              backgroundColor: element.backgroundColor || '#3b82f6',
              borderRadius: element.borderRadius || 0,
              borderWidth: element.borderWidth || 0,
              borderStyle: element.borderWidth ? 'solid' : 'none',
              borderColor: element.borderColor || 'transparent',
            }}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div
      data-element-id={element.id}
      data-element-locked={element.locked ? 'true' : undefined}
      style={{
        position: 'absolute',
        left: element.x,
        top: element.y,
        width: element.width,
        height: element.height,
        opacity: element.opacity ?? 1,
        transform: element.rotation ? `rotate(${element.rotation}deg)` : undefined,
        zIndex: element.zIndex ?? 1,
        cursor: isPreview ? 'default' : element.locked ? 'not-allowed' : isEditingText ? 'text' : isDragging ? 'grabbing' : 'grab',
        boxShadow: element.boxShadow || undefined,
        backgroundColor: element.type === 'text' ? (element.backgroundColor || 'transparent') : undefined,
        borderRadius: element.type === 'text' ? (element.borderRadius || 0) : undefined,
        userSelect: isEditingText ? 'text' : 'none',
      }}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
    >
      {renderContent()}

      {/* Selection outline */}
      {!isPreview && isSelected && (
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            border: '2px solid #3b82f6',
            borderRadius: element.borderRadius || 0,
          }}
        />
      )}

      {/* Lock indicator */}
      {!isPreview && isSelected && element.locked && (
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-orange-500 text-white px-2 py-0.5 rounded text-[9px] flex items-center gap-1 whitespace-nowrap">
          <Lock size={9} /> Locked
        </div>
      )}

      {/* Resize Handles */}
      {!isPreview && isSelected && !element.locked && !isEditingText && (
        <>
          {handles.map(h => (
            <div
              key={h}
              onMouseDown={(e) => handleResizeMouseDown(e, h)}
              style={{
                position: 'absolute',
                width: 10,
                height: 10,
                backgroundColor: '#ffffff',
                border: '2px solid #3b82f6',
                borderRadius: 2,
                zIndex: 100,
                ...handlePositions[h],
              }}
            />
          ))}
          {edgeHandles.map(h => (
            <div
              key={h}
              onMouseDown={(e) => handleResizeMouseDown(e, h)}
              style={{
                position: 'absolute',
                backgroundColor: '#3b82f6',
                zIndex: 100,
                ...handlePositions[h],
              }}
            />
          ))}
        </>
      )}
    </div>
  );
};

export default CanvasElement;
