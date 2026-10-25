import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const inputPath = path.join(repoRoot, "input", "substation_layout.json");
const outDxf = path.join(repoRoot, "generated", "substation_layout.dxf");
const outJson = path.join(repoRoot, "generated", "substation_layout.json");
const raw = JSON.parse(fs.readFileSync(inputPath, "utf8"));
const settings = raw.settings || {};
const n = Math.max(0, Math.min(20, Number(settings.cutoutCount ?? 4)));
const cutW = Math.max(0, Number(settings.cutoutWidth ?? 2000));
const roomX = Math.max(1000, Number(settings.roomX ?? 75000));
const roomY = Math.max(1000, Number(settings.roomY ?? 25000));
const rowCount = Math.max(1, Math.min(12, Number(settings.panelRows ?? 4)));
if (n * cutW >= roomY) throw new Error("Cutout strips consume the complete room depth.");
const lane = (roomY - n * cutW) / rowCount;
const panels = (raw.panels || []).filter(p => String(p.Draw ?? p.draw ?? "Yes").toLowerCase() !== "no").map((p, i) => {
  const row = Math.max(1, Math.min(rowCount, Number(p.Row ?? p.row ?? ((i % rowCount) + 1))));
  return { ...p, Panel_ID: p.Panel_ID || p.id || ("PNL-" + String(i + 1).padStart(2,"0")), Panel_Type: p.Panel_Type || p.type || "Other", Service: p.Service || p.service || "", Row: row, Width_mm: Number(p.Width_mm ?? p.width ?? 800), Depth_mm: Number(p.Depth_mm ?? p.depth ?? 1200), Height_mm: Number(p.Height_mm ?? p.height ?? settings.defaultHeight ?? 2200), Gap_After_mm: Number(p.Gap_After_mm ?? p.gap ?? settings.defaultGap ?? 10), Draw: "Yes" };
});
const rowCursor = new Map();
const placements = panels.map(p => {
  const row = p.Row, width = p.Width_mm, depth = p.Depth_mm;
  const x0 = Number(settings.startX ?? 1000), cursor = rowCursor.get(row) ?? x0;
  const gap = p.Gap_After_mm;
  const y = (row - 1) * (lane + cutW) + cutW + Number(settings.minRearWall ?? 1000);
  let x = cursor;
  if (settings.direction === "-x") x = roomX - cursor - width;
  rowCursor.set(row, cursor + width + gap);
  return { ...p, X_mm: x, Y_mm: y, Out_Of_Bounds: x < 0 || y < 0 || x + width > roomX || y + depth > roomY };
});
const pairs = (code, value) => String(code) + "\\n" + String(value) + "\\n";
function line(x1,y1,x2,y2,layer){return pairs(0,"LINE")+pairs(8,layer)+pairs(10,x1)+pairs(20,y1)+pairs(30,0)+pairs(11,x2)+pairs(21,y2)+pairs(31,0);}
function rect(x,y,w,h,layer){return line(x,y,x+w,y,layer)+line(x+w,y,x+w,y+h,layer)+line(x+w,y+h,x,y+h,layer)+line(x,y+h,x,y,layer);}
function text(x,y,height,value,layer="TEXT"){return pairs(0,"TEXT")+pairs(8,layer)+pairs(10,x)+pairs(20,y)+pairs(30,0)+pairs(40,height)+pairs(1,String(value).replace(/[\\r\\n]/g," "));}
const entities = [rect(0,0,roomX,roomY,"WALL"), text(roomX/2,roomY+600,250,(settings.projectName || "SUBSTATION")+" - PLAN")];
for(let i=0;i<n;i++){const y=i*(lane+cutW);entities.push(rect(0,y,roomX,cutW,"CUTOUT"),text(roomX/2,y+cutW/2,180,"CUTOUT "+(i+1)+" - "+cutW+" mm","CUTOUT"));}
for(const p of placements){entities.push(rect(p.X_mm,p.Y_mm,p.Width_mm,p.Depth_mm,"PANEL"),text(p.X_mm+p.Width_mm/2,p.Y_mm+p.Depth_mm/2,Math.max(80,Math.min(150,p.Width_mm/6)),p.Panel_ID+" R"+p.Row));}
for(const o of (raw.openings || [])){const position=Number(o.position ?? o.Position_mm ?? 0),width=Number(o.width ?? o.Width_mm ?? 0);if(o.wall==="South"||o.wall==="North"||o.Wall==="South"||o.Wall==="North"){const y=(o.wall||o.Wall)==="South"?0:roomY;entities.push(line(position,y-50,position+width,y+50,"OPENING"),text(position+width/2,y+100,120,o.id||o.Opening_ID||"OPENING","OPENING"));}}
for(const b of (raw.busDucts || raw.buses || [])){const x=Number(b.x ?? b.X_mm ?? 0),y=Number(b.y ?? b.Y_mm ?? 0),w=Number(b.width ?? b.Width_mm ?? 0),d=Number(b.depth ?? b.Depth_mm ?? 0);entities.push(rect(x-w/2,y-d/2,w,d,"BUSDuct"),text(x,y,120,b.id||b.BusDuct_ID||"BUSDUCT","BUSDuct"));}
entities.push(line(0,-800,roomX,-800,"DIMENSION"),line(-800,0,-800,roomY,"DIMENSION"),text(roomX/2,-700,150,"Room X "+roomX+" mm","DIMENSION"),text(-700,roomY/2,150,"Room Y "+roomY+" mm","DIMENSION"));
const layers=["WALL","CUTOUT","PANEL","TEXT","DIMENSION","OPENING","BUSDuct"];
let dxf=pairs(0,"SECTION")+pairs(2,"HEADER")+pairs(9,"$ACADVER")+pairs(1,"AC1009")+pairs(0,"ENDSEC")+pairs(0,"SECTION")+pairs(2,"TABLES")+pairs(0,"TABLE")+pairs(2,"LAYER")+pairs(70,layers.length);
layers.forEach((l,i)=>{dxf+=pairs(0,"LAYER")+pairs(2,l)+pairs(70,0)+pairs(62,i===0?7:i===1?30:i===2?5:7)+pairs(6,"CONTINUOUS");});
dxf+=pairs(0,"ENDTAB")+pairs(0,"ENDSEC")+pairs(0,"SECTION")+pairs(2,"ENTITIES")+entities.join("")+pairs(0,"ENDSEC")+pairs(0,"EOF");
const output = { ...raw, schema_version: 1, source_app:"acad_substation", updated_at:new Date().toISOString(), drawing_path:"generated/substation_layout.dxf", drawing_url:"https://raw.githubusercontent.com/puneetnarayan/acad_substation/main/generated/substation_layout.dxf", panels:placements, build:{panel_count:placements.length,cutout_count:n,cutout_width_mm:cutW,cutout_total_mm:n*cutW,room_x_mm:roomX,room_y_mm:roomY,out_of_bounds_panels:placements.filter(p=>p.Out_Of_Bounds).map(p=>p.Panel_ID)}, notes:[...(raw.notes||[]),"Generated automatically by scripts/generate-layout.mjs when input/substation_layout.json changes.","DXF is an exchange drawing; open it in AutoCAD and save as native DWG.","Engineering review is required before use."] };
fs.mkdirSync(path.dirname(outDxf), { recursive: true });
fs.writeFileSync(outDxf,dxf,"utf8");
fs.writeFileSync(outJson,JSON.stringify(output,null,2)+"\\n","utf8");
console.log(`Generated DXF with ${placements.length} panels; out-of-bounds: ${output.build.out_of_bounds_panels.length}`);
