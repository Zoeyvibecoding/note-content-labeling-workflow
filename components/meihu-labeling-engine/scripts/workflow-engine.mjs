export function createState(envelope, noteId = "") {
  return {
    note_id: noteId,
    rules_version: envelope.rules_version,
    rules_hash: envelope.rules_hash,
    current_step: envelope.rules.workflow.entry_step,
    candidate_label: null,
    candidate_fallback: null,
    completed_steps: [],
    priority_path: [],
    product_instances: [],
    label: null,
    audit_passed: false,
    status: "running",
  };
}

export function applyDecision(envelope, state, result) {
  const steps = envelope.rules.workflow.steps;
  const step = steps[state.current_step];
  if (!step) throw new Error(`Unknown current step ${state.current_step}`);
  if (result.step_id !== state.current_step) {
    throw new Error(`Expected ${state.current_step}, received ${result.step_id}`);
  }
  if (!Array.isArray(result.evidence) || result.evidence.length === 0) {
    throw new Error(`Evidence is required for ${state.current_step}`);
  }
  if (step.type === "extraction") {
    for (const product of result.product_instances ?? []) {
      for (const field of envelope.rules.product_instance_policy.required_fields) {
        if (!product[field]) throw new Error(`Product instance missing ${field}`);
      }
    }
    state.product_instances = result.product_instances ?? [];
  }
  state.completed_steps.push(state.current_step);
  state.priority_path.push({
    step_id: state.current_step,
    decision: result.decision,
    evidence: result.evidence,
    reasoning: result.reasoning,
  });
  if (step.type === "candidate") {
    state.candidate_label = step.label;
    state.candidate_fallback = step.on_validation_fail ?? null;
  }
  if (step.type === "audit") {
    if (result.decision !== "pass") {
      state.current_step = step.fail;
      state.status = "blocked";
      return state;
    }
    state.audit_passed = true;
  }
  let next;
  if (step.type === "decision") next = step[result.decision];
  else if (step.type === "validation") {
    next =
      result.decision === "pass"
        ? step.pass
        : state.candidate_fallback ?? step.on_validation_fail ?? step.fail;
  } else next = step.next ?? (result.decision === "pass" ? step.pass : step.fail);
  if (!next) throw new Error(`No legal transition from ${state.current_step}`);
  if (next === "finish") {
    if (!state.candidate_label || !state.audit_passed) {
      throw new Error("Final label blocked: candidate or audit missing");
    }
    state.label = state.candidate_label;
    state.status = "finished";
  }
  state.current_step = next;
  return state;
}
