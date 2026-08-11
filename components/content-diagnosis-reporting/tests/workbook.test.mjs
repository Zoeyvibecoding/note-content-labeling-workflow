import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import XLSX from "xlsx";
import { readSources } from "../src/workbook.mjs";
import { COMMON_REQUIRED, MEDIA_REQUIRED } from "../src/schema.mjs";

function row(headers, media) {
  const values=Object.fromEntries(headers.map(h=>[h,"证据"]));
  Object.assign(values,{笔记ID:`${media}-1`,跳转链接:"https://example.com",笔记类型:media,打标标签:"场景任务",置信度:.9,理解状态:"已完成",曝光量:100,点击量:10,竞价运营消耗:100,新增TI人群:10,三方消耗:80,站外活跃UV:20,图片数:3,产品讲解占比:.5});
  return headers.map(h=>values[h]);
}

test("reads a contract-compliant workbook",async()=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),"diagnosis-workbook-")); const file=path.join(dir,"ok.xlsx");
  const wb=XLSX.utils.book_new();
  for (const [sheet,media] of [["视频笔记理解","视频笔记"],["图文笔记理解","图文笔记"]]) {
    const headers=[...COMMON_REQUIRED,...MEDIA_REQUIRED[sheet]];
    const ws=XLSX.utils.aoa_to_sheet([["说明"],[],headers,row(headers,media)]);
    XLSX.utils.book_append_sheet(wb,ws,sheet);
  }
  XLSX.writeFile(wb,file);
  const result=await readSources({header_row:3,sources:[{role:"own",spu:"测试",file}],aliases:{}});
  assert.equal(result.records.length,2);
  assert.equal(result.issues.filter(x=>x.level==="error").length,0);
  assert.equal(result.issues.filter(x=>x.code==="MISSING_COVER").length,2);
});
