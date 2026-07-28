# Embedded component contract

Before labeling any row:

1. Execute `scripts/fetch-rules.mjs`.
2. Use only the returned complete rules document and hash.
3. Start at `workflow.entry_step`.
4. Submit one node decision at a time to `scripts/workflow-engine.mjs`.
5. Do not expose or populate a final label before the engine reaches `finish`.
6. Execute `scripts/validate-result.mjs` before returning or persisting results.
7. For batches, execute `scripts/reconcile-batch.mjs` against the complete input
   manifest before export. Missing, duplicate, and extra outcomes block export.
8. At `promotion_check`, treat host, platform, livestream, and campaign words
   as hooks only. A promotion result requires two concrete mechanism facts,
   mechanism dominance, and a passed mechanism-deletion counterfactual.

The parent workflow may prepare content evidence and consume the validated
result. It may not reorder steps, count products independently, inherit an old
label, override a failed audit, or synthesize `待媒体复核` for a row that was not
processed. A media-review outcome must itself pass the component's review
contract.

The bundled `references/v10-rules.snapshot.json` is audit evidence only. Never
use it when the current online JSON cannot be fetched and completely validated.
