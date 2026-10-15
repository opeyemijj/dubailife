// Fashion catalog with categorised items for the 3D Clothing Store & Fitting Room.

import type { Accessory } from "./city/types";
import type { Gender } from "@/components/avatar/roster";

export type FashionCategory = "outfits" | "tops" | "trousers" | "dresses" | "jackets" | "shoes" | "accessories";

export interface FashionItem {
  id: string;
  name: string;
  category: FashionCategory;
  price: number; // AED
  icon: string;
  desc: string;
  gender: Gender | "unisex";
  /** Roster preset worn with this item, if a full outfit or top/bottom bundle */
  lookWear?: string;
  /** Accessory kind if wearable */
  accessory?: Accessory;
  tag?: string;
}

export const FASHION_CATEGORIES: Array<{ id: FashionCategory | "all"; label: string; icon: string }> = [
  { id: "all", label: "All Items", icon: "✨" },
  { id: "outfits", label: "Complete Outfits", icon: "👘" },
  { id: "dresses", label: "Dresses & Robes", icon: "👗" },
  { id: "jackets", label: "Jackets & Blazers", icon: "🧥" },
  { id: "tops", label: "Tops & Shirts", icon: "👕" },
  { id: "trousers", label: "Trousers & Pants", icon: "👖" },
  { id: "shoes", label: "Shoes & Footwear", icon: "👟" },
  { id: "accessories", label: "Accessories", icon: "🕶️" },
];

