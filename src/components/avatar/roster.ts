// Realistic ready-made citizens from Microsoft Rocketbox (MIT licence, see public/models/CREDITS.md).
// Each is a rigged, textured human sharing one skeleton, so the same animation clips drive them all.

export type Gender = "woman" | "man";

export interface AvatarLookProps {
  gender: Gender;
  /** Body sculpt applied to roster avatars; see BODY_TYPES. */
  bodyType?: string;
  /** Roster citizen id, e.g. "Female_Party_02". */
  preset?: string;
  /** Outfit: another roster citizen's clothes worn with this face (same gender). */
  wear?: string;
  /** Realistic avatar the citizen made from a selfie in Avaturn. */
  custom?: { avatarId: string; url: string };
  /** Live primary fabric color tint (hex) applied to 3D clothing material. */
  primaryColor?: string;
  /** Live secondary trim / headgear / accent color tint (hex). */
  secondaryColor?: string;
  /** Equipped 3D wig / hairstyle / cultural headgear ID. */
  wigId?: string;
  /** Equipped 3D footwear ID. */
  shoeId?: string;
  /** Equipped 3D manicure / acrylic nails ID. */
  nailId?: string;
  /** Custom nail polish color (hex). */
  nailColor?: string;
  /** Equipped 3D luxury jewelry, Swiss timepiece, or cultural regalia ID. */
  jewelryId?: string;
  /** Pregnancy progression (weeks 1..3) for 3D belly morphing (#6). */
  pregnantWeeks?: number;
  /** Equipped 3D Boxing Gloves for bouts and fight animations. */
  gloves?: "boxing_red" | "boxing_blue" | "none";
  // Fields from the earlier stylised avatar; kept so old saved citizens still load.
  hairstyle?: string;
  outfit?: string;
  fabric?: string;
  skinTone?: string;
  hairColor?: string;
  outfitColor?: string;
  bottomsColor?: string;
}

export interface RosterEntry {
  id: string;
  gender: Gender;
  label: string;
}

export const ROSTER: RosterEntry[] = [
  { id: "Female_Party_02", gender: "woman", label: "Party curls" },
  { id: "Female_Adult_06", gender: "woman", label: "Abaya & hijab" },
  { id: "Female_Adult_10", gender: "woman", label: "Black abaya" },
  { id: "Female_Adult_05", gender: "woman", label: "Office blazer" },
  { id: "Female_Adult_11", gender: "woman", label: "Brown dress" },
  { id: "Female_Adult_01", gender: "woman", label: "Pink shirt" },
  { id: "Female_Adult_12", gender: "woman", label: "Hoodie" },
  { id: "Female_Adult_17", gender: "woman", label: "Green tee" },
  { id: "Female_Party_01", gender: "woman", label: "Party white" },
  { id: "Male_Adult_04", gender: "man", label: "Bomber jacket" },
  { id: "Male_Adult_21", gender: "man", label: "Kandura & ghutra" },
  { id: "Male_Adult_19", gender: "man", label: "Kandura & shemagh" },
  { id: "Male_Adult_12", gender: "man", label: "Denim jacket" },
  { id: "Male_Adult_18", gender: "man", label: "Grey hoodie" },
  { id: "Male_Adult_15", gender: "man", label: "White kurta" },
  { id: "Male_Adult_08", gender: "man", label: "Blue shirt" },
  { id: "Male_Adult_10", gender: "man", label: "Track top" },
  { id: "Male_Adult_17", gender: "man", label: "Sport jacket" },
];

export const rosterFor = (gender: Gender) => ROSTER.filter((r) => r.gender === gender);

/** Faces players can choose: the roster and more from the same set, so Dubai's mix of people is all there. */
export const FACES: RosterEntry[] = [
  ...ROSTER,
  { id: "Business_Female_01", gender: "woman", label: "Face" },
  { id: "Medical_Female_01", gender: "woman", label: "Face" },
  { id: "Female_Adult_03", gender: "woman", label: "Face" },
  { id: "Sports_Female_02", gender: "woman", label: "Face" },
  { id: "Business_Male_05", gender: "man", label: "Face" },
  { id: "Business_Male_02", gender: "man", label: "Face" },
  { id: "Medical_Male_01", gender: "man", label: "Face" },
];
export const facesFor = (gender: Gender) => FACES.filter((r) => r.gender === gender);

// ---------------------------------------------------------------- outfits

/** What an outfit is for, in the order the wardrobe shows them. */
export const OCCASIONS = [
  { id: "everyday", label: "Everyday", icon: "👕" },
  { id: "work", label: "Work", icon: "💼" },
  { id: "night", label: "Night out", icon: "🪩" },
  { id: "formal", label: "Formal & weddings", icon: "🎩" },
  { id: "traditional", label: "Traditional", icon: "🕌" },
  { id: "bridal", label: "Bridal & Couture", icon: "👰" },
  { id: "maternity", label: "Maternity", icon: "🤰" },
  { id: "beach", label: "Beach & pool", icon: "🏖️" },
  { id: "sport", label: "Sport & gym", icon: "🏃" },
  { id: "uniform", label: "Uniforms", icon: "🧑‍✈️" },
] as const;
export type Occasion = (typeof OCCASIONS)[number]["id"];

export type CulturalHeritage = "emirati" | "nigerian" | "indian" | "kenyan" | "cameroonian";

export const CULTURAL_TABS: { id: "all" | CulturalHeritage; label: string; flag: string }[] = [
  { id: "all", label: "All Cultures", flag: "🌍" },
  { id: "nigerian", label: "Nigerian (Owambe)", flag: "🇳🇬" },
  { id: "indian", label: "Indian (Shaadi)", flag: "🇮🇳" },
  { id: "kenyan", label: "Kenyan (Harusi)", flag: "🇰🇪" },
  { id: "cameroonian", label: "Cameroonian (Toghu)", flag: "🇨🇲" },
  { id: "emirati", label: "Emirati & Gulf", flag: "🇦🇪" },
];

