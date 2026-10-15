// Product ranges, services and jobs by kind of business, priced in AED at 2026 Dubai levels.
// Product names describe the item rather than using manufacturers' trademarks.

import type { JobDef, Product } from "./types";

const p = (id: string, name: string, price: number, icon: string, station: Product["station"], desc: string, extra: Partial<Product> = {}): Product =>
  ({ id, name, price, icon, station, desc, ...extra });

export const CATALOGS = {
  fashion: [
    p("tee", "Organic cotton T-shirt", 79, "👕", "table", "Relaxed fit, breathable for Dubai heat."),
    p("linen-shirt", "Linen shirt", 159, "👔", "rack", "Lightweight linen, perfect for summer evenings."),
    p("jeans", "Slim-fit jeans", 199, "👖", "rack", "Stretch denim with a modern slim cut."),
    p("dress", "Midi summer dress", 229, "👗", "rack", "Flowing midi dress in a soft print."),
    p("blazer", "Tailored blazer", 499, "🧥", "rack", "Unstructured blazer for office or dinner."),
    p("abaya", "Classic black abaya", 349, "🖤", "rack", "Crepe abaya with a subtle embroidered trim."),
    p("kandura", "White kandura", 289, "🤍", "rack", "Classic Emirati cut in breathable cotton blend."),
    p("sneakers", "Leather sneakers", 299, "👟", "table", "Clean white leather sneakers."),
    p("tote", "Canvas tote bag", 129, "👜", "table", "Roomy everyday tote.", { wearable: "handbag" }),
    p("cap", "Logo baseball cap", 79, "🧢", "table", "Adjustable cotton cap.", { wearable: "cap" }),
    p("shades", "Classic sunglasses", 149, "🕶️", "table", "UV400 lenses, acetate frame.", { wearable: "sunglasses" }),
  ],
  luxury: [
    p("lux-bag", "Monogram leather tote", 8900, "👜", "wall", "Signature canvas with leather trim, made in Italy.", { wearable: "handbag" }),
    p("lux-mini", "Quilted mini bag", 14500, "👛", "wall", "Lambskin, gold-tone chain strap.", { wearable: "handbag" }),
    p("lux-scarf", "Silk twill scarf", 1650, "🧣", "case", "Hand-rolled edges, 90 × 90 cm."),
    p("lux-belt", "Reversible leather belt", 2400, "🪢", "case", "Calfskin with polished buckle."),
    p("lux-loafers", "Leather loafers", 3800, "👞", "table", "Hand-stitched, leather sole."),
    p("lux-shades", "Designer sunglasses", 1450, "🕶️", "case", "Acetate frame with metal temples.", { wearable: "sunglasses" }),
    p("lux-cap", "Embroidered cap", 1900, "🧢", "table", "Cotton gabardine, embroidered logo.", { wearable: "cap" }),
    p("lux-jacket", "Wool-cashmere coat", 16500, "🧥", "rack", "Double-faced wool and cashmere."),
  ],
  sports: [
    p("run-shoes", "Cushioned running shoes", 549, "👟", "wall", "Responsive foam for long runs."),
    p("train-tee", "Dri training tee", 149, "👕", "rack", "Sweat-wicking, quick-dry fabric."),
    p("leggings", "High-rise leggings", 299, "🩱", "rack", "Squat-proof, four-way stretch."),
    p("hoodie", "Fleece hoodie", 299, "🧥", "rack", "Brushed-back fleece."),
    p("gym-bag", "Gym duffel bag", 199, "🎒", "table", "Separate shoe compartment.", { wearable: "handbag" }),
    p("sport-cap", "Running cap", 99, "🧢", "table", "Lightweight, reflective details.", { wearable: "cap" }),
    p("bottle", "Insulated bottle 750ml", 79, "🥤", "table", "Keeps water cold for 24 hours."),
    p("sport-shades", "Sport sunglasses", 399, "🕶️", "table", "Wraparound polarised lenses.", { wearable: "sunglasses" }),
  ],
  electronics: [
    p("phone", "Pro smartphone 256GB", 4299, "📱", "table", "6.3\" OLED, triple camera, all-day battery.", { specs: { Display: '6.3" OLED 120Hz', Storage: "256 GB", Camera: "48 MP triple", Battery: "All day", Weight: "199 g" } }),
    p("phone-max", "Pro Max smartphone 512GB", 5899, "📱", "table", "Biggest screen, 5× telephoto camera.", { specs: { Display: '6.9" OLED 120Hz', Storage: "512 GB", Camera: "48 MP + 5× tele", Battery: "Up to 33 h video", Weight: "227 g" } }),
    p("laptop", '14" laptop M-series 16GB', 6999, "💻", "table", "Fanless, 18-hour battery life.", { specs: { Display: '14.2" Liquid Retina', Memory: "16 GB", Storage: "512 GB SSD", Battery: "18 h", Weight: "1.55 kg" } }),
    p("tablet", '11" tablet 128GB', 3199, "📲", "table", "Laminated display, pencil support.", { specs: { Display: '11" 120Hz', Storage: "128 GB", Battery: "10 h", Weight: "470 g" } }),
    p("earbuds", "Noise-cancelling earbuds", 999, "🎧", "wall", "Adaptive ANC, spatial audio.", { specs: { ANC: "Adaptive", Battery: "6 h (30 h case)", Water: "IP54" } }),
    p("headphones", "Over-ear ANC headphones", 1499, "🎧", "wall", "Studio sound, 30-hour battery.", { wearable: "headphones", specs: { ANC: "Yes", Battery: "30 h", Weight: "385 g" } }),
    p("watch", "Smartwatch 45mm", 1699, "⌚", "case", "Health sensors, always-on display.", { wearable: "watch", specs: { Case: "45 mm aluminium", Battery: "18 h", Water: "50 m" } }),
    p("tv", '65" 4K OLED TV', 5499, "📺", "wall", "Self-lit pixels, Dolby Vision.", { specs: { Size: '65"', Panel: "OLED 4K 120Hz", HDR: "Dolby Vision" } }),
    p("console", "Next-gen games console", 2099, "🎮", "table", "4K gaming, 1 TB SSD.", { specs: { Storage: "1 TB SSD", Output: "4K 120 fps" } }),
    p("camera", "Mirrorless camera kit", 3999, "📷", "case", "24 MP full-frame with 28–60 mm lens.", { specs: { Sensor: "24 MP full-frame", Video: "4K 60p", Lens: "28–60 mm" } }),
    p("powerbank", "20,000 mAh power bank", 149, "🔋", "till", "Fast-charges two devices."),
    p("setup", "Personal setup session", 0, "🧑‍💻", "service", "A specialist helps you set up and transfer your data.", { service: true }),
  ],
  beauty: [
    p("foundation", "Long-wear foundation", 175, "🧴", "shelf", "Buildable coverage, 40 shades."),
    p("lipstick", "Satin lipstick", 125, "💄", "shelf", "Creamy, long-lasting colour."),
    p("mascara", "Volumising mascara", 110, "🖤", "shelf", "Lengthens without clumping."),
    p("palette", "Eyeshadow palette", 245, "🎨", "shelf", "12 matte and shimmer shades."),
    p("skincare", "Hydrating skincare set", 399, "🧖", "wall", "Cleanser, serum and moisturiser."),
    p("perfume", "Eau de parfum 100ml", 495, "🌸", "counter", "Floral musk with amber base."),
    p("dryer", "Supersonic hair dryer", 1599, "💨", "wall", "Fast drying with controlled heat."),
    p("makeover", "Express makeover (20 min)", 150, "✨", "service", "A beauty advisor does your look.", { service: true }),
  ],
  fragrance: [
    p("oud-oil", "Cambodian oud oil 3ml", 650, "🪔", "case", "Rich, woody, long-lasting."),
    p("bakhoor", "Bakhoor wood chips 100g", 180, "🔥", "shelf", "Traditional home fragrance."),
    p("edp", "Oriental eau de parfum 100ml", 420, "🌹", "shelf", "Rose, saffron and amber."),
    p("musk", "White musk 50ml", 220, "🤍", "shelf", "Soft, clean and sweet."),
    p("gift-set", "Arabian fragrance gift set", 890, "🎁", "case", "Perfume, oud oil and bakhoor."),
    p("burner", "Brass incense burner", 260, "🏺", "table", "Hand-finished mabkhara."),
    p("blend", "Custom blend consultation", 120, "🧪", "service", "Create your own signature scent.", { service: true }),
  ],
  jewellery: [
    p("chain", "18k gold chain", 6500, "📿", "case", "Rope chain, 50 cm.", { wearable: "necklace" }),
    p("studs", "Diamond stud earrings 0.5ct", 12500, "💎", "case", "Round brilliant, platinum setting."),
    p("solitaire", "Solitaire engagement ring 1ct", 28000, "💍", "case", "GIA-certified, platinum band."),
    p("bracelet", "Diamond tennis bracelet", 35000, "✨", "case", "3 carats total weight."),
    p("lux-watch", "Automatic luxury watch 41mm", 48000, "⌚", "case", "Steel case, sapphire crystal.", { wearable: "watch" }),
    p("pendant", "Crystal heart pendant", 590, "💖", "case", "Faceted crystal on rhodium chain.", { wearable: "necklace" }),
    p("engrave", "Engraving service", 150, "✍️", "service", "Personalise any piece.", { service: true }),
  ],
  supermarket: [
    p("water", "Mineral water 6 × 1.5L", 9, "💧", "shelf", "Local spring water.", { consumable: { need: "hunger", amount: 3 } }),
    p("dates", "Medjool dates 500g", 45, "🌴", "shelf", "Plump UAE-grown dates.", { consumable: { need: "hunger", amount: 12 } }),
    p("bread", "Sourdough loaf", 14, "🍞", "shelf", "Baked in store this morning.", { consumable: { need: "hunger", amount: 15 } }),
    p("fruit", "Fruit basket", 39, "🍎", "table", "Seasonal fruit selection.", { consumable: { need: "hunger", amount: 20 } }),
    p("laban", "Laban 1L", 7, "🥛", "shelf", "Cultured yoghurt drink.", { consumable: { need: "hunger", amount: 6 } }),
    p("chocolate", "Dark chocolate bar", 18, "🍫", "till", "70% cocoa.", { consumable: { need: "fun", amount: 6 } }),
    p("coffee-beans", "Arabica coffee beans 250g", 42, "☕", "shelf", "Medium roast.", { consumable: { need: "energy", amount: 15 } }),
    p("ready-meal", "Chicken biryani ready meal", 24, "🍛", "shelf", "Heat in 4 minutes.", { consumable: { need: "hunger", amount: 35 } }),
  ],
  books: [
    p("novel", "Bestselling novel", 65, "📕", "shelf", "This month's most-read fiction."),
    p("arabic", "Arabic calligraphy book", 120, "🖋️", "shelf", "Learn naskh and thuluth scripts."),
    p("manga", "Manga volume", 45, "📗", "shelf", "Latest volume in the series."),
    p("cookbook", "Emirati cookbook", 150, "🍲", "table", "Machboos, luqaimat and more."),
    p("kids", "Children's picture book", 49, "📘", "table", "Bedtime story favourite."),
    p("stationery", "Leather notebook", 85, "📓", "till", "A5, dotted pages."),
  ],
  toys: [
    p("teddy", "Giant teddy bear", 249, "🧸", "shelf", "Super-soft, 80 cm."),
    p("camel", "Plush camel", 79, "🐪", "table", "A Dubai souvenir favourite."),
    p("rc-car", "Remote-control supercar", 249, "🏎️", "table", "1:16 scale, 20 km/h."),
    p("bricks", "Building bricks skyline set", 399, "🧱", "shelf", "Build Dubai's skyline, 1,200 pieces."),
    p("board-game", "Family board game", 169, "🎲", "shelf", "2–6 players, ages 8+."),
    p("demo", "Toy demo show", 0, "🎪", "service", "Watch the staff demo the latest toys.", { service: true }),
  ],
  eyewear: [
    p("aviators", "Aviator sunglasses", 690, "🕶️", "case", "Polarised, gold-tone metal.", { wearable: "sunglasses" }),
    p("wayfarer", "Classic square sunglasses", 590, "🕶️", "case", "Acetate frame.", { wearable: "sunglasses" }),
    p("sport-wrap", "Sport wrap sunglasses", 790, "🕶️", "case", "Lightweight, high-contrast lenses.", { wearable: "sunglasses" }),
    p("eye-test", "Eye test", 0, "👁️", "service", "Free 15-minute eye check with an optometrist.", { service: true }),
  ],
  home: [
    p("cushions", "Linen cushion set", 220, "🛋️", "table", "Two covers with feather inserts."),
    p("vase", "Ceramic vase", 180, "🏺", "shelf", "Hand-glazed."),
    p("candle", "Scented candle", 120, "🕯️", "shelf", "Oud & vanilla, 50-hour burn."),
    p("throw", "Knitted throw", 290, "🧶", "table", "Chunky cotton knit."),
  ],
  pharmacy: [
    p("sunscreen", "SPF 50 sunscreen", 89, "🧴", "shelf", "Broad spectrum, water resistant."),
    p("vitamins", "Multivitamin 60 tabs", 75, "💊", "shelf", "Daily wellness support."),
    p("lip-balm", "SPF lip balm", 25, "👄", "till", "Protects against sun and wind."),
    p("advice", "Ask the pharmacist", 0, "🧑‍⚕️", "service", "General product advice (not medical advice).", { service: true }),
  ],
  cafe: [
    p("espresso", "Espresso", 16, "☕", "menu", "Double shot, house blend.", { consumable: { need: "energy", amount: 12 } }),
    p("latte", "Spanish latte", 26, "🥛", "menu", "With condensed milk.", { consumable: { need: "energy", amount: 14 } }),
    p("karak", "Karak chai", 12, "🍵", "menu", "Spiced milk tea.", { consumable: { need: "energy", amount: 10 } }),
    p("croissant", "Butter croissant", 18, "🥐", "counter", "Baked this morning.", { consumable: { need: "hunger", amount: 12 } }),
    p("cheesecake", "Cheesecake slice", 39, "🍰", "counter", "New York style.", { consumable: { need: "fun", amount: 10 } }),
    p("smoothie", "Mango smoothie", 29, "🥭", "menu", "Fresh mango and yoghurt.", { consumable: { need: "hunger", amount: 10 } }),
  ],
  restaurant: [
    p("mezze", "Mixed mezze platter", 68, "🫓", "menu", "Hummus, moutabal, tabbouleh and warm bread.", { consumable: { need: "hunger", amount: 25 } }),
    p("main", "Chef's signature main", 145, "🍽️", "menu", "The kitchen's most-ordered dish.", { consumable: { need: "hunger", amount: 45 } }),
    p("grill", "Mixed grill", 125, "🍖", "menu", "Shish tawook, kofta and lamb chops.", { consumable: { need: "hunger", amount: 45 } }),
    p("pasta", "Fresh pasta", 85, "🍝", "menu", "Made in-house daily.", { consumable: { need: "hunger", amount: 35 } }),
    p("dessert", "Kunafa", 45, "🍮", "menu", "Warm cheese kunafa with syrup.", { consumable: { need: "fun", amount: 12 } }),
    p("mocktail", "Signature mocktail", 42, "🍹", "bar", "Passionfruit, mint and soda.", { consumable: { need: "social", amount: 8 } }),
    p("table", "Book a table for 2", 0, "📅", "reception", "Reserve the best table tonight.", { service: true }),
  ],
  club: [
    p("entry", "Entry ticket", 150, "🎟️", "reception", "General admission tonight.", { service: true }),
    p("cocktail", "Signature cocktail", 95, "🍸", "bar", "Vodka, passionfruit and a prosecco float. 21+, ID checked at the bar.", { consumable: { need: "social", amount: 12 } }),
    p("espresso-martini", "Espresso martini", 90, "🍸", "bar", "Vodka, coffee liqueur and a fresh espresso shot. 21+.", { consumable: { need: "energy", amount: 10 } }),
    p("mocktail-club", "Premium mocktail", 75, "🍸", "bar", "Smoked rosemary and pineapple.", { consumable: { need: "social", amount: 10 } }),
    p("soft", "Soft drink", 35, "🥤", "bar", "Chilled can.", { consumable: { need: "energy", amount: 5 } }),
    p("bottle-service", "Bottle service (sparkling)", 3500, "🍾", "booth", "Sparklers included, serves 6.", { consumable: { need: "fun", amount: 40 } }),
    p("vip-table", "VIP table reservation", 5000, "🛋️", "booth", "Minimum spend, best view of the DJ.", { service: true }),
    p("dj-gift", "Send the DJ a gift", 250, "🎁", "dj", "Shout-out and a song request.", { service: true }),
  ],
  hotel: [
    p("room", "Deluxe room, 1 night", 1450, "🛏️", "reception", "King bed, Burj Khalifa view.", { service: true }),
    p("suite", "Fountain-view suite, 1 night", 3900, "🌇", "reception", "Separate living room, butler service.", { service: true }),
    p("spa", "Signature spa treatment 60 min", 650, "💆", "service", "Hammam and aromatherapy massage.", { service: true, consumable: { need: "energy", amount: 30 } }),
    p("pool", "Pool day pass", 250, "🏊", "service", "Infinity pool, towel and lounger.", { service: true, consumable: { need: "fun", amount: 25 } }),
    p("afternoon-tea", "Afternoon tea for two", 395, "🫖", "bar", "Lounge tea with Burj views.", { consumable: { need: "social", amount: 20 } }),
    p("room-service", "Room service club sandwich", 95, "🥪", "bar", "Delivered in 30 minutes.", { consumable: { need: "hunger", amount: 30 } }),
  ],
} satisfies Record<string, Product[]>;