export const FASHION_CATALOG: FashionItem[] = [
  // --- COMPLETE OUTFITS ---
  {
    id: "outfit-abaya-gold",
    name: "Emirati Silk Abaya & Hijab",
    category: "outfits",
    price: 850,
    icon: "🖤",
    desc: "Black crepe abaya featuring hand-embroidered gold hems and pure silk shayla.",
    gender: "woman",
    lookWear: "Female_Adult_06",
    tag: "Traditional Luxury",
  },
  {
    id: "outfit-kandura-ghutra",
    name: "Emirati Kandura & Red Shemagh",
    category: "outfits",
    price: 750,
    icon: "🤍",
    desc: "Impeccably tailored white cotton kandura with authentic red-and-white shemagh & agal.",
    gender: "man",
    lookWear: "Male_Adult_19",
    tag: "National Dress",
  },
  {
    id: "outfit-kandura-white",
    name: "Royal White Kandura & Ghutra",
    category: "outfits",
    price: 890,
    icon: "🤍",
    desc: "Crisp snowy-white ghutra and premium breathable cotton kandura.",
    gender: "man",
    lookWear: "Male_Adult_21",
    tag: "VIP Elegance",
  },
  {
    id: "outfit-party-glam",
    name: "Burj Khalifa Gala Dress",
    category: "outfits",
    price: 1850,
    icon: "✨",
    desc: "Glamorous party evening dress tailored for Dubai's most exclusive rooftop lounges.",
    gender: "woman",
    lookWear: "Female_Party_02",
    tag: "VIP Nightlife",
  },
  {
    id: "outfit-party-white",
    name: "Palm Jumeirah White Lounge Fit",
    category: "outfits",
    price: 1450,
    icon: "🤍",
    desc: "Sleek all-white cocktail ensemble crafted for beach clubs and superyacht parties.",
    gender: "woman",
    lookWear: "Female_Party_01",
    tag: "White Party",
  },
  {
    id: "outfit-office-blazer",
    name: "DIFC Executive Double Blazer",
    category: "outfits",
    price: 1200,
    icon: "💼",
    desc: "Sharply structured corporate blazer with tailored cigarette pants for business leaders.",
    gender: "woman",
    lookWear: "Female_Adult_05",
    tag: "Executive",
  },
  {
    id: "outfit-mens-bomber",
    name: "Downtown Bomber & Chinos",
    category: "outfits",
    price: 950,
    icon: "🧥",
    desc: "Supple leather bomber jacket paired with tapered stretch chinos and luxury sneakers.",
    gender: "man",
    lookWear: "Male_Adult_04",
    tag: "Street Luxury",
  },
  {
    id: "outfit-mens-denim",
    name: "City Walk Denim Streetwear",
    category: "outfits",
    price: 790,
    icon: "👖",
    desc: "Heavyweight vintage-washed denim jacket with raw selvedge jeans.",
    gender: "man",
    lookWear: "Male_Adult_12",
    tag: "Streetwear",
  },
  {
    id: "outfit-kurta-linen",
    name: "Pure White Linen Kurta",
    category: "outfits",
    price: 650,
    icon: "🥻",
    desc: "Airy, soft linen kurta with mandarin collar, ideal for Dubai sun.",
    gender: "man",
    lookWear: "Male_Adult_15",
    tag: "Resort Comfort",
  },

  // --- DRESSES & ROBES ---
  {
    id: "dress-midi-summer",
    name: "JBR Floral Midi Summer Dress",
    category: "dresses",
    price: 490,
    icon: "👗",
    desc: "Breezy pastel-patterned midi dress designed for Marina promenade strolls.",
    gender: "woman",
    lookWear: "Female_Adult_11",
  },
  {
    id: "dress-black-couture",
    name: "Dubai Opera Black Velvet Gown",
    category: "dresses",
    price: 2400,
    icon: "🖤",
    desc: "Floor-sweeping dramatic gown with structured silhouette and gold thread accents.",
    gender: "woman",
    lookWear: "Female_Adult_10",
    tag: "Couture",
  },

  // --- JACKETS & BLAZERS ---
  {
    id: "jacket-sport-blazer",
    name: "Italian Tailored Sport Coat",
    category: "jackets",
    price: 1350,
    icon: "🧥",
    desc: "Lightweight navy hopsack blazer with horn buttons and ticket pocket.",
    gender: "man",
    lookWear: "Male_Adult_17",
  },
  {
    id: "jacket-grey-hoodie",
    name: "Heavyweight Boxy Fleece Hoodie",
    category: "jackets",
    price: 450,
    icon: "🧥",
    desc: "Cozy 480 GSM organic cotton fleece hoodie in mineral grey.",
    gender: "unisex",
    lookWear: "Male_Adult_18",
  },

  // --- TOPS & SHIRTS ---
  {
    id: "top-linen-blue",
    name: "Capri Linen Button-Down Shirt",
    category: "tops",
    price: 340,
    icon: "👔",
    desc: "French linen long-sleeve shirt with relaxed camp collar.",
    gender: "man",
    lookWear: "Male_Adult_08",
  },
  {
    id: "top-pink-silk",
    name: "Blush Pink Silk Blouse",
    category: "tops",
    price: 420,
    icon: "👚",
    desc: "100% mulberry silk blouse with French cuffs and concealed placket.",
    gender: "woman",
    lookWear: "Female_Adult_01",
  },
  {
    id: "top-green-tee",
    name: "Organic Crewneck Tee in Sage",
    category: "tops",
    price: 180,
    icon: "👕",
    desc: "Extra-soft combed organic jersey tee with reinforced neckline.",
    gender: "unisex",
    lookWear: "Female_Adult_17",
  },

  // --- TROUSERS & PANTS ---
  {
    id: "pants-track-top",
    name: "Retro Athletic Tracksuit Bottoms",
    category: "trousers",
    price: 390,
    icon: "🏃",
    desc: "Moisture-wicking tricot joggers with contrast piping.",
    gender: "man",
    lookWear: "Male_Adult_10",
  },
  {
    id: "pants-hoodie-set",
    name: "Oversized Streetwear Jogger Set",
    category: "trousers",
    price: 490,
    icon: "🩳",
    desc: "Relaxed-fit sweatpants with ribbed cuffs and deep pockets.",
    gender: "woman",
    lookWear: "Female_Adult_12",
  },

  // --- SHOES & FOOTWEAR ---
  {
    id: "shoes-luxury-sneakers",
    name: "Minimalist Italian Leather Sneakers",
    category: "shoes",
    price: 790,
    icon: "👟",
    desc: "Clean white calfskin upper with Margom rubber cupsole.",
    gender: "unisex",
  },
  {
    id: "shoes-leather-loafers",
    name: "Hand-Stitched Penny Loafers",
    category: "shoes",
    price: 1450,
    icon: "👞",
    desc: "Full-grain calfskin leather with Blake-stitched leather sole.",
    gender: "man",
  },
  {
    id: "shoes-running-cushion",
    name: "Nitro Carbon Foam Runners",
    category: "shoes",
    price: 680,
    icon: "👟",
    desc: "Maximum propulsion road running shoes with breathable jacquard mesh.",
    gender: "unisex",
  },

  // --- ACCESSORIES ---
  {
    id: "acc-sunglasses-designer",
    name: "Aviator Gold Acetate Sunglasses",
    category: "accessories",
    price: 650,
    icon: "🕶️",
    desc: "18k gold-plated frames with polarised UV400 gradient lenses.",
    gender: "unisex",
    accessory: "sunglasses",
  },
  {
    id: "acc-luxury-watch",
    name: "Grand Tourbillon Chronometer 42mm",
    category: "accessories",
    price: 8500,
    icon: "⌚",
    desc: "Brushed titanium case with automatic movement and sapphire crystal back.",
    gender: "unisex",
    accessory: "watch",
  },
  {
    id: "acc-tote-leather",
    name: "Monogram Leather Handbag",
    category: "accessories",
    price: 4200,
    icon: "👜",
    desc: "Crafted in Milan with golden hardware and detachable shoulder strap.",
    gender: "woman",
    accessory: "handbag",
  },
  {
    id: "acc-gold-necklace",
    name: "18k Solid Gold Cuban Chain",
    category: "accessories",
    price: 3600,
    icon: "📿",
    desc: "6mm diamond-cut bevelled links with dual safety clasp.",
    gender: "unisex",
    accessory: "necklace",
  },
  {
    id: "acc-baseball-cap",
    name: "Dubai Skyline Embroidered Cap",
    category: "accessories",
    price: 220,
    icon: "🧢",
    desc: "Structured 6-panel cotton twill cap with metal buckle strap.",
    gender: "unisex",
    accessory: "cap",
  },
  {
    id: "acc-headphones-anc",
    name: "Studio Wireless ANC Headphones",
    category: "accessories",
    price: 1290,
    icon: "🎧",
    desc: "Spatial audio with custom graphene drivers and active noise cancellation.",
    gender: "unisex",
    accessory: "headphones",
  },
];
