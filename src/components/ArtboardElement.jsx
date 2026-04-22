import { useRef, useCallback } from 'react';
import { Image } from 'lucide-react';

export const ELEMENT_CONFIG = {
  large_block:      { defaultWidth:200, defaultHeight:120, label:'Large Block',       className:'bg-slate-200 border border-slate-300 rounded-lg flex items-center justify-center', textClass:'text-slate-500 text-sm font-medium select-none' },
  small_block:      { defaultWidth:100, defaultHeight:60,  label:'Small Block',       className:'bg-slate-200 border border-slate-300 rounded-md flex items-center justify-center', textClass:'text-slate-500 text-xs font-medium select-none' },
  text_placeholder: { defaultWidth:180, defaultHeight:40,  label:'Text Placeholder',  className:'bg-amber-50 border border-amber-300 rounded flex items-center px-3',             textClass:'text-amber-400 text-xs italic select-none' },
  button:           { defaultWidth:110, defaultHeight:38,  label:'Button',            className:'bg-blue-500 rounded-lg flex items-center justify-center shadow-sm',              textClass:'text-white text-sm font-semibold select-none' },
  image_placeholder:{ defaultWidth:160, defaultHeight:110, label:'Image Placeholder', className:'bg-slate-100 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center gap-1', textClass:'text-slate-400 text-xs select-none' },
  circle:           { defaultWidth:100, defaultHeight:100, label:'Circle',            renderShape:'circle' },
  triangle:         { defaultWidth:100, defaultHeight:86,  label:'Triangle',          renderShape:'triangle' },
};

// ── Resize handle helpers ─────────────────────────────────────
const HS = 8; // handle size px
const HANDLES = ['nw','n','ne','e','se','s','sw','w'];
const CURSORS  = { nw:'nw-resize',n:'n-resize',ne:'ne-resize',e:'e-resize',se:'se-resize',s:'s-resize',sw:'sw-resize',w:'w-resize' };

function handlePos(dir, w, h) {
  const h2 = HS / 2;
  return {
    nw:{ left:-h2,     top:-h2      }, n:{ left:w/2-h2, top:-h2      }, ne:{ left:w-h2,   top:-h2      },
    e: { left:w-h2,    top:h/2-h2   },
    se:{ left:w-h2,    top:h-h2     }, s:{ left:w/2-h2, top:h-h2     }, sw:{ left:-h2,    top:h-h2     },
    w: { left:-h2,     top:h/2-h2   },
  }[dir];
}

