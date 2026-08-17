(() => {
  // The canonical JSON drives both the complete HTML and the packaged skill.
  const endpoint = "./rules/latest.json";

  function cardFromRule(item) {
    return {
      id: item.id,
      name: item.name,
      def: item.definition,
      core: item.positive_test,
      pos: item.positive_examples,
      neg: item.negative_examples,
      edge: item.boundaries,
    };
  }

  function buildProtocol(rules) {
    const steps = Object.entries(rules.workflow.steps)
      .map(([id, step], index) => {
        const text = step.instruction || step.question || `候选标签：${step.label || ""}`;
        const transitions = ["yes", "no", "next", "pass", "fail", "on_validation_fail"]
          .filter((key) => step[key])
          .map((key) => `${key}=${step[key]}`)
          .join("；");
        return `${index + 1}. [${id}] ${text}${transitions ? `（${transitions}）` : ""}`;
      })
      .join("\n");
    return [
      `ROLE: 你是美护内容结构分类器。当前规则版本：${rules.rules_version}。每篇只输出一个主标签。`,
      `\nCOMPLETE READING\n图文：${rules.reading_order.image_note.join(" ➜ ")}\n视频：${rules.reading_order.video_note.join(" ➜ ")}`,
      `\nEVIDENCE PRIORITY\n${rules.evidence_priority.map((x, i) => `${i + 1}. ${x}`).join("\n")}`,
      `\nEXCLUDED DATA\n${rules.excluded_data.join("、")}`,
      `\nNON-SKIPPABLE WORKFLOW\n入口：${rules.workflow.entry_step}\n${steps}`,
      `\nREQUIRED COMPLETION STEPS\n${rules.workflow.required_completion_steps.join(" ➜ ")}`,
      `\nPRODUCT INSTANCE POLICY\n有效：${rules.product_instance_policy.count_when.join("、")}\n无效：${rules.product_instance_policy.never_count_automatically.join("、")}`,
      `\nANTI-SHORTCUTS\n${rules.anti_shortcuts.map((x, i) => `${i + 1}. ${x}`).join("\n")}`,
      `\nOUTPUT CONTRACT\n${JSON.stringify(rules.output_contract, null, 2)}`,
      "\n若完整规则拉取、逐步执行或最终审计任一失败，停止打标，不得输出标签。",
    ].join("\n");
  }

  function showSyncState(message, failed = false) {
    let state = document.getElementById("rulesSyncState");
    if (!state) {
      state = document.createElement("div");
      state.id = "rulesSyncState";
      state.style.cssText =
        "margin:0 auto 14px;max-width:1200px;padding:9px 14px;border:2px solid #13233f;background:#fff7db;font-weight:700;";
      document.querySelector("main").prepend(state);
    }
    state.textContent = message;
    state.style.background = failed ? "#ffe0dc" : "#e8f3df";
  }

  function renderWorkflow(rules) {
    let panel = document.getElementById("liveWorkflow");
    if (!panel) {
      panel = document.createElement("section");
      panel.id = "liveWorkflow";
      panel.className = "paper border border-5 span-12";
      document.querySelector("#guide .flowchart")?.after(panel);
    }
    const required = new Set(rules.workflow.required_completion_steps);
    panel.innerHTML = `<h3>🔒 JSON 实时强制工作流（${Object.keys(rules.workflow.steps).length} 步）</h3>
      <p class="logic">入口：<b>${rules.workflow.entry_step}</b>。带“必经”的节点未完成时，Skill 禁止输出或写回标签。</p>
      <ol class="case-list">${Object.entries(rules.workflow.steps)
        .map(([id, step]) => `<li><b>${id}${required.has(id) ? " · 必经" : ""}</b>：${step.instruction || step.question || `候选标签 ${step.label || ""}`}</li>`)
        .join("")}</ol>`;
  }

  async function sync() {
    try {
      const response = await fetch(endpoint, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache, no-store, must-revalidate" },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const rules = await response.json();
      const expected = ["促销机制", "系列选型", "同类横测", "护肤方案 / 多品组合", "单品主导", "观点价值", "身份阶段", "场景任务", "日常生活"];
      if (!rules.workflow?.steps || !expected.every((name) => rules.labels?.[name])) {
        throw new Error("完整规则结构校验失败");
      }

      const breakoutOrder = rules.families["破圈"].priority;
      const verticalOrder = rules.families["美垂"].priority;
      labels.breakouts.splice(0, labels.breakouts.length, ...breakoutOrder.map((name) => cardFromRule(rules.labels[name])));
      labels.verticals.splice(0, labels.verticals.length, ...verticalOrder.map((name) => cardFromRule(rules.labels[name])));
      for (const item of Object.values(rules.labels)) {
        labelIcons[item.name] = item.icon;
        labelQuestions[item.name] = item.diagnostic_question;
        labelCounterfactual[item.name] = item.counterfactual_test;
        labelBasis[item.name] = item.required_evidence;
      }
      renderCards("breakoutCards", labels.breakouts, "破圈");
      renderCards("verticalCards", labels.verticals, "美垂");
      renderWorkflow(rules);

      const prompt = buildProtocol(rules);
      aiPrompt.textContent = prompt;
      copyPrompt.onclick = async () => {
        await navigator.clipboard.writeText(prompt);
        copyState.textContent = " 已复制 ✓";
        setTimeout(() => (copyState.textContent = ""), 1800);
      };
      const version = document.querySelector(".brand small");
      if (version) version.textContent = `规则版本 ${rules.rules_version} · 九类 · 单主标签 · 证据优先 · JSON 实时同步`;
      showSyncState(`✓ 已读取唯一规则源：${rules.rules_version} · HTML 与 Skill 使用同一 JSON`);
    } catch (error) {
      showSyncState(`⛔ 无法读取完整最新 JSON，页面仅显示静态备份且禁止据此执行新打标：${error.message}`, true);
    }
  }

  sync();
})();
