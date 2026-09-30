import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import {
  ProjectDocument,
  VectorObject,
  PageConfig,
  GridConfig,
  SnapConfig,
  Unit,
  ToolType,
  PagePreset,
  PageOrientation,
  TextObject,
  RectObject,
  EllipseObject,
  LineObject,
  PathObject,
  ImageObject,
  SvgObject,
  GroupObject,
  TrackpadTarget,
  DocumentPage,
  CustomFont
} from '../types/document';
import { getPageDimensions, convertToMm } from '../utils/units';
import { exportToPdf, exportMultiPagePdf, exportBatchPdf } from '../utils/pdfExport';
import { generateFullSvgString } from '../utils/svgRenderer';
import { extractPlaceholders, generateDataJsonTemplate, generateSchemaMetadata, parseImportedJsonData } from '../utils/jsonSchema';

interface DocumentContextType {
  project: ProjectDocument;
  selectedIds: string[];
  activeTool: ToolType;
  zoom: number;
  pan: { x: number; y: number };
  theme: 'light' | 'dark';
  activeModal: string | null;
  importedRecords: Record<string, string>[] | null;
  activeRecordIndex: number;
  canUndo: boolean;
  canRedo: boolean;
  
  // Trackpad
  trackpadTarget: TrackpadTarget;
  setTrackpadTarget: (target: TrackpadTarget) => void;
  isTrackpadOpen: boolean;
  setIsTrackpadOpen: (open: boolean) => void;
  
  // Multi-page & Templates
  activePageIndex: number;
  setActivePageIndex: (index: number) => void;
  loadProjectDocument: (doc: ProjectDocument) => void;
  
  // Custom Fonts
  customFontFamilies: string[];
  addCustomFontFamily: (font: string) => void;
  
  // Setters & Actions
  setSelectedIds: (ids: string[]) => void;
  setActiveTool: (tool: ToolType) => void;
  setZoom: (zoom: number | ((prev: number) => number)) => void;
  setPan: (pan: { x: number; y: number } | ((prev: { x: number; y: number }) => { x: number; y: number })) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
  setActiveModal: (modal: string | null) => void;
  
  // Document modification
  addObject: (obj: Omit<VectorObject, 'id' | 'zIndex'>, selectAfter?: boolean) => string;
  updateObject: (id: string, updates: Partial<VectorObject>, recordHistory?: boolean) => void;
  updateMultipleObjects: (updates: { id: string; changes: Partial<VectorObject> }[], recordHistory?: boolean) => void;
  deleteSelected: () => void;
  duplicateSelected: () => void;
  selectAll: () => void;
  
  // Arrangement & Layers
  bringForward: () => void;
  bringToFront: () => void;
  sendBackward: () => void;
  sendToBack: () => void;
  reorderObject: (id: string, newZIndex: number) => void;
  toggleLock: (id: string) => void;
  toggleVisibility: (id: string) => void;
  renameObject: (id: string, newName: string) => void;
  
