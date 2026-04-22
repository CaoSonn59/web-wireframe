import { Group, Ungroup, Magnet, MousePointer2 } from 'lucide-react';

function ToolBtn({ icon: Icon, label, onClick, disabled, active, title }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title ?? label}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all
        ${active   ? 'bg-blue-500 border-blue-500 text-white hover:bg-blue-600'
        : disabled ? 'bg-white border-slate-100 text-slate-300 cursor-not-allowed'
        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'}`}
    >
      <Icon size={13} />
      {label}
    </button>
  );
}

export default function Toolbar({
  canGroup, canUngroup, onGroup, onUngroup,
  snapEnabled, onToggleSnap,
}) {
  return (
    <div className="flex items-center gap-1.5 px-4 py-2 bg-white border-b border-slate-200 flex-shrink-0 shadow-sm">
      {/* Active tool indicator */}
      <div className="flex items-center gap-1.5 text-xs text-slate-500 pr-3 border-r border-slate-200 mr-1">
        <MousePointer2 size={13} className="text-blue-500" />
        <span className="font-medium text-slate-600">Select</span>
      </div>

      {/* Group / Ungroup */}
      <ToolBtn icon={Group}   label="Group"   onClick={onGroup}   disabled={!canGroup}   title="Group selected (≥2)" />
      <ToolBtn icon={Ungroup} label="Ungroup" onClick={onUngroup} disabled={!canUngroup} title="Ungroup selected" />

      <div className="w-px h-5 bg-slate-200 mx-1" />

      {/* Snap */}
      <ToolBtn icon={Magnet} label="Snap" onClick={onToggleSnap} active={snapEnabled}
        title={snapEnabled ? 'Snap ON — click to disable' : 'Snap OFF — click to enable'} />
    </div>
  );
}
