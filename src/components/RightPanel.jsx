import { useRef } from 'react';
import {
  AlignLeft, AlignCenter, AlignRight,
  AlignStartVertical, AlignCenterVertical, AlignEndVertical,
  ZoomIn, ZoomOut, Maximize2, RotateCcw,
  Download, Upload, Minus, Plus,
} from 'lucide-react';
import { ELEMENT_CONFIG } from './ArtboardElement';

const SWATCHES = [
  '#ffffff','#f8fafc','#e2e8f0','#94a3b8','#475569','#0f172a',
  '#eff6ff','#bfdbfe','#60a5fa','#3b82f6','#1d4ed8','#1e3a8a',
  '#f5f3ff','#ddd6fe','#a78bfa','#7c3aed','#6d28d9','#4c1d95',
  '#fefce8','#fef08a','#fde047','#eab308','#ca8a04','#713f12',
  '#fef2f2','#fecaca','#f87171','#ef4444','#dc2626','#7f1d1d',
  '#f0fdf4','#bbf7d0','#4ade80','#22c55e','#16a34a','#14532d',
];

function Section({ title, children }) {
  return (
    <div className="px-4 py-3 border-b border-slate-100">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">{title}</p>
      {children}
    </div>
  );
}

function NumInput({ label, value, onCommit, min = 0, max = 99999 }) {
  const ref = useRef(null);
  const submit = () => {
    const v = Math.max(min, Math.min(max, parseFloat(ref.current.value) || 0));
    onCommit(v);
    ref.current.value = v;
  };
  return (
    <div className="flex flex-col gap-0.5">
      <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">{label}</label>
      <input
        ref={ref}
        type="number" defaultValue={value} key={value}
        min={min} max={max}
        onBlur={submit}
        onKeyDown={e => e.key === 'Enter' && submit()}
        className="w-full text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-md px-2 py-1.5 focus:outline-none focus:border-blue-400 focus:bg-white transition-colors"
      />
    </div>
  );
}

function IconBtn({ icon: Icon, onClick, title, active = false, disabled = false }) {
  return (
    <button
      onClick={onClick} title={title} disabled={disabled}
      className={`p-1.5 rounded-lg border transition-all
        ${active   ? 'bg-blue-500 border-blue-500 text-white'
        : disabled ? 'border-slate-100 text-slate-200 cursor-not-allowed'
        : 'border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300'}`}
    >
      <Icon size={13} />
    </button>
  );
}

function getElDims(el) {
  const cfg = ELEMENT_CONFIG[el.type] || {};
  return {
    w: el.width  ?? cfg.defaultWidth  ?? 100,
    h: el.height ?? cfg.defaultHeight ?? 60,
  };
}

