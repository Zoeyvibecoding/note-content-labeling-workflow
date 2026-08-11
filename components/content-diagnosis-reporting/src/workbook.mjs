import XLSX from "xlsx";
import path from "node:path";
import { COMMON_REQUIRED, MEDIA_REQUIRED, SHEETS, canonicalHeader, normalizeLabel, SUBCATEGORIES, MAJOR_CATEGORY } from "./schema.mjs";

export async function readSources(config) {
  const records = [];
  const issues = [];
  const sourceSummaries = [];
  const globalIds = new Set();

  for (const source of config.sources || []) {
    if (!source.file || !source.spu || !["own", "competitor"].includes(source.role)) {
      issues.push({level:"error", code:"INVALID_SOURCE_CONFIG", source, message:"每个 source 必须包含 file、spu，并将 role 设为 own 或 competitor。"});
      continue;
    }
    let workbook;
    try { workbook = XLSX.readFile(source.file,{cellDates:true,cellFormula:false}); }
    catch (error) {
      issues.push({level:"error", code:"WORKBOOK_OPEN_FAILED", source:source.spu, message:error.message});
      continue;
    }
    let sourceRows = 0;
    for (const sheetName of SHEETS) {
      const ws = workbook.Sheets[sheetName];
      if (!ws) {
        issues.push({level:"error", code:"MISSING_SHEET", source:source.spu, sheet:sheetName, message:`缺少工作表 ${sheetName}`});
        continue;
      }
      const headerRowNumber = Number(config.header_row || 3);
      const matrix = XLSX.utils.sheet_to_json(ws,{header:1,defval:"",raw:true});
      const headers = (matrix[headerRowNumber-1]||[]).map(canonicalHeader);
      const available = new Set(headers.filter(Boolean));
      for (const field of [...COMMON_REQUIRED, ...MEDIA_REQUIRED[sheetName]]) {
        if (!available.has(field)) issues.push({level:"error", code:"MISSING_FIELD", source:source.spu, sheet:sheetName, field, message:`${sheetName} 缺少必需字段「${field}」`});
      }
      if (!available.has("封面URL") && !available.has("封面本地路径")) {
        issues.push({level:"warning", code:"MISSING_COVER", source:source.spu, sheet:sheetName, message:"缺少封面字段，报告案例卡将显示占位封面。"});
      }
      for (let r = headerRowNumber + 1; r <= matrix.length; r++) {
        const row = matrix[r-1] || [];
        const raw = {};
        headers.forEach((header, col) => { if (header) raw[header] = row[col] ?? ""; });
        if (Object.values(raw).every(v => String(v ?? "").trim() === "")) continue;
        const noteId = String(raw["笔记ID"] ?? "").trim();
        if (!noteId) issues.push({level:"error", code:"MISSING_NOTE_ID", source:source.spu, sheet:sheetName, row:r, message:"笔记ID为空"});
        const unique = `${source.spu}::${noteId}`;
        if (noteId && globalIds.has(unique)) issues.push({level:"error", code:"DUPLICATE_NOTE_ID", source:source.spu, sheet:sheetName, row:r, noteId, message:"同一 SPU 内笔记ID重复"});
        globalIds.add(unique);
        const label = normalizeLabel(raw["打标标签"], config.aliases || {});
        if (!SUBCATEGORIES.includes(label)) issues.push({level:"error", code:"INVALID_LABEL", source:source.spu, sheet:sheetName, row:r, noteId, value:label, message:`未知子类标签「${label}」`});
        const record = {
          ...raw, noteId, label, major: MAJOR_CATEGORY[label] || "未知", role:source.role,
          spu:source.spu, media:sheetName.startsWith("视频") ? "视频" : "图文",
          sourceFile:path.basename(source.file), sheet:sheetName, row:r
        };
        records.push(record); sourceRows++;
      }
    }
    sourceSummaries.push({spu:source.spu, role:source.role, file:source.file, rows:sourceRows});
  }
  return {records, issues, sourceSummaries};
}
