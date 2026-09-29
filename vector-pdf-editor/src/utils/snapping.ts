import { VectorObject, PageConfig, GridConfig, SnapConfig, SnapGuide } from '../types/document';

interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SnapResult {
  snappedX: number;
  snappedY: number;
  guides: SnapGuide[];
}

export function computeSnapping(
  target: BoundingBox,
  activeIds: string[],
  allObjects: VectorObject[],
  page: PageConfig,
  grid: GridConfig,
  snap: SnapConfig
): SnapResult {
  if (!snap.enabled) {
    return { snappedX: target.x, snappedY: target.y, guides: [] };
  }

  const threshold = snap.thresholdMm || 1.8; // mm threshold for magnetic snap
  let snappedX = target.x;
  let snappedY = target.y;
  const guides: SnapGuide[] = [];

  const targetLeft = target.x;
  const targetCenterX = target.x + target.width / 2;
  const targetRight = target.x + target.width;

  const targetTop = target.y;
  const targetCenterY = target.y + target.height / 2;
  const targetBottom = target.y + target.height;

  // Candidate vertical lines (X positions)
  const xCandidates: { x: number; type: SnapGuide['type']; sourceY1: number; sourceY2: number }[] = [];

  // Candidate horizontal lines (Y positions)
  const yCandidates: { y: number; type: SnapGuide['type']; sourceX1: number; sourceX2: number }[] = [];

  // 1. Page candidates
  if (snap.snapToPage) {
    // Left edge
    xCandidates.push({ x: 0, type: 'page-edge', sourceY1: 0, sourceY2: page.height });
    // Center
    xCandidates.push({ x: page.width / 2, type: 'page-center', sourceY1: 0, sourceY2: page.height });
    // Right edge
    xCandidates.push({ x: page.width, type: 'page-edge', sourceY1: 0, sourceY2: page.height });

    // Top edge
    yCandidates.push({ y: 0, type: 'page-edge', sourceX1: 0, sourceX2: page.width });
    // Center
    yCandidates.push({ y: page.height / 2, type: 'page-center', sourceX1: 0, sourceX2: page.width });
    // Bottom edge
    yCandidates.push({ y: page.height, type: 'page-edge', sourceX1: 0, sourceX2: page.width });
  }

  // 2. Object candidates
  if (snap.snapToObjects) {
    const otherObjects = allObjects.filter(obj => !activeIds.includes(obj.id) && obj.visible && !obj.locked);
    for (const obj of otherObjects) {
      const objLeft = obj.x;
      const objCenterX = obj.x + obj.width / 2;
      const objRight = obj.x + obj.width;

      const objTop = obj.y;
      const objCenterY = obj.y + obj.height / 2;
      const objBottom = obj.y + obj.height;

      // Vertical guide lines across object height
      xCandidates.push({ x: objLeft, type: 'object-edge', sourceY1: objTop, sourceY2: objBottom });
      xCandidates.push({ x: objCenterX, type: 'object-center', sourceY1: objTop, sourceY2: objBottom });
      xCandidates.push({ x: objRight, type: 'object-edge', sourceY1: objTop, sourceY2: objBottom });

      // Horizontal guide lines across object width
      yCandidates.push({ y: objTop, type: 'object-edge', sourceX1: objLeft, sourceX2: objRight });
      yCandidates.push({ y: objCenterY, type: 'object-center', sourceX1: objLeft, sourceX2: objRight });
      yCandidates.push({ y: objBottom, type: 'object-edge', sourceX1: objLeft, sourceX2: objRight });
    }
  }

  // 3. Grid candidates
  if (snap.snapToGrid && grid.show && grid.spacing > 0) {
    // Nearest grid lines
    const nearestGridLeft = Math.round(targetLeft / grid.spacing) * grid.spacing;
    const nearestGridCenter = Math.round(targetCenterX / grid.spacing) * grid.spacing;
    const nearestGridRight = Math.round(targetRight / grid.spacing) * grid.spacing;

    xCandidates.push({ x: nearestGridLeft, type: 'grid', sourceY1: 0, sourceY2: page.height });
    xCandidates.push({ x: nearestGridCenter, type: 'grid', sourceY1: 0, sourceY2: page.height });
    xCandidates.push({ x: nearestGridRight, type: 'grid', sourceY1: 0, sourceY2: page.height });

    const nearestGridTop = Math.round(targetTop / grid.spacing) * grid.spacing;
    const nearestGridCenterY = Math.round(targetCenterY / grid.spacing) * grid.spacing;
    const nearestGridBottom = Math.round(targetBottom / grid.spacing) * grid.spacing;

    yCandidates.push({ y: nearestGridTop, type: 'grid', sourceX1: 0, sourceX2: page.width });
    yCandidates.push({ y: nearestGridCenterY, type: 'grid', sourceX1: 0, sourceX2: page.width });
    yCandidates.push({ y: nearestGridBottom, type: 'grid', sourceX1: 0, sourceX2: page.width });
  }

  // Find best X snap
  let bestDeltaX = Infinity;
  let bestXGuide: SnapGuide | null = null;
  const targetXPoints = [
    { pos: targetLeft, offset: 0 },
    { pos: targetCenterX, offset: target.width / 2 },
    { pos: targetRight, offset: target.width }
  ];

  for (const candidate of xCandidates) {
    for (const point of targetXPoints) {
      const delta = candidate.x - point.pos;
      if (Math.abs(delta) < threshold && Math.abs(delta) < Math.abs(bestDeltaX)) {
        bestDeltaX = delta;
        const startY = Math.min(targetTop, candidate.sourceY1, 0);
        const endY = Math.max(targetBottom, candidate.sourceY2, page.height);
        bestXGuide = {
          orientation: 'vertical',
          position: candidate.x,
          start: startY,
          end: endY,
          type: candidate.type
        };
      }
    }
  }

  if (bestXGuide && Math.abs(bestDeltaX) < threshold) {
    snappedX = target.x + bestDeltaX;
    guides.push(bestXGuide);
  }

  // Find best Y snap
  let bestDeltaY = Infinity;
  let bestYGuide: SnapGuide | null = null;
  const targetYPoints = [
    { pos: targetTop, offset: 0 },
    { pos: targetCenterY, offset: target.height / 2 },
    { pos: targetBottom, offset: target.height }
  ];

  for (const candidate of yCandidates) {
    for (const point of targetYPoints) {
      const delta = candidate.y - point.pos;
      if (Math.abs(delta) < threshold && Math.abs(delta) < Math.abs(bestDeltaY)) {
        bestDeltaY = delta;
        const startX = Math.min(targetLeft, candidate.sourceX1, 0);
        const endX = Math.max(targetRight, candidate.sourceX2, page.width);
        bestYGuide = {
          orientation: 'horizontal',
          position: candidate.y,
          start: startX,
          end: endX,
          type: candidate.type
        };
      }
    }
  }

  if (bestYGuide && Math.abs(bestDeltaY) < threshold) {
    snappedY = target.y + bestDeltaY;
    guides.push(bestYGuide);
  }

  return { snappedX, snappedY, guides };
}
