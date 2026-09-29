# Vector PDF Studio & Template Designer

A simple, professional, local-first web application for designing printable vector PDF documents and templates.

---

## 🌟 Key Highlights

- **Local-First & Zero-Server Mode**: Runs 100% in your browser. Double-click `dist/index.html` or launch the desktop shortcut without starting any server or installing node.
- **GitHub Pages Ready**: Completely self-contained single-file bundle that can be hosted statically on GitHub Pages.
- **Integrated in OSFiles**: Pre-configured as an official desktop app in OSFiles Web Desktop environment.
- **Both Light & Dark Theme**: Sleek toggle button in the top menu bar with persistent theme memory.
- **Real Physical Dimensions**: Work in `mm`, `cm`, or `inches` with resolution-independent vector rendering.
- **True Vector PDF Export**: Uses client-side vector drawing (`jsPDF` + `svg2pdf.js`) preserving crisp vector shapes, real selectable text, gradients, and images at exact print dimensions.
- **JSON Placeholders & AI Schema**: Mark text fields as `{{placeholders}}` with descriptions. Export clean JSON data templates and schema metadata for LLMs / automated systems.
- **Batch Multi-PDF Generation**: Import arrays of JSON records to automatically generate individual PDFs in a ZIP archive or a merged multi-page PDF.
- **Magnetic Snapping**: Snap to grid, page boundaries, page center, object edges, and object centers with dynamic alignment guide lines.
- **Repeat / Grid Duplication**: Duplicate designs into precise grids (columns × rows with mm gaps) for certificates, labels, stickers, and cards.

---

## 🚀 How to Run

### 1. Zero-Server / Offline Mode (No Server Needed)
Simply open the built standalone HTML file directly in any web browser:
```bash
# Double click on:
dist/index.html

# Or from Linux terminal:
xdg-open /home/genius/Desktop/vector-pdf-editor/dist/index.html

# Or on Desktop:
Double-click "Vector PDF Studio" desktop icon
```

### 2. Within OSFiles Web Desktop
- Start OSFiles with `./start.sh`
- Open `http://localhost:8000`
- Click the **Vector PDF Studio** desktop icon or launch it from the Start Menu.

### 3. Local Development Server
```bash
npm install
npm run dev
```

### 4. Build Standalone Bundle
```bash
npm run build
```
This produces `dist/index.html` (self-contained single-file bundle containing all HTML, CSS, JavaScript, and fonts inline).

---

## 📐 Units & Print Accuracy

- **Units**: Millimeters (`mm`), Centimeters (`cm`), Inches (`inch`).
- **Standard Presets**:
  - A4 Portrait: `210 × 297 mm`
  - A4 Landscape: `297 × 210 mm`
  - A3 Portrait: `297 × 420 mm`
  - A3 Landscape: `420 × 297 mm`
  - Letter: `215.9 × 279.4 mm`
  - Custom: Enter exact width and height in any unit.
- **Precision**: Calculations use high-precision physical millimeter coordinates independent of display zoom.

---

## 🎨 Vector Tools & Features

- **Select & Move** (`V`): Bounding box with 8 resize handles, rotation, and magnetic snapping.
- **Text** (`T`): Font family, font size (pt), bold, italic, alignment, line height, letter spacing, placeholder conversion.
- **Rectangle** (`R`): Width, height, corner radius (`rx`/`ry`), solid/gradient fill, stroke.
- **Ellipse** (`O`): Width, height, radial/linear gradients, stroke.
- **Line** (`L`): Start/end coordinates, stroke color, stroke width, dashed styling.
- **Pen / Freehand** (`P`): Smooth vector path sketching.
- **Import Image** (`I`): Import PNG, JPG, WebP, SVG with aspect ratio locking.
- **Insert SVG Code**: Direct SVG code editor modal that parses vector XML and scales it losslessly.
- **Fills & Gradients**: Solid color, none, linear gradient (angle + multi-stops), radial gradient (center + stops).
- **Layers Panel**: Object hierarchy, visibility toggle (👁), lock toggle (🔒), rename, z-index reordering.
- **Alignment & Arrange**: Align left, center, right, top, middle, bottom; distribute horizontally/vertically; bring forward/send backward.
- **Repeat / Grid**: Tile designs into rows and columns with custom gap spacing.

---

## 🏷️ JSON Template & Batch Workflow

1. Design your printable document (e.g. certificate, badge, invoice, label).
2. Select any text element and click **"Make Placeholder"**.
3. Provide a variable name (e.g. `recipient_name`) and description (e.g. `Full legal name of the recipient`).
4. Click **Template → Export JSON Schema** to get:
   - Data JSON template (`{"recipient_name": ""}`)
   - Schema metadata JSON with descriptions for an LLM or script.
5. Provide data to an LLM or generate a JSON array of records.
6. Click **Template → Import JSON Data** and paste or upload the data.
7. Click **Batch Generate Multiple PDFs** to download all personalized PDFs in a ZIP archive or merged multi-page PDF.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Ctrl + Z` | Undo |
| `Ctrl + Shift + Z` / `Ctrl + Y` | Redo |
| `Ctrl + C` | Copy |
| `Ctrl + V` | Paste |
| `Ctrl + X` | Cut |
| `Ctrl + D` | Duplicate |
| `Delete` / `Backspace` | Delete selected |
| `Ctrl + A` | Select all |
| `Ctrl + S` | Save project (`.design.json`) |
| `Ctrl + O` | Open project (`.design.json`) |
| `Ctrl + E` | Export PDF |
| `Arrow Keys` | Nudge 1 mm |
| `Shift + Arrow Keys` | Nudge 5 mm |
| `Space + Drag` / `H` | Pan canvas |
