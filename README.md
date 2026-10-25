# ACAD Substation Layout Studio

**Live Vercel deployment:** https://acad-substation.vercel.app  
**GitHub repository:** https://github.com/puneetnarayan/acad_substation

A static JavaScript/HTML prototype for preparing panel schedules and a substation room plan preview, then exporting project data for a local AutoCAD workflow.

## Features
- Panel schedule editor with 30 illustrative sample panels
- Room dimensions and lineup controls
- Doors/windows and HT/LV bus-duct entry tables
- Live SVG plan preview
- Browser-local autosave (localStorage)
- Export panels CSV, project JSON, and CSV bundle
- Download a starter AutoLISP routine for local AutoCAD testing
- 30-row sample CSV at `samples/panels_sample_30.csv`

## Run locally
Open `index.html` in a modern browser. No build step or backend is required.

## Vercel
The app has been deployed to Vercel as a static site. The deployment is based on the `main` branch snapshot. Confirm the Vercel Git integration is connected if you want every future GitHub push to trigger automatic redeployment.

## AutoCAD workflow
1. Export the panel CSV from the browser.
2. Download `acad_substation.lsp` using the GUI button, or use the LISP file in this repository.
3. In full AutoCAD for Windows, use APPLOAD to load the LISP file.
4. Run `ACAD_SUBSTATION` and select the exported CSV.

The included LISP is a starter prototype: it draws panel footprints and labels only. It does not yet generate the room outline, dimensions, openings, detailed cutouts, bus ducts, or elevations. Validate the output on a test drawing before use. Those features are planned for subsequent iterations.

## Important engineering limitation
Sample dimensions are illustrative only. Verify all manufacturer drawings, working clearances, cable/bus-duct constraints, access/egress, statutory requirements, drawing units and layer standards. The tool does not certify design compliance.

## Data privacy
Project entries are stored in the current browser's localStorage and are not uploaded to an application backend. Export a JSON backup before clearing browser data.
