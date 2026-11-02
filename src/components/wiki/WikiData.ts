// Comprehensive data for the Official Dubai Life Wiki · How to play (/wiki and /wiki/[slug]).
// Teaches players every mechanic in Dubai Life: Onboarding, Sustainability Blueprint & 09:00 GST Burn,
// the 5-Tier Visa Ladder, 6 Real-Time Needs & Health, 9 Skills & Perks, 9 Housing Tiers & 3D Decorator,
// 3D Jobs & Ventures, 3D Metro & RTA Driving, Co-Presence Multipliers & Treat Room, 12 Games, Daily
// Luxury Vault, Dubai Syndicate Wars, and the 30-Second Scam Check.

export interface WikiSectionBlock {
  id: string;
  icon: string;
  title: string;
  badge?: string;
  summary: string;
  bullets: string[];
  table?: {
    headers: string[];
    rows: string[][];
  };
  tip?: string;
  cta?: {
    label: string;
    href: string;
  };
}

export interface WikiHub {
  slug: string;
  icon: string;
  title: string;
  subtitle: string;
  toneA: string;
  toneB: string;
  parent?: { slug: string; title: string };
  childLinks?: Array<{
    slug: string;
    icon: string;
    title: string;
    subtitle: string;
  }>;
  blocks: WikiSectionBlock[];
}

export const FIVE_MINUTE_STEPS = [
  {
    num: 1,
    icon: "🔑",
    title: "Make your account",
    text: "Title screen → Sign up free. Pick your name, @username, and confirm you are 21 or over.",
  },
  {
    num: 2,
    icon: "🧍🏽",
    title: "Create your Citizen & Blueprint",
    text: "Style your 3D avatar, then set your Sustainability Blueprint (housing, food & transit) to control your daily AED burn.",
  },
  {
    num: 3,
    icon: "🍛",
    title: "Keep your six needs up",
    text: "Hunger, Energy, Fun, Social, Hygiene and Bladder drop in real time. Cook, shower, sleep and go out to stay Happy.",
  },
  {
    num: 4,
    icon: "🛂",
    title: "Climb the Visa Ladder",
    text: "You land on a 30-day Visit Visa. Study at Academic City or get hired (Phone → Jobs) to earn Residency & the Golden Visa.",
  },
  {
    num: 5,
    icon: "🏙️",
    title: "Explore, co-op & compete",
    text: "Ride the 3D Metro or drive a supercar, hang out with real players for 2.5× Co-Op boosts, and battle in Syndicate Wars.",
  },
];

export const SCREEN_CALLOUTS = [
  {
    id: 1,
    title: "Top bar, Visa badge & Wallet",
    text: "Shows your 3D avatar (with a green dot when your visa is healthy or pulsing red when ≤5 days remain), Dubai time, mood, players online, music mute button, and your **AED Wallet** (tap **+** to top up or transfer).",
    box: { left: "4%", top: "3%", width: "92%", height: "9%" },
    pin: { top: "calc(7.5% * 0.98 + 1%)", right: "0" },
  },
  {
    id: 2,
    title: "Avatar, Needs & Life Panel",
    text: "Your 6 needs (Hunger 🍽️, Energy ⚡, Fun 🎉, Social 💬, Hygiene 🫧, Bladder 🚽) and active feelings. Tap your avatar or **Me** to open the unified **Life Panel** (Profile, Wishes, Skills, Visa & Budget, League).",
    box: { left: "4%", top: "14%", width: "48%", height: "8%" },
    pin: { top: "calc(18% * 0.98 + 1%)", left: "0" },
  },
  {
    id: 3,
    title: "Bottom Dock, Live Pulse & Phone",
    text: "Switch between **Map · Home · Top · Alerts · Wallet · Me**, or tap the **🔥 Hotspot chip** to jump where citizens are gathered. Above the dock, **Live City Pulse** banners let you join open game tables, VIP bottle drops & house parties in 1 tap. The **📱 Phone** button opens Jobs, Rides, Delivery, Clinic, Cars, Decor & Hayati.",
    box: { left: "4%", top: "84%", width: "92%", height: "12%" },
    pin: { top: "calc(90% * 0.98 + 1%)", left: "0" },
  },
  {
    id: 4,
    title: "Home 3D Controls & Party Host",
    text: "At home (`/home`), switch between **Above** and **Inside** 3D camera views, open **Shop / Style** to place furniture, hire a **Live Player Decorator**, or tap **🎉 Host Party** to broadcast an Open House to everyone online.",
    box: { left: "74%", top: "64%", width: "22%", height: "8%" },
    pin: { top: "calc(68% * 0.98 + 1%)", right: "0" },
  },
  {
    id: 5,
    title: "🎯 Goals, Missions & 3D Luxury Vault",
    text: "Top-left pills track your active **Life Goal**, **3 Daily Missions**, and the **3D Dubai Luxury Vault** jackpot spin.",
    box: { left: "68%", top: "14%", width: "28%", height: "8%" },
    pin: { top: "calc(18% * 0.98 + 1%)", right: "0" },
  },
];

