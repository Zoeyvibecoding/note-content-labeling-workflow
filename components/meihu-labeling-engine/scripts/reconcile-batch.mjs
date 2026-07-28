import fs from "node:fs/promises";
import { validateOutcome } from "./validate-result.mjs";

function getIds(rows, sourceName) {
  if (!Array.isArray(rows)) throw new Error(`${sourceName} must be a JSON array`);
  const ids = rows.map((row, index) => {
    const id = String(row?.note_id ?? "").trim();
    if (!id) throw new Error(`${sourceName}[${index}] missing note_id`);
    return id;
  });
  const counts = new Map();
  for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1);
  const duplicates = [...counts.entries()].filter(([, count]) => count > 1).map(([id]) => id);
  if (duplicates.length) throw new Error(`${sourceName} duplicate note_id: ${duplicates.join(", ")}`);
  return ids;
}

export function reconcileBatch(envelope, inputManifest, results) {
  const inputIds = getIds(inputManifest, "input manifest");
  const resultIds = getIds(results, "results");
  const inputSet = new Set(inputIds);
  const resultSet = new Set(resultIds);
  const missing = inputIds.filter((id) => !resultSet.has(id));
  const extra = resultIds.filter((id) => !inputSet.has(id));
  const invalid = [];

  for (const result of results) {
    const errors = validateOutcome(envelope, result);
    if (errors.length) invalid.push({ note_id: result.note_id, errors });
  }

  if (missing.length || extra.length || invalid.length) {
    const details = {
      valid: false,
      input_count: inputIds.length,
      result_count: resultIds.length,
      missing,
      extra,
      invalid,
    };
    throw new Error(`Batch reconciliation failed:\n${JSON.stringify(details, null, 2)}`);
  }

  const reviewCount = results.filter((result) => result.needs_media_review === true).length;
  return {
    valid: true,
    input_count: inputIds.length,
    result_count: resultIds.length,
    finished_count: results.length - reviewCount,
    media_review_count: reviewCount,
  };
}

if (process.argv[1]?.endsWith("reconcile-batch.mjs")) {
  const [rulesPath, manifestPath, resultsPath] = process.argv.slice(2);
  if (!rulesPath || !manifestPath || !resultsPath) {
    throw new Error("Usage: reconcile-batch.mjs <rules.json> <input-manifest.json> <results.json>");
  }
  const [envelope, manifest, results] = await Promise.all(
    [rulesPath, manifestPath, resultsPath].map(async (filePath) =>
      JSON.parse(await fs.readFile(filePath, "utf8"))),
  );
  process.stdout.write(JSON.stringify(reconcileBatch(envelope, manifest, results)));
}
