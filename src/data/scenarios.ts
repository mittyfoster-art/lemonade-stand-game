/**
 * Lemonade Stand Business Game v2.0 - Complete Scenario Data
 *
 * 50 unique scenarios across 5 camp days (10 levels per day).
 * Each scenario is designed for 14-17 year old teens in the Cayman Islands
 * context, with progressive difficulty and strategic depth.
 *
 * Deception levels:
 *   - "low"    : Clear market signals; straightforward optimal decisions
 *   - "medium" : Mixed signals; requires careful reading of the scenario
 *   - "high"   : Counter-intuitive markets; the obvious choice is often wrong
 *
 * Weather effects range from 0.5 (stormy, very low traffic) to 1.4 (peak conditions).
 *
 * Loan offers appear at levels 15, 20, 25, 30, 35, and 40.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LevelScenario {
  /** Level number, 1 through 50 */
  level: number
  /** Camp day, 1 through 5 (derived from level: Math.ceil(level / 10)) */
  day: number
  /** Unique kebab-case identifier */
  id: string
  /** Short display title shown in the UI */
  title: string
  /** 2-3 sentence narrative context for the player */
  story: string
  /** Strategic hint displayed in italics */
  hint: string
  /** Description of the target customer base */
  targetMarket: string
  /** How misleading the scenario signals are */
  deceptionLevel: 'low' | 'medium' | 'high'
  /** Optimal decision ranges for price, quality, and marketing */
  optimalDecision: {
    priceRange: [number, number]
    qualityRange: [number, number]
    marketingRange: [number, number]
  }
  /** Multiplier for foot traffic / demand based on conditions (0.5 - 1.4) */
  weatherEffect: number
  /** Short description of market conditions shown in results */
  marketCondition: string
  /** Loan offer available at this level, or null if none */
  loanOffer: {
    amount: number
    repaymentPerLevel: number
    totalRepayment: number
    durationLevels: number
    interestRate: number
  } | null
}

// ---------------------------------------------------------------------------
// Loan Offers (keyed by level number for quick lookup)
// ---------------------------------------------------------------------------

export const LOAN_OFFERS: Record<number, NonNullable<LevelScenario['loanOffer']>> = {
  15: {
    amount: 100,
    repaymentPerLevel: 12,
    totalRepayment: 120,
    durationLevels: 10,
    interestRate: 0.20,
  },
  20: {
    amount: 150,
    repaymentPerLevel: 17,
    totalRepayment: 170,
    durationLevels: 10,
    interestRate: 0.13,
  },
  25: {
    amount: 200,
    repaymentPerLevel: 22,
    totalRepayment: 220,
    durationLevels: 10,
    interestRate: 0.10,
  },
  30: {
    amount: 250,
    repaymentPerLevel: 27,
    totalRepayment: 270,
    durationLevels: 10,
    interestRate: 0.08,
  },
  35: {
    amount: 150,
    repaymentPerLevel: 18,
    totalRepayment: 180,
    durationLevels: 10,
    interestRate: 0.20,
  },
  40: {
    amount: 300,
    repaymentPerLevel: 32,
    totalRepayment: 320,
    durationLevels: 10,
    interestRate: 0.07,
  },
}

// ---------------------------------------------------------------------------
// Helper: attach the correct loan offer (or null) based on level number
// ---------------------------------------------------------------------------

function withLoan(level: number): LevelScenario['loanOffer'] {
  return LOAN_OFFERS[level] ?? null
}

// =========================================================================
//  DAY 1 - FOUNDATIONS (Levels 1-10): Learning the Basics
//  Deception: Low | Clear market signals | Forgiving margins
// =========================================================================

