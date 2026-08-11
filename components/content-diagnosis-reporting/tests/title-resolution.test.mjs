import test from "node:test";
import assert from "node:assert/strict";
import { titleFromHtml } from "../src/title-resolution.mjs";

test("prefers og:title and preserves symbols",()=>{
  assert.equal(titleFromHtml('<title>错误 - 小红书</title><meta property="og:title" content="𝑩𝒆𝒅𝒕𝒊𝒎𝒆 🧺我的睡前幸福感好物分享～">'),'𝑩𝒆𝒅𝒕𝒊𝒎𝒆 🧺我的睡前幸福感好物分享～');
});

test("uses page title and strips platform suffix only",()=>{
  assert.equal(titleFromHtml('<title>3.8 不花冤枉钱！无平替大牌才是“真回本” - 小红书</title>'),'3.8 不花冤枉钱！无平替大牌才是“真回本”');
});

test("rejects generic platform title",()=>{
  assert.equal(titleFromHtml('<title>小红书</title>'),'');
});
