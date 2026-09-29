import React, { useState } from 'react';
import { Code, AlertCircle, X } from 'lucide-react';
import { useDocument } from '../../context/DocumentContext';

export const InsertSvgModal: React.FC = () => {
  const { activeModal, setActiveModal, addObject, project } = useDocument();
  const [svgCode, setSvgCode] = useState<string>(
    `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">\n  <circle cx="50" cy="50" r="40" stroke="#2563eb" stroke-width="4" fill="#dbeafe" />\n  <path d="M35 50L45 60L65 40" stroke="#2563eb" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />\n</svg>`
  );
  const [error, setError] = useState<string | null>(null);

  if (activeModal !== 'insert-svg') return null;

  const handleInsert = () => {
    setError(null);
    const trimmed = svgCode.trim();
    if (!trimmed) {
      setError('Please paste or write SVG code.');
      return;
    }

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(trimmed, 'image/svg+xml');
      const parserError = doc.querySelector('parsererror');
      if (parserError) {
        throw new Error('Invalid SVG XML: ' + parserError.textContent);
      }

      const svgEl = doc.querySelector('svg');
      if (!svgEl) {
        throw new Error('No root <svg> element found in code.');
      }

      // Extract viewBox or default bounds
      const viewBoxAttr = svgEl.getAttribute('viewBox');
      let widthMm = 40;
      let heightMm = 40;

      if (viewBoxAttr) {
        const parts = viewBoxAttr.split(/[\s,]+/).map(Number);
        if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
          const aspect = parts[2] / parts[3];
          if (aspect >= 1) {
            widthMm = 40;
            heightMm = 40 / aspect;
          } else {
            heightMm = 40;
            widthMm = 40 * aspect;
          }
        }
      }

      // Extract inner content without the outer <svg> wrapper to avoid nesting issues
      const innerSvg = svgEl.innerHTML;

      addObject({
        name: 'Inserted Vector SVG',
        type: 'svg',
        x: project.page.width / 2 - widthMm / 2,
        y: project.page.height / 2 - heightMm / 2,
        width: Number(widthMm.toFixed(2)),
        height: Number(heightMm.toFixed(2)),
        rotation: 0,
        opacity: 1,
        locked: false,
        visible: true,
        svgCode: innerSvg || trimmed,
        viewBox: viewBoxAttr || undefined,
      });

      setActiveModal(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to parse SVG code.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-2xl max-w-xl w-full flex flex-col overflow-hidden text-xs">
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold text-slate-800 dark:text-zinc-100 text-sm">
            <Code className="w-4 h-4 text-blue-500" />
            <span>Insert SVG Code</span>
          </div>
          <button
            onClick={() => setActiveModal(null)}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3">
          <p className="text-slate-500 dark:text-zinc-400 text-xs">
            Paste raw vector SVG code below. The SVG will be parsed and inserted as a resolution-independent vector object.
          </p>

          <textarea
            rows={10}
            value={svgCode}
            onChange={e => {
              setSvgCode(e.target.value);
              setError(null);
            }}
            className="w-full bg-slate-50 dark:bg-zinc-800/80 p-3 rounded-lg border border-slate-200 dark:border-zinc-700 font-mono text-[11px] text-slate-800 dark:text-zinc-200 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
            placeholder="<svg viewBox='0 0 100 100'>...</svg>"
          />

          {error && (
            <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 flex items-start gap-2 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
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
            onClick={handleInsert}
            className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm transition-colors cursor-pointer"
          >
            Insert Vector Object
          </button>
        </div>
      </div>
    </div>
  );
};
