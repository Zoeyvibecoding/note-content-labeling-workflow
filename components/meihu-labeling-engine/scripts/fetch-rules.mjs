import fs from "node:fs/promises";
import crypto from "node:crypto";
import { validateRules } from "./validate-rules.mjs";

const args = process.argv.slice(2);
const url =
  args.find((x) => x.startsWith("http")) ||
  process.env.MEIHU_RULES_URL ||
  "https://meihu-label-rules.aglow-trail-5521.chatgpt.site/api/rules/latest";
const outputIndex = args.indexOf("--output");
const output = outputIndex >= 0 ? args[outputIndex + 1] : null;

const response = await fetch(url, {
  cache: "no-store",
  headers: { "Cache-Control": "no-cache, no-store, must-revalidate" },
});
if (!response.ok) {
  throw new Error(`Fresh complete rules fetch failed (${response.status}); stop labeling.`);
}
const rules = await response.json();
const errors = validateRules(rules);
if (errors.length) throw new Error(`Incomplete rules; stop labeling:\n${errors.join("\n")}`);
const normalized = JSON.stringify(rules);
const envelope = {
  rules,
  rules_version: rules.rules_version,
  rules_hash: crypto.createHash("sha256").update(normalized).digest("hex"),
  fetched_at: new Date().toISOString(),
  source_url: url,
};
if (output) await fs.writeFile(output, JSON.stringify(envelope, null, 2));
process.stdout.write(JSON.stringify(envelope));
