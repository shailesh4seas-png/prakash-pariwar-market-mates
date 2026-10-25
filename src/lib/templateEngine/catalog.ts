import type { MotifId } from "./types";

export type CategoryKind = "festival" | "season";

export interface TemplateCategory {
  key: string;
  label: string;
  kind: CategoryKind;
  /** Emblem motif used for the category icon and as the primary decoration. */
  emblem: MotifId;
  /** Motif set the generator draws from, in priority order. */
  motifs: MotifId[];
  /** 3+ palette ids so the 30 templates vary but stay theme-correct. */
  paletteIds: string[];
  /** Canonical next-occurrence date (ISO yyyy-mm-dd). Used to order upcoming-first. */
  date: string;
  /** Copy banks; the generator mixes these for distinct headlines/offers. */
  copy: {
    headlines: string[];
    subheadlines: string[];
    offers: string[];
    ctas: string[];
  };
}

const F = (
  key: string,
  label: string,
  date: string,
  emblem: MotifId,
  motifs: MotifId[],
  paletteIds: string[],
  copy: TemplateCategory["copy"],
): TemplateCategory => ({ key, label, kind: "festival", emblem, motifs, paletteIds, date, copy });

const S = (
  key: string,
  label: string,
  date: string,
  emblem: MotifId,
  motifs: MotifId[],
  paletteIds: string[],
  copy: TemplateCategory["copy"],
): TemplateCategory => ({ key, label, kind: "season", emblem, motifs, paletteIds, date, copy });