export type CatalogKey = keyof typeof CATALOGS;

/** Products for a venue: a catalog, optionally namespaced so different stores don't share ids. */
export const catalog = (key: CatalogKey, prefix: string) => CATALOGS[key].map((x) => ({ ...x, id: `${prefix}:${x.id}` }));

// ---------------------------------------------------------------- jobs

const interview = (pairs: Array<[string, string[], number]>) => pairs.map(([q, options, answer]) => ({ q, options, answer }));

export const JOBS: Partial<Record<CatalogKey, Omit<JobDef, "shift"> & { shift: Array<{ customer: string; wants: string; productKey: string }> }>> = {
  fashion: {
    role: "Sales Associate", wage: 350,
    interview: interview([
      ["A customer can't find her size. You…", ["Tell her it's sold out", "Check the stockroom and other stores", "Suggest a different shop"], 1],
      ["The fitting rooms are full. You…", ["Take names and call them in order", "Let people queue however", "Close the fitting rooms"], 0],
      ["Folding tables look messy after a rush. You…", ["Leave it for the night team", "Refold and restock right away", "Hide items in the stockroom"], 1],
    ]),
    shift: [
      { customer: "Tourist", wants: "something light for the heat", productKey: "tee" },
      { customer: "Office worker", wants: "a jacket for a meeting", productKey: "blazer" },
      { customer: "Teenager", wants: "a cap for the beach", productKey: "cap" },
    ],
  },
  sports: {
    role: "Sports Advisor", wage: 340,
    interview: interview([
      ["A runner wants shoes for a marathon. You ask about…", ["Their favourite colour", "Their gait, distance and current shoes", "Their budget only"], 1],
      ["A customer returns sweaty kit. You…", ["Follow the returns policy politely", "Refuse loudly", "Ignore them"], 0],
      ["Best item for a 40°C outdoor run?", ["Fleece hoodie", "Cap and insulated bottle", "Leather jacket"], 1],
    ]),
    shift: [
      { customer: "Marathon runner", wants: "new running shoes", productKey: "run-shoes" },
      { customer: "Yoga teacher", wants: "comfy leggings", productKey: "leggings" },
      { customer: "Desert hiker", wants: "to stay hydrated", productKey: "bottle" },
    ],
  },
  electronics: {
    role: "Tech Specialist", wage: 450,
    interview: interview([
      ["A customer's new phone won't turn on. First step?", ["Sell them another phone", "Charge it and try a force restart", "Send them away"], 1],
      ["Someone asks which laptop is best. You…", ["Pick the most expensive", "Ask what they'll use it for", "Say they're all the same"], 1],
      ["Explaining specs to a beginner, you…", ["Use plain language and examples", "Use as much jargon as possible", "Hand them the manual"], 0],
    ]),
    shift: [
      { customer: "Student", wants: "a laptop for university", productKey: "laptop" },
      { customer: "Commuter", wants: "to block out metro noise", productKey: "earbuds" },
      { customer: "Gamer", wants: "the newest console", productKey: "console" },
    ],
  },
  beauty: {
    role: "Beauty Advisor", wage: 380,
    interview: interview([
      ["A customer wants foundation but isn't sure of her shade. You…", ["Guess", "Swatch-match on her jawline in daylight", "Sell the darkest one"], 1],
      ["Testers should be…", ["Shared without cleaning", "Sanitised and used with disposable applicators", "Kept behind the counter"], 1],
      ["Someone wants a gift but doesn't know the person's taste. Suggest…", ["A skincare set or gift card", "Their least-favourite colour", "Nothing"], 0],
    ]),
    shift: [
      { customer: "Bride-to-be", wants: "a long-lasting lip colour", productKey: "lipstick" },
      { customer: "Gift shopper", wants: "a perfume for his wife", productKey: "perfume" },
      { customer: "Desert camper", wants: "a skincare routine", productKey: "skincare" },
    ],
  },
  fragrance: {
    role: "Fragrance Consultant", wage: 360,
    interview: interview([
      ["Bakhoor is used…", ["On a burner to scent the home and clothes", "As a food spice", "On the skin directly"], 0],
      ["A customer says oud is too strong. Suggest…", ["Even more oud", "A lighter musk or rose blend", "Nothing"], 1],
      ["To test a perfume properly, a customer should…", ["Smell it straight from the bottle", "Try it on skin and wait a few minutes", "Spray it on the floor"], 1],
    ]),
    shift: [
      { customer: "Visitor", wants: "a traditional home scent", productKey: "bakhoor" },
      { customer: "Collector", wants: "pure oud oil", productKey: "oud-oil" },
      { customer: "Gift shopper", wants: "a complete Arabian gift", productKey: "gift-set" },
    ],
  },
  jewellery: {
    role: "Jewellery Consultant", wage: 500,
    interview: interview([
      ["A ring that costs AED 28,000 should be shown…", ["Thrown on the counter", "On a velvet tray, one piece at a time", "Through the window only"], 1],
      ["Diamond grading uses the 4 Cs: cut, colour, clarity and…", ["Carat", "Cost", "Certificate"], 0],
      ["A customer wants an anniversary gift. You ask…", ["What styles she already wears", "How much money they have", "Nothing"], 0],
    ]),
    shift: [
      { customer: "Nervous groom", wants: "an engagement ring", productKey: "solitaire" },
      { customer: "Graduate", wants: "a first luxury watch", productKey: "lux-watch" },
      { customer: "Teen", wants: "a small pendant gift", productKey: "pendant" },
    ],
  },
  supermarket: {
    role: "Cashier", wage: 280,
    interview: interview([
      ["The queue is long. You…", ["Call for another till to open", "Go on break", "Serve slower"], 0],
      ["A customer's card is declined. You…", ["Announce it loudly", "Discreetly offer to try again or another method", "Keep the groceries"], 1],
      ["Fresh bread goes on…", ["The bakery shelf, oldest at the front", "The floor", "The freezer"], 0],
    ]),
    shift: [
      { customer: "Family", wants: "dates for guests", productKey: "dates" },
      { customer: "Jogger", wants: "water", productKey: "water" },
      { customer: "Night-shift nurse", wants: "a quick dinner", productKey: "ready-meal" },
    ],
  },
  cafe: {
    role: "Barista", wage: 300,
    interview: interview([
      ["A latte is espresso plus…", ["Steamed milk", "Hot water", "Ice cream"], 0],
      ["A customer says their drink is wrong. You…", ["Argue", "Apologise and remake it", "Ignore them"], 1],
      ["Karak chai is…", ["Spiced milk tea", "Cold brew coffee", "Fruit juice"], 0],
    ]),
    shift: [
      { customer: "Early commuter", wants: "a strong coffee", productKey: "espresso" },
      { customer: "Tourist", wants: "something local and warm", productKey: "karak" },
      { customer: "Student", wants: "breakfast pastry", productKey: "croissant" },
    ],
  },
  restaurant: {
    role: "Server", wage: 320,
    interview: interview([
      ["A guest mentions a nut allergy. You…", ["Tell the kitchen and check every dish", "Ignore it", "Tell them to pick out the nuts"], 0],
      ["A table is waiting a long time. You…", ["Update them and offer water or bread", "Avoid their table", "Blame the chef"], 0],
      ["When should you bring the bill?", ["When the guest asks for it", "Before they order", "With the starters"], 0],
    ]),
    shift: [
      { customer: "Family of four", wants: "something to share", productKey: "mezze" },
      { customer: "Hungry builder", wants: "a big plate of meat", productKey: "grill" },
      { customer: "Couple", wants: "a sweet ending", productKey: "dessert" },
    ],
  },
  club: {
    role: "VIP Host", wage: 420,
    interview: interview([
      ["A guest at the door has no ticket. You…", ["Offer one at the reception", "Let them in for free", "Shout at them"], 0],
      ["A VIP table asks for the DJ to shout them out. You…", ["Arrange a DJ gift and request", "Say no", "Do it yourself on the mic"], 0],
      ["Someone looks unwell. You…", ["Get security and first aid to help", "Ignore it", "Sell them another drink"], 0],
    ]),
    shift: [
      { customer: "Birthday group", wants: "the best table", productKey: "vip-table" },
      { customer: "Designated driver", wants: "a fancy alcohol-free drink", productKey: "mocktail-club" },
      { customer: "Fan", wants: "to request a song", productKey: "dj-gift" },
    ],
  },
  hotel: {
    role: "Front Desk Agent", wage: 420,
    interview: interview([
      ["A guest arrives early before check-in. You…", ["Store luggage and offer the pool or lounge", "Tell them to wait outside", "Charge a fee"], 0],
      ["A guest wants a quiet room. You…", ["Pick a high floor away from the lifts", "Put them next to the lift", "Say there are no rooms"], 0],
      ["Concierge question: best Fountain show view?", ["Waterfront terrace or a fountain-view room", "The car park", "The basement"], 0],
    ]),
    shift: [
      { customer: "Honeymooners", wants: "a view of the fountain", productKey: "suite" },
      { customer: "Business traveller", wants: "one night's stay", productKey: "room" },
      { customer: "Stressed guest", wants: "to relax", productKey: "spa" },
    ],
  },
};

/** A store's job, with shift tasks resolved to its own product ids. */
export function jobFor(key: CatalogKey, prefix: string): JobDef | undefined {
  const j = JOBS[key];
  if (!j) return undefined;
  return { ...j, shift: j.shift.map((s) => ({ customer: s.customer, wants: s.wants, productId: `${prefix}:${s.productKey}` })) };
}
