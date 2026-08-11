# Claude 项目入口

当用户要求从美护内容打标结果生成诊断或 HTML 报告时，必须使用 `.claude/skills/content-diagnosis-reporting/SKILL.md`。

执行边界：上游工作簿是外部输入。本项目从输入校验开始，不修改、不补写、不重新打标上游文件。所有事实只能来自通过校验的工作簿；AI 只负责对证据进行归纳，不得编造案例、指标或标签。