export const CATEGORIES: TemplateCategory[] = [
  F("diwali", "Diwali", "2026-11-08", "diya", ["diya", "rangoli", "lantern", "sparkles"], ["diwaliGold", "maroonRoyal", "peacockFestive"], {
    headlines: ["Happy Diwali", "Festival of Lights", "Diwali Dhamaka", "Light Up Your Home", "Shubh Diwali"],
    subheadlines: ["Sparkling new deals", "The brightest offers of the year", "Celebrate with savings", "Gifting made easy"],
    offers: ["Up to 50% Off", "Flat ₹5000 Cashback", "Buy 1 Get 1", "Mega Diwali Sale", "Extra 10% Off"],
    ctas: ["Shop the Sale", "Visit Store Today", "Order Now", "Grab the Deal"],
  }),
  F("dhanteras", "Dhanteras", "2026-11-06", "diya", ["diya", "sparkles", "rangoli"], ["diwaliGold", "maroonRoyal"], {
    headlines: ["Shubh Dhanteras", "Dhanteras Dhamaka", "Auspicious Beginnings"],
    subheadlines: ["Prosperity starts here", "Aureate offers for a golden year", "Auspicious deals await"],
    offers: ["Gold Coins Offer", "Flat 40% Off", "Special Dhanteras Price"],
    ctas: ["Shop Now", "Visit Today", "Buy Auspicious"],
  }),
  F("bhaiDooj", "Bhai Dooj", "2026-11-10", "rangoli", ["rangoli", "flowers", "sparkles"], ["rakhiBond", "springBloom"], {
    headlines: ["Happy Bhai Dooj", "Bond of Love", "Bhai Dooj Special"],
    subheadlines: ["For the special bond", "Celebrate togetherness", "Gifts for brother & sister"],
    offers: ["Gift Combo Deals", "Up to 45% Off", "Buy for Both"],
    ctas: ["Shop Gifts", "Order Now"],
  }),
  F("chhath", "Chhath", "2026-11-15", "sun", ["sun", "leaves", "flowers"], ["sankrantiHarvest", "onamSadya"], {
    headlines: ["Chhath Puja", "Salute to the Sun", "Chhath Greetings"],
    subheadlines: ["Devotion and tradition", "Auspicious Chhath offers", "Festive essentials"],
    offers: ["Flat 30% Off", "Puja Samagri Combo", "Festive Price"],
    ctas: ["Shop Now", "Visit Store"],
  }),
  F("guruNanak", "Guru Nanak Jayanti", "2026-11-24", "sparkles", ["sparkles", "lantern", "flowers"], ["eidGreen", "newArrivalsTeal"], {
    headlines: ["Guru Nanak Jayanti", "Gurpurab Greetings", "A Day of Grace"],
    subheadlines: ["Remembering the Guru", "Blessed festive savings", "Kar Sevao offers"],
    offers: ["Flat 25% Off", "Community Sale", "Kar Sevao Deal"],
    ctas: ["Shop Now", "Visit Us"],
  }),
  F("christmas", "Christmas", "2026-12-25", "lantern", ["lantern", "snowflake", "sparkles", "bunting"], ["christmasRed", "winterFrost"], {
    headlines: ["Merry Christmas", "Christmas Magic", "Jingle Bell Sale"],
    subheadlines: ["Gift joy this season", "Sparkling holiday deals", "A warm white Christmas"],
    offers: ["Up to 60% Off", "Gift Combo", "Santa's Big Sale", "Flat ₹2000 Off"],
    ctas: ["Shop Gifts", "Grab Now"],
  }),
  F("newYear", "New Year", "2027-01-01", "sparkles", ["sparkles", "bunting", "lantern"], ["newYearNight", "saleBold"], {
    headlines: ["Happy New Year", "New Year, New You", "NYE Mega Sale"],
    subheadlines: ["Fresh beginnings", "Ring in 2027 with savings", "A brand-new season of offers"],
    offers: ["2027 Mega Sale", "Flat 50% Off", "New Year Bonanza"],
    ctas: ["Start Shopping", "Celebrate & Save"],
  }),
  F("lohri", "Lohri", "2027-01-13", "sun", ["sparkles", "bunting", "sun"], ["sankrantiHarvest", "maroonRoyal"], {
    headlines: ["Happy Lohri", "Lohri Night", "Bonfire Bash"],
    subheadlines: ["Punjabi festive cheer", "Warm winter offers", "Celebrate the harvest"],
    offers: ["Flat 35% Off", "Winter Wear Sale", "Lohri Deal"],
    ctas: ["Shop Now", "Visit Store"],
  }),
  F("makarSankranti", "Makar Sankranti", "2027-01-14", "kite", ["kite", "sun", "sparkles"], ["sankrantiHarvest", "summerCool"], {
    headlines: ["Makar Sankranti", "Kites & Cheer", "Uttarayan Greetings"],
    subheadlines: ["Soar into savings", "Festival of the sun", "Harvest festive deals"],
    offers: ["Flat 40% Off", "Til-Gud Combo", "Uttarayan Sale"],
    ctas: ["Fly & Save", "Shop Now"],
  }),
  F("pongal", "Pongal", "2027-01-15", "sun", ["sun", "leaves", "flowers"], ["onamSadya", "sankrantiHarvest"], {
    headlines: ["Happy Pongal", "Thai Poam Poam", "Harvest Blessings"],
    subheadlines: ["Tradition in every grain", "Sankranti harvest offers", "Thank the sun"],
    offers: ["Flat 30% Off", "Kitchen Combo", "Harvest Deal"],
    ctas: ["Shop Now", "Visit Us"],
  }),
  F("republicDay", "Republic Day", "2027-01-26", "flag", ["flag", "sparkles", "bunting"], ["tricolor", "saleBold"], {
    headlines: ["Happy Republic Day", "Proud Indian", "Republic Day Sale"],
    subheadlines: ["Celebrating the nation", "Tricolor offers", "Freedom to save big"],
    offers: ["Flat 26% Off", "Republic Day Deal", "Azadi Discount"],
    ctas: ["Shop Now", "Celebrate & Save"],
  }),
  F("vasantPanchami", "Vasant Panchami", "2027-02-18", "flowers", ["flowers", "leaves", "sparkles"], ["springBloom", "sankrantiHarvest"], {
    headlines: ["Vasant Panchami", "Hues of Spring", "Basant Celebrations"],
    subheadlines: ["Greet spring in yellow", "Auspicious new season", "Knowledge & colour"],
    offers: ["Flat 25% Off", "Spring Collection", "Mustard Sale"],
    ctas: ["Discover Spring", "Shop Now"],
  }),
  F("valentines", "Valentine's Day", "2027-02-14", "flowers", ["flowers", "sparkles", "colorSplash"], ["valentineRose", "springBloom"], {
    headlines: ["Happy Valentine's", "Spread the Love", "Love & Savings"],
    subheadlines: ["Gifts from the heart", "Make it memorable", "Celebrate love"],
    offers: ["Gift Combo", "Up to 45% Off", "Special for Two"],
    ctas: ["Shop Gifts", "Say I Love You"],
  }),
  F("mahaShivratri", "Maha Shivratri", "2027-02-24", "sparkles", ["sparkles", "leaves"], ["karwaChauthDeep", "peacockFestive"], {
    headlines: ["Maha Shivratri", "Har Har Mahadev", "Auspicious Night"],
    subheadlines: ["Devotion and blessings", "A sacred day of savings", "Spiritual festive deals"],
    offers: ["Flat 20% Off", "Puja Essentials", "Blessed Deal"],
    ctas: ["Shop Now", "Visit Store"],
  }),
  F("holi", "Holi", "2027-03-22", "colorSplash", ["colorSplash", "flowers", "sparkles"], ["holiBurst", "springBloom"], {
    headlines: ["Happy Holi", "Play with Colours", "Holi Dhamaka"],
    subheadlines: ["Splash of savings", "Colours of joy", "A vibrant celebration"],
    offers: ["Colour Combo", "Up to 55% Off", "Holi Special"],
    ctas: ["Celebrate Now", "Shop Colors"],
  }),
  F("goodFriday", "Easter / Good Friday", "2027-03-26", "bunting", ["bunting", "flowers", "sparkles"], ["eidGreen", "springBloom"], {
    headlines: ["Happy Easter", "Good Friday", "Easter Joy"],
    subheadlines: ["Fresh beginnings", "Springtime treats", "A blessed celebration"],
    offers: ["Egg-Hunt Deals", "Flat 30% Off", "Chocolate Combo"],
    ctas: ["Shop Now", "Celebrate"],
  }),
  F("ugadi", "Gudi Padwa / Ugadi", "2027-03-28", "sparkles", ["sparkles", "flowers", "bunting"], ["durgaPujaVermillion", "onamSadya"], {
    headlines: ["Happy Ugadi", "Gudi Padwa", "New Year Awaits"],
    subheadlines: ["New beginnings", "Auspicious first buys", "Tradition & luck"],
    offers: ["Flat 35% Off", "New Year Sale", "Gudi Special"],
    ctas: ["Begin Fresh", "Shop Now"],
  }),
  F("ramNavami", "Ram Navami", "2027-04-06", "sparkles", ["sparkles", "bunting"], ["maroonRoyal", "ganeshSaffron"], {
    headlines: ["Ram Navami", "Jai Shri Ram", "Auspicious Day"],
    subheadlines: ["Celebrating virtue", "Blessed festive offers", "A sacred celebration"],
    offers: ["Flat 22% Off", "Puja Combo", "Blessed Deal"],
    ctas: ["Shop Now", "Visit Us"],
  }),
  F("hanumanJayanti", "Hanuman Jayanti", "2027-04-13", "sparkles", ["sparkles", "flag"], ["ganeshSaffron", "tricolor"], {
    headlines: ["Hanuman Jayanti", "Jai Bajrang Bali", "Strength & Faith"],
    subheadlines: ["A day of devotion", "Blessed savings", "Courage to celebrate"],
    offers: ["Flat 20% Off", "Puja Essentials", "Jayanti Deal"],
    ctas: ["Shop Now"],
  }),
  F("eid", "Eid", "2027-03-10", "crescentStar", ["crescentStar", "lantern", "sparkles"], ["eidGreen", "newArrivalsTeal"], {
    headlines: ["Eid Mubarak", "Joy of Eid", "Eid Celebration"],
    subheadlines: ["Gifting grace", "Festive feasts & savings", "Celebrate together"],
    offers: ["Flat 40% Off", "Eid Gift Combo", "Special Eidi"],
    ctas: ["Shop Now", "Eid Gifts"],
  }),
  F("baisakhi", "Baisakhi", "2027-04-14", "sun", ["bunting", "sun", "sparkles"], ["sankrantiHarvest", "onamSadya"], {
    headlines: ["Happy Baisakhi", "Harvest Festival", "Baisakhi Cheer"],
    subheadlines: ["Punjabi pride", "Harvest season savings", "New beginnings"],
    offers: ["Flat 30% Off", "Harvest Combo", "Bhangra Sale"],
    ctas: ["Shop Now"],
  }),
  F("womensDay", "Women's Day", "2027-03-08", "flowers", ["flowers", "sparkles"], ["valentineRose", "springBloom"], {
    headlines: ["Happy Women's Day", "Celebrate Her", "She Inspires"],
    subheadlines: ["For the extraordinary", "A tribute in every deal", "Empower & indulge"],
    offers: ["Special for Her", "Up to 47% Off", "Beauty Combo"],
    ctas: ["Shop Now", "Celebrate Her"],
  }),
  F("gudi", "Mahavir Jayanti", "2027-04-20", "sparkles", ["sparkles", "leaves", "flowers"], ["onamSadya", "eidGreen"], {
    headlines: ["Mahavir Jayanti", "Day of Peace", "Auspicious Greetings"],
    subheadlines: ["Non-violence & grace", "Blessed festive offers", "A sacred savings day"],
    offers: ["Flat 20% Off", "Peace Sale", "Blessed Deal"],
    ctas: ["Shop Now"],
  }),
  F("rakshaBandhan", "Raksha Bandhan", "2027-08-18", "rangoli", ["rangoli", "sparkles", "flowers"], ["rakhiBond", "springBloom"], {
    headlines: ["Happy Rakhi", "Raksha Bandhan", "Bond of Love"],
    subheadlines: ["For your protective sibling", "Gift the bond", "Sweet savings"],
    offers: ["Rakhi Combo", "Up to 40% Off", "Sweets & Gifts"],
    ctas: ["Shop Gifts", "Book Rakhi"],
  }),
  F("janmashtami", "Janmashtami", "2027-09-03", "sparkles", ["sparkles", "bunting", "flowers"], ["ganeshSaffron", "navratriVibrant"], {
    headlines: ["Happy Janmashtami", "Krishna's Blessings", "Motichoor Utsav"],
    subheadlines: ["Devotion & delight", "Festive midnight offers", "A divine celebration"],
    offers: ["Flat 35% Off", "Laddu Combo", "Midnight Sale"],
    ctas: ["Shop Now"],
  }),
  F("independenceDay", "Independence Day", "2027-08-15", "flag", ["flag", "bunting", "sparkles"], ["tricolor", "saleBold"], {
    headlines: ["Happy Independence Day", "Freedom Sale", "Proud & Free"],
    subheadlines: ["Celebrate the nation", "Tricolor savings", "Freedom to save"],
    offers: ["Flat 15% Off", "Freedom Deal", "Jai Hind Sale"],
    ctas: ["Shop Now", "Celebrate Freedom"],
  }),
  F("onam", "Onam", "2027-09-08", "flowers", ["flowers", "leaves", "bunting"], ["onamSadya", "peacockFestive"], {
    headlines: ["Happy Onam", "Onam Sadhya", "Kerala's Pride"],
    subheadlines: ["Harvest of colours", "Tradition & taste", "Festive Moolam offers"],
    offers: ["Flat 40% Off", "Sadhya Combo", "Kasavu Sale"],
    ctas: ["Shop Now"],
  }),
  F("ganeshChaturthi", "Ganesh Chaturthi", "2027-09-07", "diya", ["sparkles", "bunting", "flowers"], ["ganeshSaffron", "maroonRoyal"], {
    headlines: ["Ganpati Bappa Morya", "Ganesh Chaturthi", "Welcome Bappa"],
    subheadlines: ["Auspicious beginnings", "Festive modak deals", "Blessed celebration"],
    offers: ["Flat 30% Off", "Puja Combo", "Bappa Special"],
    ctas: ["Shop Now", "Book Bappa"],
  }),
  F("navratri", "Navratri", "2027-10-02", "sparkles", ["bunting", "sparkles", "flowers"], ["navratriVibrant", "durgaPujaVermillion"], {
    headlines: ["Happy Navratri", "Nine Nights of Joy", "Dandiya Nights"],
    subheadlines: ["Celebrate the goddess", "Nine nights, nine deals", "Garba season savings"],
    offers: ["Flat 45% Off", "Garba Combo", "Nine-Night Sale"],
    ctas: ["Shop Now", "Dance & Save"],
  }),
  F("durgaPuja", "Durga Puja", "2027-10-07", "bunting", ["bunting", "flowers", "sparkles"], ["durgaPujaVermillion", "navratriVibrant"], {
    headlines: ["Shubho Durga Puja", "Welcome Maa", "Puja Utsav"],
    subheadlines: ["Bengal's grandest festival", "New collection & offers", "Aspiring autumn deals"],
    offers: ["Flat 50% Off", "Puja Shopping Fest", "New Collection"],
    ctas: ["Shop Now", "Puja Ready"],
  }),
  F("dussehra", "Dussehra", "2027-10-15", "flag", ["sparkles", "bunting"], ["tricolor", "durgaPujaVermillion"], {
    headlines: ["Happy Dussehra", "Victory of Good", "Vijayadashami"],
    subheadlines: ["A new beginning", "Auspicous purchases", "Triumphant offers"],
    offers: ["Flat 40% Off", "Vijay Deal", "New Season Sale"],
    ctas: ["Shop Now", "Celebrate Victory"],
  }),
  F("karwaChauth", "Karwa Chauth", "2027-10-28", "crescentStar", ["crescentStar", "lantern", "sparkles"], ["karwaChauthDeep", "maroonRoyal"], {
    headlines: ["Happy Karwa Chauth", "Moon of Love", "A Day of Devotion"],
    subheadlines: ["For the waiting love", "Festive special offers", "Celebrate the bond"],
    offers: ["Sargi Combo", "Flat 30% Off", "Bidaai Sale"],
    ctas: ["Shop Now"],
  }),
  F("gandhiJayanti", "Gandhi Jayanti", "2027-10-02", "flag", ["flag", "leaves"], ["tricolor", "monsoonFresh"], {
    headlines: ["Gandhi Jayanti", "Simple Living", "A Peaceful Day"],
    subheadlines: ["Remembering Bapu", "Khadi & handloom offers", "Values that matter"],
    offers: ["Flat 20% Off", "Khadi Special", "Swadeshi Sale"],
    ctas: ["Shop Now"],
  }),
  S("winter", "Winter", "2026-12-01", "snowflake", ["snowflake", "sparkles"], ["winterFrost", "newYearNight"], {
    headlines: ["Winter Collection", "Beat the Cold", "Cozy Season"],
    subheadlines: ["Warm up your home", "Heaters & woolens", "Winter essentials"],
    offers: ["Heaters from ₹1,999", "Flat 45% Off", "Winter Mega Sale"],
    ctas: ["Stay Warm", "Shop Now"],
  }),
  S("summer", "Summer", "2027-03-20", "sun", ["sun", "sparkles"], ["summerCool", "sankrantiHarvest"], {
    headlines: ["Summer Cool Deals", "Beat the Heat", "Summer Sale"],
    subheadlines: ["ACs & coolers", "Cooling essentials", "Stay fresh & cool"],
    offers: ["ACs up to 60% Off", "Cooler Combo", "Flat ₹4000 Off"],
    ctas: ["Cool Down", "Shop Now"],
  }),
  S("monsoon", "Monsoon", "2027-06-15", "rain", ["rain", "leaves"], ["monsoonFresh", "newArrivalsTeal"], {
    headlines: ["Monsoon Essentials", "Puddle-proof", "Rainy Season"],
    subheadlines: ["Stay fresh this season", "Rain-ready gear", "Umbrellas & more"],
    offers: ["Flat 35% Off", "Rain Combo", "Monsoon Sale"],
    ctas: ["Gear Up", "Shop Now"],
  }),
  S("spring", "Spring", "2027-02-15", "flowers", ["flowers", "leaves", "sparkles"], ["springBloom", "valentineRose"], {
    headlines: ["Spring Collection", "In Full Bloom", "Fresh Season"],
    subheadlines: ["New season, new style", "Blossoming offers", "Feel the spring"],
    offers: ["Up to 40% Off", "Spring Launch", "Flat ₹1500 Off"],
    ctas: ["Discover Spring", "Shop Now"],
  }),
  S("autumn", "Autumn", "2027-09-23", "leaves", ["leaves", "bunting"], ["autumnAmber", "sankrantiHarvest"], {
    headlines: ["Autumn Essentials", "Crisp & Cozy", "Foliage Season"],
    subheadlines: ["Layers for the chill", "Warm tones & deals", "The fall collection"],
    offers: ["Flat 30% Off", "Autumn Sale", "Cozy Combo"],
    ctas: ["Layer Up", "Shop Now"],
  }),
  S("wedding", "Wedding Season", "2026-11-25", "sparkles", ["sparkles", "flowers", "bunting"], ["weddingMaroon", "navratriVibrant"], {
    headlines: ["Wedding Season", "Celebrate Forever", "Big Fat Sale"],
    subheadlines: ["Everything for the couple", "Gifting & trousseau", "Bridal & groom picks"],
    offers: ["Up to 55% Off", "Wedding Gift Combo", "Flat ₹10000 Off"],
    ctas: ["Shop the Range", "Explore"],
  }),
  S("festiveSale", "Festive Sale", "2026-11-28", "lantern", ["lantern", "sparkles", "bunting"], ["diwaliGold", "saleBold"], {
    headlines: ["Festive Mega Sale", "Season of Savings", "Grand Festive Deal"],
    subheadlines: ["More for your money", "The ultimate shopping season", "Limited-time offers"],
    offers: ["Up to 70% Off", "Extra 10% Off", "Flat ₹5000 Off"],
    ctas: ["Shop Now", "Grab It"],
  }),
  S("endOfSeason", "End of Season Sale", "2027-01-05", "bunting", ["bunting", "sparkles"], ["saleBold", "summerCool"], {
    headlines: ["End of Season Sale", "Clearance Blowout", "Everything Must Go"],
    subheadlines: ["Lowest prices of the year", "Last-chance deals", "Final markdowns"],
    offers: ["Up to 80% Off", "Flat ₹2000 Off", "Clearance Combo"],
    ctas: ["Clear the Cart", "Shop Now"],
  }),
  S("newArrivals", "New Arrivals", "2026-12-26", "sparkles", ["sparkles", "sun"], ["newArrivalsTeal", "summerCool"], {
    headlines: ["Just Landed", "New Arrivals", "Fresh Drop"],
    subheadlines: ["Explore the new range", "Be the first to own it", "The latest collection"],
    offers: ["Launch Offer", "Flat 20% Off", "Early Bird Deal"],
    ctas: ["Explore Now", "Shop New"],
  }),
  S("grandOpening", "Grand Opening", "2027-02-01", "bunting", ["bunting", "sparkles", "lantern"], ["saleBold", "weddingMaroon"], {
    headlines: ["Grand Opening", "We're Live!", "Store Inauguration"],
    subheadlines: ["Visit us today", "Opening-week specials", "Come celebrate with us"],
    offers: ["Opening Sale 50% Off", "Free Gifts", "First 100 Customers"],
    ctas: ["Visit Today", "Celebrate With Us"],
  }),
];