export interface OutfitEntry {
  id: string;
  gender: Gender;
  label: string;
  occasion: Occasion;
  /** Underlying Rocketbox GLB when this is a styled cultural or bridal couture piece. */
  baseModel?: string;
  culture?: CulturalHeritage;
  defaultPrimaryColor?: string;
  defaultSecondaryColor?: string;
  defaultWigId?: string;
  price?: number;
  closetValue?: number;
}

/**
 * Clothes a citizen can wear with their own face: every roster citizen's clothes, plus Rocketbox
 * characters and cultural / bridal couture pieces.
 */
export const OUTFITS: OutfitEntry[] = [
  // Women — Maternity: loose, bump-friendly pieces (the bump takes the outfit's colour), for every occasion of a
  // pregnancy: everyday, the office, an evening out, the baby shower.
  { id: "mat_wrap_dress", gender: "woman", label: "🤰 Wrap maternity dress", occasion: "maternity", baseModel: "Female_Adult_11", defaultPrimaryColor: "#f9a8d4", price: 420, closetValue: 70 },
  { id: "mat_lounge_set", gender: "woman", label: "🤰 Soft lounge set", occasion: "maternity", baseModel: "Female_Adult_12", defaultPrimaryColor: "#c4b5fd", price: 320, closetValue: 55 },
  { id: "mat_office_dress", gender: "woman", label: "🤰 Bump-friendly office dress", occasion: "maternity", baseModel: "Female_Adult_15", defaultPrimaryColor: "#1e3a8a", defaultSecondaryColor: "#e2e8f0", price: 560, closetValue: 95 },
  { id: "mat_white_maxi", gender: "woman", label: "🤰 White tunic & shorts", occasion: "maternity", baseModel: "Female_Party_01", defaultPrimaryColor: "#fafaf9", price: 680, closetValue: 120 },
  { id: "mat_abaya", gender: "woman", label: "🤰 Maternity abaya", occasion: "maternity", culture: "emirati", baseModel: "Female_Adult_06", defaultPrimaryColor: "#111827", defaultSecondaryColor: "#d4af37", price: 740, closetValue: 140 },
  { id: "mat_shower_gown", gender: "woman", label: "🤰 Baby shower set", occasion: "maternity", baseModel: "Female_Party_02", defaultPrimaryColor: "#bae6fd", defaultSecondaryColor: "#fde68a", price: 950, closetValue: 160 },
  // Women — Everyday, Work, Night, Formal, Beach, Sport, Uniform
  { id: "Female_Adult_01", gender: "woman", label: "Pink shirt", occasion: "everyday", closetValue: 45 },
  { id: "Female_Adult_12", gender: "woman", label: "Hoodie", occasion: "everyday", closetValue: 40 },
  { id: "Female_Adult_17", gender: "woman", label: "Green tee", occasion: "everyday", closetValue: 35 },
  { id: "Female_Adult_02", gender: "woman", label: "Cardigan & denim skirt", occasion: "everyday", closetValue: 55 },
  { id: "Female_Adult_08", gender: "woman", label: "Tee & jeans", occasion: "everyday", closetValue: 45 },
  { id: "Female_Adult_04", gender: "woman", label: "Leather jacket & boots", occasion: "everyday", closetValue: 85 },
  { id: "Female_Adult_11", gender: "woman", label: "Brown dress", occasion: "everyday", closetValue: 65 },
  { id: "Female_Adult_05", gender: "woman", label: "Office blazer", occasion: "work", closetValue: 90 },
  { id: "Business_Female_01", gender: "woman", label: "Black trouser suit", occasion: "work", closetValue: 110 },
  { id: "Business_Female_02", gender: "woman", label: "Burgundy blazer", occasion: "work", closetValue: 105 },
  { id: "Business_Female_04", gender: "woman", label: "Charcoal suit", occasion: "work", closetValue: 110 },
  { id: "Female_Adult_14", gender: "woman", label: "Beige blazer", occasion: "work", closetValue: 95 },
  { id: "Female_Party_02", gender: "woman", label: "Party curls", occasion: "night", closetValue: 130 },
  { id: "Female_Party_01", gender: "woman", label: "Party white", occasion: "night", closetValue: 140 },
  { id: "Female_Adult_03", gender: "woman", label: "Magenta top", occasion: "night", closetValue: 95 },
  { id: "Business_Female_03", gender: "woman", label: "Skirt suit", occasion: "formal", closetValue: 125 },
  { id: "Female_Adult_15", gender: "woman", label: "Blouse & skirt", occasion: "formal", closetValue: 115 },
  // Women — Emirati & Cultural Traditional Party Attire (#28)
  { id: "Female_Adult_06", gender: "woman", label: "Emirati Abaya & Hijab", occasion: "traditional", culture: "emirati", closetValue: 150 },
  { id: "Female_Adult_10", gender: "woman", label: "Luxury Black Abaya", occasion: "traditional", culture: "emirati", closetValue: 160 },
  {
    id: "ng_iro_buba",
    gender: "woman",
    label: "🇳🇬 Yoruba Iro & Buba + Auto-Gele",
    occasion: "traditional",
    culture: "nigerian",
    baseModel: "Female_Adult_06",
    defaultPrimaryColor: "#059669",
    defaultSecondaryColor: "#d4af37",
    defaultWigId: "gele_crown",
    price: 1800,
    closetValue: 220,
  },
  {
    id: "ng_lace_asoebi",
    gender: "woman",
    label: "🇳🇬 Lagos Lace Asoebi Corset Gown",
    occasion: "traditional",
    culture: "nigerian",
    baseModel: "Female_Party_02",
    defaultPrimaryColor: "#d4af37",
    defaultSecondaryColor: "#ec4899",
    defaultWigId: "gele_crown",
    price: 2400,
    closetValue: 260,
  },
  {
    id: "ng_edo_coral",
    gender: "woman",
    label: "🇳🇬 Edo Okuku Coral Bead Regalia",
    occasion: "traditional",
    culture: "nigerian",
    baseModel: "Female_Party_01",
    defaultPrimaryColor: "#dc2626",
    defaultSecondaryColor: "#f43f5e",
    defaultWigId: "edo_okuku",
    price: 3200,
    closetValue: 310,
  },
  {
    id: "in_saree",
    gender: "woman",
    label: "🇮🇳 Banarasi Silk Saree & Kundan",
    occasion: "traditional",
    culture: "indian",
    baseModel: "Female_Adult_11",
    defaultPrimaryColor: "#dc2626",
    defaultSecondaryColor: "#d4af37",
    defaultWigId: "bridal_tiara",
    price: 2200,
    closetValue: 240,
  },
  {
    id: "in_lehenga",
    gender: "woman",
    label: "🇮🇳 Royal Zardozi Lehenga Choli",
    occasion: "traditional",
    culture: "indian",
    baseModel: "Female_Party_01",
    defaultPrimaryColor: "#ec4899",
    defaultSecondaryColor: "#d4af37",
    defaultWigId: "bridal_tiara",
    price: 2900,
    closetValue: 290,
  },
  {
    id: "in_anarkali",
    gender: "woman",
    label: "🇮🇳 Embroidered Peacock Anarkali",
    occasion: "traditional",
    culture: "indian",
    baseModel: "Female_Adult_06",
    defaultPrimaryColor: "#0d9488",
    defaultSecondaryColor: "#d4af37",
    price: 1950,
    closetValue: 215,
  },
  {
    id: "ke_maasai",
    gender: "woman",
    label: "🇰🇪 Maasai Shuka Drape & Beaded Collar",
    occasion: "traditional",
    culture: "kenyan",
    baseModel: "Female_Adult_11",
    defaultPrimaryColor: "#dc2626",
    defaultSecondaryColor: "#2563eb",
    price: 1650,
    closetValue: 200,
  },
  {
    id: "ke_kitenge",
    gender: "woman",
    label: "🇰🇪 Nairobi Kitenge Mermaid Peplum",
    occasion: "traditional",
    culture: "kenyan",
    baseModel: "Female_Party_02",
    defaultPrimaryColor: "#ea580c",
    defaultSecondaryColor: "#2563eb",
    price: 1850,
    closetValue: 215,
  },
  {
    id: "cm_toghu_queen",
    gender: "woman",
    label: "🇨🇲 Bamenda Royal Velvet Toghu Gown",
    occasion: "traditional",
    culture: "cameroonian",
    baseModel: "Female_Adult_06",
    defaultPrimaryColor: "#171717",
    defaultSecondaryColor: "#d4af37",
    defaultWigId: "tanyi_crown",
    price: 2600,
    closetValue: 275,
  },
  {
    id: "cm_kaba_ngondo",
    gender: "woman",
    label: "🇨🇲 Douala Sawa Kaba Ngondo Gown",
    occasion: "traditional",
    culture: "cameroonian",
    baseModel: "Female_Adult_11",
    defaultPrimaryColor: "#2563eb",
    defaultSecondaryColor: "#fffbeb",
    price: 1750,
    closetValue: 205,
  },
  // Women — Bridal Couture Showroom (#16)
  {
    id: "bridal_mermaid",
    gender: "woman",
    label: "👰 Crystal Mermaid Gown & Cathedral Veil",
    occasion: "bridal",
    baseModel: "Female_Party_01",
    defaultPrimaryColor: "#fffbeb",
    defaultSecondaryColor: "#e0f2fe",
    defaultWigId: "bridal_veil",
    price: 12000,
    closetValue: 480,
  },
  {
    id: "bridal_ballgown",
    gender: "woman",
    label: "👰 Royal Duchesse Satin Ballgown & Tiara",
    occasion: "bridal",
    baseModel: "Female_Adult_06",
    defaultPrimaryColor: "#ffffff",
    defaultSecondaryColor: "#d4af37",
    defaultWigId: "bridal_veil",
    price: 18500,
    closetValue: 620,
  },
  {
    id: "bridal_asoebi_queen",
    gender: "woman",
    label: "👰 Lagos White & 24K Gold Bridal Gele Gown",
    occasion: "bridal",
    culture: "nigerian",
    baseModel: "Female_Party_02",
    defaultPrimaryColor: "#fffbeb",
    defaultSecondaryColor: "#d4af37",
    defaultWigId: "gele_crown",
    price: 15000,
    closetValue: 540,
  },
  {
    id: "bridal_lehenga_queen",
    gender: "woman",
    label: "👰 Maharani Crimson & Gold Bridal Lehenga",
    occasion: "bridal",
    culture: "indian",
    baseModel: "Female_Party_01",
    defaultPrimaryColor: "#b91c1c",
    defaultSecondaryColor: "#d4af37",
    defaultWigId: "bridal_tiara",
    price: 16500,
    closetValue: 580,
  },
  {
    id: "bridal_reception_mini",
    gender: "woman",
    label: "👰 Feather After-Party Reception Mini",
    occasion: "bridal",
    baseModel: "Female_Party_01",
    defaultPrimaryColor: "#f3e5ab",
    defaultSecondaryColor: "#ffffff",
    defaultWigId: "bridal_tiara",
    price: 8500,
    closetValue: 360,
  },
  { id: "Sports_Female_01", gender: "woman", label: "Bikini", occasion: "beach", closetValue: 50 },
  { id: "Sports_Female_02", gender: "woman", label: "Gym top & joggers", occasion: "sport", closetValue: 60 },
  { id: "Pilot_Female_01", gender: "woman", label: "Pilot", occasion: "uniform", closetValue: 120 },
  { id: "Medical_Female_01", gender: "woman", label: "Doctor's scrubs", occasion: "uniform", closetValue: 110 },
  { id: "Chef_Female_01", gender: "woman", label: "Chef whites", occasion: "uniform", closetValue: 95 },

  // Men — Everyday, Work, Night, Formal, Beach, Sport, Uniform
  { id: "Male_Adult_12", gender: "man", label: "Denim jacket", occasion: "everyday", closetValue: 55 },
  { id: "Male_Adult_18", gender: "man", label: "Grey hoodie", occasion: "everyday", closetValue: 45 },
  { id: "Male_Adult_06", gender: "man", label: "Red henley & jeans", occasion: "everyday", closetValue: 45 },
  { id: "Male_Adult_09", gender: "man", label: "Black tee & jeans", occasion: "everyday", closetValue: 40 },
  { id: "Male_Adult_02", gender: "man", label: "Beige sweater", occasion: "everyday", closetValue: 55 },
  { id: "Male_Adult_08", gender: "man", label: "Blue shirt", occasion: "work", closetValue: 75 },
  { id: "Male_Adult_17", gender: "man", label: "Sport jacket", occasion: "work", closetValue: 95 },
  { id: "Male_Adult_14", gender: "man", label: "Shirt & chinos", occasion: "work", closetValue: 85 },
  { id: "Business_Male_02", gender: "man", label: "Navy suit", occasion: "work", closetValue: 120 },
  { id: "Male_Adult_04", gender: "man", label: "Bomber jacket", occasion: "night", closetValue: 95 },
  { id: "Business_Male_06", gender: "man", label: "White shirt", occasion: "night", closetValue: 90 },
  { id: "Business_Male_05", gender: "man", label: "Black suit, purple tie", occasion: "night", closetValue: 135 },
  { id: "Business_Male_01", gender: "man", label: "Black suit, red tie", occasion: "formal", closetValue: 140 },
  { id: "Business_Male_04", gender: "man", label: "Grey waistcoat", occasion: "formal", closetValue: 130 },
  // Men — Emirati & Cultural Traditional Party Attire (#28)
  { id: "Male_Adult_21", gender: "man", label: "Emirati Kandura & Ghutra", occasion: "traditional", culture: "emirati", closetValue: 160 },
  { id: "Male_Adult_19", gender: "man", label: "Emirati Kandura & Shemagh", occasion: "traditional", culture: "emirati", closetValue: 165 },
  { id: "Male_Adult_15", gender: "man", label: "Classic White Kurta", occasion: "traditional", culture: "indian", closetValue: 140 },
  {
    id: "ng_agbada",
    gender: "man",
    label: "🇳🇬 Yoruba Grand 3-Piece Agbada & Fila Gobi",
    occasion: "traditional",
    culture: "nigerian",
    baseModel: "Male_Adult_21",
    defaultPrimaryColor: "#1e3a8a",
    defaultSecondaryColor: "#d4af37",
    defaultWigId: "fila_cap",
    price: 2500,
    closetValue: 280,
  },
  {
    id: "ng_senator",
    gender: "man",
    label: "🇳🇬 Abuja Senator Suit & Gold Chain",
    occasion: "traditional",
    culture: "nigerian",
    baseModel: "Male_Adult_15",
    defaultPrimaryColor: "#881337",
    defaultSecondaryColor: "#d4af37",
    defaultWigId: "fila_cap",
    price: 1900,
    closetValue: 225,
  },
  {
    id: "ng_isi_agu",
    gender: "man",
    label: "🇳🇬 Igbo Isi Agu Lion Velvet & Red Cap",
    occasion: "traditional",
    culture: "nigerian",
    baseModel: "Male_Adult_15",
    defaultPrimaryColor: "#171717",
    defaultSecondaryColor: "#dc2626",
    defaultWigId: "igbo_red_cap",
    price: 2700,
    closetValue: 285,
  },
  {
    id: "in_sherwani",
    gender: "man",
    label: "🇮🇳 Royal Zardozi Sherwani & Safa",
    occasion: "traditional",
    culture: "indian",
    baseModel: "Male_Adult_15",
    defaultPrimaryColor: "#f3e5ab",
    defaultSecondaryColor: "#dc2626",
    defaultWigId: "safa_turban",
    price: 2800,
    closetValue: 290,
  },
  {
    id: "in_bandhgala",
    gender: "man",
    label: "🇮🇳 Jodhpuri Bandhgala Royal Tux",
    occasion: "traditional",
    culture: "indian",
    baseModel: "Business_Male_05",
    defaultPrimaryColor: "#1e3a8a",
    defaultSecondaryColor: "#d4af37",
    price: 2300,
    closetValue: 245,
  },
  {
    id: "ke_shuka",
    gender: "man",
    label: "🇰🇪 Maasai Shuka Drape & Bead Regalia",
    occasion: "traditional",
    culture: "kenyan",
    baseModel: "Male_Adult_15",
    defaultPrimaryColor: "#dc2626",
    defaultSecondaryColor: "#171717",
    price: 1700,
    closetValue: 205,
  },
  {
    id: "ke_kaunda",
    gender: "man",
    label: "🇰🇪 Nairobi Kaunda Safari Suit",
    occasion: "traditional",
    culture: "kenyan",
    baseModel: "Male_Adult_14",
    defaultPrimaryColor: "#65a30d",
    defaultSecondaryColor: "#d4af37",
    price: 1650,
    closetValue: 195,
  },
  {
    id: "cm_toghu_king",
    gender: "man",
    label: "🇨🇲 Grassfields Royal Toghu & Tanyi Hat",
    occasion: "traditional",
    culture: "cameroonian",
    baseModel: "Male_Adult_21",
    defaultPrimaryColor: "#171717",
    defaultSecondaryColor: "#d4af37",
    defaultWigId: "tanyi_crown",
    price: 2650,
    closetValue: 280,
  },
  {
    id: "cm_sanja",
    gender: "man",
    label: "🇨🇲 Douala Sawa Silk Shirt & Sanja",
    occasion: "traditional",
    culture: "cameroonian",
    baseModel: "Male_Adult_15",
    defaultPrimaryColor: "#fffbeb",
    defaultSecondaryColor: "#2563eb",
    price: 1800,
    closetValue: 210,
  },
  // Men — Bridal & Groom Couture Showroom (#16)
  {
    id: "bridal_groom_tux",
    gender: "man",
    label: "🤵 Savile Row Ivory Dinner Tuxedo",
    occasion: "bridal",
    baseModel: "Business_Male_01",
    defaultPrimaryColor: "#fffbeb",
    defaultSecondaryColor: "#171717",
    price: 9500,
    closetValue: 410,
  },
  {
    id: "bridal_groom_agbada",
    gender: "man",
    label: "🤵 Royal Yoruba Groom Agbada (Aṣọ-Òkè & Coral Beads)",
    occasion: "bridal",
    culture: "nigerian",
    baseModel: "Male_Adult_21",
    defaultPrimaryColor: "#fffbeb",
    defaultSecondaryColor: "#d4af37",
    defaultWigId: "fila_cap",
    price: 14000,
    closetValue: 530,
  },
  {
    id: "bridal_groom_sherwani",
    gender: "man",
    label: "🤵 Groom's Royal Gold Brocade Sherwani",
    occasion: "bridal",
    culture: "indian",
    baseModel: "Male_Adult_15",
    defaultPrimaryColor: "#f3e5ab",
    defaultSecondaryColor: "#b91c1c",
    defaultWigId: "safa_turban",
    price: 13500,
    closetValue: 500,
  },
  { id: "Male_Adult_01", gender: "man", label: "Polo & shorts", occasion: "beach", closetValue: 55 },
  { id: "Sports_Male_01", gender: "man", label: "Swim shorts", occasion: "beach", closetValue: 45 },
  { id: "Male_Adult_10", gender: "man", label: "Track top", occasion: "sport", closetValue: 65 },
  { id: "Sports_Male_04", gender: "man", label: "Running kit", occasion: "sport", closetValue: 60 },
  { id: "Sports_Male_02", gender: "man", label: "Football kit", occasion: "sport", closetValue: 70 },
  { id: "Pilot_Male_01", gender: "man", label: "Pilot captain", occasion: "uniform", closetValue: 130 },
  { id: "Medical_Male_01", gender: "man", label: "Doctor's coat", occasion: "uniform", closetValue: 115 },
];

