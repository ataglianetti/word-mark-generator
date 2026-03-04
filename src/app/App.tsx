import { useState, useEffect, useMemo, useCallback, useRef } from 'react';

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

// Serialize effects to URL-safe string: type:applyAll:letters:amount|type:applyAll:letters:amount
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

let nextEffectId = 100;

export default function App() {
  const getInitialState = () => {
    const params = new URLSearchParams(window.location.search);
    return {
      text: params.get('t') || 'bokeh',
      fontFamily: params.get('f') || 'Righteous',
      fontWeight: params.get('fw') || '400',
      darkBg: params.get('bg') !== 'light',
      saturation: parseInt(params.get('s') || '100'),
      circleCount: parseInt(params.get('cc') || '8'),
      paletteIndex: parseInt(params.get('p') || '2'),
      kerning: parseFloat(params.get('k') || '0.05'),
      numColors: parseInt(params.get('nc') || '5'),
      selectedColorIndex: parseInt(params.get('sci') || '0'),
      effects: deserializeEffects(params.get('fx') || ''),
    };
  };

  const initialState = getInitialState();

  const [text, setText] = useState(initialState.text);
  const [fontFamily, setFontFamily] = useState(initialState.fontFamily);
  const [fontWeight, setFontWeight] = useState(initialState.fontWeight);
  const [darkBg, setDarkBg] = useState(initialState.darkBg);
  const [saturation, setSaturation] = useState(initialState.saturation);
  const [circleCount, setCircleCount] = useState(initialState.circleCount);
  const [paletteIndex, setPaletteIndex] = useState(initialState.paletteIndex);
  const [showControls, setShowControls] = useState(true);
  const [kerning, setKerning] = useState(initialState.kerning);
  const [numColors, setNumColors] = useState(initialState.numColors);
  const [selectedColorIndex, setSelectedColorIndex] = useState(initialState.selectedColorIndex);
  const [effects, setEffects] = useState<EffectInstance[]>(initialState.effects);

  // Effect CRUD
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
      // When switching type, reset amount to new default
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

  // URL sync
  useEffect(() => {
    const params = new URLSearchParams();
    params.set('t', text);
    params.set('f', fontFamily);
    params.set('fw', fontWeight);
    params.set('bg', darkBg ? 'dark' : 'light');
    params.set('s', saturation.toString());
    params.set('cc', circleCount.toString());
    params.set('p', paletteIndex.toString());
    params.set('k', kerning.toString());
    params.set('nc', numColors.toString());
    params.set('sci', selectedColorIndex.toString());
    if (effects.length > 0) {
      params.set('fx', serializeEffects(effects));
    }
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, '', newUrl);
  }, [text, fontFamily, fontWeight, darkBg, saturation, circleCount, paletteIndex, kerning, numColors, selectedColorIndex, effects]);

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

  // Bokeh circles
  const generateCircles = () => {
    const circles = [];
    const textZone = { left: -200, right: 200, top: -60, bottom: 60 };
    for (let i = 0; i < circleCount; i++) {
      let x = 0, y = 0, attempts = 0;
      while (attempts < 50) {
        const seed = i * 2654435761 + attempts * 12345;
        const r1 = (Math.sin(seed) * 10000) % 1, r2 = (Math.sin(seed + 1) * 10000) % 1;
        const angle = (i / circleCount) * 360 + (Math.abs(r1) * 60 - 30);
        const dist = 100 + Math.abs(r2) * 60;
        x = Math.cos(angle * Math.PI / 180) * dist;
        y = Math.sin(angle * Math.PI / 180) * dist - 15;
        if (!(x > textZone.left && x < textZone.right && y > textZone.top && y < textZone.bottom)) break;
        attempts++;
      }
      const seed = i * 2654435761;
      circles.push({
        x, y,
        size: 20 + Math.abs((Math.sin(seed + 2) * 10000) % 1) * 20,
        opacity: 0.4 + Math.abs((Math.sin(seed + 3) * 10000) % 1) * 0.4,
        color: adjustSaturation(fullPaletteColors[Math.floor(Math.abs((Math.sin(seed + 4) * 10000) % 1) * fullPaletteColors.length)], saturation),
      });
    }
    return circles;
  };
  const bokehCircles = useMemo(() => generateCircles(), [circleCount, saturation, paletteIndex]);

  const uniqueLetters = Array.from(new Set(text.toLowerCase().split('').filter(c => c.trim() !== '')));

  // Compose all active effects into a single style per character
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
      // Glow/shadow still works with stroke via textShadow
    }

    return style;
  };

  // Export
  const wordmarkRef = useRef<HTMLDivElement>(null);

  const exportWordmark = useCallback(async () => {
    const el = wordmarkRef.current;
    if (!el) return;
    const scale = 4;
    const rect = el.getBoundingClientRect();
    const canvas = document.createElement('canvas');
    canvas.width = rect.width * scale;
    canvas.height = rect.height * scale;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(scale, scale);
    await document.fonts.ready;

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
    const startX = (rect.width - totalWidth) / 2;
    const baselineY = (rect.height - (ascent + descent)) / 2 + ascent;

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

    const link = document.createElement('a');
    link.download = `${text}-wordmark-${scale}x.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }, [text, fontFamily, fontWeight, kerning, displayColors, adjustedColors, effects]);

  return (
    <div className="min-h-screen p-12" style={{ backgroundColor: darkBg ? '#000000' : '#ffffff' }}>
      <div className="max-w-7xl mx-auto flex gap-8 items-start">
        {/* Controls */}
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
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Text</label>
              <input type="text" value={text} onChange={(e) => setText(e.target.value)} className="w-full px-4 py-2 border border-neutral-300 rounded-md" />
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-neutral-700 mb-2">Font</label>
              <select value={fontFamily} onChange={(e) => setFontFamily(e.target.value)} className="w-full px-4 py-2 border border-neutral-300 rounded-md">
                {fontOptions.map(font => <option key={font} value={font}>{font}</option>)}
              </select>
            </div>
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
            <div className="mt-4">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={darkBg} onChange={(e) => setDarkBg(e.target.checked)} className="w-4 h-4" />
                <span className="text-sm font-medium text-neutral-700">Dark Background</span>
              </label>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-neutral-700 mb-2">Kerning</label>
              <input type="range" value={kerning} onChange={(e) => setKerning(parseFloat(e.target.value))} min="0" max="0.2" step="0.01" className="w-full" />
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-neutral-700 mb-2">Saturation</label>
              <input type="range" value={saturation} onChange={(e) => setSaturation(parseInt(e.target.value))} min="0" max="200" className="w-full" />
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-neutral-700 mb-2">Color Palette</label>
              <select value={paletteIndex} onChange={(e) => setPaletteIndex(parseInt(e.target.value))} className="w-full px-4 py-2 border border-neutral-300 rounded-md">
                {colorPalettes.map((p, i) => <option key={i} value={i}>{p.name}</option>)}
              </select>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-neutral-700 mb-2">Colors ({numColors})</label>
              <input type="range" value={numColors} onChange={(e) => setNumColors(parseInt(e.target.value))} min="1" max={colorPalettes[paletteIndex].colors.length} className="w-full" />
            </div>
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
            <div className="mt-4">
              <label className="block text-sm font-medium text-neutral-700 mb-2">Bokeh Circles ({circleCount})</label>
              <input type="range" value={circleCount} onChange={(e) => setCircleCount(parseInt(e.target.value))} min="0" max="30" className="w-full" />
            </div>

            {/* --- Effects Stack --- */}
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
                    {/* Header: type dropdown + remove */}
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

                    {/* Apply to */}
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

                    {/* Letter picker */}
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

                    {/* Amount slider */}
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

        {/* Wordmark */}
        <div className="flex-1 flex flex-col items-center justify-center min-h-screen">
          <div className="relative inline-block">
            {bokehCircles.map((circle, idx) => (
              <div key={idx} className="rounded-full" style={{
                position: 'absolute', left: '50%', top: '50%',
                transform: `translate(calc(-50% + ${circle.x}px), calc(-50% + ${circle.y}px))`,
                width: `${circle.size}px`, height: `${circle.size}px`,
                backgroundColor: circle.color, opacity: circle.opacity,
                filter: 'blur(4px)', pointerEvents: 'none'
              }} />
            ))}

            <div ref={wordmarkRef} className="px-16 py-8">
              <h1
                className="text-[100px] select-none flex items-center justify-center relative"
                style={{ fontFamily: `${fontFamily}, sans-serif`, fontWeight, letterSpacing: `${kerning}em` }}
              >
                {text.split('').map((char, idx) => (
                  <span key={idx} style={getCharStyle(char, idx)}>{char}</span>
                ))}
              </h1>
            </div>
          </div>

          <button
            onClick={exportWordmark}
            className="mt-8 px-4 py-2 bg-neutral-800 text-white text-sm rounded-md hover:bg-neutral-700 transition-colors"
          >
            Download PNG (4x)
          </button>
        </div>
      </div>
    </div>
  );
}
