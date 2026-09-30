import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Check,
  X,
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Folder,
  Link2,
  Unlink,
  Crown,
  Copy,
  Trash2,
  Edit3,
} from 'lucide-react';
import { useDocument } from '../context/DocumentContext';
import { VectorObject, SnapGuide } from '../types/document';
import { MM_TO_PX, PX_TO_MM } from '../utils/units';
import { computeSnapping } from '../utils/snapping';
import { buildSvgDefs, renderObjectToSvg } from '../utils/svgRenderer';
import { Ruler, RulerCorner } from './Ruler';

interface CanvasProps {
  cursorMm: { x: number; y: number } | null;
  setCursorMm: (pos: { x: number; y: number } | null) => void;
}

export const Canvas: React.FC<CanvasProps> = ({ cursorMm, setCursorMm }) => {
  const {
    project,
    selectedIds,
    setSelectedIds,
    activeTool,
    setActiveTool,
    zoom,
    setZoom,
    pan,
    setPan,
    updateObject,
    updateMultipleObjects,
    addObject,
    recordHistorySnapshot,
    importedRecords,
    activeRecordIndex,
    theme,
    groupSelected,
    ungroupSelected,
    linkSelectedAsDuplicates,
    unlinkSelectedDuplicates,
    masterCardId,
    setMasterCardId,
    linkToMaster,
    deleteSelected,
    duplicateSelected,
  } = useDocument();

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [activeGuides, setActiveGuides] = useState<SnapGuide[]>([]);
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  // Multi-touch tracking for pinch-to-zoom & 2-finger pan on touch tablets
  const touchStateRef = useRef<{
    initialDistance: number;
    initialZoom: number;
    initialPan: { x: number; y: number };
    initialMidpoint: { x: number; y: number };
  } | null>(null);

  const lastTouchPosRef = useRef<{ x: number; y: number } | null>(null);
  const lastTapRef = useRef<{ time: number; objId: string } | null>(null);

  // Interaction State
  const [dragState, setDragState] = useState<{
    mode: 'move' | 'resize' | 'create' | 'pan' | 'pen';
    handle?: string; // 'nw'|'n'|'ne'|'e'|'se'|'s'|'sw'|'w'|'rotate'
    startX: number; // in document mm
    startY: number;
    initialObjects: VectorObject[];
    penPoints?: { x: number; y: number }[];
  } | null>(null);

  // Custom Inline Text Editor State (replaces browser prompt alert)
  const [editingText, setEditingText] = useState<{ id: string; text: string } | null>(null);
  const textEditorRef = useRef<HTMLTextAreaElement | null>(null);

  // Marquee Drag Selection State
  const [marquee, setMarquee] = useState<{
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    additive: boolean;
  } | null>(null);

  // Canvas Right-Click Context Menu State
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);

  // Dismiss context menu on window click
  useEffect(() => {
    const handleGlobalClick = () => setContextMenu(null);
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  const finishEditingText = (save: boolean) => {
    if (!editingText) return;
    if (save) {
      const cur = project.objects.find(o => o.id === editingText.id);
      if (cur && cur.type === 'text' && cur.text !== editingText.text) {
        recordHistorySnapshot();
        updateObject(editingText.id, { text: editingText.text }, false);
      }
    }
    setEditingText(null);
  };

  // Active replacement dictionary from imported JSON
  const activeReplacements =
    importedRecords && importedRecords[activeRecordIndex]
      ? importedRecords[activeRecordIndex]
      : undefined;

  // Space key detection for pan
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        setIsSpacePressed(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Prevent tablet pull-to-refresh and native gesture conflicts
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const preventScroll = (e: TouchEvent) => {
      if (e.cancelable) {
        e.preventDefault();
      }
    };

    container.addEventListener('touchmove', preventScroll, { passive: false });
    return () => {
      container.removeEventListener('touchmove', preventScroll);
    };
  }, []);

  // Convert screen client coordinates to document mm
  const screenToDocMm = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } => {
      if (!containerRef.current) return { x: 0, y: 0 };
      const rect = containerRef.current.getBoundingClientRect();
      const screenX = clientX - rect.left;
      const screenY = clientY - rect.top;

      const docMmX = (screenX - pan.x) / (MM_TO_PX * zoom);
      const docMmY = (screenY - pan.y) / (MM_TO_PX * zoom);

      return { x: docMmX, y: docMmY };
    },
    [pan.x, pan.y, zoom]
  );

  // Canvas Mouse Move (Tracking & Dragging)
  const handleMouseMove = (e: React.MouseEvent) => {
    const currentMm = screenToDocMm(e.clientX, e.clientY);
    setCursorMm(currentMm);

    if (marquee) {
      setMarquee(prev => (prev ? { ...prev, currentX: currentMm.x, currentY: currentMm.y } : null));
    }

    if (!dragState) return;

    if (dragState.mode === 'pan') {
      const dx = e.movementX;
      const dy = e.movementY;
      setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      return;
    }

    if (dragState.mode === 'pen') {
      const pts = dragState.penPoints || [];
      const newPts = [...pts, { x: currentMm.x, y: currentMm.y }];
      setDragState({ ...dragState, penPoints: newPts });
      return;
    }

    if (dragState.mode === 'create') {
      const minX = Math.min(dragState.startX, currentMm.x);
      const minY = Math.min(dragState.startY, currentMm.y);
      const w = Math.abs(currentMm.x - dragState.startX);
      const h = Math.abs(currentMm.y - dragState.startY);

      // We will create the object upon mouse up, but can preview guidelines
      setActiveGuides([]);
      return;
    }

    if (dragState.mode === 'move') {
      const deltaX = currentMm.x - dragState.startX;
      const deltaY = currentMm.y - dragState.startY;

      // Primary selected object for snapping
      const primaryInit = dragState.initialObjects.find(o => selectedIds[0] === o.id);
      if (!primaryInit) return;

      const candidateBounds = {
        x: primaryInit.x + deltaX,
        y: primaryInit.y + deltaY,
        width: primaryInit.width,
        height: primaryInit.height,
      };

      const snapResult = computeSnapping(
        candidateBounds,
        selectedIds,
        project.objects,
        project.page,
        project.grid,
        project.snap
      );

      const actualDeltaX = snapResult.snappedX - primaryInit.x;
      const actualDeltaY = snapResult.snappedY - primaryInit.y;

      setActiveGuides(snapResult.guides);

      // Move all selected objects by the same snapped delta
      const updates = dragState.initialObjects.map(initObj => ({
        id: initObj.id,
        changes: {
          x: Number((initObj.x + actualDeltaX).toFixed(2)),
          y: Number((initObj.y + actualDeltaY).toFixed(2)),
        },
      }));

      updateMultipleObjects(updates, false);
      return;
    }

    if (dragState.mode === 'resize' && dragState.handle) {
      const handle = dragState.handle;
      const primaryInit = dragState.initialObjects[0];
      if (!primaryInit) return;

      let newX = primaryInit.x;
      let newY = primaryInit.y;
      let newW = primaryInit.width;
      let newH = primaryInit.height;

      const mouseX = currentMm.x;
      const mouseY = currentMm.y;

      if (handle.includes('e')) {
        newW = Math.max(1, mouseX - primaryInit.x);
      }
      if (handle.includes('w')) {
        const right = primaryInit.x + primaryInit.width;
        newX = Math.min(mouseX, right - 1);
        newW = right - newX;
      }
      if (handle.includes('s')) {
        newH = Math.max(1, mouseY - primaryInit.y);
      }
      if (handle.includes('n')) {
        const bottom = primaryInit.y + primaryInit.height;
        newY = Math.min(mouseY, bottom - 1);
        newH = bottom - newY;
      }

      // Snapping
      const snapResult = computeSnapping(
        { x: newX, y: newY, width: newW, height: newH },
        [primaryInit.id],
        project.objects,
        project.page,
        project.grid,
        project.snap
      );

      setActiveGuides(snapResult.guides);

      updateObject(primaryInit.id, {
        x: Number(newX.toFixed(2)),
        y: Number(newY.toFixed(2)),
        width: Number(newW.toFixed(2)),
        height: Number(newH.toFixed(2)),
      }, false);
    }
  };

  // Canvas Mouse Down
  const handleMouseDown = (e: React.MouseEvent) => {
    // Middle click or Space key = start pan
    if (e.button === 1 || isSpacePressed || activeTool === 'pan') {
      setDragState({
        mode: 'pan',
        startX: 0,
        startY: 0,
        initialObjects: [],
      });
      return;
    }

    if (e.button !== 0) return; // Only left click

    const clickMm = screenToDocMm(e.clientX, e.clientY);

    // If active tool is a creation tool, start creation!
    if (activeTool !== 'select') {
      if (activeTool === 'pen') {
        setDragState({
          mode: 'pen',
          startX: clickMm.x,
          startY: clickMm.y,
          initialObjects: [],
          penPoints: [{ x: clickMm.x, y: clickMm.y }],
        });
        return;
      }

      if (activeTool === 'text') {
        // Direct click to create text
        recordHistorySnapshot();
        addObject({
          name: 'Text',
          type: 'text',
          x: Number(clickMm.x.toFixed(2)),
          y: Number(clickMm.y.toFixed(2)),
          width: 60,
          height: 12,
          rotation: 0,
          opacity: 1,
          locked: false,
          visible: true,
          text: 'Double click to edit',
          fontFamily: 'Inter',
          fontSize: 12,
          fontWeight: 'normal',
          fontStyle: 'normal',
          textAlign: 'left',
          lineHeight: 1.2,
          letterSpacing: 0,
          fill: { type: 'solid', color: '#1e293b', opacity: 1 },
          stroke: { type: 'none', color: '#000', width: 0, opacity: 1 },
        });
        setActiveTool('select');
        return;
      }

      // Rect, Ellipse, Line drag create
      setDragState({
        mode: 'create',
        startX: clickMm.x,
        startY: clickMm.y,
        initialObjects: [],
      });
      return;
    }

    // In Select Mode: clicked empty canvas -> start marquee drag selection
    if (!e.shiftKey) {
      setSelectedIds([]);
    }
    setActiveGuides([]);
    setContextMenu(null);
    setMarquee({
      startX: clickMm.x,
      startY: clickMm.y,
      currentX: clickMm.x,
      currentY: clickMm.y,
      additive: e.shiftKey,
    });
  };

  // Finalize drag / creation helper
  const finalizeDrag = (currentMm: { x: number; y: number }) => {
    if (!dragState) return;

    if (dragState.mode === 'create') {
      const minX = Math.min(dragState.startX, currentMm.x);
      const minY = Math.min(dragState.startY, currentMm.y);
      const w = Math.max(2, Math.abs(currentMm.x - dragState.startX));
      const h = Math.max(2, Math.abs(currentMm.y - dragState.startY));

      recordHistorySnapshot();

      if (activeTool === 'rect') {
        addObject({
          name: 'Rectangle',
          type: 'rect',
          x: Number(minX.toFixed(2)),
          y: Number(minY.toFixed(2)),
          width: Number(w.toFixed(2)),
          height: Number(h.toFixed(2)),
          rotation: 0,
          opacity: 1,
          locked: false,
          visible: true,
          rx: 0,
          ry: 0,
          fill: { type: 'solid', color: '#e2e8f0', opacity: 1 },
          stroke: { type: 'solid', color: '#334155', width: 0.5, opacity: 1 },
        });
      } else if (activeTool === 'ellipse') {
        addObject({
          name: 'Ellipse',
          type: 'ellipse',
          x: Number(minX.toFixed(2)),
          y: Number(minY.toFixed(2)),
          width: Number(w.toFixed(2)),
          height: Number(h.toFixed(2)),
          rotation: 0,
          opacity: 1,
          locked: false,
          visible: true,
          fill: { type: 'solid', color: '#fed7aa', opacity: 1 },
          stroke: { type: 'solid', color: '#ea580c', width: 0.5, opacity: 1 },
        });
      } else if (activeTool === 'line') {
        addObject({
          name: 'Line',
          type: 'line',
          x: Number(minX.toFixed(2)),
          y: Number(minY.toFixed(2)),
          width: Number(w.toFixed(2)),
          height: Number(h.toFixed(2)),
          rotation: 0,
          opacity: 1,
          locked: false,
          visible: true,
          x2: Number(w.toFixed(2)),
          y2: Number(h.toFixed(2)),
          stroke: { type: 'solid', color: '#0f172a', width: 0.8, opacity: 1 },
        });
      }

      setActiveTool('select');
    } else if (dragState.mode === 'pen' && dragState.penPoints && dragState.penPoints.length > 1) {
      // Build SVG Path Data
      const pts = dragState.penPoints;
      const minX = Math.min(...pts.map(p => p.x));
      const minY = Math.min(...pts.map(p => p.y));
      const maxX = Math.max(...pts.map(p => p.x));
      const maxY = Math.max(...pts.map(p => p.y));
      const w = Math.max(1, maxX - minX);
      const h = Math.max(1, maxY - minY);

      // Relative path coordinates
      let d = `M ${pts[0].x - minX} ${pts[0].y - minY}`;
      for (let i = 1; i < pts.length; i++) {
        d += ` L ${pts[i].x - minX} ${pts[i].y - minY}`;
      }

      recordHistorySnapshot();
      addObject({
        name: 'Freehand Path',
        type: 'path',
        x: Number(minX.toFixed(2)),
        y: Number(minY.toFixed(2)),
        width: Number(w.toFixed(2)),
        height: Number(h.toFixed(2)),
        rotation: 0,
        opacity: 1,
        locked: false,
        visible: true,
        d,
        fill: { type: 'none' },
        stroke: { type: 'solid', color: '#2563eb', width: 0.8, opacity: 1 },
      });
      setActiveTool('select');
    } else if (dragState.mode === 'move' || dragState.mode === 'resize') {
      recordHistorySnapshot();
    }

    setDragState(null);
    setActiveGuides([]);
  };

  // Canvas Mouse Up
  const handleMouseUp = (e: React.MouseEvent) => {
    if (marquee) {
      const minX = Math.min(marquee.startX, marquee.currentX);
      const maxX = Math.max(marquee.startX, marquee.currentX);
      const minY = Math.min(marquee.startY, marquee.currentY);
      const maxY = Math.max(marquee.startY, marquee.currentY);
      const w = maxX - minX;
      const h = maxY - minY;

      if (w > 1 || h > 1) {
        const hitIds: string[] = [];
        project.objects.forEach(obj => {
          if (!obj.visible || obj.locked) return;
          const r = obj.x + obj.width;
          const b = obj.y + obj.height;
          const overlaps = !(obj.x > maxX || r < minX || obj.y > maxY || b < minY);
          if (overlaps) {
            if (obj.groupId) {
              const members = project.objects.filter(o => o.groupId === obj.groupId).map(o => o.id);
              members.forEach(m => {
                if (!hitIds.includes(m)) hitIds.push(m);
              });
            } else {
              if (!hitIds.includes(obj.id)) hitIds.push(obj.id);
            }
          }
        });

        if (marquee.additive) {
          setSelectedIds(Array.from(new Set([...selectedIds, ...hitIds])));
        } else {
          setSelectedIds(hitIds);
        }
      }
      setMarquee(null);
    }

    const currentMm = screenToDocMm(e.clientX, e.clientY);
    finalizeDrag(currentMm);
  };

  // Touch Handlers for Tablets
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // 2-Finger gesture: pinch-zoom & pan
      const t0 = e.touches[0];
      const t1 = e.touches[1];
      const dist = Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY);
      const mid = {
        x: (t0.clientX + t1.clientX) / 2,
        y: (t0.clientY + t1.clientY) / 2,
      };
      touchStateRef.current = {
        initialDistance: dist,
        initialZoom: zoom,
        initialPan: { ...pan },
        initialMidpoint: mid,
      };
      setDragState(null);
      return;
    }

    if (e.touches.length === 1) {
      touchStateRef.current = null;
      const t = e.touches[0];
      lastTouchPosRef.current = { x: t.clientX, y: t.clientY };
      const clickMm = screenToDocMm(t.clientX, t.clientY);
      setCursorMm(clickMm);

      if (activeTool === 'pan') {
        setDragState({
          mode: 'pan',
          startX: 0,
          startY: 0,
          initialObjects: [],
        });
        return;
      }

      if (activeTool !== 'select') {
        if (activeTool === 'pen') {
          setDragState({
            mode: 'pen',
            startX: clickMm.x,
            startY: clickMm.y,
            initialObjects: [],
            penPoints: [{ x: clickMm.x, y: clickMm.y }],
          });
          return;
        }

        if (activeTool === 'text') {
          recordHistorySnapshot();
          addObject({
            name: 'Text',
            type: 'text',
            x: Number(clickMm.x.toFixed(2)),
            y: Number(clickMm.y.toFixed(2)),
            width: 60,
            height: 12,
            rotation: 0,
            opacity: 1,
            locked: false,
            visible: true,
            text: 'Double tap to edit',
            fontFamily: 'Inter',
            fontSize: 12,
            fontWeight: 'normal',
            fontStyle: 'normal',
            textAlign: 'left',
            lineHeight: 1.2,
            letterSpacing: 0,
            fill: { type: 'solid', color: '#1e293b', opacity: 1 },
            stroke: { type: 'none', color: '#000', width: 0, opacity: 1 },
          });
          setActiveTool('select');
          return;
        }

        setDragState({
          mode: 'create',
          startX: clickMm.x,
          startY: clickMm.y,
          initialObjects: [],
        });
        return;
      }

      // Empty area tap deselects
      setSelectedIds([]);
      setActiveGuides([]);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchStateRef.current) {
      // 2-Finger Pinch Zoom & Pan
      const t0 = e.touches[0];
      const t1 = e.touches[1];
      const dist = Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY);
      const mid = {
        x: (t0.clientX + t1.clientX) / 2,
        y: (t0.clientY + t1.clientY) / 2,
      };

      if (touchStateRef.current.initialDistance > 10) {
        const scale = dist / touchStateRef.current.initialDistance;
        const newZoom = Math.min(4, Math.max(0.2, Number((touchStateRef.current.initialZoom * scale).toFixed(2))));
        setZoom(newZoom);
      }

      const dx = mid.x - touchStateRef.current.initialMidpoint.x;
      const dy = mid.y - touchStateRef.current.initialMidpoint.y;
      setPan({
        x: touchStateRef.current.initialPan.x + dx,
        y: touchStateRef.current.initialPan.y + dy,
      });
      return;
    }

    if (e.touches.length === 1) {
      const t = e.touches[0];
      const currentMm = screenToDocMm(t.clientX, t.clientY);
      setCursorMm(currentMm);

      if (!dragState) return;

      if (dragState.mode === 'pan') {
        if (lastTouchPosRef.current) {
          const dx = t.clientX - lastTouchPosRef.current.x;
          const dy = t.clientY - lastTouchPosRef.current.y;
          setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
        }
        lastTouchPosRef.current = { x: t.clientX, y: t.clientY };
        return;
      }

      lastTouchPosRef.current = { x: t.clientX, y: t.clientY };

      if (dragState.mode === 'pen') {
        const pts = dragState.penPoints || [];
        const newPts = [...pts, { x: currentMm.x, y: currentMm.y }];
        setDragState({ ...dragState, penPoints: newPts });
        return;
      }

      if (dragState.mode === 'create') {
        setActiveGuides([]);
        return;
      }

      if (dragState.mode === 'move') {
        const deltaX = currentMm.x - dragState.startX;
        const deltaY = currentMm.y - dragState.startY;
        const primaryInit = dragState.initialObjects.find(o => selectedIds[0] === o.id);
        if (!primaryInit) return;

        const candidateBounds = {
          x: primaryInit.x + deltaX,
          y: primaryInit.y + deltaY,
          width: primaryInit.width,
          height: primaryInit.height,
        };

        const snapResult = computeSnapping(
          candidateBounds,
          selectedIds,
          project.objects,
          project.page,
          project.grid,
          project.snap
        );

        const actualDeltaX = snapResult.snappedX - primaryInit.x;
        const actualDeltaY = snapResult.snappedY - primaryInit.y;
        setActiveGuides(snapResult.guides);

        const updates = dragState.initialObjects.map(initObj => ({
          id: initObj.id,
          changes: {
            x: Number((initObj.x + actualDeltaX).toFixed(2)),
            y: Number((initObj.y + actualDeltaY).toFixed(2)),
          },
        }));
        updateMultipleObjects(updates, false);
        return;
      }

      if (dragState.mode === 'resize' && dragState.handle) {
        const handle = dragState.handle;
        const primaryInit = dragState.initialObjects[0];
        if (!primaryInit) return;

        let newX = primaryInit.x;
        let newY = primaryInit.y;
        let newW = primaryInit.width;
        let newH = primaryInit.height;
        const mouseX = currentMm.x;
        const mouseY = currentMm.y;

        if (handle.includes('e')) newW = Math.max(1, mouseX - primaryInit.x);
        if (handle.includes('w')) {
          const right = primaryInit.x + primaryInit.width;
          newX = Math.min(mouseX, right - 1);
          newW = right - newX;
        }
        if (handle.includes('s')) newH = Math.max(1, mouseY - primaryInit.y);
        if (handle.includes('n')) {
          const bottom = primaryInit.y + primaryInit.height;
          newY = Math.min(mouseY, bottom - 1);
          newH = bottom - newY;
        }

        const snapResult = computeSnapping(
          { x: newX, y: newY, width: newW, height: newH },
          [primaryInit.id],
          project.objects,
          project.page,
          project.grid,
          project.snap
        );
        setActiveGuides(snapResult.guides);

        updateObject(primaryInit.id, {
          x: Number(newX.toFixed(2)),
          y: Number(newY.toFixed(2)),
          width: Number(newW.toFixed(2)),
          height: Number(newH.toFixed(2)),
        }, false);
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length === 0) {
      touchStateRef.current = null;
      if (lastTouchPosRef.current) {
        const currentMm = screenToDocMm(lastTouchPosRef.current.x, lastTouchPosRef.current.y);
        finalizeDrag(currentMm);
      } else {
        setDragState(null);
        setActiveGuides([]);
      }
      lastTouchPosRef.current = null;
    } else if (e.touches.length === 1) {
      touchStateRef.current = null;
      lastTouchPosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  };

  // Zoom on wheel (Ctrl+Wheel or pinch)
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      setZoom(prev => {
        const next = Math.min(4, Math.max(0.2, prev * zoomFactor));
        return +next.toFixed(2);
      });
    } else {
      // Normal 2D scrolling/pan
      setPan(prev => ({
        x: prev.x - e.deltaX,
        y: prev.y - e.deltaY,
      }));
    }
  };

  // Handle Object Click / Selection
  const handleObjectMouseDown = (e: React.MouseEvent, obj: VectorObject) => {
    if (e.button !== 0) return;
    if (activeTool !== 'select' || isSpacePressed) return;

    e.stopPropagation();

    if (obj.locked) return;

    // Support Grouping: clicking an object inside a group selects all group members (unless Alt is pressed)
    let targetIds = [obj.id];
    if (obj.groupId && !e.altKey) {
      targetIds = project.objects.filter(o => o.groupId === obj.groupId).map(o => o.id);
    }

    let newSelected = [...selectedIds];
    if (e.shiftKey) {
      const anySelected = targetIds.some(id => newSelected.includes(id));
      if (anySelected) {
        newSelected = newSelected.filter(id => !targetIds.includes(id));
      } else {
        newSelected = Array.from(new Set([...newSelected, ...targetIds]));
      }
    } else {
      const alreadyHasAll = targetIds.every(id => newSelected.includes(id));
      if (!alreadyHasAll) {
        newSelected = targetIds;
      }
    }
    setSelectedIds(newSelected);

    const clickMm = screenToDocMm(e.clientX, e.clientY);
    const initialObjects = project.objects
      .filter(o => newSelected.includes(o.id))
      .map(o => ({ ...o }));

    setDragState({
      mode: 'move',
      startX: clickMm.x,
      startY: clickMm.y,
      initialObjects,
    });
  };

  // Handle Object Touch Start (Tablets)
  const handleObjectTouchStart = (e: React.TouchEvent, obj: VectorObject) => {
    if (e.touches.length !== 1) return;
    if (activeTool !== 'select' || isSpacePressed) return;
    e.stopPropagation();

    if (obj.locked) return;

    // Check for double tap on touch tablets
    const now = Date.now();
    if (lastTapRef.current && lastTapRef.current.objId === obj.id && (now - lastTapRef.current.time) < 350) {
      lastTapRef.current = null;
      if (obj.type === 'text') {
        setEditingText({ id: obj.id, text: obj.text });
      }
      return;
    }
    lastTapRef.current = { time: now, objId: obj.id };

    // Support Grouping on Tablets: touch selects all group members
    let newSelected = [obj.id];
    if (obj.groupId) {
      newSelected = project.objects.filter(o => o.groupId === obj.groupId).map(o => o.id);
    }
    setSelectedIds(newSelected);

    const t = e.touches[0];
    lastTouchPosRef.current = { x: t.clientX, y: t.clientY };
    const clickMm = screenToDocMm(t.clientX, t.clientY);
    const initialObjects = project.objects
      .filter(o => newSelected.includes(o.id))
      .map(o => ({ ...o }));

    setDragState({
      mode: 'move',
      startX: clickMm.x,
      startY: clickMm.y,
      initialObjects,
    });
  };

  // Handle Resize Handle MouseDown
  const handleResizeHandleDown = (e: React.MouseEvent, handle: string) => {
    e.stopPropagation();
    const clickMm = screenToDocMm(e.clientX, e.clientY);
    const initialObjects = project.objects
      .filter(o => selectedIds.includes(o.id))
      .map(o => ({ ...o }));

    setDragState({
      mode: 'resize',
      handle,
      startX: clickMm.x,
      startY: clickMm.y,
      initialObjects,
    });
  };

  // Handle Resize Handle Touch Start (Tablets)
  const handleResizeHandleTouchStart = (e: React.TouchEvent, handle: string) => {
    if (e.touches.length !== 1) return;
    e.stopPropagation();

    const t = e.touches[0];
    lastTouchPosRef.current = { x: t.clientX, y: t.clientY };
    const clickMm = screenToDocMm(t.clientX, t.clientY);
    const initialObjects = project.objects
      .filter(o => selectedIds.includes(o.id))
      .map(o => ({ ...o }));

    setDragState({
      mode: 'resize',
      handle,
      startX: clickMm.x,
      startY: clickMm.y,
      initialObjects,
    });
  };

  // Compute Selection Bounding Box
  const selectedObjects = project.objects.filter(o => selectedIds.includes(o.id));
  let selectionBox: { x: number; y: number; width: number; height: number } | null = null;
  if (selectedObjects.length > 0) {
    const minX = Math.min(...selectedObjects.map(o => o.x));
    const minY = Math.min(...selectedObjects.map(o => o.y));
    const maxX = Math.max(...selectedObjects.map(o => o.x + o.width));
    const maxY = Math.max(...selectedObjects.map(o => o.y + o.height));
    selectionBox = { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }

  // Double click text to edit (opens custom in-place text editor)
  const handleObjectDoubleClick = (e: React.MouseEvent, obj: VectorObject) => {
    e.stopPropagation();
    if (obj.type === 'text') {
      setEditingText({ id: obj.id, text: obj.text });
    }
  };

  const handleObjectContextMenu = (e: React.MouseEvent, obj: VectorObject) => {
    e.preventDefault();
    e.stopPropagation();
    if (!selectedIds.includes(obj.id)) {
      if (obj.groupId) {
        const members = project.objects.filter(o => o.groupId === obj.groupId).map(o => o.id);
        setSelectedIds(members);
      } else {
        setSelectedIds([obj.id]);
      }
    }
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const handleCanvasContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const isSingleTextSelected =
    selectedIds.length === 1 &&
    project.objects.find(o => o.id === selectedIds[0])?.type === 'text';

  const anySelectedGrouped = selectedIds.some(id => {
    return project.objects.find(o => o.id === id)?.groupId !== undefined;
  });

  const anySelectedLinked = selectedIds.some(id => {
    return project.objects.find(o => o.id === id)?.linkGroupId !== undefined;
  });

  // Compute page pixel dimensions
  const pageWidthPx = project.page.width * MM_TO_PX * zoom;
  const pageHeightPx = project.page.height * MM_TO_PX * zoom;

  const defsSvg = buildSvgDefs(project.objects);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden select-none bg-workspace-light dark:bg-workspace-dark relative">
      {/* Top Ruler Bar */}
      <div className="h-6 flex w-full border-b border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 z-20">
        <RulerCorner />
        <div className="flex-1 overflow-hidden">
          <Ruler orientation="horizontal" cursorMm={cursorMm ? cursorMm.x : null} />
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Ruler Bar */}
        <div className="w-6 h-full border-r border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 z-20 flex-shrink-0 overflow-hidden">
          <Ruler orientation="vertical" cursorMm={cursorMm ? cursorMm.y : null} />
        </div>

        {/* Main Canvas Workspace */}
        <div
          ref={containerRef}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
          onWheel={handleWheel}
          onContextMenu={handleCanvasContextMenu}
          onMouseLeave={() => {
            setCursorMm(null);
            setActiveGuides([]);
          }}
          style={{ touchAction: 'none' }}
          className={`flex-1 h-full overflow-hidden relative ${
            isSpacePressed || activeTool === 'pan'
              ? 'cursor-grab active:cursor-grabbing'
              : activeTool === 'text'
              ? 'cursor-text'
              : activeTool !== 'select'
              ? 'cursor-crosshair'
              : 'cursor-default'
          }`}
        >
          {/* Transforming Page Container */}
          <div
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px)`,
              width: `${pageWidthPx}px`,
              height: `${pageHeightPx}px`,
              position: 'absolute',
              top: 0,
              left: 0,
            }}
            className="transition-transform duration-75"
          >
            {/* White Paper Page with drop shadow */}
            <div
              style={{
                width: '100%',
                height: '100%',
              }}
              className="bg-white shadow-2xl border border-slate-300 dark:border-zinc-700 relative overflow-hidden"
            >
              {/* Optional Grid Overlay */}
              {project.grid.show && project.grid.spacing > 0 && (
                <svg
                  width="100%"
                  height="100%"
                  className="absolute inset-0 pointer-events-none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <defs>
                    <pattern
                      id="canvas-grid-pattern"
                      width={project.grid.spacing * MM_TO_PX * zoom}
                      height={project.grid.spacing * MM_TO_PX * zoom}
                      patternUnits="userSpaceOnUse"
                    >
                      <path
                        d={`M ${project.grid.spacing * MM_TO_PX * zoom} 0 L 0 0 0 ${
                          project.grid.spacing * MM_TO_PX * zoom
                        }`}
                        fill="none"
                        stroke={theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}
                        strokeWidth="0.8"
                      />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#canvas-grid-pattern)" />
                </svg>
              )}

              {/* Main SVG Vector Canvas */}
              <svg
                width="100%"
                height="100%"
                viewBox={`0 0 ${project.page.width} ${project.page.height}`}
                className="w-full h-full block"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs dangerouslySetInnerHTML={{ __html: defsSvg }} />

                {/* Render All Vector Objects */}
                {[...project.objects]
                  .sort((a, b) => a.zIndex - b.zIndex)
                  .map(obj => {
                    const isSelected = selectedIds.includes(obj.id);
                    const isBeingEdited = editingText?.id === obj.id;
                    return (
                      <g
                        key={obj.id}
                        onMouseDown={e => handleObjectMouseDown(e, obj)}
                        onTouchStart={e => handleObjectTouchStart(e, obj)}
                        onDoubleClick={e => handleObjectDoubleClick(e, obj)}
                        onContextMenu={e => handleObjectContextMenu(e, obj)}
                        style={{ opacity: isBeingEdited ? 0 : undefined }}
                        className={`cursor-pointer ${obj.locked ? 'pointer-events-none' : ''}`}
                        dangerouslySetInnerHTML={{
                          __html: renderObjectToSvg(obj, activeReplacements),
                        }}
                      />
                    );
                  })}
              </svg>

              {/* Interactive Bounding Box & Transform Handles Overlay */}
              {selectionBox && (
                <div
                  style={{
                    position: 'absolute',
                    left: `${selectionBox.x * MM_TO_PX * zoom}px`,
                    top: `${selectionBox.y * MM_TO_PX * zoom}px`,
                    width: `${selectionBox.width * MM_TO_PX * zoom}px`,
                    height: `${selectionBox.height * MM_TO_PX * zoom}px`,
                    pointerEvents: 'none',
                  }}
                  className="border border-blue-500 bg-blue-500/5 select-none"
                >
                  {/* Resize Handles (8 directions with 28x28px touch hit-box for tablets) */}
                  {['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'].map(handle => {
                    let containerStyle: React.CSSProperties = {
                      position: 'absolute',
                      width: '28px',
                      height: '28px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      pointerEvents: 'auto',
                      touchAction: 'none',
                    };

                    if (handle.includes('n')) containerStyle.top = '-14px';
                    if (handle.includes('s')) containerStyle.bottom = '-14px';
                    if (handle.includes('w')) containerStyle.left = '-14px';
                    if (handle.includes('e')) containerStyle.right = '-14px';

                    if (handle === 'n' || handle === 's') {
                      containerStyle.left = 'calc(50% - 14px)';
                      containerStyle.cursor = 'ns-resize';
                    } else if (handle === 'w' || handle === 'e') {
                      containerStyle.top = 'calc(50% - 14px)';
                      containerStyle.cursor = 'ew-resize';
                    } else if (handle === 'nw' || handle === 'se') {
                      containerStyle.cursor = 'nwse-resize';
                    } else if (handle === 'ne' || handle === 'sw') {
                      containerStyle.cursor = 'nesw-resize';
                    }

                    return (
                      <div
                        key={handle}
                        style={containerStyle}
                        onMouseDown={e => handleResizeHandleDown(e, handle)}
                        onTouchStart={e => handleResizeHandleTouchStart(e, handle)}
                        title="Drag to resize"
                      >
                        <div className="w-2.5 h-2.5 bg-white border-[1.5px] border-blue-600 rounded-[1px] shadow-xs pointer-events-none" />
                      </div>
                    );
                  })}

                  {/* Dimensions badge overlay */}
                  <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 bg-blue-600 text-white font-mono text-[9px] px-1.5 py-0.2 rounded shadow-sm whitespace-nowrap">
                    {selectionBox.width.toFixed(1)} × {selectionBox.height.toFixed(1)} {project.unit}
                  </div>
                </div>
              )}

              {/* Freehand Pen Live Preview */}
              {dragState?.mode === 'pen' && dragState.penPoints && (
                <svg className="absolute inset-0 pointer-events-none w-full h-full">
                  <polyline
                    points={dragState.penPoints
                      .map(p => `${p.x * MM_TO_PX * zoom},${p.y * MM_TO_PX * zoom}`)
                      .join(' ')}
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}

              {/* Marquee Selection Drag Overlay */}
              {marquee && (
                <div
                  style={{
                    position: 'absolute',
                    left: `${Math.min(marquee.startX, marquee.currentX) * MM_TO_PX * zoom}px`,
                    top: `${Math.min(marquee.startY, marquee.currentY) * MM_TO_PX * zoom}px`,
                    width: `${Math.abs(marquee.currentX - marquee.startX) * MM_TO_PX * zoom}px`,
                    height: `${Math.abs(marquee.currentY - marquee.startY) * MM_TO_PX * zoom}px`,
                    pointerEvents: 'none',
                    zIndex: 45,
                  }}
                  className="border border-blue-500 bg-blue-500/10 border-dashed"
                />
              )}

              {/* Custom Inline Text Editor Overlay */}
              {editingText && (() => {
                const editingObj = project.objects.find(o => o.id === editingText.id);
                if (!editingObj || editingObj.type !== 'text') return null;

                const editorX = editingObj.x * MM_TO_PX * zoom;
                const editorY = editingObj.y * MM_TO_PX * zoom;
                const editorW = Math.max(140, editingObj.width * MM_TO_PX * zoom);
                const editorH = Math.max(50, editingObj.height * MM_TO_PX * zoom);
                const fontSizePx = Math.max(10, ((editingObj.fontSize * 25.4) / 72) * MM_TO_PX * zoom);

                return (
                  <div
                    style={{
                      position: 'absolute',
                      left: `${editorX}px`,
                      top: `${editorY}px`,
                      width: `${editorW}px`,
                      minHeight: `${editorH}px`,
                      zIndex: 60,
                    }}
                    className="bg-white dark:bg-zinc-800 rounded shadow-2xl border-2 border-blue-500 flex flex-col p-1.5"
                    onClick={e => e.stopPropagation()}
                    onMouseDown={e => e.stopPropagation()}
                    onTouchStart={e => e.stopPropagation()}
                  >
                    {/* Floating mini toolbar on top */}
                    <div className="flex items-center justify-between gap-1 pb-1 mb-1 border-b border-slate-200 dark:border-zinc-700 text-xs">
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1">
                          <Edit3 className="w-3 h-3" /> Edit Text
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          ({editingObj.width} × {editingObj.height} mm)
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => finishEditingText(true)}
                          className="px-2 py-0.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold flex items-center gap-1 shadow-xs cursor-pointer"
                          title="Save (Ctrl+Enter)"
                        >
                          <Check className="w-3 h-3" />
                          <span>Save</span>
                        </button>
                        <button
                          onClick={() => finishEditingText(false)}
                          className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-700 cursor-pointer"
                          title="Cancel (Esc)"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Quick formatting toolbar */}
                    <div className="flex items-center gap-1 mb-1 pb-1 border-b border-slate-100 dark:border-zinc-700/60">
                      <button
                        onClick={() => updateObject(editingObj.id, { fontWeight: editingObj.fontWeight === 'bold' ? 'normal' : 'bold' })}
                        className={`p-1 rounded cursor-pointer ${editingObj.fontWeight === 'bold' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50' : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100'}`}
                        title="Bold"
                      >
                        <Bold className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => updateObject(editingObj.id, { fontStyle: editingObj.fontStyle === 'italic' ? 'normal' : 'italic' })}
                        className={`p-1 rounded cursor-pointer ${editingObj.fontStyle === 'italic' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50' : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100'}`}
                        title="Italic"
                      >
                        <Italic className="w-3 h-3" />
                      </button>
                      <div className="h-3 w-px bg-slate-200 dark:bg-zinc-700 mx-0.5" />
                      <button
                        onClick={() => updateObject(editingObj.id, { textAlign: 'left' })}
                        className={`p-1 rounded cursor-pointer ${editingObj.textAlign === 'left' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50' : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100'}`}
                        title="Align Left"
                      >
                        <AlignLeft className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => updateObject(editingObj.id, { textAlign: 'center' })}
                        className={`p-1 rounded cursor-pointer ${editingObj.textAlign === 'center' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50' : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100'}`}
                        title="Align Center"
                      >
                        <AlignCenter className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => updateObject(editingObj.id, { textAlign: 'right' })}
                        className={`p-1 rounded cursor-pointer ${editingObj.textAlign === 'right' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50' : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100'}`}
                        title="Align Right"
                      >
                        <AlignRight className="w-3 h-3" />
                      </button>
                      <span className="text-[9px] text-slate-400 ml-auto font-mono">Ctrl+Enter to save</span>
                    </div>

                    {/* In-place Textarea */}
                    <textarea
                      ref={textEditorRef}
                      autoFocus
                      value={editingText.text}
                      onChange={e => setEditingText({ ...editingText, text: e.target.value })}
                      onKeyDown={e => {
                        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                          e.preventDefault();
                          finishEditingText(true);
                        } else if (e.key === 'Escape') {
                          e.preventDefault();
                          finishEditingText(false);
                        }
                      }}
                      style={{
                        fontFamily: editingObj.fontFamily || 'Inter, sans-serif',
                        fontSize: `${fontSizePx}px`,
                        fontWeight: editingObj.fontWeight || 'normal',
                        fontStyle: editingObj.fontStyle || 'normal',
                        textAlign: editingObj.textAlign || 'left',
                        lineHeight: editingObj.lineHeight || 1.2,
                        color: editingObj.fill?.type === 'solid' ? editingObj.fill.color : '#0f172a',
                      }}
                      className="w-full flex-1 p-1 bg-transparent border-0 outline-none resize-none overflow-y-auto leading-relaxed"
                      rows={Math.max(2, editingText.text.split('\n').length)}
                    />
                  </div>
                );
              })()}
            </div>

            {/* Magnetic Snapping Guide Lines */}
            {activeGuides.map((guide, idx) => {
              if (guide.orientation === 'vertical') {
                return (
                  <div
                    key={idx}
                    style={{
                      position: 'absolute',
                      left: `${guide.position * MM_TO_PX * zoom}px`,
                      top: 0,
                      bottom: 0,
                      width: '1px',
                    }}
                    className="bg-pink-500 shadow-xs pointer-events-none z-40"
                  />
                );
              } else {
                return (
                  <div
                    key={idx}
                    style={{
                      position: 'absolute',
                      top: `${guide.position * MM_TO_PX * zoom}px`,
                      left: 0,
                      right: 0,
                      height: '1px',
                    }}
                    className="bg-pink-500 shadow-xs pointer-events-none z-40"
                  />
                );
              }
            })}
          </div>
        </div>

        {/* Canvas Right-Click Context Menu */}
        {contextMenu && (
          <div
            style={{
              position: 'fixed',
              left: `${contextMenu.x}px`,
              top: `${contextMenu.y}px`,
              zIndex: 100,
            }}
            className="bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg shadow-2xl py-1 w-56 text-xs select-none"
            onClick={e => e.stopPropagation()}
            onContextMenu={e => e.preventDefault()}
          >
            {/* Group */}
            <button
              onClick={() => {
                groupSelected();
                setContextMenu(null);
              }}
              disabled={selectedIds.length < 2}
              className="w-full px-3 py-1.5 text-left hover:bg-blue-50 dark:hover:bg-zinc-700 disabled:opacity-40 flex items-center justify-between text-slate-700 dark:text-zinc-200"
            >
              <span className="flex items-center gap-2">
                <Folder className="w-3.5 h-3.5 text-indigo-500" /> Group Selected ({selectedIds.length})
              </span>
              <span className="text-[10px] text-slate-400">Ctrl+G</span>
            </button>

            {/* Ungroup */}
            {anySelectedGrouped && (
              <button
                onClick={() => {
                  ungroupSelected();
                  setContextMenu(null);
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-blue-50 dark:hover:bg-zinc-700 flex items-center justify-between text-slate-700 dark:text-zinc-200"
              >
                <span className="flex items-center gap-2">
                  <Folder className="w-3.5 h-3.5 text-slate-400" /> Ungroup
                </span>
                <span className="text-[10px] text-slate-400">Ctrl+Shift+G</span>
              </button>
            )}

            <div className="h-px bg-slate-100 dark:bg-zinc-700 my-1" />

            {/* Link Duplicates */}
            <button
              onClick={() => {
                linkSelectedAsDuplicates();
                setContextMenu(null);
              }}
              disabled={selectedIds.length < 2}
              className="w-full px-3 py-1.5 text-left hover:bg-blue-50 dark:hover:bg-zinc-700 disabled:opacity-40 flex items-center justify-between text-slate-700 dark:text-zinc-200"
            >
              <span className="flex items-center gap-2">
                <Link2 className="w-3.5 h-3.5 text-blue-500" /> Link Duplicates (Sync)
              </span>
              <span className="text-[10px] text-slate-400">Ctrl+L</span>
            </button>

            {/* Unlink Duplicates */}
            {anySelectedLinked && (
              <button
                onClick={() => {
                  unlinkSelectedDuplicates();
                  setContextMenu(null);
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-rose-50 dark:hover:bg-zinc-700 flex items-center justify-between text-rose-600 dark:text-rose-400"
              >
                <span className="flex items-center gap-2">
                  <Unlink className="w-3.5 h-3.5 text-rose-500" /> Unlink Duplicate
                </span>
              </button>
            )}

            {/* Master Card Linking */}
            {selectedIds.length === 1 && !masterCardId && (
              <button
                onClick={() => {
                  setMasterCardId(selectedIds[0]);
                  setContextMenu(null);
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-amber-50 dark:hover:bg-zinc-700 flex items-center justify-between text-amber-700 dark:text-amber-300 font-medium"
              >
                <span className="flex items-center gap-2">
                  <Crown className="w-3.5 h-3.5 text-amber-500" /> Set as Master Card
                </span>
              </button>
            )}

            {masterCardId && selectedIds.filter(id => id !== masterCardId).length > 0 && (
              <button
                onClick={() => {
                  linkToMaster(selectedIds.filter(id => id !== masterCardId), masterCardId);
                  setContextMenu(null);
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-amber-50 dark:hover:bg-zinc-700 flex items-center justify-between text-amber-700 dark:text-amber-300 font-medium"
              >
                <span className="flex items-center gap-2">
                  <Crown className="w-3.5 h-3.5 text-amber-500" /> Link Selected to Master
                </span>
              </button>
            )}

            <div className="h-px bg-slate-100 dark:bg-zinc-700 my-1" />

            {/* Edit text if single text object selected */}
            {isSingleTextSelected && (
              <button
                onClick={() => {
                  const tObj = project.objects.find(o => o.id === selectedIds[0]);
                  if (tObj && tObj.type === 'text') {
                    setEditingText({ id: tObj.id, text: tObj.text });
                  }
                  setContextMenu(null);
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-blue-50 dark:hover:bg-zinc-700 flex items-center gap-2 text-blue-600 dark:text-blue-400 font-medium"
              >
                <Edit3 className="w-3.5 h-3.5" /> Edit Text Content...
              </button>
            )}

            <button
              onClick={() => {
                duplicateSelected();
                setContextMenu(null);
              }}
              disabled={selectedIds.length === 0}
              className="w-full px-3 py-1.5 text-left hover:bg-blue-50 dark:hover:bg-zinc-700 disabled:opacity-40 flex items-center justify-between text-slate-700 dark:text-zinc-200"
            >
              <span className="flex items-center gap-2">
                <Copy className="w-3.5 h-3.5 text-slate-400" /> Duplicate
              </span>
              <span className="text-[10px] text-slate-400">Ctrl+D</span>
            </button>

            <button
              onClick={() => {
                deleteSelected();
                setContextMenu(null);
              }}
              disabled={selectedIds.length === 0}
              className="w-full px-3 py-1.5 text-left hover:bg-red-50 dark:hover:bg-zinc-700 disabled:opacity-40 flex items-center justify-between text-red-600 dark:text-red-400"
            >
              <span className="flex items-center gap-2">
                <Trash2 className="w-3.5 h-3.5 text-red-500" /> Delete
              </span>
              <span className="text-[10px] text-slate-400">Del</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
