import React, { useState } from 'react';
import { Layout, X } from 'lucide-react';
import { useDocument } from '../../context/DocumentContext';
import { PagePreset, PageOrientation, Unit } from '../../types/document';
import { PAGE_PRESETS, convertFromMm, convertToMm } from '../../utils/units';

export const PageSettingsModal: React.FC = () => {
  const { activeModal, setActiveModal, project, setPagePreset, setUnit } = useDocument();

  const [preset, setPreset] = useState<PagePreset>(project.page.preset);
  const [orientation, setOrientation] = useState<PageOrientation>(project.page.orientation);
  const [unit, setSelectedUnit] = useState<Unit>(project.unit);
  const [customW, setCustomW] = useState(convertFromMm(project.page.width, project.unit));
  const [customH, setCustomH] = useState(convertFromMm(project.page.height, project.unit));

  if (activeModal !== 'page-settings') return null;

  const handleApply = () => {
    setUnit(unit);
    const customWMm = convertToMm(customW, unit);
    const customHMm = convertToMm(customH, unit);
    setPagePreset(preset, orientation, customWMm, customHMm);
    setActiveModal(null);
  };

  const handlePresetSelect = (p: PagePreset) => {
    setPreset(p);
    if (p !== 'Custom' && PAGE_PRESETS[p]) {
      const wMm = PAGE_PRESETS[p].width;
      const hMm = PAGE_PRESETS[p].height;
      setCustomW(Number(convertFromMm(wMm, unit).toFixed(2)));
      setCustomH(Number(convertFromMm(hMm, unit).toFixed(2)));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-2xl max-w-md w-full flex flex-col overflow-hidden text-xs">
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold text-slate-800 dark:text-zinc-100 text-sm">
            <Layout className="w-4 h-4 text-blue-500" />
            <span>Page Setup & Document Dimensions</span>
          </div>
          <button
            onClick={() => setActiveModal(null)}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          {/* Preset Selector */}
          <div>
            <label className="block text-slate-700 dark:text-zinc-300 font-medium mb-1">
              Page Size Preset:
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(['A4', 'A3', 'Letter', 'Custom'] as PagePreset[]).map(p => (
                <button
                  key={p}
                  onClick={() => handlePresetSelect(p)}
                  className={`py-2 px-1 rounded-lg border text-center font-medium transition-colors ${
                    preset === p
                      ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-900/40 dark:border-blue-400 dark:text-blue-300'
                      : 'border-slate-200 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Orientation */}
          <div>
            <label className="block text-slate-700 dark:text-zinc-300 font-medium mb-1">
              Orientation:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setOrientation('portrait')}
                className={`py-2 px-3 rounded-lg border text-center font-medium transition-colors flex items-center justify-center gap-2 ${
                  orientation === 'portrait'
                    ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-900/40 dark:border-blue-400 dark:text-blue-300'
                    : 'border-slate-200 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300'
                }`}
              >
                <div className="w-3 h-4 border border-current rounded-xs" />
                <span>Portrait</span>
              </button>
              <button
                onClick={() => setOrientation('landscape')}
                className={`py-2 px-3 rounded-lg border text-center font-medium transition-colors flex items-center justify-center gap-2 ${
                  orientation === 'landscape'
                    ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-900/40 dark:border-blue-400 dark:text-blue-300'
                    : 'border-slate-200 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300'
                }`}
              >
                <div className="w-4 h-3 border border-current rounded-xs" />
                <span>Landscape</span>
              </button>
            </div>
          </div>

          {/* Unit & Dimensions */}
          <div className="space-y-2 bg-slate-50 dark:bg-zinc-800/60 p-3 rounded-lg border border-slate-200 dark:border-zinc-700">
            <div className="flex items-center justify-between">
              <span className="text-slate-700 dark:text-zinc-300 font-medium">Physical Unit:</span>
              <select
                value={unit}
                onChange={e => {
                  const newU = e.target.value as Unit;
                  // Recompute current custom inputs in new unit
                  const mmW = convertToMm(customW, unit);
                  const mmH = convertToMm(customH, unit);
                  setSelectedUnit(newU);
                  setCustomW(Number(convertFromMm(mmW, newU).toFixed(2)));
                  setCustomH(Number(convertFromMm(mmH, newU).toFixed(2)));
                }}
                className="bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded px-2 py-1"
              >
                <option value="mm">Millimeters (mm)</option>
                <option value="cm">Centimeters (cm)</option>
                <option value="inch">Inches (in)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <label className="text-[10px] text-slate-500">Width ({unit})</label>
                <input
                  type="number"
                  step="0.1"
                  min="1"
                  disabled={preset !== 'Custom'}
                  value={customW}
                  onChange={e => setCustomW(parseFloat(e.target.value) || 0)}
                  className="w-full bg-white dark:bg-zinc-800 px-2.5 py-1.5 rounded border border-slate-200 dark:border-zinc-700 font-mono disabled:opacity-60"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500">Height ({unit})</label>
                <input
                  type="number"
                  step="0.1"
                  min="1"
                  disabled={preset !== 'Custom'}
                  value={customH}
                  onChange={e => setCustomH(parseFloat(e.target.value) || 0)}
                  className="w-full bg-white dark:bg-zinc-800 px-2.5 py-1.5 rounded border border-slate-200 dark:border-zinc-700 font-mono disabled:opacity-60"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-slate-50 dark:bg-zinc-800/50 border-t border-slate-100 dark:border-zinc-800 flex justify-end gap-2">
          <button
            onClick={() => setActiveModal(null)}
            className="px-3 py-1.5 rounded-lg text-slate-600 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm transition-colors cursor-pointer"
          >
            Apply Page Settings
          </button>
        </div>
      </div>
    </div>
  );
};
