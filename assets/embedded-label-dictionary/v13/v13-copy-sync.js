(() => {
  const replacements = new Map([
    ["同系列版本选哪款", "同品牌同品类选哪款"],
    ["跨系列同类产品怎么选", "跨品牌同类产品怎么选"],
    ["同系列当前版本回答谁适合哪款", "同品牌同品类回答谁适合哪款"],
    ["跨系列或跨品牌同类产品进入比较/选择任务", "跨品牌同类产品进入比较/选择任务"],
    ["促销已优先排除。先检查同品牌、同品类、同系列的当前版本是否形成明确选款任务，再判断跨系列横测、组合或单品。", "促销已优先排除。先检查同品牌、同品类下的当前可选对象是否形成明确选款任务，再判断跨品牌横测、组合或单品。"],
    ["只有跨系列或跨品牌的独立产品选择才判同类横测。", "同品牌跨系列选购判系列选型；只有跨品牌的独立同类产品选择才判同类横测。"],
  ]);

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const node of nodes) {
    let value = node.nodeValue;
    for (const [before, after] of replacements) value = value.replaceAll(before, after);
    node.nodeValue = value;
  }
})();
