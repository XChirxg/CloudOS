import React, { useState } from 'react';
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Bold,
  Italic,
  Lock,
  Unlock,
  Trash2,
  Copy,
  Layers,
  Sparkles,
  Grid,
  ChevronDown,
  ChevronRight,
  Plus,
  Minus,
  Sliders,
  Type
} from 'lucide-react';
import { useDocument } from '../context/DocumentContext';
import { VectorObject, TextObject, RectObject, FillStyle, StrokeStyle, GradientStop } from '../types/document';
import { convertFromMm, convertToMm, formatNumberOnly } from '../utils/units';

export const PropertiesPanel: React.FC = () => {
  const {
    project,
    selectedIds,
    updateObject,
    deleteSelected,
    duplicateSelected,
    bringForward,
    bringToFront,
    sendBackward,
    sendToBack,
    alignSelected,
    distributeSelected,
    groupSelected,
    ungroupSelected,
    repeatGridSelected,
    setActiveModal,
    trackpadTarget,
    setTrackpadTarget,
    isTrackpadOpen,
    setIsTrackpadOpen,
    customFontFamilies,
  } = useDocument();

  const [repeatCols, setRepeatCols] = useState(3);
  const [repeatRows, setRepeatRows] = useState(3);
  const [repeatGapX, setRepeatGapX] = useState(3);
  const [repeatGapY, setRepeatGapY] = useState(3);
  const [showRepeatSection, setShowRepeatSection] = useState(false);

  const unit = project.unit;
  const selectedObjects = project.objects.filter(o => selectedIds.includes(o.id));
  const primaryObject = selectedObjects[0];

  if (selectedObjects.length === 0) {
    return (
      <aside className="w-72 bg-white dark:bg-zinc-900 border-l border-slate-200 dark:border-zinc-800 p-4 text-xs select-none flex flex-col z-30 overflow-y-auto">
        <h3 className="font-semibold text-slate-800 dark:text-zinc-200 mb-3 text-sm flex items-center gap-1.5">
          <span>Document Information</span>
        </h3>
        
        <div className="space-y-3 text-slate-600 dark:text-zinc-400">
          <div className="bg-slate-50 dark:bg-zinc-800/60 p-3 rounded-lg border border-slate-200/70 dark:border-zinc-700/50 space-y-2">
            <div className="flex justify-between">
              <span className="font-medium text-slate-700 dark:text-zinc-300">Preset:</span>
              <span className="font-mono">{project.page.preset} ({project.page.orientation})</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-slate-700 dark:text-zinc-300">Dimensions:</span>
              <span className="font-mono">
                {formatNumberOnly(project.page.width, unit)} × {formatNumberOnly(project.page.height, unit)} {unit}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-slate-700 dark:text-zinc-300">Unit:</span>
              <span className="font-mono uppercase">{unit}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-slate-700 dark:text-zinc-300">Objects:</span>
              <span className="font-mono">{project.objects.length} elements</span>
            </div>
          </div>

          <div className="text-[11px] leading-relaxed text-slate-500 dark:text-zinc-500 border-t border-slate-200 dark:border-zinc-800 pt-3">
            <p className="font-medium text-slate-700 dark:text-zinc-300 mb-1">Quick Tips:</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Click or drag on canvas to create shapes</li>
              <li>Press <kbd className="px-1 bg-slate-100 dark:bg-zinc-800 rounded font-mono">V</kbd> to select & transform objects</li>
              <li>Press <kbd className="px-1 bg-slate-100 dark:bg-zinc-800 rounded font-mono">T</kbd> to add text</li>
              <li>Convert any text into a JSON template placeholder</li>
              <li>Hold <kbd className="px-1 bg-slate-100 dark:bg-zinc-800 rounded font-mono">Space</kbd> + drag to pan canvas</li>
            </ul>
          </div>
        </div>
      </aside>
    );
  }

  // Handle Transform inputs
  const handleXChange = (valStr: string) => {
    const val = parseFloat(valStr);
    if (!isNaN(val)) {
      const mm = convertToMm(val, unit);
      updateObject(primaryObject.id, { x: mm }, true);
    }
  };

  const handleYChange = (valStr: string) => {
    const val = parseFloat(valStr);
    if (!isNaN(val)) {
      const mm = convertToMm(val, unit);
      updateObject(primaryObject.id, { y: mm }, true);
    }
  };

  const handleWChange = (valStr: string) => {
    const val = parseFloat(valStr);
    if (!isNaN(val) && val > 0) {
      const mm = convertToMm(val, unit);
      updateObject(primaryObject.id, { width: mm }, true);
    }
  };

  const handleHChange = (valStr: string) => {
    const val = parseFloat(valStr);
    if (!isNaN(val) && val > 0) {
      const mm = convertToMm(val, unit);
      updateObject(primaryObject.id, { height: mm }, true);
    }
  };

  const handleRotationChange = (valStr: string) => {
    const val = parseFloat(valStr);
    if (!isNaN(val)) {
      updateObject(primaryObject.id, { rotation: (val % 360 + 360) % 360 }, true);
    }
  };

  const handleOpacityChange = (val: number) => {
    updateObject(primaryObject.id, { opacity: val / 100 }, true);
  };

  // Fill Handlers
  const handleFillTypeChange = (type: FillStyle['type']) => {
    if (!('fill' in primaryObject)) return;
    if (type === 'none') {
      updateObject(primaryObject.id, { fill: { type: 'none' } }, true);
    } else if (type === 'solid') {
      updateObject(primaryObject.id, { fill: { type: 'solid', color: '#2563eb', opacity: 1 } }, true);
    } else if (type === 'linear') {
      updateObject(
        primaryObject.id,
        {
          fill: {
            type: 'linear',
            angle: 90,
            opacity: 1,
            stops: [
              { id: 's1', offset: 0, color: '#1e3a8a', opacity: 1 },
              { id: 's2', offset: 1, color: '#3b82f6', opacity: 1 },
            ],
          },
        },
        true
      );
    } else if (type === 'radial') {
      updateObject(
        primaryObject.id,
        {
          fill: {
            type: 'radial',
            cx: 0.5,
            cy: 0.5,
            opacity: 1,
            stops: [
              { id: 's1', offset: 0, color: '#fef08a', opacity: 1 },
              { id: 's2', offset: 1, color: '#b45309', opacity: 1 },
            ],
          },
        },
        true
      );
    }
  };

  const handleSolidColorChange = (color: string) => {
    if ('fill' in primaryObject && primaryObject.fill.type === 'solid') {
      updateObject(primaryObject.id, { fill: { ...primaryObject.fill, color } }, true);
    }
  };

  // Stroke Handlers
  const handleStrokeTypeChange = (type: StrokeStyle['type']) => {
    if (!('stroke' in primaryObject)) return;
    if (type === 'none') {
      updateObject(primaryObject.id, { stroke: { type: 'none', color: '#000000', width: 0, opacity: 0 } }, true);
    } else {
      updateObject(primaryObject.id, { stroke: { type: 'solid', color: '#0f172a', width: 0.5, opacity: 1 } }, true);
    }
  };

  const handleStrokeColorChange = (color: string) => {
    if ('stroke' in primaryObject && primaryObject.stroke) {
      updateObject(primaryObject.id, { stroke: { ...primaryObject.stroke, color } }, true);
    }
  };

  const handleStrokeWidthChange = (valStr: string) => {
    const val = parseFloat(valStr);
    if (!isNaN(val) && 'stroke' in primaryObject && primaryObject.stroke) {
      const mm = convertToMm(val, unit);
      updateObject(primaryObject.id, { stroke: { ...primaryObject.stroke, width: mm } }, true);
    }
  };

  return (
    <aside className="w-72 bg-white dark:bg-zinc-900 border-l border-slate-200 dark:border-zinc-800 p-3 text-xs select-none flex flex-col z-30 overflow-y-auto space-y-4">
      {/* Header with Title and Quick Delete/Duplicate */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-zinc-800 pb-2">
        <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-zinc-200 truncate">
          <span className="uppercase text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 font-mono">
            {primaryObject.type}
          </span>
          <span className="truncate">{primaryObject.name}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={duplicateSelected}
            title="Duplicate (Ctrl+D)"
            className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={deleteSelected}
            title="Delete (Del)"
            className="p-1 rounded text-slate-500 hover:text-red-600 hover:bg-red-50 dark:text-zinc-400 dark:hover:text-red-400 dark:hover:bg-zinc-800"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Transform Section: Position & Size */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-slate-700 dark:text-zinc-300 text-[11px] uppercase tracking-wider">
            Position & Size ({unit})
          </span>
          <button
            onClick={() => {
              setTrackpadTarget('xy');
              setIsTrackpadOpen(!isTrackpadOpen);
            }}
            className={`px-1.5 py-0.5 rounded text-[10px] flex items-center gap-1 transition-colors ${
              isTrackpadOpen
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 font-semibold'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
            }`}
            title="Toggle Alight Motion Precision Trackpad"
          >
            <Sliders className="w-3 h-3 text-blue-500" />
            <span>Trackpad</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-1 bg-slate-50 dark:bg-zinc-800 px-2 py-1 rounded border border-slate-200 dark:border-zinc-700">
            <span className="text-slate-400 font-mono font-semibold">X:</span>
            <input
              type="number"
              step="0.5"
              value={formatNumberOnly(primaryObject.x, unit)}
              onFocus={() => {
                setTrackpadTarget('x');
                setIsTrackpadOpen(true);
              }}
              onChange={e => handleXChange(e.target.value)}
              className="w-full bg-transparent outline-none font-mono text-slate-800 dark:text-zinc-200"
            />
          </div>
          <div className="flex items-center gap-1 bg-slate-50 dark:bg-zinc-800 px-2 py-1 rounded border border-slate-200 dark:border-zinc-700">
            <span className="text-slate-400 font-mono font-semibold">Y:</span>
            <input
              type="number"
              step="0.5"
              value={formatNumberOnly(primaryObject.y, unit)}
              onFocus={() => {
                setTrackpadTarget('y');
                setIsTrackpadOpen(true);
              }}
              onChange={e => handleYChange(e.target.value)}
              className="w-full bg-transparent outline-none font-mono text-slate-800 dark:text-zinc-200"
            />
          </div>
          <div className="flex items-center gap-1 bg-slate-50 dark:bg-zinc-800 px-2 py-1 rounded border border-slate-200 dark:border-zinc-700">
            <span className="text-slate-400 font-mono font-semibold">W:</span>
            <input
              type="number"
              step="0.5"
              value={formatNumberOnly(primaryObject.width, unit)}
              onFocus={() => {
                setTrackpadTarget('width');
                setIsTrackpadOpen(true);
              }}
              onChange={e => handleWChange(e.target.value)}
              className="w-full bg-transparent outline-none font-mono text-slate-800 dark:text-zinc-200"
            />
          </div>
          <div className="flex items-center gap-1 bg-slate-50 dark:bg-zinc-800 px-2 py-1 rounded border border-slate-200 dark:border-zinc-700">
            <span className="text-slate-400 font-mono font-semibold">H:</span>
            <input
              type="number"
              step="0.5"
              value={formatNumberOnly(primaryObject.height, unit)}
              onFocus={() => {
                setTrackpadTarget('height');
                setIsTrackpadOpen(true);
              }}
              onChange={e => handleHChange(e.target.value)}
              className="w-full bg-transparent outline-none font-mono text-slate-800 dark:text-zinc-200"
            />
          </div>
        </div>

        {/* Rotation & Opacity */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <div className="flex items-center gap-1 bg-slate-50 dark:bg-zinc-800 px-2 py-1 rounded border border-slate-200 dark:border-zinc-700">
            <span className="text-slate-400 font-mono">∠:</span>
            <input
              type="number"
              step="1"
              value={Math.round(primaryObject.rotation || 0)}
              onFocus={() => {
                setTrackpadTarget('rotation');
                setIsTrackpadOpen(true);
              }}
              onChange={e => handleRotationChange(e.target.value)}
              className="w-full bg-transparent outline-none font-mono text-slate-800 dark:text-zinc-200"
            />
            <span className="text-slate-400 text-[10px]">°</span>
          </div>
          <div className="flex items-center gap-1 bg-slate-50 dark:bg-zinc-800 px-2 py-1 rounded border border-slate-200 dark:border-zinc-700">
            <span className="text-slate-400 font-mono">Op:</span>
            <input
              type="number"
              min="0"
              max="100"
              value={Math.round((primaryObject.opacity ?? 1) * 100)}
              onFocus={() => {
                setTrackpadTarget('opacity');
                setIsTrackpadOpen(true);
              }}
              onChange={e => handleOpacityChange(Number(e.target.value))}
              className="w-full bg-transparent outline-none font-mono text-slate-800 dark:text-zinc-200"
            />
            <span className="text-slate-400 text-[10px]">%</span>
          </div>
        </div>
      </div>

      {/* Typography Section (if Text selected) */}
      {primaryObject.type === 'text' && (
        <div className="space-y-2 border-t border-slate-200 dark:border-zinc-800 pt-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-700 dark:text-zinc-300 text-[11px] uppercase tracking-wider">
              Typography
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveModal('custom-fonts')}
                className="text-slate-500 hover:text-blue-600 dark:text-zinc-400 dark:hover:text-blue-400 text-[10px] flex items-center gap-0.5 cursor-pointer"
                title="Add custom font (upload or link)"
              >
                <Plus className="w-2.5 h-2.5" />
                <span>Custom Font</span>
              </button>
              {/* Placeholder Indicator Button */}
              {primaryObject.placeholder?.isPlaceholder ? (
                <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 font-mono font-bold text-[10px]">
                  {`{{${primaryObject.placeholder.name}}}`}
                </span>
              ) : (
                <button
                  onClick={() => setActiveModal('make-placeholder')}
                  className="text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium text-[11px] flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3" /> Make Placeholder
                </button>
              )}
            </div>
          </div>

          {/* Text Content Input */}
          <textarea
            rows={2}
            value={primaryObject.text}
            onChange={e => updateObject(primaryObject.id, { text: e.target.value }, true)}
            className="w-full bg-slate-50 dark:bg-zinc-800 p-1.5 rounded border border-slate-200 dark:border-zinc-700 outline-none font-sans text-slate-800 dark:text-zinc-200 text-xs resize-y"
            placeholder="Text content..."
          />

          {/* Font Family & Size */}
          <div className="grid grid-cols-3 gap-2">
            <select
              value={primaryObject.fontFamily}
              onChange={e => {
                if (e.target.value === '__add_custom_font__') {
                  setActiveModal('custom-fonts');
                } else {
                  updateObject(primaryObject.id, { fontFamily: e.target.value }, true);
                }
              }}
              className="col-span-2 bg-slate-50 dark:bg-zinc-800 px-2 py-1 rounded border border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-zinc-200 outline-none truncate"
            >
              <optgroup label="Standard Fonts">
                <option value="Inter">Inter</option>
                <option value="Roboto">Roboto</option>
                <option value="Arial">Arial</option>
                <option value="Helvetica">Helvetica</option>
                <option value="Georgia">Georgia</option>
                <option value="Times New Roman">Times New Roman</option>
                <option value="Courier New">Courier New (Mono)</option>
              </optgroup>
              {customFontFamilies && customFontFamilies.length > 0 && (
                <optgroup label="Custom Fonts">
                  {customFontFamilies.map(f => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </optgroup>
              )}
              <option value="__add_custom_font__">+ Add Custom Font...</option>
            </select>
            <div className="flex items-center gap-1 bg-slate-50 dark:bg-zinc-800 px-2 py-1 rounded border border-slate-200 dark:border-zinc-700">
              <input
                type="number"
                min="4"
                max="200"
                value={primaryObject.fontSize}
                onFocus={() => {
                  setTrackpadTarget('fontSize');
                  setIsTrackpadOpen(true);
                }}
                onChange={e => updateObject(primaryObject.id, { fontSize: Number(e.target.value) }, true)}
                className="w-full bg-transparent outline-none font-mono text-slate-800 dark:text-zinc-200"
              />
              <span className="text-slate-400 text-[10px]">pt</span>
            </div>
          </div>

          {/* Style & Alignment Controls */}
          <div className="flex items-center justify-between bg-slate-50 dark:bg-zinc-800 p-1 rounded border border-slate-200 dark:border-zinc-700">
            <div className="flex items-center gap-1">
              <button
                onClick={() =>
                  updateObject(
                    primaryObject.id,
                    { fontWeight: primaryObject.fontWeight === 'bold' ? 'normal' : 'bold' },
                    true
                  )
                }
                className={`p-1 rounded ${
                  primaryObject.fontWeight === 'bold'
                    ? 'bg-blue-500 text-white'
                    : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-700'
                }`}
              >
                <Bold className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() =>
                  updateObject(
                    primaryObject.id,
                    { fontStyle: primaryObject.fontStyle === 'italic' ? 'normal' : 'italic' },
                    true
                  )
                }
                className={`p-1 rounded ${
                  primaryObject.fontStyle === 'italic'
                    ? 'bg-blue-500 text-white'
                    : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-700'
                }`}
              >
                <Italic className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-1 border-l border-slate-200 dark:border-zinc-700 pl-1">
              <button
                onClick={() => updateObject(primaryObject.id, { textAlign: 'left' }, true)}
                className={`p-1 rounded ${
                  primaryObject.textAlign === 'left'
                    ? 'bg-blue-500 text-white'
                    : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-700'
                }`}
              >
                <AlignLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => updateObject(primaryObject.id, { textAlign: 'center' }, true)}
                className={`p-1 rounded ${
                  primaryObject.textAlign === 'center'
                    ? 'bg-blue-500 text-white'
                    : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-700'
                }`}
              >
                <AlignCenter className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => updateObject(primaryObject.id, { textAlign: 'right' }, true)}
                className={`p-1 rounded ${
                  primaryObject.textAlign === 'right'
                    ? 'bg-blue-500 text-white'
                    : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-700'
                }`}
              >
                <AlignRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fill Section */}
      {'fill' in primaryObject && (
        <div className="space-y-2 border-t border-slate-200 dark:border-zinc-800 pt-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-700 dark:text-zinc-300 text-[11px] uppercase tracking-wider">
              Fill
            </span>
            <select
              value={primaryObject.fill?.type || 'none'}
              onChange={e => handleFillTypeChange(e.target.value as any)}
              className="bg-slate-50 dark:bg-zinc-800 px-2 py-0.5 rounded border border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-zinc-200 text-xs"
            >
              <option value="solid">Solid Color</option>
              <option value="none">None</option>
              <option value="linear">Linear Gradient</option>
              <option value="radial">Radial Gradient</option>
            </select>
          </div>

          {/* Solid Color */}
          {primaryObject.fill?.type === 'solid' && (
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={primaryObject.fill.color}
                onChange={e => handleSolidColorChange(e.target.value)}
                className="w-8 h-8 rounded border border-slate-300 dark:border-zinc-700 cursor-pointer p-0 bg-transparent"
              />
              <input
                type="text"
                value={primaryObject.fill.color}
                onChange={e => handleSolidColorChange(e.target.value)}
                className="flex-1 bg-slate-50 dark:bg-zinc-800 px-2 py-1 rounded border border-slate-200 dark:border-zinc-700 font-mono text-slate-800 dark:text-zinc-200"
              />
            </div>
          )}

          {/* Gradient Editor */}
          {(primaryObject.fill?.type === 'linear' || primaryObject.fill?.type === 'radial') && (
            <div className="space-y-2 bg-slate-50 dark:bg-zinc-800/60 p-2.5 rounded-lg border border-slate-200 dark:border-zinc-700/60">
              {primaryObject.fill.type === 'linear' && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-[11px]">Angle:</span>
                  <div className="flex items-center gap-1 w-28">
                    <input
                      type="range"
                      min="0"
                      max="360"
                      value={primaryObject.fill.angle}
                      onChange={e => {
                        if (primaryObject.fill?.type === 'linear') {
                          updateObject(
                            primaryObject.id,
                            { fill: { ...primaryObject.fill, angle: Number(e.target.value) } },
                            true
                          );
                        }
                      }}
                      className="w-full"
                    />
                    <span className="text-slate-400 font-mono text-[10px] w-8">
                      {primaryObject.fill.angle}°
                    </span>
                  </div>
                </div>
              )}

              {/* Color Stops */}
              <div className="space-y-1.5">
                <span className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider">
                  Color Stops ({primaryObject.fill.stops.length})
                </span>
                {primaryObject.fill.stops.map((stop, sIdx) => (
                  <div key={stop.id} className="flex items-center gap-2">
                    <input
                      type="color"
                      value={stop.color}
                      onChange={e => {
                        const newStops = [...primaryObject.fill.stops];
                        newStops[sIdx] = { ...stop, color: e.target.value };
                        updateObject(primaryObject.id, { fill: { ...primaryObject.fill, stops: newStops } }, true);
                      }}
                      className="w-6 h-6 rounded cursor-pointer border border-slate-300 dark:border-zinc-600 p-0"
                    />
                    <span className="font-mono text-[10px] text-slate-500 w-10">
                      {Math.round(stop.offset * 100)}%
                    </span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={Math.round(stop.offset * 100)}
                      onChange={e => {
                        const newStops = [...primaryObject.fill.stops];
                        newStops[sIdx] = { ...stop, offset: Number(e.target.value) / 100 };
                        updateObject(primaryObject.id, { fill: { ...primaryObject.fill, stops: newStops } }, true);
                      }}
                      className="flex-1"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Stroke Section */}
      {'stroke' in primaryObject && (
        <div className="space-y-2 border-t border-slate-200 dark:border-zinc-800 pt-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-700 dark:text-zinc-300 text-[11px] uppercase tracking-wider">
              Stroke
            </span>
            <select
              value={primaryObject.stroke?.type || 'none'}
              onChange={e => handleStrokeTypeChange(e.target.value as any)}
              className="bg-slate-50 dark:bg-zinc-800 px-2 py-0.5 rounded border border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-zinc-200 text-xs"
            >
              <option value="solid">Solid</option>
              <option value="none">None</option>
            </select>
          </div>

          {primaryObject.stroke?.type === 'solid' && (
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={primaryObject.stroke.color}
                  onChange={e => handleStrokeColorChange(e.target.value)}
                  className="w-7 h-7 rounded border border-slate-300 dark:border-zinc-700 cursor-pointer p-0"
                />
                <input
                  type="text"
                  value={primaryObject.stroke.color}
                  onChange={e => handleStrokeColorChange(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-zinc-800 px-1.5 py-1 rounded border border-slate-200 dark:border-zinc-700 font-mono text-[11px] text-slate-800 dark:text-zinc-200"
                />
              </div>
              <div className="flex items-center gap-1 bg-slate-50 dark:bg-zinc-800 px-2 py-1 rounded border border-slate-200 dark:border-zinc-700">
                <span className="text-slate-400 font-mono">W:</span>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={formatNumberOnly(primaryObject.stroke.width, unit)}
                  onChange={e => handleStrokeWidthChange(e.target.value)}
                  className="w-full bg-transparent outline-none font-mono text-slate-800 dark:text-zinc-200"
                />
                <span className="text-slate-400 text-[10px]">{unit}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Rect Corner Radius */}
      {primaryObject.type === 'rect' && (
        <div className="border-t border-slate-200 dark:border-zinc-800 pt-3">
          <div className="flex items-center justify-between">
            <span className="text-slate-600 dark:text-zinc-400 text-[11px]">Corner Radius ({unit}):</span>
            <input
              type="number"
              min="0"
              step="0.5"
              value={formatNumberOnly(primaryObject.rx || 0, unit)}
              onChange={e => {
                const mm = convertToMm(Number(e.target.value), unit);
                updateObject(primaryObject.id, { rx: mm, ry: mm }, true);
              }}
              className="w-20 bg-slate-50 dark:bg-zinc-800 px-2 py-1 rounded border border-slate-200 dark:border-zinc-700 font-mono text-slate-800 dark:text-zinc-200"
            />
          </div>
        </div>
      )}

      {/* Repeat / Grid Duplication Accordion */}
      <div className="border-t border-slate-200 dark:border-zinc-800 pt-3">
        <button
          onClick={() => setShowRepeatSection(!showRepeatSection)}
          className="w-full flex items-center justify-between font-semibold text-slate-700 dark:text-zinc-300 text-[11px] uppercase tracking-wider hover:text-blue-600 dark:hover:text-blue-400"
        >
          <span className="flex items-center gap-1.5">
            <Grid className="w-3.5 h-3.5 text-blue-500" /> Repeat / Grid Duplication
          </span>
          {showRepeatSection ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>

        {showRepeatSection && (
          <div className="mt-2.5 space-y-2 bg-slate-50 dark:bg-zinc-800/60 p-2.5 rounded-lg border border-slate-200 dark:border-zinc-700/60">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-500">Columns</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={repeatCols}
                  onChange={e => setRepeatCols(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-white dark:bg-zinc-800 px-2 py-1 rounded border border-slate-200 dark:border-zinc-700 font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500">Rows</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={repeatRows}
                  onChange={e => setRepeatRows(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-white dark:bg-zinc-800 px-2 py-1 rounded border border-slate-200 dark:border-zinc-700 font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500">Gap X ({unit})</label>
                <input
                  type="number"
                  step="0.5"
                  value={repeatGapX}
                  onChange={e => setRepeatGapX(parseFloat(e.target.value) || 0)}
                  className="w-full bg-white dark:bg-zinc-800 px-2 py-1 rounded border border-slate-200 dark:border-zinc-700 font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500">Gap Y ({unit})</label>
                <input
                  type="number"
                  step="0.5"
                  value={repeatGapY}
                  onChange={e => setRepeatGapY(parseFloat(e.target.value) || 0)}
                  className="w-full bg-white dark:bg-zinc-800 px-2 py-1 rounded border border-slate-200 dark:border-zinc-700 font-mono"
                />
              </div>
            </div>

            <button
              onClick={() => {
                const gapXMm = convertToMm(repeatGapX, unit);
                const gapYMm = convertToMm(repeatGapY, unit);
                repeatGridSelected(repeatCols, repeatRows, gapXMm, gapYMm);
              }}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-1.5 rounded transition-colors shadow-sm cursor-pointer"
            >
              Create {repeatCols} × {repeatRows} Grid
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
