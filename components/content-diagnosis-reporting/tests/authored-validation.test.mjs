import test from "node:test";
import assert from "node:assert/strict";
import { validateAuthored } from "../src/authored-validation.mjs";

const blank=()=>({summaries:{overview:"A（1）",ownContent:"B（2）",highPriority:"C（3）",comparison:"D（4）"},ownFormulas:[],competitorExclusive:[],shared:[],ownExclusive:[],actions:[]});

test("rejects a formula supported by one note",()=>{
  const x=blank(); x.ownFormulas.push({subcategory:"场景任务",title:"x",topic:"a",scene:"b",narrative:"c",productRole:"d",proof:"e",samples:[{noteId:"1"}]});
  assert.ok(validateAuthored(x,new Map([["1",{resolvedTitle:"标题1"}]])).some(i=>i.code==="INSUFFICIENT_FORMULA_SAMPLES"));
});

test("accepts complete formula with two accepted samples",()=>{
  const x=blank(); x.ownFormulas.push({subcategory:"场景任务",title:"x",topic:"a",scene:"b",narrative:"c",productRole:"d",proof:"e",samples:[{noteId:"1",title:"标题1"},{noteId:"2",title:"标题2"}]});
  assert.equal(validateAuthored(x,new Map([["1",{resolvedTitle:"标题1"}],["2",{resolvedTitle:"标题2"}]])).length,0);
});

test("rejects an AI-rewritten sample title",()=>{
  const x=blank(); x.ownFormulas.push({subcategory:"场景任务",title:"x",topic:"a",scene:"b",narrative:"c",productRole:"d",proof:"e",samples:[{noteId:"1",title:"AI 改写标题"},{noteId:"2",title:"标题2"}]});
  assert.ok(validateAuthored(x,new Map([["1",{resolvedTitle:"原始标题"}],["2",{resolvedTitle:"标题2"}]])).some(i=>i.code==="SAMPLE_TITLE_MISMATCH"));
});
