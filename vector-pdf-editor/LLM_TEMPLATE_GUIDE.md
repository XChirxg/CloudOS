# LLM Vector Template Generator & JSON Specification Guide

This guide explains how Large Language Models (LLMs like Gemini, Claude, and GPT-4) can design and generate high-precision, printable vector templates for the **Vector PDF Template Editor**.

---

## 1. System Prompt for LLMs

Copy and paste the prompt below into any LLM to instruct it to generate printable vector templates:

```text
You are an expert vector design engine for the Vector PDF Template Editor.
Your job is to generate a complete, high-precision printable vector template in pure JSON format.

### RULES
1. Output ONLY a valid JSON object matching the ProjectDocument schema below.
2. Do NOT output markdown fences (no ```json or ```), no intro or outro comments. Output raw JSON only.
3. Coordinates (x, y, width, height) are strictly in physical millimeters (mm).
4. For multi-card layouts (like flashcards or poker cards):
   - Group each card using "groupId": "card-1", "card-2", etc. (allows 1-click selection of the whole card).
   - Link repeated card duplicates using "linkGroupId": "deck-link" and matching "linkSlotId" ("border", "pill", "title", "body", "badge") so editing styles in one card automatically synchronizes across all cards.
5. For dynamic templating, mark variable text fields with:
   "placeholder": {
     "isPlaceholder": true,
     "name": "variable_name",
     "description": "User instruction for this field",
     "defaultValue": "Default preview text"
   }
6. Ensure all elements fit within page dimensions (margins of 8–10mm recommended).
```

---

## 2. Complete Document JSON Schema

```json
{
  "id": "tpl-custom-name",
  "name": "Document / Template Title",
  "version": "1.0.0",
  "createdAt": "2026-09-30T10:00:00.000Z",
  "updatedAt": "2026-09-30T10:00:00.000Z",
  "unit": "mm",
  "page": {
    "preset": "A4", // "A4" | "A3" | "Letter" | "PokerCard" | "YaadCard5x9.5" | "Custom"
    "width": 210,   // in mm
    "height": 297,  // in mm
    "orientation": "portrait", // "portrait" | "landscape"
    "margins": { "top": 10, "right": 10, "bottom": 10, "left": 10 }
  },
  "grid": {
    "show": true,
    "spacing": 5, // mm
    "snap": true
  },
  "snap": {
    "enabled": true,
    "snapToGrid": true,
    "snapToPage": true,
    "snapToObjects": true,
    "thresholdMm": 1.5
  },
  "syncLinkedDuplicates": true,
  "objects": [
    // Array of Vector Objects (see Section 3)
  ]
}
```

---

## 3. Supported Vector Object Types

### Text (`type: "text"`)
```json
{
  "id": "obj-title",
  "name": "Card Title",
  "type": "text",
  "x": 15,
  "y": 20,
  "width": 80,
  "height": 10,
  "rotation": 0,
  "opacity": 1.0,
  "locked": false,
  "visible": true,
  "zIndex": 1,
  "groupId": "group-card-1",
  "linkGroupId": "link-deck",
  "linkSlotId": "slot-title",
  "text": "Card Heading",
  "fontFamily": "Inter",
  "fontSize": 12,
  "fontWeight": "bold", // "normal" | "500" | "600" | "bold" | "700" | "800"
  "fontStyle": "normal", // "normal" | "italic"
  "textAlign": "left", // "left" | "center" | "right" | "justify"
  "lineHeight": 1.25,
  "letterSpacing": 0.2,
  "fill": { "type": "solid", "color": "#0f172a", "opacity": 1.0 },
  "stroke": { "type": "none", "color": "#000", "width": 0, "opacity": 0 },
  "placeholder": {
    "isPlaceholder": true,
    "name": "card_title",
    "description": "Title of the card",
    "defaultValue": "Card Heading"
  }
}
```

