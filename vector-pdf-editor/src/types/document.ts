export type Unit = 'mm' | 'cm' | 'inch';

export type PagePreset = 'A4' | 'A3' | 'Letter' | 'PokerCard' | 'YaadCard5x9.5' | 'Custom';
export type PageOrientation = 'portrait' | 'landscape';

export interface GradientStop {
  id: string;
  offset: number; // 0 to 1
  color: string;
  opacity: number; // 0 to 1
}

export interface LinearGradient {
  type: 'linear';
  angle: number; // 0 to 360 degrees
  stops: GradientStop[];
  opacity: number;
}

export interface RadialGradient {
  type: 'radial';
  cx: number; // 0 to 1
  cy: number; // 0 to 1
  stops: GradientStop[];
  opacity: number;
}

export interface SolidFill {
  type: 'solid';
  color: string;
  opacity: number;
}

export interface NoneFill {
  type: 'none';
}

export type FillStyle = SolidFill | NoneFill | LinearGradient | RadialGradient;

export interface StrokeStyle {
  type: 'solid' | 'none';
  color: string;
  width: number; // in mm
  opacity: number;
  dashArray?: string; // e.g. "2,2"
}

export interface PlaceholderMeta {
  isPlaceholder: boolean;
  name: string;
  description: string;
  defaultValue?: string;
}

export type ObjectType = 'text' | 'rect' | 'ellipse' | 'line' | 'path' | 'image' | 'svg' | 'group';

export interface BaseVectorObject {
  id: string;
  name: string;
  type: ObjectType;
  x: number; // mm
  y: number; // mm
  width: number; // mm
  height: number; // mm
  rotation: number; // degrees
  opacity: number; // 0 to 1
  locked: boolean;
  visible: boolean;
  zIndex: number;
  groupId?: string;
  pageId?: string; // For multi-page templates
  linkGroupId?: string; // Links duplicates so editing one updates all peers
  linkSlotId?: string;  // Role/slot within duplicate (e.g. "border", "title", "badge")
}

export interface TextObject extends BaseVectorObject {
  type: 'text';
  text: string;
  fontFamily: string;
  fontSize: number; // in pt
  fontWeight: 'normal' | 'bold' | '500' | '600' | '700' | '800';
  fontStyle: 'normal' | 'italic';
  textAlign: 'left' | 'center' | 'right' | 'justify';
  lineHeight: number; // multiplier, e.g. 1.2
  letterSpacing: number; // in mm
  fill: FillStyle;
  stroke: StrokeStyle;
  placeholder?: PlaceholderMeta;
}

export interface RectObject extends BaseVectorObject {
  type: 'rect';
  rx: number; // corner radius in mm
  ry: number;
  fill: FillStyle;
  stroke: StrokeStyle;
}

export interface EllipseObject extends BaseVectorObject {
  type: 'ellipse';
  fill: FillStyle;
  stroke: StrokeStyle;
}

export interface LineObject extends BaseVectorObject {
  type: 'line';
  x2: number; // offset or absolute mm
  y2: number;
  stroke: StrokeStyle;
  arrowStart?: boolean;
  arrowEnd?: boolean;
}

export interface PathObject extends BaseVectorObject {
  type: 'path';
  d: string;
  fill: FillStyle;
  stroke: StrokeStyle;
}

export interface ImageObject extends BaseVectorObject {
  type: 'image';
  src: string;
  naturalWidth: number;
  naturalHeight: number;
  aspectRatioLocked: boolean;
}

export interface SvgObject extends BaseVectorObject {
  type: 'svg';
  svgCode: string;
  viewBox?: string;
  fill?: FillStyle;
  stroke?: StrokeStyle;
}

export interface GroupObject extends BaseVectorObject {
  type: 'group';
  childIds: string[];
}

export type VectorObject =
  | TextObject
  | RectObject
  | EllipseObject
  | LineObject
  | PathObject
  | ImageObject
  | SvgObject
  | GroupObject;

export interface PageConfig {
  preset: PagePreset;
  width: number; // in mm
  height: number; // in mm
  orientation: PageOrientation;
  margins: {
    top: number; // mm
    right: number;
    bottom: number;
    left: number;
  };
}

export interface GridConfig {
  show: boolean;
  spacing: number; // in mm
  snap: boolean;
}

export interface SnapConfig {
  enabled: boolean;
  snapToGrid: boolean;
  snapToPage: boolean;
  snapToObjects: boolean;
  thresholdMm: number;
}

export interface SnapGuide {
  orientation: 'horizontal' | 'vertical';
  position: number; // in mm
  start: number; // in mm
  end: number; // in mm
  type: 'page-edge' | 'page-center' | 'object-edge' | 'object-center' | 'grid';
}

export interface CustomFont {
  id: string;
  name: string;
  type: 'upload' | 'google';
  urlOrData: string; // Base64 data URL or Google Fonts stylesheet URL
  format?: string; // 'woff2' | 'truetype' | 'opentype'
}

export interface DocumentPage {
  id: string;
  name: string; // e.g. "Front", "Back", "Page 1"
  objects: VectorObject[];
}

export interface ProjectDocument {
  id: string;
  name: string;
  version: string;
  createdAt: string;
  updatedAt: string;
  unit: Unit;
  page: PageConfig;
  grid: GridConfig;
  snap: SnapConfig;
  syncLinkedDuplicates?: boolean; // When true, changes to linked duplicate objects propagate
  objects: VectorObject[];
  pages?: DocumentPage[];
  activePageIndex?: number;
  customFonts?: CustomFont[];
}

export interface UserTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  thumbnailIcon?: string;
  createdAt: string;
  project: ProjectDocument;
}

export interface JsonTemplateSchema {
  template: string;
  version: string;
  fields: Record<string, {
    description: string;
    type?: string;
    default?: string;
  }>;
}

export type ToolType = 'select' | 'text' | 'rect' | 'ellipse' | 'line' | 'pen' | 'image' | 'pan';

export type TrackpadTarget =
  | 'xy'
  | 'x'
  | 'y'
  | 'wh'
  | 'width'
  | 'height'
  | 'rotation'
  | 'fontSize'
  | 'opacity'
  | 'strokeWidth'
  | 'rx';