const DAY_1_SCENARIOS: LevelScenario[] = [
  // --- Level 1: Sunny Park Day ---
  {
    level: 1,
    day: 1,
    id: 'sunny-park-day',
    title: 'Sunny Park Day',
    story:
      'It is a beautiful sunny day at Camana Bay park and families are out enjoying the weather. Kids are running around the playground while parents relax on benches. The foot traffic is steady and everyone seems to be in a great mood.',
    hint: 'A moderate price works well when the crowd is relaxed and diverse. Do not overthink this one.',
    targetMarket: 'Families and park-goers (mixed ages, moderate budgets)',
    deceptionLevel: 'low',
    optimalDecision: {
      priceRange: [0.75, 1.25],
      qualityRange: [2, 4],
      marketingRange: [5, 15],
    },
    weatherEffect: 1.2,
    marketCondition: 'Sunny skies with steady family foot traffic',
    loanOffer: null,
  },

  // --- Level 2: School Lunch Break ---
  {
    level: 2,
    day: 1,
    id: 'school-lunch-break',
    title: 'School Lunch Break',
    story:
      'You have set up right outside a high school just as the lunch bell rings. Hundreds of students pour out looking for snacks and drinks. Most of them are counting loose change and small bills from their pockets.',
    hint: 'Students have limited money. Volume matters more than high prices here.',
    targetMarket: 'High school students (very price-sensitive, high volume)',
    deceptionLevel: 'low',
    optimalDecision: {
      priceRange: [0.50, 1.00],
      qualityRange: [2, 3],
      marketingRange: [5, 15],
    },
    weatherEffect: 1.0,
    marketCondition: 'High volume of price-sensitive students',
    loanOffer: null,
  },

  // --- Level 3: Community Fair ---
  {
    level: 3,
    day: 1,
    id: 'community-fair',
    title: 'Community Fair',
    story:
      'The annual community fair in George Town is in full swing. There are bouncy castles, food stalls, and live music. Families are strolling through the booths and the energy is fantastic.',
    hint: 'Events like fairs naturally bring foot traffic. People expect to spend a bit more at special occasions.',
    targetMarket: 'Fair-goers (families willing to spend for the occasion)',
    deceptionLevel: 'low',
    optimalDecision: {
      priceRange: [1.00, 1.50],
      qualityRange: [3, 4],
      marketingRange: [10, 20],
    },
    weatherEffect: 1.1,
    marketCondition: 'Strong foot traffic at a lively community event',
    loanOffer: null,
  },

  // --- Level 4: Hot Afternoon ---
  {
    level: 4,
    day: 1,
    id: 'hot-afternoon',
    title: 'Hot Afternoon',
    story:
      'The Caribbean heat is relentless today with temperatures pushing past 95 degrees. Everyone is fanning themselves and looking for shade. The ice cream truck down the road has already sold out, so you are the only cold drink option in sight.',
    hint: 'Heat drives thirst, but overpricing will send customers to find water elsewhere. Keep it fair.',
    targetMarket: 'Anyone seeking relief from the heat (broad audience)',
    deceptionLevel: 'low',
    optimalDecision: {
      priceRange: [0.75, 1.25],
      qualityRange: [2, 4],
      marketingRange: [5, 15],
    },
    weatherEffect: 1.3,
    marketCondition: 'Extreme heat creates high demand for cold drinks',
    loanOffer: null,
  },

  // --- Level 5: Quiet Neighbourhood ---
  {
    level: 5,
    day: 1,
    id: 'quiet-neighbourhood',
    title: 'Quiet Neighbourhood',
    story:
      'You have set up on a quiet residential street in Bodden Town. A few people walk by now and then, mostly heading to or from their homes. There is not much going on today and foot traffic is sparse.',
    hint: 'When few people walk by, you need every single customer. Price low to make each passerby stop.',
    targetMarket: 'Residents in a low-traffic area (few customers, budget-minded)',
    deceptionLevel: 'low',
    optimalDecision: {
      priceRange: [0.50, 0.75],
      qualityRange: [2, 3],
      marketingRange: [5, 15],
    },
    weatherEffect: 0.8,
    marketCondition: 'Low foot traffic in a quiet residential area',
    loanOffer: null,
  },

  // --- Level 6: Church Event ---
  {
    level: 6,
    day: 1,
    id: 'church-event',
    title: 'Church Event',
    story:
      'A large congregation has just finished Sunday service and families are gathering for the after-church social. Everyone is dressed up and in a generous, community-minded spirit. Several members mention they are happy to support young entrepreneurs.',
    hint: 'This crowd values quality and supporting youth. They will pay a fair premium for a good product.',
    targetMarket: 'Church-goers (generous, community-minded, quality-conscious)',
    deceptionLevel: 'low',
    optimalDecision: {
      priceRange: [1.00, 1.50],
      qualityRange: [3, 5],
      marketingRange: [5, 15],
    },
    weatherEffect: 1.2,
    marketCondition: 'Generous, supportive crowd after church service',
    loanOffer: null,
  },

  // --- Level 7: Beach Parking Lot ---
  {
    level: 7,
    day: 1,
    id: 'beach-parking-lot',
    title: 'Beach Parking Lot',
    story:
      'You are stationed at the Seven Mile Beach parking area. People are coming off the sand, sun-kissed and thirsty after hours of swimming and snorkelling. Most of them are tourists in flip-flops and swimsuits carrying coolers that are running low.',
    hint: 'Beach-goers are thirsty but they usually do not carry much cash. Keep prices accessible.',
    targetMarket: 'Beach visitors (thirsty but budget-minded tourists and locals)',
    deceptionLevel: 'low',
    optimalDecision: {
      priceRange: [0.75, 1.25],
      qualityRange: [2, 4],
      marketingRange: [5, 15],
    },
    weatherEffect: 1.3,
    marketCondition: 'Hot beach crowd with strong thirst but moderate budgets',
    loanOffer: null,
  },

  // --- Level 8: Farmers Market ---
  {
    level: 8,
    day: 1,
    id: 'farmers-market',
    title: 'Farmers Market',
    story:
      'The Saturday morning farmers market at the grounds is buzzing with shoppers who care deeply about fresh, local, and organic products. Vendors around you are selling hand-crafted goods and artisanal foods at premium prices.',
    hint: 'This crowd pays more for quality and freshness. A basic product will not impress them.',
    targetMarket: 'Quality-conscious shoppers (willing to pay premium for artisanal products)',
    deceptionLevel: 'low',
    optimalDecision: {
      priceRange: [1.25, 1.75],
      qualityRange: [4, 5],
      marketingRange: [10, 20],
    },
    weatherEffect: 1.1,
    marketCondition: 'Quality-focused market where freshness commands a premium',
    loanOffer: null,
  },

  // --- Level 9: After-School Rush ---
  {
    level: 9,
    day: 1,
    id: 'after-school-rush',
    title: 'After-School Rush',
    story:
      'School just let out and a wave of students is flooding the street. They are laughing, shoving each other, and pooling their coins together to buy snacks. A few kids are already asking how much your lemonade costs before you even finish setting up.',
    hint: 'These kids want cheap and quick. Sell as many cups as possible at a low price.',
    targetMarket: 'School kids (very price-sensitive, high energy, impulse buyers)',
    deceptionLevel: 'low',
    optimalDecision: {
      priceRange: [0.25, 0.75],
      qualityRange: [1, 3],
      marketingRange: [5, 15],
    },
    weatherEffect: 1.0,
    marketCondition: 'High-volume student traffic looking for cheap refreshments',
    loanOffer: null,
  },

  // --- Level 10: Weekend Morning ---
  {
    level: 10,
    day: 1,
    id: 'weekend-morning',
    title: 'Weekend Morning',
    story:
      'It is a lazy Saturday morning and people are out for brunch and casual strolls along the waterfront. The pace is slow and relaxed. Couples and small groups are browsing shops and taking their time enjoying the morning breeze.',
    hint: 'Relaxed weekend shoppers are willing to pay a bit more for a good experience. No rush here.',
    targetMarket: 'Weekend brunch crowd (relaxed, willing to treat themselves)',
    deceptionLevel: 'low',
    optimalDecision: {
      priceRange: [1.00, 1.50],
      qualityRange: [3, 5],
      marketingRange: [5, 15],
    },
    weatherEffect: 0.9,
    marketCondition: 'Relaxed weekend crowd with moderate foot traffic',
    loanOffer: null,
  },
]

// =========================================================================
//  DAY 2 - MARKET DYNAMICS (Levels 11-20): Reading the Market
//  Deception: Mixed | Loan offers begin | Tighter margins
// =========================================================================