/** 16 Curated Fabric & Trim Color Swatches for Live 3D Clothing Customization (#20, #28). */
export const FABRIC_PALETTE: { id: string; label: string; hex: string }[] = [
  { id: "gold", label: "24K Royal Gold", hex: "#d4af37" },
  { id: "emerald", label: "Lagos Emerald", hex: "#059669" },
  { id: "ruby", label: "Shaadi Ruby Red", hex: "#dc2626" },
  { id: "sapphire", label: "Royal Sapphire", hex: "#2563eb" },
  { id: "navy", label: "Royal Navy Blue", hex: "#1e3a8a" },
  { id: "white", label: "Pure Silk White", hex: "#ffffff" },
  { id: "champagne", label: "Champagne Silk", hex: "#f3e5ab" },
  { id: "rose", label: "Asoebi Rose Pink", hex: "#ec4899" },
  { id: "amethyst", label: "Imperial Purple", hex: "#7c3aed" },
  { id: "orange", label: "Kitenge Sunburst", hex: "#ea580c" },
  { id: "teal", label: "Peacock Teal", hex: "#0d9488" },
  { id: "ivory", label: "Bridal Pearl Ivory", hex: "#fffbeb" },
  { id: "obsidian", label: "Toghu Velvet Black", hex: "#171717" },
  { id: "burgundy", label: "Senator Burgundy", hex: "#881337" },
  { id: "sky", label: "Marina Cyan", hex: "#0284c7" },
  { id: "coral", label: "Edo Coral", hex: "#f43f5e" },
  { id: "olive", label: "Safari Olive", hex: "#65a30d" },
  { id: "lilac", label: "Orchid Lilac", hex: "#c084fc" },
];

