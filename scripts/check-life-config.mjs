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
// The marathon (src/data/life/marathon.json vs *_marathon.sql).
const mar = JSON.parse(readFileSync("src/data/life/marathon.json", "utf8"));
const marFile = readdirSync("supabase/migrations").filter((f) => f.endsWith("_marathon.sql")).sort().pop();
const marSql = readFileSync(`supabase/migrations/${marFile}`, "utf8");
const mneed = (label, text) => { if (!marSql.includes(text)) { bad++; console.error(`marathon ${label}: differs from SQL (${text})`); } };
mneed("day", `isodow from s at time zone 'Asia/Dubai') = ${mar.startDow}`);
mneed("hour", `interval '${mar.startHour} hours'`);
mneed("window", `s + interval '${mar.windowMinutes} minutes' > p_at`);
mneed("course", `least(p_distance, elapsed * ${mar.maxSpeed} + 25, ${mar.courseMetres})`);
mneed("finish", `if d >= ${mar.courseMetres} then`);
{ const f = readdirSync("supabase/migrations").filter((x) => x.endsWith("_marathon_push.sql")).sort().pop();
  if (!readFileSync(`supabase/migrations/${f}`, "utf8").includes(`now() < r - interval '${mar.pushMinutes} minutes'`)) { bad++; console.error("marathon push minutes differ from SQL"); } }
mneed("prizes", `prizes bigint[] := array[${mar.prizes.join(", ")}]`);
mneed("points", `'wellbeing', ${mar.finisherPoints}, 'marathon:'`);
// Cars (src/data/cars/cars.json vs *_cars.sql): prices, who offers what, and the fees.
const cars = JSON.parse(readFileSync("src/data/cars/cars.json", "utf8"));
const carFile = readdirSync("supabase/migrations").filter((f) => f.endsWith("_cars.sql")).sort().pop();
const carSql = readFileSync(`supabase/migrations/${carFile}`, "utf8");
// Prices and stock are redefined by later migrations (the driving one added the Tesla): read the newest.
const driveFile = readdirSync("supabase/migrations").filter((f) => f.endsWith("_driving.sql")).sort().pop();
const driveSql = readFileSync(`supabase/migrations/${driveFile}`, "utf8");
const cneed = (label, text, sql = carSql) => { if (!sql.includes(text)) { bad++; console.error(`cars ${label}: differs from SQL (${text})`); } };
for (const c of cars.cars) cneed(`price ${c.id}`, `when '${c.id}' then array[${c.price}, ${c.day}]`, driveSql);
for (const r of cars.rentals) cneed(`fleet ${r.id}`, `when p_place = '${r.id}' and p_car in (${r.fleet.map((x) => `'${x}'`).join(", ")}) then 'rent'`, driveSql);
for (const d of cars.dealers) cneed(`stock ${d.id}`, `when p_place = '${d.id}' and p_car in (${d.stock.map((x) => `'${x}'`).join(", ")}) then 'buy'`, driveSql);
// Driving (cars.json → each car's tank and use, fuel, driving vs *_driving.sql).
for (const c of cars.cars) cneed(`energy ${c.id}`, `when '${c.id}' then array[${c.tank}, ${c.per100}, ${c.electric ? 1 : 0}]`, driveSql);
const dr = cars.driving;
for (const [label, text] of [["petrol", `else ${cars.fuel.petrolPerLitre} end`], ["charge", `when e[3] = 1 then ${cars.fuel.chargePerKwh} else`],
  ["speeding fine", `fine := ${dr.speedingFine};`], ["fuel factor", `/ 1000.0 * ${dr.fuelGameFactor} * e[2] / 100`], ["accident custody", `'accident', now() + interval '${dr.custodyHours} hours'`],
  ["accident fine", `when c.kind = 'accident' then ${dr.accidentFine} else`], ["impound", `impounded_until = now() + interval '${dr.impoundDays} days'`],
  ["release", `-${dr.releaseFee}, 'spend', 'Car released`]]) cneed(`driving ${label}`, text, driveSql);