// ── Shape renderers ────────────────────────────────────────────
function ShapeContent({ element, config }) {
  const fill = element.fillColor;
  if (config.renderShape === 'circle') {
    return (
      <div style={{ position:'absolute', inset:0, borderRadius:'50%', background: fill || '#e2e8f0', border:'1.5px solid #94a3b8', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <span className="text-slate-500 text-xs font-medium select-none">Circle</span>
      </div>
    );
  }
  if (config.renderShape === 'triangle') {
    return <div style={{ position:'absolute', inset:0, clipPath:'polygon(50% 0%, 0% 100%, 100% 100%)', background: fill || '#e2e8f0' }} />;
  }
  if (element.type === 'image_placeholder') {
    return <><Image size={24} className="text-slate-400" /><span className={config.textClass}>{config.label}</span></>;
  }
  return <span className={config.textClass}>{config.label}</span>;
}

// ── Main component ─────────────────────────────────────────────
export default function ArtboardElement({
  element, boardSize, artboardRef,
  scale, isSelected, isSpaceHeld,
  onSelect, onDeltaMove, onResize,
  onBeforeDrag, onAfterDrag,
  snapEnabled, snapSize,
}) {
  const config  = ELEMENT_CONFIG[element.type] || ELEMENT_CONFIG.small_block;
  const elW     = element.width  ?? config.defaultWidth;
  const elH     = element.height ?? config.defaultHeight;
  const didDrag = useRef(false);

  // ── Drag to move ───────────────────────────────────────────
  const handleMouseDown = useCallback((e) => {
    if (e.buttons !== 1) return;
    if (isSpaceHeld?.current) return;   // space-pan takes priority
    e.preventDefault();
    e.stopPropagation();
    didDrag.current = false;
    onBeforeDrag?.();

    const onMove = (moveE) => {
      const dx = moveE.movementX / scale;
      const dy = moveE.movementY / scale;
      if (Math.abs(dx) > 0.3 || Math.abs(dy) > 0.3) didDrag.current = true;
      onDeltaMove(element.id, dx, dy);
    };
    const onUp = (upE) => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup',   onUp);
      onAfterDrag?.();
      if (!didDrag.current) onSelect(element.id, upE.shiftKey);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);
  }, [element.id, scale, onDeltaMove, onSelect, onBeforeDrag, onAfterDrag, isSpaceHeld]);

  // ── Resize handle drag ─────────────────────────────────────
  const handleResizeDown = useCallback((e, dir) => {
    if (isSpaceHeld?.current) return;   // space-pan takes priority
    e.preventDefault();
    e.stopPropagation();
    onBeforeDrag?.();
    const startMX = e.clientX, startMY = e.clientY;
    const startX = element.x, startY = element.y;
    const startW = elW, startH = elH;
    const MIN = 20;

    const onMove = (moveE) => {
      const rawDX = (moveE.clientX - startMX) / scale;
      const rawDY = (moveE.clientY - startMY) / scale;
      let newX = startX, newY = startY, newW = startW, newH = startH;

      if (dir.includes('e')) newW = Math.max(MIN, startW + rawDX);
      if (dir.includes('s')) newH = Math.max(MIN, startH + rawDY);
      if (dir.includes('w')) { newW = Math.max(MIN, startW - rawDX); newX = startX + (startW - newW); }
      if (dir.includes('n')) { newH = Math.max(MIN, startH - rawDY); newY = startY + (startH - newH); }

      // Clamp to artboard
      newX = Math.max(0, newX);
      newY = Math.max(0, newY);
      newW = Math.min(newW, boardSize.width  - newX);
      newH = Math.min(newH, boardSize.height - newY);

      // Optional snap
      if (snapEnabled && snapSize) {
        newW = Math.round(newW / snapSize) * snapSize || snapSize;
        newH = Math.round(newH / snapSize) * snapSize || snapSize;
      }
      onResize(element.id, newX, newY, newW, newH);
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup',   onUp);
      onAfterDrag?.();
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);
  }, [element, elW, elH, scale, boardSize, snapEnabled, snapSize, onResize, onBeforeDrag, onAfterDrag, isSpaceHeld]);

  // ── Styles ─────────────────────────────────────────────────
  const outerClass = config.renderShape
    ? 'absolute cursor-grab active:cursor-grabbing overflow-hidden'
    : `absolute cursor-grab active:cursor-grabbing ${config.className}`;

  const selectionStyle  = isSelected  ? { outline:'2px solid #3b82f6', outlineOffset:'2px', zIndex:9999 } : {};
  const groupStyle      = (element.groupId && !isSelected) ? { outline:'1.5px dashed #a855f7', outlineOffset:'2px' } : {};

  const fillOverride  = (element.fillColor && !config.renderShape) ? { backgroundColor: element.fillColor } : {};
  const opacityStyle  = element.opacity != null ? { opacity: element.opacity } : {};

  return (
    <div
      onMouseDown={handleMouseDown}
      className={outerClass}
      style={{ left:element.x, top:element.y, width:elW, height:elH, userSelect:'none', ...groupStyle, ...selectionStyle, ...fillOverride, ...opacityStyle }}
      title={config.label}
    >
      <ShapeContent element={element} config={config} />

      {/* Group badge */}
      {element.groupId && (
        <span className="absolute -top-4 left-0 text-purple-400 text-[9px] font-semibold uppercase tracking-wider select-none pointer-events-none">group</span>
      )}

      {/* Resize handles — only when selected */}
      {isSelected && HANDLES.map(dir => {
        const pos = handlePos(dir, elW, elH);
        return (
          <div
            key={dir}
            onMouseDown={(e) => handleResizeDown(e, dir)}
            style={{
              position:'absolute', width:HS, height:HS,
              left:pos.left, top:pos.top,
              background:'white', border:'1.5px solid #3b82f6', borderRadius:2,
              cursor:CURSORS[dir], zIndex:10001,
            }}
          />
        );
      })}
    </div>
  );
}