/** 15+ Wigs, Braids & Cultural Headgear (#21, #28, #16). */
export interface WardrobeSubItem {
  id: string;
  label: string;
  icon: string;
  price: number;
  closetValue: number;
  color: string;
  gender?: Gender;
  category?: "necklace" | "watch" | "bracelet" | "ring" | "earrings";
  brand?: string;
}

export const WIGS_CATALOG: WardrobeSubItem[] = [
  // Ladies — Wigs, Braids, Gele & Bridal Crowns
  { id: "bone_straight_30", gender: "woman", label: "30\" Bone Straight Silk Wig", icon: "💇‍♀️", price: 1200, closetValue: 140, color: "#111827" },
  { id: "body_wave_honey", gender: "woman", label: "Honey Blonde Body Wave", icon: "✨", price: 1350, closetValue: 155, color: "#b45309" },
  { id: "boho_box_braids", gender: "woman", label: "Waist-Length Boho Knotless Braids", icon: "🧶", price: 950, closetValue: 125, color: "#1f2937" },
  { id: "fulani_beaded", gender: "woman", label: "Fulani Tribal Braids & Gold Cuffs", icon: "👑", price: 1100, closetValue: 135, color: "#292524" },
  { id: "afro_puff_crown", gender: "woman", label: "Royal Afro Puff Crown", icon: "🌺", price: 750, closetValue: 95, color: "#18181b" },
  { id: "platinum_bob", gender: "woman", label: "Platinum Ice Blunt Bob", icon: "💎", price: 1050, closetValue: 130, color: "#f8fafc" },
  { id: "burgundy_curls", gender: "woman", label: "99J Burgundy Velvet Curls", icon: "🍷", price: 1150, closetValue: 135, color: "#881337" },
  { id: "high_sleek_pony", gender: "woman", label: "Sleek Snatched High Ponytail", icon: "🎀", price: 850, closetValue: 110, color: "#171717" },
  { id: "gele_crown", gender: "woman", label: "🇳🇬 Lagos Pleated Auto-Gele", icon: "👑", price: 900, closetValue: 145, color: "#d4af37" },
  { id: "edo_okuku", gender: "woman", label: "🇳🇬 Edo Royal Coral Bead Okuku", icon: "🔴", price: 1600, closetValue: 210, color: "#dc2626" },
  { id: "bridal_veil", gender: "woman", label: "👰 Cathedral Lace Veil & Diamond Tiara", icon: "👰", price: 2400, closetValue: 260, color: "#ffffff" },
  { id: "bridal_tiara", gender: "woman", label: "💎 Maharani Diamond & Emerald Tiara", icon: "💎", price: 1900, closetValue: 220, color: "#e0f2fe" },
  { id: "dubai_luxury_cap_f", gender: "woman", label: "🧢 Dubai Yacht Club Fitted Cap", icon: "🧢", price: 550, closetValue: 95, color: "#1e3a8a" },

  // Gentlemen — Cultural Caps, Turbans, Crowns & Groomed Cuts
  { id: "dubai_luxury_cap", gender: "man", label: "🧢 Dubai Royal Yacht Club Cap", icon: "🧢", price: 550, closetValue: 95, color: "#1e3a8a" },
  { id: "fila_cap", gender: "man", label: "🇳🇬 Yoruba Fìlà Abetí Ajá / Gòbì Cap", icon: "👑", price: 650, closetValue: 120, color: "#1e3a8a" },
  { id: "igbo_red_cap", gender: "man", label: "🇳🇬 Igbo Chieftaincy Eagle Feather Cap", icon: "🪶", price: 1100, closetValue: 160, color: "#dc2626" },
  { id: "safa_turban", gender: "man", label: "🇮🇳 Royal Groom Kalgi Safa Turban", icon: "👳‍♂️", price: 1250, closetValue: 175, color: "#f3e5ab" },
  { id: "tanyi_crown", gender: "man", label: "🇨🇲 Bamenda Feather Tanyi Crown", icon: "👑", price: 1300, closetValue: 180, color: "#dc2626" },
  { id: "emirati_ghutra_agal", gender: "man", label: "🇦🇪 Royal White Ghutra & Gold Agal", icon: "👑", price: 1200, closetValue: 170, color: "#f8fafc" },
  { id: "low_taper_waves", gender: "man", label: "💈 360 Waves & Sharp Low Taper Fade", icon: "💈", price: 600, closetValue: 95, color: "#111827" },
  { id: "king_locs_fade", gender: "man", label: "🦁 Royal Two-Strand Twist Locs", icon: "🦁", price: 850, closetValue: 120, color: "#1f2937" },
  { id: "kenyan_beaded_hat", gender: "man", label: "🇰🇪 Kenyan Beaded Cultural Kofia", icon: "🧢", price: 750, closetValue: 115, color: "#b91c1c" },
];

