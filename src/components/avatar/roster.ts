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
