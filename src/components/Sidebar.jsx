import { useState } from 'react';
import {
  Square, RectangleHorizontal, Type, MousePointer2, Image,
  Trash2, Monitor, Group, Ungroup,
  ChevronsUp, ChevronsDown, X, GripVertical, Magnet,
  Circle, Triangle,
} from 'lucide-react';
import { ELEMENT_CONFIG } from './ArtboardElement';

const SIDEBAR_TOOLS = [
  { type: 'large_block',       label: 'Large Rectangle',   icon: RectangleHorizontal, preview: 'bg-slate-200',                                      iconColor: 'text-slate-500' },
  { type: 'small_block',       label: 'Small Rectangle',   icon: Square,              preview: 'bg-slate-200',                                      iconColor: 'text-slate-500' },
  { type: 'text_placeholder',  label: 'Text Placeholder',  icon: Type,                preview: 'bg-amber-50 border border-amber-200',               iconColor: 'text-amber-400' },
  { type: 'button',            label: 'Button',            icon: MousePointer2,       preview: 'bg-blue-500',                                       iconColor: 'text-white'     },
  { type: 'image_placeholder', label: 'Image Placeholder', icon: Image,               preview: 'bg-slate-100 border border-dashed border-slate-300', iconColor: 'text-slate-400' },
  { type: 'circle',            label: 'Circle',            icon: Circle,              preview: 'bg-slate-200',                                      iconColor: 'text-slate-500' },
  { type: 'triangle',          label: 'Triangle',          icon: Triangle,            preview: 'bg-slate-200',                                      iconColor: 'text-slate-500' },
];

const TYPE_ICONS = {
  large_block:       RectangleHorizontal,
  small_block:       Square,
  text_placeholder:  Type,
  button:            MousePointer2,
  image_placeholder: Image,
  circle:            Circle,
  triangle:          Triangle,
};

