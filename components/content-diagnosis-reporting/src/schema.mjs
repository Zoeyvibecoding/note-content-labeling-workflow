export const SHEETS = ["视频笔记理解", "图文笔记理解"];

export const COMMON_REQUIRED = [
  "笔记ID", "跳转链接", "Athena标题", "Athena正文", "一句话总结", "笔记类型",
  "打标标签", "打标原因", "内容证据", "反事实检验", "最邻近标签", "排除原因",
  "置信度", "复核标记", "内容来源", "理解状态", "打标规则版本",
  "曝光量", "点击量", "竞价运营消耗", "新增TI人群", "三方消耗", "站外活跃UV"
];

export const MEDIA_REQUIRED = {
  "视频笔记理解": ["ASR追溯文本（自动转录）", "ASR质量说明", "首屏承诺", "关键口播", "关键口播来源", "主场景", "产品讲解占比"],
  "图文笔记理解": ["图片数", "图文内容结构（原字段）", "结构化内容路径", "品牌及产品露出", "关键文案", "关键文案来源"]
};

export const FIELD_ALIASES = {
  "新增TI人群": ["新增TI", "新增ti", "新增TI人群"],
  "站外活跃UV": ["站外UV", "站外uv", "站外活跃UV"],
  "三方消耗": ["第三方消耗", "站外消耗", "三方消耗"],
  "竞价运营消耗": ["竞价消耗", "竞价运营消耗"],
  "曝光量": ["曝光", "曝光量"],
  "点击量": ["点击", "点击量"],
  "封面URL": ["笔记封面", "封面链接", "封面URL"],
  "封面本地路径": ["封面路径", "封面本地路径"]
};

export const SUBCATEGORIES = ["促销机制", "同类横测", "多品组合", "单品主导", "观点价值", "身份阶段", "场景任务", "日常生活"];
export const MAJOR_CATEGORY = Object.freeze({
  "促销机制": "美垂", "同类横测": "美垂", "多品组合": "美垂", "单品主导": "美垂",
  "观点价值": "破圈", "身份阶段": "破圈", "场景任务": "破圈", "日常生活": "破圈"
});

export function canonicalHeader(value) {
  const clean = String(value ?? "").trim();
  for (const [canonical, aliases] of Object.entries(FIELD_ALIASES)) {
    if (aliases.includes(clean)) return canonical;
  }
  return clean;
}

export function normalizeLabel(value, aliases = {}) {
  const clean = String(value ?? "").trim();
  return aliases[clean] || clean;
}