const DAY_2_SCENARIOS: LevelScenario[] = [
  // --- Level 11: Big Sports Tournament ---
  {
    level: 11,
    day: 2,
    id: 'big-sports-tournament',
    title: 'Big Sports Tournament',
    story:
      'A huge inter-school sports tournament is happening at the Truman Bodden Sports Complex. Hundreds of athletes and families are streaming in. The organisers have been advertising "premium refreshments" and the vibe is electric.',
    hint: 'Athletes need hydration and families are watching their wallets. "Premium event" does not always mean premium pricing.',
    targetMarket: 'Sports families (mixed budget sensitivity, high volume)',
    deceptionLevel: 'medium',
    optimalDecision: {
      priceRange: [0.75, 1.25],
      qualityRange: [3, 4],
      marketingRange: [15, 25],
    },
    weatherEffect: 1.3,
    marketCondition: 'High demand from sports crowd, but price sensitivity is real',
    loanOffer: null,
  },

  // --- Level 12: Rainy Day ---
  {
    level: 12,
    day: 2,
    id: 'rainy-day',
    title: 'Rainy Day',
    story:
      'Dark clouds have settled over Grand Cayman and a steady drizzle is keeping most people indoors. The few brave souls with umbrellas hurry past your stand looking miserable. The outdoor market that was supposed to draw crowds has been cancelled.',
    hint: 'Few customers will show up, so each sale matters. Focus on making decent margin per cup rather than chasing volume.',
    targetMarket: 'Sparse foot traffic (comfort seekers, low volume)',
    deceptionLevel: 'medium',
    optimalDecision: {
      priceRange: [0.75, 1.25],
      qualityRange: [4, 5],
      marketingRange: [0, 10],
    },
    weatherEffect: 0.6,
    marketCondition: 'Rain kills foot traffic; quality provides comfort to the few who stop',
    loanOffer: null,
  },

  // --- Level 13: Tourist District ---
  {
    level: 13,
    day: 2,
    id: 'tourist-district',
    title: 'Tourist District',
    story:
      'You have secured a prime spot on the George Town waterfront right where the cruise ship tenders dock. Tourists are pouring off the boats, cameras out, excited to experience "authentic Cayman culture." Tour guides are pointing them towards local vendors.',
    hint: 'Tourists are on vacation and expect to pay vacation prices. They want the full experience, not the cheapest option.',
    targetMarket: 'Cruise ship tourists (expecting premium authentic experience)',
    deceptionLevel: 'high',
    optimalDecision: {
      priceRange: [1.50, 2.00],
      qualityRange: [4, 5],
      marketingRange: [20, 30],
    },
    weatherEffect: 1.0,
    marketCondition: 'Tourists pay premium prices for quality local experiences',
    loanOffer: null,
  },

  // --- Level 14: School Fundraiser ---
  {
    level: 14,
    day: 2,
    id: 'school-fundraiser',
    title: 'School Fundraiser',
    story:
      'A local primary school is holding a big fundraiser for new playground equipment. Parents, teachers, and community members have come out to support the cause. There are bake sales, raffles, and a real sense of togetherness.',
    hint: 'When people are supporting a good cause, they are more willing to pay a little extra. Quality shows you care too.',
    targetMarket: 'Parents and supporters (generous, cause-driven willingness to pay)',
    deceptionLevel: 'low',
    optimalDecision: {
      priceRange: [1.25, 1.75],
      qualityRange: [3, 5],
      marketingRange: [10, 20],
    },
    weatherEffect: 1.2,
    marketCondition: 'Charitable atmosphere boosts willingness to pay premium',
    loanOffer: null,
  },

  // --- Level 15: Record Heat Wave (FIRST LOAN OFFER) ---
  {
    level: 15,
    day: 2,
    id: 'record-heat-wave',
    title: 'Record Heat Wave',
    story:
      'The weather service has issued an extreme heat advisory. Temperatures are soaring past 100 degrees and the humidity is brutal. People are desperately seeking anything cold. Water bottles are selling out at every store and the demand for refreshments is through the roof.',
    hint: 'Massive demand is a huge opportunity, but do not get greedy. People are stressed by the heat and will walk away from unfair prices.',
    targetMarket: 'Everyone desperate for cold refreshment (high demand, broad audience)',
    deceptionLevel: 'medium',
    optimalDecision: {
      priceRange: [1.00, 1.50],
      qualityRange: [2, 4],
      marketingRange: [5, 15],
    },
    weatherEffect: 1.4,
    marketCondition: 'Extreme heat creates massive demand; your first loan opportunity',
    loanOffer: withLoan(15),
  },

  // --- Level 16: Rival Lemonade Stand ---
  {
    level: 16,
    day: 2,
    id: 'rival-lemonade-stand',
    title: 'Rival Lemonade Stand',
    story:
      'Bad news. Another teen has set up a lemonade stand right across the street from yours. They have flashy signs, colourful cups, and are loudly advertising their lemonade at fifty cents per cup. Customers keep glancing between both stands, comparing.',
    hint: 'You cannot win a price war against someone already at rock bottom. Differentiate through quality and marketing to justify your price.',
    targetMarket: 'Price-comparing customers (need clear value proposition)',
    deceptionLevel: 'high',
    optimalDecision: {
      priceRange: [0.50, 1.00],
      qualityRange: [4, 5],
      marketingRange: [15, 30],
    },
    weatherEffect: 1.0,
    marketCondition: 'Direct competition forces differentiation through quality',
    loanOffer: null,
  },

  // --- Level 17: Business District Lunch ---
  {
    level: 17,
    day: 2,
    id: 'business-district-lunch',
    title: 'Business District Lunch',
    story:
      'You are set up near the Camana Bay offices during the lunch rush. Professionals in business attire are streaming out, checking phones, and grabbing quick bites. They have money but zero patience. Speed and convenience are everything to this crowd.',
    hint: 'Business people will pay for convenience and quality, but do not overshoot on price. They notice value.',
    targetMarket: 'Office professionals (time-pressed, moderate to high spending power)',
    deceptionLevel: 'medium',
    optimalDecision: {
      priceRange: [1.00, 1.50],
      qualityRange: [3, 4],
      marketingRange: [5, 15],
    },
    weatherEffect: 1.1,
    marketCondition: 'Convenience and speed matter more than the lowest price',
    loanOffer: null,
  },

  // --- Level 18: Yoga Studio Opening ---
  {
    level: 18,
    day: 2,
    id: 'yoga-studio-opening',
    title: 'Yoga Studio Opening',
    story:
      'A trendy new wellness studio is celebrating its grand opening and they have invited you to provide refreshments. The crowd is all about clean eating, organic ingredients, and natural flavours. Everyone is asking if your lemons are locally sourced.',
    hint: 'Health-conscious customers prioritise quality above price. Skimp on quality and they will skip your stand entirely.',
    targetMarket: 'Health and wellness enthusiasts (quality over price)',
    deceptionLevel: 'low',
    optimalDecision: {
      priceRange: [1.25, 1.75],
      qualityRange: [4, 5],
      marketingRange: [10, 25],
    },
    weatherEffect: 1.1,
    marketCondition: 'Quality-first market where premium ingredients justify premium price',
    loanOffer: null,
  },

  // --- Level 19: End-of-Month Community ---
  {
    level: 19,
    day: 2,
    id: 'end-of-month-community',
    title: 'End-of-Month Community',
    story:
      'You have set up in a working-class neighbourhood near the end of the month. You overhear conversations about waiting for payday and stretching the budget. Kids are still begging their parents for treats, but every dollar matters right now.',
    hint: 'Families are tight on money but kids still want lemonade. Price as low as you can and keep quality basic to survive.',
    targetMarket: 'Budget-conscious families (very price-sensitive)',
    deceptionLevel: 'low',
    optimalDecision: {
      priceRange: [0.25, 0.75],
      qualityRange: [2, 3],
      marketingRange: [5, 15],
    },
    weatherEffect: 1.0,
    marketCondition: 'Low-budget neighbourhood requires volume pricing strategy',
    loanOffer: null,
  },

  // --- Level 20: Upscale Neighbourhood (LOAN OFFER) ---
  {
    level: 20,
    day: 2,
    id: 'upscale-neighbourhood',
    title: 'Upscale Neighbourhood',
    story:
      'You have been invited to sell lemonade at a garden party in the exclusive Crystal Harbour neighbourhood. The houses are enormous, luxury cars line the driveways, and the landscaping alone probably costs more than your whole business.',
    hint: 'Wealthy people did not get wealthy by overpaying for small purchases. Rich does not mean reckless with money.',
    targetMarket: 'Wealthy residents (surprisingly frugal on small impulse purchases)',
    deceptionLevel: 'high',
    optimalDecision: {
      priceRange: [0.50, 1.00],
      qualityRange: [4, 5],
      marketingRange: [5, 15],
    },
    weatherEffect: 1.1,
    marketCondition: 'Deceptive: wealthy crowd but frugal on small items',
    loanOffer: withLoan(20),
  },
]

