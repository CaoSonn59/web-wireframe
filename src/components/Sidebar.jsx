import { useState } from 'react';
import {
  Square, RectangleHorizontal, Type, MousePointer2, Image,
  Trash2, Monitor, ChevronsUp, ChevronsDown, X, GripVertical,
  Circle, Triangle, Search,
} from 'lucide-react';
import { ELEMENT_CONFIG } from './ArtboardElement';
import { FA_ICONS } from '../data/faIcons';

const SIDEBAR_TOOLS = [
  { type: 'large_block',       label: 'Large Rect',        icon: RectangleHorizontal, preview: 'bg-slate-200',                                      iconColor: 'text-slate-500' },
  { type: 'small_block',       label: 'Small Rect',        icon: Square,              preview: 'bg-slate-200',                                      iconColor: 'text-slate-500' },
  { type: 'text_placeholder',  label: 'Text',              icon: Type,                preview: 'bg-amber-50 border border-amber-200',               iconColor: 'text-amber-400' },
  { type: 'button',            label: 'Button',            icon: MousePointer2,       preview: 'bg-blue-500',                                       iconColor: 'text-white'     },
  { type: 'image_placeholder', label: 'Image',             icon: Image,               preview: 'bg-slate-100 border border-dashed border-slate-300', iconColor: 'text-slate-400' },
  { type: 'circle',            label: 'Circle',            icon: Circle,              preview: 'bg-slate-200',                                      iconColor: 'text-slate-500' },
  { type: 'triangle',          label: 'Triangle',          icon: Triangle,            preview: 'bg-slate-200',                                      iconColor: 'text-slate-500' },
];

const TYPE_ICONS = {
  large_block: RectangleHorizontal, small_block: Square,
  text_placeholder: Type, button: MousePointer2,
  image_placeholder: Image, circle: Circle, triangle: Triangle,
  fa_icon: Square,
};