### Rectangle (`type: "rect"`)
```json
{
  "id": "obj-box",
  "name": "Outer Border",
  "type": "rect",
  "x": 10,
  "y": 10,
  "width": 60,
  "height": 90,
  "rotation": 0,
  "opacity": 1.0,
  "locked": false,
  "visible": true,
  "zIndex": 1,
  "rx": 2.5, // corner radius in mm
  "ry": 2.5,
  "fill": {
    "type": "linear",
    "angle": 135,
    "opacity": 1.0,
    "stops": [
      { "id": "s1", "offset": 0, "color": "#f8fafc", "opacity": 1.0 },
      { "id": "s2", "offset": 1, "color": "#e2e8f0", "opacity": 1.0 }
    ]
  },
  "stroke": {
    "type": "solid",
    "color": "#94a3b8",
    "width": 0.4,
    "opacity": 1.0,
    "dashArray": "2,2" // optional dashed line pattern
  }
}
```

### Ellipse (`type: "ellipse"`)
```json
{
  "id": "obj-badge",
  "name": "Badge Circle",
  "type": "ellipse",
  "x": 20,
  "y": 20,
  "width": 24,
  "height": 24,
  "rotation": 0,
  "opacity": 1.0,
  "locked": false,
  "visible": true,
  "zIndex": 2,
  "fill": { "type": "solid", "color": "#2563eb", "opacity": 1.0 },
  "stroke": { "type": "none", "color": "#000", "width": 0, "opacity": 0 }
}
```

### Line (`type: "line"`)
```json
{
  "id": "obj-divider",
  "name": "Divider Line",
  "type": "line",
  "x": 10,
  "y": 50,
  "width": 190,
  "height": 0,
  "rotation": 0,
  "opacity": 1.0,
  "locked": false,
  "visible": true,
  "zIndex": 3,
  "x2": 190,
  "y2": 0,
  "stroke": { "type": "solid", "color": "#cbd5e1", "width": 0.5, "opacity": 1.0 }
}
```

### SVG Path / Icon (`type: "path"` or `type: "svg"`)
```json
{
  "id": "obj-icon",
  "name": "Checkmark Icon",
  "type": "svg",
  "x": 15,
  "y": 15,
  "width": 8,
  "height": 8,
  "rotation": 0,
  "opacity": 1.0,
  "locked": false,
  "visible": true,
  "zIndex": 4,
  "svgCode": "<svg viewBox='0 0 24 24'><polyline points='20 6 9 17 4 12' fill='none' stroke='#16a34a' stroke-width='2'/></svg>"
}
```

---

## 4. Grouping & Linked Duplicates Architecture

### Card Grouping (`groupId`)
- Assign a shared `groupId` (e.g. `"card-1"`) to all elements belonging to one card.
- In the editor, clicking anywhere on that card will select all constituent objects together in a single click.

### Linked Duplicates (`linkGroupId` & `linkSlotId`)
- When designs are repeated across a sheet (such as 27 flashcards or 8 poker cards), set the same `linkGroupId` (e.g. `"yaadcard-deck"`) on all cards.
- Assign matching `linkSlotId` values to corresponding components:
  - `"border"` for the outer card rectangle
  - `"header-pill"` for category background
  - `"title"` for concept heading
  - `"summary"` for body text
  - `"tipbox"` for bottom formula/hint box
- When `syncLinkedDuplicates: true` is enabled in the editor, editing the color, font, size, or stroke of one card instantly synchronizes across all cards on the sheet!
- The individual card content and placeholders remain independent.

---

## 5. How to Load Templates in VectorStudio

1. **Via AI Modal**: Open Menu $\rightarrow$ **Template** $\rightarrow$ **AI / LLM Template Generator...** (or click **AI Generator** in the header). Paste JSON into tab 2 and click **"Apply to Canvas Editor"**.
2. **Via Template Picker**: Click **Templates** $\rightarrow$ **"My Templates"** to view and load cached custom templates.
3. **Auto-Load from Folder**: Place any `.template.json` files in `public/templates/index.json`. They are automatically detected and loaded into the template library.
