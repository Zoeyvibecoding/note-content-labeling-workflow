const FIELD = {
  ctr: {numerator:"点击量", denominator:"曝光量", better:"higher"},
  cpti: {numerator:"竞价运营消耗", denominator:"新增TI人群", better:"lower"},
  cpuv: {numerator:"三方消耗", denominator:"站外活跃UV", better:"lower"}
};

export function finiteNumber(value) {
  if (typeof value === "string") value = value.replace(/[¥￥,%\s,]/g, "");
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function quantile(sorted, q) {
  if (!sorted.length) return null;
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos), rest = pos - base;
  return sorted[base + 1] !== undefined ? sorted[base] + rest * (sorted[base + 1] - sorted[base]) : sorted[base];
}

export function iqrBounds(values, multiplier = 1.5) {
  const sorted = values.filter(Number.isFinite).sort((a,b)=>a-b);
  if (sorted.length < 4) return {lower:-Infinity, upper:Infinity, q1:null, q3:null, iqr:null};
  const q1 = quantile(sorted, .25), q3 = quantile(sorted, .75), iqr = q3-q1;
  return {lower:q1-multiplier*iqr, upper:q3+multiplier*iqr, q1, q3, iqr};
}

export function prepareMetricValidity(records, config = {}) {
  const multiplier = Number(config.outlier?.multiplier ?? 1.5);
  const exclusions = [];
  for (const rec of records) rec._metric = {};
  for (const metric of Object.keys(FIELD)) {
    const def = FIELD[metric];
    for (const rec of records) {
      const num = finiteNumber(rec[def.numerator]), den = finiteNumber(rec[def.denominator]);
      const valid = num !== null && den !== null && num > 0 && den > 0;
      rec._metric[metric] = {num, den, ratio:valid ? num/den : null, valid, outlier:false};
      if (!valid) exclusions.push({noteId:rec.noteId, spu:rec.spu, metric, reason:"缺失、非数字、负值或零值", numerator:num, denominator:den});
    }
    if (!["cpti", "cpuv"].includes(metric)) continue;
    const groups = new Map();
    for (const rec of records) {
      if (!rec._metric[metric].valid) continue;
      const key = config.outlier?.scope === "pool" ? "pool" : rec.spu;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(rec);
    }
    for (const [scope, group] of groups) {
      const bounds = iqrBounds(group.map(x=>x._metric[metric].ratio), multiplier);
      for (const rec of group) {
        const ratio = rec._metric[metric].ratio;
        if (ratio < bounds.lower || ratio > bounds.upper) {
          rec._metric[metric].valid = false; rec._metric[metric].outlier = true;
          exclusions.push({noteId:rec.noteId, spu:rec.spu, metric, reason:"IQR极端值", ratio, scope, bounds});
        }
      }
    }
  }
  return exclusions;
}

export function aggregate(records) {
  const result = {count:records.length, spend:records.reduce((s,r)=>s+(finiteNumber(r["竞价运营消耗"])||0),0), metrics:{}};
  for (const [metric, def] of Object.entries(FIELD)) {
    const valid = records.filter(r=>r._metric?.[metric]?.valid);
    const numerator = valid.reduce((s,r)=>s+r._metric[metric].num,0);
    const denominator = valid.reduce((s,r)=>s+r._metric[metric].den,0);
    result.metrics[metric] = {value:denominator>0?numerator/denominator:null, numerator, denominator, validNotes:valid.length};
  }
  return result;
}

export function buildAggregates(records) {
  const group = keyFn => Object.fromEntries([...new Set(records.map(keyFn))].map(key=>[key,aggregate(records.filter(r=>keyFn(r)===key))]));
  return {
    pool:aggregate(records),
    byRole:group(r=>r.role), bySpu:group(r=>r.spu), byMajor:group(r=>`${r.role}::${r.major}`),
    bySubcategory:group(r=>`${r.role}::${r.label}`), byMedia:group(r=>`${r.role}::${r.media}`)
  };
}

export function highPriorityPool(records, benches, options={}) {
  const minBetter = Number(options.min_better_metrics ?? 2);
  const requireAll = options.require_all_metrics_present !== false;
  return records.map(rec => {
    const bench = benches?.[`${rec.role}::${rec.label}`] || benches;
    const comparisons = {};
    for (const [metric, def] of Object.entries(FIELD)) {
      const value = rec._metric?.[metric]?.valid ? rec._metric[metric].ratio : null;
      const target = bench.metrics[metric].value;
      comparisons[metric] = value===null || target===null ? null : def.better==="higher" ? value>target : value<target;
    }
    const present = Object.values(comparisons).filter(v=>v!==null).length;
    const better = Object.values(comparisons).filter(Boolean).length;
    return {...rec, _highPriority:{accepted:(!requireAll||present===3)&&better>=minBetter, present, better, comparisons}};
  }).filter(r=>r._highPriority.accepted);
}
