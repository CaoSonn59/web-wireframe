import { useCallback, useEffect, useRef, useState } from 'react';
import { Undo2, Redo2 } from 'lucide-react';
import Sidebar from './Sidebar';
import Artboard from './Artboard';
import RightPanel from './RightPanel';
import { useHistory } from '../hooks/useHistory';

const ELEMENT_SIZES = {
  large_block:       { width: 200, height: 120 },
  small_block:       { width: 100, height: 60  },
  text_placeholder:  { width: 180, height: 40  },
  button:            { width: 110, height: 38  },
  image_placeholder: { width: 160, height: 110 },
  circle:            { width: 100, height: 100 },
  triangle:          { width: 100, height: 86  },
};

export default function Workspace({ boardSize, onChangeScreen }) {
  const {
    present: elements, presentRef,
    set: setElements, setT: setElementsT,
    commit, undo, redo, canUndo, canRedo,
  } = useHistory([]);

  const [selectedIds, setSelectedIds]     = useState(new Set());
  const [viewTransform, setViewTransform] = useState({ x: 40, y: 40, scale: 1 });
  const [snapEnabled, setSnapEnabled]     = useState(true);
  const [snapSize, setSnapSize]           = useState(8);

  // Drag snapshot for history commit
  const dragSnap = useRef(null);
  const handleBeforeDrag = useCallback(() => { dragSnap.current = presentRef.current; }, [presentRef]);
  const handleAfterDrag  = useCallback(() => {
    if (dragSnap.current !== null) { commit(dragSnap.current); dragSnap.current = null; }
  }, [commit]);

  // ── Selection ──────────────────────────────────────────────
  const handleSelect = useCallback((id, shiftKey) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (shiftKey) { next.has(id) ? next.delete(id) : next.add(id); }
      else          { next.clear(); next.add(id); }
      return next;
    });
  }, []);
  const handleDeselectAll = useCallback(() => setSelectedIds(new Set()), []);
  const handleRectSelect  = useCallback((ids) => setSelectedIds(new Set(ids)), []);

  // ── Move (transient) ───────────────────────────────────────
  const handleDeltaMove = useCallback((id, dx, dy) => {
    setElementsT(prev => {
      const el = prev.find(e => e.id === id);
      if (!el) return prev;

      // Determine which IDs move together
      let toMove;
      if (selectedIds.has(id) && selectedIds.size > 1) {
        toMove = selectedIds;
      } else if (el.groupId) {
        toMove = new Set(prev.filter(e => e.groupId === el.groupId).map(e => e.id));
      } else {
        toMove = new Set([id]);
      }

      // Compute the tightest allowed delta for the entire group
      // so it moves as a rigid body and stops together at any wall.
      let minDx = -Infinity, maxDx = Infinity;
      let minDy = -Infinity, maxDy = Infinity;

      for (const e of prev) {
        if (!toMove.has(e.id)) continue;
        const fb  = ELEMENT_SIZES[e.type] || { width: 100, height: 60 };
        const elW = e.width  ?? fb.width;
        const elH = e.height ?? fb.height;
        minDx = Math.max(minDx, -e.x);                           // left wall
        maxDx = Math.min(maxDx, boardSize.width  - elW - e.x);   // right wall
        minDy = Math.max(minDy, -e.y);                           // top wall
        maxDy = Math.min(maxDy, boardSize.height - elH - e.y);   // bottom wall
      }

      const allowedDx = Math.max(minDx, Math.min(maxDx, dx));
      const allowedDy = Math.max(minDy, Math.min(maxDy, dy));

      return prev.map(e => {
        if (!toMove.has(e.id)) return e;
        let newX = e.x + allowedDx;
        let newY = e.y + allowedDy;
        if (snapEnabled) {
          newX = Math.round(newX / snapSize) * snapSize;
          newY = Math.round(newY / snapSize) * snapSize;
        }
        return { ...e, x: newX, y: newY };
      });
    });
  }, [boardSize, snapEnabled, snapSize, selectedIds, setElementsT]);


  // ── Resize (transient) ─────────────────────────────────────
  const handleResize = useCallback((id, x, y, width, height) => {
    setElementsT(prev => prev.map(el => el.id === id ? { ...el, x, y, width, height } : el));
  }, [setElementsT]);

  // ── Update element properties (committed) ──────────────────
  const handleUpdateElement = useCallback((id, changes) => {
    setElements(prev => prev.map(el => el.id === id ? { ...el, ...changes } : el));
  }, [setElements]);

  const handleUpdateElements = useCallback((updates) => {
    setElements(prev => {
      const map = {};
      updates.forEach(u => { map[u.id] = u; });
      return prev.map(el => map[el.id] ? { ...el, ...map[el.id] } : el);
    });
  }, [setElements]);

  const handleImportElements = useCallback((newEls) => {
    setElements(newEls);
    setSelectedIds(new Set());
  }, [setElements]);

  // ── Group / Ungroup ────────────────────────────────────────
  const handleGroup = useCallback(() => {
    if (selectedIds.size < 2) return;
    const groupId = `grp-${Date.now()}`;
    setElements(prev => prev.map(el => selectedIds.has(el.id) ? { ...el, groupId } : el));
  }, [selectedIds, setElements]);

  const handleUngroup = useCallback(() => {
    setElements(prev => {
      const gIds = new Set(prev.filter(el => selectedIds.has(el.id) && el.groupId).map(el => el.groupId));
      if (!gIds.size) return prev;
      return prev.map(el => gIds.has(el.groupId) ? { ...el, groupId: null } : el);
    });
  }, [selectedIds, setElements]);

  // ── Layer reorder ──────────────────────────────────────────
  const handleLayerReorder = useCallback((draggedId, targetId, insertBefore) => {
    setElements(prev => {
      if (draggedId === targetId) return prev;
      const arr = [...prev];
      const fromIdx = arr.findIndex(el => el.id === draggedId);
      if (fromIdx === -1) return prev;
      const [item] = arr.splice(fromIdx, 1);
      const toIdx  = arr.findIndex(el => el.id === targetId);
      if (toIdx === -1) return prev;
      arr.splice(insertBefore ? toIdx : toIdx + 1, 0, item);
      return arr;
    });
  }, [setElements]);

  const handleLayerMove = useCallback((id, direction) => {
    setElements(prev => {
      const idx = prev.findIndex(el => el.id === id);
      if (idx === -1) return prev;
      const arr = [...prev];
      if (direction === 'front') { const [el] = arr.splice(idx, 1); arr.push(el); }
      else if (direction === 'back')  { const [el] = arr.splice(idx, 1); arr.unshift(el); }
      return arr;
    });
  }, [setElements]);

  // ── Delete ─────────────────────────────────────────────────
  const handleDeleteElement = useCallback((id) => {
    setElements(prev => prev.filter(el => el.id !== id));
    setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
  }, [setElements]);

  // ── Keyboard shortcuts ─────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.ctrlKey && !e.shiftKey && e.key === 'z') { e.preventDefault(); undo(); return; }
      if (e.ctrlKey &&  e.shiftKey && e.key === 'z') { e.preventDefault(); redo(); return; }
      if (e.ctrlKey && e.key === 'y')                { e.preventDefault(); redo(); return; }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.size > 0) {
        e.preventDefault();
        setElements(prev => prev.filter(el => !selectedIds.has(el.id)));
        setSelectedIds(new Set());
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo, selectedIds, setElements]);

  const handleClearAll = () => { setElements([]); setSelectedIds(new Set()); };

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <Sidebar
        boardSize={boardSize}
        elements={elements}
        selectedIds={selectedIds}
        onSelect={handleSelect}
        onClearAll={handleClearAll}
        onChangeScreen={onChangeScreen}
        onGroup={handleGroup}
        onUngroup={handleUngroup}
        onLayerMove={handleLayerMove}
        onDeleteElement={handleDeleteElement}
        onLayerReorder={handleLayerReorder}
        snapEnabled={snapEnabled}
        onToggleSnap={() => setSnapEnabled(s => !s)}
      />

      {/* Artboard area — flex so inner flex-1 works */}
      <div className="flex-1 relative flex flex-col overflow-hidden">
        <Artboard
          boardSize={boardSize}
          elements={elements}
          setElements={setElements}
          selectedIds={selectedIds}
          onSelect={handleSelect}
          onDeselectAll={handleDeselectAll}
          onRectSelect={handleRectSelect}
          onDeltaMove={handleDeltaMove}
          onResize={handleResize}
          onBeforeDrag={handleBeforeDrag}
          onAfterDrag={handleAfterDrag}
          snapEnabled={snapEnabled}
          snapSize={snapSize}
          viewTransform={viewTransform}
          setViewTransform={setViewTransform}
        />

        {/* Undo / Redo — bottom-center */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-50 pointer-events-none">
          <button onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)"
            className={`pointer-events-auto flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border shadow-md transition-all
              ${canUndo ? 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:shadow-lg'
                        : 'bg-white/60 border-slate-200 text-slate-300 cursor-not-allowed'}`}>
            <Undo2 size={13} /> Undo
          </button>
          <button onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)"
            className={`pointer-events-auto flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border shadow-md transition-all
              ${canRedo ? 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:shadow-lg'
                        : 'bg-white/60 border-slate-200 text-slate-300 cursor-not-allowed'}`}>
            <Redo2 size={13} /> Redo
          </button>
        </div>
      </div>

      <RightPanel
        elements={elements}
        selectedIds={selectedIds}
        boardSize={boardSize}
        viewTransform={viewTransform}
        setViewTransform={setViewTransform}
        onUpdateElement={handleUpdateElement}
        onUpdateElements={handleUpdateElements}
        onImportElements={handleImportElements}
        snapEnabled={snapEnabled}
        snapSize={snapSize}
        onSnapSizeChange={setSnapSize}
      />
    </div>
  );
}