export const SHOES_CATALOG: WardrobeSubItem[] = [
  // Ladies — Heels, Pumps, Mules & Runway Footwear
  { id: "red_bottom_heels", gender: "woman", label: "Red-Bottom Loubi Stilettos", icon: "👠", price: 2200, closetValue: 210, color: "#dc2626" },
  { id: "crystal_bridal_heels", gender: "woman", label: "Cinderella Swarovski Bridal Pumps", icon: "💎", price: 2800, closetValue: 250, color: "#e0f2fe" },
  { id: "gold_owambe_heels", gender: "woman", label: "24K Gold Strappy Owambe Heels", icon: "✨", price: 1450, closetValue: 165, color: "#d4af37" },
  { id: "emerald_mules", gender: "woman", label: "Emerald Satin Crystal Mules", icon: "👠", price: 1300, closetValue: 145, color: "#059669" },
  { id: "rose_platform_heels", gender: "woman", label: "Pink Satin Runway Platforms", icon: "👠", price: 1550, closetValue: 165, color: "#ec4899" },
  { id: "ladies_strappy_sandals", gender: "woman", label: "Pearl & Gold Resort Strappy Sandals", icon: "👡", price: 1150, closetValue: 135, color: "#fef3c7" },
  { id: "ladies_designer_sneakers", gender: "woman", label: "Crystal Runway Platform Sneakers", icon: "👟", price: 1600, closetValue: 170, color: "#f8fafc" },

  // Gentlemen — Loafers, Oxfords, Mojari, Boots, Sneakers & Slides
  { id: "bata_soso", gender: "man", label: "🇳🇬 Royal Velvet Embroidered Bàtà Ṣọ̀sọ́", icon: "👞", price: 1450, closetValue: 170, color: "#1e3a8a" },
  { id: "velvet_loafers", gender: "man", label: "Gold-Crest Black Velvet Loafers", icon: "👞", price: 1650, closetValue: 175, color: "#171717" },
  { id: "patent_oxfords", gender: "man", label: "Italian Mirror-Shine Oxfords", icon: "👞", price: 1400, closetValue: 150, color: "#0f172a" },
  { id: "royal_mojari", gender: "man", label: "🇮🇳 Gold Zardozi Embroidered Mojari", icon: "👞", price: 1100, closetValue: 140, color: "#d4af37" },
  { id: "designer_high_tops", gender: "man", label: "Dubai Mall Limited High-Top Sneakers", icon: "👟", price: 1800, closetValue: 185, color: "#f8fafc" },
  { id: "hermes_slides", gender: "man", label: "Palm Resort Leather Slides", icon: "🩴", price: 950, closetValue: 115, color: "#b45309" },
  { id: "emirati_leather_sandals", gender: "man", label: "🇦🇪 Handcrafted Emirati Leather Mandoos", icon: "🩴", price: 1250, closetValue: 145, color: "#78350f" },
  { id: "chelsea_suede_boots", gender: "man", label: "Savile Row Suede Chelsea Boots", icon: "🥾", price: 1500, closetValue: 160, color: "#451a03" },
];