export default function Sidebar({
  boardSize, elements, selectedIds,
  onSelect, onClearAll, onChangeScreen,
  onLayerMove, onDeleteElement, onLayerReorder,
}) {
  const [iconSearch, setIconSearch] = useState('');
  const [dropInfo, setDropInfo] = useState({ draggedId: null, targetId: null, position: null });

  const handleToolDragStart = (e, type, extra = {}) => {
    e.dataTransfer.setData('elementType', type);
    Object.entries(extra).forEach(([k, v]) => e.dataTransfer.setData(k, v));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleChangeScreen = () => {
    if (window.confirm('Change screen? Current design will be cleared.')) onChangeScreen();
  };

  const layersReversed = [...elements].reverse();

  const filteredIcons = iconSearch.trim()
    ? FA_ICONS.filter(n => n.includes(iconSearch.toLowerCase()))
    : FA_ICONS;

  // ── Layer drag-to-reorder handlers ────────────────────────
  const onLayerDragStart = (e, id) => {
    e.dataTransfer.setData('layerDragId', id);
    e.dataTransfer.effectAllowed = 'move';
    setDropInfo({ draggedId: id, targetId: null, position: null });
  };
  const onLayerDragOver = (e, targetId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const pos = e.clientY < e.currentTarget.getBoundingClientRect().top + e.currentTarget.getBoundingClientRect().height / 2 ? 'above' : 'below';
    setDropInfo(prev => ({ ...prev, targetId, position: pos }));
  };
  const onLayerDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget))
      setDropInfo(prev => ({ ...prev, targetId: null, position: null }));
  };
  const onLayerDrop = (e, targetId) => {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData('layerDragId');
    if (draggedId && draggedId !== targetId)
      onLayerReorder(draggedId, targetId, dropInfo.position === 'below');
    setDropInfo({ draggedId: null, targetId: null, position: null });
  };
  const onLayerDragEnd = () => setDropInfo({ draggedId: null, targetId: null, position: null });

  return (
    <aside className="flex flex-col bg-white border-r border-slate-200 flex-shrink-0 overflow-hidden" style={{ width: 260 }}>

      {/* Brand */}
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

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto min-h-0">

        {/* ── Shapes palette ── */}
        <div className="px-5 pt-4 pb-1">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Elements</p>
        </div>
        <div className="px-3 pb-2">
          <div className="grid grid-cols-2 gap-1">
            {SIDEBAR_TOOLS.map(tool => {
              const Icon = tool.icon;
              return (
                <div
                  key={tool.type}
                  draggable
                  onDragStart={e => handleToolDragStart(e, tool.type)}
                  className="flex items-center gap-2 px-2 py-2 rounded-xl cursor-grab active:cursor-grabbing
                    hover:bg-slate-50 border border-transparent hover:border-slate-200
                    transition-all duration-150 group select-none"
                >
                  <div className={`w-7 h-7 rounded-lg ${tool.preview} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                    <Icon size={13} className={tool.iconColor} />
                  </div>
                  <span className="text-xs text-slate-600 font-medium group-hover:text-slate-800 transition-colors truncate">
                    {tool.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Icons palette ── */}
        <div className="px-5 pt-3 pb-1">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Icons</p>
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              value={iconSearch}
              onChange={e => setIconSearch(e.target.value)}
              placeholder="Search icons…"
              className="w-full pl-7 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400 focus:bg-white transition-colors"
            />
          </div>
        </div>
        <div className="px-3 pb-3">
          <div className="grid grid-cols-6 gap-1 max-h-36 overflow-y-auto pr-1">
            {filteredIcons.slice(0, 120).map(name => (
              <div
                key={name}
                draggable
                title={name}
                onDragStart={e => handleToolDragStart(e, 'fa_icon', { iconName: name })}
                className="flex flex-col items-center justify-center aspect-square rounded-lg border border-transparent
                  hover:bg-blue-50 hover:border-blue-200 cursor-grab active:cursor-grabbing
                  transition-all group select-none p-1"
              >
                <i className={`fa-solid fa-${name} text-slate-500 group-hover:text-blue-500`} style={{ fontSize: 16 }} />
              </div>
            ))}
            {filteredIcons.length === 0 && (
              <div className="col-span-6 py-3 text-center text-xs text-slate-300">No icons found</div>
            )}
          </div>
        </div>

        {/* ── Layer panel ── */}
        <div className="px-5 pt-3 pb-1 flex items-center justify-between">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Layers</p>
          <span className="text-xs text-slate-300">{elements.length}</span>
        </div>
        <div className="px-3 pb-3">
          {elements.length === 0 ? (
            <p className="text-xs text-slate-300 text-center py-3">No layers yet</p>
          ) : (
            <div className="space-y-0.5">
              {layersReversed.map(el => {
                const Icon = TYPE_ICONS[el.type] || Square;
                const isSelected = selectedIds.has(el.id);
                const isBeingDragged = dropInfo.draggedId === el.id;
                const cfg = ELEMENT_CONFIG[el.type];
                const showAbove = dropInfo.targetId === el.id && dropInfo.position === 'above';
                const showBelow = dropInfo.targetId === el.id && dropInfo.position === 'below';

                return (
                  <div key={el.id} className="relative">
                    {showAbove && <div className="absolute -top-px left-2 right-2 h-0.5 bg-blue-400 rounded-full z-10 pointer-events-none" />}
                    <div
                      draggable
                      onDragStart={e => onLayerDragStart(e, el.id)}
                      onDragOver={e => onLayerDragOver(e, el.id)}
                      onDragLeave={onLayerDragLeave}
                      onDrop={e => onLayerDrop(e, el.id)}
                      onDragEnd={onLayerDragEnd}
                      onClick={() => onSelect(el.id, false)}
                      className={`flex items-center gap-1.5 px-1.5 py-1.5 rounded-lg transition-all select-none
                        ${isBeingDragged ? 'opacity-40' : ''}
                        ${isSelected ? 'bg-blue-50 border border-blue-200' : 'hover:bg-slate-50 border border-transparent'}`}
                    >
                      <div className="flex-shrink-0 cursor-grab text-slate-300 hover:text-slate-500 px-0.5" onClick={e => e.stopPropagation()}>
                        <GripVertical size={12} />
                      </div>
                      {el.type === 'fa_icon' ? (
                        <div className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0 bg-slate-100">
                          <i className={`fa-solid fa-${el.iconName} text-slate-400`} style={{ fontSize: 11 }} />
                        </div>
                      ) : (
                        <div className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-blue-100' : 'bg-slate-100'}`}>
                          <Icon size={11} className={isSelected ? 'text-blue-500' : 'text-slate-400'} />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <span className={`text-xs font-medium truncate block ${isSelected ? 'text-blue-700' : 'text-slate-600'}`}>
                          {el.type === 'fa_icon' ? el.iconName : (cfg?.label ?? el.type)}
                        </span>
                        {el.groupId && <span className="text-[9px] text-purple-400 font-semibold uppercase tracking-wide">group</span>}
                      </div>
                      <div className={`flex gap-0.5 flex-shrink-0 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0'}`} onClick={e => e.stopPropagation()}>
                        <button onClick={() => onLayerMove(el.id, 'front')} title="Front" className="p-0.5 rounded hover:bg-blue-100 text-slate-400 hover:text-blue-600 transition-colors"><ChevronsUp size={11} /></button>
                        <button onClick={() => onLayerMove(el.id, 'back')}  title="Back"  className="p-0.5 rounded hover:bg-blue-100 text-slate-400 hover:text-blue-600 transition-colors"><ChevronsDown size={11} /></button>
                        <div className="w-px bg-slate-200 mx-0.5" />
                        <button onClick={() => onDeleteElement(el.id)} title="Delete" className="p-0.5 rounded hover:bg-red-100 text-slate-400 hover:text-red-500 transition-colors"><X size={11} /></button>
                      </div>
                    </div>
                    {showBelow && <div className="absolute -bottom-px left-2 right-2 h-0.5 bg-blue-400 rounded-full z-10 pointer-events-none" />}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Bottom actions */}
      <div className="border-t border-slate-100 px-4 py-3 space-y-1.5 flex-shrink-0">
        <button onClick={onClearAll}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-red-500 bg-red-50 border border-red-100 hover:bg-red-100 transition-all">
          <Trash2 size={14} /> Clear All
        </button>
        <button onClick={handleChangeScreen}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-slate-600 bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-all">
          <Monitor size={14} /> Change Screen
        </button>
      </div>
    </aside>
  );
}
