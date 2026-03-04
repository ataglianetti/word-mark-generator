import { useState, useEffect, useMemo, useCallback, useRef } from 'react';

// ═══════════════════════════════════════════
// Effect types & config (unchanged)
// ═══════════════════════════════════════════

type EffectType = 'flip' | 'blur' | 'stroke' | 'shadow' | 'glow' | 'emboss';

interface EffectInstance {
  id: number;
  type: EffectType;
  applyAll: boolean;
  letters: Set<string>;
  amount: number;
}

const EFFECT_OPTIONS: { value: EffectType; label: string }[] = [
  { value: 'flip', label: 'Flip' },
  { value: 'blur', label: 'Blur' },
  { value: 'stroke', label: 'Stroke' },
  { value: 'shadow', label: 'Shadow' },
  { value: 'glow', label: 'Glow' },
  { value: 'emboss', label: 'Emboss' },
];

const EFFECT_PARAMS: Record<EffectType, { label: string; min: number; max: number; step: number; defaultVal: number } | null> = {
  flip: null,
  blur: { label: 'Blur', min: 1, max: 20, step: 1, defaultVal: 4 },
  stroke: { label: 'Width', min: 1, max: 8, step: 0.5, defaultVal: 2 },
  shadow: { label: 'Distance', min: 1, max: 12, step: 1, defaultVal: 4 },
  glow: { label: 'Spread', min: 2, max: 30, step: 1, defaultVal: 10 },
  emboss: { label: 'Depth', min: 1, max: 6, step: 1, defaultVal: 2 },
};

// ═══════════════════════════════════════════
// Decoration types & config
// ═══════════════════════════════════════════

type DecorationType = 'bokeh' | 'shapes' | 'symbols' | 'texture' | 'scatter';
type PlacementMode = 'above' | 'below' | 'through' | 'around';

interface DecorationInstance {
  id: number;
  type: DecorationType;
  placement: PlacementMode;
  count: number;
  sizeMin: number;
  sizeMax: number;
  opacity: number;
  blur: number;
  colorMode: 'palette' | 'single';
  colorIndex: number;
  offsetX: number;
  offsetY: number;
  layerRotation: number;
  layerSpread: number;
  params: Record<string, number | string>;
}

const DECORATION_OPTIONS: { value: DecorationType; label: string }[] = [
  { value: 'bokeh', label: 'Bokeh' },
  { value: 'shapes', label: 'Shapes' },
  { value: 'symbols', label: 'Symbols' },
  { value: 'texture', label: 'Texture' },
  { value: 'scatter', label: 'Scatter' },
];

const PLACEMENT_OPTIONS: { value: PlacementMode; label: string }[] = [
  { value: 'above', label: 'Above' },
  { value: 'below', label: 'Below' },
  { value: 'through', label: 'Through' },
  { value: 'around', label: 'Around' },
];

const DECORATION_DEFAULTS: Record<DecorationType, Omit<DecorationInstance, 'id'>> = {
  bokeh: { type: 'bokeh', placement: 'around', count: 8, sizeMin: 20, sizeMax: 40, opacity: 0.6, blur: 4, colorMode: 'palette', colorIndex: 0, offsetX: 0, offsetY: 0, layerRotation: 0, layerSpread: 1, params: {} },
  shapes: { type: 'shapes', placement: 'around', count: 6, sizeMin: 15, sizeMax: 35, opacity: 0.5, blur: 0, colorMode: 'palette', colorIndex: 0, offsetX: 0, offsetY: 0, layerRotation: 0, layerSpread: 1, params: { shape: 'mixed', rotation: 0.5 } },
  symbols: { type: 'symbols', placement: 'around', count: 6, sizeMin: 20, sizeMax: 40, opacity: 0.6, blur: 0, colorMode: 'palette', colorIndex: 0, offsetX: 0, offsetY: 0, layerRotation: 0, layerSpread: 1, params: { symbolSet: 'music', customSymbols: '' } },
  texture: { type: 'texture', placement: 'through', count: 1, sizeMin: 1, sizeMax: 1, opacity: 0.15, blur: 0, colorMode: 'palette', colorIndex: 0, offsetX: 0, offsetY: 0, layerRotation: 0, layerSpread: 1, params: { pattern: 'dots', density: 0.5, strokeWidth: 1 } },
  scatter: { type: 'scatter', placement: 'around', count: 20, sizeMin: 2, sizeMax: 6, opacity: 0.5, blur: 0, colorMode: 'palette', colorIndex: 0, offsetX: 0, offsetY: 0, layerRotation: 0, layerSpread: 1, params: { particleShape: 'dot', spread: 1 } },
};

interface DecorationParamConfig {
  key: string;
  label: string;
  type: 'slider' | 'select';
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  step?: number;
}

const DECORATION_TYPE_PARAMS: Record<DecorationType, DecorationParamConfig[]> = {
  bokeh: [],
  shapes: [
    { key: 'shape', label: 'Shape', type: 'select', options: [
      { value: 'mixed', label: 'Mixed' },
      { value: 'triangle', label: 'Triangle' },
      { value: 'square', label: 'Square' },
      { value: 'diamond', label: 'Diamond' },
      { value: 'star', label: 'Star' },
    ]},
    { key: 'rotation', label: 'Rotation', type: 'slider', min: 0, max: 1, step: 0.05 },
  ],
  symbols: [
    { key: 'symbolSet', label: 'Set', type: 'select', options: [
      { value: 'music', label: 'Music' },
      { value: 'arrows', label: 'Arrows' },
      { value: 'stars', label: 'Stars' },
      { value: 'custom', label: 'Custom' },
    ]},
  ],
  texture: [
    { key: 'pattern', label: 'Pattern', type: 'select', options: [
      { value: 'dots', label: 'Dots' },
      { value: 'lines', label: 'Lines' },
      { value: 'crosshatch', label: 'Crosshatch' },
      { value: 'grid', label: 'Grid' },
    ]},
    { key: 'density', label: 'Density', type: 'slider', min: 0.1, max: 1, step: 0.05 },
    { key: 'strokeWidth', label: 'Stroke', type: 'slider', min: 0.5, max: 4, step: 0.5 },
  ],
  scatter: [
    { key: 'particleShape', label: 'Particle', type: 'select', options: [
      { value: 'dot', label: 'Dot' },
      { value: 'dash', label: 'Dash' },
      { value: 'spark', label: 'Spark' },
    ]},
    { key: 'spread', label: 'Spread', type: 'slider', min: 0.2, max: 2, step: 0.1 },
  ],
};

const CLIP_PATHS: Record<string, string> = {
  triangle: 'polygon(50% 0%, 0% 100%, 100% 100%)',
  square: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)',
  diamond: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
  star: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
};

const SYMBOL_SETS: Record<string, string[]> = {
  music: ['\u266A', '\u266B', '\u266C', '\u2669', '\uD834\uDD1E', '\uD834\uDD22'],
  arrows: ['\u2192', '\u2197', '\u2191', '\u2196', '\u2190', '\u2199', '\u2193', '\u2198'],
  stars: ['\u2605', '\u2726', '\u2727', '\u22C6', '\u2736', '\u2738'],
};

const SHAPE_KEYS = ['triangle', 'square', 'diamond', 'star'];

// ═══════════════════════════════════════════
// Positioned item for rendering
// ═══════════════════════════════════════════

interface DecorationItem {
  x: number;
  y: number;
  size: number;
  opacity: number;
  blur: number;
  color: string;
  rotation: number;
  zOrder: number; // 0=background, 1=foreground (through mode)
  sourceDecId: number;
  decorationType: DecorationType;
  clipPath?: string;
  symbol?: string;
  particleShape?: string;
  texturePattern?: string;
  textureDensity?: number;
  textureStrokeWidth?: number;
  textureWidth?: number;
  textureHeight?: number;
}