export const NAILS_CATALOG: WardrobeSubItem[] = [
  // Strictly Ladies Only (gender: "woman")
  { id: "xxl_french_coffin", gender: "woman", label: "XXL French Tip Coffin Acrylics", icon: "💅", price: 350, closetValue: 65, color: "#fdf2f8" },
  { id: "gold_chrome_stiletto", gender: "woman", label: "24K Gold Chrome Stiletto Claws", icon: "✨", price: 480, closetValue: 85, color: "#d4af37" },
  { id: "ruby_almond", gender: "woman", label: "Ruby Red Gloss Almond Set", icon: "❤️", price: 320, closetValue: 60, color: "#dc2626" },
  { id: "bridal_pearl_ombre", gender: "woman", label: "Bridal Glazed Donut Pearl Ombré", icon: "🤍", price: 420, closetValue: 75, color: "#fffbeb" },
  { id: "neon_pink_bling", gender: "woman", label: "Hot Pink Diamond Encrusted XL", icon: "💖", price: 450, closetValue: 80, color: "#ec4899" },
  { id: "emerald_cateye", gender: "woman", label: "Lagos Emerald Velvet Cat-Eye", icon: "💚", price: 390, closetValue: 70, color: "#059669" },
  { id: "sapphire_french", gender: "woman", label: "Royal Blue Tips & Gold Foil", icon: "💙", price: 380, closetValue: 70, color: "#2563eb" },
  { id: "obsidian_matte", gender: "woman", label: "Black Onyx & Gold Studs", icon: "🖤", price: 360, closetValue: 65, color: "#171717" },
];

