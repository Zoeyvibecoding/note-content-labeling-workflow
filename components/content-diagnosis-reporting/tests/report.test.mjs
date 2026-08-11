import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import { renderReport } from "../src/report.mjs";

const metric= value => ({value,numerator:1,denominator:1,validNotes:1});
const aggregate={count:2,spend:100,metrics:{ctr:metric(.1),cpti:metric(10),cpuv:metric(8)}};

test("renders a self-contained local report",async()=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),"diagnosis-report-"));
  const ownSub={...aggregate,metrics:{ctr:metric(.12),cpti:metric(12),cpuv:metric(6)}};
  await renderReport({config:{report_title:"测试报告",analysis_id:"a1"},aggregates:{byRole:{own:aggregate,competitor:aggregate},bySubcategory:{"own::场景任务":ownSub}},authored:{ownFormulas:[],competitorExclusive:[],shared:[],ownExclusive:[],actions:[]},validation:{sourceSummaries:[{},{}],recordCount:4},versionDir:dir});
  const html=await fs.readFile(path.join(dir,"index.html"),"utf8");
  assert.match(html,/测试报告/); assert.match(html,/Σ三方消耗÷Σ站外UV/); assert.doesNotMatch(html,/vercel/i);
  assert.doesNotMatch(html,/class="cover"/);
  assert.match(html,/class="metric-good">12\.00%/);
  assert.match(html,/class="metric-good">¥6\.0/);
  assert.match(html,/class="metric-bad">¥12\.0/);
});