// =========================================================================
//  DAY 3 - STRATEGIC PRESSURE (Levels 21-30): Managing Complexity
//  Deception: High | Larger loans | Counter-intuitive markets
// =========================================================================

const DAY_3_SCENARIOS: LevelScenario[] = [
  // --- Level 21: Festival Weekend ---
  {
    level: 21,
    day: 3,
    id: 'festival-weekend',
    title: 'Festival Weekend',
    story:
      'It is Pirates Week and the whole island is celebrating. The streets are packed with costumed revellers, live bands are playing on every corner, and food vendors are competing fiercely for attention. The atmosphere is electric but the competition is intense.',
    hint: 'High foot traffic is great, but every vendor here is fighting for the same dollars. Price competitively and invest in standing out.',
    targetMarket: 'Festival crowd (high traffic, lots of competing vendors)',
    deceptionLevel: 'medium',
    optimalDecision: {
      priceRange: [1.00, 1.50],
      qualityRange: [3, 4],
      marketingRange: [15, 25],
    },
    weatherEffect: 1.3,
    marketCondition: 'Massive foot traffic but heavy vendor competition',
    loanOffer: null,
  },

  // --- Level 22: Construction Zone ---
  {
    level: 22,
    day: 3,
    id: 'construction-zone',
    title: 'Construction Zone',
    story:
      'A major road construction project has workers sweating under the hot sun all day. The area looks messy with dust, cones, and heavy machinery, and most regular pedestrians are avoiding the zone entirely. But those workers look seriously thirsty.',
    hint: 'It looks rough out here, but construction workers need refreshment badly. They are not picky about aesthetics, just value.',
    targetMarket: 'Construction workers (thirsty, value-focused, not picky)',
    deceptionLevel: 'high',
    optimalDecision: {
      priceRange: [0.50, 1.00],
      qualityRange: [2, 3],
      marketingRange: [5, 15],
    },
    weatherEffect: 0.7,
    marketCondition: 'Deceptive: messy area but captive workforce needs refreshment',
    loanOffer: null,
  },

  // --- Level 23: Celebrity Sighting ---
  {
    level: 23,
    day: 3,
    id: 'celebrity-sighting',
    title: 'Celebrity Sighting',
    story:
      'Word has spread that a famous social media influencer is filming content at a nearby cafe. A crowd of excited fans has gathered, phones out, hoping for a selfie. The energy is buzzing and people are spending freely, caught up in the hype.',
    hint: 'Hype makes people open their wallets wider than usual. Capitalise on the excitement with premium offerings.',
    targetMarket: 'Star-struck fans and curious onlookers (hype-driven spending)',
    deceptionLevel: 'high',
    optimalDecision: {
      priceRange: [1.50, 2.00],
      qualityRange: [4, 5],
      marketingRange: [15, 30],
    },
    weatherEffect: 1.2,
    marketCondition: 'Celebrity hype inflates willingness to pay for premium experiences',
    loanOffer: null,
  },

  // --- Level 24: Power Outage Area ---
  {
    level: 24,
    day: 3,
    id: 'power-outage-area',
    title: 'Power Outage Area',
    story:
      'A power outage has hit several blocks and CUC is working on restoring electricity. Residents are outside their houses looking frustrated, unable to use air conditioning or refrigerators. Some have been without power for hours and tempers are short.',
    hint: 'These people are stuck and stressed, but they still need refreshment. Be fair with pricing and they will appreciate it.',
    targetMarket: 'Stranded residents (captive audience, moderate stress, need comfort)',
    deceptionLevel: 'medium',
    optimalDecision: {
      priceRange: [0.75, 1.25],
      qualityRange: [3, 4],
      marketingRange: [5, 15],
    },
    weatherEffect: 1.1,
    marketCondition: 'Captive audience during a power outage; fair pricing earns loyalty',
    loanOffer: null,
  },

  // --- Level 25: Cruise Ship Dock (LOAN OFFER) ---
  {
    level: 25,
    day: 3,
    id: 'cruise-ship-dock',
    title: 'Cruise Ship Dock',
    story:
      'Two massive cruise ships have docked and thousands of tourists are flooding into the port area with spending money burning holes in their pockets. They are on vacation, taking photos of everything, and treating themselves to every local experience they can find.',
    hint: 'Cruise ship tourists expect to spend vacation-level prices. Go premium on everything and make it an experience.',
    targetMarket: 'Cruise ship tourists (high spending power, vacation mindset)',
    deceptionLevel: 'high',
    optimalDecision: {
      priceRange: [1.50, 2.00],
      qualityRange: [4, 5],
      marketingRange: [20, 30],
    },
    weatherEffect: 1.3,
    marketCondition: 'Premium tourist market with vacation spending budgets',
    loanOffer: withLoan(25),
  },

  // --- Level 26: Grocery Store Parking ---
  {
    level: 26,
    day: 3,
    id: 'grocery-store-parking',
    title: 'Grocery Store Parking',
    story:
      'You are set up in the parking lot of Fosters supermarket. Shoppers are coming and going with bags of groceries, focused on their errands. Most of them are in a hurry to get home and put away perishables. A quick, cheap drink is the most you can hope for.',
    hint: 'This is a convenience play. People are not here for lemonade, so it needs to be cheap enough to grab on impulse.',
    targetMarket: 'Grocery shoppers (errand-focused, impulse convenience purchases)',
    deceptionLevel: 'low',
    optimalDecision: {
      priceRange: [0.50, 0.75],
      qualityRange: [2, 3],
      marketingRange: [5, 10],
    },
    weatherEffect: 0.9,
    marketCondition: 'Low-engagement shoppers making quick convenience purchases',
    loanOffer: null,
  },

  // --- Level 27: Art Gallery Opening ---
  {
    level: 27,
    day: 3,
    id: 'art-gallery-opening',
    title: 'Art Gallery Opening',
    story:
      'A well-known local gallery is hosting the opening night of a new exhibition. Guests arrive dressed elegantly, sipping from wine glasses and discussing brushstrokes and technique. The crowd is refined and appreciates aesthetics in everything they encounter.',
    hint: 'This crowd notices presentation and quality above all else. A beautifully made lemonade will sell at a premium here.',
    targetMarket: 'Art enthusiasts and collectors (aesthetics-driven, quality-focused)',
    deceptionLevel: 'high',
    optimalDecision: {
      priceRange: [1.25, 1.75],
      qualityRange: [4, 5],
      marketingRange: [10, 20],
    },
    weatherEffect: 1.0,
    marketCondition: 'Refined audience values quality and presentation over bargains',
    loanOffer: null,
  },

  // --- Level 28: Gym Morning Rush ---
  {
    level: 28,
    day: 3,
    id: 'gym-morning-rush',
    title: 'Gym Morning Rush',
    story:
      'It is 6 AM and the early fitness crowd is arriving at the gym. These are disciplined, health-conscious people who wake up before dawn to work out. They care about what they put into their bodies and read nutrition labels on everything.',
    hint: 'Gym-goers prioritise quality ingredients over price, but they are not going to overpay either. Match their health standards.',
    targetMarket: 'Fitness enthusiasts (health-focused, quality-conscious)',
    deceptionLevel: 'medium',
    optimalDecision: {
      priceRange: [0.75, 1.25],
      qualityRange: [4, 5],
      marketingRange: [5, 15],
    },
    weatherEffect: 1.1,
    marketCondition: 'Health-focused morning crowd that values quality ingredients',
    loanOffer: null,
  },

  // --- Level 29: Stormy Afternoon ---
  {
    level: 29,
    day: 3,
    id: 'stormy-afternoon',
    title: 'Stormy Afternoon',
    story:
      'A tropical storm warning has people sheltering indoors. The wind is howling, rain is lashing sideways, and the streets are nearly deserted. Only a handful of hardy souls venture out, and they look like they could really use something comforting.',
    hint: 'Almost nobody is out. The very few customers who stop by are worth maximising your margin on, so focus on quality.',
    targetMarket: 'Very few brave souls (minimal traffic, comfort seekers)',
    deceptionLevel: 'medium',
    optimalDecision: {
      priceRange: [1.00, 1.50],
      qualityRange: [4, 5],
      marketingRange: [0, 10],
    },
    weatherEffect: 0.5,
    marketCondition: 'Storm conditions mean very few customers; maximise per-sale margin',
    loanOffer: null,
  },

  // --- Level 30: Outdoor Concert (LOAN OFFER) ---
  {
    level: 30,
    day: 3,
    id: 'outdoor-concert',
    title: 'Outdoor Concert',
    story:
      'A popular local band is performing a free outdoor concert on the waterfront and the crowd is massive. Thousands of people are dancing, singing along, and having the time of their lives. The energy is incredible and everyone is buying food and drinks.',
    hint: 'Huge crowds mean huge opportunity. Price moderately to capture maximum volume from this once-in-a-day chance.',
    targetMarket: 'Concert crowd (large, energetic, spending freely)',
    deceptionLevel: 'medium',
    optimalDecision: {
      priceRange: [1.00, 1.50],
      qualityRange: [3, 4],
      marketingRange: [15, 25],
    },
    weatherEffect: 1.4,
    marketCondition: 'Massive concert crowd creating peak demand conditions',
    loanOffer: withLoan(30),
  },
]

