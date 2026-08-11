# 美护内容诊断与 HTML 报告 Skill

这个代码包只负责第二段工作：**读取外部产出的打标结果文件 → 数据校验 → 指标计算与诊断底稿 → AI 提炼内容公式与行动建议 → 生成本地 HTML 报告**。

它不负责内容理解、不负责打标、不生成所谓 V2 过程文件，也不包含 Vercel 或其他公开发布能力。只要另一套 AI 产出的工作簿满足本包的字段契约和数值口径，就可以从校验开始运行。

## 最短使用方式

1. 阅读 [`docs/输入文件字段规范.md`](docs/输入文件字段规范.md)，让上游 AI 产出一个 SPU 一个工作簿。
2. 复制 `examples/analysis-config.example.json`，填入本品、竞品文件路径。
3. 安装依赖：`npm install`
4. 先校验：`node src/run.mjs --config analysis-config.json --validate-only`
5. 校验通过后生成诊断底稿：`node src/run.mjs --config analysis-config.json`
6. 若样本标题为空，运行 `node src/resolve-titles.mjs --config analysis-config.json`；网页受限时按 `output/title-resolution-unresolved.json` 用浏览器读取原笔记 `og:title`，写入 `output/title-overrides.json`。
7. Claude 按 `output/ai-diagnosis-task.md` 完成 `output/diagnosis-authored.json`，样本标题逐字复制 `resolvedTitle`。
8. 再运行同一命令，标题一致性校验通过后生成 `output/reports/v001/index.html`。

给 Claude Code 安装时，将整个目录交给它，并让它先读 `.claude/skills/content-diagnosis-reporting/SKILL.md`。

## 包内交付物

- `.claude/skills/.../SKILL.md`：给 AI 执行的完整 Skill。
- `src/`：字段校验、指标重算、IQR 剔除、诊断底稿和 HTML 渲染代码。
- `docs/`：给人审阅的输入协议、计算口径和验收清单。
- `examples/`：配置及输入外观示例。
- `tests/`：关键口径自动测试。

## 明确不做

- 不把表内现成的 CTR、CPTI、CPUV 当作可信计算源。
- 不在缺少原始分子或分母时猜测指标。
- 不从单篇笔记归纳“内容公式”。
- 不发布网站，不调用 Vercel，不覆盖任何既有报告。
