"use client";

import React, { useRef, useCallback } from 'react';
import SlideElementEditor from './SlideElement';
import type { PresentationSlide, PresentationTheme, SlideFormat, SlideElement, SlideBackground } from '@/lib/presentations/types';

interface SlideCanvasProps {
  slide: PresentationSlide;
  theme: PresentationTheme;
  format: SlideFormat;
  selectedElementId: string | null;
  onSelectElement: (id: string | null) => void;
  onUpdateElement: (updated: SlideElement) => void;
  onUpdateBackground: (bg: SlideBackground) => void;
  canvasRef?: React.RefObject<HTMLDivElement | null>;
}

function bgStyleObj(bg: SlideBackground, theme: PresentationTheme): React.CSSProperties {
  switch (bg.type) {
    case 'gradient':
      return {
        background: `linear-gradient(${bg.gradientAngle ?? 135}deg, ${bg.gradientFrom ?? theme.colors.primary}, ${bg.gradientTo ?? theme.colors.secondary})`,
      };
    case 'image':
      return {
        backgroundImage: bg.overlay
          ? `linear-gradient(${bg.overlay}, ${bg.overlay}), url(${bg.imageUrl || ''})`
          : `url(${bg.imageUrl || ''})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      };
    case 'solid':
    default:
      return { backgroundColor: bg.color ?? theme.colors.background };
  }
}

export default function SlideCanvas({
  slide,
  theme,
  format,
  selectedElementId,
  onSelectElement,
  onUpdateElement,
  onUpdateBackground,
  canvasRef,
}: SlideCanvasProps) {
  const ratio = format === '16:9' ? 9 / 16 : 1123 / 794;

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    // Only deselect if clicking on the canvas itself (not an element)
    if (e.target === e.currentTarget || (e.target as HTMLElement).dataset?.canvasBg) {
      onSelectElement(null);
    }
  }, [onSelectElement]);

  return (
    <div className="flex-1 flex items-center justify-center p-6 bg-slate-100 overflow-auto">
      <div
        style={{
          width: '100%',
          maxWidth: format === '16:9' ? '960px' : '500px',
          aspectRatio: format === '16:9' ? '16/9' : '794/1123',
        }}
      >
        <div
          ref={canvasRef}
          data-canvas-bg
          onClick={handleCanvasClick}
          className="relative w-full rounded-lg shadow-2xl overflow-hidden"
          style={{
            paddingBottom: `${ratio * 100}%`,
            ...bgStyleObj(slide.background, theme),
          }}
        >
          <div className="absolute inset-0" data-canvas-bg onClick={handleCanvasClick}>
            {slide.elements.map((el) => (
              <SlideElementEditor
                key={el.id}
                element={el}
                theme={theme}
                isSelected={el.id === selectedElementId}
                onSelect={() => onSelectElement(el.id)}
                onUpdate={onUpdateElement}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
