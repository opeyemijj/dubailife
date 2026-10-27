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
// City services (src/data/economy/city-services.json vs *_city_services.sql): careers, interview and
// defence answer keys, illness treatments, and the police, clinic and court numbers.
const svc = JSON.parse(readFileSync("src/data/economy/city-services.json", "utf8"));
const svcFile = readdirSync("supabase/migrations").filter((f) => f.endsWith("_city_services.sql")).sort().pop();
const svcSql = readFileSync(`supabase/migrations/${svcFile}`, "utf8");
const need = (label, text) => { if (!svcSql.includes(text)) { bad++; console.error(`city services ${label}: differs from SQL (${text})`); } };
for (const c of svc.careers) need(`career ${c.name}`, `('${c.name}', '${c.title}', ${c.weeklyWage}, ${c.shiftsPerWeek}, '${c.requirement}', '${c.service}')`);
for (const [set, qs] of Object.entries(svc.interviews)) {
  if (set === "_pass") continue;
  if (set !== "_player" && !sys.companies.some((c) => c.name === set) && !svc.careers.some((c) => c.name === set)) { bad++; console.error(`interview ${set}: no such company`); }
  need(`interview ${set}`, `('${set}', '{${qs.map((q) => q.answer).join(",")}}')`);
}
for (const c of [...sys.companies, ...svc.careers]) if (!svc.interviews[c.name]) { bad++; console.error(`interview missing for ${c.name}`); }
need("defence", `('_defence', '{${svc.law.defence.map((q) => q.answer).join(",")}}')`);
need("treatments", `select case p_kind ${svc.illness.kinds.map((k) => `when '${k.id}' then ${k.treatment}`).join(" ")} end`);
need("illness kinds", `check (kind in (${svc.illness.kinds.map((k) => `'${k.id}'`).join(", ")}))`);
need("clinic fee", `coin_move(me, -${svc.illness.localClinicFee}, 'spend', 'Clinic visit`);
need("fee limits", `when 'doctor' then array[${svc.illness.fee.min}, ${svc.illness.fee.max}, ${svc.illness.fee.default}] when 'lawyer' then array[${svc.law.fee.min}, ${svc.law.fee.max}, ${svc.law.fee.default}]`);
const po = svc.police;
need("single", `when p_amount > ${po.singleOver} then`);
need("daily", `when received > ${po.receivedDayOver} then`);
need("new account", `created_at > now() - interval '${po.newAccountDays} days' into young`);
need("new account amount", `when young and p_amount > ${po.newAccountOver} then`);
need("chance", `least(${po.maxChance}, ${po.baseChance} + ${po.chancePerMillion} * p_amount / 1000000.0)`);
need("hearing", `default now() + interval '${po.hearingHours} hours'`);
need("fine", `c.held * ${po.finePercent} / 100`);
need("bounty", `coin_move(c.officer_id, ${po.officerBounty}, 'earn', 'Arrest bounty'`);
const lw = svc.law;
need("legal aid", `coin_move(me, -${lw.legalAid.fee}, 'spend', 'Legal Aid`);
need("legal aid strength", `lawyer_kind = 'aid', lawyer_fee = ${lw.legalAid.fee}, defence = ${lw.legalAid.strength}`);
need("senior", `coin_move(me, -${lw.seniorCounsel.fee}, 'spend', 'Senior Counsel`);
need("senior strength", `lawyer_kind = 'senior', lawyer_fee = ${lw.seniorCounsel.fee}, defence = ${lw.seniorCounsel.strength}`);
need("clear chance", `random() < ${lw.clearBase} + ${lw.clearPerPoint} * coalesce(c.defence, 0)`);
need("pass mark", `score >= ${svc.interviews._pass}`);
// Relationships and weddings (src/data/life/love.json vs *_love.sql).
const love = JSON.parse(readFileSync("src/data/life/love.json", "utf8"));
const loveFile = readdirSync("supabase/migrations").filter((f) => f.endsWith("_love.sql")).sort().pop();
const loveSql = readFileSync(`supabase/migrations/${loveFile}`, "utf8");
const lneed = (label, text) => { if (!loveSql.includes(text)) { bad++; console.error(`love ${label}: differs from SQL (${text})`); } };
lneed("rings", `select case p_ring ${love.rings.map((r) => `when '${r.id}' then ${r.price}`).join(" ")} end`);
lneed("date places", `select p_place in (${love.datePlaces.map((d) => `'${d.id}'`).join(", ")})`);
for (const v of love.venues) lneed(`venue ${v.id}`, `when '${v.id}' then array[${v.base}, ${v.perGuest}]`);
lneed("ceremonies", `select case p_ceremony ${love.ceremonies.map((c) => `when '${c.id}' then ${c.fee}`).join(" ")} end`);
lneed("guests", `p_guests not in (${love.guestOptions.join(", ")})`);
lneed("propose level", `r.level < ${love.levels.propose} then raise exception 'too_soon'`);
lneed("date level", `set level = level + ${love.levels.date} where`);
lneed("love level", `set level = level + ${love.levels.dailyLove} where`);
lneed("cooldown", `ended_at > now() - interval '${love.cooldownDays} days'`);
lneed("gift", `p_amount > ${love.maxGift} then raise exception 'amount_out_of_range'`);
lneed("i do before", `starts_at - interval '${love.iDoWindow.beforeMinutes} minutes' then raise exception 'too_early'`);
lneed("i do after", `starts_at + interval '${love.iDoWindow.afterMinutes} minutes' then raise exception 'too_late'`);
for (const [id, r] of Object.entries(love.roles)) lneed(`role ${id}`, `when '${id}' then ${r.max}`);
console.log(bad ? `${bad} mismatch(es)` : "Life, scam, venture, season, system-job, city-service and love config match the database.");
process.exit(bad ? 1 : 0);
