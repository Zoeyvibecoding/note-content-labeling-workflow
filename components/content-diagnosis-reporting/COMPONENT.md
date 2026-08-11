# 内容诊断与报告组件

只在用户确认 v2 打标过程文件后调用本组件。

1. 完整阅读 `.claude/skills/content-diagnosis-reporting/SKILL.md`、`docs/输入文件字段规范.md` 和 `docs/诊断与计算口径.md`。
2. 把已确认的每个 SPU v2 工作簿作为只读输入，不修改、不补写、不重新打标。
3. 按包内 Skill 执行字段校验、加权指标重算、IQR 排除、高优池识别、内容公式归纳、标题回补和 HTML 渲染。
4. 样本标题必须使用过程文件原始标题；缺失时运行 `src/resolve-titles.mjs`，按原笔记 `og:title`、页面标题、笔记 ID 的顺序回退，禁止 AI 改写。
5. 报告数据结论、子类结构、Bench 着色、内容公式与分页规则均以包内当前版本为准。
6. 本组件只生成不可变的本地报告版本；生成后返回父 Skill，由父 Skill 按 `references/report-contract.md` 完成独立 Vercel 发布与匿名验证。
7. 组件的计算或校验失败时停止，不得绕过错误进入发布阶段。