export const JEWELRY_CATALOG: WardrobeSubItem[] = [
  // Ladies' Haute Horlogerie & High Jewelry (Necklaces, Chokers, Watches, Bangles & Rings)
  {
    id: "vca_alhambra_necklace",
    gender: "woman",
    category: "necklace",
    brand: "Van Cleef & Arpels",
    label: "Van Cleef 18K Alhambra Malachite Pendant",
    icon: "🍀",
    price: 18500,
    closetValue: 450,
    color: "#059669",
  },
  {
    id: "cartier_panthere_collar",
    gender: "woman",
    category: "necklace",
    brand: "Cartier",
    label: "Cartier Panthère 18K Rose Gold Diamond Collar",
    icon: "🐆",
    price: 45000,
    closetValue: 850,
    color: "#fbcfe8",
  },
  {
    id: "bulgari_serpenti_choker",
    gender: "woman",
    category: "necklace",
    brand: "Bulgari",
    label: "Bulgari Serpenti Viper White Gold Diamond Choker",
    icon: "🐍",
    price: 38000,
    closetValue: 720,
    color: "#e2e8f0",
  },
  {
    id: "gold_souk_royal_choker",
    gender: "woman",
    category: "necklace",
    brand: "Dubai Gold Souk",
    label: "24K Dubai Gold Souk Royal Bridal Choker",
    icon: "👑",
    price: 26000,
    closetValue: 560,
    color: "#d4af37",
  },
  {
    id: "rolex_lady_pearlmaster",
    gender: "woman",
    category: "watch",
    brand: "Rolex",
    label: "Rolex Lady-Datejust 28 Everose Diamond Pavé",
    icon: "⌚",
    price: 68000,
    closetValue: 1100,
    color: "#fb7185",
  },
  {
    id: "graff_emerald_drop",
    gender: "woman",
    category: "necklace",
    brand: "Graff",
    label: "Graff Colombian Emerald & Diamond Drop",
    icon: "💎",
    price: 52000,
    closetValue: 950,
    color: "#10b981",
  },
  {
    id: "tiffany_diamond_stack",
    gender: "woman",
    category: "bracelet",
    brand: "Tiffany & Co.",
    label: "Tiffany Platinum Diamond Tennis Stack & Ring",
    icon: "💍",
    price: 22000,
    closetValue: 480,
    color: "#f8fafc",
  },
  {
    id: "edo_royal_coral_necklace_f",
    gender: "woman",
    category: "necklace",
    brand: "Edo Heritage",
    label: "🇳🇬 Edo Royal Queen Coral Bead Choker & Bangles",
    icon: "🔴",
    price: 14000,
    closetValue: 380,
    color: "#dc2626",
  },

  // Gentlemen's Luxury Horology Watches, Heavy Chains & Cultural Regalia
  {
    id: "rolex_daytona_rainbow",
    gender: "man",
    category: "watch",
    brand: "Rolex",
    label: "Rolex Daytona Rainbow 18K Everose Chronograph",
    icon: "🌈",
    price: 95000,
    closetValue: 1450,
    color: "#f59e0b",
  },
  {
    id: "ap_royal_oak_skeleton",
    gender: "man",
    category: "watch",
    brand: "Audemars Piguet",
    label: "AP Royal Oak Double Balance Skeleton Gold",
    icon: "⌚",
    price: 82000,
    closetValue: 1280,
    color: "#d4af37",
  },
  {
    id: "patek_nautilus_diamond",
    gender: "man",
    category: "watch",
    brand: "Patek Philippe",
    label: "Patek Philippe Nautilus 5711 Platinum Bezel",
    icon: "⌚",
    price: 115000,
    closetValue: 1650,
    color: "#cbd5e1",
  },
  {
    id: "richard_mille_rm65",
    gender: "man",
    category: "watch",
    brand: "Richard Mille",
    label: "Richard Mille RM 65-01 Split-Seconds Chrono",
    icon: "⏱️",
    price: 130000,
    closetValue: 1800,
    color: "#334155",
  },
  {
    id: "gold_souk_miami_cuban",
    gender: "man",
    category: "necklace",
    brand: "Dubai Gold Souk",
    label: "24K Solid Gold Souk Heavy Miami Cuban Link",
    icon: "⛓️",
    price: 34000,
    closetValue: 680,
    color: "#d4af37",
  },
  {
    id: "cartier_iced_cuban",
    gender: "man",
    category: "necklace",
    brand: "Cartier",
    label: "Cartier Santos Iced-Out Diamond Baguette Chain",
    icon: "💎",
    price: 58000,
    closetValue: 1050,
    color: "#f1f5f9",
  },
  {
    id: "chieftaincy_coral_beads_m",
    gender: "man",
    category: "necklace",
    brand: "Royal Chieftaincy",
    label: "🇳🇬 Heavy Chieftaincy Royal Coral Crown Neckpiece",
    icon: "🔴",
    price: 16500,
    closetValue: 420,
    color: "#dc2626",
  },
  {
    id: "emirati_falcon_signet",
    gender: "man",
    category: "ring",
    brand: "Emirati Heritage",
    label: "🇦🇪 UAE Royal Falcon 18K Gold Signet Ring & Cufflinks",
    icon: "🦅",
    price: 19500,
    closetValue: 460,
    color: "#eab308",
  },
];

