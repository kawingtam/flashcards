// excel_to_sets.js
// Usage: node excel_to_sets.js vocab.xlsx ./data/sets.json
const fs = require("fs");
const XLSX = require("xlsx");

const [,, inputXlsx, outputJson = "./data/sets.json"] = process.argv;
if (!inputXlsx) {
  console.error("Usage: node excel_to_sets.js vocab.xlsx ./data/sets.json");
  process.exit(1);
}

const wb = XLSX.readFile(inputXlsx);
const sheetName = wb.SheetNames[0];
const ws = wb.Sheets[sheetName];
const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });

const pick = (obj, keys) => {
  const lower = {};
  for (const [k, v] of Object.entries(obj)) lower[k.toLowerCase()] = v;
  for (const k of keys) {
    const v = lower[String(k).toLowerCase()];
    if (v !== undefined && v !== null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
};

const slugify = (s) => String(s).trim().toLowerCase()
  .replace(/[\s_]+/g, "-").replace(/[^a-z0-9\-]+/g, "").replace(/\-+/g, "-")
  .replace(/^\-|\-$/g, "");

const bySet = new Map();
let skipped = 0;

for (const r of rows) {
  const setName = pick(r, ["set"]) || "未命名組別";
  const zh = pick(r, ["zh", "chinese", "中文"]);
  const en = pick(r, ["en", "english", "英文"]);
  if (!setName || !zh || !en) { skipped++; continue; }
  if (!bySet.has(setName)) bySet.set(setName, []);
  bySet.get(setName).push({ zh, en });
}

const sets = Array.from(bySet.entries()).map(([name, cards], idx) => ({
  id: slugify(name) || `set${idx + 1}`,
  name,
  cards,
}));

fs.writeFileSync(outputJson, JSON.stringify({ sets }, null, 2), "utf8");
console.log(`Wrote ${sets.length} set(s) to ${outputJson}. Skipped rows: ${skipped}`);