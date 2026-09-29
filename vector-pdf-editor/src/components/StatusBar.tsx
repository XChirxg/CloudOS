import React from 'react';
import { ZoomIn, ZoomOut, Maximize2, ShieldCheck } from 'lucide-react';
import { useDocument } from '../context/DocumentContext';
import { formatNumberOnly, convertFromMm } from '../utils/units';

interface StatusBarProps {
  cursorMm: { x: number; y: number } | null;
}

export const StatusBar: React.FC<StatusBarProps> = ({ cursorMm }) => {
  const { project, zoom, setZoom, setPan } = useDocument();
  const unit = project.unit;

  const handleZoomIn = () => setZoom(z => Math.min(4, +(z * 1.15).toFixed(2)));
  const handleZoomOut = () => setZoom(z => Math.max(0.2, +(z / 1.15).toFixed(2)));
  const handleZoom100 = () => setZoom(1.0);
  const handleFitPage = () => {
    setZoom(0.85);
    setPan({ x: 60, y: 40 });
  };

  return (
    <footer className="h-6 bg-white dark:bg-zinc-900 border-t border-slate-200 dark:border-zinc-800 flex items-center justify-between px-3 text-[11px] select-none text-slate-500 dark:text-zinc-400 z-30 font-mono">
      {/* Left: Document info */}
      <div className="flex items-center gap-3">
        <span className="font-semibold text-slate-700 dark:text-zinc-300">
          {project.page.preset} {project.page.orientation}
        </span>
        <span>•</span>
        <span>
          {formatNumberOnly(project.page.width, unit)} × {formatNumberOnly(project.page.height, unit)} {unit}
        </span>
        <span className="hidden sm:inline">•</span>
        <span className="hidden sm:flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
          <ShieldCheck className="w-3 h-3" />
          <span>Vector PDF Print Precision</span>
        </span>
      </div>

      {/* Center: Live Cursor Position */}
      <div className="hidden md:flex items-center gap-2">
        {cursorMm ? (
          <span>
            X: {convertFromMm(cursorMm.x, unit).toFixed(1)} {unit} | Y:{' '}
            {convertFromMm(cursorMm.y, unit).toFixed(1)} {unit}
          </span>
        ) : (
          <span className="text-slate-400">Canvas</span>
        )}
      </div>

      {/* Right: Zoom controls */}
      <div className="flex items-center gap-1">
        <button
          onClick={handleZoomOut}
          title="Zoom Out"
          className="p-0.5 rounded hover:bg-slate-100 dark:hover:bg-zinc-800"
        >
          <ZoomOut className="w-3 h-3" />
        </button>

        <button
          onClick={handleZoom100}
          title="Actual Size (100%)"
          className="px-1.5 py-0.2 rounded hover:bg-slate-100 dark:hover:bg-zinc-800 font-bold"
        >
          {Math.round(zoom * 100)}%
        </button>

        <button
          onClick={handleZoomIn}
          title="Zoom In"
          className="p-0.5 rounded hover:bg-slate-100 dark:hover:bg-zinc-800"
        >
          <ZoomIn className="w-3 h-3" />
        </button>

        <button
          onClick={handleFitPage}
          title="Fit Page"
          className="p-0.5 rounded hover:bg-slate-100 dark:hover:bg-zinc-800 ml-1"
        >
          <Maximize2 className="w-3 h-3" />
        </button>
      </div>
    </footer>
  );
};