// =========================================================================
//  DAY 4 - EXPERT DECISIONS (Levels 31-40): High Stakes
//  Deception: Mixed | Strategic loan timing | Budget pressure
// =========================================================================

const DAY_4_SCENARIOS: LevelScenario[] = [
  // --- Level 31: Government Holiday ---
  {
    level: 31,
    day: 4,
    id: 'government-holiday',
    title: 'Government Holiday',
    story:
      'It is a public holiday and families are out in force, enjoying picnics at parks and beaches around the island. Some families are splashing out on treats while others are keeping it simple. The mood is festive but budgets vary widely.',
    hint: 'Holiday crowds have mixed budgets. A moderate price captures both the spenders and the savers.',
    targetMarket: 'Families on a public holiday (mixed spending power)',
    deceptionLevel: 'medium',
    optimalDecision: {
      priceRange: [0.75, 1.25],
      qualityRange: [3, 4],
      marketingRange: [10, 20],
    },
    weatherEffect: 1.2,
    marketCondition: 'Holiday crowd with diverse budgets; moderate pricing wins',
    loanOffer: null,
  },

  // --- Level 32: Airport Drop-Off Zone ---
  {
    level: 32,
    day: 4,
    id: 'airport-drop-off-zone',
    title: 'Airport Drop-Off Zone',
    story:
      'You have set up near the Owen Roberts Airport departure area. Travellers are rushing in with luggage, checking their phones for boarding times, and saying quick goodbyes. These are people about to leave the island who want one last refreshing taste of Cayman.',
    hint: 'Travellers at airports always pay a convenience premium. They do not have time to shop around.',
    targetMarket: 'Departing travellers (time-pressed, willing to pay for convenience)',
    deceptionLevel: 'high',
    optimalDecision: {
      priceRange: [1.50, 2.00],
      qualityRange: [3, 5],
      marketingRange: [10, 20],
    },
    weatherEffect: 1.0,
    marketCondition: 'Airport convenience premium; travellers pay more for ease',
    loanOffer: null,
  },

  // --- Level 33: Charity 5K Race ---
  {
    level: 33,
    day: 4,
    id: 'charity-5k-race',
    title: 'Charity 5K Race',
    story:
      'A charity 5K run is underway and hundreds of runners are crossing the finish line, exhausted and dehydrated. Their families and friends are cheering from the sidelines. The whole event is for a great cause and the atmosphere is warm and supportive.',
    hint: 'Runners are desperately thirsty and the crowd is in a giving mood. Fair prices and decent quality will serve you well.',
    targetMarket: 'Runners and supporters (thirsty, generous, community-spirited)',
    deceptionLevel: 'low',
    optimalDecision: {
      priceRange: [1.00, 1.50],
      qualityRange: [3, 4],
      marketingRange: [10, 20],
    },
    weatherEffect: 1.3,
    marketCondition: 'High demand from thirsty runners and supportive spectators',
    loanOffer: null,
  },

  // --- Level 34: Late Night Event ---
  {
    level: 34,
    day: 4,
    id: 'late-night-event',
    title: 'Late Night Event',
    story:
      'A late-night outdoor movie screening is wrapping up and a small but devoted crowd lingers under the stars. These night owls are in no rush to go home and are looking for something refreshing. The vibe is chill but the crowd is small.',
    hint: 'Small crowd, but they are relaxed and willing to spend on a quality experience. Price for margin, not volume.',
    targetMarket: 'Night owls at an outdoor event (small crowd, relaxed, willing to pay)',
    deceptionLevel: 'high',
    optimalDecision: {
      priceRange: [1.25, 1.75],
      qualityRange: [4, 5],
      marketingRange: [5, 15],
    },
    weatherEffect: 0.8,
    marketCondition: 'Small late-night audience willing to pay premium for quality',
    loanOffer: null,
  },

  // --- Level 35: Back-to-School Sale (LOAN OFFER) ---
  {
    level: 35,
    day: 4,
    id: 'back-to-school-sale',
    title: 'Back-to-School Sale',
    story:
      'It is back-to-school shopping season and the plaza is packed with parents dragging kids from store to store buying uniforms, supplies, and books. Parents are already spending heavily and watching every extra dollar carefully.',
    hint: 'Parents are in spending mode but feeling the pinch. Keep your prices low so lemonade feels like a small treat, not another expense.',
    targetMarket: 'Shopping parents (already spending, budget-fatigued)',
    deceptionLevel: 'medium',
    optimalDecision: {
      priceRange: [0.50, 1.00],
      qualityRange: [2, 3],
      marketingRange: [10, 20],
    },
    weatherEffect: 1.1,
    marketCondition: 'High foot traffic but budget-fatigued parents; price sensitively',
    loanOffer: withLoan(35),
  },

  // --- Level 36: Marina/Dock Area ---
  {
    level: 36,
    day: 4,
    id: 'marina-dock-area',
    title: 'Marina/Dock Area',
    story:
      'You are set up at a marina where sailboats and sport-fishing boats are moored. Boat owners are prepping for outings, loading coolers, and chatting about the catch of the day. These are people who own boats and are used to paying marina prices for everything.',
    hint: 'Boat owners are accustomed to premium prices. Match the marina atmosphere with premium quality and price accordingly.',
    targetMarket: 'Boat owners and marina visitors (affluent, expect premium)',
    deceptionLevel: 'high',
    optimalDecision: {
      priceRange: [1.50, 2.00],
      qualityRange: [4, 5],
      marketingRange: [10, 20],
    },
    weatherEffect: 1.1,
    marketCondition: 'Premium marina market where boat owners expect top-shelf quality',
    loanOffer: null,
  },

  // --- Level 37: Library Study Group ---
  {
    level: 37,
    day: 4,
    id: 'library-study-group',
    title: 'Library Study Group',
    story:
      'You have set up outside the public library where students are studying for upcoming exams. They drift in and out with textbooks and laptops, most of them looking tired and stressed. These are students with tight budgets who just want a quick pick-me-up.',
    hint: 'Students are broke and focused. The cheapest option is the one that sells. Do not waste money on heavy marketing here.',
    targetMarket: 'Students studying (very tight budgets, low foot traffic)',
    deceptionLevel: 'low',
    optimalDecision: {
      priceRange: [0.50, 0.75],
      qualityRange: [2, 3],
      marketingRange: [0, 10],
    },
    weatherEffect: 0.7,
    marketCondition: 'Low-traffic area with cash-strapped students',
    loanOffer: null,
  },

  // --- Level 38: Food Truck Rally ---
  {
    level: 38,
    day: 4,
    id: 'food-truck-rally',
    title: 'Food Truck Rally',
    story:
      'A food truck rally has drawn a huge crowd of foodies to the waterfront. Gourmet tacos, artisanal burgers, and craft sodas surround you on all sides. The competition for the food-and-drink dollar is fierce and your lemonade is up against serious vendors.',
    hint: 'Heavy competition from professional food vendors means you need to be price-competitive. You cannot out-premium a food truck.',
    targetMarket: 'Foodies at a competitive event (lots of alternatives, price-comparing)',
    deceptionLevel: 'high',
    optimalDecision: {
      priceRange: [0.75, 1.25],
      qualityRange: [3, 4],
      marketingRange: [15, 25],
    },
    weatherEffect: 1.2,
    marketCondition: 'Intense competition from food trucks; differentiation is critical',
    loanOffer: null,
  },

  // --- Level 39: Real Estate Open House ---
  {
    level: 39,
    day: 4,
    id: 'real-estate-open-house',
    title: 'Real Estate Open House',
    story:
      'A luxury real estate developer is hosting an open house for new beachfront condos priced in the millions. Potential buyers are touring the property and the agent has invited you to provide refreshments. These are sophisticated buyers who notice every detail.',
    hint: 'This crowd evaluates quality instinctively. A premium product with excellent presentation will resonate. Price reflects quality here.',
    targetMarket: 'Wealthy property viewers (detail-oriented, quality-signals matter)',
    deceptionLevel: 'high',
    optimalDecision: {
      priceRange: [1.25, 1.75],
      qualityRange: [4, 5],
      marketingRange: [10, 20],
    },
    weatherEffect: 1.0,
    marketCondition: 'Affluent audience where quality signals drive purchase decisions',
    loanOffer: null,
  },

  // --- Level 40: Carnival/Fun Fair (LOAN OFFER) ---
  {
    level: 40,
    day: 4,
    id: 'carnival-fun-fair',
    title: 'Carnival/Fun Fair',
    story:
      'The annual carnival has taken over the grounds with rides, games, and cotton candy. The foot traffic is the highest you have ever seen, with families and kids absolutely everywhere. The noise, the lights, the excitement -- everyone is buying everything.',
    hint: 'Maximum foot traffic is your golden opportunity. Price to sell volume, not to maximise per-cup profit.',
    targetMarket: 'Carnival crowd (maximum foot traffic, families, impulse buyers)',
    deceptionLevel: 'medium',
    optimalDecision: {
      priceRange: [0.75, 1.25],
      qualityRange: [2, 4],
      marketingRange: [15, 25],
    },
    weatherEffect: 1.4,
    marketCondition: 'Peak foot traffic at the carnival; volume is king',
    loanOffer: withLoan(40),
  },
]

