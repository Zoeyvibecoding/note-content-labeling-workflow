const FORMULA_SECTIONS = ["ownFormulas", "competitorExclusive", "shared", "ownExclusive"];
const FORMULA_FIELDS = ["subcategory", "title", "topic", "scene", "narrative", "productRole", "proof"];

export function validateAuthored(authored, acceptedNotes = new Map()) {
  const issues = [];
  for (const field of ["overview","ownContent","highPriority","comparison"]) {
    const value=String(authored?.summaries?.[field]??"").trim();
    if (!value) issues.push({level:"error",code:"MISSING_SECTION_SUMMARY",field,message:`缺少板块结论 summaries.${field}`});
    if (/(适合|建议承担|负责扩量|负责转化)/u.test(value)) issues.push({level:"error",code:"PRESCRIPTIVE_SECTION_SUMMARY",field,message:`板块结论只陈述表现差异，不代替业务目标判断：${value}`});
  }
  for (const section of FORMULA_SECTIONS) {
    if (!Array.isArray(authored?.[section])) {
      issues.push({level:"error", code:"INVALID_FORMULA_SECTION", section, message:`${section} 必须为数组`});
      continue;
    }
    authored[section].forEach((formula,index)=>{
      for (const field of FORMULA_FIELDS) if (!String(formula?.[field]??"").trim()) issues.push({level:"error",code:"MISSING_FORMULA_FIELD",section,index,field,message:`公式缺少 ${field}`});
      const samples = Array.isArray(formula?.samples)?formula.samples:[];
      const unique = new Set(samples.map(s=>String(s.noteId??"").trim()).filter(Boolean));
      if (unique.size<2) issues.push({level:"error",code:"INSUFFICIENT_FORMULA_SAMPLES",section,index,message:"内容公式至少需要两篇不同的有效笔记"});
      for (const sample of samples) {
        const id=String(sample?.noteId??"").trim();
        if (acceptedNotes.size && !acceptedNotes.has(id)) {
          issues.push({level:"error",code:"SAMPLE_NOT_HIGH_PRIORITY",section,index,noteId:id,message:`样本 ${id} 不在有效高优池中`});
          continue;
        }
        const expected=acceptedNotes.get(id)?.resolvedTitle;
        if (expected && String(sample?.title??"") !== expected) issues.push({level:"error",code:"SAMPLE_TITLE_MISMATCH",section,index,noteId:id,message:`样本 ${id} 标题必须与原始标题完全一致`,expected,actual:String(sample?.title??"")});
      }
    });
  }
  if (!Array.isArray(authored?.actions)) issues.push({level:"error",code:"INVALID_ACTIONS",message:"actions 必须为数组"});
  else authored.actions.forEach((action,index)=>{
    for (const field of ["action","scope","method","acceptance"]) if (!String(action?.[field]??"").trim()) issues.push({level:"error",code:"MISSING_ACTION_FIELD",index,field,message:`Action 缺少 ${field}`});
  });
  return issues;
}
