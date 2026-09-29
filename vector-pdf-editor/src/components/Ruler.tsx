import React, { useRef, useEffect } from 'react';
import { useDocument } from '../context/DocumentContext';
import { MM_TO_PX, convertFromMm } from '../utils/units';

interface RulerProps {
  orientation: 'horizontal' | 'vertical';
  cursorMm: number | null;
}

export const Ruler: React.FC<RulerProps> = ({ orientation, cursorMm }) => {
  const { project, zoom, pan, setUnit } = useDocument();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const unit = project.unit;
  const isHorizontal = orientation === 'horizontal';

  // Calculate step interval in mm for ticks based on current zoom
  const getTickIntervalMm = (currentZoom: number): { major: number; minor: number } => {
    // We want major ticks every ~40-80 screen pixels
    const pxPerMm = MM_TO_PX * currentZoom;
    if (unit === 'inch') {
      const pxPerInch = pxPerMm * 25.4;
      if (pxPerInch > 200) return { major: 25.4 / 4, minor: 25.4 / 16 };
      if (pxPerInch > 80) return { major: 25.4 / 2, minor: 25.4 / 8 };
      if (pxPerInch > 30) return { major: 25.4, minor: 25.4 / 4 };
      return { major: 25.4 * 2, minor: 25.4 / 2 };
    }
    if (unit === 'cm') {
      const pxPerCm = pxPerMm * 10;
      if (pxPerCm > 150) return { major: 5, minor: 1 };
      if (pxPerCm > 60) return { major: 10, minor: 2 };
      if (pxPerCm > 25) return { major: 20, minor: 5 };
      return { major: 50, minor: 10 };
    }
    // mm
    if (pxPerMm > 15) return { major: 5, minor: 1 };
    if (pxPerMm > 6) return { major: 10, minor: 2 };
    if (pxPerMm > 2) return { major: 20, minor: 5 };
    if (pxPerMm > 0.8) return { major: 50, minor: 10 };
    return { major: 100, minor: 20 };
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.parentElement?.clientWidth || 300;
    const height = canvas.parentElement?.clientHeight || 24;

    // Retina support
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const isDark = document.documentElement.classList.contains('dark');
    const bgColor = isDark ? '#1e1e24' : '#f8fafc';
    const textColor = isDark ? '#94a3b8' : '#64748b';
    const majorLineColor = isDark ? '#475569' : '#94a3b8';
    const minorLineColor = isDark ? '#334155' : '#cbd5e1';
    const pageMarkColor = isDark ? '#38bdf8' : '#2563eb';

    // Clear
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);

    const offsetScreenPx = isHorizontal ? pan.x : pan.y;
    const { major, minor } = getTickIntervalMm(zoom);

    const pageDimMm = isHorizontal ? project.page.width : project.page.height;
    const pageStartScreenPx = offsetScreenPx;
    const pageEndScreenPx = offsetScreenPx + pageDimMm * MM_TO_PX * zoom;

    // Highlight page range on ruler
    ctx.fillStyle = isDark ? 'rgba(56, 189, 248, 0.08)' : 'rgba(37, 99, 235, 0.05)';
    if (isHorizontal) {
      ctx.fillRect(pageStartScreenPx, 0, pageEndScreenPx - pageStartScreenPx, height);
    } else {
      ctx.fillRect(0, pageStartScreenPx, width, pageEndScreenPx - pageStartScreenPx);
    }

    // Determine start and end mm visible in viewport
    const visibleLengthPx = isHorizontal ? width : height;
    const startMm = -offsetScreenPx / (MM_TO_PX * zoom);
    const endMm = (visibleLengthPx - offsetScreenPx) / (MM_TO_PX * zoom);

    const firstTickMm = Math.floor(startMm / minor) * minor;
    const lastTickMm = Math.ceil(endMm / minor) * minor;

    ctx.font = '9px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    for (let mm = firstTickMm; mm <= lastTickMm; mm += minor) {
      const screenPos = offsetScreenPx + mm * MM_TO_PX * zoom;
      const isMajor = Math.abs(mm % major) < 0.001 || Math.abs((mm % major) - major) < 0.001;

      ctx.strokeStyle = isMajor ? majorLineColor : minorLineColor;
      ctx.lineWidth = isMajor ? 1 : 0.75;
      ctx.beginPath();

      if (isHorizontal) {
        const tickHeight = isMajor ? 10 : 5;
        ctx.moveTo(screenPos, height - tickHeight);
        ctx.lineTo(screenPos, height);
        ctx.stroke();

        if (isMajor) {
          ctx.fillStyle = textColor;
          const labelVal = convertFromMm(mm, unit);
          const labelText = Math.abs(labelVal) < 0.001 ? '0' : Number(labelVal.toFixed(1)).toString();
          ctx.fillText(labelText, screenPos + 2, 7);
        }
      } else {
        const tickWidth = isMajor ? 10 : 5;
        ctx.moveTo(width - tickWidth, screenPos);
        ctx.lineTo(width, screenPos);
        ctx.stroke();

        if (isMajor) {
          ctx.fillStyle = textColor;
          const labelVal = convertFromMm(mm, unit);
          const labelText = Math.abs(labelVal) < 0.001 ? '0' : Number(labelVal.toFixed(1)).toString();
          ctx.save();
          ctx.translate(2, screenPos + 8);
          ctx.rotate(-Math.PI / 2);
          ctx.fillText(labelText, 0, 0);
          ctx.restore();
        }
      }
    }

    // Draw page boundary indicators
    ctx.strokeStyle = pageMarkColor;
    ctx.lineWidth = 1.5;
    if (isHorizontal) {
      ctx.beginPath();
      ctx.moveTo(pageStartScreenPx, 0);
      ctx.lineTo(pageStartScreenPx, height);
      ctx.moveTo(pageEndScreenPx, 0);
      ctx.lineTo(pageEndScreenPx, height);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(0, pageStartScreenPx);
      ctx.lineTo(width, pageStartScreenPx);
      ctx.moveTo(0, pageEndScreenPx);
      ctx.lineTo(width, pageEndScreenPx);
      ctx.stroke();
    }

    // Draw cursor indicator if hovering
    if (cursorMm !== null) {
      const cursorScreenPos = offsetScreenPx + cursorMm * MM_TO_PX * zoom;
      ctx.strokeStyle = '#ef4444'; // Red indicator
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      if (isHorizontal) {
        ctx.moveTo(cursorScreenPos, 0);
        ctx.lineTo(cursorScreenPos, height);
      } else {
        ctx.moveTo(0, cursorScreenPos);
        ctx.lineTo(width, cursorScreenPos);
      }
      ctx.stroke();
    }
  }, [isHorizontal, pan.x, pan.y, zoom, unit, project.page.width, project.page.height, cursorMm]);

  return (
    <div className={`relative select-none ${isHorizontal ? 'h-6 w-full' : 'h-full w-6'}`}>
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
};

export const RulerCorner: React.FC = () => {
  const { project, setUnit } = useDocument();

  const cycleUnit = () => {
    if (project.unit === 'mm') setUnit('cm');
    else if (project.unit === 'cm') setUnit('inch');
    else setUnit('mm');
  };

  return (
    <button
      onClick={cycleUnit}
      title="Click to cycle physical unit (mm, cm, inch)"
      className="w-6 h-6 flex items-center justify-center text-[10px] font-mono font-bold bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 border-r border-b border-slate-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-300 dark:border-zinc-700 transition-colors z-20 cursor-pointer"
    >
      {project.unit}
    </button>
  );
};