  // Alignment & Distribution
  alignSelected: (type: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => void;
  distributeSelected: (type: 'horizontal' | 'vertical') => void;
  
  // Grouping
  groupSelected: () => void;
  ungroupSelected: () => void;
  
  // Repeat / Grid duplication
  repeatGridSelected: (cols: number, rows: number, gapX: number, gapY: number) => void;
  
  // History
  undo: () => void;
  redo: () => void;
  recordHistorySnapshot: () => void;
  
  // Clipboard
  copy: () => void;
  paste: () => void;
  cut: () => void;
  
  // Document Configuration
  setUnit: (unit: Unit) => void;
  setPagePreset: (preset: PagePreset, orientation: PageOrientation, customW?: number, customH?: number) => void;
  setGridConfig: (config: Partial<GridConfig>) => void;
  setSnapConfig: (config: Partial<SnapConfig>) => void;
  setProjectName: (name: string) => void;
  
  // File operations
  newDocument: (preset?: PagePreset, orientation?: PageOrientation) => void;
  saveProjectFile: () => void;
  loadProjectFile: (file: File) => Promise<void>;
  exportCurrentPdf: () => Promise<void>;
  exportCurrentSvg: () => void;
  
  // Template & Placeholders
  convertSelectedToPlaceholder: (name: string, description: string) => void;
  removePlaceholder: (id: string) => void;
  importJsonDataString: (jsonStr: string) => { count: number };
  clearImportedData: () => void;
  nextRecord: () => void;
  prevRecord: () => void;
  setRecordIndex: (idx: number) => void;
  exportBatchPdfsAction: (format: 'merged' | 'zip', baseName: string) => Promise<void>;
}

const DocumentContext = createContext<DocumentContextType | null>(null);

function createInitialObjects(): VectorObject[] {
  // Beautiful default Certificate template on A4 (210 × 297 mm)
  return [
    // Outer decorative border
    {
      id: 'obj-border-outer',
      name: 'Outer Border',
      type: 'rect',
      x: 10,
      y: 10,
      width: 190,
      height: 277,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      zIndex: 1,
      rx: 2,
      ry: 2,
      fill: { type: 'none' },
      stroke: { type: 'solid', color: '#1e3a8a', width: 1.2, opacity: 1 },
    },
    // Inner thin border
    {
      id: 'obj-border-inner',
      name: 'Inner Border',
      type: 'rect',
      x: 13,
      y: 13,
      width: 184,
      height: 271,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      zIndex: 2,
      rx: 1,
      ry: 1,
      fill: { type: 'none' },
      stroke: { type: 'solid', color: '#d97706', width: 0.4, opacity: 0.8 },
    },
    // Top banner ribbon rectangle with gradient
    {
      id: 'obj-banner',
      name: 'Header Banner',
      type: 'rect',
      x: 25,
      y: 28,
      width: 160,
      height: 26,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      zIndex: 3,
      rx: 4,
      ry: 4,
      fill: {
        type: 'linear',
        angle: 90,
        opacity: 1,
        stops: [
          { id: 's1', offset: 0, color: '#1e3a8a', opacity: 1 },
          { id: 's2', offset: 1, color: '#2563eb', opacity: 1 },
        ],
      },
      stroke: { type: 'none', color: '#000000', width: 0, opacity: 0 },
    },
    // Main Title Text
    {
      id: 'obj-title',
      name: 'Title Text',
      type: 'text',
      x: 30,
      y: 35,
      width: 150,
      height: 14,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      zIndex: 4,
      text: 'CERTIFICATE OF ACHIEVEMENT',
      fontFamily: 'Inter',
      fontSize: 18,
      fontWeight: 'bold',
      fontStyle: 'normal',
      textAlign: 'center',
      lineHeight: 1.2,
      letterSpacing: 0.8,
      fill: { type: 'solid', color: '#ffffff', opacity: 1 },
      stroke: { type: 'none', color: '#000', width: 0, opacity: 1 },
    },
    // Subtitle Text
    {
      id: 'obj-sub',
      name: 'Subtitle',
      type: 'text',
      x: 35,
      y: 68,
      width: 140,
      height: 8,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      zIndex: 5,
      text: 'THIS CERTIFICATE IS PROUDLY PRESENTED TO',
      fontFamily: 'Inter',
      fontSize: 10,
      fontWeight: '600',
      fontStyle: 'normal',
      textAlign: 'center',
      lineHeight: 1.2,
      letterSpacing: 0.5,
      fill: { type: 'solid', color: '#64748b', opacity: 1 },
      stroke: { type: 'none', color: '#000', width: 0, opacity: 1 },
    },
    // Recipient Name Placeholder Text
    {
      id: 'obj-name-placeholder',
      name: 'Recipient Name Placeholder',
      type: 'text',
      x: 25,
      y: 86,
      width: 160,
      height: 18,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      zIndex: 6,
      text: 'Chirag Sharma',
      fontFamily: 'Inter',
      fontSize: 26,
      fontWeight: 'bold',
      fontStyle: 'normal',
      textAlign: 'center',
      lineHeight: 1.2,
      letterSpacing: 0.2,
      fill: { type: 'solid', color: '#0f172a', opacity: 1 },
      stroke: { type: 'none', color: '#000', width: 0, opacity: 1 },
      placeholder: {
        isPlaceholder: true,
        name: 'recipient_name',
        description: 'Full legal name of the recipient or awardee',
        defaultValue: 'Chirag Sharma',
      },
    },
    // Horizontal accent divider line
    {
      id: 'obj-divider',
      name: 'Accent Divider',
      type: 'line',
      x: 55,
      y: 108,
      width: 100,
      height: 0,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      zIndex: 7,
      x2: 100,
      y2: 0,
      stroke: { type: 'solid', color: '#d97706', width: 0.6, opacity: 1 },
    },
    // Description Paragraph Text
    {
      id: 'obj-desc',
      name: 'Award Description',
      type: 'text',
      x: 35,
      y: 118,
      width: 140,
      height: 20,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      zIndex: 8,
      text: 'For demonstrating outstanding proficiency, technical excellence,\nand exemplary dedication during the completion of',
      fontFamily: 'Inter',
      fontSize: 10,
      fontWeight: 'normal',
      fontStyle: 'normal',
      textAlign: 'center',
      lineHeight: 1.4,
      letterSpacing: 0,
      fill: { type: 'solid', color: '#334155', opacity: 1 },
      stroke: { type: 'none', color: '#000', width: 0, opacity: 1 },
    },
    // Course Title Placeholder Text
    {
      id: 'obj-course-placeholder',
      name: 'Course Title Placeholder',
      type: 'text',
      x: 30,
      y: 145,
      width: 150,
      height: 12,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      zIndex: 9,
      text: 'Advanced Vector PDF Architecture',
      fontFamily: 'Inter',
      fontSize: 14,
      fontWeight: 'bold',
      fontStyle: 'normal',
      textAlign: 'center',
      lineHeight: 1.2,
      letterSpacing: 0.2,
      fill: { type: 'solid', color: '#1d4ed8', opacity: 1 },
      stroke: { type: 'none', color: '#000', width: 0, opacity: 1 },
      placeholder: {
        isPlaceholder: true,
        name: 'course_title',
        description: 'Title of the certification course or workshop',
        defaultValue: 'Advanced Vector PDF Architecture',
      },
    },
    // Gold Seal Medal Circle with radial gradient
    {
      id: 'obj-seal-circle',
      name: 'Gold Seal Badge',
      type: 'ellipse',
      x: 93,
      y: 172,
      width: 24,
      height: 24,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      zIndex: 10,
      fill: {
        type: 'radial',
        cx: 0.5,
        cy: 0.5,
        opacity: 1,
        stops: [
          { id: 's1', offset: 0, color: '#fef08a', opacity: 1 },
          { id: 's2', offset: 0.7, color: '#f59e0b', opacity: 1 },
          { id: 's3', offset: 1, color: '#b45309', opacity: 1 },
        ],
      },
      stroke: { type: 'solid', color: '#78350f', width: 0.5, opacity: 1 },
    },
    // Signature Line Left
    {
      id: 'obj-sig-line-1',
      name: 'Date Line',
      type: 'line',
      x: 35,
      y: 235,
      width: 45,
      height: 0,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      zIndex: 11,
      x2: 45,
      y2: 0,
      stroke: { type: 'solid', color: '#94a3b8', width: 0.4, opacity: 1 },
    },
    // Date Placeholder
    {
      id: 'obj-date-placeholder',
      name: 'Date Placeholder',
      type: 'text',
      x: 35,
      y: 228,
      width: 45,
      height: 6,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      zIndex: 12,
      text: 'September 2026',
      fontFamily: 'Inter',
      fontSize: 9,
      fontWeight: '600',
      fontStyle: 'normal',
      textAlign: 'center',
      lineHeight: 1.2,
      letterSpacing: 0,
      fill: { type: 'solid', color: '#1e293b', opacity: 1 },
      stroke: { type: 'none', color: '#000', width: 0, opacity: 1 },
      placeholder: {
        isPlaceholder: true,
        name: 'issue_date',
        description: 'Date of issuance',
        defaultValue: 'September 2026',
      },
    },
    // Date Label
    {
      id: 'obj-date-label',
      name: 'Date Label',
      type: 'text',
      x: 35,
      y: 238,
      width: 45,
      height: 5,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      zIndex: 13,
      text: 'DATE OF ISSUANCE',
      fontFamily: 'Inter',
      fontSize: 7,
      fontWeight: 'normal',
      fontStyle: 'normal',
      textAlign: 'center',
      lineHeight: 1.2,
      letterSpacing: 0.3,
      fill: { type: 'solid', color: '#64748b', opacity: 1 },
      stroke: { type: 'none', color: '#000', width: 0, opacity: 1 },
    },
    // Signature Line Right
    {
      id: 'obj-sig-line-2',
      name: 'Signature Line',
      type: 'line',
      x: 130,
      y: 235,
      width: 45,
      height: 0,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      zIndex: 14,
      x2: 45,
      y2: 0,
      stroke: { type: 'solid', color: '#94a3b8', width: 0.4, opacity: 1 },
    },
    // Signature Label
    {
      id: 'obj-sig-label',
      name: 'Signature Label',
      type: 'text',
      x: 130,
      y: 238,
      width: 45,
      height: 5,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      zIndex: 15,
      text: 'AUTHORIZED SIGNATURE',
      fontFamily: 'Inter',
      fontSize: 7,
      fontWeight: 'normal',
      fontStyle: 'normal',
      textAlign: 'center',
      lineHeight: 1.2,
      letterSpacing: 0.3,
      fill: { type: 'solid', color: '#64748b', opacity: 1 },
      stroke: { type: 'none', color: '#000', width: 0, opacity: 1 },
    },
    // Certificate ID Placeholder at bottom
    {
      id: 'obj-cert-id-placeholder',
      name: 'Certificate ID Placeholder',
      type: 'text',
      x: 60,
      y: 265,
      width: 90,
      height: 5,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      zIndex: 16,
      text: 'ID: CERT-2026-00918',
      fontFamily: 'Inter',
      fontSize: 7,
      fontWeight: 'normal',
      fontStyle: 'normal',
      textAlign: 'center',
      lineHeight: 1.2,
      letterSpacing: 0.5,
      fill: { type: 'solid', color: '#94a3b8', opacity: 1 },
      stroke: { type: 'none', color: '#000', width: 0, opacity: 1 },
      placeholder: {
        isPlaceholder: true,
        name: 'certificate_id',
        description: 'Unique verification serial or certificate number',
        defaultValue: 'ID: CERT-2026-00918',
      },
    },
  ];
}

export const DocumentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [project, setProject] = useState<ProjectDocument>(() => ({
    id: 'doc-' + Date.now(),
    name: 'Certificate of Achievement',
    version: '1.0.0',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    unit: 'mm',
    page: {
      preset: 'A4',
      width: 210,
      height: 297,
      orientation: 'portrait',
      margins: { top: 10, right: 10, bottom: 10, left: 10 },
    },
    grid: {
      show: true,
      spacing: 10, // 10 mm
      snap: true,
    },
    snap: {
      enabled: true,
      snapToGrid: true,
      snapToPage: true,
      snapToObjects: true,
      thresholdMm: 2.0,
    },
    objects: createInitialObjects(),
  }));

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeTool, setActiveTool] = useState<ToolType>('select');
  const [zoom, setZoom] = useState<number>(1.0); // 1.0 = 100%
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [theme, setThemeState] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('vector_pdf_theme') as 'light' | 'dark') || 'light';
  });
  const [activeModal, setActiveModal] = useState<string | null>(null);

  // Template / Data import state
  const [importedRecords, setImportedRecords] = useState<Record<string, string>[] | null>(null);
  const [activeRecordIndex, setActiveRecordIndex] = useState<number>(0);

  // Trackpad state
  const [trackpadTarget, setTrackpadTarget] = useState<TrackpadTarget>('xy');
  const [isTrackpadOpen, setIsTrackpadOpen] = useState(false);

  // Multi-page state
  const [activePageIndex, setActivePageIndexState] = useState<number>(0);

  // Custom fonts state
  const [customFontFamilies, setCustomFontFamilies] = useState<string[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('vector_pdf_custom_fonts') || '[]');
      return saved.map((f: any) => f.name);
    } catch {
      return [];
    }
  });

  // Load custom fonts into DOM head on mount
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('vector_pdf_custom_fonts') || '[]');
      for (const f of saved) {
        if (f.type === 'upload' && f.data) {
          const styleId = `custom-font-${f.name.toLowerCase().replace(/\s+/g, '-')}`;
          if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = `@font-face { font-family: '${f.name}'; src: url('${f.data}'); }`;
            document.head.appendChild(style);
          }
        } else if (f.type === 'google' && f.url) {
          const linkId = `google-font-${f.name.toLowerCase().replace(/\s+/g, '-')}`;
          if (!document.getElementById(linkId)) {
            const link = document.createElement('link');
            link.id = linkId;
            link.rel = 'stylesheet';
            link.href = f.url;
            document.head.appendChild(link);
          }
        }
      }
    } catch (e) {
      console.error('Error loading custom fonts', e);
    }
  }, []);

  const addCustomFontFamily = useCallback((name: string) => {
    setCustomFontFamilies(prev => (prev.includes(name) ? prev : [...prev, name]));
  }, []);

  // History stack
  const pastRef = useRef<VectorObject[][]>([]);
  const futureRef = useRef<VectorObject[][]>([]);
  const [historyVersion, setHistoryVersion] = useState(0);

  // Clipboard
  const clipboardRef = useRef<VectorObject[] | null>(null);

  // Sync theme with DOM root
  const setTheme = useCallback((newTheme: 'light' | 'dark') => {
    setThemeState(newTheme);
    localStorage.setItem('vector_pdf_theme', newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  }, [theme, setTheme]);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Record history snapshot
  const recordHistorySnapshot = useCallback(() => {
    pastRef.current.push(JSON.parse(JSON.stringify(project.objects)));
    if (pastRef.current.length > 50) {
      pastRef.current.shift();
    }
    futureRef.current = []; // Clear redo stack on new action
    setHistoryVersion(v => v + 1);
  }, [project.objects]);

  const undo = useCallback(() => {
    if (pastRef.current.length === 0) return;
    const previous = pastRef.current.pop()!;
    futureRef.current.push(JSON.parse(JSON.stringify(project.objects)));
    setProject(prev => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      objects: previous,
    }));
    setHistoryVersion(v => v + 1);
  }, [project.objects]);

  const redo = useCallback(() => {
    if (futureRef.current.length === 0) return;
    const next = futureRef.current.pop()!;
    pastRef.current.push(JSON.parse(JSON.stringify(project.objects)));
    setProject(prev => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      objects: next,
    }));
    setHistoryVersion(v => v + 1);
  }, [project.objects]);

  const canUndo = pastRef.current.length > 0;
  const canRedo = futureRef.current.length > 0;

  // Add object
  const addObject = useCallback(
    (obj: Omit<VectorObject, 'id' | 'zIndex'>, selectAfter = true): string => {
      recordHistorySnapshot();
      const newId = 'obj-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
      const maxZIndex = project.objects.reduce((max, o) => Math.max(max, o.zIndex), 0);
      const newObject = {
        ...obj,
        id: newId,
        zIndex: maxZIndex + 1,
      } as VectorObject;

      setProject(prev => ({
        ...prev,
        updatedAt: new Date().toISOString(),
        objects: [...prev.objects, newObject],
      }));

      if (selectAfter) {
        setSelectedIds([newId]);
        setActiveTool('select');
      }

      return newId;
    },
    [project.objects, recordHistorySnapshot]
  );

  // Update single object
  const updateObject = useCallback(
    (id: string, updates: Partial<VectorObject>, recordHistory = false) => {
      if (recordHistory) {
        recordHistorySnapshot();
      }
      setProject(prev => ({
        ...prev,
        updatedAt: new Date().toISOString(),
        objects: prev.objects.map(obj => (obj.id === id ? ({ ...obj, ...updates } as VectorObject) : obj)),
      }));
    },
    [recordHistorySnapshot]
  );

  // Update multiple objects
  const updateMultipleObjects = useCallback(
    (updates: { id: string; changes: Partial<VectorObject> }[], recordHistory = false) => {
      if (recordHistory) {
        recordHistorySnapshot();
      }
      const map = new Map(updates.map(u => [u.id, u.changes]));
      setProject(prev => ({
        ...prev,
        updatedAt: new Date().toISOString(),
        objects: prev.objects.map(obj => {
          if (map.has(obj.id)) {
            return { ...obj, ...map.get(obj.id) } as VectorObject;
          }
          return obj;
        }),
      }));
    },
    [recordHistorySnapshot]
  );

  // Delete selected objects
  const deleteSelected = useCallback(() => {
    if (selectedIds.length === 0) return;
    recordHistorySnapshot();
    setProject(prev => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      objects: prev.objects.filter(obj => !selectedIds.includes(obj.id)),
    }));
    setSelectedIds([]);
  }, [selectedIds, recordHistorySnapshot]);

  // Duplicate selected objects
  const duplicateSelected = useCallback(() => {
    if (selectedIds.length === 0) return;
    recordHistorySnapshot();
    const toDuplicate = project.objects.filter(o => selectedIds.includes(o.id));
    let maxZ = project.objects.reduce((max, o) => Math.max(max, o.zIndex), 0);
    const newIds: string[] = [];

    const newObjects = toDuplicate.map(obj => {
      maxZ++;
      const newId = 'obj-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
      newIds.push(newId);
      return {
        ...JSON.parse(JSON.stringify(obj)),
        id: newId,
        name: `${obj.name} (Copy)`,
        x: obj.x + 5, // Offset slightly
        y: obj.y + 5,
        zIndex: maxZ,
      };
    });

    setProject(prev => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      objects: [...prev.objects, ...newObjects],
    }));
    setSelectedIds(newIds);
  }, [selectedIds, project.objects, recordHistorySnapshot]);

  // Select all
  const selectAll = useCallback(() => {
    const selectableIds = project.objects.filter(o => o.visible && !o.locked).map(o => o.id);
    setSelectedIds(selectableIds);
  }, [project.objects]);

  // Arrangement
  const bringForward = useCallback(() => {
    if (selectedIds.length === 0) return;
    recordHistorySnapshot();
    setProject(prev => {
      const sorted = [...prev.objects].sort((a, b) => a.zIndex - b.zIndex);
      for (let i = sorted.length - 2; i >= 0; i--) {
        if (selectedIds.includes(sorted[i].id) && !selectedIds.includes(sorted[i + 1].id)) {
          const temp = sorted[i].zIndex;
          sorted[i].zIndex = sorted[i + 1].zIndex;
          sorted[i + 1].zIndex = temp;
          // Swap positions in array
          [sorted[i], sorted[i + 1]] = [sorted[i + 1], sorted[i]];
        }
      }
      return { ...prev, objects: sorted };
    });
  }, [selectedIds, recordHistorySnapshot]);

  const bringToFront = useCallback(() => {
    if (selectedIds.length === 0) return;
    recordHistorySnapshot();
    setProject(prev => {
      let maxZ = prev.objects.reduce((max, o) => Math.max(max, o.zIndex), 0);
      const objects = prev.objects.map(obj => {
        if (selectedIds.includes(obj.id)) {
          maxZ++;
          return { ...obj, zIndex: maxZ };
        }
        return obj;
      });
      return { ...prev, objects };
    });
  }, [selectedIds, recordHistorySnapshot]);

  const sendBackward = useCallback(() => {
    if (selectedIds.length === 0) return;
    recordHistorySnapshot();
    setProject(prev => {
      const sorted = [...prev.objects].sort((a, b) => a.zIndex - b.zIndex);
      for (let i = 1; i < sorted.length; i++) {
        if (selectedIds.includes(sorted[i].id) && !selectedIds.includes(sorted[i - 1].id)) {
          const temp = sorted[i].zIndex;
          sorted[i].zIndex = sorted[i - 1].zIndex;
          sorted[i - 1].zIndex = temp;
          [sorted[i], sorted[i - 1]] = [sorted[i - 1], sorted[i]];
        }
      }
      return { ...prev, objects: sorted };
    });
  }, [selectedIds, recordHistorySnapshot]);

  const sendToBack = useCallback(() => {
    if (selectedIds.length === 0) return;
    recordHistorySnapshot();
    setProject(prev => {
      let minZ = prev.objects.reduce((min, o) => Math.min(min, o.zIndex), 0);
      const objects = prev.objects.map(obj => {
        if (selectedIds.includes(obj.id)) {
          minZ--;
          return { ...obj, zIndex: minZ };
        }
        return obj;
      });
      return { ...prev, objects };
    });
  }, [selectedIds, recordHistorySnapshot]);

  const reorderObject = useCallback(
    (id: string, newZIndex: number) => {
      recordHistorySnapshot();
      setProject(prev => ({
        ...prev,
        objects: prev.objects.map(obj => (obj.id === id ? { ...obj, zIndex: newZIndex } : obj)),
      }));
    },
    [recordHistorySnapshot]
  );

  const toggleLock = useCallback(
    (id: string) => {
      setProject(prev => ({
        ...prev,
        objects: prev.objects.map(obj => (obj.id === id ? { ...obj, locked: !obj.locked } : obj)),
      }));
    },
    []
  );

  const toggleVisibility = useCallback(
    (id: string) => {
      setProject(prev => ({
        ...prev,
        objects: prev.objects.map(obj => (obj.id === id ? { ...obj, visible: !obj.visible } : obj)),
      }));
    },
    []
  );

  const renameObject = useCallback(
    (id: string, newName: string) => {
      setProject(prev => ({
        ...prev,
        objects: prev.objects.map(obj => (obj.id === id ? { ...obj, name: newName } : obj)),
      }));
    },
    []
  );

  // Alignment
  const alignSelected = useCallback(
    (type: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
      if (selectedIds.length < 2) return;
      recordHistorySnapshot();

      const targets = project.objects.filter(o => selectedIds.includes(o.id));
      const minX = Math.min(...targets.map(o => o.x));
      const maxX = Math.max(...targets.map(o => o.x + o.width));
      const minY = Math.min(...targets.map(o => o.y));
      const maxY = Math.max(...targets.map(o => o.y + o.height));
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;

      const updates = targets.map(obj => {
        let newX = obj.x;
        let newY = obj.y;

        switch (type) {
          case 'left':
            newX = minX;
            break;
          case 'center':
            newX = centerX - obj.width / 2;
            break;
          case 'right':
            newX = maxX - obj.width;
            break;
          case 'top':
            newY = minY;
            break;
          case 'middle':
            newY = centerY - obj.height / 2;
            break;
          case 'bottom':
            newY = maxY - obj.height;
            break;
        }

        return { id: obj.id, changes: { x: Number(newX.toFixed(2)), y: Number(newY.toFixed(2)) } };
      });

      updateMultipleObjects(updates);
    },
    [selectedIds, project.objects, recordHistorySnapshot, updateMultipleObjects]
  );

  // Distribution
  const distributeSelected = useCallback(
    (type: 'horizontal' | 'vertical') => {
      if (selectedIds.length < 3) return;
      recordHistorySnapshot();

      const targets = [...project.objects.filter(o => selectedIds.includes(o.id))];

      if (type === 'horizontal') {
        targets.sort((a, b) => a.x - b.x);
        const minX = targets[0].x;
        const last = targets[targets.length - 1];
        const maxX = last.x + last.width;
        const totalObjWidth = targets.reduce((sum, o) => sum + o.width, 0);
        const totalSpacing = maxX - minX - totalObjWidth;
        const gap = totalSpacing / (targets.length - 1);

        let currentX = minX;
        const updates = targets.map(obj => {
          const res = { id: obj.id, changes: { x: Number(currentX.toFixed(2)) } };
          currentX += obj.width + gap;
          return res;
        });
        updateMultipleObjects(updates);
      } else {
        targets.sort((a, b) => a.y - b.y);
        const minY = targets[0].y;
        const last = targets[targets.length - 1];
        const maxY = last.y + last.height;
        const totalObjHeight = targets.reduce((sum, o) => sum + o.height, 0);
        const totalSpacing = maxY - minY - totalObjHeight;
        const gap = totalSpacing / (targets.length - 1);

        let currentY = minY;
        const updates = targets.map(obj => {
          const res = { id: obj.id, changes: { y: Number(currentY.toFixed(2)) } };
          currentY += obj.height + gap;
          return res;
        });
        updateMultipleObjects(updates);
      }
    },
    [selectedIds, project.objects, recordHistorySnapshot, updateMultipleObjects]
  );

  // Grouping
  const groupSelected = useCallback(() => {
    if (selectedIds.length < 2) return;
    recordHistorySnapshot();
    const groupId = 'group-' + Date.now();
    const updates = selectedIds.map(id => ({ id, changes: { groupId } }));
    updateMultipleObjects(updates);
  }, [selectedIds, recordHistorySnapshot, updateMultipleObjects]);

  const ungroupSelected = useCallback(() => {
    if (selectedIds.length === 0) return;
    recordHistorySnapshot();
    const updates = selectedIds.map(id => ({ id, changes: { groupId: undefined } }));
    updateMultipleObjects(updates);
  }, [selectedIds, recordHistorySnapshot, updateMultipleObjects]);

  // Repeat / Grid Duplication
  const repeatGridSelected = useCallback(
    (cols: number, rows: number, gapX: number, gapY: number) => {
      if (selectedIds.length === 0 || cols <= 0 || rows <= 0) return;
      recordHistorySnapshot();

      const targets = project.objects.filter(o => selectedIds.includes(o.id));
      const minX = Math.min(...targets.map(o => o.x));
      const minY = Math.min(...targets.map(o => o.y));
      const maxX = Math.max(...targets.map(o => o.x + o.width));
      const maxY = Math.max(...targets.map(o => o.y + o.height));
      const groupW = maxX - minX;
      const groupH = maxY - minY;

      let maxZ = project.objects.reduce((max, o) => Math.max(max, o.zIndex), 0);
      const generatedObjects: VectorObject[] = [];

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (r === 0 && c === 0) continue; // Original is already at (0, 0)

          const offsetX = c * (groupW + gapX);
          const offsetY = r * (groupH + gapY);

          for (const obj of targets) {
            maxZ++;
            const newId = 'obj-grid-' + Date.now() + '-' + Math.floor(Math.random() * 10000);
            const duplicated: VectorObject = {
              ...JSON.parse(JSON.stringify(obj)),
              id: newId,
              name: `${obj.name} [R${r + 1}C${c + 1}]`,
              x: Number((obj.x + offsetX).toFixed(2)),
              y: Number((obj.y + offsetY).toFixed(2)),
              zIndex: maxZ,
            };
            generatedObjects.push(duplicated);
          }
        }
      }

      setProject(prev => ({
        ...prev,
        updatedAt: new Date().toISOString(),
        objects: [...prev.objects, ...generatedObjects],
      }));
    },
    [selectedIds, project.objects, recordHistorySnapshot]
  );

  // Clipboard operations
  const copy = useCallback(() => {
    if (selectedIds.length === 0) return;
    const toCopy = project.objects.filter(o => selectedIds.includes(o.id));
    clipboardRef.current = JSON.parse(JSON.stringify(toCopy));
  }, [selectedIds, project.objects]);

  const paste = useCallback(() => {
    if (!clipboardRef.current || clipboardRef.current.length === 0) return;
    recordHistorySnapshot();
    let maxZ = project.objects.reduce((max, o) => Math.max(max, o.zIndex), 0);
    const newIds: string[] = [];

    const newObjects = clipboardRef.current.map(obj => {
      maxZ++;
      const newId = 'obj-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
      newIds.push(newId);
      return {
        ...JSON.parse(JSON.stringify(obj)),
        id: newId,
        x: obj.x + 8,
        y: obj.y + 8,
        zIndex: maxZ,
      };
    });

    setProject(prev => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      objects: [...prev.objects, ...newObjects],
    }));
    setSelectedIds(newIds);
  }, [project.objects, recordHistorySnapshot]);

  const cut = useCallback(() => {
    copy();
    deleteSelected();
  }, [copy, deleteSelected]);

  // Unit and document settings
  const setUnit = useCallback((newUnit: Unit) => {
    setProject(prev => ({ ...prev, unit: newUnit }));
  }, []);

  const setPagePreset = useCallback(
    (preset: PagePreset, orientation: PageOrientation, customW?: number, customH?: number) => {
      recordHistorySnapshot();
      const dims = getPageDimensions(preset, orientation, customW, customH);
      setProject(prev => ({
        ...prev,
        page: {
          ...prev.page,
          preset,
          orientation,
          width: dims.width,
          height: dims.height,
        },
      }));
    },
    [recordHistorySnapshot]
  );

  const setGridConfig = useCallback((cfg: Partial<GridConfig>) => {
    setProject(prev => ({ ...prev, grid: { ...prev.grid, ...cfg } }));
  }, []);

  const setSnapConfig = useCallback((cfg: Partial<SnapConfig>) => {
    setProject(prev => ({ ...prev, snap: { ...prev.snap, ...cfg } }));
  }, []);

  const setProjectName = useCallback((name: string) => {
    setProject(prev => ({ ...prev, name }));
  }, []);

  const newDocument = useCallback(
    (preset: PagePreset = 'A4', orientation: PageOrientation = 'portrait') => {
      recordHistorySnapshot();
      const dims = getPageDimensions(preset, orientation);
      setProject({
        id: 'doc-' + Date.now(),
        name: 'Untitled Template',
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        unit: 'mm',
        page: {
          preset,
          width: dims.width,
          height: dims.height,
          orientation,
          margins: { top: 10, right: 10, bottom: 10, left: 10 },
        },
        grid: {
          show: true,
          spacing: 10,
          snap: true,
        },
        snap: {
          enabled: true,
          snapToGrid: true,
          snapToPage: true,
          snapToObjects: true,
          thresholdMm: 2.0,
        },
        objects: [],
      });
      setSelectedIds([]);
      setImportedRecords(null);
    },
    [recordHistorySnapshot]
  );

  // File save / open
  const saveProjectFile = useCallback(() => {
    const jsonString = JSON.stringify(project, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.toLowerCase().replace(/[^a-z0-9_-]/g, '-')}.design.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [project]);

  const loadProjectDocument = useCallback((doc: ProjectDocument) => {
    recordHistorySnapshot();
    const pageIdx = doc.activePageIndex || 0;
    let initialObjects = doc.objects;
    if (doc.pages && doc.pages.length > 0) {
      initialObjects = doc.pages[pageIdx]?.objects || doc.objects;
    }
    setProject({
      ...doc,
      activePageIndex: pageIdx,
      objects: initialObjects,
    });
    setActivePageIndexState(pageIdx);
    setSelectedIds([]);
    setImportedRecords(null);
  }, [recordHistorySnapshot]);

  const setActivePageIndex = useCallback((newIdx: number) => {
    setProject(prev => {
      if (!prev.pages || newIdx < 0 || newIdx >= prev.pages.length) return prev;
      const updatedPages = [...prev.pages];
      updatedPages[activePageIndex] = {
        ...updatedPages[activePageIndex],
        objects: prev.objects,
      };
      return {
        ...prev,
        activePageIndex: newIdx,
        pages: updatedPages,
        objects: updatedPages[newIdx].objects || [],
      };
    });
    setActivePageIndexState(newIdx);
    setSelectedIds([]);
  }, [activePageIndex]);

  const loadProjectFile = useCallback(async (file: File) => {
    const text = await file.text();
    try {
      const parsed = JSON.parse(text) as ProjectDocument;
      if (!parsed.page || !Array.isArray(parsed.objects)) {
        throw new Error('Invalid project file format: missing page or objects array.');
      }
      loadProjectDocument(parsed);
    } catch (e: any) {
      alert('Error loading project file: ' + (e?.message || e));
    }
  }, [loadProjectDocument]);

  // Export PDF & SVG
  const exportCurrentPdf = useCallback(async () => {
    const activeReplacements =
      importedRecords && importedRecords[activeRecordIndex]
        ? importedRecords[activeRecordIndex]
        : undefined;

    const baseName = project.name.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    const suffix =
      importedRecords && importedRecords.length > 1
        ? `-record-${activeRecordIndex + 1}`
        : '';

    if (project.pages && project.pages.length > 1) {
      // Sync active page objects before exporting
      const pagesToExport = project.pages.map((p, idx) =>
        idx === activePageIndex ? { ...p, objects: project.objects } : p
      );
      await exportMultiPagePdf(project.page, pagesToExport, `${baseName}${suffix}.pdf`, activeReplacements);
    } else {
      await exportToPdf(project.page, project.objects, `${baseName}${suffix}.pdf`, activeReplacements);
    }
  }, [project, importedRecords, activeRecordIndex, activePageIndex]);

  const exportCurrentSvg = useCallback(() => {
    const activeReplacements =
      importedRecords && importedRecords[activeRecordIndex]
        ? importedRecords[activeRecordIndex]
        : undefined;

    const svgStr = generateFullSvgString(project.page, project.objects, activeReplacements);
    const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.toLowerCase().replace(/[^a-z0-9_-]/g, '-')}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [project, importedRecords, activeRecordIndex]);

  // Placeholders
  const convertSelectedToPlaceholder = useCallback(
    (name: string, description: string) => {
      if (selectedIds.length === 0) return;
      recordHistorySnapshot();

      setProject(prev => ({
        ...prev,
        updatedAt: new Date().toISOString(),
        objects: prev.objects.map(obj => {
          if (selectedIds.includes(obj.id) && obj.type === 'text') {
            return {
              ...obj,
              placeholder: {
                isPlaceholder: true,
                name: name.trim(),
                description: description.trim(),
                defaultValue: obj.text,
              },
            };
          }
          return obj;
        }),
      }));
    },
    [selectedIds, recordHistorySnapshot]
  );

  const removePlaceholder = useCallback(
    (id: string) => {
      recordHistorySnapshot();
      setProject(prev => ({
        ...prev,
        objects: prev.objects.map(obj => {
          if (obj.id === id && obj.type === 'text') {
            return {
              ...obj,
              placeholder: undefined,
            };
          }
          return obj;
        }),
      }));
    },
    [recordHistorySnapshot]
  );

  // Template import & batch
  const importJsonDataString = useCallback((jsonStr: string) => {
    const { records } = parseImportedJsonData(jsonStr);
    setImportedRecords(records);
    setActiveRecordIndex(0);
    return { count: records.length };
  }, []);

  const clearImportedData = useCallback(() => {
    setImportedRecords(null);
    setActiveRecordIndex(0);
  }, []);

  const nextRecord = useCallback(() => {
    if (!importedRecords || importedRecords.length <= 1) return;
    setActiveRecordIndex(i => (i + 1) % importedRecords.length);
  }, [importedRecords]);

  const prevRecord = useCallback(() => {
    if (!importedRecords || importedRecords.length <= 1) return;
    setActiveRecordIndex(i => (i - 1 + importedRecords.length) % importedRecords.length);
  }, [importedRecords]);

  const setRecordIndex = useCallback(
    (idx: number) => {
      if (!importedRecords || idx < 0 || idx >= importedRecords.length) return;
      setActiveRecordIndex(idx);
    },
    [importedRecords]
  );

  const exportBatchPdfsAction = useCallback(
    async (format: 'merged' | 'zip', baseName: string) => {
      if (!importedRecords || importedRecords.length === 0) {
        alert('Please import JSON data records first.');
        return;
      }
      await exportBatchPdf(project.page, project.objects, importedRecords, baseName, format);
    },
    [project, importedRecords]
  );

  return (
    <DocumentContext.Provider
      value={{
        project,
        selectedIds,
        activeTool,
        zoom,
        pan,
        theme,
        activeModal,
        importedRecords,
        activeRecordIndex,
        canUndo,
        canRedo,
        setSelectedIds,
        setActiveTool,
        setZoom,
        setPan,
        setTheme,
        toggleTheme,
        setActiveModal,
        addObject,
        updateObject,
        updateMultipleObjects,
        deleteSelected,
        duplicateSelected,
        selectAll,
        bringForward,
        bringToFront,
        sendBackward,
        sendToBack,
        reorderObject,
        toggleLock,
        toggleVisibility,
        renameObject,
        alignSelected,
        distributeSelected,
        groupSelected,
        ungroupSelected,
        repeatGridSelected,
        trackpadTarget,
        setTrackpadTarget,
        isTrackpadOpen,
        setIsTrackpadOpen,
        activePageIndex,
        setActivePageIndex,
        loadProjectDocument,
        customFontFamilies,
        addCustomFontFamily,
        undo,
        redo,
        recordHistorySnapshot,
        copy,
        paste,
        cut,
        setUnit,
        setPagePreset,
        setGridConfig,
        setSnapConfig,
        setProjectName,
        newDocument,
        saveProjectFile,
        loadProjectFile,
        exportCurrentPdf,
        exportCurrentSvg,
        convertSelectedToPlaceholder,
        removePlaceholder,
        importJsonDataString,
        clearImportedData,
        nextRecord,
        prevRecord,
        setRecordIndex,
        exportBatchPdfsAction,
      }}
    >
      {children}
    </DocumentContext.Provider>
  );
};

export function useDocument(): DocumentContextType {
  const context = useContext(DocumentContext);
  if (!context) {
    throw new Error('useDocument must be used within a DocumentProvider');
  }
  return context;
}
