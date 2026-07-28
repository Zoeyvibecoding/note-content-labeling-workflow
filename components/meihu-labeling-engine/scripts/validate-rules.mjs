export const REQUIRED_TOP_LEVEL = [
  "schema_version",
  "rules_version",
  "scope",
  "reading_order",
  "evidence_priority",
  "excluded_data",
  "media_review_triggers",
  "families",
  "product_instance_policy",
  "anti_shortcuts",
  "workflow",
  "labels",
  "output_contract",
];
export const LABELS = [
  "促销机制",
  "同类横测",
  "护肤方案 / 多品组合",
  "单品主导",
  "观点价值",
  "身份阶段",
  "场景任务",
  "日常生活",
];
const LABEL_FIELDS = [
  "definition",
  "positive_test",
  "counterfactual_test",
  "required_evidence",
  "positive_examples",
  "negative_examples",
  "boundaries",
];

export function validateRules(rules) {
  const errors = [];
  for (const key of REQUIRED_TOP_LEVEL) {
    if (!(key in (rules ?? {}))) errors.push(`missing ${key}`);
  }
  for (const label of LABELS) {
    if (!rules?.labels?.[label]) {
      errors.push(`missing label ${label}`);
      continue;
    }
    for (const field of LABEL_FIELDS) {
      if (!(field in rules.labels[label])) errors.push(`${label} missing ${field}`);
    }
  }
  const steps = rules?.workflow?.steps ?? {};
  if (!rules?.workflow?.entry_step || !steps[rules.workflow.entry_step]) {
    errors.push("invalid workflow entry");
  }
  for (const [id, step] of Object.entries(steps)) {
    for (const key of ["next", "yes", "no", "pass", "fail", "on_validation_fail"]) {
      const target = step[key];
      if (typeof target === "string" && !steps[target]) {
        errors.push(`${id}.${key} points to missing ${target}`);
      }
    }
  }
  for (const id of rules?.workflow?.required_completion_steps ?? []) {
    if (!steps[id]) errors.push(`required step missing ${id}`);
  }
  return errors;
}

if (process.argv[1]?.endsWith("validate-rules.mjs")) {
  const fs = await import("node:fs/promises");
  const rules = JSON.parse(await fs.readFile(process.argv[2], "utf8"));
  const errors = validateRules(rules);
  if (errors.length) throw new Error(errors.join("\n"));
  process.stdout.write(JSON.stringify({ valid: true, version: rules.rules_version }));
}
