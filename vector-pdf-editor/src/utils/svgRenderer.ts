import { VectorObject, PageConfig, FillStyle, StrokeStyle } from '../types/document';

/**
 * Builds the SVG gradient definitions from a list of vector objects
 */
export function buildSvgDefs(objects: VectorObject[]): string {
  let defs = '';

  for (const obj of objects) {
    if ('fill' in obj && obj.fill) {
      defs += getGradientDef(obj.id, 'fill', obj.fill);
    }
    if (obj.type === 'text') {
      defs += `<clipPath id="clip-text-${obj.id}"><rect x="0" y="0" width="${obj.width}" height="${obj.height}" /></clipPath>`;
    }
  }

  return defs;
}

export function getGradientDef(objId: string, prefix: string, fill: FillStyle): string {
  if (fill.type === 'linear') {
    const angleRad = ((fill.angle - 90) * Math.PI) / 180;
    const x1 = Math.round(50 + 50 * Math.cos(angleRad - Math.PI));
    const y1 = Math.round(50 + 50 * Math.sin(angleRad - Math.PI));
    const x2 = Math.round(50 + 50 * Math.cos(angleRad));
    const y2 = Math.round(50 + 50 * Math.sin(angleRad));

    const stops = fill.stops
      .map(
        s =>
          `<stop offset="${(s.offset * 100).toFixed(1)}%" stop-color="${s.color}" stop-opacity="${s.opacity}" />`
      )
      .join('');

    return `<linearGradient id="${prefix}-grad-${objId}" x1="${x1}%" y1="${y1}%" x2="${x2}%" y2="${y2}%">${stops}</linearGradient>`;
  }

  if (fill.type === 'radial') {
    const stops = fill.stops
      .map(
        s =>
          `<stop offset="${(s.offset * 100).toFixed(1)}%" stop-color="${s.color}" stop-opacity="${s.opacity}" />`
      )
      .join('');

    return `<radialGradient id="${prefix}-grad-${objId}" cx="${fill.cx * 100}%" cy="${fill.cy * 100}%" r="50%">${stops}</radialGradient>`;
  }

  return '';
}

export function getFillAttribute(objId: string, fill: FillStyle): { fill: string; fillOpacity: number } {
  if (fill.type === 'none') {
    return { fill: 'none', fillOpacity: 1 };
  }
  if (fill.type === 'solid') {
    return { fill: fill.color, fillOpacity: fill.opacity };
  }
  if (fill.type === 'linear' || fill.type === 'radial') {
    return { fill: `url(#fill-grad-${objId})`, fillOpacity: fill.opacity };
  }
  return { fill: 'none', fillOpacity: 1 };
}

export function getStrokeAttribute(stroke: StrokeStyle): { stroke: string; strokeWidth: number; strokeOpacity: number; strokeDasharray?: string } {
  if (!stroke || stroke.type === 'none') {
    return { stroke: 'none', strokeWidth: 0, strokeOpacity: 1 };
  }
  return {
    stroke: stroke.color,
    strokeWidth: stroke.width,
    strokeOpacity: stroke.opacity,
    strokeDasharray: stroke.dashArray || undefined,
  };
}

