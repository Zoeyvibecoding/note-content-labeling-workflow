import fs from "node:fs/promises";

export function validateResult(envelope, result) {
  const errors = [];
  if (result.rules_version !== envelope.rules_version) errors.push("rules_version mismatch");
  if (result.rules_hash !== envelope.rules_hash) errors.push("rules_hash mismatch");
  if (!result.audit_passed) errors.push("independent audit did not pass");
  if (result.status !== "finished") errors.push("workflow did not reach finish");
  if (!result.label) errors.push("label missing");
  const required = envelope.rules.workflow.required_completion_steps;
  for (const step of required) {
    if (!result.completed_steps?.includes(step)) errors.push(`required step not completed: ${step}`);
  }
  if (result.label === "同类横测" || result.label === "护肤方案 / 多品组合") {
    if ((result.product_instances?.length ?? 0) < 2) {
      errors.push("multi-product label without two evidenced product instances");
    }
  }
  if (result.label === "促销机制") {
    if (!Array.isArray(result.promotion_evidence) || result.promotion_evidence.length < 2) {
      errors.push("promotion label requires at least two concrete mechanism facts");
    }
    if (result.promotion_is_core !== true) {
      errors.push("promotion label requires promotion_is_core=true");
    }
    if (result.promotion_counterfactual_passed !== true) {
      errors.push("promotion label requires promotion_counterfactual_passed=true");
    }
  }
  return errors;
}

export function validateMediaReview(envelope, result) {
  const errors = [];
  if (result.rules_version !== envelope.rules_version) errors.push("rules_version mismatch");
  if (result.rules_hash !== envelope.rules_hash) errors.push("rules_hash mismatch");
  if (result.needs_media_review !== true) errors.push("needs_media_review must be true");
  if (result.status !== "blocked") errors.push("media-review workflow status must be blocked");
  if (result.current_step !== "blocked") errors.push("media-review current_step must be blocked");
  if (result.label) errors.push("media-review outcome must not contain a final label");
  const candidates = [
    result.candidate_label ?? result.candidate_1,
    result.candidate_fallback ?? result.candidate_2,
  ].filter(Boolean);
  if (candidates.length !== 2) errors.push("media-review outcome requires two candidates");
  if (new Set(candidates).size !== candidates.length) errors.push("media-review candidates must be distinct");
  if (!result.uncertainty_reason) errors.push("media-review uncertainty_reason missing");
  if (!result.missing_evidence) errors.push("media-review missing_evidence missing");
  if (!result.confidence) errors.push("media-review confidence missing");
  const audit = result.priority_path?.findLast?.((step) => step.step_id === "independent_audit");
  if (!audit || audit.decision !== "fail") {
    errors.push("media-review outcome requires a recorded failed independent audit");
  }
  if (!result.completed_steps?.includes("complete_reading")) {
    errors.push("media-review complete_reading step missing");
  }
  if (!result.completed_steps?.includes("excluded_data_check")) {
    errors.push("media-review excluded_data_check step missing");
  }
  return errors;
}

export function validateOutcome(envelope, result) {
  return result.needs_media_review === true
    ? validateMediaReview(envelope, result)
    : validateResult(envelope, result);
}

if (process.argv[1]?.endsWith("validate-result.mjs")) {
  const envelope = JSON.parse(await fs.readFile(process.argv[2], "utf8"));
  const result = JSON.parse(await fs.readFile(process.argv[3], "utf8"));
  const errors = validateOutcome(envelope, result);
  if (errors.length) throw new Error(errors.join("\n"));
  process.stdout.write(JSON.stringify({
    valid: true,
    label: result.label ?? null,
    needs_media_review: result.needs_media_review === true,
  }));
}
