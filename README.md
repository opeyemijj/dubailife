# Dubai Life: work board

Dubai Life (mydubailife.app) is a Next.js 16 + Supabase life game set in Dubai. This file is the **shared task list for the
AI agents working on the code at the same time**. Read it before starting, and keep it up to date as you work.

## How two agents work together

1. **Claim before you start.** Pick a task marked `🟢 To do`, change it to `🟡 In progress` with your name
   (**Agent A** or **Agent B**) and today's date, and save this file *before* writing code.
2. **Don't touch files another agent has claimed.** Each task lists its main files. If you need one that's claimed,
   leave a note under "Messages between agents" and work on something else.
3. **When you finish,** set the task to `✅ Done (date)`, add a line on what changed and how it was tested, and list any
   database migration it needs.
4. **Migrations:** new SQL goes in `supabase/migrations/` (timestamp names, newest last). They are applied to the live
   database **only when the user says "run migration"**. Note pending ones under "Migrations waiting".
5. **Before marking anything done:** `npx tsc --noEmit -p .`, `npx eslint <changed files>` (no new errors), and a
   production build (`npx next build`, with dummy `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
   Test 3D changes with a screenshot. Test SQL in a transaction that's rolled back.
6. **Project rules (from the user):**
   - The user commits and deploys; agents never commit, push or stage.
   - Static content lives in JSON under `src/data/`, and enforced numbers are mirrored in SQL and checked by
     `scripts/check-life-config.mjs`.
   - Locals (bots) are always tagged "Local" and never counted as players.
   - Brand: "Dubai Life", mydubailife.app.
   - Couples are a man and a woman, 21+, both agreeing; a man may have up to 4 partners.
   - UI spelling is "license". Never print secrets from `.env`.
   - `AGENTS.md`: this Next.js version differs from older ones; read `node_modules/next/dist/docs/` before using new APIs.

Status key: `🟢 To do` · `🟡 In progress (who, date)` · `✅ Done (date)` · `⛔ Blocked (why)` · `❓ Waiting for the user`

---

## 2026-11-04: the open-world batch (from the user's reference screenshots)

Reference: the user's screenshots of another game show a **View** switcher (Above, Inside, Eyes, plus Boat on a boat),
an **Outside** button at home, a street you walk with an **analog stick and RUN**, **Go inside** at doors, **Where to?**,
cartoon **flies** on dirty players, and a **boat cruise** you can watch sail.

**Reference screenshots** (the correct ones, from the user; they're in the repo):

| Screenshot | What it shows | Tasks |
|---|---|---|
| [01-boat-deck-inside-view](docs/reference/2026-11-04/01-boat-deck-inside-view.png) | A party on a boat's deck in Inside view; View switcher on the right (Above, Inside, Eyes, Boat); stick bottom left | #1, #10, #13 |
| [02-boat-deck-bar-and-captain](docs/reference/2026-11-04/02-boat-deck-bar-and-captain.png) | The deck bar, the captain at the wheel, "Back to the jetty", the trip progress ("Back in 2:06") | #13 |
| [03-boat-view-docking](docs/reference/2026-11-04/03-boat-view-docking.png) | Boat view: the whole boat with everyone on deck, docking at the jetty | #13 |
| [04-boat-view-leaving-jetty](docs/reference/2026-11-04/04-boat-view-leaving-jetty.png) | Boat view leaving the jetty, animated water | #13 |
| [05-boat-view-sailing-wake](docs/reference/2026-11-04/05-boat-view-sailing-wake.png) | Sailing with a wake, the city skyline behind | #13 |
| [06-home-view-menu-and-outside](docs/reference/2026-11-04/06-home-view-menu-and-outside.png) | Home: the View menu (Above, Inside, Eyes, take a photo, turn the room, hide buttons) and the **Outside** button | #1, #4 |
| [07-street-walking-flies-stick](docs/reference/2026-11-04/07-street-walking-flies-stick.png) | On the street: flies round a dirty player, the stick, "Where to?", talking to a passer-by | #2, #4 |
| [08-street-where-to-sheet](docs/reference/2026-11-04/08-street-where-to-sheet.png) | The "Where to?" sheet: places on this street with walk and drive times, and search | #5 |
| [09-street-eye-view-running](docs/reference/2026-11-04/09-street-eye-view-running.png) | Eye view while running on the street (RUN attached to the stick) | #1, #4 |
| [10-street-go-inside-run](docs/reference/2026-11-04/10-street-go-inside-run.png) | Running along the street with flies, **Go inside** at a door, RUN on the stick | #2, #4 |

| # | Task | Status | Main files |
|---|------|--------|------------|
| 1 | Three views everywhere: Above, Inside (wider, less zoomed), Eye (first person) | ✅ Done (2026-11-04) | `components/interior/InteriorScene.tsx`, `VenueExperience.tsx`, `components/home/ApartmentRoom.tsx`, `app/home/page.tsx`, `property/PropertyRoute.tsx` |
| 2 | Flies round dirty players (hygiene under 25%), seen by others too | ✅ Done (2026-11-04) | `components/avatar/Flies.tsx`, `lib/room.ts` (`dirty` on presence) |
| 3 | Take a shower at home: stand under running water and steam; hygiene up, flies gone | ✅ Done (2026-11-04) | `components/home/HomeFixtures.tsx`, `ApartmentRoom.tsx` (`using` prop), `app/home/page.tsx` |
| 4 | Step **Outside** from home or any venue onto a Dubai street; walk or run with the stick; real nearby places as doors; **Go inside** | ✅ Done (2026-11-04) | `components/street/StreetWorld.tsx`, `components/street/StreetPage.tsx`, `app/street/page.tsx` |
| 5 | **Where to?** on the street: walk there by yourself (auto-walk), fast-forward for far places, or taxi | ✅ Done (2026-11-04) | same as #4 |
| 6 | **Live online count** wrong and not updating when someone comes online | ✅ Done (2026-11-04) | `lib/presence.ts`, `supabase/migrations/20261220000000_user_channel.sql` (`ping_online`, `online_snapshot`) |
| 7 | "The transfer didn't go through" when **sending a big amount** | ✅ Done (2026-11-04) | `lib/room.ts` (`sendMoney`), SQL `send_money` (find its latest migration), flagged transfers in `*_city_services.sql` |
| 8 | **Block a player** so they can't message you (from chats and profiles, not only the 3D peer panel) | ✅ Done (2026-11-04) | `components/social/PeerPanel.tsx`, `lib/safety.ts`, phone chat screens (`src/app/phone/`, `components/phone/`) |
| 9 | **Roof or ceiling visible in Eye view** (home and venues) | ✅ Done (2026-11-04) | `ApartmentRoom.tsx`, `InteriorScene.tsx` |
| 10 | **Stick and RUN in Inside and Eye views** (homes and venues), with semi-auto obstacle avoidance | ✅ Done (2026-11-04) | `ApartmentRoom.tsx` (walk/nav: `homeNav`), `InteriorScene.tsx` (`Player`, `walkTo`), reuse `MoveStick` from `components/street/StreetWorld.tsx` |
| 11 | **Anyone renting can throw a house party**, including homes not on the map (generic address) | ✅ Done (2026-11-04), needs migration `20261222000000_party_homes.sql` | `components/invite/PartySheet.tsx`, `PartySheetHost.tsx`, SQL `create_event` (latest in `20261218000000_tickets_seminars.sql`), visiting a home without a flat (new route) |
| 12 | **Redesign outside the house**: make rooms bigger (move walls out), add a garage, pool, car park, garden (owner or decorator, paid from budget) | ✅ Done (2026-11-04): townhouses and villas, optional, owner (Menu › Outside the house) or decorator | `ApartmentRoom.tsx` (render outside the walls; only the plot/outside part), `app/decorate/[jobId]/page.tsx`, `lib/furniture.ts`, new `src/data/home/exterior.json`, new `*_home_exterior.sql` |
| 13 | **Yacht**: yacht-party event type, yacht venues (Dubai Marina), a **Boat** view, and sailing it yourself (like the car journey) | ✅ Done (2026-11-04): Dubai Harbour Marina yachts, deck layout, Boat view, Sail it yourself, yacht parties | `src/data/life/parties.json`, new `src/data/venues/yachts.json`, new `*_yacht.sql`, new `components/yacht/` (`YachtScene.tsx`, `SailJourney.tsx`), `lib/city/places.ts` (Marina jetty place only) |
| 14 | Ticket tiers for paid events (early bird, phases, squad packs, VIP tables, QR pass at the door) | ⛔ Dropped (user, 2026-11-04: "ignore this one") | `20261218000000_tickets_seminars.sql`, `components/invite/` |
| 16 | **Venue screen layout** (user's rules): middle-right bar of ☰ Menu (every venue action, listed vertically), then Above / Inside / Eyes, then 📱 Phone; **Outside** and the venue's **Activities** at the bottom right; the stick with RUN at the bottom left; nothing overlapping | ✅ Done (2026-11-04) | `components/interior/VenueExperience.tsx` |
| 17 | **Radio regions**: an arrow on the radio picks Lagos (default), Kenya, France, US, London or Arabic | ✅ Done (2026-11-04) | `src/data/life/parties.json` (`radio.regions`), `components/invite/PartyHere.tsx` (`RegionPicker`) |
| 18 | Same layout for **homes**: middle-right bar (Menu, views, Phone), Outside at the bottom right next to the stick | ✅ Done (2026-11-04): home and visited homes | `app/home/page.tsx`, `property/PropertyRoute.tsx` |
| 4b | **Street looks more like Dubai**: windows and glass on the towers facing the street, lighter road with visible lanes, bus stops, crossings, passers-by (Locals) to talk to, as in reference 07 | ✅ Done (2026-11-04): area shops, crossings, bus stops, Locals, textured towers, villa streets | `components/street/StreetWorld.tsx` (`Blocks`, `Street`), `components/home/RunJourney.tsx` (`Building`) |
| 19 | **Raise the daily send limit** above AED 5,000,000 (user said yes, 2026-11-04); keep the 1,231 base in the online count | ✅ Done (2026-11-04), needs migration `20261221000000_send_limit.sql` | `20261221000000_send_limit.sql`, `lib/room.ts` (message text) |
| 20 | **Map middle-right bar**: 📍 Places (fly to an area, show a kind of place) and 🔥 where people are, instead of the district strip and the orange pill over it | ✅ Done (2026-11-04) | `components/map/MapSideBar.tsx`, `InteractiveMap.tsx`, `layout/BottomNav.tsx`, `app/explore/page.tsx` |
| 21 | **Bed space**: the character floats above the bed seen from the side; bunks too short | ✅ Done (2026-11-04): beds fill their footprint, mattress always 0.6 m (`BED_MATTRESS`), bed-space bunks 2.35 m long, away roommates sit on the mattress edge | `ApartmentRoom.tsx` (`useFittedModel`), `restPose.ts`, `data/home/floorplans.json`, `lib/bedspace.ts` |
| 22 | **Toilet and shower poses**: sit on the toilet when using it; walk into the bathroom (shower) to shower | ✅ Done (2026-11-04): toilet use sits you on it; "Morning Shower" walks you into the shower (`fixtureCall`) | `ApartmentRoom.tsx`, `app/home/page.tsx` (activities) |
| 23 | **"Move into a home" to-do doesn't tick** after moving in | ✅ Done (2026-11-04), needs migration `20261223000000_home_goal.sql`: the home chosen at sign-up counts | `20261223000000_home_goal.sql` |
| 24 | **Wild Wadi slides**: you're hidden inside a closed slide; show the rider inside it, or make the slide open | ✅ Done (2026-11-04): open half-pipe slides (Aquaventure clear tube kept) | `components/interior/scenery.tsx`, `components/interior/rides/` |
| 25 | **One view button** (Above → Inside → Eyes, → Boat on yachts) and **🎉 Party** under one icon on the right at every party or seminar, items floating; menus show a tap and close themselves | ✅ Done (2026-11-04) | `components/layout/SideBar.tsx` (`ViewCycle`, `FloatMenu`, `TapLayer`), `VenueExperience.tsx`, `app/home/page.tsx`, `PropertyRoute.tsx` |
| 26 | **Stick like a PS5 analog**: dead zone, speed by push, full push to the rim runs (rim lights up); no RUN button | ✅ Done (2026-11-04) | `components/street/StreetWorld.tsx` (`MoveStick`, `Controls.sprint`), `ApartmentRoom.tsx`, `InteriorScene.tsx` |
| 27 | **Drinks at venue parties**: a waitress with a sparkler brings them, you hold the drink (it used to make everyone dance) | ✅ Done (2026-11-04) | `VenueExperience.tsx` |
| 28 | **Popups**: Live Space banner (party/marathon) has ✕ and stays hidden; Locals offer and Claim venue cards on top of everything | ✅ Done (2026-11-04) | `social/LiveSpaceBanner.tsx`, `VenueExperience.tsx`, `VenueOwnerLayer.tsx` |
| 29 | **Groove removed** from party music (radio or off) | ✅ Done (2026-11-04) | `invite/PartyHere.tsx` |
| 30 | **Battery**: 3D scenes draw 60 times a second even when still, and keep drawing behind the phone | 🟢 To do (analysis in the notes) | every `<Canvas>`, `lib/device.ts` |
| 31 | **Purple "Back to …" pill** (parties, the marathon) gets ✕ and stays hidden | ✅ Done (2026-11-04) | `invite/BackToParty.tsx` |
| 32 | **Eyes view less zoomed**: 74° lens, camera 0.45 m behind the head (homes and venues) | ✅ Done (2026-11-04) | `ApartmentRoom.tsx`, `InteriorScene.tsx` |
| 33 | **Leaving a Space asks first** (✕ on the floating Space bar: Leave / Stay) | ✅ Done (2026-11-04) | `social/FloatingSpaceOverlay.tsx` |
| 34 | **Courses: no wait between steps** (was 20 hours: next lesson and the week's test open as soon as you pass) | ✅ Done (2026-11-04), migration applied | `lib/academy/progress.ts` (`UNLOCK_HOURS`) |
| 35 | **Moving in needs a yes** (request, Accept / Not now, live note on every page), and **living together is live**: the host's home joins the shared home's room so both see each other move and can chat; the host's furniture is copied to the shared home | ✅ Done (2026-11-05), migration applied | `20261226000000_move_in_requests.sql`, `lib/love.ts`, `phone/HayatiApp.tsx` (`LivingTogether`), `love/LoveListener.tsx` (`MoveInListener`), `app/home/page.tsx` (`hostShare`, `guestShare`) |
| 36 | **One home, one version**: living together, the home's furniture and look (floor, walls, panels, bed sheets) are the shared copy in `flats.interior`; both partners and visitors see and change the same home, live (room event `home`) | ✅ Done (2026-11-05) | `lib/city/sharedHome.ts`, `app/home/page.tsx` (`sharedHome`, `saveShared`), `PropertyRoute.tsx` (`commit`, `restyle`), `components/home/HomeLookSheet.tsx`, `lib/room.ts` |
| 37 | **Bed sheets**: 8 colours (`BEDDING`), drawn on every bed | ✅ Done (2026-11-05) | `lib/furniture.ts`, `ApartmentRoom.tsx` (`BeddingContext`) |
| 38 | **Things to do at home**: TV (news, movie, football on screen), aquarium (feed: flakes and fish come up; clean; watch), kitchen counter (cook roast chicken or beef stew, clean), dining table (sit and eat a roast dinner, beef stew or breakfast, laid out on the table with steam). Partners and visitors can use them too | ✅ Done (2026-11-05) | `data/home/fixtures.json` (kinds `tv`, `aquarium`, `island`, `dining`; pantry `beef`, `roast`, `stew`), `components/home/HomeActivityProps.tsx`, `LuxuryDecor.tsx`, `ApartmentRoom.tsx` (`startObjectUse`, `activity`), `PropertyRoute.tsx` |
| 39 | **One house, one design for everyone**: every home's design lives once in `flats.interior`; owner, partner, decorator and visitors all change that one. Homes off the map get their address on first visit so they have one too (bed spaces keep each sleeper's corner). Decorators start from it and finishing writes into it; parties never overwrite it | ✅ Done (2026-11-05), migration applied | `20261227000000_one_home_design.sql` (`home_flat_of`, `decor_home`, `decor_complete`, `party_home`), `app/home/page.tsx` (`homeFlatId`) |
| 40 | **Free arrangement**: pieces may overlap and stand close (a chair on a rug, rugs over rugs); ⬆ Bring forward / ⬇ Send back sets which shows on top (`placement.layer`). Automatic placement still keeps things apart | ✅ Done (2026-11-05) | `lib/furniture.ts` (`isPlacementValid(..., loose)`, `FloorPlacement.layer`), `ApartmentRoom.tsx` (`LAYER_STEP`, `withLayer`), placing toolbars in `app/home/page.tsx`, `PropertyRoute.tsx`, `app/decorate/[jobId]/page.tsx` |
| 15 | Family, phase 2: **move in together**, and **kids shown in the 3D home** at their stage | ✅ Done (2026-11-04), needs migration `20261224000000_move_in.sql`: live together; kids in the 3D home | `lib/love.ts`, `components/phone/HayatiApp.tsx`, `ApartmentRoom.tsx`, `supabase/migrations/20261216000000_family.sql` |

### Details and "done when"

**Finished on 2026-11-04 (Agent A):**
- **#6 online count:**
  - A player who comes online announces it once on `dubai-city-pulse` ("online"), and once on sign-out ("offline").
  - Others update instantly; snapshots run every 30 s and right after your own first ping.
  - Tested with two real temporary accounts: appears in 555 ms, leaves in 491 ms, snapshot count exact (5 of 5
    checks).
  - The screen shows 1,231 + the real count (that base number was already there): ❓ ask the user if it should go.
- **#7 big transfers:** the live daily send limit is AED 5,000,000 (`app_settings.limits.max_daily_send`), and AED
  10,000,000 per transfer. Large sends were refused with `daily_send_limit`, which the app showed as "didn't go
  through". It now says so clearly (`lib/room.ts` `sendMoney`). Tested live.
  ❓ Ask the user whether the AED 5,000,000-a-day limit should be higher.
- **#8 blocking:** Block and Unblock in the phone chat header (`app/phone/page.tsx`), as well as the 3D peer panel.
  Enforced by the database (`refuse_if_blocked`). Tested live: a blocked player can't message or pay in either
  direction, and unblocking restores it (9 of 9 checks with the transfer tests).
- **#9 ceiling, Eye view only (the user's rule: ceilings are only for Eye view):** `components/interior/Ceiling.tsx`
  (plain ceiling plus downlights), drawn in homes (`ApartmentRoom`, `view === "eye"`) and indoor venues
  (`InteriorScene` `Room`, `ceiling={eye}`; open-air venues stay open). Checked by screenshot.
- **#10 stick in Inside and Eye views:**
  - Homes: `ApartmentRoom` `stick`/`stickRun` props. You steer relative to the camera, and a blocked step slides
    along the wall or furniture (`homeNav.walkable`). Others see you every 0.8 s while moving.
  - Venues: `InteriorScene` `Player` stick. It stays in the room and slides round stations (not dance floors).
  - The buttons fold behind "☰ Buttons" in Inside and Eye views (as in the reference).
  - Tested in the browser: test pages `/sticktest` and `/venuetest` in a scratch copy, with screenshots and position
    logs.
  - Also fixed a crash in `VenueOwnerLayer` when settings fail to load.
- **#16 venue layout:** checked by screenshot (Inside view with the radio list open, the menu open, Eyes view).
- **#17 radio regions:** every stream checked to send audio (curl). Lagos: LagosJump, COSMO Afrobeats, Hotmix, bigFM
  Afrobeats, Afrikana. Kenya: Capital FM Kenya. France: NRJ Nouveaux Hits, NRJ Best Hits, Radio Contact. US: 102.7
  KIIS FM, Z100 New York, 100 Hip Hop & RnB. London: Capital Dance, Heart Dance. Arabic: Al Arabiya 99 FM and
  Al Khaleejiya 100.9 (UAE), Radio Hits 88.2 Cairo. The choice is remembered (`localStorage dl_radio_region`).
  Kenya has only one working station: add more if you find good HTTPS MP3 or AAC streams (HLS `.m3u8` won't play
  in Chrome).

**#11, done (Agent A, 2026-11-04).** The user's rule: anyone with a room can host (not a shared bed space). Homes off
the map are flats in a residential tower: the first party gives them an address ("Apt 2303", floor 23, "Al Barsha
Residences", building id `home-al-barsha`), tied to the player by `flats.home_of` (not a tenancy: no rent, doesn't
count for `has_home`, never listed). The host's furniture is copied in (and kept in step during the party). Guests go to
`/property/home-<area>/<unit>`, ride up in 3D first (`components/property/TowerArrival.tsx`: lobby, lift with floor
counter, corridor to the numbered door; Skip), then enter. Host and guests share the room `flat:<id>`.
Code: `lib/city/partyHome.ts`, `PartySheet.tsx` (`prepare`), `PartySheetHost.tsx`, `app/home/page.tsx` (`partyFlat`),
`PropertyRoute.tsx`. Tested: SQL in a rolled-back transaction (address, door private then public during the party,
bed space refused, has_home unchanged); lift ride with screenshots (`/towertest` in the build copy).
Knocks at a generic home reach the host (trigger `tg_notify_users` updated in the same migration).

**#11 notes (earlier analysis):**
- Homes not on the map have no `flats` row: the home page draws them from the housing tier, with furniture from
  `citizen.furniture` (`app/home/page.tsx`, around line 248).
- Simplest route: when such a player throws a house party, create a `flats` row for them with a generic building id
  (for example `home-<area>`) and a generated unit ("Villa 12, Al Barsha"), tenant = the player, rent 0, not listed.
  Then `create_event`, the guest door, knocks and `/property/<building>/<unit>` all work unchanged.
- Changes needed:
  - `PropertyRoute` must accept building ids that aren't map entities (today it says "This home doesn't exist" and
    redirects people who aren't at the building).
  - Guests must see the host's furniture: copy `citizen.furniture` to the flat, or read it.
  - Check that no rent cron charges these rows.

**#4 and #5, the street: done.** Tested with screenshots: a wide view of the road, pavement and shopfronts;
walking and running (stick, RUN on the stick, WASD and Shift); "Back inside" and "Go inside" prompts at doors; the
"Where to?" sheet with real nearby places and walking times. Visual polish is #4b. Original notes:
**#4 and #5, the street (Agent A).** Built: the boulevard (palm median, paved pavements with striped kerbs, lamps, towers,
traffic with Dubai taxis), the 14 nearest real places as shopfronts in true order, your own door, the stick, RUN and
keyboard controls, "Go inside", "Where to?" (walk there, fast-forward, taxi), and other players on the same street live
(room `street:<from>`). Outside buttons are on the home, visited homes and venues.
Still to fix (found in the first screenshots):
- The camera starts too close, almost inside a building; it should start behind the player, looking down the street.
- The header doesn't show where you came from.
- "Where to?" didn't open in the automated test (check that the button can be clicked above the canvas).
- Check that walking actually moves the player and that "Go inside" appears at each door.
Done when screenshots show a wide street view, walking and running, a door prompt and the Where to? sheet.
Match the reference: put RUN on the stick, as in screenshots 09 and 10.

**#6, live online count.** The count now comes from pings (`ping_online`, every 60 s while active) and a snapshot
(`online_snapshot`, every 45 s), so a new player shows up late (up to 45 s), and the number shown is 1,231 + signed-in
players active in the last 2 minutes. Fix:
- When someone comes online, send one broadcast on the `dubai-city-pulse` channel so others add them at once, and one
  on sign-out.
- Refresh soon after the app opens.
- Make sure the starting number matches what the user expects (ask if unsure).
Done when two real accounts see each other appear within a couple of seconds. Test with temporary accounts as in the
2026-11-04 end-to-end test (create in SQL, sign in with the anon key, always delete afterwards), or ask the user.

**#7, big transfers.** Find which error `send_money` returns for large amounts (an amount limit, a daily limit, or a
transfer flagged for a judge in `*_city_services.sql`), and show a clear message (for example "Held for review: a judge
decides within 24 hours") instead of the generic one. Fix the limit if it's wrong.

**#10, stick inside.** In Inside and Eye views, show the same stick and RUN as the street. Steering sets a walk target a
little ahead each frame, and the existing route-finding (homes: `homeNav`) goes round furniture. In venues, keep the
player out of counters and tables.

**#11, house parties for anyone renting.** Today `create_event` needs a row in `flats` (a home on the map). Players with
a starter or generic home need:
- A generic address, for example "Villa 12, Al Barsha 2".
- A route where guests can visit that home.
- `create_event` accepting it.
Check with the user how "renting" is recorded for homes not on the map.

**#13, the yacht (Agent B, plan).** Based on reference screenshots 01–05.
- **Places:** a "Dubai Harbour / Marina Jetty" place with 3 yachts to charter (small, mid, superyacht), each with a
  price per hour, a deck size and a guest limit. Data in `src/data/venues/yachts.json`, prices mirrored in SQL and
  `check-life-config.mjs`.
- **Yacht party:** a new party kind `yacht_party` (`where: "yacht"`) next to `pool_party`. The host charters the yacht
  for the party hours (paid from their balance); guests arrive at the jetty and walk on board. SQL: one migration
  adding `yacht_party` to every party-kind list (same pattern as `20261213000000_pool_parties.sql`) and a
  `charter_yacht` charge.
- **On board (`YachtScene`):** the deck as a venue: a deck bar, DJ spot, dance floor, the captain at the wheel, other
  players live (room `yacht:<eventId>`). Party actions (food, drinks, dance) reuse `parties.json` actions. The trip
  card at the top ("Out at sea · back in 2:06", "Back to the jetty"). Views: Above, Inside, Eyes, plus **Boat** (the
  whole yacht seen from outside, sailing past the Marina/JBR/Ain Dubai skyline, with a wake and moving water).
- **Sail it yourself (`SailJourney`):** like `DriveJourney`/the jet-ski ride: throttle and wheel (stick on mobile, WASD
  on desktop), a route of buoys from the Marina past JBR, Ain Dubai and the Palm and back, speed limit zones near the
  marina mouth (a fine like the speed cameras), docking at the end. Needs a boat licence? Ask the user (default: anyone
  who charters can sail a small yacht; a captain comes with the bigger ones).
- **Done when** screenshots show: chartering, the party on deck, Boat view sailing with a wake, sailing it yourself and
  docking.

**#12, outside the house (Agent B, plan).**
- **Plot around the home:** every house-type home (townhouse, villa, Palm villa) gets a plot; flats get a balcony/terrace
  only. Plot items in `src/data/home/exterior.json`: garage (shows your owned cars from `CarsApp`), driveway/car park,
  pool (with the swim action), garden/lawn, palm trees, BBQ, majlis tent, fence and gate. Each has a price; placing
  them uses the same grid/placement code as furniture, on an outdoor grid.
- **Bigger rooms:** "extend the house" moves an outside wall out by one step (up to a limit per home tier), priced per
  square metre. Saved with the home style.
- **Decorator:** a hired decorator can place outdoor items and extensions in the decorate job, paid from the owner's
  budget (same flow as indoor items today).
- **SQL:** `*_home_exterior.sql` for the prices and limits (mirrored in `check-life-config.mjs`).
- **Done when** screenshots show a villa with a garage and car, a pool you can swim in, a garden, and a room made bigger.

---

## ✅ Done before 2026-11-04 (for context)

- **Parties:** house parties, dinners, club nights, pool parties and seminars; free or ticketed; club promoter job; a
  host can end a party; Afrobeats radio in all venues.
- **Invites:** to any page (venues, courses, homes, the marathon) by @username, friends, chats, WhatsApp or link, with
  sign-up and landing straight there.
- **Family (phase 1):** up to 4 partners for men, hidden cheating with discovery, babies (7-day pregnancy, weekly
  milestones), care, nannies, relatives.
- **Courses:** 13 new courses across universities and schools; plain worked examples instead of code in non-technical
  courses; "request a book or course".
- **Connections:**
  - Idle players are disconnected (shown 💤 away), and requests to away players are saved.
  - One private personal channel per player instead of about 8 listeners.
  - Online list from pings instead of city-wide presence.
  - Tested end to end with two real temporary accounts: 24 out of 24 checks passed.

**#30, battery (analysis, 2026-11-04).** The heavy part is the 3D: 27 `<Canvas>` use the default `frameloop="always"`,
so the GPU draws about 60 frames a second even when nothing moves, and keeps drawing behind the phone overlay. Phones
already get a lower resolution (dpr up to 1.5) and no shadows (`lib/device.ts`), realtime disconnects after 2 minutes
idle or 30 seconds hidden (`lib/idle.ts`), and browsers stop drawing hidden tabs. Fix: on low-power devices draw at
30 fps (`frameloop="demand"` plus a 30 fps `invalidate`), stop drawing while the phone or a full-screen sheet covers
the scene, and cut per-frame label updates (drei `Html`). Expected: about half the GPU work in 3D.

## Migrations waiting

Everything up to `20261227000000_one_home_design.sql` is applied (2026-11-05). Nothing waiting. Applied in the last batches:
- `20261221000000_send_limit.sql`: AED 50,000,000 a day, AED 20,000,000 per transfer (both in `app_settings.limits`).
- `20261222000000_party_homes.sql`: `flats.home_of`, `party_home`, `my_party_home`, and `flat_permissions`,
  `is_flat_manager` and `create_event` accepting generic homes. Before it runs, a party at a home off the map says
  "coming in the next update"; nothing else breaks.
- `20261223000000_home_goal.sql`: "Move into your home" ticks for the home chosen at sign-up.
- `20261224000000_move_in.sql`: `couple_homes` (not `households`: the roommates feature has that name), `move_in_together`,
  `move_out`, `my_household`. Needs `20261222000000_party_homes.sql` first (uses `flats.home_of`).

## Messages between agents

_(Leave notes here: "Agent B: I need `ApartmentRoom.tsx` for #9, are you done with it?")_

- **Agent A → Agent B (2026-11-04):** The user gave me every open task, including #12 and #13. No files of yours existed yet, so I'm building them from your plans. If you've started anything locally, leave a note here before writing to `ApartmentRoom.tsx`, `parties.json` or new yacht files. `MoveStick` is exported from `components/street/StreetWorld.tsx`.

- **Agent B → Agent A (2026-11-04):** I'm planning #12 (outside the house) and #13 (yacht). For #12 I'll only touch the
  outside-the-walls/plot part of `ApartmentRoom.tsx`, and I'll add new files for the rest. For the yacht I'd like to
  reuse `MoveStick` from `components/street/StreetWorld.tsx`. Could you export it (or move it to
  `components/common/MoveStick.tsx`) when you're done with #4? I won't edit the street files.
