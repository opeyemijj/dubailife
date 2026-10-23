// Checks that the Blueprint prices and visa lengths the database charges (latest blueprint_price/visa_days migrations)
// match the app's config (src/data/life/*.json). Run: node scripts/check-life-config.mjs
import { readFileSync, readdirSync } from "node:fs";

const bp = JSON.parse(readFileSync("src/data/life/blueprint.json", "utf8"));
const visas = JSON.parse(readFileSync("src/data/life/visas.json", "utf8"));
// The newest migration that (re)defines a function holds its live definition.
const latestDef = (fn) => readdirSync("supabase/migrations").filter((f) => f.endsWith(".sql")).sort()
  .map((f) => readFileSync(`supabase/migrations/${f}`, "utf8")).filter((t) => t.includes(`function public.${fn}(`)).pop() ?? "";
const sql = latestDef("blueprint_price") + latestDef("visa_days");

let bad = 0;
for (const kind of ["housing", "commute", "telecom", "fitness"]) {
  const block = sql.match(new RegExp(`when '${kind}' then case p_id (.*?) end`))?.[1] ?? "";
  const db = Object.fromEntries([...block.matchAll(/when '(\w+)' then (\d+)/g)].map((m) => [m[1], Number(m[2])]));
  for (const o of bp[kind]) if (db[o.id] !== o.monthly) { bad++; console.error(`${kind}.${o.id}: JSON ${o.monthly} vs SQL ${db[o.id]}`); }
  if (Object.keys(db).length !== bp[kind].length) { bad++; console.error(`${kind}: option count differs`); }
}
const vblock = sql.match(/visa_days\(p_tier text\)[\s\S]*?select case p_tier (.*?) end/)?.[1] ?? "";
const vdb = Object.fromEntries([...vblock.matchAll(/when '(\w+)' then (\d+)/g)].map((m) => [m[1], Number(m[2])]));
for (const t of visas.tiers) if (vdb[t.id] !== t.days) { bad++; console.error(`visa ${t.id}: JSON ${t.days} vs SQL ${vdb[t.id]}`); }
// Scam money rules (src/data/scams/scams.json vs public.scam_rule()).
const scams = JSON.parse(readFileSync("src/data/scams/scams.json", "utf8"));
const scamFile = readdirSync("supabase/migrations").filter((f) => f.endsWith("_scam_simulator.sql")).sort().pop();
const scamSql = readFileSync(`supabase/migrations/${scamFile}`, "utf8");
const order = scamSql.match(/array\[([^\]]+)\]\)\[\(d % 5\)/)?.[1].match(/'(\w+)'/g)?.map((x) => x.slice(1, -1)) ?? [];
if (order.join() !== scams.scams.map((x) => x.id).join()) { bad++; console.error(`scam order: JSON ${scams.scams.map((x) => x.id)} vs SQL ${order}`); }
for (const sc of scams.scams) {
  const rule = JSON.parse(scamSql.match(new RegExp(`when '${sc.id}'\\s+then '([^']+)'`))?.[1] ?? "null");
  if (!rule) { bad++; console.error(`scam ${sc.id}: missing in SQL`); continue; }
  if ((rule.fixed ?? null) !== sc.loss.fixed || (rule.pct ?? null) !== sc.loss.pctOfBalance || rule.bounty !== sc.bounty) {
    bad++; console.error(`scam ${sc.id}: JSON ${JSON.stringify([sc.loss, sc.bounty])} vs SQL ${JSON.stringify(rule)}`);
  }
}
// Venture prices and revenue (src/data/economy/ventures.json vs public.venture_rule()).
const ventures = JSON.parse(readFileSync("src/data/economy/ventures.json", "utf8"));
const ecoFile = readdirSync("supabase/migrations").filter((f) => f.endsWith("_economy.sql")).sort().pop();
const ecoSql = readFileSync(`supabase/migrations/${ecoFile}`, "utf8");
for (const t of ventures.types) {
  const rule = JSON.parse(ecoSql.match(new RegExp(`when '${t.id}'\\s+then '([^']+)'`))?.[1] ?? "null");
  if (!rule || rule.cost !== t.cost || rule.daily !== t.daily) { bad++; console.error(`venture ${t.id}: JSON ${t.cost}/${t.daily} vs SQL ${JSON.stringify(rule)}`); }
}
// Season dates and the number of named titles/frames the reward rules need.
const seasons = JSON.parse(readFileSync("src/data/seasons/seasons.json", "utf8"));
const seasonFile = readdirSync("supabase/migrations").filter((f) => f.endsWith("_seasons_plus.sql")).sort().pop();
const seasonSql = readFileSync(`supabase/migrations/${seasonFile}`, "utf8");
for (const se of seasons.seasons) {
  const m = seasonSql.match(new RegExp(`when '${se.id}' then tstzrange\\('([^']+)', '([^']+)'\\)`));
  if (!m || Date.parse(m[1]) !== Date.parse(se.starts) || Date.parse(m[2]) !== Date.parse(se.ends)) { bad++; console.error(`season ${se.id}: dates differ`); }
  if (se.titles.length < 14 || se.frames.length < 9) { bad++; console.error(`season ${se.id}: needs 14 titles and 9 frames`); }
}
// System-company jobs (src/data/economy/system-jobs.json vs the seed in *_system_jobs.sql).
const sys = JSON.parse(readFileSync("src/data/economy/system-jobs.json", "utf8"));
const sysFile = readdirSync("supabase/migrations").filter((f) => f.endsWith("_system_jobs.sql")).sort().pop();
const sysSql = readFileSync(`supabase/migrations/${sysFile}`, "utf8");
for (const c of sys.companies) {
  if (!sysSql.includes(`('${c.name}', '${c.title}', ${c.weeklyWage}, ${c.shiftsPerWeek}, '${c.requirement}')`)) { bad++; console.error(`system job ${c.name}: differs from SQL`); }
}
console.log(bad ? `${bad} mismatch(es)` : "Life, scam, venture, season and system-job config match the database.");
process.exit(bad ? 1 : 0);