export function getCharWidthMm(
  ch: string,
  fontSizeMm: number,
  letterSpacingMm = 0,
  isBold = false
): number {
  const boldFactor = isBold ? 1.08 : 1.0;
  let ratio = 0.54; // average proportional character width
  if (/[ijl\.,'!\:;\|`'\s]/.test(ch)) ratio = 0.28;
  else if (/[frtI]/.test(ch)) ratio = 0.36;
  else if (/[abcdeghkmnopqrstuvwxyz0-9]/.test(ch)) ratio = 0.54;
  else if (/[ABCEGHJKLNOPQRTUVXYZ]/.test(ch)) ratio = 0.68;
  else if (/[MWD@]/.test(ch)) ratio = 0.88;
  else if (/[mw%#&]/.test(ch)) ratio = 0.80;
  return fontSizeMm * ratio * boldFactor + letterSpacingMm;
}

export function estimateLineWidthMm(
  line: string,
  fontSizeMm: number,
  letterSpacingMm = 0,
  isBold = false
): number {
  let w = 0;
  for (let i = 0; i < line.length; i++) {
    w += getCharWidthMm(line[i], fontSizeMm, letterSpacingMm, isBold);
  }
  return w;
}

/**
 * Render single vector object to SVG string
 */
export function renderObjectToSvg(
  obj: VectorObject,
  activeReplacements?: Record<string, string>
): string {
  if (!obj.visible) return '';

  const transform = `transform="translate(${obj.x}, ${obj.y}) rotate(${obj.rotation || 0}, ${obj.width / 2}, ${obj.height / 2})" opacity="${obj.opacity}"`;

  switch (obj.type) {
    case 'rect': {
      const fill = getFillAttribute(obj.id, obj.fill);
      const stroke = getStrokeAttribute(obj.stroke);
      const dash = stroke.strokeDasharray ? `stroke-dasharray="${stroke.strokeDasharray}"` : '';
      return `<rect ${transform} width="${obj.width}" height="${obj.height}" rx="${obj.rx || 0}" ry="${obj.ry || 0}" fill="${fill.fill}" fill-opacity="${fill.fillOpacity}" stroke="${stroke.stroke}" stroke-width="${stroke.strokeWidth}" stroke-opacity="${stroke.strokeOpacity}" ${dash} />`;
    }

    case 'ellipse': {
      const fill = getFillAttribute(obj.id, obj.fill);
      const stroke = getStrokeAttribute(obj.stroke);
      const cx = obj.width / 2;
      const cy = obj.height / 2;
      const rx = obj.width / 2;
      const ry = obj.height / 2;
      const dash = stroke.strokeDasharray ? `stroke-dasharray="${stroke.strokeDasharray}"` : '';
      return `<ellipse ${transform} cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill.fill}" fill-opacity="${fill.fillOpacity}" stroke="${stroke.stroke}" stroke-width="${stroke.strokeWidth}" stroke-opacity="${stroke.strokeOpacity}" ${dash} />`;
    }

    case 'line': {
      const stroke = getStrokeAttribute(obj.stroke);
      const dash = stroke.strokeDasharray ? `stroke-dasharray="${stroke.strokeDasharray}"` : '';
      return `<line ${transform} x1="0" y1="0" x2="${obj.width}" y2="${obj.height}" stroke="${stroke.stroke}" stroke-width="${stroke.strokeWidth}" stroke-opacity="${stroke.strokeOpacity}" ${dash} stroke-linecap="round" />`;
    }

    case 'path': {
      const fill = getFillAttribute(obj.id, obj.fill);
      const stroke = getStrokeAttribute(obj.stroke);
      const dash = stroke.strokeDasharray ? `stroke-dasharray="${stroke.strokeDasharray}"` : '';
      return `<path ${transform} d="${obj.d}" fill="${fill.fill}" fill-opacity="${fill.fillOpacity}" stroke="${stroke.stroke}" stroke-width="${stroke.strokeWidth}" stroke-opacity="${stroke.strokeOpacity}" ${dash} stroke-linecap="round" stroke-linejoin="round" />`;
    }

    case 'image': {
      return `<image ${transform} href="${obj.src}" width="${obj.width}" height="${obj.height}" preserveAspectRatio="none" />`;
    }

    case 'svg': {
      // Inset raw SVG code wrapped in a g tag with viewBox / bounds
      return `<g ${transform}>${obj.svgCode}</g>`;
    }

    case 'text': {
      let displayText = obj.text;
      if (obj.placeholder?.isPlaceholder && activeReplacements && obj.placeholder.name in activeReplacements) {
        displayText = activeReplacements[obj.placeholder.name];
      }

      const fill = getFillAttribute(obj.id, obj.fill);
      const stroke = getStrokeAttribute(obj.stroke);
      const dash = stroke.strokeDasharray ? `stroke-dasharray="${stroke.strokeDasharray}"` : '';

      // Font size in mm for SVG: 1 pt = 25.4 / 72 mm ≈ 0.3528 mm
      const fontSizeMm = (obj.fontSize * 25.4) / 72;
      const letterSpacingMm = obj.letterSpacing || 0;
      const isBold = obj.fontWeight === 'bold' || obj.fontWeight === '700';

      let textAnchor = 'start';
      let textX = 0;
      if (obj.textAlign === 'center') {
        textAnchor = 'middle';
        textX = obj.width / 2;
      } else if (obj.textAlign === 'right') {
        textAnchor = 'end';
        textX = obj.width;
      }

      // Proportional word wrapping: wrap lines so text stays strictly within obj.width
      const rawParagraphs = (displayText || '').split('\n');
      const wrappedLines: string[] = [];

      for (const para of rawParagraphs) {
        if (!para) {
          wrappedLines.push('');
          continue;
        }
        const words = para.split(' ');
        let currentLine = '';

        for (const word of words) {
          const testLine = currentLine ? currentLine + ' ' + word : word;
          const testWidth = estimateLineWidthMm(testLine, fontSizeMm, letterSpacingMm, isBold);

          if (testWidth <= obj.width || !currentLine) {
            if (testWidth <= obj.width) {
              currentLine = testLine;
            } else {
              // Even a single word exceeds obj.width, break it by characters
              let rem = word;
              while (rem.length > 0) {
                let sliceLen = 1;
                while (
                  sliceLen < rem.length &&
                  estimateLineWidthMm(rem.slice(0, sliceLen + 1), fontSizeMm, letterSpacingMm, isBold) <= obj.width
                ) {
                  sliceLen++;
                }
                wrappedLines.push(rem.slice(0, sliceLen));
                rem = rem.slice(sliceLen);
              }
              currentLine = '';
            }
          } else {
            // Push currentLine and start fresh with word
            wrappedLines.push(currentLine);
            const wordWidth = estimateLineWidthMm(word, fontSizeMm, letterSpacingMm, isBold);
            if (wordWidth <= obj.width) {
              currentLine = word;
            } else {
              // Word exceeds obj.width, split character-by-character
              let rem = word;
              while (rem.length > 0) {
                let sliceLen = 1;
                while (
                  sliceLen < rem.length &&
                  estimateLineWidthMm(rem.slice(0, sliceLen + 1), fontSizeMm, letterSpacingMm, isBold) <= obj.width
                ) {
                  sliceLen++;
                }
                wrappedLines.push(rem.slice(0, sliceLen));
                rem = rem.slice(sliceLen);
              }
              currentLine = '';
            }
          }
        }
        if (currentLine) {
          wrappedLines.push(currentLine);
        }
      }

      const lineHeightMm = fontSizeMm * (obj.lineHeight || 1.2);
      // Strictly limit lines to available box height
      const maxVisibleLines = Math.max(1, Math.floor((obj.height + 0.2) / lineHeightMm));
      const visibleLines = wrappedLines.slice(0, maxVisibleLines);

      const tspans = visibleLines
        .map((line, idx) => {
          const dy = idx === 0 ? fontSizeMm * 0.85 : lineHeightMm;
          return `<tspan x="${textX}" dy="${dy}">${escapeXml(line)}</tspan>`;
        })
        .join('');

      return `<g ${transform}><defs><clipPath id="clip-text-${obj.id}"><rect x="0" y="0" width="${obj.width}" height="${obj.height}" /></clipPath></defs><g clip-path="url(#clip-text-${obj.id})"><text font-family="${obj.fontFamily || 'sans-serif'}" font-size="${fontSizeMm}" font-weight="${obj.fontWeight || 'normal'}" font-style="${obj.fontStyle || 'normal'}" text-anchor="${textAnchor}" letter-spacing="${letterSpacingMm}" fill="${fill.fill}" fill-opacity="${fill.fillOpacity}" stroke="${stroke.stroke}" stroke-width="${stroke.strokeWidth}" stroke-opacity="${stroke.strokeOpacity}" ${dash}>${tspans}</text></g></g>`;
    }

    default:
      return '';
  }
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, c => {
    switch (c) {
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '&':
        return '&amp;';
      case '\'':
        return '&apos;';
      case '"':
        return '&quot;';
      default:
        return c;
    }
  });
}

/**
 * Generate full standalone SVG string for export
 */
export function generateFullSvgString(
  page: PageConfig,
  objects: VectorObject[],
  replacements?: Record<string, string>
): string {
  const sorted = [...objects].sort((a, b) => a.zIndex - b.zIndex);
  const defs = buildSvgDefs(sorted);
  const elements = sorted.map(obj => renderObjectToSvg(obj, replacements)).join('\n  ');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${page.width}mm" height="${page.height}mm" viewBox="0 0 ${page.width} ${page.height}">
  <defs>
    ${defs}
  </defs>
  <rect width="${page.width}" height="${page.height}" fill="#ffffff" />
  ${elements}
</svg>`;
}