export default function RightPanel({
  elements, selectedIds, boardSize,
  viewTransform, setViewTransform,
  onUpdateElement, onUpdateElements, onImportElements,
  snapEnabled, snapSize, onSnapSizeChange,
}) {
  const selectedEls = elements.filter(el => selectedIds.has(el.id));
  const single      = selectedEls.length === 1 ? selectedEls[0] : null;
  const multi       = selectedEls.length >= 2;

  // ── Properties ─────────────────────────────────────────────
  const upd = (field, val) => single && onUpdateElement(single.id, { [field]: val });

  // ── Alignment helpers ──────────────────────────────────────
  const bounds = selectedEls.map(el => {
    const { w, h } = getElDims(el);
    return { el, x: el.x, y: el.y, w, h, r: el.x + w, b: el.y + h };
  });
  const minX = Math.min(...bounds.map(b => b.x));
  const maxR = Math.max(...bounds.map(b => b.r));
  const minY = Math.min(...bounds.map(b => b.y));
  const maxB = Math.max(...bounds.map(b => b.b));
  const cx   = (minX + maxR) / 2;
  const cy   = (minY + maxB) / 2;

  const align = (getX, getY) => onUpdateElements(
    bounds.map(b => ({ id: b.el.id, x: getX(b), y: getY(b) }))
  );

  const distributeH = () => {
    const sorted = [...bounds].sort((a, b) => a.x - b.x);
    const totalW  = sorted.reduce((s, b) => s + b.w, 0);
    const space   = (maxR - minX - totalW) / (sorted.length - 1);
    let cursor    = minX;
    onUpdateElements(sorted.map(b => { const x = cursor; cursor += b.w + space; return { id: b.el.id, x }; }));
  };
  const distributeV = () => {
    const sorted = [...bounds].sort((a, b) => a.y - b.y);
    const totalH  = sorted.reduce((s, b) => s + b.h, 0);
    const space   = (maxB - minY - totalH) / (sorted.length - 1);
    let cursor    = minY;
    onUpdateElements(sorted.map(b => { const y = cursor; cursor += b.h + space; return { id: b.el.id, y }; }));
  };

  // ── Zoom ───────────────────────────────────────────────────
  const zoom = f => setViewTransform(p => ({ ...p, scale: Math.max(0.15, Math.min(4, p.scale * f)) }));
  const fitToScreen = () => {
    const W = window.innerWidth - 260 - 240, H = window.innerHeight;
    const s = Math.min((W - 80) / boardSize.width, (H - 80) / boardSize.height);
    setViewTransform({ scale: s, x: (W - boardSize.width * s) / 2, y: (H - boardSize.height * s) / 2 });
  };

  // ── Export / Import ────────────────────────────────────────
  const exportJSON = () => {
    const blob = new Blob([JSON.stringify({ boardSize, elements }, null, 2)], { type: 'application/json' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'wireframe.json' });
    a.click();
  };
  const importRef = useRef(null);
  const handleImport = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => { try { const d = JSON.parse(ev.target.result); if (d.elements) onImportElements(d.elements); } catch {} };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <aside className="flex flex-col bg-white border-l border-slate-200 flex-shrink-0 overflow-y-auto" style={{ width: 240 }}>

      {/* Header */}
      <div className="px-4 py-3.5 border-b border-slate-100 flex-shrink-0">
        <p className="text-sm font-semibold text-slate-700">Inspector</p>
        {selectedEls.length > 0 && (
          <p className="text-xs text-slate-400 mt-0.5">{selectedEls.length} element{selectedEls.length > 1 ? 's' : ''} selected</p>
        )}
      </div>

      {/* ── Single element properties ── */}
      {single && (
        <>
          <Section title="Position & Size">
            <div className="grid grid-cols-2 gap-2">
              <NumInput label="X" value={Math.round(single.x)} onCommit={v => upd('x', v)} />
              <NumInput label="Y" value={Math.round(single.y)} onCommit={v => upd('y', v)} />
              <NumInput label="W" value={Math.round(getElDims(single).w)} min={20} onCommit={v => upd('width', v)} />
              <NumInput label="H" value={Math.round(getElDims(single).h)} min={20} onCommit={v => upd('height', v)} />
            </div>
          </Section>

          <Section title="Fill Color">
            <div className="grid grid-cols-6 gap-1 mb-2.5">
              {SWATCHES.map(c => (
                <button key={c} onClick={() => upd('fillColor', c)}
                  style={{ backgroundColor: c }}
                  className={`h-7 rounded border-2 transition-all hover:scale-110
                    ${single.fillColor === c ? 'border-blue-400 ring-1 ring-blue-300' : 'border-slate-200'}`}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input type="color" value={single.fillColor || '#e2e8f0'}
                onChange={e => upd('fillColor', e.target.value)}
                className="w-8 h-7 rounded cursor-pointer border border-slate-200 p-0.5" />
              <span className="text-xs text-slate-600 font-mono flex-1">{single.fillColor || 'default'}</span>
              <button onClick={() => upd('fillColor', null)}
                className="text-xs text-slate-400 hover:text-red-400 transition-colors">Reset</button>
            </div>
          </Section>

          <Section title="Opacity">
            <div className="flex items-center gap-2">
              <input type="range" min="0" max="100"
                value={Math.round((single.opacity ?? 1) * 100)}
                onChange={e => upd('opacity', parseFloat(e.target.value) / 100)}
                className="flex-1 h-1.5 accent-blue-500" />
              <span className="text-xs text-slate-500 w-9 text-right font-mono">
                {Math.round((single.opacity ?? 1) * 100)}%
              </span>
            </div>
          </Section>
        </>
      )}

      {/* ── Multi-element alignment ── */}
      {multi && (
        <Section title="Align">
          <div className="grid grid-cols-3 gap-1.5 mb-1.5">
            <IconBtn icon={AlignLeft}   title="Align left"      onClick={() => align(b => minX,          b => b.y)} />
            <IconBtn icon={AlignCenter} title="Align center H"  onClick={() => align(b => cx - b.w / 2,  b => b.y)} />
            <IconBtn icon={AlignRight}  title="Align right"     onClick={() => align(b => maxR - b.w,    b => b.y)} />
            <IconBtn icon={AlignStartVertical}  title="Align top"       onClick={() => align(b => b.x, b => minY)} />
            <IconBtn icon={AlignCenterVertical} title="Align middle V"  onClick={() => align(b => b.x, b => cy - b.h / 2)} />
            <IconBtn icon={AlignEndVertical}    title="Align bottom"    onClick={() => align(b => b.x, b => maxB - b.h)} />
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <button onClick={distributeH} disabled={selectedEls.length < 3}
              className="flex items-center justify-center gap-1 py-1.5 rounded-lg border border-slate-200 text-slate-500 text-xs hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
              <Minus size={10} className="rotate-90" /> Distribute H
            </button>
            <button onClick={distributeV} disabled={selectedEls.length < 3}
              className="flex items-center justify-center gap-1 py-1.5 rounded-lg border border-slate-200 text-slate-500 text-xs hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
              <Minus size={10} /> Distribute V
            </button>
          </div>
        </Section>
      )}

      {/* ── Empty state ── */}
      {!single && !multi && (
        <div className="px-4 py-6 text-center">
          <p className="text-xs text-slate-300">Select an element<br />to view properties</p>
        </div>
      )}

      {/* ── Canvas / Zoom ── */}
      <Section title="Canvas">
        <div className="flex items-center gap-1 mb-2.5">
          <IconBtn icon={ZoomOut} title="Zoom out" onClick={() => zoom(0.8)} />
          <div className="flex-1 text-center">
            <span className="text-xs font-mono text-slate-600">{Math.round(viewTransform.scale * 100)}%</span>
          </div>
          <IconBtn icon={ZoomIn}  title="Zoom in"  onClick={() => zoom(1.25)} />
        </div>
        <div className="grid grid-cols-2 gap-1.5 mb-3">
          <button onClick={() => setViewTransform({ x: 40, y: 40, scale: 1 })}
            className="flex items-center justify-center gap-1 py-1.5 rounded-lg border border-slate-200 text-slate-500 text-xs hover:bg-slate-50 transition-all">
            <RotateCcw size={11} /> Reset
          </button>
          <button onClick={fitToScreen}
            className="flex items-center justify-center gap-1 py-1.5 rounded-lg border border-slate-200 text-slate-500 text-xs hover:bg-slate-50 transition-all">
            <Maximize2 size={11} /> Fit
          </button>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500 whitespace-nowrap">Snap Grid</label>
          <select value={snapSize} onChange={e => onSnapSizeChange(Number(e.target.value))}
            className="flex-1 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-md px-2 py-1.5 focus:outline-none focus:border-blue-400 transition-colors">
            {[4, 8, 16, 24].map(s => <option key={s} value={s}>{s} px</option>)}
          </select>
        </div>
      </Section>

      {/* ── Export / Import ── */}
      <Section title="Export">
        <div className="space-y-1.5">
          <button onClick={exportJSON}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-slate-200 text-slate-600 text-xs font-medium hover:bg-slate-50 transition-all">
            <Download size={13} /> Export JSON
          </button>
          <button onClick={() => importRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-slate-200 text-slate-600 text-xs font-medium hover:bg-slate-50 transition-all">
            <Upload size={13} /> Import JSON
          </button>
          <input ref={importRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
        </div>
      </Section>
    </aside>
  );
}