interface TextZone {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

// ═══════════════════════════════════════════
// Serialization
// ═══════════════════════════════════════════

function serializeEffects(effects: EffectInstance[]): string {
  return effects.map(fx =>
    `${fx.type}:${fx.applyAll ? '1' : '0'}:${Array.from(fx.letters).join('+')}:${fx.amount}`
  ).join('|');
}

function deserializeEffects(str: string): EffectInstance[] {
  if (!str) return [];
  return str.split('|').map((part, i) => {
    const [type, applyAll, letters, amount] = part.split(':');
    return {
      id: i,
      type: type as EffectType,
      applyAll: applyAll === '1',
      letters: new Set(letters ? letters.split('+').filter(Boolean) : []),
      amount: parseFloat(amount || '0'),
    };
  });
}

function serializeDecorations(decorations: DecorationInstance[]): string {
  return decorations.map(dec => {
    const paramStr = Object.entries(dec.params)
      .map(([k, v]) => `${k}=${v}`)
      .join(';');
    return `${dec.type}:${dec.placement}:${dec.count}:${dec.sizeMin}:${dec.sizeMax}:${dec.opacity}:${dec.blur}:${dec.colorMode}:${dec.colorIndex}:${dec.offsetX}:${dec.offsetY}:${dec.layerRotation}:${dec.layerSpread}:${paramStr}`;
  }).join('|');
}

function deserializeDecorations(str: string): DecorationInstance[] {
  if (!str) return [];
  return str.split('|').map((part, i) => {
    const segments = part.split(':');
    const params: Record<string, number | string> = {};

    // Backward compat: old format has 10 segments (index 9 = params).
    // New format has 13 segments (9=offsetX, 10=offsetY, 11=layerRotation, 12=params).
    // Detect by checking if segment 9 contains '=' (params) or is numeric (offsetX).
    let offsetX = 0, offsetY = 0, layerRotation = 0, layerSpread = 1;
    let paramSegment: string | undefined;

    if (segments.length > 10 && segments[9] !== undefined && !segments[9].includes('=')) {
      // New format: indices 9-12 are offset/rotation/spread, 13 is params
      offsetX = parseFloat(segments[9] || '0');
      offsetY = parseFloat(segments[10] || '0');
      layerRotation = parseFloat(segments[11] || '0');
      layerSpread = parseFloat(segments[12] || '1');
      paramSegment = segments[13];
    } else {
      // Old format: index 9 is params
      paramSegment = segments[9];
    }

    if (paramSegment) {
      paramSegment.split(';').forEach(kv => {
        const [k, ...rest] = kv.split('=');
        const v = rest.join('=');
        if (k) params[k] = isNaN(Number(v)) || v === '' ? v : Number(v);
      });
    }

    return {
      id: i,
      type: (segments[0] || 'bokeh') as DecorationType,
      placement: (segments[1] || 'around') as PlacementMode,
      count: parseInt(segments[2] || '8'),
      sizeMin: parseFloat(segments[3] || '20'),
      sizeMax: parseFloat(segments[4] || '40'),
      opacity: parseFloat(segments[5] || '0.6'),
      blur: parseFloat(segments[6] || '4'),
      colorMode: (segments[7] || 'palette') as 'palette' | 'single',
      colorIndex: parseInt(segments[8] || '0'),
      offsetX,
      offsetY,
      layerRotation,
      layerSpread,
      params,
    };
  });
}

// ═══════════════════════════════════════════
// Generation helpers
// ═══════════════════════════════════════════

function seededRandom(seed: number): number {
  return Math.abs((Math.sin(seed) * 10000) % 1);
}

function getPositionForPlacement(
  placement: PlacementMode,
  index: number,
  total: number,
  textZone: TextZone,
  baseSeed: number,
  spreadMul: number = 1,
): { x: number; y: number } {
  const r1 = seededRandom(baseSeed);
  const r2 = seededRandom(baseSeed + 1);
  const zoneW = textZone.right - textZone.left;
  const zoneH = textZone.bottom - textZone.top;
  const bandH = zoneH * 0.6 * spreadMul;

  switch (placement) {
    case 'above': {
      const x = textZone.left + r1 * zoneW;
      const y = textZone.top - 20 - r2 * bandH;
      return { x, y };
    }
    case 'below': {
      const x = textZone.left + r1 * zoneW;
      const y = textZone.bottom + 20 + r2 * bandH;
      return { x, y };
    }
    case 'through': {
      const fullW = (zoneW + bandH * 2) * spreadMul;
      const fullH = (zoneH + bandH * 2) * spreadMul;
      const cx = (textZone.left + textZone.right) / 2;
      const cy = (textZone.top + textZone.bottom) / 2;
      const x = cx - fullW / 2 + r1 * fullW;
      const y = cy - fullH / 2 + r2 * fullH;
      return { x, y };
    }
    case 'around':
    default: {
      // Polar distribution with text zone exclusion (matches original bokeh)
      let x = 0, y = 0, attempts = 0;
      while (attempts < 50) {
        const seed = index * 2654435761 + attempts * 12345;
        const rA = seededRandom(seed);
        const rB = seededRandom(seed + 1);
        const angle = (index / total) * 360 + (rA * 60 - 30);
        const dist = (100 + rB * 60) * spreadMul;
        x = Math.cos(angle * Math.PI / 180) * dist;
        y = Math.sin(angle * Math.PI / 180) * dist - 15;
        if (!(x > textZone.left && x < textZone.right && y > textZone.top && y < textZone.bottom)) break;
        attempts++;
      }
      return { x, y };
    }
  }
}

function generateDecorationItems(
  decorations: DecorationInstance[],
  textZone: TextZone,
  fullPaletteColors: string[],
  adjustSatFn: (hex: string, sat: number) => string,
  saturation: number,
): DecorationItem[] {
  const items: DecorationItem[] = [];

  for (const dec of decorations) {
    // Texture: single zone fill
    if (dec.type === 'texture') {
      const color = dec.colorMode === 'single'
        ? adjustSatFn(fullPaletteColors[dec.colorIndex % fullPaletteColors.length], saturation)
        : adjustSatFn(fullPaletteColors[0], saturation);

      const zoneW = textZone.right - textZone.left;
      const zoneH = textZone.bottom - textZone.top;
      const pad = 60;
      let tx: number, ty: number, tw: number, th: number;

      switch (dec.placement) {
        case 'above':
          tx = textZone.left - pad;
          ty = textZone.top - zoneH - pad;
          tw = zoneW + pad * 2;
          th = zoneH + pad;
          break;
        case 'below':
          tx = textZone.left - pad;
          ty = textZone.bottom;
          tw = zoneW + pad * 2;
          th = zoneH + pad;
          break;
        default: // through, around
          tx = textZone.left - pad;
          ty = textZone.top - pad;
          tw = zoneW + pad * 2;
          th = zoneH + pad * 2;
          break;
      }

      // Apply layer spread, rotation, then offset to texture zone origin
      tx *= dec.layerSpread;
      ty *= dec.layerSpread;
      if (dec.layerRotation !== 0) {
        const rad = dec.layerRotation * Math.PI / 180;
        const cos = Math.cos(rad), sin = Math.sin(rad);
        const rx = tx * cos - ty * sin;
        const ry = tx * sin + ty * cos;
        tx = rx; ty = ry;
      }
      tx += dec.offsetX;
      ty += dec.offsetY;

      items.push({
        x: tx, y: ty, size: 0,
        opacity: dec.opacity, blur: dec.blur, color, rotation: 0,
        zOrder: 0, sourceDecId: dec.id,
        decorationType: 'texture',
        texturePattern: String(dec.params.pattern ?? 'dots'),
        textureDensity: Number(dec.params.density ?? 0.5),
        textureStrokeWidth: Number(dec.params.strokeWidth ?? 1),
        textureWidth: tw, textureHeight: th,
      });
      continue;
    }

    // Particle-based decorations
    const spreadMul = dec.type === 'scatter' ? Number(dec.params.spread ?? 1) : 1;

    for (let i = 0; i < dec.count; i++) {
      const baseSeed = dec.id * 100000 + i * 2654435761;
      const pos = getPositionForPlacement(dec.placement, i, dec.count, textZone, baseSeed, spreadMul);
      const size = dec.sizeMin + seededRandom(baseSeed + 2) * (dec.sizeMax - dec.sizeMin);
      const itemOpacity = dec.opacity * (0.6 + seededRandom(baseSeed + 3) * 0.4);

      let color: string;
      if (dec.colorMode === 'single') {
        color = adjustSatFn(fullPaletteColors[dec.colorIndex % fullPaletteColors.length], saturation);
      } else {
        color = adjustSatFn(
          fullPaletteColors[Math.floor(seededRandom(baseSeed + 4) * fullPaletteColors.length)],
          saturation,
        );
      }

      const zOrder = dec.placement === 'through' ? (seededRandom(baseSeed + 5) < 0.6 ? 0 : 1) : 0;
      const rotation = dec.type === 'shapes'
        ? Number(dec.params.rotation ?? 0.5) * 360 * seededRandom(baseSeed + 6)
        : seededRandom(baseSeed + 6) * 360; // subtle rotation for scatter

      const item: DecorationItem = {
        x: pos.x, y: pos.y, size, opacity: itemOpacity, blur: dec.blur,
        color, rotation, zOrder, sourceDecId: dec.id, decorationType: dec.type,
      };

      // Apply per-layer spread, rotation around origin, then offset
      item.x *= dec.layerSpread;
      item.y *= dec.layerSpread;
      if (dec.layerRotation !== 0) {
        const rad = dec.layerRotation * Math.PI / 180;
        const cos = Math.cos(rad), sin = Math.sin(rad);
        const rx = item.x * cos - item.y * sin;
        const ry = item.x * sin + item.y * cos;
        item.x = rx; item.y = ry;
      }
      item.x += dec.offsetX;
      item.y += dec.offsetY;

      // Type-specific data
      if (dec.type === 'shapes') {
        const shapeParam = String(dec.params.shape ?? 'mixed');
        const key = shapeParam === 'mixed'
          ? SHAPE_KEYS[Math.floor(seededRandom(baseSeed + 7) * SHAPE_KEYS.length)]
          : shapeParam;
        item.clipPath = CLIP_PATHS[key];
      }

      if (dec.type === 'symbols') {
        const setName = String(dec.params.symbolSet ?? 'music');
        if (setName === 'custom') {
          const customStr = String(dec.params.customSymbols ?? '\u266A');
          const chars = [...customStr].filter(c => c.trim());
          item.symbol = chars.length > 0
            ? chars[Math.floor(seededRandom(baseSeed + 7) * chars.length)]
            : '\u266A';
        } else {
          const set = SYMBOL_SETS[setName] || SYMBOL_SETS.music;
          item.symbol = set[Math.floor(seededRandom(baseSeed + 7) * set.length)];
        }
      }

      if (dec.type === 'scatter') {
        item.particleShape = String(dec.params.particleShape ?? 'dot');
      }

      items.push(item);
    }
  }

  return items;
}

// ═══════════════════════════════════════════
// Canvas drawing helpers
// ═══════════════════════════════════════════

function drawStarPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, outerR: number, innerR: number, points: number) {
  for (let i = 0; i < points; i++) {
    const outerAngle = (i * 2 * Math.PI / points) - Math.PI / 2;
    const innerAngle = outerAngle + Math.PI / points;
    if (i === 0) ctx.moveTo(cx + Math.cos(outerAngle) * outerR, cy + Math.sin(outerAngle) * outerR);
    else ctx.lineTo(cx + Math.cos(outerAngle) * outerR, cy + Math.sin(outerAngle) * outerR);
    ctx.lineTo(cx + Math.cos(innerAngle) * innerR, cy + Math.sin(innerAngle) * innerR);
  }
  ctx.closePath();
}

