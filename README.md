# ACAD Substation Layout Studio

**Live app:** https://acad-substation.vercel.app  
**Repository:** https://github.com/puneetnarayan/acad_substation

Static HTML/JavaScript engineering layout prototype for a 75,000 × 25,000 mm substation room with four 2,000 mm cutout strips, four panel rows, AHU area reservation, panel/opening/bus-duct inputs, geometry preview and CAD exports.

## Shared drawing integration

- Stable DXF: [generated/substation_layout.dxf](generated/substation_layout.dxf) — opens in AutoCAD; use **Save As → DWG** for a native DWG file.
- Stable JSON hand-off: [generated/substation_layout.json](generated/substation_layout.json) — panel identifiers, row numbers, X/Y coordinates, dimensions, openings, bus ducts and project settings.
- Source input: [input/substation_layout.json](input/substation_layout.json). This contains the illustrative sample until new project data is published.
- Raw DXF URL: https://raw.githubusercontent.com/puneetnarayan/acad_substation/main/generated/substation_layout.dxf
- Raw JSON URL: https://raw.githubusercontent.com/puneetnarayan/acad_substation/main/generated/substation_layout.json

GitHub Actions runs `scripts/generate-layout.mjs` when `input/substation_layout.json` changes and commits the refreshed DXF and JSON artifacts. This also supports replacing the source file directly in GitHub; the workflow then updates the stable drawing paths. The default committed DXF is generated from illustrative sample data.

In the web app, upload a panel CSV or exported project JSON, then use **Publish latest to GitHub**. First use requires a GitHub fine-grained token with **Contents: Read and write** permission scoped only to `puneetnarayan/acad_substation`. The static app holds the token in the current browser tab session only; it is never committed to the repository. Once connected in that tab, project edits and new uploads schedule publication automatically. The workflow then rebuilds the stable artifacts.

## In-app drawing preview and PDF
- Open **Plan preview** to inspect the current master layout directly in the app.
- Use **Zoom in**, **Zoom out**, and **Fit drawing** to inspect details.
- **Export A3 Landscape PDF** opens a print-ready vector drawing. Choose **Save as PDF** in the browser print dialog and confirm paper size A3 and orientation Landscape.
- The preview is rendered from the same current project model used by the DXF generator; it updates when layout inputs change. The PDF is vector-based for sharp lines/text. It is a review output, not a substitute for checking the generated DXF/DWG in AutoCAD.

## Master drawing rule
The ACAD layout is the physical-layout master. Cable route definition and cable scheduling must reference reviewed panel coordinates, room geometry, openings, cut-outs and busducts from this layout. Do not infer routes from sample data or treat the illustrative committed DXF as an approved project drawing. The cable app must keep unresolved geometry/route inputs flagged until they are supplied and reviewed.

## AutoCAD workflow

1. Open `generated/substation_layout.dxf` in AutoCAD 2026.
2. Review the room outline, cutout strips, panel footprints, labels, AHU area, openings, bus duct symbols and dimension guide lines.
3. Verify rows, access and all approved engineering dimensions.
4. Save a native copy as DWG only after review.

## Important limits

The committed DXF is a CAD exchange drawing, not a native DWG. Generated geometry has not been independently opened and checked in AutoCAD 2026. Dimension objects are currently guide lines and labels rather than a complete production dimension-style setup. Electrical, fire, structural, HVAC and statutory compliance require qualified engineering review. Sample dimensions and equipment data are illustrative until replaced by approved inputs.

## Data handling

Without GitHub publication, browser edits remain in browser localStorage. Published project inputs are committed to this repository so the other application can read the shared outputs. Do not publish confidential project data to a public repository.
