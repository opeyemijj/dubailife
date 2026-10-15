// Menus for hotel outlets on Palm Jumeirah, by cuisine, priced in AED at 2026 five-star levels.
// Dish names describe the food. Where an outlet is famous for a signature dish (Nobu's black cod miso,
// Heston Blumenthal's Meat Fruit and Tipsy Cake), that dish is on its menu; the rest are representative.

import type { JobDef, Product } from "./types";

type Need = NonNullable<Product["consumable"]>["need"];
type Item = [key: string, name: string, price: number, icon: string, desc: string, need?: Need, amount?: number];

/** Food goes to the table from the menu board, drinks from the bar (or everything from the bar outside). */
function build(prefix: string, items: Item[], outdoor = false): Product[] {
  return items.map(([key, name, price, icon, desc, need = "hunger", amount = 30]) => {
    const drink = ["🍸", "🍹", "🥤", "☕", "🥛", "🍵", "🥭", "🫖"].includes(icon);
    const product: Product = { id: `${prefix}:${key}`, name, price, icon, desc, station: outdoor || drink ? "bar" : "menu", consumable: { need, amount } };
    // A daybed is booked, not served.
    return key === "daybed" ? { ...product, service: true } : product;
  });
}

const book = (prefix: string, what: string): Product => ({ id: `${prefix}:table`, name: `Book a table`, price: 0, icon: "📅", station: "reception", desc: `Reserve ${what} tonight.`, service: true });

export type Cuisine =
  | "cafe" | "pool" | "beach" | "lounge" | "japanese" | "nikkei" | "persian" | "british" | "thai" | "indian" | "french"
  | "italian" | "lebanese" | "gastropub" | "gelato" | "desserts" | "mexican" | "seafood" | "steak" | "turkish" | "chinese" | "brazilian" | "spanish" | "greek" | "buffet" | "wellness";

