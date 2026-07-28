# Parent skill integration

## Portable layout

Copy the complete `meihu-labeling-engine` folder without changing its internal
paths:

```text
parent-skill/
├── SKILL.md
└── components/
    └── meihu-labeling-engine/
        ├── COMPONENT.md
        ├── scripts/
        └── references/
```

## Parent instruction

Add this exact requirement to the parent workflow:

```markdown
For beauty-content labeling, completely read and execute
`components/meihu-labeling-engine/COMPONENT.md`. Treat the component result as
invalid unless its independent validator passes.
```

## Configuration

Set `MEIHU_RULES_URL` to the published `/api/rules/latest` endpoint, or pass the
endpoint as the first argument to `fetch-rules.mjs`. Do not package a mutable
copy of the rules inside the parent skill.

## Contract

The parent supplies complete note evidence. The component returns a validated
labeling result. The parent may not supply a previous label as evidence, resolve
state transitions, or persist a result whose validator failed.

For batch workflows, the parent must also supply a JSON input manifest containing
one object per source row with a unique `note_id`. Before writing any workbook,
run:

```bash
node scripts/reconcile-batch.mjs rules.json input-manifest.json results.json
```

The reconciler requires exact ID coverage and validates every finished or
media-review outcome. The parent must stop on a missing, duplicated, extra, or
invalid result. It must never convert absence from `results.json` into a review
status or fallback label.

For `促销机制`, the parent must preserve the component's three audit fields:
`promotion_evidence` (at least two concrete purchase facts),
`promotion_is_core=true`, and `promotion_counterfactual_passed=true`. Names such
as hosts, platforms, campaigns, or livestreams are not mechanism evidence by
themselves.
