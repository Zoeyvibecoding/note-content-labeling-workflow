import fs from "node:fs/promises";
import path from "node:path";

const esc = value => String(value ?? "").replace(/[&<>\"]/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const pct = v => v==null?"—":`${(v*100).toFixed(2)}%`;
const money = v => v==null?"—":`¥${v.toFixed(1)}`;
const metricValue = (k,v) => k==="ctr"?pct(v):money(v);

function benchClass(metric,value,bench) {
  if (value==null || bench==null || value===bench) return "";
  const better=metric==="ctr" ? value>bench : value<bench;
  return better ? "metric-good" : "metric-bad";
}

function cards(formulas=[]) {
  if (!formulas.length) return '<div class="empty">等待 AI 按诊断任务填入多样本内容公式。</div>';
  return formulas.map(f=>`<article class="formula"><span class="tag">${esc(f.subcategory)}</span><h3>${esc(f.title)}</h3><div class="steps">${["topic","scene","narrative","productRole","proof"].map(k=>`<div><b>${esc({topic:"选题切口",scene:"使用场景",narrative:"叙事过程",productRole:"产品角色",proof:"效果证明"}[k])}</b><span>${esc(f[k])}</span></div>`).join("")}</div><div class="samples">${(f.samples||[]).map(s=>`<a href="${esc(s.link||'#')}" target="_blank"><strong>${esc(s.title||s.noteId)}</strong><small>${esc(s.noteId)}</small></a>`).join("")}</div></article>`).join("");
}

export async function renderReport({config, aggregates, authored, validation, versionDir}) {
  const own = aggregates.byRole.own, comp = aggregates.byRole.competitor;
  const rows = Object.entries(aggregates.bySubcategory).map(([key,v])=>{const [role,label]=key.split("::");const cls=k=>role==="own"?benchClass(k,v.metrics[k].value,own?.metrics[k].value):"";return `<tr><td>${esc(role==="own"?"本品":"竞品")}</td><td>${esc(label)}</td><td>${v.count}</td><td class="${cls("ctr")}">${pct(v.metrics.ctr.value)}</td><td class="${cls("cpuv")}">${money(v.metrics.cpuv.value)}</td><td class="${cls("cpti")}">${money(v.metrics.cpti.value)}</td></tr>`}).join("");
  const html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(config.report_title)}</title><style>
:root{--ink:#111b32;--muted:#65728a;--line:#dbe3ef;--blue:#2864eb;--orange:#ed7119;--teal:#0c988d;--bg:#f5f8fc}*{box-sizing:border-box}body{margin:0;font-family:Inter,"PingFang SC",Arial,sans-serif;color:var(--ink);background:var(--bg)}header{background:linear-gradient(115deg,#0c172c,#1d385e);color:white;padding:64px max(6vw,40px)}header p{color:#aab9d1}main{max-width:1320px;margin:auto;padding:36px}.section{margin:32px 0}.title{display:flex;align-items:center;gap:14px;font-size:30px}.num{background:var(--blue);color:#fff;border-radius:11px;padding:7px 12px}.kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}.kpi,.panel,.formula{background:#fff;border:1px solid var(--line);border-radius:20px;padding:24px}.kpi b{font-size:30px}.kpi small{display:block;color:var(--muted);margin-top:6px}table{width:100%;border-collapse:collapse;background:#fff;border-radius:16px;overflow:hidden}th{background:var(--teal);color:white;text-align:left}th,td{padding:14px;border-bottom:1px solid var(--line);white-space:nowrap}.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:20px}.formula{position:relative}.tag{display:inline-block;border:1px solid var(--line);border-radius:9px;padding:7px 12px;font-weight:700}.steps{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin:18px 0}.steps div{background:#f2f6fc;padding:12px;border-radius:10px}.steps b,.steps span{display:block}.steps span{font-size:13px;color:var(--muted);margin-top:6px}.samples{display:flex;gap:10px;flex-wrap:wrap}.samples a{width:220px;text-decoration:none;color:var(--ink);border:1px solid var(--line);border-radius:12px;padding:10px}.samples strong,.samples small{display:block}.samples small{padding-top:6px;color:var(--muted)}.empty{padding:24px;border:1px dashed #aebbd0;color:var(--muted);border-radius:14px}@media(max-width:900px){.kpis,.grid,.steps{grid-template-columns:1fr}main{padding:20px}.panel{overflow:auto}}
.metric-good{color:#16a34a;font-weight:700}.metric-bad{color:#dc2626;font-weight:700}
</style></head><body><header><p>CONTENT ANALYSIS REPORT · LOCAL VERSION</p><h1>${esc(config.report_title)}</h1><p>${esc(config.analysis_id)} · 数据源 ${validation.sourceSummaries.length} 个 SPU · 有效读取 ${validation.recordCount} 篇</p></header><main>
<section class="section"><h2 class="title"><span class="num">1</span>报告概览</h2><p class="summary">${esc(authored?.summaries?.overview)}</p><div class="kpis"><div class="kpi"><b>${own?.count??0}篇</b><small>本品笔记</small></div><div class="kpi"><b>${pct(own?.metrics.ctr.value)}</b><small>本品加权 CTR</small></div><div class="kpi"><b>${money(own?.metrics.cpti.value)}</b><small>本品加权 CPTI</small></div></div></section>
<section class="section"><h2 class="title"><span class="num">2</span>本品内容大盘</h2><p class="summary">${esc(authored?.summaries?.ownContent)}</p><div class="panel"><table><thead><tr><th>身份</th><th>子类</th><th>笔记数</th><th>CTR</th><th>CPUV</th><th>CPTI</th></tr></thead><tbody>${rows}</tbody></table></div></section>
<section class="section"><h2 class="title"><span class="num">3</span>高优笔记与内容公式</h2><p class="summary">${esc(authored?.summaries?.highPriority)}</p><div class="grid">${cards(authored?.ownFormulas)}</div></section>
<section class="section"><h2 class="title"><span class="num">4</span>本品与竞品比较</h2><p class="summary">${esc(authored?.summaries?.comparison)}</p><div class="kpis"><div class="kpi"><b>${pct(comp?.metrics.ctr.value)}</b><small>竞品加权 CTR</small></div><div class="kpi"><b>${money(comp?.metrics.cpuv.value)}</b><small>竞品加权 CPUV</small></div><div class="kpi"><b>${money(comp?.metrics.cpti.value)}</b><small>竞品加权 CPTI</small></div></div><h3>竞品独占公式</h3><div class="grid">${cards(authored?.competitorExclusive)}</div><h3>共有公式</h3><div class="grid">${cards(authored?.shared)}</div><h3>本品独占公式</h3><div class="grid">${cards(authored?.ownExclusive)}</div></section>
<section class="section"><h2 class="title"><span class="num">5</span>Action List</h2><div class="panel"><table><thead><tr><th>动作</th><th>适用内容</th><th>执行方式</th><th>验收标准</th></tr></thead><tbody>${(authored?.actions||[]).map(a=>`<tr><td>${esc(a.action)}</td><td>${esc(a.scope)}</td><td>${esc(a.method)}</td><td>${esc(a.acceptance)}</td></tr>`).join("")||'<tr><td colspan="4">等待 AI 填入 Action List。</td></tr>'}</tbody></table></div></section>
<p style="color:var(--muted)">口径：CTR=Σ点击量÷Σ曝光量；CPTI=Σ竞价运营消耗÷Σ新增TI；CPUV=Σ三方消耗÷Σ站外UV。0值及配置的 IQR 极端值不进入对应效率指标。</p></main></body></html>`;
  await fs.mkdir(versionDir,{recursive:true}); await fs.writeFile(path.join(versionDir,"index.html"),html,"utf8");
}

export function emptyAuthored() { return {summaries:{overview:"",ownContent:"",highPriority:"",comparison:""},ownFormulas:[], competitorExclusive:[], shared:[], ownExclusive:[], actions:[]}; }