function drawShapeOnCanvas(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, rotation: number, clipPath: string) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotation * Math.PI / 180);
  const r = size / 2;
  ctx.beginPath();

  if (clipPath === CLIP_PATHS.triangle) {
    ctx.moveTo(0, -r);
    ctx.lineTo(-r, r);
    ctx.lineTo(r, r);
    ctx.closePath();
  } else if (clipPath === CLIP_PATHS.diamond) {
    ctx.moveTo(0, -r);
    ctx.lineTo(r, 0);
    ctx.lineTo(0, r);
    ctx.lineTo(-r, 0);
    ctx.closePath();
  } else if (clipPath === CLIP_PATHS.star) {
    drawStarPath(ctx, 0, 0, r, r * 0.4, 5);
  } else {
    ctx.rect(-r, -r, size, size);
  }

  ctx.fill();
  ctx.restore();
}

function drawTextureOnCanvas(ctx: CanvasRenderingContext2D, item: DecorationItem, centerX: number, centerY: number) {
  const x = centerX + item.x;
  const y = centerY + item.y;
  const w = item.textureWidth || 400;
  const h = item.textureHeight || 200;
  const density = item.textureDensity || 0.5;
  const strokeWidth = item.textureStrokeWidth || 1;
  const gap = Math.max(4, 30 - density * 25);
  const pattern = item.texturePattern || 'dots';

  ctx.save();
  ctx.globalAlpha = item.opacity;
  ctx.fillStyle = item.color;
  ctx.strokeStyle = item.color;
  ctx.lineWidth = strokeWidth;

  // Clip to zone
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();

  switch (pattern) {
    case 'dots':
      for (let dx = 0; dx < w; dx += gap * 2) {
        for (let dy = 0; dy < h; dy += gap * 2) {
          ctx.beginPath();
          ctx.arc(x + dx + gap, y + dy + gap, strokeWidth, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      break;
    case 'lines':
      ctx.beginPath();
      for (let offset = -(w + h); offset < w + h; offset += gap) {
        ctx.moveTo(x + offset, y);
        ctx.lineTo(x + offset + h, y + h);
      }
      ctx.stroke();
      break;
    case 'crosshatch':
      ctx.beginPath();
      for (let offset = -(w + h); offset < w + h; offset += gap) {
        ctx.moveTo(x + offset, y);
        ctx.lineTo(x + offset + h, y + h);
        ctx.moveTo(x + w - offset, y);
        ctx.lineTo(x + w - offset - h, y + h);
      }
      ctx.stroke();
      break;
    case 'grid':
      ctx.beginPath();
      for (let dx = 0; dx <= w; dx += gap) {
        ctx.moveTo(x + dx, y);
        ctx.lineTo(x + dx, y + h);
      }
      for (let dy = 0; dy <= h; dy += gap) {
        ctx.moveTo(x, y + dy);
        ctx.lineTo(x + w, y + dy);
      }
      ctx.stroke();
      break;
  }

  ctx.restore();
}

function drawDecorationItem(ctx: CanvasRenderingContext2D, item: DecorationItem, centerX: number, centerY: number) {
  if (item.decorationType === 'texture') {
    drawTextureOnCanvas(ctx, item, centerX, centerY);
    return;
  }

  const x = centerX + item.x;
  const y = centerY + item.y;

  ctx.save();
  ctx.globalAlpha = item.opacity;
  if (item.blur > 0) ctx.filter = `blur(${item.blur}px)`;
  ctx.fillStyle = item.color;

  switch (item.decorationType) {
    case 'bokeh':
      ctx.beginPath();
      ctx.arc(x, y, item.size / 2, 0, Math.PI * 2);
      ctx.fill();
      break;

    case 'shapes':
      drawShapeOnCanvas(ctx, x, y, item.size, item.rotation, item.clipPath || '');
      break;

    case 'symbols':
      ctx.font = `${item.size}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(item.symbol || '\u266A', x, y);
      break;

    case 'scatter':
      if (item.particleShape === 'dash') {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(item.rotation * Math.PI / 180);
        const hw = item.size * 1.5;
        const hh = item.size / 2;
        ctx.beginPath();
        ctx.ellipse(0, 0, hw, hh, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (item.particleShape === 'spark') {
        ctx.beginPath();
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(item.rotation * Math.PI / 180);
        ctx.ellipse(0, 0, item.size / 2, item.size * 1.25, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(x, y, item.size / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
  }

  ctx.restore();
}

// ═══════════════════════════════════════════
// ID counters
// ═══════════════════════════════════════════

let nextEffectId = 100;
let nextDecorationId = 200;

// ═══════════════════════════════════════════
// App
// ═══════════════════════════════════════════

export default function App() {
  const getInitialState = () => {
    const params = new URLSearchParams(window.location.search);

    // Decoration backward compat: d param > cc param > default
    let decorations: DecorationInstance[];
    const dParam = params.get('d');
    const ccParam = params.get('cc');
    if (dParam) {
      decorations = deserializeDecorations(dParam);
    } else if (ccParam) {
      const count = parseInt(ccParam);
      decorations = count > 0
        ? [{ ...DECORATION_DEFAULTS.bokeh, id: 0, count }]
        : [];
    } else {
      decorations = [{ ...DECORATION_DEFAULTS.bokeh, id: 0 }];
    }

    return {
      text: params.get('t') || 'bokeh',
      fontFamily: params.get('f') || 'Righteous',
      fontWeight: params.get('fw') || '400',
      darkBg: params.get('bg') !== 'light',
      saturation: parseInt(params.get('s') || '100'),
      paletteIndex: parseInt(params.get('p') || '2'),
      kerning: parseFloat(params.get('k') || '0.05'),
      numColors: parseInt(params.get('nc') || '5'),
      selectedColorIndex: parseInt(params.get('sci') || '0'),
      effects: deserializeEffects(params.get('fx') || ''),
      decorations,
    };
  };

  const initialState = getInitialState();

  const [text, setText] = useState(initialState.text);
  const [fontFamily, setFontFamily] = useState(initialState.fontFamily);
  const [fontWeight, setFontWeight] = useState(initialState.fontWeight);
  const [darkBg, setDarkBg] = useState(initialState.darkBg);
  const [saturation, setSaturation] = useState(initialState.saturation);
  const [paletteIndex, setPaletteIndex] = useState(initialState.paletteIndex);
  const [showControls, setShowControls] = useState(true);
  const [kerning, setKerning] = useState(initialState.kerning);
  const [numColors, setNumColors] = useState(initialState.numColors);
  const [selectedColorIndex, setSelectedColorIndex] = useState(initialState.selectedColorIndex);
  const [effects, setEffects] = useState<EffectInstance[]>(initialState.effects);
  const [decorations, setDecorations] = useState<DecorationInstance[]>(initialState.decorations);
  const [textZone, setTextZone] = useState<TextZone>({ left: -200, right: 200, top: -60, bottom: 60 });
  const [dragging, setDragging] = useState<{ decId: number; startX: number; startY: number; origOffsetX: number; origOffsetY: number } | null>(null);

  // ── Drag-to-move handlers ──

  useEffect(() => {
    if (!dragging) return;
    const onPointerMove = (e: PointerEvent) => {
      const dx = e.clientX - dragging.startX;
      const dy = e.clientY - dragging.startY;
      setDecorations(prev => prev.map(d =>
        d.id === dragging.decId
          ? { ...d, offsetX: Math.round(dragging.origOffsetX + dx), offsetY: Math.round(dragging.origOffsetY + dy) }
          : d
      ));
    };
    const onPointerUp = () => setDragging(null);
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
    return () => {
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
    };
  }, [dragging]);

  const handleDecPointerDown = useCallback((decId: number, e: React.PointerEvent) => {
    const dec = decorations.find(d => d.id === decId);
    if (!dec) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDragging({ decId, startX: e.clientX, startY: e.clientY, origOffsetX: dec.offsetX, origOffsetY: dec.offsetY });
  }, [decorations]);

  // ── Effect CRUD ──

  const addEffect = () => {
    const type: EffectType = 'flip';
    setEffects(prev => [...prev, {
      id: nextEffectId++,
      type,
      applyAll: true,
      letters: new Set(),
      amount: EFFECT_PARAMS[type]?.defaultVal ?? 0,
    }]);
  };

  const removeEffect = (id: number) => {
    setEffects(prev => prev.filter(fx => fx.id !== id));
  };

  const updateEffect = (id: number, updates: Partial<Omit<EffectInstance, 'id'>>) => {
    setEffects(prev => prev.map(fx => {
      if (fx.id !== id) return fx;
      const next = { ...fx, ...updates };
      if (updates.type && updates.type !== fx.type) {
        next.amount = EFFECT_PARAMS[updates.type]?.defaultVal ?? 0;
      }
      return next;
    }));
  };

  const toggleEffectLetter = (id: number, letter: string) => {
    setEffects(prev => prev.map(fx => {
      if (fx.id !== id) return fx;
      const next = new Set(fx.letters);
      if (next.has(letter)) { next.delete(letter); } else { next.add(letter); }
      return { ...fx, letters: next };
    }));
  };

  // ── Decoration CRUD ──

  const addDecoration = () => {
    const type: DecorationType = 'bokeh';
    setDecorations(prev => [...prev, { ...DECORATION_DEFAULTS[type], id: nextDecorationId++ }]);
  };

  const removeDecoration = (id: number) => {
    setDecorations(prev => prev.filter(d => d.id !== id));
  };

  const updateDecoration = (id: number, updates: Partial<Omit<DecorationInstance, 'id'>>) => {
    setDecorations(prev => prev.map(d => {
      if (d.id !== id) return d;
      const next = { ...d, ...updates };
      // When switching type, reset to that type's defaults (keep placement)
      if (updates.type && updates.type !== d.type) {
        const defaults = DECORATION_DEFAULTS[updates.type];
        return {
          ...defaults,
          id: d.id,
          placement: d.placement,
          colorMode: d.colorMode,
          colorIndex: d.colorIndex,
        };
      }
      return next;
    }));
  };

  const updateDecorationParam = (id: number, key: string, value: number | string) => {
    setDecorations(prev => prev.map(d => {
      if (d.id !== id) return d;
      return { ...d, params: { ...d.params, [key]: value } };
    }));
  };

  // ── URL sync ──

  useEffect(() => {
    const params = new URLSearchParams();
    params.set('t', text);
    params.set('f', fontFamily);
    params.set('fw', fontWeight);
    params.set('bg', darkBg ? 'dark' : 'light');
    params.set('s', saturation.toString());
    params.set('p', paletteIndex.toString());
    params.set('k', kerning.toString());
    params.set('nc', numColors.toString());
    params.set('sci', selectedColorIndex.toString());
    if (effects.length > 0) {
      params.set('fx', serializeEffects(effects));
    }
    if (decorations.length > 0) {
      params.set('d', serializeDecorations(decorations));
    }
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, '', newUrl);
  }, [text, fontFamily, fontWeight, darkBg, saturation, paletteIndex, kerning, numColors, selectedColorIndex, effects, decorations]);

  // ── Font & color config ──

  const fontOptions = [
    'Fredoka', 'Righteous', 'Rubik', 'Baloo 2', 'DM Sans',
    'Caveat', 'Montserrat', 'Space Grotesk', 'Outfit'
  ];

  const colorPalettes = [
    { name: 'Pastel Dream', colors: ['#C3E2E6', '#F7DAE5', '#D0CCE0', '#FFF2E1'] },
    { name: 'Earthy Tones', colors: ['#635573', '#79BAA9', '#F6D1A7', '#C78175'] },
    { name: 'Sunset Vibes', colors: ['#A891BF', '#D99EB0', '#FFCDAB', '#FFE8BD', '#81B4B8'] },
    { name: 'Light Bright', colors: ['#FF1493', '#00FFFF', '#00FF00', '#FFFF00', '#FF4500'] },
    { name: 'Neon Nights', colors: ['#FF10F0', '#00F0FF', '#39FF14', '#FFF01F', '#FF006E'] },
    { name: 'Retro Toy Box', colors: ['#FF4444', '#4169E1', '#FFD700', '#32CD32', '#FF69B4'] },
    { name: 'Miami Vice', colors: ['#FF00FF', '#00FFFF', '#7B68EE', '#FFD700', '#FF1493'] }
  ];

  const colors = colorPalettes[paletteIndex].colors.slice(0, numColors);
  const displayColors = numColors === 1
    ? [colorPalettes[paletteIndex].colors[selectedColorIndex]]
    : colors;
  const fullPaletteColors = colorPalettes[paletteIndex].colors;

  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : null;
  };

  const rgbToHsl = (r: number, g: number, b: number) => {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    return { h: h * 360, s: s * 100, l: l * 100 };
  };

  const adjustSaturation = (hex: string, satMul: number) => {
    const rgb = hexToRgb(hex);
    if (!rgb) return hex;
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    return `hsl(${hsl.h}, ${Math.min(100, (hsl.s * satMul) / 100)}%, ${hsl.l}%)`;
  };

  const adjustedColors = displayColors.map(c => adjustSaturation(c, saturation));

  // ── Text zone measurement ──

  const wordmarkRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = wordmarkRef.current;
    const parent = containerRef.current;
    if (!el || !parent) return;

    const measure = () => {
      const parentRect = parent.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      const cx = parentRect.left + parentRect.width / 2;
      const cy = parentRect.top + parentRect.height / 2;
      const newZone: TextZone = {
        left: elRect.left - cx,
        right: elRect.right - cx,
        top: elRect.top - cy,
        bottom: elRect.bottom - cy,
      };
      setTextZone(prev => {
        if (Math.abs(prev.left - newZone.left) < 1 && Math.abs(prev.right - newZone.right) < 1 &&
            Math.abs(prev.top - newZone.top) < 1 && Math.abs(prev.bottom - newZone.bottom) < 1) return prev;
        return newZone;
      });
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [text, fontFamily, fontWeight, kerning]);

  // ── Decoration item generation ──

  const decorationItems = useMemo(
    () => generateDecorationItems(decorations, textZone, fullPaletteColors, adjustSaturation, saturation),
    [decorations, textZone, fullPaletteColors, saturation],
  );

  const backgroundItems = useMemo(() => decorationItems.filter(item => item.zOrder === 0), [decorationItems]);
  const foregroundItems = useMemo(() => decorationItems.filter(item => item.zOrder === 1), [decorationItems]);

  // ── Character styling (unchanged) ──

  const uniqueLetters = Array.from(new Set(text.toLowerCase().split('').filter(c => c.trim() !== '')));

  const getCharStyle = (char: string, colorIndex: number): React.CSSProperties => {
    const color = adjustedColors[colorIndex % adjustedColors.length];
    const style: React.CSSProperties = { display: 'inline-block', color };

    const transforms: string[] = [];
    const filters: string[] = [];
    const shadows: string[] = [];
    let hasStroke = false;
    let strokeWidth = 2;

    for (const fx of effects) {
      const applies = fx.applyAll || fx.letters.has(char.toLowerCase());
      if (!applies) continue;

      switch (fx.type) {
        case 'flip':
          transforms.push('scaleX(-1)');
          break;
        case 'blur':
          filters.push(`blur(${fx.amount}px)`);
          break;
        case 'stroke':
          hasStroke = true;
          strokeWidth = fx.amount;
          break;
        case 'shadow':
          shadows.push(`${fx.amount}px ${fx.amount}px ${fx.amount * 0.5}px rgba(0,0,0,0.5)`);
          break;
        case 'glow':
          shadows.push(`0 0 ${fx.amount}px ${color}, 0 0 ${fx.amount * 2}px ${color}`);
          break;
        case 'emboss': {
          const d = fx.amount;
          shadows.push(`${d}px ${d}px ${d}px rgba(0,0,0,0.4), -${d * 0.5}px -${d * 0.5}px ${d}px rgba(255,255,255,0.3)`);
          break;
        }
      }
    }

    if (transforms.length) style.transform = transforms.join(' ');
    if (filters.length) style.filter = filters.join(' ');
    if (shadows.length) style.textShadow = shadows.join(', ');
    if (hasStroke) {
      style.color = 'transparent';
      style.WebkitTextStroke = `${strokeWidth}px ${color}`;
    }

    return style;
  };

  // ── Decoration HTML rendering ──

  const renderDecorationItem = (item: DecorationItem, key: string) => {
    if (item.decorationType === 'texture') {
      const pattern = item.texturePattern || 'dots';
      const density = item.textureDensity || 0.5;
      const sw = item.textureStrokeWidth || 1;
      const gap = Math.max(4, 30 - density * 25);

      let backgroundImage: string;
      switch (pattern) {
        case 'dots':
          backgroundImage = `radial-gradient(circle, ${item.color} ${sw}px, transparent ${sw}px)`;
          break;
        case 'lines':
          backgroundImage = `repeating-linear-gradient(45deg, transparent, transparent ${gap}px, ${item.color} ${gap}px, ${item.color} ${gap + sw}px)`;
          break;
        case 'crosshatch':
          backgroundImage = `repeating-linear-gradient(45deg, transparent, transparent ${gap}px, ${item.color} ${gap}px, ${item.color} ${gap + sw}px), repeating-linear-gradient(-45deg, transparent, transparent ${gap}px, ${item.color} ${gap}px, ${item.color} ${gap + sw}px)`;
          break;
        case 'grid':
          backgroundImage = `repeating-linear-gradient(0deg, transparent, transparent ${gap}px, ${item.color} ${gap}px, ${item.color} ${gap + sw}px), repeating-linear-gradient(90deg, transparent, transparent ${gap}px, ${item.color} ${gap}px, ${item.color} ${gap + sw}px)`;
          break;
        default:
          backgroundImage = 'none';
      }

      return (
        <div key={key} style={{
          position: 'absolute', left: '50%', top: '50%',
          transform: `translate(calc(-50% + ${item.x}px), calc(-50% + ${item.y}px))`,
          width: `${item.textureWidth}px`, height: `${item.textureHeight}px`,
          opacity: item.opacity,
          filter: item.blur > 0 ? `blur(${item.blur}px)` : undefined,
          pointerEvents: 'none' as const,
          backgroundImage,
          backgroundSize: pattern === 'dots' ? `${gap * 2}px ${gap * 2}px` : undefined,
        }} />
      );
    }

    const baseStyle: React.CSSProperties = {
      position: 'absolute', left: '50%', top: '50%',
      transform: `translate(calc(-50% + ${item.x}px), calc(-50% + ${item.y}px)) rotate(${item.rotation}deg)`,
      opacity: item.opacity,
      filter: item.blur > 0 ? `blur(${item.blur}px)` : undefined,
      pointerEvents: 'none' as const,
    };

    switch (item.decorationType) {
      case 'bokeh':
        return (
          <div key={key} className="rounded-full" style={{
            ...baseStyle,
            width: `${item.size}px`, height: `${item.size}px`,
            backgroundColor: item.color,
          }} />
        );

      case 'shapes':
        return (
          <div key={key} style={{
            ...baseStyle,
            width: `${item.size}px`, height: `${item.size}px`,
            backgroundColor: item.color,
            clipPath: item.clipPath,
          }} />
        );

      case 'symbols':
        return (
          <span key={key} style={{
            ...baseStyle,
            fontSize: `${item.size}px`,
            color: item.color,
            lineHeight: 1,
          }}>
            {item.symbol}
          </span>
        );

      case 'scatter': {
        if (item.particleShape === 'dash') {
          return (
            <div key={key} style={{
              ...baseStyle,
              width: `${item.size * 3}px`, height: `${item.size}px`,
              backgroundColor: item.color,
              borderRadius: `${item.size / 2}px`,
            }} />
          );
        }
        if (item.particleShape === 'spark') {
          return (
            <div key={key} style={{
              ...baseStyle,
              width: `${item.size}px`, height: `${item.size * 2.5}px`,
              backgroundColor: item.color,
              borderRadius: '50% 50% 50% 50% / 30% 30% 70% 70%',
            }} />
          );
        }
        return (
          <div key={key} className="rounded-full" style={{
            ...baseStyle,
            width: `${item.size}px`, height: `${item.size}px`,
            backgroundColor: item.color,
          }} />
        );
      }

      default:
        return null;
    }
  };

  // ── Export ──

  const exportWordmark = useCallback(async () => {
    const el = wordmarkRef.current;
    if (!el) return;
    const container = containerRef.current;
    if (!container) return;
    const scale = 4;
    const rect = container.getBoundingClientRect();
    const canvas = document.createElement('canvas');
    canvas.width = rect.width * scale;
    canvas.height = rect.height * scale;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(scale, scale);
    await document.fonts.ready;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // 1. Draw background decorations
    for (const item of backgroundItems) {
      drawDecorationItem(ctx, item, centerX, centerY);
    }

    // 2. Draw text
    const fontSize = 100;
    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}, sans-serif`;
    ctx.textBaseline = 'alphabetic';

    const chars = text.split('');
    const kerningPx = kerning * fontSize;
    let totalWidth = 0;
    const charWidths: number[] = [];
    for (const char of chars) {
      const w = ctx.measureText(char).width;
      charWidths.push(w);
      totalWidth += w + kerningPx;
    }
    totalWidth -= kerningPx;

    const metrics = ctx.measureText(text);
    const ascent = metrics.actualBoundingBoxAscent || fontSize * 0.8;
    const descent = metrics.actualBoundingBoxDescent || fontSize * 0.2;
    const elRect = el.getBoundingClientRect();
    const offsetX = elRect.left - rect.left;
    const offsetY = elRect.top - rect.top;
    const startX = offsetX + (elRect.width - totalWidth) / 2;
    const baselineY = offsetY + (elRect.height - (ascent + descent)) / 2 + ascent;

    let x = startX;
    chars.forEach((char, idx) => {
      const color = adjustedColors[idx % displayColors.length];
      const charWidth = charWidths[idx];
      ctx.save();

      let hasStroke = false;
      let strokeW = 2;

      for (const fx of effects) {
        const applies = fx.applyAll || fx.letters.has(char.toLowerCase());
        if (!applies) continue;
        if (fx.type === 'flip') {
          ctx.translate(x + charWidth / 2, 0);
          ctx.scale(-1, 1);
          ctx.translate(-(x + charWidth / 2), 0);
        }
        if (fx.type === 'blur') ctx.filter = `blur(${fx.amount}px)`;
        if (fx.type === 'shadow') {
          ctx.shadowOffsetX = fx.amount; ctx.shadowOffsetY = fx.amount;
          ctx.shadowBlur = fx.amount * 0.5; ctx.shadowColor = 'rgba(0,0,0,0.5)';
        }
        if (fx.type === 'glow') {
          ctx.shadowBlur = fx.amount * 2; ctx.shadowColor = color;
        }
        if (fx.type === 'emboss') {
          ctx.shadowOffsetX = fx.amount; ctx.shadowOffsetY = fx.amount;
          ctx.shadowBlur = fx.amount; ctx.shadowColor = 'rgba(0,0,0,0.4)';
        }
        if (fx.type === 'stroke') { hasStroke = true; strokeW = fx.amount; }
      }

      if (hasStroke) {
        ctx.strokeStyle = color; ctx.lineWidth = strokeW;
        ctx.strokeText(char, x, baselineY);
      } else {
        ctx.fillStyle = color;
        ctx.fillText(char, x, baselineY);
      }
      ctx.restore();
      x += charWidth + kerningPx;
    });

    // 3. Draw foreground decorations
    for (const item of foregroundItems) {
      drawDecorationItem(ctx, item, centerX, centerY);
    }

    const link = document.createElement('a');
    link.download = `${text}-wordmark-${scale}x.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }, [text, fontFamily, fontWeight, kerning, displayColors, adjustedColors, effects, backgroundItems, foregroundItems]);

  // ═══════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════

  return (
    <div className="min-h-screen p-12 relative" style={{ backgroundColor: darkBg ? '#000000' : '#ffffff' }}>
      {/* Download icon */}
      <button
        onClick={exportWordmark}
        className="fixed top-4 right-4 z-50 w-10 h-10 flex items-center justify-center rounded-lg bg-neutral-800/80 hover:bg-neutral-700 text-white transition-colors backdrop-blur-sm"
        title="Download PNG (4x)"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      </button>

      <div className="max-w-7xl mx-auto flex gap-8 items-start">
        {/* ── Controls ── */}
        <div className={`flex-shrink-0 bg-neutral-50 rounded-lg border border-neutral-200 transition-all ${showControls ? 'w-96' : 'w-auto'}`}>
          <button
            onClick={() => setShowControls(!showControls)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-neutral-700 hover:bg-neutral-100 rounded-t-lg"
          >
            <span>Controls</span>
            <span className={`transition-transform ${showControls ? 'rotate-180' : ''}`}>&#9660;</span>
          </button>
          {showControls && (
          <div className="px-6 pb-6 max-h-[calc(100vh-80px)] overflow-y-auto">
            {/* Text */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Text</label>
              <input type="text" value={text} onChange={(e) => setText(e.target.value)} className="w-full px-4 py-2 border border-neutral-300 rounded-md" />
            </div>
            {/* Font */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-neutral-700 mb-2">Font</label>
              <select value={fontFamily} onChange={(e) => setFontFamily(e.target.value)} className="w-full px-4 py-2 border border-neutral-300 rounded-md">
                {fontOptions.map(font => <option key={font} value={font}>{font}</option>)}
              </select>
            </div>
            {/* Weight */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-neutral-700 mb-2">Weight</label>
              <select value={fontWeight} onChange={(e) => setFontWeight(e.target.value)} className="w-full px-4 py-2 border border-neutral-300 rounded-md">
                <option value="300">Light (300)</option>
                <option value="400">Regular (400)</option>
                <option value="500">Medium (500)</option>
                <option value="600">Semibold (600)</option>
                <option value="700">Bold (700)</option>
              </select>
            </div>
            {/* Dark BG */}
            <div className="mt-4">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={darkBg} onChange={(e) => setDarkBg(e.target.checked)} className="w-4 h-4" />
                <span className="text-sm font-medium text-neutral-700">Dark Background</span>
              </label>
            </div>
            {/* Kerning */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-neutral-700 mb-2">Kerning</label>
              <input type="range" value={kerning} onChange={(e) => setKerning(parseFloat(e.target.value))} min="0" max="0.2" step="0.01" className="w-full" />
            </div>
            {/* Saturation */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-neutral-700 mb-2">Saturation</label>
              <input type="range" value={saturation} onChange={(e) => setSaturation(parseInt(e.target.value))} min="0" max="200" className="w-full" />
            </div>
            {/* Palette */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-neutral-700 mb-2">Color Palette</label>
              <select value={paletteIndex} onChange={(e) => setPaletteIndex(parseInt(e.target.value))} className="w-full px-4 py-2 border border-neutral-300 rounded-md">
                {colorPalettes.map((p, i) => <option key={i} value={i}>{p.name}</option>)}
              </select>
            </div>
            {/* Num colors */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-neutral-700 mb-2">Colors ({numColors})</label>
              <input type="range" value={numColors} onChange={(e) => setNumColors(parseInt(e.target.value))} min="1" max={colorPalettes[paletteIndex].colors.length} className="w-full" />
            </div>
            {/* Single color picker */}
            {numColors === 1 && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-neutral-700 mb-2">Select Color</label>
                <div className="flex flex-wrap gap-2">
                  {colorPalettes[paletteIndex].colors.map((color, idx) => (
                    <button key={idx} onClick={() => setSelectedColorIndex(idx)}
                      className={`w-12 h-12 rounded-md border-2 transition-all ${selectedColorIndex === idx ? 'border-neutral-900 scale-110' : 'border-neutral-300'}`}
                      style={{ backgroundColor: adjustSaturation(color, saturation) }} />
                  ))}
                </div>
              </div>
            )}

            {/* ── Decorations Stack ── */}
            <div className="mt-6 pt-4 border-t border-neutral-200">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-semibold text-neutral-800">Decorations</label>
                <button
                  onClick={addDecoration}
                  className="w-7 h-7 flex items-center justify-center bg-neutral-800 text-white rounded-md hover:bg-neutral-700 transition-colors text-lg leading-none"
                  title="Add decoration"
                >
                  +
                </button>
              </div>

              {decorations.length === 0 && (
                <p className="text-sm text-neutral-400 italic">No decorations. Click + to add one.</p>
              )}

              {decorations.map((dec, idx) => {
                const typeParams = DECORATION_TYPE_PARAMS[dec.type];
                const isTexture = dec.type === 'texture';
                return (
                  <div key={dec.id} className="mb-3 p-3 bg-white border border-neutral-200 rounded-md">
                    {/* Header: type dropdown + remove */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-neutral-400 w-4">{idx + 1}</span>
                      <select
                        value={dec.type}
                        onChange={(e) => updateDecoration(dec.id, { type: e.target.value as DecorationType })}
                        className="flex-1 px-3 py-1.5 text-sm border border-neutral-300 rounded-md"
                      >
                        {DECORATION_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => removeDecoration(dec.id)}
                        className="w-7 h-7 flex items-center justify-center text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors text-sm"
                        title="Remove decoration"
                      >
                        &times;
                      </button>
                    </div>

                    {/* Placement toggle */}
                    <div className="mt-2 flex gap-1">
                      {PLACEMENT_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => updateDecoration(dec.id, { placement: opt.value })}
                          className={`flex-1 px-1.5 py-1 text-xs rounded border transition-colors ${
                            dec.placement === opt.value
                              ? 'bg-neutral-800 text-white border-neutral-800'
                              : 'bg-neutral-50 text-neutral-600 border-neutral-200 hover:bg-neutral-100'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>

                    {/* Shared controls */}
                    {!isTexture && (
                      <>
                        {/* Count */}
                        <div className="mt-2">
                          <div className="flex justify-between text-xs text-neutral-500 mb-1">
                            <span>Count</span><span>{dec.count}</span>
                          </div>
                          <input type="range" value={dec.count}
                            onChange={(e) => updateDecoration(dec.id, { count: parseInt(e.target.value) })}
                            min="1" max="40" className="w-full" />
                        </div>
                        {/* Size range (dual-handle) */}
                        <div className="mt-2">
                          <div className="flex justify-between text-xs text-neutral-500 mb-1">
                            <span>Size</span><span>{dec.sizeMin}–{dec.sizeMax}</span>
                          </div>
                          <div className="dual-range" style={{ position: 'relative', height: '24px' }}>
                            <div style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: 0, right: 0, height: '4px', borderRadius: '2px', background: '#d4d4d4' }} />
                            <div style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', height: '4px', borderRadius: '2px', background: '#525252',
                              left: `${((dec.sizeMin - 1) / 79) * 100}%`,
                              width: `${((dec.sizeMax - dec.sizeMin) / 79) * 100}%`,
                            }} />
                            <input type="range" value={dec.sizeMin}
                              onChange={(e) => {
                                const v = parseFloat(e.target.value);
                                updateDecoration(dec.id, { sizeMin: v, sizeMax: Math.max(v, dec.sizeMax) });
                              }}
                              min="1" max="80" step="1" />
                            <input type="range" value={dec.sizeMax}
                              onChange={(e) => {
                                const v = parseFloat(e.target.value);
                                updateDecoration(dec.id, { sizeMax: v, sizeMin: Math.min(v, dec.sizeMin) });
                              }}
                              min="1" max="80" step="1" />
                          </div>
                        </div>
                      </>
                    )}

                    {/* Opacity */}
                    <div className="mt-2">
                      <div className="flex justify-between text-xs text-neutral-500 mb-1">
                        <span>Opacity</span><span>{dec.opacity.toFixed(2)}</span>
                      </div>
                      <input type="range" value={dec.opacity}
                        onChange={(e) => updateDecoration(dec.id, { opacity: parseFloat(e.target.value) })}
                        min="0.01" max="1" step="0.01" className="w-full" />
                    </div>

                    {/* Blur */}
                    <div className="mt-2">
                      <div className="flex justify-between text-xs text-neutral-500 mb-1">
                        <span>Blur</span><span>{dec.blur}px</span>
                      </div>
                      <input type="range" value={dec.blur}
                        onChange={(e) => updateDecoration(dec.id, { blur: parseFloat(e.target.value) })}
                        min="0" max="20" step="1" className="w-full" />
                    </div>

                    {/* Offset X / Y */}
                    <div className="mt-2">
                      <div className="flex justify-between text-xs text-neutral-500 mb-1">
                        <span>Offset</span><span>X:{dec.offsetX} Y:{dec.offsetY}</span>
                      </div>
                      <div className="flex gap-2">
                        <input type="range" value={dec.offsetX}
                          onChange={(e) => updateDecoration(dec.id, { offsetX: parseFloat(e.target.value) })}
                          min="-200" max="200" step="1" className="flex-1" />
                        <input type="range" value={dec.offsetY}
                          onChange={(e) => updateDecoration(dec.id, { offsetY: parseFloat(e.target.value) })}
                          min="-200" max="200" step="1" className="flex-1" />
                      </div>
                    </div>

                    {/* Rotation */}
                    <div className="mt-2">
                      <div className="flex justify-between text-xs text-neutral-500 mb-1">
                        <span>Rotation</span><span>{dec.layerRotation}&deg;</span>
                      </div>
                      <input type="range" value={dec.layerRotation}
                        onChange={(e) => updateDecoration(dec.id, { layerRotation: parseFloat(e.target.value) })}
                        min="0" max="360" step="1" className="w-full" />
                    </div>

                    {/* Spread */}
                    <div className="mt-2">
                      <div className="flex justify-between text-xs text-neutral-500 mb-1">
                        <span>Spread</span><span>{dec.layerSpread.toFixed(1)}x</span>
                      </div>
                      <input type="range" value={dec.layerSpread}
                        onChange={(e) => updateDecoration(dec.id, { layerSpread: parseFloat(e.target.value) })}
                        min="0.1" max="3" step="0.1" className="w-full" />
                    </div>

                    {/* Color mode */}
                    <div className="mt-2 flex gap-1.5">
                      <button
                        onClick={() => updateDecoration(dec.id, { colorMode: 'palette' })}
                        className={`flex-1 px-2 py-1 text-xs rounded border transition-colors ${
                          dec.colorMode === 'palette'
                            ? 'bg-neutral-800 text-white border-neutral-800'
                            : 'bg-neutral-50 text-neutral-600 border-neutral-200 hover:bg-neutral-100'
                        }`}
                      >
                        Palette
                      </button>
                      <button
                        onClick={() => updateDecoration(dec.id, { colorMode: 'single' })}
                        className={`flex-1 px-2 py-1 text-xs rounded border transition-colors ${
                          dec.colorMode === 'single'
                            ? 'bg-neutral-800 text-white border-neutral-800'
                            : 'bg-neutral-50 text-neutral-600 border-neutral-200 hover:bg-neutral-100'
                        }`}
                      >
                        Single
                      </button>
                    </div>

                    {/* Single color picker */}
                    {dec.colorMode === 'single' && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {fullPaletteColors.map((color, ci) => (
                          <button key={ci} onClick={() => updateDecoration(dec.id, { colorIndex: ci })}
                            className={`w-6 h-6 rounded border transition-all ${
                              dec.colorIndex === ci ? 'border-neutral-900 scale-110' : 'border-neutral-300'
                            }`}
                            style={{ backgroundColor: adjustSaturation(color, saturation) }} />
                        ))}
                      </div>
                    )}

                    {/* Type-specific params */}
                    {typeParams.map(param => {
                      if (param.type === 'select') {
                        return (
                          <div key={param.key} className="mt-2">
                            <div className="flex justify-between text-xs text-neutral-500 mb-1">
                              <span>{param.label}</span>
                            </div>
                            <select
                              value={String(dec.params[param.key] ?? param.options?.[0]?.value ?? '')}
                              onChange={(e) => updateDecorationParam(dec.id, param.key, e.target.value)}
                              className="w-full px-3 py-1.5 text-sm border border-neutral-300 rounded-md"
                            >
                              {param.options?.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
                          </div>
                        );
                      }
                      if (param.type === 'slider') {
                        const val = Number(dec.params[param.key] ?? param.min ?? 0);
                        return (
                          <div key={param.key} className="mt-2">
                            <div className="flex justify-between text-xs text-neutral-500 mb-1">
                              <span>{param.label}</span><span>{val}</span>
                            </div>
                            <input type="range" value={val}
                              onChange={(e) => updateDecorationParam(dec.id, param.key, parseFloat(e.target.value))}
                              min={param.min} max={param.max} step={param.step} className="w-full" />
                          </div>
                        );
                      }
                      return null;
                    })}

                    {/* Custom symbols input */}
                    {dec.type === 'symbols' && dec.params.symbolSet === 'custom' && (
                      <div className="mt-2">
                        <div className="text-xs text-neutral-500 mb-1">Characters</div>
                        <input type="text"
                          value={String(dec.params.customSymbols ?? '')}
                          onChange={(e) => updateDecorationParam(dec.id, 'customSymbols', e.target.value)}
                          placeholder="Type characters..."
                          className="w-full px-3 py-1.5 text-sm border border-neutral-300 rounded-md"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* ── Effects Stack ── */}
            <div className="mt-6 pt-4 border-t border-neutral-200">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-semibold text-neutral-800">Effects</label>
                <button
                  onClick={addEffect}
                  className="w-7 h-7 flex items-center justify-center bg-neutral-800 text-white rounded-md hover:bg-neutral-700 transition-colors text-lg leading-none"
                  title="Add effect"
                >
                  +
                </button>
              </div>

              {effects.length === 0 && (
                <p className="text-sm text-neutral-400 italic">No effects. Click + to add one.</p>
              )}

              {effects.map((fx, idx) => {
                const params = EFFECT_PARAMS[fx.type];
                return (
                  <div key={fx.id} className="mb-3 p-3 bg-white border border-neutral-200 rounded-md">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-neutral-400 w-4">{idx + 1}</span>
                      <select
                        value={fx.type}
                        onChange={(e) => updateEffect(fx.id, { type: e.target.value as EffectType })}
                        className="flex-1 px-3 py-1.5 text-sm border border-neutral-300 rounded-md"
                      >
                        {EFFECT_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => removeEffect(fx.id)}
                        className="w-7 h-7 flex items-center justify-center text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors text-sm"
                        title="Remove effect"
                      >
                        &times;
                      </button>
                    </div>

                    <div className="mt-2 flex gap-1.5">
                      <button
                        onClick={() => updateEffect(fx.id, { applyAll: true })}
                        className={`flex-1 px-2 py-1 text-xs rounded border transition-colors ${fx.applyAll ? 'bg-neutral-800 text-white border-neutral-800' : 'bg-neutral-50 text-neutral-600 border-neutral-200 hover:bg-neutral-100'}`}
                      >
                        All
                      </button>
                      <button
                        onClick={() => updateEffect(fx.id, { applyAll: false })}
                        className={`flex-1 px-2 py-1 text-xs rounded border transition-colors ${!fx.applyAll ? 'bg-neutral-800 text-white border-neutral-800' : 'bg-neutral-50 text-neutral-600 border-neutral-200 hover:bg-neutral-100'}`}
                      >
                        Select
                      </button>
                    </div>

                    {!fx.applyAll && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {uniqueLetters.map(letter => (
                          <button
                            key={letter}
                            onClick={() => toggleEffectLetter(fx.id, letter)}
                            className={`w-7 h-7 text-xs font-medium rounded border transition-colors ${fx.letters.has(letter) ? 'bg-neutral-800 text-white border-neutral-800' : 'bg-neutral-50 text-neutral-600 border-neutral-200 hover:bg-neutral-100'}`}
                          >
                            {letter}
                          </button>
                        ))}
                      </div>
                    )}

                    {params && (
                      <div className="mt-2">
                        <div className="flex justify-between text-xs text-neutral-500 mb-1">
                          <span>{params.label}</span>
                          <span>{fx.amount}</span>
                        </div>
                        <input
                          type="range"
                          value={fx.amount}
                          onChange={(e) => updateEffect(fx.id, { amount: parseFloat(e.target.value) })}
                          min={params.min} max={params.max} step={params.step}
                          className="w-full"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          )}
        </div>

        {/* ── Wordmark ── */}
        <div className="flex-1 flex flex-col items-center justify-center min-h-screen">
          <div ref={containerRef} className="relative inline-block">
            {/* Background decorations (grouped by source decoration for drag) */}
            {(() => {
              const groups = new Map<number, DecorationItem[]>();
              backgroundItems.forEach(item => {
                const arr = groups.get(item.sourceDecId) || [];
                arr.push(item);
                groups.set(item.sourceDecId, arr);
              });
              return Array.from(groups.entries()).map(([decId, items]) => (
                <div
                  key={`bg-group-${decId}`}
                  style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, cursor: dragging?.decId === decId ? 'grabbing' : 'grab', pointerEvents: 'auto' }}
                  onPointerDown={(e) => handleDecPointerDown(decId, e)}
                >
                  {items.map((item, idx) => renderDecorationItem(item, `bg-${decId}-${idx}`))}
                </div>
              ));
            })()}

            {/* Text */}
            <div ref={wordmarkRef} className="px-16 py-8" style={{ position: 'relative', zIndex: 1 }}>
              <h1
                className="text-[100px] select-none flex items-center justify-center relative"
                style={{ fontFamily: `${fontFamily}, sans-serif`, fontWeight, letterSpacing: `${kerning}em` }}
              >
                {text.split('').map((char, idx) => (
                  <span key={idx} style={getCharStyle(char, idx)}>{char}</span>
                ))}
              </h1>
            </div>

            {/* Foreground decorations (through mode, grouped by source decoration for drag) */}
            {foregroundItems.length > 0 && (() => {
              const groups = new Map<number, DecorationItem[]>();
              foregroundItems.forEach(item => {
                const arr = groups.get(item.sourceDecId) || [];
                arr.push(item);
                groups.set(item.sourceDecId, arr);
              });
              return Array.from(groups.entries()).map(([decId, items]) => (
                <div
                  key={`fg-group-${decId}`}
                  style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, zIndex: 2, pointerEvents: 'none' }}
                >
                  <div
                    style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, cursor: dragging?.decId === decId ? 'grabbing' : 'grab', pointerEvents: 'auto' }}
                    onPointerDown={(e) => handleDecPointerDown(decId, e)}
                  >
                    {items.map((item, idx) => renderDecorationItem(item, `fg-${decId}-${idx}`))}
                  </div>
                </div>
              ));
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}
