import { Monitor, Tablet, Smartphone } from 'lucide-react';

const DEVICES = [
  {
    label: 'Desktop',
    sublabel: 'Computer',
    description: '1440 × 900',
    width: 1440,
    height: 900,
    icon: Monitor,
    accent: 'from-blue-500 to-indigo-600',
    border: 'hover:border-blue-400',
    shadow: 'hover:shadow-blue-100',
  },
  {
    label: 'Tablet',
    sublabel: 'Tablet',
    description: '768 × 1024',
    width: 768,
    height: 1024,
    icon: Tablet,
    accent: 'from-violet-500 to-purple-600',
    border: 'hover:border-violet-400',
    shadow: 'hover:shadow-violet-100',
  },
  {
    label: 'Mobile',
    sublabel: 'Phone',
    description: '390 × 844',
    width: 390,
    height: 844,
    icon: Smartphone,
    accent: 'from-emerald-500 to-teal-600',
    border: 'hover:border-emerald-400',
    shadow: 'hover:shadow-emerald-100',
  },
];

export default function DeviceSelection({ onSelect }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex flex-col items-center justify-center px-6">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 bg-white border border-slate-200 rounded-full px-4 py-1.5 mb-6 shadow-sm">
          <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          <span className="text-xs font-medium text-slate-500 tracking-wide uppercase">Wireframe Builder</span>
        </div>
        <h1 className="text-4xl font-bold text-slate-800 mb-3 tracking-tight">
          Choose a screen size
        </h1>
        <p className="text-slate-500 text-base max-w-md mx-auto leading-relaxed">
          Select a target device to start building your wireframe.
        </p>
      </div>

      {/* Device Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 w-full max-w-3xl">
        {DEVICES.map((device) => {
          const Icon = device.icon;
          return (
            <button
              key={device.sublabel}
              onClick={() => onSelect({ width: device.width, height: device.height })}
              className={`
                group relative bg-white border-2 border-slate-200 rounded-2xl p-7 text-left
                transition-all duration-300 cursor-pointer
                ${device.border} ${device.shadow}
                hover:shadow-xl hover:-translate-y-1
                focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2
              `}
            >
              {/* Icon background */}
              <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${device.accent} mb-5 shadow-md`}>
                <Icon className="text-white" size={22} />
              </div>

              {/* Labels */}
              <div className="mb-1">
                <span className="text-lg font-semibold text-slate-800">{device.label}</span>
              </div>
              <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">
                {device.sublabel}
              </div>

              {/* Dimensions badge */}
              <div className="inline-flex items-center bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
                <span className="font-mono text-sm font-medium text-slate-600">{device.description}</span>
              </div>

              {/* Hover arrow */}
              <div className="absolute top-5 right-5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer hint */}
      <p className="mt-10 text-xs text-slate-400">
        You can change the screen size at any time during your design session.
      </p>
    </div>
  );
}
