import type { DecoKind, MotifId, Palette } from "./types";
import { getPalette } from "./palettes";

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
  /** Layout ids this category cycles through (defaults to the generic ten). */
  layoutRotation?: string[];
  /** Large bottom emblem for poster-style designs. */
  heroMotif?: MotifId;
  /** Decoration arrangements cycled across the 30 designs. */
  decoKinds?: DecoKind[];
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
  F("diwali", "Diwali", "2026-11-08", "diya", ["lotus", "diya", "garland", "rangoli", "sparkles"], ["diwaliGold", "diwaliMarigold", "diwaliRoyalBlue"], {
    headlines: ["Happy Diwali", "Festival of Lights", "Diwali Dhamaka", "Light Up Your Home", "Shubh Diwali", "Diwali Grand Sale", "Sparkle This Diwali", "The Grand Diwali Utsav", "Diwali Ki Safai", "Glow With Joy"],
    subheadlines: ["Wishing you happiness, peace, prosperity and beautiful memories", "Sparkling new deals", "The brightest offers of the year", "Celebrate with savings", "Gifting made easy", "New collection, new vibes", "Light up your home for less", "Your festive shopping starts here"],
    offers: ["Up to 50% Off", "Flat ₹5000 Cashback", "Buy 1 Get 1", "Mega Diwali Sale", "Extra 10% Off", "Diwali Bonanza", "Free Gifts On All Buys", "Grand Lucky Draw"],
    ctas: ["Shop the Sale", "Visit Store Today", "Order Now", "Grab the Deal", "Explore Collection"],
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
  F("christmas", "Christmas", "2026-12-25", "tree", ["tree", "wreath", "santaHat", "bell", "gift", "snowflake", "garland"], ["christmasRed", "christmasPine", "christmasGold", "winterFrost"], {
    headlines: ["Merry Christmas", "Christmas Magic", "Jingle Bell Sale", "The Christmas Sale", "Ho Ho Ho Savings", "A Warm White Christmas", "Christmas Cheer", "Noel Festival Sale", "Santa's Gift Bazaar", "Twelve Days of Deals"],
    subheadlines: ["Gift joy this season", "Sparkling holiday deals", "May your days be merry and bright", "Warm wishes & warmer offers", "Unwrap the savings", "Tinsel, twinkling lights & top deals", "Spread the festive cheer"],
    offers: ["Up to 60% Off", "Gift Combo", "Santa's Big Sale", "Flat ₹2000 Off", "Stocking Stuffers Under ₹999", "Free Gift Wrapping", "Christmas Bonanza", "Egg-Hunt Deals"],
    ctas: ["Shop Gifts", "Grab Now", "Unwrap Deals", "Visit The Store"],
  }),
  F("newYear", "New Year", "2027-01-01", "fireworks", ["fireworks", "sparkles", "bunting", "lantern", "gift"], ["newYearNight", "newYearGold", "newYearParty"], {
    headlines: ["Happy New Year", "New Year, New You", "NYE Mega Sale", "Welcome 2027", "New Year Grand Sale", "Ring In The New", "A Fresh Start Awaits", "New Year Bonanza", "Cheers To New Beginnings", "The NYE Blowout"],
    subheadlines: ["Let go of the past and start this year anew with positivity", "Fresh beginnings", "Ring in 2027 with savings", "A brand-new season of offers", "New year, new upgrades", "Start the year with a deal", "Celebrate every new beginning"],
    offers: ["2027 Mega Sale", "Flat 50% Off", "New Year Bonanza", "Resolution Deals", "Countdown Offers", "Extra ₹2027 Off On ₹10000", "First-Week Special"],
    ctas: ["Start Shopping", "Celebrate & Save", "Grab New Year Deals", "Visit Us Today"],
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
  F("holi", "Holi", "2027-03-22", "colorSplash", ["colorSplash", "flowers", "fireworks", "sparkles"], ["holiBurst", "holiRang", "springBloom"], {
    headlines: ["Happy Holi", "Play with Colours", "Holi Dhamaka", "Utsav of Colours", "Holi Range Pur", "Splash Into Savings", "Vibrant Holi", "Colors of Joy", "Holi Mahotsav", "Paint The Town"],
    subheadlines: ["Splash of savings", "Colours of joy", "A vibrant celebration", "Wash the winter away", "Bright colours, brighter deals", "Celebrate the festival of colours", "Bura na mano, Holi hai"],
    offers: ["Colour Combo", "Up to 55% Off", "Holi Special", "Free Gulal Gift Pack", "Holi Mega Sale", "Flat ₹700 Off", "Organic Colors Bundle"],
    ctas: ["Celebrate Now", "Shop Colors", "Play Safe", "Grab Holi Deals"],
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
  F("rakshaBandhan", "Raksha Bandhan", "2027-08-18", "rakhi", ["rakhi", "flowers", "sparkles", "rangoli"], ["rakhiBond", "rakhiRose", "springBloom"], {
    headlines: ["Happy Rakhi", "Raksha Bandhan", "Bond of Love", "Rakhi Special", "Bhai-Bhan Gifting", "Tie The Thread", "Rakhi Utsav", "For My Bhaiya", "Sweet Bond", "Rakhi Grand Gifting"],
    subheadlines: ["For your protective sibling", "Gift the bond", "Sweet savings", "Threading love since forever", "Gifts they will adore", "Celebrate the bhai-bhan bond", "Rakhi, mithai & lots of love"],
    offers: ["Rakhi Combo", "Up to 40% Off", "Sweets & Gifts", "Thali Combo", "Gift Hamper Sale", "Flat ₹500 Off On Combos", "Free Delivery For Rakhi"],
    ctas: ["Shop Gifts", "Book Rakhi", "Send With Love", "Order Today"],
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

// ---------------------------------------------------------------------------
// Festival identity: per-category layout rotations + browse-page theming, so
// each theme page and each 30-design set feels specific to its festival.
// ---------------------------------------------------------------------------

const GENERIC_ROTATION = [
  "classicTop", "centerMedallion", "splitBanner", "editorialLeft", "posterBold",
  "storyStack", "ribbonFrame", "gridClean", "archEmblem", "festiveCollage",
];

/** Applies festival identity to a category (rotations, hero emblem, decorations). */
function withIdentity(key: string, extra: Partial<TemplateCategory>) {
  const category = CATEGORY_BY_KEY[key];
  if (category) Object.assign(category, extra);
}

withIdentity("diwali", {
  layoutRotation: ["archTop", "classicTop", "scriptHero", "centerMedallion", "dateBadge", "splitBanner", "stackedHero", "gridClean", "archEmblem", "cornerFrame"],
  heroMotif: "diya",
  decoKinds: ["scatter", "frame", "band"],
});
withIdentity("christmas", {
  layoutRotation: ["centerMedallion", "archTop", "giftStack", "scriptHero", "classicTop", "spotlight", "bannerStrip", "posterFrame", "editorialLeft", "cornerFrame"],
  heroMotif: "tree",
  decoKinds: ["scatter", "band", "frame"],
});
withIdentity("newYear", {
  layoutRotation: ["spotlight", "scriptHero", "posterFrame", "dateBadge", "centerMedallion", "classicTop", "splitRight", "gridClean", "archTop", "festiveCollage"],
  heroMotif: "fireworks",
  decoKinds: ["scatter", "frame", "band"],
});
withIdentity("holi", {
  layoutRotation: ["festiveCollage", "scriptHero", "splitBanner", "posterBold", "cornerFrame", "centerMedallion", "bannerStrip", "editorialLeft", "dateBadge", "classicTop"],
  heroMotif: "colorSplash",
  decoKinds: ["scatter", "band", "frame"],
});
withIdentity("rakshaBandhan", {
  layoutRotation: ["archTop", "giftStack", "classicTop", "centerMedallion", "splitRight", "scriptHero", "cornerFrame", "ribbonFrame", "dateBadge", "spotlight"],
  heroMotif: "rakhi",
  decoKinds: ["scatter", "frame"],
});
withIdentity("dhanteras", { heroMotif: "diya" });
withIdentity("bhaiDooj", { heroMotif: "rakhi" });
withIdentity("winter", { heroMotif: "snowflake" });
withIdentity("festiveSale", { heroMotif: "gift" });

export interface CategoryTheme {
  emoji: string;
  /** Line shown under the category name on its browse page. */
  tagline: string;
  /** Small eyebrow label above the category name on its browse page. */
  eyebrow: string;
}

const THEME_BY_KEY: Record<string, CategoryTheme> = {
  diwali: { emoji: "🪔", tagline: "Lamps, marigold & the brightest deals of the year", eyebrow: "Festival of Lights" },
  dhanteras: { emoji: "🪙", tagline: "Auspicious beginnings and golden offers", eyebrow: "Shubh Labh" },
  bhaiDooj: { emoji: "🧵", tagline: "Celebrate the sibling bond with sweet savings", eyebrow: "Bhai-Bhan" },
  christmas: { emoji: "🎄", tagline: "Pine, tinsel and gifts under every tree", eyebrow: "Ho Ho Ho" },
  newYear: { emoji: "🎆", tagline: "New year, new upgrades — ring it in with savings", eyebrow: "Cheers to 2027" },
  holi: { emoji: "🎨", tagline: "A splash of colour, a flood of offers", eyebrow: "Rang Barse" },
  rakshaBandhan: { emoji: "", tagline: "Threads of love, gifts to remember", eyebrow: "Bhai-Bhan" },
  winter: { emoji: "❄️", tagline: "Cosy essentials for the chill season", eyebrow: "Winter" },
  lohri: { emoji: "🔥", tagline: "Bonfire nights and harvest cheer", eyebrow: "Harvest" },
  makarSankranti: { emoji: "🪁", tagline: "Soar into savings this Uttarayan", eyebrow: "Uttarayan" },
  pongal: { emoji: "🌾", tagline: "Harvest blessings and kitchen specials", eyebrow: "Thai Poam" },
  republicDay: { emoji: "🇮🇳", tagline: "Proud moments, tricolour deals", eyebrow: "26 January" },
  independenceDay: { emoji: "🇮🇳", tagline: "Freedom to save big", eyebrow: "15 August" },
  eid: { emoji: "🌙", tagline: "Grace, gifting and Eidi specials", eyebrow: "Eid Mubarak" },
  ganeshChaturthi: { emoji: "🙏", tagline: "Welcome Bappa with festive deals", eyebrow: "Ganpati Bappa Morya" },
  navratri: { emoji: "💃", tagline: "Nine nights of garba, nine sets of deals", eyebrow: "Dandiya Nights" },
  durgaPuja: { emoji: "🛕", tagline: "The grandest shopping festival of autumn", eyebrow: "Shubho Puja" },
  dussehra: { emoji: "🏹", tagline: "Victory of good — and great prices", eyebrow: "Vijayadashami" },
  onam: { emoji: "🌼", tagline: "Sadhya colours and Moolam deals", eyebrow: "Kerala's Pride" },
  karwaChauth: { emoji: "🌘", tagline: "Moonlit love and festive picks", eyebrow: "Devotion" },
  valentines: { emoji: "❤️", tagline: "Gifts from the heart", eyebrow: "Spread Love" },
  wedding: { emoji: "💍", tagline: "Everything for the big fat celebration", eyebrow: "Shaadi Season" },
  festiveSale: { emoji: "🛍️", tagline: "The ultimate season of savings", eyebrow: "Mega Sale" },
};

const DEFAULT_THEME: CategoryTheme = {
  emoji: "✨",
  tagline: "Brand-ready designs for this occasion",
  eyebrow: "New collection",
};

/** Festival-specific look + copy for a category's browse page and tiles. */
export function themeFor(key: string): CategoryTheme {
  return THEME_BY_KEY[key] ?? DEFAULT_THEME;
}

/** The palette a category's UI chrome (banners, tiles) should wear. */
export function categoryPalette(key: string): Palette {
  const category = CATEGORY_BY_KEY[key];
  return getPalette(category?.paletteIds[0] ?? "diwaliGold");
}

export { GENERIC_ROTATION };

export function layoutsFor(category: TemplateCategory): string[] {
  return category.layoutRotation?.length ? category.layoutRotation : GENERIC_ROTATION;
}

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
