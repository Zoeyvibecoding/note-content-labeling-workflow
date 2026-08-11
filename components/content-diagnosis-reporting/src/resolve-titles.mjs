import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { readSources } from "./workbook.mjs";
import { fetchOriginalTitle } from "./title-resolution.mjs";

function arg(name,fallback=null){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:fallback;}
const configPath=path.resolve(arg("--config","analysis-config.json"));
const config=JSON.parse(await fs.readFile(configPath,"utf8"));
const base=path.dirname(configPath);
config.sources=(config.sources||[]).map(s=>({...s,file:path.resolve(base,s.file)}));
const outputDir=path.resolve(base,config.output_dir||"output");
await fs.mkdir(outputDir,{recursive:true});
const outputPath=path.join(outputDir,"title-overrides.json");
let overrides={}; try{overrides=JSON.parse(await fs.readFile(outputPath,"utf8"));}catch{}
const {records}=await readSources(config);
const unresolved=[];
for(const record of records){
  if(String(record["Athena标题"]||"").trim()||overrides[record.noteId]) continue;
  const link=String(record["跳转链接"]||"").trim();
  if(!link){unresolved.push({noteId:record.noteId,reason:"缺少跳转链接"});continue;}
  try{
    const title=await fetchOriginalTitle(link);
    if(title) overrides[record.noteId]=title;
    else unresolved.push({noteId:record.noteId,link,reason:"页面未返回有效标题，请用浏览器读取 og:title"});
  }catch(error){unresolved.push({noteId:record.noteId,link,reason:`${error.message}，请用浏览器读取 og:title`});}
}
await fs.writeFile(outputPath,JSON.stringify(overrides,null,2),"utf8");
await fs.writeFile(path.join(outputDir,"title-resolution-unresolved.json"),JSON.stringify(unresolved,null,2),"utf8");
console.log(`已解析 ${Object.keys(overrides).length} 个标题；仍缺失 ${unresolved.length} 个。`);