// =========================================================================
//  DAY 5 - CHAMPIONSHIP (Levels 41-50): Final Push
//  Deception: All levels | Highest stakes | Final standings
// =========================================================================

const DAY_5_SCENARIOS: LevelScenario[] = [
  // --- Level 41: Dawn Joggers ---
  {
    level: 41,
    day: 5,
    id: 'dawn-joggers',
    title: 'Dawn Joggers',
    story:
      'It is barely past sunrise and a dedicated group of joggers is making their rounds along the waterfront path. These early risers are disciplined and health-conscious. They value freshness and a clean, quality product to complement their morning routine.',
    hint: 'Early risers pay for freshness and quality. The crowd is small but willing to spend if the product meets their standards.',
    targetMarket: 'Morning joggers (health-focused, small crowd, value freshness)',
    deceptionLevel: 'medium',
    optimalDecision: {
      priceRange: [1.00, 1.50],
      qualityRange: [4, 5],
      marketingRange: [5, 15],
    },
    weatherEffect: 0.8,
    marketCondition: 'Small early-morning crowd that values freshness and quality',
    loanOffer: null,
  },

  // --- Level 42: Wedding Venue ---
  {
    level: 42,
    day: 5,
    id: 'wedding-venue',
    title: 'Wedding Venue',
    story:
      'A beautiful beach wedding reception is underway and you have been asked to provide a refreshment stand for the cocktail hour. The decorations are stunning, the guests are dressed to impress, and the whole event screams elegance and celebration.',
    hint: 'Wedding guests are celebrating and expect everything to match the premium atmosphere. This is not the time for budget lemonade.',
    targetMarket: 'Wedding guests (premium event, celebratory spending)',
    deceptionLevel: 'high',
    optimalDecision: {
      priceRange: [1.50, 2.00],
      qualityRange: [4, 5],
      marketingRange: [10, 25],
    },
    weatherEffect: 1.1,
    marketCondition: 'Premium event atmosphere drives premium expectations and pricing',
    loanOffer: null,
  },

  // --- Level 43: Political Rally ---
  {
    level: 43,
    day: 5,
    id: 'political-rally',
    title: 'Political Rally',
    story:
      'A large political rally has drawn hundreds of passionate supporters to a public square. People are waving signs, chanting, and getting worked up about the issues. The crowd is big and noisy but their attention is firmly on the speeches, not on buying drinks.',
    hint: 'The crowd is huge but distracted. Price low to catch impulse buys from people who happen to glance your way.',
    targetMarket: 'Rally attendees (large crowd, distracted, impulse purchases only)',
    deceptionLevel: 'medium',
    optimalDecision: {
      priceRange: [0.50, 1.00],
      qualityRange: [2, 3],
      marketingRange: [10, 20],
    },
    weatherEffect: 1.2,
    marketCondition: 'Large distracted crowd; low prices capture impulse buys',
    loanOffer: null,
  },

  // --- Level 44: Pet Show ---
  {
    level: 44,
    day: 5,
    id: 'pet-show',
    title: 'Pet Show',
    story:
      'A family-friendly pet show and adoption event is filling the park with dogs, cats, rabbits, and their proud owners. Kids are running around petting every animal they can find while parents supervise with smiles. The atmosphere is wholesome and fun.',
    hint: 'Family events call for family-friendly pricing. Keep it moderate and you will see steady sales all day.',
    targetMarket: 'Families at a pet event (family-friendly, moderate budgets)',
    deceptionLevel: 'low',
    optimalDecision: {
      priceRange: [0.75, 1.25],
      qualityRange: [3, 4],
      marketingRange: [10, 20],
    },
    weatherEffect: 1.1,
    marketCondition: 'Wholesome family event with steady, moderate demand',
    loanOffer: null,
  },

  // --- Level 45: Tech Conference ---
  {
    level: 45,
    day: 5,
    id: 'tech-conference',
    title: 'Tech Conference',
    story:
      'A tech startup conference is being held at a local convention centre and attendees are networking during the break. These are tech-savvy professionals who analyse everything, read reviews instinctively, and care far more about product quality than sticker price.',
    hint: 'Tech professionals notice quality and ignore cheap gimmicks. Invest in the product itself, not flashy marketing.',
    targetMarket: 'Tech professionals (analytical, quality-focused, price-insensitive)',
    deceptionLevel: 'high',
    optimalDecision: {
      priceRange: [1.25, 1.75],
      qualityRange: [4, 5],
      marketingRange: [5, 15],
    },
    weatherEffect: 1.0,
    marketCondition: 'Quality-driven tech crowd that sees through marketing hype',
    loanOffer: null,
  },

  // --- Level 46: Fishing Tournament ---
  {
    level: 46,
    day: 5,
    id: 'fishing-tournament',
    title: 'Fishing Tournament',
    story:
      'The annual fishing tournament has boats coming and going from the dock all day. Fishermen and spectators are gathering to see the day\'s catches weighed in. It is an outdoor, rugged crowd that values a good, honest product at a fair price.',
    hint: 'This is a practical, value-oriented crowd. Good quality at a fair price beats premium positioning every time.',
    targetMarket: 'Fishing crowd and spectators (outdoor, value over premium)',
    deceptionLevel: 'medium',
    optimalDecision: {
      priceRange: [0.75, 1.25],
      qualityRange: [3, 4],
      marketingRange: [10, 20],
    },
    weatherEffect: 1.2,
    marketCondition: 'Outdoor event crowd that respects good value',
    loanOffer: null,
  },

  // --- Level 47: Movie Premiere Night ---
  {
    level: 47,
    day: 5,
    id: 'movie-premiere-night',
    title: 'Movie Premiere Night',
    story:
      'A special outdoor movie premiere is drawing a trendy crowd to a pop-up cinema on the beach. People are dressed up, taking selfies, and treating the evening like a special occasion. The excitement of an exclusive event has everyone in a spending mood.',
    hint: 'Entertainment crowds pay for the experience, not just the drink. Go premium and make it feel special.',
    targetMarket: 'Trendy movie-goers (experience-driven, willing to pay for ambiance)',
    deceptionLevel: 'high',
    optimalDecision: {
      priceRange: [1.50, 2.00],
      qualityRange: [4, 5],
      marketingRange: [15, 25],
    },
    weatherEffect: 1.0,
    marketCondition: 'Exclusive event atmosphere where experience justifies premium pricing',
    loanOffer: null,
  },

  // --- Level 48: Market Crash Panic ---
  {
    level: 48,
    day: 5,
    id: 'market-crash-panic',
    title: 'Market Crash Panic',
    story:
      'News of a major financial downturn has hit the island. People are glued to their phones reading headlines about market crashes and layoffs. The mood on the street is anxious and people are clutching their wallets tightly.',
    hint: 'Fear makes people hold onto every dollar. Price as low as possible or they will walk right past you.',
    targetMarket: 'Anxious public during financial scare (extreme price sensitivity)',
    deceptionLevel: 'high',
    optimalDecision: {
      priceRange: [0.25, 0.75],
      qualityRange: [1, 3],
      marketingRange: [0, 10],
    },
    weatherEffect: 0.6,
    marketCondition: 'Financial panic crushes demand; survival pricing required',
    loanOffer: null,
  },

  // --- Level 49: Championship Game Day ---
  {
    level: 49,
    day: 5,
    id: 'championship-game-day',
    title: 'Championship Game Day',
    story:
      'The biggest football match of the year is happening at the national stadium and the entire island seems to be heading there. Cars are backed up, people are wearing jerseys and face paint, and the excitement is off the charts. This is the largest crowd you have ever seen.',
    hint: 'Peak demand with a massive crowd. Moderate pricing captures the most volume from this once-a-year event.',
    targetMarket: 'Massive sports crowd (peak attendance, high energy, mixed budgets)',
    deceptionLevel: 'medium',
    optimalDecision: {
      priceRange: [1.00, 1.50],
      qualityRange: [3, 4],
      marketingRange: [15, 25],
    },
    weatherEffect: 1.4,
    marketCondition: 'Championship atmosphere with maximum demand and energy',
    loanOffer: null,
  },

  // --- Level 50: Grand Finale Festival ---
  {
    level: 50,
    day: 5,
    id: 'grand-finale-festival',
    title: 'Grand Finale Festival',
    story:
      'It is the last day of camp and the whole community has come together for the grand finale festival. Everything you have learned this week comes down to this final level. The crowd is big, the energy is high, and your reputation as a lemonade entrepreneur is on the line.',
    hint: 'Everything you have learned comes together here. Balanced pricing, solid quality, and smart marketing will carry you to a strong finish.',
    targetMarket: 'Festival crowd for the grand finale (high traffic, mixed audience)',
    deceptionLevel: 'medium',
    optimalDecision: {
      priceRange: [1.00, 1.50],
      qualityRange: [3, 4],
      marketingRange: [15, 25],
    },
    weatherEffect: 1.3,
    marketCondition: 'Grand finale with strong crowd; everything counts on this final level',
    loanOffer: null,
  },
]

// ---------------------------------------------------------------------------
// Combined export: all 50 scenarios in level order
// ---------------------------------------------------------------------------

export const LEVEL_SCENARIOS: LevelScenario[] = [
  ...DAY_1_SCENARIOS,
  ...DAY_2_SCENARIOS,
  ...DAY_3_SCENARIOS,
  ...DAY_4_SCENARIOS,
  ...DAY_5_SCENARIOS,
]

// ---------------------------------------------------------------------------
// Utility functions
// ---------------------------------------------------------------------------

/**
 * Retrieve a scenario by its level number (1-indexed).
 * Returns undefined if the level is out of range.
 */
export function getScenarioByLevel(level: number): LevelScenario | undefined {
  return LEVEL_SCENARIOS.find((s) => s.level === level)
}

/**
 * Retrieve all scenarios for a given camp day (1-5).
 */
export function getScenariosByDay(day: number): LevelScenario[] {
  return LEVEL_SCENARIOS.filter((s) => s.day === day)
}

/**
 * Check whether a given level has an available loan offer.
 */
export function hasLoanOffer(level: number): boolean {
  return LOAN_OFFERS[level] != null
}
