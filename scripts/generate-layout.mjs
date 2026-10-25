import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const inputPath=path.join(root,"input","substation_layout.json");
const outDxf=path.join(root,"generated","substation_layout.dxf");
const outJson=path.join(root,"generated","substation_layout.json");
const raw=JSON.parse(fs.readFileSync(inputPath,"utf8"));
const s=raw.settings||{};
const roomX=Math.max(1000,Number(s.roomX??75000));
const roomY=Math.max(1000,Number(s.roomY??25000));
const startX=Math.max(0,Number(s.startX??2000));
const startY=Math.max(0,Number(s.startY??2000));
const cutN=Math.max(0,Math.min(20,Number(s.cutoutCount??4)));
const cutW=Math.max(0,Number(s.cutoutWidth??2000));
const rowCount=Math.max(1,Math.min(12,Number(s.panelRows??4)));
const catGap=Math.max(1000,Number(s.categoryGap??1000));
if(cutN*cutW+startY>=roomY)throw new Error("Cutout strips plus no-cutout wall-end setback exceed room depth.");
const lane=(roomY-startY-cutN*cutW)/rowCount;
const sourcePanels=(raw.panels||[]).filter(p=>String(p.Draw??p.draw??"Yes").toLowerCase()!=="no")
 .map((p,i)=>({...p,Panel_ID:p.Panel_ID||p.id||("PNL-"+String(i+1).padStart(2,"0")),Panel_Type:p.Panel_Type||p.type||"Other",Service:p.Service||p.service||"",Width_mm:Number(p.Width_mm??p.width??800),Depth_mm:Number(p.Depth_mm??p.depth??1200),Height_mm:Number(p.Height_mm??p.height??s.defaultHeight??2200),Gap_After_mm:Number(p.Gap_After_mm??p.gap??s.defaultGap??0),Draw:"Yes"}))
 .sort((a,b)=>Number(a.Lineup_Order??a.order??0)-Number(b.Lineup_Order??b.order??0));
