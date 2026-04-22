import { useRef, useCallback, useEffect, useState } from 'react';
import ArtboardElement, { ELEMENT_CONFIG } from './ArtboardElement';

export default function Artboard({
  boardSize, elements, setElements,
  selectedIds, onSelect, onDeselectAll, onRectSelect,
  onDeltaMove, onResize, onBeforeDrag, onAfterDrag,
  viewTransform, setViewTransform, snapEnabled, snapSize,
}) {
  const containerRef  = useRef(null);
  const artboardRef   = useRef(null);
  const isPanning     = useRef(false);
  const isSpaceHeld   = useRef(false);
  const lastMouse     = useRef({ x: 0, y: 0 });

  // ── Marquee selection state ────────────────────────────────
  const [selBox, setSelBox]     = useState(null); // { x1,y1,x2,y2 } in canvas space
  const selBoxStart             = useRef(null);
  const isMarquee               = useRef(false);
  // Capture scale at drag-start so mousemove closure uses consistent value
  const capturedScale           = useRef(1);

  // ── Mouse-wheel zoom ───────────────────────────────────────
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const rect   = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const factor = e.deltaY < 0 ? 1.1 : 0.9;

    setViewTransform(prev => {
      const newScale = Math.max(0.15, Math.min(4, prev.scale * factor));
      const ratio    = newScale / prev.scale;
      return {
        scale: newScale,
        x: mouseX - (mouseX - prev.x) * ratio,
        y: mouseY - (mouseY - prev.y) * ratio,
      };
    });
  }, [setViewTransform]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // ── Space-bar pan ──────────────────────────────────────────
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.code === 'Space' && !e.target.matches('input,textarea')) {
        e.preventDefault();
        isSpaceHeld.current = true;
        if (containerRef.current) containerRef.current.style.cursor = 'grab';
      }
    };
    const onKeyUp = (e) => {
      if (e.code === 'Space') {
        isSpaceHeld.current = false;
        isPanning.current   = false;
        if (containerRef.current) containerRef.current.style.cursor = '';
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup',   onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup',   onKeyUp);
    };
  }, []);

  // Container-level mousedown: handles space-pan
  const handleContainerMouseDown = useCallback((e) => {
    if (isSpaceHeld.current) {
      isPanning.current = true;
      lastMouse.current = { x: e.clientX, y: e.clientY };
      if (containerRef.current) containerRef.current.style.cursor = 'grabbing';
      e.preventDefault();
    }
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (isPanning.current) {
      const dx = e.clientX - lastMouse.current.x;
      const dy = e.clientY - lastMouse.current.y;
      lastMouse.current = { x: e.clientX, y: e.clientY };
      setViewTransform(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
    }
  }, [setViewTransform]);

  const handleMouseUp = useCallback(() => {
    if (isPanning.current) {
      isPanning.current = false;
      if (containerRef.current)
        containerRef.current.style.cursor = isSpaceHeld.current ? 'grab' : '';
    }
  }, []);

  // ── Artboard background mousedown → start marquee ─────────
  // NOTE: element children call e.stopPropagation(), so this only
  // fires when clicking the bare artboard background.
  const handleArtboardMouseDown = useCallback((e) => {
    if (isSpaceHeld.current) return; // space-pan has priority
    if (e.button !== 0) return;
    e.stopPropagation(); // don't bubble to container pan handler

    const artRect = artboardRef.current.getBoundingClientRect();
    capturedScale.current = viewTransform.scale;
    const startX = (e.clientX - artRect.left) / capturedScale.current;
    const startY = (e.clientY - artRect.top)  / capturedScale.current;

    selBoxStart.current = { x: startX, y: startY };
    isMarquee.current   = false; // becomes true once we move > threshold
    setSelBox(null);
    onDeselectAll();

    const onMove = (moveE) => {
      const rect = artboardRef.current.getBoundingClientRect();
      const cx = (moveE.clientX - rect.left) / capturedScale.current;
      const cy = (moveE.clientY - rect.top)  / capturedScale.current;
      const dx = cx - selBoxStart.current.x;
      const dy = cy - selBoxStart.current.y;

      // Only start drawing after a 4px threshold
      if (!isMarquee.current && Math.abs(dx) < 4 && Math.abs(dy) < 4) return;
      isMarquee.current = true;
      setSelBox({ x1: selBoxStart.current.x, y1: selBoxStart.current.y, x2: cx, y2: cy });
    };

    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup',   onUp);

      if (!isMarquee.current) {
        setSelBox(null);
        return;
      }

      // Commit selection: find all elements whose bounding box intersects marquee
      setSelBox(prev => {
        if (!prev) return null;
        const selX1 = Math.min(prev.x1, prev.x2);
        const selY1 = Math.min(prev.y1, prev.y2);
        const selX2 = Math.max(prev.x1, prev.x2);
        const selY2 = Math.max(prev.y1, prev.y2);

        const hit = elements
          .filter(el => {
            const cfg = ELEMENT_CONFIG[el.type] || {};
            const w = el.width  ?? cfg.defaultWidth  ?? 100;
            const h = el.height ?? cfg.defaultHeight ?? 60;
            return (
              el.x         < selX2 && el.x + w > selX1 &&
              el.y         < selY2 && el.y + h > selY1
            );
          })
          .map(el => el.id);

        onRectSelect(hit);
        return null; // clear the visual box
      });

      isMarquee.current = false;
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);
  }, [viewTransform.scale, elements, onDeselectAll, onRectSelect]);

  // ── Drop from sidebar ──────────────────────────────────────
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('elementType');
    if (!type) return;
    const rect  = artboardRef.current.getBoundingClientRect();
    const scale = viewTransform.scale;
    let x = (e.clientX - rect.left) / scale;
    let y = (e.clientY - rect.top)  / scale;
    x = Math.max(0, Math.min(x, boardSize.width  - 10));
    y = Math.max(0, Math.min(y, boardSize.height - 10));
    if (snapEnabled && snapSize) {
      x = Math.round(x / snapSize) * snapSize;
      y = Math.round(y / snapSize) * snapSize;
    }
    const cfg = ELEMENT_CONFIG[type] || {};
    setElements(prev => [...prev, {
      id: `el-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type, x, y, groupId: null,
      width:  cfg.defaultWidth  ?? 100,
      height: cfg.defaultHeight ?? 60,
    }]);
  }, [viewTransform.scale, boardSize, setElements]);

  const handleDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; };

  // Double-click on bare background → reset zoom
  const handleArtboardDblClick = (e) => {
    if (e.target === artboardRef.current) setViewTransform({ x: 40, y: 40, scale: 1 });
  };

  // ── Marquee box visual (in artboard canvas space) ──────────
  const marqueeStyle = selBox ? {
    position:        'absolute',
    left:            Math.min(selBox.x1, selBox.x2),
    top:             Math.min(selBox.y1, selBox.y2),
    width:           Math.abs(selBox.x2 - selBox.x1),
    height:          Math.abs(selBox.y2 - selBox.y1),
    border:          '1.5px dashed #3b82f6',
    backgroundColor: 'rgba(59,130,246,0.07)',
    pointerEvents:   'none',
    zIndex:          9998,
    borderRadius:    2,
  } : null;

  return (
    <div
      ref={containerRef}
      className="flex-1 bg-gray-100 overflow-hidden relative select-none"
      onMouseDown={handleContainerMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* ── Transformed viewport ── */}
      <div style={{
        position:        'absolute',
        transformOrigin: '0 0',
        transform:       `translate(${viewTransform.x}px, ${viewTransform.y}px) scale(${viewTransform.scale})`,
      }}>
        {/* Artboard canvas */}
        <div
          ref={artboardRef}
          onMouseDown={handleArtboardMouseDown}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDoubleClick={handleArtboardDblClick}
          className="relative bg-white"
          style={{
            width:     boardSize.width,
            height:    boardSize.height,
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.07), 0 20px 60px -10px rgba(0,0,0,0.15)',
            cursor:    selBox ? 'crosshair' : 'default',
          }}
        >
          {/* Dot grid */}
          <div className="absolute inset-0 pointer-events-none" style={{
            backgroundImage: 'radial-gradient(circle, #d1d5db 1px, transparent 1px)',
            backgroundSize:  '24px 24px',
            opacity: 0.4,
          }} />

          {/* Empty hint */}
          {elements.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
              <div className="border-2 border-dashed border-slate-200 rounded-2xl px-10 py-8 text-center">
                <p className="text-slate-300 text-sm font-medium">
                  Drag &amp; drop elements from the sidebar here
                </p>
                <p className="text-slate-200 text-xs mt-1">
                  {boardSize.width} × {boardSize.height}
                </p>
              </div>
            </div>
          )}

          {/* Elements */}
          {elements.map(el => (
            <ArtboardElement
              key={el.id}
              element={el}
              boardSize={boardSize}
              artboardRef={artboardRef}
              scale={viewTransform.scale}
              isSelected={selectedIds.has(el.id)}
              isSpaceHeld={isSpaceHeld}
              onSelect={onSelect}
              onDeltaMove={onDeltaMove}
              onResize={onResize}
              onBeforeDrag={onBeforeDrag}
              onAfterDrag={onAfterDrag}
              snapEnabled={snapEnabled}
              snapSize={snapSize}
            />
          ))}

          {/* ── Marquee selection box ── */}
          {selBox && <div style={marqueeStyle} />}
        </div>
      </div>

      {/* ── Zoom HUD ── */}
      <div className="absolute bottom-4 right-4 flex items-center gap-2">
        <div className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-500 shadow-sm">
          {Math.round(viewTransform.scale * 100)}%
        </div>
        <button
          onClick={() => setViewTransform({ x: 40, y: 40, scale: 1 })}
          className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-500 shadow-sm hover:bg-slate-50 transition-colors"
          title="Reset zoom (or double-click canvas)"
        >
          Reset
        </button>
      </div>

      {/* ── Hint bar ── */}
      <div className="absolute bottom-4 left-4 bg-white/80 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-400 shadow-sm pointer-events-none flex items-center gap-2">
        <span>
          Hold <kbd className="bg-slate-100 border border-slate-300 rounded px-1 py-0.5 text-slate-500 font-mono text-xs">Space</kbd> + drag to pan
        </span>
        <span className="text-slate-200">|</span>
        <span>Drag canvas to select</span>
      </div>
    </div>
  );
}
