# ACAD Substation — Cloudflare R2 project storage

This Worker stores **only the input Excel workbook** for each plant. Each plant is an R2 folder/prefix:

`<Plant Name>/ACAD_Substation_Template.xlsx`

Generated drawings, cable schedules, PDFs, DXFs, previews, and other outputs are deliberately not stored. They should be regenerated from the saved workbook whenever required.

## 1. Create the R2 bucket

In the Cloudflare dashboard, open **R2 Object Storage** and create a bucket named:

`acad-substation-projects`

## 2. Deploy the Worker

Install Wrangler and authenticate with your Cloudflare account, then from this repository folder run:

```bash
npx wrangler login
npx wrangler secret put STORAGE_TOKEN
npx wrangler deploy
```

When prompted for `STORAGE_TOKEN`, enter a long random secret. Do not commit this secret to GitHub or put it in source code. The included `wrangler.toml` binds the bucket as `PROJECTS`. If you choose a different bucket name, update `bucket_name` before deploying.

The Worker URL will look like `https://acad-substation-project-storage.<your-subdomain>.workers.dev`.

## 3. Connect the app

Open ACAD Substation and expand the **☁ Plant projects** panel in the sidebar. Under **Cloudflare connection**, enter the Worker URL and the same token used for the `STORAGE_TOKEN` secret, then click **Connect / test**.

- **Refresh** lists plant folders currently in R2.
- **Open** downloads that plant's stored workbook and imports its Excel sheets into the app. It asks before replacing current unsaved inputs.
- **Save Excel data** creates/updates `<plant name>/ACAD_Substation_Template.xlsx`.
- **New plant** selects a plant name for a new folder. Add/import the intended inputs, then save.

The Worker requires the bearer token for all API routes. The app stores the Worker URL in local storage and the access token only in the current browser session. Anyone with the token can read/write the stored project workbooks; share it only with authorized users.

## API

- `GET /api/projects` — list plant folders
- `GET /api/project?plant=<name>` — download workbook
- `PUT /api/project?plant=<name>` — create/replace workbook

Only `.xlsx` workbooks are accepted, up to 25 MB. No generated output files are uploaded.

## Important deployment note

This repository change does not deploy the Worker or the Vercel application. Deploy the Worker and configure the URL/token first. The ACAD Substation app can then be deployed separately when explicitly approved.