let row=1,cursor=startX,previousCategory="",previousWidth=0,used=0;
const placements=[];
for(const p of sourcePanels){
 const category=String(p.category||p.Panel_Type||p.type||"Other");
 let changed=!!previousCategory&&category!==previousCategory;
 let longPanelGap=(p.Width_mm>2000||previousWidth>2000)?800:0;
 let actualGap=used?(changed?catGap:Math.max(0,p.Gap_After_mm,longPanelGap)):0;
 if(used&&cursor+actualGap+p.Width_mm>roomX-1000){row++;cursor=startX;previousCategory="";previousWidth=0;used=0;changed=false;actualGap=0;}
 if(row>rowCount)row=rowCount;
 cursor+=actualGap;
 const y=cutN?startY+(row-1)*(lane+cutW)+(cutW-p.Depth_mm)/2:startY+(row-1)*lane+(lane-p.Depth_mm)/2;
 const x=s.direction==="-x"?roomX-cursor-p.Width_mm:cursor;
 placements.push({...p,Row:row,X_mm:x,Y_mm:y,Category_Gap_mm:actualGap,Out_Of_Bounds:x<0||y<0||x+p.Width_mm>roomX||y+p.Depth_mm>roomY,Category:category});
 cursor+=p.Width_mm;
 previousCategory=category;previousWidth=p.Width_mm;used++;
}
const pair=(code,value)=>String(code)+"\n"+String(value)+"\n";
function line(x1,y1,x2,y2,layer){return pair(0,"LINE")+pair(8,layer)+pair(10,x1)+pair(20,y1)+pair(30,0)+pair(11,x2)+pair(21,y2)+pair(31,0);}
function rect(x,y,w,h,layer){return line(x,y,x+w,y,layer)+line(x+w,y,x+w,y+h,layer)+line(x+w,y+h,x,y+h,layer)+line(x,y+h,x,y,layer);}
function text(x,y,h,value,layer="TEXT"){return pair(0,"TEXT")+pair(8,layer)+pair(10,x)+pair(20,y)+pair(30,0)+pair(40,h)+pair(1,String(value).replace(/[\r\n]/g," "));}
const layerByType=t=>{t=String(t||"").toLowerCase();if(t.includes("33 kv"))return "CAT_33KV";if(t.includes("bus coupler"))return "CAT_66BC";if(t.includes("6.6 kv")||t.includes("6.6kv"))return "CAT_66KV";if(t.includes("lv vfd 3600"))return "CAT_LV36";if(t.includes("mv vfd"))return "CAT_MV";if(t.includes("pmcc"))return "CAT_PMCC";if(t.includes("imcc"))return "CAT_IMCC";if(t.includes("lv vfd 1500"))return "CAT_LV15";return "CAT_OTHER";};
const colors={WALL:7,CUTOUT:30,TEXT:7,DIMENSION:7,OPENING:4,BUSDuct:6,AHU:3,CAT_33KV:6,CAT_66KV:5,CAT_66BC:1,CAT_LV36:3,CAT_MV:30,CAT_PMCC:210,CAT_IMCC:200,CAT_LV15:2,CAT_OTHER:7};
const layers=Object.keys(colors),entities=[rect(0,0,roomX,roomY,"WALL"),text(roomX/2,roomY+600,250,(s.projectName||"SUBSTATION")+" - PLAN")];
for(let i=0;i<cutN;i++){const y=startY+i*(lane+cutW);entities.push(rect(0,y,roomX,cutW,"CUTOUT"),text(roomX/2,y+cutW/2,180,"CUTOUT "+(i+1)+" - "+cutW+" mm","CUTOUT"));}
for(const p of placements){const layer=layerByType(p.Panel_Type);entities.push(rect(p.X_mm,p.Y_mm,p.Width_mm,p.Depth_mm,layer),text(p.X_mm+p.Width_mm/2,p.Y_mm+p.Depth_mm/2,Math.max(80,Math.min(150,p.Width_mm/6)),p.Panel_ID+" R"+p.Row,layer));}
const legend=[["33 kV Switchboard","CAT_33KV"],["6.6 kV Switchboard / incomers","CAT_66KV"],["6.6 kV Bus Coupler","CAT_66BC"],["LV VFD 3600","CAT_LV36"],["MV VFD","CAT_MV"],["PMCC","CAT_PMCC"],["IMCC","CAT_IMCC"],["LV VFD 1500","CAT_LV15"]];
legend.forEach((item,i)=>{const x=roomX+500,y=roomY-i*250;entities.push(line(x,y,x+500,y,item[1]),text(x+600,y,120,item[0],item[1]));});
entities.push(line(0,-800,roomX,-800,"DIMENSION"),line(-800,0,-800,roomY,"DIMENSION"),text(roomX/2,-700,150,"Room X "+roomX+" mm","DIMENSION"),text(-700,roomY/2,150,"Room Y "+roomY+" mm","DIMENSION"));
let dxf=pair(0,"SECTION")+pair(2,"HEADER")+pair(9,"$ACADVER")+pair(1,"AC1009")+pair(0,"ENDSEC")+pair(0,"SECTION")+pair(2,"TABLES")+pair(0,"TABLE")+pair(2,"LAYER")+pair(70,layers.length);
layers.forEach(layer=>{dxf+=pair(0,"LAYER")+pair(2,layer)+pair(70,0)+pair(62,colors[layer])+pair(6,"CONTINUOUS");});
dxf+=pair(0,"ENDTAB")+pair(0,"ENDSEC")+pair(0,"SECTION")+pair(2,"ENTITIES")+entities.join("")+pair(0,"ENDSEC")+pair(0,"EOF");
const output={...raw,schema_version:1,source_app:"acad_substation",updated_at:new Date().toISOString(),drawing_path:"generated/substation_layout.dxf",drawing_url:"https://raw.githubusercontent.com/puneetnarayan/acad_substation/main/generated/substation_layout.dxf",panels:placements,build:{panel_count:placements.length,cutout_count:cutN,cutout_width_mm:cutW,cutout_total_mm:cutN*cutW,room_x_mm:roomX,room_y_mm:roomY,out_of_bounds_panels:placements.filter(p=>p.Out_Of_Bounds).map(p=>p.Panel_ID)},notes:[...(raw.notes||[]),"Generated automatically by GitHub Actions after each published input update.","Stable DXF/JSON URLs are used by the connected cablescheduling app.","DXF is an exchange drawing; native DWG requires AutoCAD Save As.","Engineering review is required before use."]};
fs.mkdirSync(path.dirname(outDxf),{recursive:true});fs.writeFileSync(outDxf,dxf,"utf8");fs.writeFileSync(outJson,JSON.stringify(output,null,2)+"\n","utf8");
console.log(JSON.stringify({dxf:outDxf,json:outJson,panel_count:placements.length,out_of_bounds:output.build.out_of_bounds_panels.length}));
