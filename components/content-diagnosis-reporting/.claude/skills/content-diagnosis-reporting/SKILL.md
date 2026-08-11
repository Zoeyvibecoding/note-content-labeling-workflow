---
name: content-diagnosis-reporting
description: Validate completed beauty-content labeling workbooks, calculate weighted downstream metrics, diagnose own-vs-competitor content, synthesize evidence-backed content formulas, and render a local human-readable HTML report. Use only after upstream understanding and labeling are complete.
---

# Content Diagnosis & Reporting

## Scope

Start with externally produced, completed labeling workbooks. Do not create, confirm, merge, or alter the upstream process files. End with a versioned local HTML report. Never deploy or publish.

## Mandatory sequence

1. Read `docs/输入文件字段规范.md` and `docs/诊断与计算口径.md` completely.
2. Obtain an analysis config and one workbook per SPU. The config declares each SPU as `own` or `competitor`.
3. Run `node src/run.mjs --config <config> --validate-only`.
4. If validation has errors, stop. Give the user `validation-report.html` and the exact missing/invalid fields. Never silently downgrade a requested metric.
5. If validation passes, run `node src/run.mjs --config <config>`. This writes deterministic metrics, evidence pools, and `ai-diagnosis-task.md`.
6. Read every accepted evidence row used by a formula. Fill `diagnosis-authored.json` using its generated schema and the rules below.
7. Run the same build command again. Verify `reports/vNNN/index.html` is readable without network access.
8. Return the local HTML and validation report. Preserve prior report versions.

## Non-negotiable calculations

- CTR = sum(clicks) / sum(impressions).
- CPTI = sum(auction spend) / sum(new TI).
- CPUV = sum(third-party spend) / sum(offsite UV).
- Category, subcategory, and bench calculations always use ratio of sums, never the arithmetic mean of note-level ratios.
- High-priority classification uses each note's own-brand, same-subcategory bench: own notes compare only with own notes in that subcategory; competitor notes compare only with competitor notes in that subcategory.
- Zero/negative inputs are excluded only from the affected metric. CPTI and CPUV note-level costs are screened with the configured IQR rule before aggregation. Keep exclusion logs.
- Recompute from raw columns. Existing CTR/CPTI/CPUV columns are cross-check fields only.

## Content formula rules

A content formula is not a list of recurring nouns or surface content elements. It is the repeated meaning-conversion mechanism across multiple valid high-priority notes:

`认知起点 → 意义转化机制 → 产品结论 → 可信性闭环`

Use the following five fields only as the report delivery structure:

`选题切口 + 使用场景 + 叙事过程 + 产品角色 + 效果证明`

- Require at least two distinct double- or triple-metric high-priority notes from the same brand and subcategory, and require both notes to support the same complete conversion mechanism. One note can only be labeled an observation, never a formula.
- Each formula must cite sample note IDs, titles, links, metric evidence, and content evidence.
- Derive the maximum common causal structure. Shared ingredients, people, scenes, product words, or topic words alone do not constitute a formula.
- Never invent a cognitive starting point, causal relation, product meaning, or proof that is absent from the title, body, ASR, OCR, summary, or evidence fields.
- If a repeated mechanism lacks two valid high-priority samples because downstream data are missing, label it `高频候选公式`; do not present it as a verified high-priority formula.
- Separate competitor-exclusive, shared, and own-exclusive formulas using observed narrative presence, not metric superiority alone.
- Keep formulas that both sides execute strongly in the shared section.
- Never use the phrases “人无我有” or “人有我优” in the report.
- Do not use “读者” in formula descriptions.
- Never include zero-value or outlier notes as formula examples.

## Source-title integrity

- A sample-card title must be the exact Xiaohongshu title, preserving punctuation, spacing, symbols, and emoji. Never let AI rewrite, summarize, or beautify it.
- Resolve titles in this order: non-empty source-workbook title → original-note `og:title` → original page `<title>` with only the platform suffix removed → note ID.
- When the source title is empty, run `node src/resolve-titles.mjs --config <config>` before authoring formulas. If direct HTTP access is blocked, open the original note link in a browser, read `og:title`, and write the exact value to `output/title-overrides.json`.
- Authored validation must reject a sample title that differs from the resolved source title.

## Report requirements

Keep the report understandable to readers who did not join the analysis. Include:

1. Overview: scope, valid sample counts, spend, weighted metrics, concise findings.
2. Own-product content: major/subcategory structure and efficiency.
3. High-priority notes and formulas with note cards and optional covers.
4. Own vs competitor: structure, shared-subcategory efficiency, competitor-exclusive/shared/own-exclusive formulas.
5. Action List: action, applicable content, execution method, acceptance criteria.

Every chart must label categories and values directly. Explain CTR, CPTI, CPUV, Bench, and IQR on first use. Do not add filler narration. Do not show “bad samples.”

- Put each short conclusion immediately below its subsection title. State only which side/category performs better or worse and on which metric, with the supporting numbers in parentheses. Do not infer which business objective it is “suitable for.”
- In category tables, keep `大类·美垂` adjacent to its four subcategories and `大类·破圈` adjacent to its four subcategories. The grouped sections are collapsible but open by default.
- In the own-product subcategory detail table, color each metric against the own-product overall bench: CTR above bench is green and below bench is red; CPUV/CPTI below bench are green and above bench are red; equal or unavailable values remain neutral. Never use the competitor or combined-pool bench for this coloring.
- The subcategory-detail conclusion must cover three levels in order: overall Beauty Vertical vs Breakout comparison, internal performance differences among the four Beauty Vertical subcategories, and internal performance differences among the four Breakout subcategories. Name the strongest and weakest relevant metrics with values; never describe only one major category.
- Render exactly one section/page divider between adjacent report sections. Before delivery, reject consecutive divider elements and avoid combining an explicit divider with CSS `break-before`/`page-break-before` on the same boundary.
- Formula sample cards do not display covers by default.

## Local-only output

Generate immutable local versions under `output/reports/v001/`, `v002/`, etc. Never overwrite a prior version. This Skill contains no hosting step and must not request Vercel credentials.
