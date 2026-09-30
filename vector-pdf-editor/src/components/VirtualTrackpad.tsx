import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Move,
  Maximize2,
  RotateCw,
  Type,
  Eye,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
  Minus,
  Sparkles,
  Sliders,
  Crosshair
} from 'lucide-react';
import { useDocument } from '../context/DocumentContext';
import { TrackpadTarget, VectorObject, TextObject } from '../types/document';
import { convertFromMm, convertToMm, formatNumberOnly } from '../utils/units';

interface VirtualTrackpadProps {
  target?: TrackpadTarget;
  setTarget?: (target: TrackpadTarget) => void;
  isOpen?: boolean;
  setIsOpen?: (open: boolean) => void;
}

export const VirtualTrackpad: React.FC<VirtualTrackpadProps> = ({
  target: propTarget,
  setTarget: propSetTarget,
  isOpen: propIsOpen,
  setIsOpen: propSetIsOpen,
}) => {
  const {
    project,
    selectedIds,
    updateObject,
    recordHistorySnapshot,
    trackpadTarget,
    setTrackpadTarget,
    isTrackpadOpen,
    setIsTrackpadOpen,
  } = useDocument();

  const target = propTarget ?? trackpadTarget;
  const setTarget = propSetTarget ?? setTrackpadTarget;
  const isOpen = propIsOpen ?? isTrackpadOpen;
  const setIsOpen = propSetIsOpen ?? setIsTrackpadOpen;

  const [multiplier, setMultiplier] = useState<number>(1); // 0.1, 1, 5, 10
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isMinimized, setIsMinimized] = useState(false);

  const padRef = useRef<HTMLDivElement | null>(null);
  const lastTouchRef = useRef<{ x: number; y: number } | null>(null);
  const repeatTimerRef = useRef<number | null>(null);

  const selectedObject = project.objects.find(o => selectedIds.includes(o.id));
  const unit = project.unit;

  // Cleanup repeat timer on unmount
  useEffect(() => {
    return () => {
      if (repeatTimerRef.current) clearInterval(repeatTimerRef.current);
    };
  }, []);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        title="Open Alight Motion Precision Controller"
        className="fixed bottom-9 right-4 z-40 bg-blue-600 hover:bg-blue-700 text-white p-2.5 rounded-full shadow-xl transition-all duration-200 flex items-center gap-1.5 text-xs font-medium cursor-pointer border border-blue-400/40"
      >
        <Sliders className="w-4 h-4" />
        <span className="hidden sm:inline">Trackpad</span>
      </button>
    );
  }

  if (!selectedObject) {
    return (
      <div className="fixed bottom-9 right-4 z-40 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-2xl p-3 text-xs flex items-center justify-between gap-3 w-64">
        <span className="text-slate-500 dark:text-zinc-400">Select an object to control</span>
        <button
          onClick={() => setIsOpen(false)}
          className="text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  // Value change dispatchers
  const adjustValue = (deltaX: number, deltaY: number) => {
    if (!selectedObject) return;

    if (target === 'xy' || target === 'x' || target === 'y') {
      let newX = selectedObject.x;
      let newY = selectedObject.y;

      if (target === 'xy' || target === 'x') {
        const deltaMm = convertToMm(deltaX * multiplier, unit);
        newX = Number((newX + deltaMm).toFixed(2));
      }
      if (target === 'xy' || target === 'y') {
        const deltaMm = convertToMm(deltaY * multiplier, unit);
        newY = Number((newY + deltaMm).toFixed(2));
      }

      updateObject(selectedObject.id, { x: newX, y: newY }, false);
    } else if (target === 'wh' || target === 'width' || target === 'height') {
      let newW = selectedObject.width;
      let newH = selectedObject.height;

      if (target === 'wh' || target === 'width') {
        const deltaMm = convertToMm(deltaX * multiplier, unit);
        newW = Math.max(1, Number((newW + deltaMm).toFixed(2)));
      }
      if (target === 'wh' || target === 'height') {
        const deltaMm = convertToMm(deltaY * multiplier, unit);
        newH = Math.max(1, Number((newH + deltaMm).toFixed(2)));
      }

      updateObject(selectedObject.id, { width: newW, height: newH }, false);
    } else if (target === 'rotation') {
      const deltaAngle = deltaX * multiplier * 2;
      const newRot = Math.round((selectedObject.rotation + deltaAngle) % 360 + 360) % 360;
      updateObject(selectedObject.id, { rotation: newRot }, false);
    } else if (target === 'fontSize' && selectedObject.type === 'text') {
      const textObj = selectedObject as TextObject;
      const newSize = Math.max(4, Math.round(textObj.fontSize + deltaY * multiplier));
      updateObject(selectedObject.id, { fontSize: newSize }, false);
    } else if (target === 'opacity') {
      const deltaOp = (deltaY * multiplier) / 100;
      const newOp = Math.min(1, Math.max(0, Number(((selectedObject.opacity ?? 1) + deltaOp).toFixed(2))));
      updateObject(selectedObject.id, { opacity: newOp }, false);
    }
  };

  // Nudge button actions
  const handleNudge = (dx: number, dy: number) => {
    recordHistorySnapshot();
    adjustValue(dx, dy);
  };

  const startRepeatingNudge = (dx: number, dy: number) => {
    handleNudge(dx, dy);
    repeatTimerRef.current = window.setInterval(() => {
      adjustValue(dx, dy);
    }, 120);
  };

  const stopRepeatingNudge = () => {
    if (repeatTimerRef.current) {
      clearInterval(repeatTimerRef.current);
      repeatTimerRef.current = null;
      recordHistorySnapshot();
    }
  };

  // Touch and Mouse Tracking on Pad
  const handlePadStart = (clientX: number, clientY: number) => {
    setIsDragging(true);
    lastTouchRef.current = { x: clientX, y: clientY };
    setDragOffset({ x: 0, y: 0 });
  };

  const handlePadMove = (clientX: number, clientY: number) => {
    if (!isDragging || !lastTouchRef.current) return;
    const dx = clientX - lastTouchRef.current.x;
    const dy = clientY - lastTouchRef.current.y;
    lastTouchRef.current = { x: clientX, y: clientY };

    // Scale sensitivity
    const sensitivity = 0.25;
    adjustValue(dx * sensitivity, dy * sensitivity);

    setDragOffset(prev => ({
      x: Math.max(-30, Math.min(30, prev.x + dx * 0.4)),
      y: Math.max(-30, Math.min(30, prev.y + dy * 0.4)),
    }));
  };

  const handlePadEnd = () => {
    if (isDragging) {
      setIsDragging(false);
      lastTouchRef.current = null;
      setDragOffset({ x: 0, y: 0 });
      recordHistorySnapshot();
    }
  };

  return (
    <div
      className={`fixed bottom-8 right-3 z-40 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-slate-200 dark:border-zinc-700/80 rounded-2xl shadow-2xl select-none transition-all duration-200 ${
        isMinimized ? 'w-56 p-2' : 'w-64 p-3'
      }`}
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-zinc-800 text-xs">
        <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-zinc-200">
          <Crosshair className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
          <span>Touch Controller</span>
        </div>

        <div className="flex items-center gap-1 text-slate-400">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 hover:text-slate-700 dark:hover:text-zinc-200 rounded"
            title={isMinimized ? 'Expand' : 'Minimize'}
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 hover:text-slate-700 dark:hover:text-zinc-200 rounded"
            title="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <div className="space-y-2.5 pt-2">
          {/* Target Parameter Switcher */}
          <div className="grid grid-cols-4 gap-1 text-[10px] font-medium">
            <button
              onClick={() => setTarget('xy')}
              className={`py-1 rounded flex items-center justify-center gap-1 transition-colors ${
                target === 'xy' || target === 'x' || target === 'y'
                  ? 'bg-blue-500 text-white font-bold'
                  : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-200'
              }`}
            >
              <Move className="w-3 h-3" />
              <span>Pos</span>
            </button>

            <button
              onClick={() => setTarget('wh')}
              className={`py-1 rounded flex items-center justify-center gap-1 transition-colors ${
                target === 'wh' || target === 'width' || target === 'height'
                  ? 'bg-blue-500 text-white font-bold'
                  : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-200'
              }`}
            >
              <Maximize2 className="w-3 h-3" />
              <span>Size</span>
            </button>

            <button
              onClick={() => setTarget('rotation')}
              className={`py-1 rounded flex items-center justify-center gap-1 transition-colors ${
                target === 'rotation'
                  ? 'bg-blue-500 text-white font-bold'
                  : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-200'
              }`}
            >
              <RotateCw className="w-3 h-3" />
              <span>Rot</span>
            </button>

            {selectedObject.type === 'text' ? (
              <button
                onClick={() => setTarget('fontSize')}
                className={`py-1 rounded flex items-center justify-center gap-1 transition-colors ${
                  target === 'fontSize'
                    ? 'bg-blue-500 text-white font-bold'
                    : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-200'
                }`}
              >
                <Type className="w-3 h-3" />
                <span>Font</span>
              </button>
            ) : (
              <button
                onClick={() => setTarget('opacity')}
                className={`py-1 rounded flex items-center justify-center gap-1 transition-colors ${
                  target === 'opacity'
                    ? 'bg-blue-500 text-white font-bold'
                    : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-200'
                }`}
              >
                <Eye className="w-3 h-3" />
                <span>Opac</span>
              </button>
            )}
          </div>

          {/* Current Target Live Value Display */}
          <div className="bg-slate-50 dark:bg-zinc-800/80 px-2 py-1 rounded text-center font-mono text-[11px] text-slate-700 dark:text-zinc-200 font-semibold border border-slate-200/60 dark:border-zinc-700/60">
            {target === 'xy' && (
              <span>
                X: {formatNumberOnly(selectedObject.x, unit)} • Y: {formatNumberOnly(selectedObject.y, unit)} {unit}
              </span>
            )}
            {target === 'wh' && (
              <span>
                W: {formatNumberOnly(selectedObject.width, unit)} • H: {formatNumberOnly(selectedObject.height, unit)} {unit}
              </span>
            )}
            {target === 'rotation' && <span>Angle: {Math.round(selectedObject.rotation || 0)}°</span>}
            {target === 'fontSize' && selectedObject.type === 'text' && (
              <span>Size: {(selectedObject as TextObject).fontSize} pt</span>
            )}
            {target === 'opacity' && (
              <span>Opacity: {Math.round((selectedObject.opacity ?? 1) * 100)}%</span>
            )}
          </div>

          {/* Precision Jog Trackpad Surface with D-Pad Arrow Buttons */}
          <div className="relative w-full h-32 bg-slate-100 dark:bg-zinc-800/90 rounded-xl border border-slate-200 dark:border-zinc-700/80 flex items-center justify-center overflow-hidden touch-none">
            {/* Top Nudge Button (Tap or Hold) */}
            <button
              onMouseDown={() => startRepeatingNudge(0, -1)}
              onMouseUp={stopRepeatingNudge}
              onTouchStart={() => startRepeatingNudge(0, -1)}
              onTouchEnd={stopRepeatingNudge}
              title="Step Up"
              className="absolute top-1 left-1/2 -translate-x-1/2 w-8 h-6 bg-white dark:bg-zinc-700 border border-slate-200 dark:border-zinc-600 rounded-md flex items-center justify-center text-slate-600 dark:text-zinc-200 hover:bg-blue-50 active:bg-blue-500 active:text-white shadow-xs z-10"
            >
              <ChevronUp className="w-4 h-4" />
            </button>

            {/* Bottom Nudge Button */}
            <button
              onMouseDown={() => startRepeatingNudge(0, 1)}
              onMouseUp={stopRepeatingNudge}
              onTouchStart={() => startRepeatingNudge(0, 1)}
              onTouchEnd={stopRepeatingNudge}
              title="Step Down"
              className="absolute bottom-1 left-1/2 -translate-x-1/2 w-8 h-6 bg-white dark:bg-zinc-700 border border-slate-200 dark:border-zinc-600 rounded-md flex items-center justify-center text-slate-600 dark:text-zinc-200 hover:bg-blue-50 active:bg-blue-500 active:text-white shadow-xs z-10"
            >
              <ChevronDown className="w-4 h-4" />
            </button>

            {/* Left Nudge Button */}
            <button
              onMouseDown={() => startRepeatingNudge(-1, 0)}
              onMouseUp={stopRepeatingNudge}
              onTouchStart={() => startRepeatingNudge(-1, 0)}
              onTouchEnd={stopRepeatingNudge}
              title="Step Left"
              className="absolute left-1 top-1/2 -translate-y-1/2 w-6 h-8 bg-white dark:bg-zinc-700 border border-slate-200 dark:border-zinc-600 rounded-md flex items-center justify-center text-slate-600 dark:text-zinc-200 hover:bg-blue-50 active:bg-blue-500 active:text-white shadow-xs z-10"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Right Nudge Button */}
            <button
              onMouseDown={() => startRepeatingNudge(1, 0)}
              onMouseUp={stopRepeatingNudge}
              onTouchStart={() => startRepeatingNudge(1, 0)}
              onTouchEnd={stopRepeatingNudge}
              title="Step Right"
              className="absolute right-1 top-1/2 -translate-y-1/2 w-6 h-8 bg-white dark:bg-zinc-700 border border-slate-200 dark:border-zinc-600 rounded-md flex items-center justify-center text-slate-600 dark:text-zinc-200 hover:bg-blue-50 active:bg-blue-500 active:text-white shadow-xs z-10"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Central Touchpad Area */}
            <div
              ref={padRef}
              onMouseDown={e => handlePadStart(e.clientX, e.clientY)}
              onMouseMove={e => handlePadMove(e.clientX, e.clientY)}
              onMouseUp={handlePadEnd}
              onTouchStart={e => {
                const t = e.touches[0];
                handlePadStart(t.clientX, t.clientY);
              }}
              onTouchMove={e => {
                const t = e.touches[0];
                handlePadMove(t.clientX, t.clientY);
              }}
              onTouchEnd={handlePadEnd}
              className="w-24 h-16 rounded-lg border border-dashed border-slate-300 dark:border-zinc-600 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing hover:bg-blue-50/50 dark:hover:bg-zinc-700/50 transition-colors relative"
            >
              {/* Virtual Thumb Puck */}
              <div
                style={{
                  transform: `translate(${dragOffset.x}px, ${dragOffset.y}px)`,
                }}
                className="w-6 h-6 rounded-full bg-blue-500 text-white shadow-md flex items-center justify-center pointer-events-none transition-transform duration-75"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-white" />
              </div>
              <span className="text-[9px] text-slate-400 mt-1 pointer-events-none">Hold & Drag</span>
            </div>
          </div>

          {/* Multiplier / Step Sensitivity Controls */}
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-slate-400 font-medium">Step Multiplier:</span>
            <div className="flex gap-1">
              {[0.1, 1, 5, 10].map(m => (
                <button
                  key={m}
                  onClick={() => setMultiplier(m)}
                  className={`px-1.5 py-0.5 rounded font-mono font-semibold transition-colors ${
                    multiplier === m
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-200'
                  }`}
                >
                  {m}×
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