export const outfitById = (id: string | undefined) => (id ? OUTFITS.find((o) => o.id === id) : undefined);
export const resolveModelId = (id: string) => outfitById(id)?.baseModel ?? id;
export const outfitsFor = (gender: Gender) => OUTFITS.filter((o) => o.gender === gender);
export const wigsFor = (gender: Gender) => WIGS_CATALOG.filter((w) => !w.gender || w.gender === gender);
export const shoesFor = (gender: Gender) => SHOES_CATALOG.filter((s) => !s.gender || s.gender === gender);
export const nailsFor = (gender: Gender) => NAILS_CATALOG.filter((n) => (n.gender ?? "woman") === gender);
export const jewelryFor = (gender: Gender) => JEWELRY_CATALOG.filter((j) => !j.gender || j.gender === gender);
export const isOutfit = (id: string | undefined, gender: Gender) => !!id && OUTFITS.some((o) => o.id === id && o.gender === gender);
export const defaultPreset = (gender: Gender) => rosterFor(gender)[0].id;
export const rosterModel = (id: string) => `/models/rocketbox/${resolveModelId(id)}.glb`;
export const rosterThumb = (id: string) => `/models/rocketbox/thumbs/${resolveModelId(id)}.jpg`;

/** Calculates the citizen's total Closet Value (CV) score from their look & owned wardrobe (#20, #21). */
export function computeClosetValue(look: AvatarLookProps | undefined, ownedIds: string[] = []): number {
  let cv = 100; // Base starter wardrobe value
  const wearEntry = outfitById(look?.wear);
  if (wearEntry?.closetValue) cv += wearEntry.closetValue;
  if (look?.primaryColor) cv += 35; // Custom tailored dye bonus
  if (look?.secondaryColor) cv += 25;
  const wig = WIGS_CATALOG.find((w) => w.id === look?.wigId);
  if (wig) cv += wig.closetValue;
  const shoe = SHOES_CATALOG.find((s) => s.id === look?.shoeId);
  if (shoe) cv += shoe.closetValue;
  const nail = NAILS_CATALOG.find((n) => n.id === look?.nailId);
  if (nail) cv += nail.closetValue;
  const jewel = JEWELRY_CATALOG.find((j) => j.id === look?.jewelryId);
  if (jewel) cv += jewel.closetValue;
  for (const id of ownedIds) {
    const o = outfitById(id);
    if (o?.closetValue && id !== look?.wear) cv += Math.round(o.closetValue * 0.35);
    const w = WIGS_CATALOG.find((x) => x.id === id);
    if (w && id !== look?.wigId) cv += Math.round(w.closetValue * 0.35);
    const s = SHOES_CATALOG.find((x) => x.id === id);
    if (s && id !== look?.shoeId) cv += Math.round(s.closetValue * 0.35);
    const n = NAILS_CATALOG.find((x) => x.id === id);
    if (n && id !== look?.nailId) cv += Math.round(n.closetValue * 0.35);
    const j = JEWELRY_CATALOG.find((x) => x.id === id);
    if (j && id !== look?.jewelryId) cv += Math.round(j.closetValue * 0.35);
  }
  return cv;
}

/** Roster clips per gender, keyed by the animation the app asks for. */
export const rosterAnimations = (gender: Gender) => {
  const g = gender === "man" ? "m" : "f";
  return {
    idle: `/models/rocketbox/anims/${g}_idle.glb`,
    sit: `/models/rocketbox/anims/${g}_sit.glb`,
    wave: `/models/rocketbox/anims/${g}_wave.glb`,
    clap: `/models/rocketbox/anims/${g}_clap.glb`,
    walk: `/models/rocketbox/anims/${g}_walk.glb`,
    dance: `/models/rocketbox/anims/${g}_dance.glb`,
    talk: `/models/rocketbox/anims/${g}_talk.glb`,
  };
};

/** The roster citizen a look resolves to (old looks without a preset get the gender default). */
export function presetFor(look: AvatarLookProps) {
  const found = look.preset && FACES.find((r) => r.id === look.preset);
  return found ? found.id : defaultPreset(look.gender);
}