cneed("days", `p_days not in (${cars.rentDays.join(", ")})`);
cneed("discounts", `case p_days when 7 then ${(1 - cars.weekDiscount).toFixed(2)} when 30 then ${(1 - cars.monthDiscount).toFixed(2)} else 1 end`);
cneed("deposit", `days, cost, deposit, ends_at) values (me, p_car, p_company, p_days, cost, ${cars.deposit},`);
cneed("insurance", `ins := greatest(${cars.minInsurance}, price * ${cars.insurancePercent} / 100)`);
cneed("registration", `-(price + ins + ${cars.registration})`);
// Parking (cars.json → parking vs *_parking.sql).
const pk = cars.parking;
const pkFile = readdirSync("supabase/migrations").filter((f) => f.endsWith("_parking.sql")).sort().pop();
const pkSql = readFileSync(`supabase/migrations/${pkFile}`, "utf8");
for (const [label, text] of [["rate", `cost := p_hours * ${pk.perHour};`], ["hours", `p_hours not in (0, ${pk.hours.join(", ")})`],
  ["unpaid fine", `'parking_unpaid', ${pk.unpaidFine},`], ["bad parking fine", `'bad_parking', ${pk.badParkingFine},`],
  ["unpaid delay", `mins => ${pk.unpaidAfterMinutes[0]} + floor(random() * ${pk.unpaidAfterMinutes[1] - pk.unpaidAfterMinutes[0] + 1})`],
  ["bad delay", `mins => ${pk.badAfterMinutes[0]} + floor(random() * ${pk.badAfterMinutes[1] - pk.badAfterMinutes[0] + 1})`],
  ["speeding fine", `fine := ${dr.speedingFine};`], ["fuel factor", `/ 1000.0 * ${dr.fuelGameFactor} * e[2] / 100`]]) cneed(`parking ${label}`, text, pkSql);
