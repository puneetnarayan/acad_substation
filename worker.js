/**
 * ACAD Substation Cloudflare R2 storage API.
 * Bind an R2 bucket named PROJECTS and set STORAGE_TOKEN as a Worker secret.
 */
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, X-File-Name",
  "Access-Control-Max-Age": "86400",
  "Vary": "Origin"
};
function json(data, status=200) {
  return new Response(JSON.stringify(data), {status, headers:{...cors,"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}});
}
function safePlant(value) {
  let name=String(value||"").trim();
  for(const ch of ["/","\\","?","#","%"]) name=name.split(ch).join("-");
  name=name.slice(0,100);
  if(!name || name==="." || name==="..") return "";
  return name;
}
function authorized(request, env) {
  const expected=String(env.STORAGE_TOKEN||"");
  const auth=(request.headers.get("Authorization")||"").trim();
  const provided=(auth.slice(0,7).toLowerCase()==="bearer "?auth.slice(7):auth).trim();
  if(!expected || !provided || expected.length!==provided.length) return false;
  let diff=0; for(let i=0;i<expected.length;i++) diff |= expected.charCodeAt(i)^provided.charCodeAt(i);
  return diff===0;
}
export default {
  async fetch(request, env) {
    const url=new URL(request.url);
    if(request.method==="OPTIONS") return new Response(null,{status:204,headers:cors});
    if(!authorized(request,env)) return json({error:"Unauthorized. Check the Cloudflare storage access token."},401);
    if(!env.PROJECTS) return json({error:"R2 bucket binding PROJECTS is missing."},500);
    if(url.pathname==="/api/projects" && request.method==="GET") {
      const projects=[]; let cursor;
      do {
        const result=await env.PROJECTS.list({delimiter:"/",cursor,limit:1000});
        for(const prefix of result.delimitedPrefixes||[]) {
          const name=prefix.endsWith("/")?prefix.slice(0,-1):prefix;
          if(name) projects.push(name);
        }
        cursor=result.truncated?result.cursor:undefined;
      } while(cursor);
      return json({projects:[...new Set(projects)].sort((a,b)=>a.localeCompare(b))});
    }
    if(url.pathname==="/api/project") {
      const plant=safePlant(url.searchParams.get("plant"));
      if(!plant) return json({error:"A valid plant folder name is required."},400);
      const key=plant+"/ACAD_Substation_Template.xlsx";
      if(request.method==="GET") {
        const object=await env.PROJECTS.get(key);
        if(!object) return json({error:"No Excel workbook is stored for this plant yet."},404);
        const headers={...cors,"Content-Type":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet","Content-Disposition":'attachment; filename="ACAD_Substation_Template.xlsx"',"Cache-Control":"no-store"};
        object.writeHttpMetadata(headers); headers["Content-Length"]=String(object.size);
        return new Response(object.body,{headers});
      }
      if(request.method==="PUT") {
        const type=request.headers.get("Content-Type")||"";
        if(!type.includes("spreadsheetml") && !type.includes("application/octet-stream")) return json({error:"Only an Excel .xlsx workbook can be stored."},415);
        const length=Number(request.headers.get("Content-Length")||0);
        if(length>25*1024*1024) return json({error:"Workbook exceeds the 25 MB limit."},413);
        const body=await request.arrayBuffer();
        if(!body.byteLength) return json({error:"The uploaded workbook is empty."},400);
        if(body.byteLength>25*1024*1024) return json({error:"Workbook exceeds the 25 MB limit."},413);
        await env.PROJECTS.put(key,body,{httpMetadata:{contentType:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"},customMetadata:{plant,updatedAt:new Date().toISOString(),purpose:"ACAD Substation input workbook"}});
        return json({ok:true,plant,key,bytes:body.byteLength});
      }
      return json({error:"Method not allowed."},405);
    }
    return json({error:"Not found."},404);
  }
};
