---
name: meihu-labeling-engine
description: Strictly classify beauty, skincare, makeup, haircare, and body-care content using the complete current online labeling dictionary. Use when Codex must label notes, audit existing beauty-content labels, re-label spreadsheet rows, or embed the same non-skippable labeling workflow inside a larger skill. Always re-fetch the full rules, execute the server-defined state machine step by step, validate product instances, run counterfactual and neighbor checks, and return an auditable single label or a media-review result.
---

# Meihu labeling engine

Treat the online complete rules document as the only source of truth. Never rely
on remembered rules, copied label definitions, a previous label, or only the AI
protocol section.

This component embeds the transition engine, completeness validator, result
validator, integration contract, and a V10 audit snapshot. The snapshot at
`references/v10-rules.snapshot.json` proves what was packaged, but it is never
an execution fallback: live fetch failure must stop labeling.

## Required execution

1. Run `scripts/fetch-rules.mjs` at the start of every labeling task. Do not use
   a cached rules file when the live fetch fails.
2. Read and validate the complete fetched JSON. Require scope, reading order,
   evidence priority, excluded data, media-review triggers, both families,
   product-instance policy, anti-shortcuts, workflow, all eight complete label
   definitions, examples, boundaries, and the output contract.
3. Record `rules_version`, `rules_hash`, and `fetched_at`. Lock that exact
   document for the current run.
4. Use only the supplied process workbook fields; do **not** re-fetch or
   re-read underlying images or videos. Apply these fixed evidence chains:
   - **视频：ASR追溯文本（自动转录） → 一句话总结 → 正文 → 标题**。
   - **图文：Athena正文 → 图文内容结构 → 一句话总结 → 正文 → 标题**。
   Earlier fields always outrank later fields. If `Athena正文` and `正文` are
   duplicate representations, count them as one source rather than creating
   false corroboration. A missing earlier field does not permit fabricating
   evidence from a later field; record the limitation and continue only when
   the remaining evidence can support the state-machine decision.
5. Remove the previous label from the working context. Preserve it only in a
   separate `previous_label` audit field.
6. Follow `workflow.entry_step`. Evaluate only the current node. Do not predict
   a final label or select the next node.
7. Let `scripts/workflow-engine.mjs` resolve every transition. The model may
   provide a decision and evidence, but must not choose the next step.
8. At product-instance extraction, require a name, actual participation
   evidence, and content role for each counted product. Apply every invalid
   participation rule before calculating product count.
9. Require positive validation, the label-specific counterfactual test, neighbor
   exclusion, and independent audit before setting `label`.
10. Run `scripts/validate-result.mjs`. Do not write the label to a workbook or
   downstream system unless validation passes.
11. When evidence is insufficient, return two candidates, the uncertainty,
    missing media evidence, confidence, and `needs_media_review=true`. This must
    be a real blocked workflow outcome whose independent audit failed; never
    create a review record merely because a row was skipped, omitted from a
    batch, or absent from an intermediate result file.
12. Before any batch workbook export, run
    `scripts/reconcile-batch.mjs <rules.json> <input-manifest.json>
    <results.json>`. The input manifest and result set must contain the same
    unique note IDs. A missing, duplicated, or extra result is a hard failure.
13. The exporter may only persist outcomes that pass `validateOutcome`. It may
    not convert an unprocessed ID into `待媒体复核`, copy the previous label, or
    infer a fallback label. If reconciliation fails, return to the missing row,
    execute the state machine, validate its outcome, and rerun reconciliation.

## Batch coverage invariant

Treat coverage as part of labeling correctness, not as a reporting concern:

`unique input IDs = unique validated outcomes = exported rows`.

Every exported row must therefore be either:

- a `finished` result with a valid dictionary label and passed independent
  audit; or
- a `blocked` media-review result with two distinct candidates, explicit
  uncertainty, missing evidence, confidence, `needs_media_review=true`, and a
  recorded failed independent audit.

The literal text `待媒体复核` is a presentation status, not a dictionary label.
Never use it to hide an unprocessed row.

## Promotion hard gate

At `promotion_check`, treat `李佳琦`, `直播间`, `大促`, `618`, `双11`,
`年货节`, `必冲`, and similar words as hooks only. They trigger inspection but
never prove `促销机制`.

Set `promotion_check=yes` only when all three conditions hold:

1. Record at least two concrete purchase-mechanism facts, such as price,
   discount, gift configuration, purchase time, channel, bundle quantity, or
   membership benefit. A host name plus a generic phrase such as `机制很顶`
   does not count as two facts.
2. Show that the purchase mechanism, rather than product efficacy, texture,
   ingredients, usage, or results, organizes the title and the main body.
3. Run the exclusive counterfactual: after deleting all purchase-mechanism
   facts, the core promise must collapse. If a complete single-product
   problem—experience—technology—result—recommendation loop remains, set
   `promotion_check=no` and continue to the product-domain path.

For every final `促销机制` result, populate `promotion_evidence` with at least
two concrete facts, set `promotion_is_core=true`, and set
`promotion_counterfactual_passed=true`. The validator must reject the result
otherwise.

## Single-source synchronization

Rules are not edited inside this skill. Edit and publish the website's complete
JSON document once. The full HTML reads that JSON with `cache: no-store`, and
this skill fetches the same endpoint at the start of every run. Therefore a
published JSON change updates both consumers without copying definitions or
reordering steps in this folder.

## Parent-skill embedding

Copy this entire folder to
`components/meihu-labeling-engine/` inside the parent skill. Add this imperative
to the parent `SKILL.md`:

> For beauty-content labeling, completely read and execute
> `components/meihu-labeling-engine/COMPONENT.md`; do not copy, simplify, or
> bypass its workflow.

Use `references/integration.md` for the exact portable layout and invocation.