// The fake licence (cars.json → fakeLicence vs *_fake_licence.sql).
const fl = cars.fakeLicence;
const flFile = readdirSync("supabase/migrations").filter((f) => f.endsWith("_fake_licence.sql")).sort().pop();
const flSql = readFileSync(`supabase/migrations/${flFile}`, "utf8");
for (const [label, text] of [["caught", `if random() < ${fl.caughtChance} then`], ["on return", `if r.fake and random() < ${fl.caughtOnReturnChance} then`],
  ["custody", `now() + interval '${fl.custodyHours} hours'`], ["fine", `when c.kind = 'fake_licence' then ${fl.fine} else`], ["bail", `-${fl.bail}, 'spend', 'Bail'`]]) {
  if (!flSql.includes(text)) { bad++; console.error(`fake licence ${label}: differs from SQL (${text})`); }
}
// Life goals (src/data/life/goals.json vs *_goals.sql): steps, rewards, pillars, the plan bonus, savings target and order rules.
const goals = JSON.parse(readFileSync("src/data/life/goals.json", "utf8"));
const goalFile = readdirSync("supabase/migrations").filter((f) => f.endsWith("_goals.sql")).sort().pop();
// Later migrations redefine some goal functions (the fun migration changed the love steps): read them too.
const funFile = readdirSync("supabase/migrations").filter((f) => f.endsWith("_fun.sql")).sort().pop();
const funSql = readFileSync(`supabase/migrations/${funFile}`, "utf8");
const goalSql = readFileSync(`supabase/migrations/${goalFile}`, "utf8") + funSql;
const gneed = (label, text) => { if (!goalSql.includes(text)) { bad++; console.error(`goals ${label}: differs from SQL (${text})`); } };
for (const g of goals.goals) {
  gneed(`steps ${g.id}`, `when '${g.id}' then array[${g.steps.map((s) => `'${s.done}'`).join(", ")}]`);
  gneed(`reward ${g.id}`, `when '${g.id}' then array[${g.aed}, ${g.xp}]`);
  if (g.pillar !== "career") gneed(`pillar ${g.id}`, `when '${g.id}' then '${g.pillar}'`);
  else if (new RegExp(`when '${g.id}' then '(learning|wellbeing|scam)'`).test(goalSql)) { bad++; console.error(`goals pillar ${g.id}: SQL isn't career`); }
}
gneed("all goals", `all_goals text[] := array[${goals.goals.map((g) => `'${g.id}'`).join(", ")}]`);
gneed("pinned", `p_order[1] <> '${goals.pinned[0]}' or p_order[2] <> '${goals.pinned[1]}'`);
for (const [later, first] of goals.after) gneed(`order ${later}`, `array_position(p_order, '${later}') < array_position(p_order, '${first}')`);
gneed("plan xp", `'career', ${goals.planXp}, 'goal:plan:'`);
gneed("save target", `select ${goals.save.months} * public.blueprint_monthly(p_user, blueprint)`);
gneed("save fallback", `, ${goals.save.fallback})::bigint`);
// Daily missions, the mystery box and savings (src/data/life/missions.json vs *_missions.sql).
const mis = JSON.parse(readFileSync("src/data/life/missions.json", "utf8"));
const misFile = readdirSync("supabase/migrations").filter((f) => f.endsWith("_missions.sql")).sort().pop();
const misSql = readFileSync(`supabase/migrations/${misFile}`, "utf8");
const mneed2 = (label, text) => { if (!misSql.includes(text)) { bad++; console.error(`missions ${label}: differs from SQL (${text})`); } };
for (const id of Object.keys(mis.missions)) mneed2(`check ${id}`, `when '${id}' then `);
mneed2("xp", `${mis.xp}, 'mission:'`);
mneed2("box xp", `'wellbeing', ${mis.box.xp}, 'box:'`);
let cum = 0;
mneed2("box odds", "prize := case " + mis.box.odds.map((o, i) => { cum += o.chance; return i === mis.box.odds.length - 1 ? `else ${o.aed} end` : `when r < ${cum} then ${o.aed}`; }).join(" ") + ";");
for (const [id, m] of Object.entries(mis.missions)) {
  const sqlPillar = ["shift", "apply"].includes(id) ? "career" : ["lesson", "driving"].includes(id) ? "learning" : "wellbeing";
  if (m.pillar !== sqlPillar) { bad++; console.error(`missions pillar ${id}: ${m.pillar} in JSON, ${sqlPillar} in SQL`); }
}
// Life & Fun (src/data/life/fun.json vs *_fun.sql): each goal's check, count and XP, the kinds, the weekend card.
const fun = JSON.parse(readFileSync("src/data/life/fun.json", "utf8"));
const fneed = (label, text) => { if (!funSql.includes(text)) { bad++; console.error(`fun ${label}: differs from SQL (${text})`); } };
for (const g of fun.goals) fneed(`goal ${g.id}`, `when '${g.id}' then array['${g.check}', '${g.count}', '${g.xp}']`);
fneed("goal list", `ids text[] := array[${fun.goals.map((g) => `'${g.id}'`).join(", ")}]`);
fneed("kinds", `check (kind in (${fun.kinds.map((k) => `'${k}'`).join(", ")}))`);
fneed("weekend need", `, 1), 0) < ${fun.weekend.need} then raise exception 'not_done'`);
fneed("weekend xp", `id := 'weekend:' || sat; xp := ${fun.weekend.xp};`);
fneed("weekend options", `kind in (${fun.weekend.options.filter((o) => o.id !== "date").map((o) => `'${o.id}'`).join(", ")})`);
// Interior decorators (src/data/home/decorators.json vs *_decorators.sql): the career, interview answers, fee limits,
// the timings and each look's finishing touches.
const dec = JSON.parse(readFileSync("src/data/home/decorators.json", "utf8"));
const decFile = readdirSync("supabase/migrations").filter((f) => f.endsWith("_decorators.sql")).sort().pop();
const decSql = readFileSync(`supabase/migrations/${decFile}`, "utf8");
const dneed = (label, text) => { if (!decSql.includes(text)) { bad++; console.error(`decorators ${label}: differs from SQL (${text})`); } };
const dc = dec.career;
dneed("career", `('${dc.name}', '${dc.title}', ${dc.weeklyWage}, ${dc.shiftsPerWeek}, '${dc.requirement}', '${dc.service}')`);
dneed("interview", `('${dc.name}', '{${dec.interview.map((q) => q.answer).join(",")}}')`);
dneed("fee limits", `when 'decorator' then array[${dec.fee.min}, ${dec.fee.max}, ${dec.fee.default}]`);
dneed("local minutes", `then now() + interval '${dec.minutes} minutes' end`);
dneed("accept minutes", `j.created_at < now() - interval '${dec.acceptMinutes} minutes'`);
for (const s of dec.studios) dneed(`touches ${s.id}`, `when '${s.id}' then array[${s.touches.map((t) => `'${t}'`).join(", ")}]`);
// Penalties (cars.json → driving.revokeAfterAccidents vs *_penalties.sql).
const penFile = readdirSync("supabase/migrations").filter((f) => f.endsWith("_penalties.sql")).sort().pop();
const penSql = readFileSync(`supabase/migrations/${penFile}`, "utf8");
if (!penSql.includes(`if n >= ${cars.driving.revokeAfterAccidents} and public.has_licence(me) then`)) { bad++; console.error("penalties: accident limit differs from SQL"); }
console.log(bad ? `${bad} mismatch(es)` : "Life, scam, venture, season, system-job, city-service, love, marathon, car, driving, parking, goals, missions, fun, decorator and penalty config match the database.");
process.exit(bad ? 1 : 0);
