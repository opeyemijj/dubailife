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

// ---------------------------------------------------------------- outfits

/** What an outfit is for, in the order the wardrobe shows them. */
export const OCCASIONS = [
  { id: "everyday", label: "Everyday", icon: "👕" },
  { id: "work", label: "Work", icon: "💼" },
  { id: "night", label: "Night out", icon: "🪩" },
  { id: "formal", label: "Formal & weddings", icon: "🎩" },
  { id: "traditional", label: "Traditional", icon: "🕌" },
  { id: "beach", label: "Beach & pool", icon: "🏖️" },
  { id: "sport", label: "Sport & gym", icon: "🏃" },
  { id: "uniform", label: "Uniforms", icon: "🧑‍✈️" },
] as const;
export type Occasion = (typeof OCCASIONS)[number]["id"];

export interface OutfitEntry { id: string; gender: Gender; label: string; occasion: Occasion }

/**
 * Clothes a citizen can wear with their own face: every roster citizen's clothes, plus Rocketbox
 * characters that are only used as outfits (suits, sportswear, swimwear and work uniforms).
 */
export const OUTFITS: OutfitEntry[] = [
  // Women
  { id: "Female_Adult_01", gender: "woman", label: "Pink shirt", occasion: "everyday" },
  { id: "Female_Adult_12", gender: "woman", label: "Hoodie", occasion: "everyday" },
  { id: "Female_Adult_17", gender: "woman", label: "Green tee", occasion: "everyday" },
  { id: "Female_Adult_02", gender: "woman", label: "Cardigan & denim skirt", occasion: "everyday" },
  { id: "Female_Adult_08", gender: "woman", label: "Tee & jeans", occasion: "everyday" },
  { id: "Female_Adult_04", gender: "woman", label: "Leather jacket & boots", occasion: "everyday" },
  { id: "Female_Adult_11", gender: "woman", label: "Brown dress", occasion: "everyday" },
  { id: "Female_Adult_05", gender: "woman", label: "Office blazer", occasion: "work" },
  { id: "Business_Female_01", gender: "woman", label: "Black trouser suit", occasion: "work" },
  { id: "Business_Female_02", gender: "woman", label: "Burgundy blazer", occasion: "work" },
  { id: "Business_Female_04", gender: "woman", label: "Charcoal suit", occasion: "work" },
  { id: "Female_Adult_14", gender: "woman", label: "Beige blazer", occasion: "work" },
  { id: "Female_Party_02", gender: "woman", label: "Party curls", occasion: "night" },
  { id: "Female_Party_01", gender: "woman", label: "Party white", occasion: "night" },
  { id: "Female_Adult_03", gender: "woman", label: "Magenta top", occasion: "night" },
  { id: "Business_Female_03", gender: "woman", label: "Skirt suit", occasion: "formal" },
  { id: "Female_Adult_15", gender: "woman", label: "Blouse & skirt", occasion: "formal" },
  { id: "Female_Adult_06", gender: "woman", label: "Abaya & hijab", occasion: "traditional" },
  { id: "Female_Adult_10", gender: "woman", label: "Black abaya", occasion: "traditional" },
  { id: "Sports_Female_01", gender: "woman", label: "Bikini", occasion: "beach" },
  { id: "Sports_Female_02", gender: "woman", label: "Gym top & joggers", occasion: "sport" },
  { id: "Pilot_Female_01", gender: "woman", label: "Pilot", occasion: "uniform" },
  { id: "Medical_Female_01", gender: "woman", label: "Doctor's scrubs", occasion: "uniform" },
  { id: "Chef_Female_01", gender: "woman", label: "Chef whites", occasion: "uniform" },
  // Men
  { id: "Male_Adult_12", gender: "man", label: "Denim jacket", occasion: "everyday" },
  { id: "Male_Adult_18", gender: "man", label: "Grey hoodie", occasion: "everyday" },
  { id: "Male_Adult_06", gender: "man", label: "Red henley & jeans", occasion: "everyday" },
  { id: "Male_Adult_09", gender: "man", label: "Black tee & jeans", occasion: "everyday" },
  { id: "Male_Adult_02", gender: "man", label: "Beige sweater", occasion: "everyday" },
  { id: "Male_Adult_08", gender: "man", label: "Blue shirt", occasion: "work" },
  { id: "Male_Adult_17", gender: "man", label: "Sport jacket", occasion: "work" },
  { id: "Male_Adult_14", gender: "man", label: "Shirt & chinos", occasion: "work" },
  { id: "Business_Male_02", gender: "man", label: "Navy suit", occasion: "work" },
  { id: "Male_Adult_04", gender: "man", label: "Bomber jacket", occasion: "night" },
  { id: "Business_Male_06", gender: "man", label: "White shirt", occasion: "night" },
  { id: "Business_Male_05", gender: "man", label: "Black suit, purple tie", occasion: "night" },
  { id: "Business_Male_01", gender: "man", label: "Black suit, red tie", occasion: "formal" },
  { id: "Business_Male_04", gender: "man", label: "Grey waistcoat", occasion: "formal" },
  { id: "Male_Adult_21", gender: "man", label: "Kandura & ghutra", occasion: "traditional" },
  { id: "Male_Adult_19", gender: "man", label: "Kandura & shemagh", occasion: "traditional" },
  { id: "Male_Adult_15", gender: "man", label: "White kurta", occasion: "traditional" },
  { id: "Male_Adult_01", gender: "man", label: "Polo & shorts", occasion: "beach" },
  { id: "Sports_Male_01", gender: "man", label: "Swim shorts", occasion: "beach" },
  { id: "Male_Adult_10", gender: "man", label: "Track top", occasion: "sport" },
  { id: "Sports_Male_04", gender: "man", label: "Running kit", occasion: "sport" },
  { id: "Sports_Male_02", gender: "man", label: "Football kit", occasion: "sport" },
  { id: "Pilot_Male_01", gender: "man", label: "Pilot captain", occasion: "uniform" },
  { id: "Medical_Male_01", gender: "man", label: "Doctor's coat", occasion: "uniform" },
];

export const outfitsFor = (gender: Gender) => OUTFITS.filter((o) => o.gender === gender);
export const isOutfit = (id: string | undefined, gender: Gender) => !!id && OUTFITS.some((o) => o.id === id && o.gender === gender);
export const defaultPreset = (gender: Gender) => rosterFor(gender)[0].id;
export const rosterModel = (id: string) => `/models/rocketbox/${id}.glb`;
export const rosterThumb = (id: string) => `/models/rocketbox/thumbs/${id}.jpg`;

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
  const found = look.preset && ROSTER.find((r) => r.id === look.preset);
  return found ? found.id : defaultPreset(look.gender);
}