export const WIKI_HUBS: WikiHub[] = [
  {
    slug: "start-here",
    icon: "🌅",
    title: "Start here",
    subtitle:
      "New in Dubai? Your account, your 3D Citizen, reading the screen, and surviving your first day.",
    toneA: "#FFF6DC",
    toneB: "#FDE7A6",
    childLinks: [
      {
        slug: "screen",
        icon: "📱",
        title: "Reading the screen",
        subtitle:
          "Interactive diagram of the top bar, needs, live pulse dock, home controls and phone",
      },
      {
        slug: "places",
        icon: "🗺️",
        title: "Places A–Z",
        subtitle:
          "Every district and venue in Dubai Life, and what you can do inside each one",
      },
    ],
    blocks: [
      {
        id: "vision",
        icon: "🌴",
        title: "What is Dubai Life?",
        badge: "Core Concept",
        summary:
          "Dubai Life is a multiplayer 3D life simulation set in modern Dubai — where ambition, lifestyle, and financial sustainability collide.",
        bullets: [
          "Every player starts as a newcomer arriving at DXB Airport on a **30-Day Visit Visa** with starter savings.",
          "Your mission is to build a thriving life in Dubai: balance your **daily living costs** against your income, keep your **6 real-time needs** healthy, upgrade your **Visa tier** before your clock runs out, and climb from a shared **Deira Bed-Space** to a **Palm Jumeirah Signature Villa**.",
          "Everything happens in a **shared real-time city**: when you walk into a venue, work a shift, host an apartment party, or open a 3D Pool table, other real citizens are right there with you — and co-presence multiplies everyone's rewards.",
        ],
        cta: { label: "Enter Dubai Map", href: "/explore" },
      },
      {
        id: "first-day",
        icon: "🌅",
        title: "Your First Day in Dubai",
        badge: "Getting started",
        summary:
          "Four things worth doing in your first 24 hours.",
        bullets: [
          "**1. Set your Sustainability Blueprint**: Choose your housing tier, daily food plan, and transport mode in the **Visa & Budget** tab so you know your exact daily burn.",
          "**2. Visit a place in the city**: Tap any landmark on the map (like The Dubai Mall, JBR Beach, or Dubai Frame) and step inside.",
          "**3. Enrol or get a job**: Open **Dubai Academic City** (`/academics`) to start a course OR open your **Phone → Jobs** to apply for a career.",
          "**4. Meet someone or play a game**: Chat with a citizen in a venue or play a quick game in **Game City**.",
        ],
        tip: "Never let your bank balance hit AED 0 before 09:00 GST! Keep at least 7–14 days of runway while you get your first job.",
        cta: { label: "Open My Home", href: "/home" },
      },
      {
        id: "blueprint-burn",
        icon: "☀️",
        title: "The 09:00 GST Living-Cost Tick & Runway",
        badge: "Sustainability Loop",
        summary:
          "Every day at 09:00 Dubai time (GST), the city settles your living costs based on your chosen Sustainability Blueprint.",
        bullets: [
          "**Daily Burn = (Monthly Housing + Food Plan + Transport Plan) ÷ 30**.",
          "**Runway Days**: Shown in your Life Panel (`Balance ÷ Daily Burn`). If you have AED 3,000 and burn AED 150/day, you have **20 days of runway**.",
          "**Offline Protection**: If you're away for several days, the **Welcome Back** card summarizes what was charged, what passive venture/rental income you earned, and gives you a 1-tap action to fix your budget or renew your visa.",
          "You can adjust your Blueprint anytime in **Life Panel → Visa & Budget** to cut costs if money gets tight or upgrade your lifestyle when you're rich.",
        ],
      },
    ],
  },
  {
    slug: "screen",
    icon: "📱",
    title: "Reading the screen",
    subtitle:
      "Tap a number on the interactive phone diagram to see what each part of the Dubai Life HUD does.",
    toneA: "#FFF6DC",
    toneB: "#FDE7A6",
    parent: { slug: "start-here", title: "Start here" },
    blocks: [
      {
        id: "shortcuts",
        icon: "⌨️",
        title: "Keyboard Shortcuts & Quick Gestures",
        summary:
          "Playing on a laptop or desktop? Use these instant hotkeys anywhere in the city:",
        bullets: [
          "**S** — Open/close the unified **Life Panel** (Profile, Wishes, Skills, Visa, League).",
          "**⌘K / Ctrl+K** — Open **City Discover Search** to jump to any venue, job, or game.",
          "**Spacebar** — Trigger rhythm/power hits during 3D Venue Activities.",
          "**Pinch / Scroll / Drag** — Pan and zoom the 2D/3D Dubai map or orbit your 3D apartment camera.",
        ],
      },
    ],
  },
  {
    slug: "visa-ladder",
    icon: "🛂",
    title: "The Visa Ladder",
    subtitle:
      "From a 30-day Visit Visa to the 10-year UAE Golden Visa: how residency, sponsorship, and overstay fines work.",
    toneA: "#E6F0FB",
    toneB: "#CFE2F7",
    blocks: [
      {
        id: "visa-overview",
        icon: "🛂",
        title: "How Dubai Visas Work",
        badge: "5 Residency Tiers",
        summary:
          "In Dubai Life, your legal status in the city is governed by the 5-tier Visa Ladder. Moving up the ladder unlocks longer residency, immunity from overstay fines, and prestige.",
        bullets: [
          "Every new citizen arrives on a **30-Day Visit Visa**.",
          "Your remaining visa days are tracked in **Life Panel → Visa & Budget**. If you have **5 days or fewer** left, your Top Bar avatar status dot pulses red to warn you.",
          "If a Visit Visa expires without upgrading or renewing, **daily overstay fines** accrue until you regularize your status.",
        ],
        table: {
          headers: ["Visa Tier", "Duration", "How to Unlock", "Key Benefit"],
          rows: [
            [
              "🛬 Visit Visa",
              "30 Days",
              "Automatic on arrival at DXB",
              "Explore the city, study & interview for jobs",
            ],
            [
              "🎓 Student Visa",
              "90 Days",
              "Enrol & study at Dubai Academic City",
              "Legal residency while completing degrees",
            ],
            [
              "💼 Employment Visa",
              "180 Days",
              "Get hired by a company or player venture",
              "Employer-sponsored residency + shift salary",
            ],
            [
              "🧑‍💻 Freelance / Green Visa",
              "365 Days",
              "High skill level + independent earnings",
              "Self-sponsored — no employer required",
            ],
            [
              "🌟 UAE Golden Visa",
              "10 Years (3,650d)",
              "Own property, found a venture, or top wealth",
              "Permanent prestige, zero overstay stress",
            ],
          ],
        },
        tip: "Fastest path off a Visit Visa: enrol in a foundational course at Dubai Academic City for an immediate Student Visa, or pass a 3D Job Interview in Phone → Jobs for an Employment Visa!",
        cta: { label: "Visit Academic City", href: "/academics" },
      },
    ],
  },
  {
    slug: "your-character",
    icon: "🧍🏽",
    title: "Your character & home",
    subtitle:
      "Needs, moods, illness & Dubai Clinic, 9 skills & perks, all 9 housing tiers, and hiring a live Decorator.",
    toneA: "#E8F7EF",
    toneB: "#C9EEDB",
    blocks: [
      {
        id: "six-needs",
        icon: "🍛",
        title: "The 6 Real-Time Needs & Moods",
        badge: "Sims Core",
        summary:
          "Your Citizen has six physical and social needs from 0% to 100% that slowly drop every hour you play (capped at 2 hours while offline so returning after a week is never a disaster).",
        bullets: [
          "**🍽️ Hunger** (drops 6/hr) — Eat at restaurants, order **Talabat/Deliveroo** in the Phone, or cook at your home kitchen stove/fridge.",
          "**⚡ Energy** (drops 4/hr) — Sleep in your bed at home or grab karak/espresso at a café.",
          "**🎉 Fun** (drops 5/hr) — Dance at clubs, ride rollercoasters, visit beaches, or play in Game City.",
          "**💬 Social** (drops 4/hr) — Chat with citizens in venues, host house parties, or go on dates.",
          "**🫧 Hygiene** (drops 4/hr) — Use your home shower/bath or visit a luxury spa.",
          "**🚽 Bladder** (drops 8/hr) — Use the toilet at home or in any venue.",
          "**Feelings & Mood**: High needs give positive moodlets (*Well Fed +5*, *Energised +5*, *Having a Blast +10*, *Living Large +10*), while low needs trigger *Starving -20*, *Exhausted -20*, or *Smelly -15*.",
        ],
      },
      {
        id: "health-clinic",
        icon: "🏥",
        title: "Illness, Heatstroke & The Dubai Clinic",
        badge: "Health System",
        summary:
          "Pushing your body too hard in Dubai's climate can make you fall ill, causing all needs to drain faster until treated.",
        bullets: [
          "**Flu (Run Down)**: Triggered if both **Hunger < 20%** and **Hygiene < 20%**, or occasionally from dodgy street meals.",
          "**Summer Heatstroke**: Can strike during Dubai summer afternoons (**12:00–16:00 GST**, May–September) if your **Energy < 30%**.",
          "**Treatment**: Open **Phone → Clinic** (or visit Dubai Healthcare City) to see a doctor and restore full health immediately.",
        ],
      },
      {
        id: "skills-wishes-perks",
        icon: "⭐",
        title: "9 Skills, Daily Wishes (✨) & Perks",
        badge: "Progression",
        summary:
          "Practice 9 skills from Level 1 to Level 10 to unlock top-tier careers, higher shift tips, and permanent Perks.",
        bullets: [
          "**The 9 Skills**: **Cooking 🍳**, **Charisma 💬**, **Fitness 💪**, **Coding 💻**, **Music 🎵**, **Hustle 💼**, **Dance 💃**, **Culture 🕌**, and **Gaming 🎮**.",
          "**Skill Rust**: Skills that aren't practiced for several days slowly get rusty — keep practicing to stay sharp!",
          "**Daily Wishes (✨)**: You always have **3 active Wishes** (with up to 3 free rerolls per day). Completing wishes awards **✨ Wish Points**.",
          "**Permanent Perks**: Spend ✨ Wish Points in **Life Panel → Perks** on upgrades like **Iron Stomach** (Hunger drops 25% slower), **Steel Bladder** (30% slower), **Silver Tongue** (Charisma grows 50% faster), **Hustle Juice** (Hustle +50%), and **Quick Study** (all skills grow 25% faster).",
        ],
      },
      {
        id: "housing-tiers",
        icon: "🏠",
        title: "All 9 Housing Tiers, 3D Furnishing & Open Houses",
        badge: "Real Estate",
        summary:
          "Your home (`/home`) is a fully interactive 3D space where you can walk around, use kitchen/bathroom fixtures, place furniture, customize walls/floors, and invite real players over.",
        table: {
          headers: ["Tier", "Home Type", "Vibe & Layout"],
          rows: [
            [
              "1",
              "🛏️ Bed-Space (Deira / Karama)",
              "Shared room with real roommates — cheapest way to maximize early savings",
            ],
            [
              "2",
              "🏢 Studio Apartment",
              "Your first private pad with kitchen & bath fixtures",
            ],
            [
              "3",
              "🚪 1-Bedroom Apartment",
              "Separate living room & bedroom in JVC / Business Bay",
            ],
            [
              "4",
              "🌆 2-Bedroom Apartment",
              "Multi-room Marina / Downtown layout with balcony",
            ],
            [
              "5",
              "🏙️ 3-Bedroom Family Flat",
              "Spacious multi-room residence for hosting",
            ],
            [
              "6",
              "🪜 Two-Storey Duplex",
              "Upstairs & downstairs connected by an interactive 3D staircase",
            ],
            [
              "7",
              "🌴 Townhouse",
              "Private garden terrace & multi-room luxury layout",
            ],
            [
              "8",
              "👑 Sky Penthouse",
              "Panoramic Downtown / Marina high-rise luxury",
            ],
            [
              "9",
              "🏰 Signature Villa (Palm Jumeirah)",
              "The pinnacle of Dubai Life: grand two-storey estate",
            ],
          ],
        },
        bullets: [
          "**Shop & Style**: Buy sofas, beds, 65-inch OLED TVs, rugs, art, wall paints, wainscoting panels, and marble/herringbone floors.",
          "**Hire a Live Decorator**: Don't want to decorate yourself? Open **🛋️ Decorator** at home (or **Phone → Decor**) to hire another real player! Watch them place furniture in real time.",
          "**🎉 Host Party (Open House)**: Tap **🎉 Host Party** in your top bar at `/home` to unlock your door and broadcast a live party invite banner to every player in Dubai!",
        ],
        cta: { label: "Go to My Home", href: "/home" },
      },
    ],
  },
  {
    slug: "money-and-work",
    icon: "💼",
    title: "Money, work & ventures",
    subtitle:
      "3D job interviews & shifts, VIP tip encounters, founding player ventures, academic degrees, and your AED wallet.",
    toneA: "#FFF3D1",
    toneB: "#FBE3A1",
    blocks: [
      {
        id: "jobs-and-shifts",
        icon: "💼",
        title: "Getting Hired & Working 3D Shifts",
        badge: "Active Income",
        summary:
          "Open Phone → Jobs (or visit `/jobs`) to browse open positions across player-owned Ventures and City System employers.",
        bullets: [
          "**1. Pass the 3D Interview**: Answer role-specific interview questions in front of the hiring manager in 3D to land the job and secure your **Employment Visa**.",
          "**2. Work 28-Second 3D Shifts**: Step behind the 3D counter as customers arrive at 3 stations. Tap stations to serve orders before their timers expire!",
          "**3. Combo Streaks & Golden-Halo VIPs**: Serving back-to-back orders builds your **Combo Multiplier**. Watch for customers with a **Golden Halo** — serving 4+ orders gives you a chance at a **Dubai VIP Encounter** (DIFC Royal Advisor, Crypto Whale in a G-Wagon, or Marina Influencer leaving an instant **+AED 350 to +AED 600** bonus!).",
          "**4. Co-Op Coworker Multiplier**: Working while other citizens are active boosts your shift tips up to **1.6×**! Tap **🤝 Recruit Co-Worker** on the shift summary to invite friends.",
        ],
        cta: { label: "Browse Jobs", href: "/jobs" },
      },
      {
        id: "ventures",
        icon: "🏢",
        title: "Founding Player Ventures (`/ventures`)",
        badge: "Business Empire",
        summary:
          "Ready to be the boss? Found your own company in Dubai and hire real players to multiply your daily revenue.",
        bullets: [
          "Choose from **Restaurants, Nightclubs, Tech Startups, Real Estate Agencies, and Luxury Fleets**.",
          "**Multiplayer Staff Multiplier**: Every real player employed at your venture who works their weekly shifts boosts your venture's payout by **+0.5× (up to 3.0× total revenue)**!",
          "Use the **📲 Recruit Staff (+0.5× Revenue)** button on `/ventures` to share a direct hiring link with friends.",
        ],
        cta: { label: "Open Ventures", href: "/ventures" },
      },
      {
        id: "academics",
        icon: "🎓",
        title: "Dubai Academic City (`/academics`)",
        badge: "Degrees & Skills",
        summary:
          "Enrol in accredited courses across AI & Software, Finance, Hospitality, Real Estate, Media, and Emirati Culture.",
        bullets: [
          "Enrolling grants a **Student Visa** and each completed lesson boosts the matching skill.",
          "Graduating awards an official **Certificate**, a **+15 Proud Graduate** moodlet, and unlocks executive salaries.",
        ],
        cta: { label: "Explore Courses", href: "/academics" },
      },
      {
        id: "wallet",
        icon: "💳",
        title: "Your AED Wallet, Transfers & Top-Ups (`/wallet`)",
        badge: "Virtual Economy",
        summary:
          "All money in Dubai Life is virtual AED. Track every dirham you earn, spend, or transfer.",
        bullets: [
          "**Instant P2P Transfers**: Send virtual AED to any citizen by `@username` (or tap **Gift AED** on their profile).",
          "**Top-Ups**: Need extra capital for a Palm Villa, Supercar, or Venture? Top up virtual AED instantly via Paystack in `/wallet`.",
        ],
        cta: { label: "Open Wallet", href: "/wallet" },
      },
    ],
  },
  {
    slug: "getting-around",
    icon: "🚇",
    title: "Getting around & driving",
    subtitle:
      "The interactive Dubai map, 3D Dubai Metro, RTA taxis, buying supercars, driving in 3D, and traffic fines.",
    toneA: "#E6F0FB",
    toneB: "#CFE2F7",
    blocks: [
      {
        id: "metro-and-taxis",
        icon: "🚇",
        title: "3D Dubai Metro, RTA Taxis & Running",
        badge: "Public Transit",
        summary:
          "Open **Phone → Rides** to travel anywhere in Dubai in seconds.",
        bullets: [
          "**🚇 Dubai Metro (3D Journey)**: Choose **Silver Class** or panoramic **Gold Class** at the front of the train. Watch the 3D elevated tracks glide past Burj Khalifa and Sheikh Zayed Road!",
          "**🚕 RTA / Careem Taxi**: Hail a door-to-door ride to any venue on the map.",
          "**🏃🏼 Scenic Jogging Routes**: From `/home`, tap **Run** to jog along **City Walk, Jumeirah Beach Road, or Dubai Marina Promenade** in 3D to boost Fitness and Energy.",
        ],
      },
      {
        id: "cars-and-driving",
        icon: "🏎️",
        title: "3D Car Showroom, Driving & RTA Fines",
        badge: "Supercars & Law",
        summary:
          "Buy your own vehicle in **Phone → Cars** (or `/cars`) and drive it through Dubai in 3D.",
        bullets: [
          "**3D Showroom**: Inspect sedans, SUVs, G-Wagons, and Lamborghinis in 3D before buying.",
          "**3D Driving & Parking**: Steer through traffic, pay RTA parking, and watch out for **Speed Radars**!",
          "**Fines & Police Custody**: Speeding or unpaid parking triggers an **RTA Fine Notice**. If you ignore too many fines, **Dubai Police Custody** (`Phone → Police`) will impound your car until settled!",
        ],
        cta: { label: "Visit Car Showroom", href: "/cars" },
      },
    ],
  },
  {
    slug: "social",
    icon: "🎉",
    title: "Social, Spaces & love",
    subtitle:
      "Live Audio Spaces, 2.5× Venue Co-Presence boosts, Treat the Room, VIP Bottle Service, friends & Hayati dating.",
    toneA: "#FDECEF",
    toneB: "#F9D3DA",
    blocks: [
      {
        id: "audio-spaces",
        icon: "🎙️",
        title: "Live Audio Spaces (`Phone → Spaces`)",
        badge: "Live Voice & Stage Games",
        summary:
          "Open **Phone → Spaces** to host or join live voice rooms with up to **8 speakers on stage** and **45 listeners**, complete with a 60-minute room timer and a **Floating Space Bar** that stays on top of any screen while you play!",
        bullets: [
          "**👑 Host, Co-Hosts & Speakers**: Start a Space, tap any listener with a raised hand (`✋`) to **Invite to Speak (`🎙️`)** or **Add Co-Host (`👑`)**. Active speakers get a glowing green **NOW SPEAKING** avatar ring.",
          "**🎤 Stage Activities**: Run **Talent Night** (`✋ Applause` meter), **Truth or Dare** (spin live prompts), **AED Cash Drops** (reward listeners in the room), or **Play 3D Pool Together** directly from the stage banner!",
          "**↗ Floating Audio Pill**: Close your phone or tap **Float ↗** and your Space stays docked at the top of the screen while you walk around Dubai, work shifts, or play multiplayer games.",
        ],
        cta: { label: "Explore & Open Phone", href: "/explore" },
      },
      {
        id: "co-presence",
        icon: "🔥",
        title: "Venue Co-Presence Boost (Up to 2.5×) & Treat Room",
        badge: "Multiplayer Network Effect",
        summary:
          "Dubai Life rewards you for hanging out in the same place at the same time as other real players!",
        bullets: [
          "**🔥 Live Co-Presence Multiplier**: Every real citizen inside the same venue with you adds **+15% (0.15×)** to everyone's Activity XP, Mood boost, and AED earnings — up to **2.5×**!",
          "**📲 Invite Friend (+25% Pay)**: Inside any venue's **People & Co-Op Boost** sheet, tap **Invite Friend** to copy a deep link (`/?ref=you&go=/place/...`) that teleports your friend straight into your venue.",
          "**🥂 Treat Room (AED 120)**: Buy a round of Karak & Kunafa for everyone currently in the venue — boosts every player's Fun & Social needs and broadcasts a live banner across the city!",
          "**🍾 VIP Bottle Service**: Order luxury bottle service at clubs and lounges to trigger a room-wide **3-minute +25% XP & Mood buff** for everyone present and alert the entire city via **Live City Pulse**!",
        ],
        cta: { label: "Find Live Hotspots", href: "/explore" },
      },
      {
        id: "hayati-love",
        icon: "💘",
        title: "Friends, Door Knocks & Hayati Dating",
        badge: "Relationships",
        summary:
          "Build your circle from casual acquaintances to best friends, roommates, or marriage.",
        bullets: [
          "**People Panel & DMs**: Tap any citizen in a venue or on `/citizens` to add them as a friend, chat live, or send an AED gift.",
          "**Knocking on Doors**: Visit a friend's apartment on the map and knock — if they let you in, you'll appear inside their 3D home together!",
          "**💘 Hayati App (`Phone → Hayati`)**: Swipe, match, go on venue dates, exchange rings, and host a **Dubai Wedding**!",
        ],
        cta: { label: "Meet Citizens", href: "/citizens" },
      },
    ],
  },
  {
    slug: "games-and-prizes",
    icon: "🎱",
    title: "Games, Vault & League",
    subtitle:
      "12 solo & multiplayer games (3D Pool, Ludo, Chess, Tycoon), the 3D Daily Vault, and Dubai Syndicate Wars.",
    toneA: "#F1ECFA",
    toneB: "#E0D6F4",
    blocks: [
      {
        id: "game-city",
        icon: "🎱",
        title: "12 Solo & Multiplayer Games in Game City",
        badge: "Instant Arcade & PvP",
        summary:
          "Head to **Game City** on the map or open **Phone → Games** to play 12 classic and arcade games solo, against AI bots, or in live multiplayer rooms.",
        bullets: [
          "**🎱 3D 8-Ball Pool**: Switch between **3D Lounge View** (with standing 3D avatars around the table) and **2D Top View**. Drag to aim, release to shoot, and tap **📲 Challenge Friend** to broadcast a join link!",
          "**🎲 Board & Card Classics**: **Ludo, Chess, Checkers, Whot, Ayo, Dominoes, Connect Four, and Tic-Tac-Toe**.",
          "**🏙️ Arcade & Strategy**: **Dubai Tycoon, Candy Cascade, and Block Drop (Tetris)** — play instant Single Player runs or race against AI/players!",
          "**Live City Broadcast**: Creating a multiplayer room (`Create a room`) automatically broadcasts a **Live City Pulse** banner so anyone online can join your table in 1 tap!",
        ],
        cta: { label: "Play 3D 8-Ball Pool", href: "/games/pool" },
      },
      {
        id: "daily-vault",
        icon: "🔐",
        title: "Daily Missions, Streaks & The 3D Luxury Vault",
        badge: "Daily Jackpot",
        summary:
          "Complete your 3 quick Daily Missions each day to unlock the **3D Dubai Luxury Vault**.",
        bullets: [
          "Tap the 3D Vault pedestal to pop the lid, shower gold bullion coins, and spin the **5-Slot Luxury Jackpot Reel** for prizes up to **AED 5,000** + bonus XP!",
          "**Streak Freeze**: Keep your daily streak alive for escalating multipliers — and use a Streak Freeze if you ever miss a day.",
        ],
        cta: { label: "View My Goals", href: "/goals" },
      },
      {
        id: "syndicate-wars",
        icon: "🏆",
        title: "Monthly League, Dubai Syndicate Wars & Marathon",
        badge: "Competitive Seasons",
        summary:
          "Every action you take — working shifts, graduating courses, winning games, completing goals — earns **League XP** on the Monthly Leaderboard.",
        bullets: [
          "**⚔️ Dubai Syndicate Wars (`Life Panel → League`)**: Every citizen is assigned to one of 4 rival District Syndicates: **Marina Whales 🐋**, **Downtown Royals 👑**, **DIFC Bulls 📈**, or **Palm Legends 🌴**.",
          "Your XP contributes to both your personal rank AND your Syndicate's live standings bar!",
          "**🏃🏼 Weekend Dubai Marathon**: Every weekend, race against the city in the 3D Dubai Marathon for trophy payouts and League points.",
        ],
        cta: { label: "See Leaderboard", href: "/leaderboard" },
      },
    ],
  },
  {
    slug: "safety-and-scams",
    icon: "🛡️",
    title: "Scam check & safety",
    subtitle:
      "Spotting fake calls in-game, using the free 30-second Dubai Scam Check tool, and community rules.",
    toneA: "#FFF6DC",
    toneB: "#E8F7EF",
    blocks: [
      {
        id: "scam-phone",
        icon: "📵",
        title: "In-Game Scam Calls & The 30-Second Scam Check",
        badge: "Real-World Wisdom",
        summary:
          "Dubai is one of the safest cities in the world, but scammers target newcomers with fake messages. Dubai Life teaches you to spot every red flag.",
        bullets: [
          "**In-Game Scam Phone**: Occasionally your phone will ring with a suspicious offer (fake 'Dubai Police' asking for your OTP, 'guaranteed 40% crypto returns', or a 'recruiter' asking for an upfront visa fee).",
          "**Spot the Red Flag**: Rejecting the scammer earns you **Hustle XP and a reward**; falling for it costs you AED!",
          "**Public `/scam-check` Tool**: Use or share our free interactive **30-Second Dubai Scam Check** (`/scam-check`) to verify real-life job offers, rental listings, and texts.",
        ],
        cta: { label: "Open 30-Second Scam Check", href: "/scam-check" },
      },
    ],
  },
  {
    slug: "whats-new",
    icon: "✨",
    title: "What's new",
    subtitle:
      "In case you missed out! The latest features, 3D upgrades, and multiplayer updates from the Dubai Life team.",
    toneA: "#FFF6DC",
    toneB: "#E8F7EF",
    blocks: [
      {
        id: "latest-release",
        icon: "🚀",
        title:
          "Latest Update: Multiplayer Co-Presence, 3D Pool & Syndicate Wars",
        badge: "New Release",
        summary: "Here is what just landed in Dubai Life:",
        bullets: [
          "**🔥 Live City Pulse & Hotspot Bar**: Real-time notifications above the bottom dock when players open a game table, drop VIP Bottle Service, or host an Open House party.",
          "**🥂 Venue Co-Presence Multiplier (Up to 2.5×)**: Hang out with other citizens in the same venue for automatic XP/AED multipliers, **Treat Room (AED 120)** rounds, and **VIP Bottle Service** room-wide buffs.",
          "**💼 3D Workplace Shifts + Co-Op Multiplier**: Serve customers across 3 stations in 3D, trigger **Golden-Halo VIP Encounters** (+AED 350–600), and earn up to **1.6× Co-Op tips**.",
          "**🎱 3D 8-Ball Pool & Instant Solo Modes**: Play 8-Ball Pool in full 3D Lounge View with standing avatars, plus instant Single Player modes for Candy Cascade & Block Drop.",
          "**⚔️ Dubai Syndicate Wars**: 4-faction district team leaderboard in the League tab.",
          "**🔊 Procedural Web Audio Synth**: Tactile FM chimes, pops, and celebratory arpeggios on every button tap and event.",
        ],
      },
    ],
  },
  {
    slug: "help",
    icon: "🛟",
    title: "Help & FAQ",
    subtitle:
      "Can't log in, enabling iPhone notifications, resetting your password, and how game money works.",
    toneA: "#E6F0FB",
    toneB: "#FFF6DC",
    blocks: [
      {
        id: "faq-list",
        icon: "❓",
        title: "Frequently Asked Questions",
        summary: "Quick fixes for common questions:",
        bullets: [
          "**Forgot your password?** On the title screen, tap **Log in → Forgot password?** and enter your email or `@username`. We'll send a 1-hour reset link.",
          "**How do I get notifications on iPhone?** On iOS, web push notifications work once you add Dubai Life to your Home Screen: tap **Share** in Safari → **Add to Home Screen** → open the app from your Home Screen and tap **Allow Notifications** (plus claim your one-time AED install bonus!).",
          "**Can I cash out virtual AED?** No — all AED earned, won, or topped up in Dubai Life is virtual in-game currency for your Citizen's life, properties, cars, and ventures.",
          "**Why did my balance drop at 09:00 GST?** That's your daily **Sustainability Blueprint** living-cost tick (Housing + Food + Transit). Open **Life Panel → Visa & Budget** to switch to a more affordable plan anytime.",
          "**How do I mute/unmute game sounds?** Tap the speaker icon in the Top Bar on the map or inside your home.",
        ],
      },
    ],
  },
  {
    slug: "glossary",
    icon: "📖",
    title: "Glossary & Places",
    subtitle:
      "Game words and Dubai words explained in plain English, plus every place in the city.",
    toneA: "#E8F7EF",
    toneB: "#FFF6DC",
    childLinks: [
      {
        slug: "places",
        icon: "🗺️",
        title: "Places A–Z",
        subtitle:
          "Browse every landmark, mall, club, beach, and residential tower in Dubai Life",
      },
    ],
    blocks: [
      {
        id: "glossary-table",
        icon: "📖",
        title: "Dubai Life & UAE Dictionary",
        summary:
          "Every term you'll see in the game and around Dubai, explained simply:",
        bullets: [],
        table: {
          headers: ["Term", "Meaning in Dubai Life"],
          rows: [
            [
              "AED (Dirham)",
              "The currency of the UAE and Dubai Life's virtual currency.",
            ],
            [
              "09:00 GST Tick",
              "The daily morning settlement where your Blueprint living costs (and venture/rental income) are processed.",
            ],
            [
              "Runway",
              "How many days your current AED balance will last at your current daily living-cost burn.",
            ],
            [
              "Sustainability Blueprint",
              "Your chosen combination of Housing tier, Food plan, and Transport mode.",
            ],
            [
              "Bed-Space",
              "An affordable shared room in Deira or Karama with roommates — lowest daily burn for newcomers.",
            ],
            [
              "Golden Visa",
              "The top 10-year UAE residency tier; immune to employer sponsorship or overstay fines.",
            ],
            [
              "Co-Presence Boost",
              "Up to 2.5× reward multiplier when multiple real players hang out in the same venue.",
            ],
            [
              "Live City Pulse",
              "Real-time clickable banner above the bottom dock announcing live parties, VIP bottle drops, and open game rooms.",
            ],
            [
              "Wish Points (✨)",
              "Points earned by completing Daily Wishes, spent on permanent Perks like Iron Stomach or Quick Study.",
            ],
            [
              "Syndicate Wars",
              "Monthly competition between Dubai's 4 district factions: Marina Whales, Downtown Royals, DIFC Bulls, and Palm Legends.",
            ],
            [
              "Karak",
              "Iconic spiced milk tea — cheap, delicious, and restores Energy & Social needs.",
            ],
            [
              "DIFC",
              "Dubai International Financial Centre — home to high-paying finance careers, galleries, and fine dining.",
            ],
            [
              "RTA",
              "Roads & Transport Authority — runs the Dubai Metro, Taxis, parking meters, and traffic fines.",
            ],
            [
              "Hayati",
              "'My Life' in Arabic — Dubai Life's in-phone dating and marriage app.",
            ],
          ],
        },
      },
    ],
  },
];

export const MAIN_GRID_SLUGS = [
  "start-here",
  "visa-ladder",
  "your-character",
  "money-and-work",
  "getting-around",
  "social",
  "games-and-prizes",
  "safety-and-scams",
  "glossary",
] as const;