export default function Sidebar({
  boardSize, elements, selectedIds,
  onSelect, onClearAll, onChangeScreen,
  onGroup, onUngroup, onLayerMove, onDeleteElement, onLayerReorder,
  snapEnabled, onToggleSnap,
}) {
  // ── Drag-to-reorder state ──────────────────────────────────
  // targetId: which layer row the cursor is over
  // position: 'above' | 'below' — which half of the row
  const [dropInfo, setDropInfo] = useState({ draggedId: null, targetId: null, position: null });

  const handleToolDragStart = (e, type) => {
    e.dataTransfer.setData('elementType', type);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleChangeScreen = () => {
    if (window.confirm('Are you sure you want to change the screen?\nYour current design will be cleared.')) {
      onChangeScreen();
    }
  };

  const selectedEls = elements.filter(el => selectedIds.has(el.id));
  const canGroup    = selectedIds.size >= 2;
  const canUngroup  = selectedEls.some(el => el.groupId);

  // Layers shown top-to-bottom = highest z → lowest z
  const layersReversed = [...elements].reverse();

  // ── Layer drag handlers ────────────────────────────────────
  const onLayerDragStart = (e, id) => {
    // Use a separate key so it doesn't conflict with element drops on artboard
    e.dataTransfer.setData('layerDragId', id);
    e.dataTransfer.effectAllowed = 'move';
    setDropInfo({ draggedId: id, targetId: null, position: null });
  };

  const onLayerDragOver = (e, targetId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const rect     = e.currentTarget.getBoundingClientRect();
    const position = e.clientY < rect.top + rect.height / 2 ? 'above' : 'below';
    setDropInfo(prev => ({ ...prev, targetId, position }));
  };

  const onLayerDragLeave = (e) => {
    // Only clear if we actually left the row (not moved to a child)
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDropInfo(prev => ({ ...prev, targetId: null, position: null }));
    }
  };

  const onLayerDrop = (e, targetId) => {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData('layerDragId');
    if (draggedId && draggedId !== targetId) {
      // 'above' in panel = higher z = insert AFTER target in array
      // 'below' in panel = lower z  = insert BEFORE target in array
      const insertBefore = dropInfo.position === 'below';
      onLayerReorder(draggedId, targetId, insertBefore);
    }
    setDropInfo({ draggedId: null, targetId: null, position: null });
  };

  const onLayerDragEnd = () => {
    setDropInfo({ draggedId: null, targetId: null, position: null });
  };

  return (
    <aside className="flex flex-col bg-white border-r border-slate-200 flex-shrink-0 overflow-hidden" style={{ width: 260 }}>

      {/* ── Brand header ── */}
      <div className="px-5 py-4 border-b border-slate-100 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <Monitor size={14} className="text-white" />
          </div>
          <span className="font-semibold text-slate-700 text-sm">Wireframe Builder</span>
        </div>
        <div className="mt-2 inline-flex items-center bg-slate-50 border border-slate-200 rounded-md px-2 py-1">
          <span className="font-mono text-xs text-slate-500">{boardSize.width} × {boardSize.height}</span>
        </div>
      </div>

      {/* ── Group + Snap toolbar ── */}
      <div className="px-3 py-2.5 border-b border-slate-100 flex gap-2 flex-shrink-0">
        <button
          onClick={onGroup} disabled={!canGroup}
          title="Group selected (need ≥2)"
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border text-xs font-medium transition-all
            ${canGroup ? 'bg-violet-50 border-violet-200 text-violet-600 hover:bg-violet-100 cursor-pointer'
                       : 'bg-slate-50 border-slate-200 text-slate-300 cursor-not-allowed'}`}
        >
          <Group size={13} /> Group
        </button>
        <button
          onClick={onUngroup} disabled={!canUngroup}
          title="Ungroup selected"
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border text-xs font-medium transition-all
            ${canUngroup ? 'bg-violet-50 border-violet-200 text-violet-600 hover:bg-violet-100 cursor-pointer'
                         : 'bg-slate-50 border-slate-200 text-slate-300 cursor-not-allowed'}`}
        >
          <Ungroup size={13} /> Ungroup
        </button>
        {/* Snap toggle */}
        <button
          onClick={onToggleSnap}
          title={snapEnabled ? 'Snap ON — click to disable' : 'Snap OFF — click to enable'}
          className={`flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all flex-shrink-0
            ${snapEnabled
              ? 'bg-blue-500 border-blue-500 text-white hover:bg-blue-600'
              : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100'}`}
        >
          <Magnet size={13} />
        </button>
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto min-h-0">

        {/* Elements palette */}
        <div className="px-5 pt-4 pb-2">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Elements</p>
        </div>
        <div className="px-3">
          <div className="space-y-1">
            {SIDEBAR_TOOLS.map((tool) => {
              const Icon = tool.icon;
              return (
                <div
                  key={tool.type}
                  draggable
                  onDragStart={(e) => handleToolDragStart(e, tool.type)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-grab active:cursor-grabbing
                    hover:bg-slate-50 border border-transparent hover:border-slate-200
                    transition-all duration-150 group select-none"
                >
                  <div className={`w-9 h-9 rounded-lg ${tool.preview} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                    <Icon size={16} className={tool.iconColor} />
                  </div>
                  <span className="text-sm text-slate-600 font-medium group-hover:text-slate-800 transition-colors">
                    {tool.label}
                  </span>
                  <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg className="w-3.5 h-3.5 text-slate-300" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm0 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm0 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm8-16a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm0 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm0 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
                    </svg>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Layer panel ── */}
        <div className="px-5 pt-5 pb-2 flex items-center justify-between">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Layers</p>
          <span className="text-xs text-slate-300">{elements.length}</span>
        </div>

        <div className="px-3 pb-3">
          {elements.length === 0 ? (
            <p className="text-xs text-slate-300 text-center py-4">No layers yet</p>
          ) : (
            <div className="space-y-0.5">
              {layersReversed.map((el) => {
                const Icon       = TYPE_ICONS[el.type] || Square;
                const isSelected = selectedIds.has(el.id);
                const isBeingDragged = dropInfo.draggedId === el.id;
                const cfg        = ELEMENT_CONFIG[el.type];

                // Drop indicator: blue line above or below this row
                const showAbove = dropInfo.targetId === el.id && dropInfo.position === 'above';
                const showBelow = dropInfo.targetId === el.id && dropInfo.position === 'below';

                return (
                  <div key={el.id} className="relative">
                    {/* Drop indicator — ABOVE */}
                    {showAbove && (
                      <div className="absolute -top-px left-2 right-2 h-0.5 bg-blue-400 rounded-full z-10 pointer-events-none" />
                    )}

                    <div
                      draggable
                      onDragStart={(e) => onLayerDragStart(e, el.id)}
                      onDragOver={(e) => onLayerDragOver(e, el.id)}
                      onDragLeave={onLayerDragLeave}
                      onDrop={(e) => onLayerDrop(e, el.id)}
                      onDragEnd={onLayerDragEnd}
                      onClick={() => onSelect(el.id, false)}
                      className={`flex items-center gap-1.5 px-1.5 py-1.5 rounded-lg transition-all select-none
                        ${isBeingDragged ? 'opacity-40' : 'opacity-100'}
                        ${isSelected
                          ? 'bg-blue-50 border border-blue-200'
                          : 'hover:bg-slate-50 border border-transparent'}
                      `}
                    >
                      {/* Drag handle */}
                      <div
                        className="flex-shrink-0 cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 transition-colors px-0.5"
                        title="Drag to reorder"
                        onClick={e => e.stopPropagation()}
                      >
                        <GripVertical size={12} />
                      </div>

                      {/* Type icon */}
                      <div className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0
                        ${isSelected ? 'bg-blue-100' : 'bg-slate-100'}`}>
                        <Icon size={11} className={isSelected ? 'text-blue-500' : 'text-slate-400'} />
                      </div>

                      {/* Label + group badge */}
                      <div className="flex-1 min-w-0">
                        <span className={`text-xs font-medium truncate block
                          ${isSelected ? 'text-blue-700' : 'text-slate-600'}`}>
                          {cfg?.label ?? el.type}
                        </span>
                        {el.groupId && (
                          <span className="text-[9px] text-purple-400 font-semibold uppercase tracking-wide">group</span>
                        )}
                      </div>

                      {/* Front / Back + Delete — shown when selected */}
                      <div
                        className={`flex gap-0.5 flex-shrink-0 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                        onClick={e => e.stopPropagation()}
                      >
                        <button onClick={() => onLayerMove(el.id, 'front')} title="Bring to front"
                          className="p-0.5 rounded hover:bg-blue-100 text-slate-400 hover:text-blue-600 transition-colors">
                          <ChevronsUp size={11} />
                        </button>
                        <button onClick={() => onLayerMove(el.id, 'back')} title="Send to back"
                          className="p-0.5 rounded hover:bg-blue-100 text-slate-400 hover:text-blue-600 transition-colors">
                          <ChevronsDown size={11} />
                        </button>
                        <div className="w-px bg-slate-200 mx-0.5" />
                        <button onClick={() => onDeleteElement(el.id)} title="Delete"
                          className="p-0.5 rounded hover:bg-red-100 text-slate-400 hover:text-red-500 transition-colors">
                          <X size={11} />
                        </button>
                      </div>
                    </div>

                    {/* Drop indicator — BELOW */}
                    {showBelow && (
                      <div className="absolute -bottom-px left-2 right-2 h-0.5 bg-blue-400 rounded-full z-10 pointer-events-none" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom actions ── */}
      <div className="border-t border-slate-100 px-4 py-4 space-y-2 flex-shrink-0">
        <button onClick={onClearAll}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
            text-sm font-medium text-red-500 bg-red-50 border border-red-100
            hover:bg-red-100 hover:border-red-200 transition-all duration-150">
          <Trash2 size={15} /> Clear All
        </button>
        <button onClick={handleChangeScreen}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
            text-sm font-medium text-slate-600 bg-slate-50 border border-slate-200
            hover:bg-slate-100 hover:border-slate-300 transition-all duration-150">
          <Monitor size={15} /> Change Screen
        </button>
      </div>
    </aside>
  );
}
