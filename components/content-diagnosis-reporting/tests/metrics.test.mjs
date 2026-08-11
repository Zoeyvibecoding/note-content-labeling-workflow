import test from "node:test";
import assert from "node:assert/strict";
import { prepareMetricValidity, aggregate, iqrBounds, highPriorityPool } from "../src/metrics.mjs";

function row(id, impressions, clicks, auction, ti, third, uv) { return {noteId:id,spu:"A",曝光量:impressions,点击量:clicks,竞价运营消耗:auction,新增TI人群:ti,三方消耗:third,站外活跃UV:uv}; }

test("weighted metrics are ratios of sums",()=>{
  const rows=[row("1",100,10,100,10,200,20),row("2",900,45,900,30,800,20)];
  prepareMetricValidity(rows,{outlier:{multiplier:1.5}}); const a=aggregate(rows);
  assert.equal(a.metrics.ctr.value,55/1000); assert.equal(a.metrics.cpti.value,1000/40); assert.equal(a.metrics.cpuv.value,1000/40);
});

test("zero values are metric-specific exclusions",()=>{
  const rows=[row("1",100,10,100,0,200,20)]; prepareMetricValidity(rows,{});
  assert.equal(rows[0]._metric.ctr.valid,true); assert.equal(rows[0]._metric.cpti.valid,false); assert.equal(rows[0]._metric.cpuv.valid,true);
});

test("iqr finds a large cost outlier",()=>{
  const b=iqrBounds([1,1,1,1,100],1.5); assert.ok(b.upper<100);
});

test("high priority requires configured number of better metrics",()=>{
  const rows=[row("1",100,20,100,20,100,20)]; prepareMetricValidity(rows,{});
  const bench={metrics:{ctr:{value:.1},cpti:{value:10},cpuv:{value:10}}};
  assert.equal(highPriorityPool(rows,bench,{min_better_metrics:2,require_all_metrics_present:true}).length,1);
});
