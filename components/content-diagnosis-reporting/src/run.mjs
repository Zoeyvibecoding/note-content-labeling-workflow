import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { readSources } from "./workbook.mjs";
import { prepareMetricValidity, buildAggregates, highPriorityPool } from "./metrics.mjs";
import { renderReport, emptyAuthored } from "./report.mjs";
import { validateAuthored } from "./authored-validation.mjs";

function arg(name, fallback=null) { const i=process.argv.indexOf(name); return i>=0?process.argv[i+1]:fallback; }
const configPath = path.resolve(arg("--config","analysis-config.json"));
const validateOnly = process.argv.includes("--validate-only");

async function nextVersion(root) {
  await fs.mkdir(root,{recursive:true}); const names=await fs.readdir(root);
  const nums=names.map(x=>/^v(\d{3})$/.exec(x)?.[1]).filter(Boolean).map(Number);
  return `v${String((nums.length?Math.max(...nums):0)+1).padStart(3,"0")}`;
}

function publicRecord(r) {
  const {_metric,...base}=r;
  return {...base, metrics:Object.fromEntries(Object.entries(_metric).map(([k,v])=>[k,{value:v.ratio,valid:v.valid,outlier:v.outlier}]))};
}

async function loadTitleOverrides(outputDir) {
  try { return JSON.parse(await fs.readFile(path.join(outputDir,"title-overrides.json"),"utf8")); }
  catch { return {}; }
}

async function main() {
  const config = JSON.parse(await fs.readFile(configPath,"utf8"));
  const base = path.dirname(configPath);
  config.sources = (config.sources||[]).map(s=>({...s,file:path.resolve(base,s.file)}));
  const outputDir = path.resolve(base,config.output_dir||"output"); await fs.mkdir(outputDir,{recursive:true});
  const loaded = await readSources(config);
  const exclusions = prepareMetricValidity(loaded.records,config);
  const errors = loaded.issues.filter(x=>x.level==="error");
  const validation = {generatedAt:new Date().toISOString(), analysisId:config.analysis_id, recordCount:loaded.records.length, sourceSummaries:loaded.sourceSummaries, issues:loaded.issues, errors:errors.length, warnings:loaded.issues.length-errors.length};
  await fs.writeFile(path.join(outputDir,"validation-report.json"),JSON.stringify(validation,null,2));
  await fs.writeFile(path.join(outputDir,"validation-report.html"),`<!doctype html><meta charset="utf-8"><title>数据校验报告</title><style>body{font-family:Arial,'PingFang SC';max-width:1100px;margin:40px auto;color:#14203a}table{width:100%;border-collapse:collapse}td,th{padding:10px;border:1px solid #dbe3ef;text-align:left}.error{color:#c22}.warning{color:#c70}</style><h1>数据校验报告</h1><p>读取 ${validation.recordCount} 篇；错误 ${validation.errors} 项；警告 ${validation.warnings} 项。</p><table><tr><th>级别</th><th>代码</th><th>SPU / Sheet / Row</th><th>说明</th></tr>${loaded.issues.map(i=>`<tr class="${i.level}"><td>${i.level}</td><td>${i.code}</td><td>${i.source||''} / ${i.sheet||''} / ${i.row||''}</td><td>${i.message}</td></tr>`).join("")}</table>`);
  if (errors.length) { console.error(`校验失败：${errors.length} 个错误。见 ${path.join(outputDir,"validation-report.html")}`); process.exitCode=2; return; }
  if (validateOnly) { console.log(`校验通过。见 ${path.join(outputDir,"validation-report.html")}`); return; }
  const aggregates = buildAggregates(loaded.records);
  const highPriority = highPriorityPool(loaded.records,aggregates.bySubcategory,config.high_priority);
  const titleOverrides=await loadTitleOverrides(outputDir);
  for (const record of highPriority) record.resolvedTitle=String(record["Athena标题"]||titleOverrides[record.noteId]||record.noteId);
  await fs.writeFile(path.join(outputDir,"metric-exclusions.json"),JSON.stringify(exclusions,null,2));
  await fs.writeFile(path.join(outputDir,"deterministic-diagnosis.json"),JSON.stringify({config:{...config,sources:config.sources.map(({file,...s})=>({...s,file:path.basename(file)}))},aggregates,highPriority:highPriority.map(publicRecord)},null,2));
  const task = `# AI 内容诊断任务\n\n只使用 deterministic-diagnosis.json 中的 highPriority 与聚合结果。先完整阅读 Skill 的公式规则。\n\n输出 diagnosis-authored.json，结构为：\n\n\`\`\`json\n${JSON.stringify(emptyAuthored(),null,2)}\n\`\`\`\n\nsummaries 的四条结论分别对应概览、本品内容、高优公式、本竞品比较，必须客观说明谁在哪个指标更好或更弱，并把数字放在括号中；不得写“适合”“建议承担”“负责扩量/转化”等代替业务目标判断的语句。内容公式必须提炼同一条“认知起点 → 意义转化机制 → 产品结论 → 可信性闭环”，再用 topic、scene、narrative、productRole、proof 五个字段呈现。至少两篇同品牌、同子类、双指标或三指标高优笔记支持完整机制；共同关键词、成分、人设或场景不构成公式。每篇 sample 包含 noteId、title、link；title 必须逐字复制 resolvedTitle，禁止改写。每项 action 必须包含 action、scope、method、acceptance。禁止补写输入中不存在的事实。`;
  await fs.writeFile(path.join(outputDir,"ai-diagnosis-task.md"),task);
  const authoredPath=path.join(outputDir,"diagnosis-authored.json");
  let authored=emptyAuthored(), authoredExists=true; try { authored=JSON.parse(await fs.readFile(authoredPath,"utf8")); } catch { authoredExists=false; await fs.writeFile(authoredPath,JSON.stringify(authored,null,2)); }
  if (authoredExists) {
    const authoredIssues=validateAuthored(authored,new Map(highPriority.map(r=>[r.noteId,r])));
    await fs.writeFile(path.join(outputDir,"authored-validation.json"),JSON.stringify(authoredIssues,null,2));
    if (authoredIssues.some(x=>x.level==="error")) { console.error(`AI 诊断结果校验失败。见 ${path.join(outputDir,"authored-validation.json")}`); process.exitCode=3; return; }
  }
  const version=await nextVersion(path.join(outputDir,"reports")); const versionDir=path.join(outputDir,"reports",version);
  await renderReport({config,aggregates,authored,validation,versionDir});
  await fs.writeFile(path.join(outputDir,"reports","manifest.json"),JSON.stringify({latest:version,generatedAt:new Date().toISOString(),analysisId:config.analysis_id},null,2));
  console.log(`完成：${path.join(versionDir,"index.html")}`);
}

main().catch(error=>{console.error(error);process.exitCode=1});