const MENUS: Record<Cuisine, Item[]> = {
  cafe: [
    ["arabic-coffee", "Arabic coffee & dates", 28, "☕", "Cardamom gahwa with Khalas dates.", "energy", 12],
    ["flat-white", "Flat white", 30, "🥛", "Double ristretto, silky milk.", "energy", 14],
    ["spanish-latte", "Iced Spanish latte", 34, "🥛", "With condensed milk, over ice.", "energy", 14],
    ["croissant", "Butter croissant", 26, "🥐", "Laminated in-house every morning.", "hunger", 12],
    ["date-cake", "Sticky date cake", 42, "🍰", "Warm, with salted caramel.", "fun", 10],
    ["avocado-toast", "Avocado toast", 62, "🥪", "Sourdough, poached egg, chilli.", "hunger", 25],
    ["afternoon-tea", "Afternoon tea for two", 395, "🫖", "Finger sandwiches, scones and pastries.", "social", 20],
  ],
  pool: [
    ["club-sandwich", "Club sandwich", 85, "🥪", "Chicken, egg, beef bacon, fries.", "hunger", 30],
    ["sliders", "Wagyu sliders", 95, "🍔", "Three mini burgers with truffle mayo.", "hunger", 30],
    ["poke", "Salmon poke bowl", 89, "🥗", "Sushi rice, edamame, mango, ponzu.", "hunger", 28],
    ["fruit", "Fresh fruit platter", 65, "🍉", "Watermelon, mango, berries.", "hunger", 15],
    ["cooler", "Watermelon mint cooler", 45, "🍹", "Alcohol-free, blended with ice.", "fun", 10],
    ["lemonade", "Frozen lemonade", 38, "🥤", "Mint and lime slush.", "energy", 8],
    ["frose", "Frozé", 75, "🍸", "Frozen rosé. 21+.", "social", 12],
  ],
  beach: [
    ["seafood-platter", "Seafood platter for two", 420, "🦞", "Lobster, prawns, oysters and crab.", "hunger", 50],
    ["sushi", "Sushi selection", 165, "🍣", "Twelve pieces of the chef's choice.", "hunger", 35],
    ["burrata", "Burrata & heirloom tomato", 95, "🥗", "Basil oil, sourdough crisps.", "hunger", 20],
    ["truffle-fries", "Truffle fries", 55, "🍟", "Parmesan and truffle salt.", "hunger", 15],
    ["spritz", "Signature spritz", 85, "🍸", "Bitter orange and prosecco. 21+.", "social", 12],
    ["mocktail", "Passionfruit mocktail", 48, "🍹", "Passionfruit, vanilla, soda.", "social", 10],
    ["daybed", "Beach daybed for the day", 600, "🏖️", "Daybed for two with towels and shade.", "fun", 30],
  ],
  lounge: [
    ["signature", "Signature cocktail", 95, "🍸", "House creation with a view. 21+.", "social", 12],
    ["espresso-martini", "Espresso martini", 90, "🍸", "Vodka, coffee liqueur, fresh espresso. 21+.", "energy", 10],
    ["mocktail", "Smoked pineapple mocktail", 65, "🍹", "Alcohol-free, rosemary smoke.", "social", 10],
    ["edamame", "Edamame & sea salt", 45, "🫛", "Steamed and salted.", "hunger", 8],
    ["sushi", "Sushi moriawase", 185, "🍣", "Chef's selection for sharing.", "hunger", 30],
    ["sliders", "Wagyu sliders", 110, "🍔", "With truffle mayo.", "hunger", 25],
  ],
  japanese: [
    ["black-cod", "Black cod miso", 245, "🐟", "Marinated three days in sweet miso, then roasted.", "hunger", 45],
    ["yellowtail", "Yellowtail jalapeño", 135, "🍣", "Thin-sliced yellowtail, yuzu soy, jalapeño.", "hunger", 25],
    ["rock-shrimp", "Rock shrimp tempura", 115, "🍤", "Creamy spicy sauce.", "hunger", 30],
    ["wagyu-tacos", "Wagyu tacos", 125, "🌮", "Two crisp tacos, wagyu tartare.", "hunger", 25],
    ["mochi", "Mochi ice cream", 55, "🍨", "Three flavours.", "fun", 10],
    ["matcha", "Matcha latte", 38, "🍵", "Ceremonial-grade matcha.", "energy", 10],
  ],
  nikkei: [
    ["ceviche", "Sea bass ceviche", 120, "🐟", "Leche de tigre, sweet potato, corn.", "hunger", 25],
    ["samba-roll", "Samba roll", 110, "🍣", "Tuna, avocado, crispy shallot.", "hunger", 25],
    ["churrasco", "Churrasco steak", 290, "🥩", "Grilled on the robata with chimichurri.", "hunger", 45],
    ["chocolate", "Chocolate banana cake", 75, "🍰", "Dulce de leche ice cream.", "fun", 12],
    ["pisco", "Pisco sour", 85, "🍸", "21+.", "social", 12],
  ],
  persian: [
    ["koobideh", "Chelow kabab koobideh", 145, "🍖", "Two minced lamb skewers, saffron rice.", "hunger", 45],
    ["joojeh", "Joojeh kabab", 135, "🍗", "Saffron and lemon chicken skewers.", "hunger", 40],
    ["tahdig", "Tahdig with ghormeh sabzi", 115, "🍛", "Crispy rice crust, herb and lamb stew.", "hunger", 40],
    ["mirza", "Mirza ghasemi", 65, "🫓", "Smoked aubergine, garlic, egg, bread.", "hunger", 20],
    ["bastani", "Saffron & rosewater ice cream", 55, "🍨", "Bastani sonnati with pistachio.", "fun", 12],
    ["chai", "Persian tea", 25, "🍵", "With nabat saffron sugar.", "energy", 8],
  ],
  british: [
    ["meat-fruit", "Meat Fruit", 165, "🍊", "Mandarin-shaped chicken liver parfait — the restaurant's signature.", "hunger", 25],
    ["beef-royal", "Beef royal", 395, "🥩", "Slow-cooked short rib, smoked anchovy, onion.", "hunger", 50],
    ["fish-chips", "Beer-battered fish & chips", 165, "🐟", "Mushy peas, tartare sauce.", "hunger", 45],
    ["tipsy-cake", "Tipsy cake", 95, "🍰", "Brioche with spit-roast pineapple — the other signature.", "fun", 15],
    ["tea", "English breakfast tea", 30, "🫖", "Pot for one.", "energy", 8],
  ],
  gastropub: [
    ["beef-wellington", "Beef Wellington", 295, "🥩", "Mushroom duxelles, red wine jus.", "hunger", 50],
    ["fish-chips", "Fish & chips", 145, "🐟", "Beer-battered cod, mushy peas.", "hunger", 45],
    ["shepherds-pie", "Shepherd's pie", 115, "🥧", "Braised lamb, mash crust.", "hunger", 40],
    ["sticky-toffee", "Sticky toffee pudding", 60, "🍮", "Clotted cream ice cream.", "fun", 12],
    ["lemonade", "Homemade lemonade", 35, "🥤", "", "energy", 8],
  ],
  gelato: [
    ["two-scoops", "Gelato, two scoops", 35, "🍨", "Pistachio, salted caramel or mango.", "fun", 10],
    ["flower", "Gelato flower cone", 45, "🍦", "Petals of several flavours.", "fun", 12],
    ["affogato", "Affogato", 32, "☕", "Vanilla gelato under a hot espresso.", "energy", 10],
    ["macaron", "Gelato macaron", 15, "🍪", "", "fun", 6],
  ],
  desserts: [
    ["baklava", "Pistachio baklava (box of 6)", 65, "🍮", "Layered filo, Antep pistachios.", "fun", 12],
    ["kunefe", "Künefe", 55, "🍮", "Hot, with cheese, syrup and pistachio.", "fun", 14],
    ["lokum", "Turkish delight assortment", 45, "🍬", "Rose, pomegranate and pistachio.", "fun", 8],
    ["coffee", "Turkish coffee", 25, "☕", "", "energy", 10],
    ["cay", "Turkish tea", 15, "🍵", "", "energy", 6],
  ],
  mexican: [
    ["tacos", "Tacos al pastor", 65, "🌮", "Three tacos, pineapple, salsa verde.", "hunger", 30],
    ["burrito", "Chicken burrito", 70, "🌯", "Rice, beans, pico de gallo.", "hunger", 35],
    ["nachos", "Nachos to share", 55, "🧀", "Guacamole, sour cream, jalapeños.", "hunger", 20],
    ["churros", "Churros", 35, "🍰", "Cinnamon sugar, chocolate sauce.", "fun", 10],
    ["agua-fresca", "Agua fresca", 25, "🥤", "Hibiscus or watermelon.", "energy", 8],
  ],
  thai: [
    ["pad-thai", "Pad thai goong", 115, "🍜", "Wok-fried rice noodles, tiger prawns.", "hunger", 40],
    ["green-curry", "Green curry chicken", 125, "🍛", "Thai basil, aubergine, jasmine rice.", "hunger", 40],
    ["peking-duck", "Peking duck", 260, "🦆", "Carved at the table, pancakes, hoisin.", "hunger", 50],
    ["som-tam", "Som tam", 70, "🥗", "Green papaya salad, lime, chilli.", "hunger", 15],
    ["mango-rice", "Mango sticky rice", 60, "🍮", "Coconut cream, toasted sesame.", "fun", 12],
    ["thai-tea", "Thai iced tea", 32, "🍵", "Sweet, strong, over ice.", "energy", 8],
  ],
  indian: [
    ["butter-chicken", "Butter chicken", 125, "🍛", "Tandoor chicken, tomato and butter sauce.", "hunger", 40],
    ["dal", "Dal makhani", 85, "🍛", "Black lentils slow-cooked overnight.", "hunger", 30],
    ["tandoori", "Tandoori platter", 175, "🍖", "Lamb chops, chicken tikka, prawns.", "hunger", 45],
    ["naan", "Garlic naan", 28, "🫓", "From the tandoor.", "hunger", 10],
    ["gulab", "Gulab jamun", 45, "🍮", "Warm, in rose syrup.", "fun", 10],
    ["chai", "Masala chai", 25, "🍵", "Spiced milk tea.", "energy", 8],
  ],
  french: [
    ["onion-soup", "French onion soup", 65, "🍲", "Gruyère crouton.", "hunger", 20],
    ["steak-frites", "Steak frites", 215, "🥩", "Entrecôte, béarnaise, frites.", "hunger", 45],
    ["sole", "Sole meunière", 245, "🐟", "Brown butter, capers, lemon.", "hunger", 40],
    ["creme-brulee", "Crème brûlée", 55, "🍮", "Vanilla bean.", "fun", 12],
    ["cafe-creme", "Café crème", 30, "☕", "", "energy", 10],
  ],
  italian: [
    ["burrata", "Burrata pugliese", 95, "🥗", "Heirloom tomato, basil.", "hunger", 20],
    ["tagliatelle", "Truffle tagliatelle", 165, "🍝", "Fresh egg pasta, black truffle.", "hunger", 40],
    ["pizza", "Margherita pizza", 85, "🍕", "Wood-fired, fior di latte.", "hunger", 35],
    ["branzino", "Grilled branzino", 175, "🐟", "Salmoriglio, roasted vegetables.", "hunger", 40],
    ["tiramisu", "Tiramisu", 60, "🍰", "Made at the table.", "fun", 12],
    ["espresso", "Espresso", 22, "☕", "", "energy", 10],
  ],
  lebanese: [
    ["mezze", "Cold mezze platter", 95, "🫓", "Hummus, moutabal, tabbouleh, warak enab.", "hunger", 25],
    ["fattoush", "Fattoush", 55, "🥗", "Sumac, crispy bread.", "hunger", 15],
    ["mixed-grill", "Mixed grill", 165, "🍖", "Shish tawook, kofta, lamb chops.", "hunger", 45],
    ["kunafa", "Kunafa", 55, "🍮", "Warm cheese kunafa, syrup.", "fun", 12],
    ["lemon-mint", "Lemon mint", 32, "🍹", "Blended with ice.", "energy", 8],
  ],
  seafood: [
    ["oysters", "Oysters, half dozen", 175, "🦪", "On ice, mignonette.", "hunger", 15],
    ["lobster", "Grilled lobster", 395, "🦞", "Garlic butter, herb salad.", "hunger", 45],
    ["sea-bass", "Line-caught sea bass", 225, "🐟", "Saffron beurre blanc.", "hunger", 40],
    ["tuna", "Tuna tartare", 135, "🍣", "Avocado, sesame, ponzu.", "hunger", 20],
    ["chocolate", "Chocolate fondant", 75, "🍰", "Vanilla ice cream.", "fun", 12],
  ],
  steak: [
    ["ribeye", "Wagyu ribeye 300 g", 595, "🥩", "Marble score 7+, from the grill.", "hunger", 55],
    ["tenderloin", "Beef tenderloin 250 g", 285, "🥩", "With peppercorn sauce.", "hunger", 45],
    ["caesar", "Caesar salad", 75, "🥗", "Made tableside.", "hunger", 15],
    ["fries", "Truffle fries", 55, "🍟", "", "hunger", 12],
    ["cheesecake", "Baked cheesecake", 65, "🍰", "Berry compote.", "fun", 12],
  ],
  turkish: [
    ["meze", "Turkish meze", 85, "🫓", "Ezme, haydari, muhammara, pide.", "hunger", 25],
    ["iskender", "İskender kebab", 155, "🍖", "Döner, yoghurt, tomato butter.", "hunger", 45],
    ["pide", "Lahmacun & pide", 75, "🍕", "From the stone oven.", "hunger", 30],
    ["baklava", "Pistachio baklava", 55, "🍮", "With kaymak.", "fun", 12],
    ["cay", "Turkish tea", 18, "🍵", "In a tulip glass.", "energy", 8],
  ],
  chinese: [
    ["dim-sum", "Dim sum basket", 95, "🥟", "Har gau, siu mai, cheung fun.", "hunger", 25],
    ["duck", "Roast Peking duck", 285, "🦆", "Pancakes, cucumber, hoisin.", "hunger", 50],
    ["kung-pao", "Kung pao chicken", 125, "🍛", "Dried chilli, peanuts.", "hunger", 40],
    ["noodles", "Wok-fried noodles", 95, "🍜", "Beef, XO sauce.", "hunger", 35],
    ["sesame-balls", "Sesame balls", 45, "🍮", "Red bean filling.", "fun", 10],
    ["jasmine", "Jasmine tea", 28, "🍵", "", "energy", 8],
  ],
  brazilian: [
    ["rodizio", "Rodízio — all you can eat", 375, "🍖", "Picanha, lamb and chicken carved at the table.", "hunger", 60],
    ["picanha", "Picanha à la carte", 195, "🥩", "Rock salt, farofa.", "hunger", 45],
    ["pao", "Pão de queijo", 35, "🥐", "Cheese bread.", "hunger", 10],
    ["brigadeiro", "Brigadeiros", 40, "🍰", "Chocolate truffles.", "fun", 10],
    ["caipirinha", "Caipirinha", 70, "🍸", "21+.", "social", 12],
  ],
  spanish: [
    ["croquetas", "Jamón-style croquetas", 55, "🫓", "Creamy béchamel, crisp crumb.", "hunger", 15],
    ["patatas", "Patatas bravas", 45, "🍟", "Spicy tomato, aioli.", "hunger", 15],
    ["paella", "Seafood paella for two", 245, "🥘", "Saffron rice, prawns, mussels.", "hunger", 50],
    ["churros", "Churros & chocolate", 45, "🍰", "", "fun", 12],
    ["sangria", "Sangria", 65, "🍹", "Alcohol-free version available.", "social", 10],
  ],
  greek: [
    ["dips", "Greek dips & pita", 75, "🫓", "Tzatziki, taramosalata, fava.", "hunger", 20],
    ["horiatiki", "Greek salad", 85, "🥗", "Barrel-aged feta, oregano.", "hunger", 15],
    ["fish", "Whole fish by weight", 295, "🐟", "Flown in daily, grilled with ladolemono.", "hunger", 50],
    ["milos-special", "Fried courgette & aubergine tower", 95, "🍆", "Tzatziki on the side.", "hunger", 20],
    ["yoghurt", "Greek yoghurt & honey", 45, "🍮", "Thyme honey, walnuts.", "fun", 10],
  ],
  buffet: [
    ["breakfast", "Breakfast buffet", 195, "🍳", "Live egg station, pastries, fruit.", "hunger", 45],
    ["dinner", "International dinner buffet", 325, "🍽️", "Live stations from around the world.", "hunger", 60],
    ["brunch", "Friday brunch", 495, "🥂", "Soft drinks package. Live band.", "social", 30],
  ],
  wellness: [
    ["acai", "Açaí bowl", 65, "🥣", "Granola, berries, honey.", "hunger", 20],
    ["green-juice", "Cold-pressed green juice", 38, "🥤", "Kale, apple, cucumber, ginger.", "energy", 12],
    ["grain-bowl", "Seasonal grain bowl", 85, "🥗", "Quinoa, roasted vegetables, tahini.", "hunger", 30],
    ["oat-latte", "Oat milk latte", 32, "🥛", "", "energy", 12],
  ],
};

