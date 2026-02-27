"use client";

import React from 'react';
import type {
  PresentationSlide,
  PresentationTheme,
  SlideElement,
  SlideBackground,
  SlideFormat,
  CANVAS_DIMENSIONS,
} from '@/lib/presentations/types';

interface SlideRendererProps {
  slide: PresentationSlide;
  theme: PresentationTheme;
  format: SlideFormat;
  /** Scale factor relative to base canvas (e.g. 0.2 for thumbnail) */
  scale?: number;
  className?: string;
  style?: React.CSSProperties;
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

const ElementRenderer: React.FC<{
  element: SlideElement;
  theme: PresentationTheme;
}> = ({ element: el, theme }) => {
  const font = el.fontFamily === 'heading' ? theme.fontHeading : theme.fontBody;

  const base: React.CSSProperties = {
    position: 'absolute',
    left: `${el.x}%`,
    top: `${el.y}%`,
    width: `${el.width}%`,
    height: `${el.height}%`,
    opacity: el.opacity ?? 1,
    transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
    zIndex: el.zIndex ?? 1,
    backgroundColor: el.backgroundColor || undefined,
    borderRadius: el.borderRadius || undefined,
    border: el.borderWidth ? `${el.borderWidth}px solid ${el.borderColor || 'transparent'}` : undefined,
    boxShadow: el.boxShadow || undefined,
    fontSize: el.fontSize || undefined,
    fontWeight: el.fontWeight || undefined,
    fontFamily: `'${font}', system-ui, sans-serif`,
    color: el.color || undefined,
    textAlign: el.textAlign || undefined,
    lineHeight: el.lineHeight || undefined,
    letterSpacing: el.letterSpacing ? `${el.letterSpacing}px` : undefined,
    textTransform: (el.textTransform as React.CSSProperties['textTransform']) || undefined,
    overflow: 'hidden',
    wordWrap: 'break-word',
    overflowWrap: 'break-word',
    boxSizing: 'border-box',
  };

  if (el.type === 'image') {
    if (!el.imageUrl) {
      return (
        <div style={{ ...base, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', color: '#94a3b8', fontSize: 14 }}>
          Image
        </div>
      );
    }
    return (
      <div style={base}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={el.imageUrl}
          alt=""
          draggable={false}
          style={{
            width: '100%', height: '100%',
            objectFit: el.objectFit || 'cover',
            borderRadius: el.borderRadius || 0,
            display: 'block',
          }}
        />
      </div>
    );
  }

  if (el.type === 'shape') {
    return <div style={base} />;
  }

  if (el.type === 'stat') {
    return (
      <div style={{ ...base, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 16px' }}>
        <div style={{ fontSize: el.fontSize || 48, fontWeight: el.fontWeight || '800', color: el.color || theme.colors.primary, lineHeight: 1 }}>
          {el.statValue}
        </div>
        <div style={{ fontSize: Math.round((el.fontSize || 48) * 0.32), fontWeight: 500, color: theme.colors.textMuted, textTransform: 'uppercase', letterSpacing: 1 }}>
          {el.statLabel}
        </div>
      </div>
    );
  }

  // Text types
  const textStyle: React.CSSProperties = {
    ...base,
    padding: '4px 8px',
    whiteSpace: 'pre-wrap',
  };

  return (
    <div style={textStyle}>
      {el.content?.split('\n').map((line, i) => (
        <React.Fragment key={i}>
          {i > 0 && <br />}
          {line}
        </React.Fragment>
      ))}
    </div>
  );
};

const SlideRenderer: React.FC<SlideRendererProps> = ({
  slide,
  theme,
  format,
  scale = 1,
  className,
  style,
}) => {
  // 16:9 → 1920×1080, A4 → 794×1123
  const baseW = format === '16:9' ? 1920 : 794;
  const baseH = format === '16:9' ? 1080 : 794 * 1123 / 794;
  const ratio = baseH / baseW;

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        width: '100%',
        paddingBottom: `${ratio * 100}%`,
        overflow: 'hidden',
        ...style,
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          ...bgStyleObj(slide.background, theme),
        }}
      >
        {slide.elements.map((el) => (
          <ElementRenderer key={el.id} element={el} theme={theme} />
        ))}
      </div>
    </div>
  );
};

export default SlideRenderer;
