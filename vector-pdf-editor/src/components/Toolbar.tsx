import React, { useRef } from 'react';
import {
  MousePointer,
  Type,
  Square,
  Circle,
  Minus,
  PenTool,
  Image as ImageIcon,
  Code,
  Hand,
  Magnet,
  Grid as GridIcon,
  ZoomIn,
  ZoomOut,
  Maximize2
} from 'lucide-react';
import { useDocument } from '../context/DocumentContext';
import { ToolType } from '../types/document';

export const Toolbar: React.FC = () => {
  const {
    activeTool,
    setActiveTool,
    project,
    setGridConfig,
    setSnapConfig,
    setZoom,
    setPan,
    setActiveModal,
    addObject,
  } = useDocument();

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const tools: { id: ToolType; label: string; icon: React.ReactNode; shortcut: string }[] = [
    { id: 'select', label: 'Select & Move', icon: <MousePointer className="w-4 h-4" />, shortcut: 'V' },
    { id: 'text', label: 'Add Text', icon: <Type className="w-4 h-4" />, shortcut: 'T' },
    { id: 'rect', label: 'Rectangle', icon: <Square className="w-4 h-4" />, shortcut: 'R' },
    { id: 'ellipse', label: 'Ellipse / Circle', icon: <Circle className="w-4 h-4" />, shortcut: 'O' },
    { id: 'line', label: 'Line', icon: <Minus className="w-4 h-4" />, shortcut: 'L' },
    { id: 'pen', label: 'Pen / Freehand Path', icon: <PenTool className="w-4 h-4" />, shortcut: 'P' },
    { id: 'pan', label: 'Hand / Pan Canvas', icon: <Hand className="w-4 h-4" />, shortcut: 'H' },
  ];

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = evt => {
      const src = evt.target?.result as string;
      const img = new Image();
      img.onload = () => {
        // Calculate appropriate default dimensions in mm (e.g. max 60mm width)
        const naturalW = img.naturalWidth || 200;
        const naturalH = img.naturalHeight || 200;
        const aspect = naturalW / naturalH;
        let w = 60;
        let h = w / aspect;
        if (h > 60) {
          h = 60;
          w = h * aspect;
        }

        addObject({
          name: `Image (${file.name})`,
          type: 'image',
          x: 20,
          y: 20,
          width: Number(w.toFixed(2)),
          height: Number(h.toFixed(2)),
          rotation: 0,
          opacity: 1,
          locked: false,
          visible: true,
          src,
          naturalWidth: naturalW,
          naturalHeight: naturalH,
          aspectRatioLocked: true,
        });
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleZoomIn = () => setZoom(z => Math.min(4, +(z * 1.2).toFixed(2)));
  const handleZoomOut = () => setZoom(z => Math.max(0.2, +(z / 1.2).toFixed(2)));
  const handleFitPage = () => {
    // Center page on screen
    setZoom(0.85);
    setPan({ x: 60, y: 40 });
  };

  return (
    <aside className="w-12 flex-shrink-0 bg-white dark:bg-zinc-900 border-r border-slate-200 dark:border-zinc-800 flex flex-col items-center py-2 z-30 select-none shadow-sm">
      {/* Hidden file input for image upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="hidden"
        onChange={handleImageUpload}
      />

      {/* Main Creation Tools */}
      <div className="flex flex-col gap-1 w-full px-1.5 pb-2 border-b border-slate-200 dark:border-zinc-800">
        {tools.map(tool => {
          const isActive = activeTool === tool.id;
          return (
            <button
              key={tool.id}
              onClick={() => setActiveTool(tool.id)}
              title={`${tool.label} (${tool.shortcut})`}
              className={`w-9 h-9 rounded-md flex items-center justify-center transition-colors relative group ${
                isActive
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              {tool.icon}
              <span className="sr-only">{tool.label}</span>
              {/* Tooltip */}
              <div className="absolute left-12 px-2 py-1 rounded bg-slate-900 text-white text-[11px] whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-md">
                {tool.label} <span className="text-slate-400">[{tool.shortcut}]</span>
              </div>
            </button>
          );
        })}

        {/* Upload Image Button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          title="Import Image (PNG, JPG, WebP, SVG)"
          className="w-9 h-9 rounded-md flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800 transition-colors relative group"
        >
          <ImageIcon className="w-4 h-4" />
          <div className="absolute left-12 px-2 py-1 rounded bg-slate-900 text-white text-[11px] whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-md">
            Import Image <span className="text-slate-400">[I]</span>
          </div>
        </button>

        {/* Insert SVG Code Button */}
        <button
          onClick={() => setActiveModal('insert-svg')}
          title="Insert SVG Code"
          className="w-9 h-9 rounded-md flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800 transition-colors relative group"
        >
          <Code className="w-4 h-4" />
          <div className="absolute left-12 px-2 py-1 rounded bg-slate-900 text-white text-[11px] whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-md">
            Insert SVG Code...
          </div>
        </button>
      </div>

      {/* Grid & Snapping Quick Toggles */}
      <div className="flex flex-col gap-1 w-full px-1.5 py-2 border-b border-slate-200 dark:border-zinc-800">
        <button
          onClick={() => setGridConfig({ show: !project.grid.show })}
          title={`Grid: ${project.grid.show ? 'Shown' : 'Hidden'} (G)`}
          className={`w-9 h-9 rounded-md flex items-center justify-center transition-colors relative group ${
            project.grid.show
              ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
              : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:text-zinc-500 dark:hover:text-zinc-300 dark:hover:bg-zinc-800'
          }`}
        >
          <GridIcon className="w-4 h-4" />
          <div className="absolute left-12 px-2 py-1 rounded bg-slate-900 text-white text-[11px] whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-md">
            Toggle Grid: {project.grid.show ? 'ON' : 'OFF'}
          </div>
        </button>

        <button
          onClick={() => setSnapConfig({ enabled: !project.snap.enabled })}
          title={`Magnetic Snapping: ${project.snap.enabled ? 'ON' : 'OFF'} (S)`}
          className={`w-9 h-9 rounded-md flex items-center justify-center transition-colors relative group ${
            project.snap.enabled
              ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
              : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:text-zinc-500 dark:hover:text-zinc-300 dark:hover:bg-zinc-800'
          }`}
        >
          <Magnet className="w-4 h-4" />
          <div className="absolute left-12 px-2 py-1 rounded bg-slate-900 text-white text-[11px] whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-md">
            Magnetic Snap: {project.snap.enabled ? 'ON' : 'OFF'}
          </div>
        </button>
      </div>

      {/* Canvas Zoom Shortcuts */}
      <div className="mt-auto flex flex-col gap-1 w-full px-1.5 pt-2">
        <button
          onClick={handleZoomIn}
          title="Zoom In (Ctrl + +)"
          className="w-9 h-9 rounded-md flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-800 transition-colors"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={handleZoomOut}
          title="Zoom Out (Ctrl + -)"
          className="w-9 h-9 rounded-md flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-800 transition-colors"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={handleFitPage}
          title="Reset View / Center Page"
          className="w-9 h-9 rounded-md flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-800 transition-colors"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};