/** A cuisine's menu for an outlet. Restaurants also take bookings. */
export function menu(prefix: string, cuisine: Cuisine, outdoor = false): Product[] {
  const items = build(prefix, MENUS[cuisine].filter(([, , price]) => price > 0 || cuisine === "buffet"), outdoor);
  const dining = !["cafe", "pool", "beach", "lounge", "wellness"].includes(cuisine);
  return dining ? [...items, book(prefix, "a table")] : items;
}

/** A shift at an outlet with its own menu: three guests, each after something on it. */
export function menuJob(role: string, wage: number, products: Product[]): JobDef | undefined {
  const food = products.filter((p) => p.consumable && !p.service);
  if (food.length < 3) return undefined;
  const picks = [food[0], food[1], food[food.length - 1]];
  const guests = ["Hotel guest", "Couple on holiday", "Regular"];
  return {
    role, wage,
    interview: [
      { q: "A guest mentions a nut allergy. You…", options: ["Tell the kitchen and check every dish", "Ignore it", "Tell them to pick out the nuts"], answer: 0 },
      { q: "A table has waited a long time. You…", options: ["Update them and offer something on the house", "Avoid their table", "Blame the kitchen"], answer: 0 },
      { q: "Room guests charge to their room by…", options: ["Signing with their room number", "Paying cash only", "Leaving without paying"], answer: 0 },
    ],
    shift: picks.map((p, i) => ({ customer: guests[i], wants: p.name.toLowerCase(), productId: p.id })),
  };
}