export const CATEGORY_BY_KEY: Record<string, TemplateCategory> = Object.fromEntries(
  CATEGORIES.map((c) => [c.key, c]),
);

export function getCategory(key: string): TemplateCategory | undefined {
  return CATEGORY_BY_KEY[key];
}

function daysUntil(dateIso: string, now: Date): number {
  const target = new Date(`${dateIso}T00:00:00Z`).getTime();
  return Math.ceil((target - now.getTime()) / 86_400_000);
}

/** Rolls a date forward a whole year until it is on-or-after `now` (annual recurrence). */
function nextOccurrence(dateIso: string, now: Date): number {
  const d = new Date(`${dateIso}T00:00:00Z`);
  let ts = d.getTime();
  const nowTs = now.getTime();
  let guard = 0;
  while (ts < nowTs && guard < 4) {
    d.setUTCFullYear(d.getUTCFullYear() + 1);
    ts = d.getTime();
    guard++;
  }
  return ts;
}

/** Categories ordered by soonest upcoming date; seasons and festivals interleave by date. */
export function orderUpcomingFirst(now: Date = new Date()): TemplateCategory[] {
  return [...CATEGORIES].sort((a, b) => nextOccurrence(a.date, now) - nextOccurrence(b.date, now));
}

export function isUpcoming(category: TemplateCategory, now: Date = new Date(), windowDays = 45): boolean {
  const days = Math.ceil((nextOccurrence(category.date, now) - now.getTime()) / 86_400_000);
  return days >= 0 && days <= windowDays;
}

export function daysUntilCategory(category: TemplateCategory, now: Date = new Date()): number {
  return daysUntil(new Date(nextOccurrence(category.date, now)).toISOString().slice(0, 10), now);
}

export type CatalogFilter = "festival" | "season" | "all";

export function filterCategories(opts: {
  kind: CatalogFilter;
  query: string;
  now?: Date;
}): TemplateCategory[] {
  const now = opts.now ?? new Date();
  const q = opts.query.trim().toLowerCase();
  return orderUpcomingFirst(now).filter((c) => {
    if (opts.kind !== "all" && c.kind !== opts.kind) return false;
    if (!q) return true;
    return c.label.toLowerCase().includes(q) || c.key.toLowerCase().includes(q);
  });
}
