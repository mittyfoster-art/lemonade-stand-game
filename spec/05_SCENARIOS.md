# 05 - Scenarios Specification

**Document:** Daily Scenario Specifications
**Version:** 1.0
**Reference:** game-store.ts DAILY_SCENARIOS array

---

## Overview

The game features 10 unique daily scenarios, each designed with specific market conditions, deception levels, and optimal decision ranges. These scenarios teach participants to analyze markets critically rather than making assumptions.

---

## Scenario Structure

### DailyScenario Interface

```typescript
interface DailyScenario {
  id: string;                    // Unique identifier
  title: string;                 // Display title
  story: string;                 // Narrative description
  hint: string;                  // Strategic clue for players
  targetMarket: string;          // Description of customer segment
  deceptionLevel: 'low' | 'medium' | 'high';
  optimalDecision: {
    priceRange: [number, number];
    qualityRange: [number, number];
    marketingRange: [number, number];
  };
  weatherEffect: number;         // Demand multiplier (0.6 - 1.4)
  marketCondition: string;       // Summary of market dynamics
}
```

---

## Scenario Reference Table

| # | ID | Title | Deception | Weather | Key Challenge |
|---|-----|-------|-----------|---------|---------------|
| 1 | sports-day | Big Sports Tournament | Medium | 1.3 | Mixed price sensitivity |
| 2 | fancy-neighborhood | Upscale Neighborhood Event | High | 1.1 | Wealthy ≠ big spenders |
| 3 | school-fundraiser | School Fundraiser Event | Low | 1.2 | Premium pricing accepted |
| 4 | hot-weather | Record Heat Wave | Medium | 1.4 | Speed over quality |
| 5 | tourist-trap | Tourist Area Setup | High | 1.0 | Premium expectations |
| 6 | rainy-day | Unexpected Rain Shower | Medium | 0.6 | Low volume, high quality |
| 7 | budget-conscious | End-of-Month Community | Low | 1.0 | Price sensitivity |
| 8 | health-conscious | Yoga Studio Grand Opening | Low | 1.1 | Quality premium works |
| 9 | competition-day | Rival Lemonade Stand Nearby | High | 1.0 | Differentiation needed |
| 10 | lunch-rush | Business District Lunch Rush | Medium | 1.1 | Time over price |

---

## Detailed Scenario Specifications

### Scenario 1: Big Sports Tournament

**ID:** `sports-day`
**Deception Level:** Medium

```
┌────────────────────────────────────────────────────────────┐
│  SCENARIO: Big Sports Tournament                           │
│  ══════════════════════════════════════════════════════════│
│                                                            │
│  STORY:                                                    │
│  A huge sports tournament is happening at the nearby park! │
│  Hundreds of athletes and families are expected. The       │
│  organizers mentioned they want "premium refreshments"     │
│  for the event.                                            │
│                                                            │
│  HINT:                                                     │
│  Athletes need hydration, but families might be            │
│  budget-conscious...                                       │
│                                                            │
│  TARGET MARKET:                                            │
│  Sports families (mixed budget sensitivity)                │
│                                                            │
│  MARKET CONDITION:                                         │
│  High demand, mixed price sensitivity                      │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  OPTIMAL DECISIONS                                    │ │
│  │  Price:     $0.75 - $1.25                            │ │
│  │  Quality:   3 - 4                                    │ │
│  │  Marketing: $15 - $25                                │ │
│  │  Weather:   1.3x demand multiplier                   │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  DECEPTION: "Premium refreshments" suggests high prices,   │
│  but the diverse crowd has mixed spending power.           │
└────────────────────────────────────────────────────────────┘
```

**Risk Management Indicators:**
- ✓ Adjusted production for high attendance
- ✓ Moderate pricing despite "premium" language
- ✓ Allocated budget for visibility marketing

---

### Scenario 2: Upscale Neighborhood Event

**ID:** `fancy-neighborhood`
**Deception Level:** High

```
┌────────────────────────────────────────────────────────────┐
│  SCENARIO: Upscale Neighborhood Event                      │
│  ══════════════════════════════════════════════════════════│
│                                                            │
│  STORY:                                                    │
│  You got invited to set up in the wealthy Maple Heights    │
│  neighborhood during their garden party weekend. Everyone  │
│  drives luxury cars and the houses are huge!               │
│                                                            │
│  HINT:                                                     │
│  Rich people can afford anything... or can they?           │
│                                                            │
│  TARGET MARKET:                                            │
│  Wealthy residents (surprisingly price-sensitive for       │
│  small purchases)                                          │
│                                                            │
│  MARKET CONDITION:                                         │
│  Deceptive: Wealthy but frugal on small items              │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  OPTIMAL DECISIONS                                    │ │
│  │  Price:     $0.50 - $1.00  (LOWER than expected!)    │ │
│  │  Quality:   4 - 5                                    │ │
│  │  Marketing: $5 - $15       (Word-of-mouth works)     │ │
│  │  Weather:   1.1x demand multiplier                   │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  DECEPTION: Wealth doesn't mean they'll overpay for       │
│  lemonade. They expect quality but fair pricing.          │
└────────────────────────────────────────────────────────────┘
```

**Learning Point:** Wealthy customers often got wealthy by being careful with money on small purchases. They expect quality but won't pay premium prices for basic items.

---

### Scenario 3: School Fundraiser Event

**ID:** `school-fundraiser`
**Deception Level:** Low

```
┌────────────────────────────────────────────────────────────┐
│  SCENARIO: School Fundraiser Event                         │
│  ══════════════════════════════════════════════════════════│
│                                                            │
│  STORY:                                                    │
│  The local elementary school is having a fundraiser and    │
│  asked you to participate. Parents are coming to support   │
│  their kids, and everyone seems excited about helping      │
│  raise money.                                              │
│                                                            │
│  HINT:                                                     │
│  Parents at fundraisers usually want to support causes...  │
│                                                            │
│  TARGET MARKET:                                            │
│  Parents supporting school (willing to pay premium for     │
│  good cause)                                               │
│                                                            │
│  MARKET CONDITION:                                         │
│  Premium pricing accepted for good cause                   │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  OPTIMAL DECISIONS                                    │ │
│  │  Price:     $1.25 - $1.75                            │ │
│  │  Quality:   3 - 5                                    │ │
│  │  Marketing: $10 - $20                                │ │
│  │  Weather:   1.2x demand multiplier                   │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  LOW DECEPTION: What you see is what you get. Parents     │
│  willingly pay more because it's for a good cause.        │
└────────────────────────────────────────────────────────────┘
```

---

### Scenario 4: Record Heat Wave

**ID:** `hot-weather`
**Deception Level:** Medium

```
┌────────────────────────────────────────────────────────────┐
│  SCENARIO: Record Heat Wave                                │
│  ══════════════════════════════════════════════════════════│
│                                                            │
│  STORY:                                                    │
│  It's the hottest day of the year! The weather forecast    │
│  shows 95°F with high humidity. People are desperately     │
│  looking for ways to cool down, and the ice cream truck    │
│  already sold out.                                         │
│                                                            │
│  HINT:                                                     │
│  Everyone needs something cold, but heat makes people      │
│  grumpy...                                                 │
│                                                            │
│  TARGET MARKET:                                            │
│  Everyone (desperate for refreshment but heat-stressed)    │
│                                                            │
│  MARKET CONDITION:                                         │
│  High demand but quality less important than availability  │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  OPTIMAL DECISIONS                                    │ │
│  │  Price:     $1.00 - $1.50                            │ │
│  │  Quality:   2 - 4          (Cold matters more!)      │ │
│  │  Marketing: $5 - $15       (Heat sells itself)       │ │
│  │  Weather:   1.4x demand multiplier (HIGHEST)         │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  DECEPTION: High demand doesn't mean you can charge       │
│  anything. Heat-stressed people are impatient and cranky. │
└────────────────────────────────────────────────────────────┘
```

**Risk Management Indicators:**
- ✓ Increased production for peak demand
- ✓ Focused on speed/availability over perfection
- ✓ Maintained ice reserves

---

### Scenario 5: Tourist Area Setup

**ID:** `tourist-trap`
**Deception Level:** High

```
┌────────────────────────────────────────────────────────────┐
│  SCENARIO: Tourist Area Setup                              │
│  ══════════════════════════════════════════════════════════│
│                                                            │
│  STORY:                                                    │
│  You managed to get a spot near the famous downtown        │
│  tourist district! Buses full of visitors are arriving,    │
│  cameras flashing everywhere. Tour guides are pointing out │
│  "authentic local experiences."                            │
│                                                            │
│  HINT:                                                     │
│  Tourists love authentic experiences and unique local      │
│  flavors...                                                │
│                                                            │
│  TARGET MARKET:                                            │
│  Tourists (expecting authentic premium experience)         │
│                                                            │
│  MARKET CONDITION:                                         │
│  Premium pricing works with high quality and marketing     │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  OPTIMAL DECISIONS                                    │ │
│  │  Price:     $1.50 - $2.00  (Premium works here!)     │ │
│  │  Quality:   4 - 5          (Must match price)        │ │
│  │  Marketing: $20 - $30      (Visibility crucial)      │ │
│  │  Weather:   1.0x demand multiplier                   │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  HIGH DECEPTION: The obvious low-price strategy fails.    │
│  Tourists expect premium experiences and distrust cheap.  │
└────────────────────────────────────────────────────────────┘
```

**Learning Point:** In tourist markets, low prices can actually hurt sales because visitors associate price with quality and authenticity.

---

### Scenario 6: Unexpected Rain Shower

**ID:** `rainy-day`
**Deception Level:** Medium

```
┌────────────────────────────────────────────────────────────┐
│  SCENARIO: Unexpected Rain Shower                          │
│  ══════════════════════════════════════════════════════════│
│                                                            │
│  STORY:                                                    │
│  Dark clouds rolled in and light rain started falling.     │
│  Most outdoor events got cancelled, but you notice people  │
│  with umbrellas still walking by, looking a bit sad about  │
│  their ruined plans.                                       │
│                                                            │
│  HINT:                                                     │
│  Bad weather usually hurts business, but maybe people need │
│  cheering up?                                              │
│                                                            │
│  TARGET MARKET:                                            │
│  Disappointed people seeking comfort (low volume, comfort  │
│  pricing)                                                  │
│                                                            │
│  MARKET CONDITION:                                         │
│  Low volume but high quality needed for comfort            │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  OPTIMAL DECISIONS                                    │ │
│  │  Price:     $0.75 - $1.25                            │ │
│  │  Quality:   4 - 5          (Comfort needs quality)   │ │
│  │  Marketing: $0 - $10       (Few people around)       │ │
│  │  Weather:   0.6x demand multiplier (LOWEST)          │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  DECEPTION: Rain seems like disaster, but the few         │
│  customers who do come want quality comfort drinks.       │
└────────────────────────────────────────────────────────────┘
```

**Risk Management Indicators:**
- ✓ Reduced production for low traffic
- ✓ Maintained quality despite reduced demand
- ✓ Conserved marketing budget

---

### Scenario 7: End-of-Month Community

**ID:** `budget-conscious`
**Deception Level:** Low

```
┌────────────────────────────────────────────────────────────┐
│  SCENARIO: End-of-Month Community                          │
│  ══════════════════════════════════════════════════════════│
│                                                            │
│  STORY:                                                    │
│  You set up in a working-class neighborhood near the end   │
│  of the month. You overhear conversations about "waiting   │
│  for payday" and "stretching the budget." But kids are     │
│  still asking their parents for treats.                    │
│                                                            │
│  HINT:                                                     │
│  People are tight on money, but kids really want           │
│  lemonade...                                               │
│                                                            │
│  TARGET MARKET:                                            │
│  Budget-conscious families (price very sensitive)          │
│                                                            │
│  MARKET CONDITION:                                         │
│  Volume pricing strategy needed                            │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  OPTIMAL DECISIONS                                    │ │
│  │  Price:     $0.25 - $0.75  (LOWEST prices)           │ │
│  │  Quality:   2 - 3          (Good enough quality)     │ │
│  │  Marketing: $5 - $15                                 │ │
│  │  Weather:   1.0x demand multiplier                   │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  LOW DECEPTION: Straightforward market. Price is the      │
│  primary factor. Volume over margin strategy wins.        │
└────────────────────────────────────────────────────────────┘
```

---

### Scenario 8: Yoga Studio Grand Opening

**ID:** `health-conscious`
**Deception Level:** Low

```
┌────────────────────────────────────────────────────────────┐
│  SCENARIO: Yoga Studio Grand Opening                       │
│  ══════════════════════════════════════════════════════════│
│                                                            │
│  STORY:                                                    │
│  A new organic yoga studio is opening next door, and they  │
│  invited you to provide refreshments! Everyone is talking  │
│  about "clean eating," "natural ingredients," and          │
│  "wellness journeys."                                      │
│                                                            │
│  HINT:                                                     │
│  Health-conscious people care about quality and natural    │
│  ingredients...                                            │
│                                                            │
│  TARGET MARKET:                                            │
│  Health enthusiasts (quality over price)                   │
│                                                            │
│  MARKET CONDITION:                                         │
│  Premium quality commands premium pricing                  │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  OPTIMAL DECISIONS                                    │ │
│  │  Price:     $1.25 - $1.75                            │ │
│  │  Quality:   4 - 5          (Quality is key)          │ │
│  │  Marketing: $10 - $25                                │ │
│  │  Weather:   1.1x demand multiplier                   │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  LOW DECEPTION: This market segment values quality and    │
│  will pay for it. Straightforward premium positioning.    │
└────────────────────────────────────────────────────────────┘
```

---

### Scenario 9: Rival Lemonade Stand Nearby

**ID:** `competition-day`
**Deception Level:** High

```
┌────────────────────────────────────────────────────────────┐
│  SCENARIO: Rival Lemonade Stand Nearby                     │
│  ══════════════════════════════════════════════════════════│
│                                                            │
│  STORY:                                                    │
│  Oh no! Another lemonade stand opened just across the      │
│  street. They have fancy signs and seem to be charging     │
│  $0.50 per cup. Customers are looking back and forth       │
│  between both stands.                                      │
│                                                            │
│  HINT:                                                     │
│  Competition means you need to stand out somehow...        │
│                                                            │
│  TARGET MARKET:                                            │
│  Price-comparing customers (need clear value proposition)  │
│                                                            │
│  MARKET CONDITION:                                         │
│  Differentiation through quality and marketing crucial     │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  OPTIMAL DECISIONS                                    │ │
│  │  Price:     $0.50 - $1.00                            │ │
│  │  Quality:   4 - 5          (Differentiate on quality)│ │
│  │  Marketing: $15 - $30      (Must stand out!)         │ │
│  │  Weather:   1.0x demand multiplier                   │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  HIGH DECEPTION: Matching the competitor's low price      │
│  fails. You must differentiate with quality AND marketing │
│  while staying competitive on price.                      │
└────────────────────────────────────────────────────────────┘
```

**Learning Point:** In competitive markets, a pure price war is destructive. Successful competitors differentiate on quality and visibility while maintaining reasonable prices.

---

### Scenario 10: Business District Lunch Rush

**ID:** `lunch-rush`
**Deception Level:** Medium

```
┌────────────────────────────────────────────────────────────┐
│  SCENARIO: Business District Lunch Rush                    │
│  ══════════════════════════════════════════════════════════│
│                                                            │
│  STORY:                                                    │
│  You set up near the business district during lunch hour.  │
│  Office workers in suits are rushing by, checking their    │
│  phones, grabbing quick lunches. They seem to have money   │
│  but very little time.                                     │
│                                                            │
│  HINT:                                                     │
│  Business people have money but are always in a hurry...   │
│                                                            │
│  TARGET MARKET:                                            │
│  Busy professionals (time-sensitive, less price-sensitive) │
│                                                            │
│  MARKET CONDITION:                                         │
│  Convenience and speed more important than lowest price    │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  OPTIMAL DECISIONS                                    │ │
│  │  Price:     $1.00 - $1.50                            │ │
│  │  Quality:   3 - 4          (Good, not elaborate)     │ │
│  │  Marketing: $5 - $15       (They're already there)   │ │
│  │  Weather:   1.1x demand multiplier                   │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  DECEPTION: While they have money, they don't want        │
│  premium experiences - just quick, reliable refreshment.  │
└────────────────────────────────────────────────────────────┘
```

---

## Scenario Summary Matrix

### Optimal Price Ranges

| Scenario | Low | High | Strategy |
|----------|-----|------|----------|
| sports-day | $0.75 | $1.25 | Moderate |
| fancy-neighborhood | $0.50 | $1.00 | Value |
| school-fundraiser | $1.25 | $1.75 | Premium |
| hot-weather | $1.00 | $1.50 | Moderate |
| tourist-trap | $1.50 | $2.00 | Premium |
| rainy-day | $0.75 | $1.25 | Moderate |
| budget-conscious | $0.25 | $0.75 | Budget |
| health-conscious | $1.25 | $1.75 | Premium |
| competition-day | $0.50 | $1.00 | Value |
| lunch-rush | $1.00 | $1.50 | Moderate |

### Optimal Quality Ranges

| Scenario | Min | Max | Focus |
|----------|-----|-----|-------|
| sports-day | 3 | 4 | Balanced |
| fancy-neighborhood | 4 | 5 | High |
| school-fundraiser | 3 | 5 | Flexible |
| hot-weather | 2 | 4 | Lower OK |
| tourist-trap | 4 | 5 | High |
| rainy-day | 4 | 5 | High |
| budget-conscious | 2 | 3 | Lower |
| health-conscious | 4 | 5 | High |
| competition-day | 4 | 5 | High |
| lunch-rush | 3 | 4 | Balanced |

### Weather Effects

| Effect | Scenarios |
|--------|-----------|
| 1.4x (High) | hot-weather |
| 1.3x | sports-day |
| 1.2x | school-fundraiser |
| 1.1x | fancy-neighborhood, health-conscious, lunch-rush |
| 1.0x | tourist-trap, budget-conscious, competition-day |
| 0.6x (Low) | rainy-day |

---

## Educational Objectives by Scenario

| Scenario | Primary Lesson |
|----------|----------------|
| sports-day | Mixed markets require balanced approaches |
| fancy-neighborhood | Wealth doesn't equal willingness to overpay |
| school-fundraiser | Cause marketing justifies premiums |
| hot-weather | High demand ≠ unlimited pricing power |
| tourist-trap | Some markets expect and reward premium pricing |
| rainy-day | Adverse conditions require strategy adaptation |
| budget-conscious | Price sensitivity requires volume strategy |
| health-conscious | Niche markets reward specialization |
| competition-day | Competition requires differentiation |
| lunch-rush | Time value often exceeds price concerns |

---

## Risk Management Observation Points

For facilitator assessment, observe these behaviors per scenario:

| Scenario | Key Observations |
|----------|------------------|
| sports-day | Did they prepare for high volume? |
| fancy-neighborhood | Did they resist over-pricing temptation? |
| school-fundraiser | Did they confidently price premium? |
| hot-weather | Did they prioritize production capacity? |
| tourist-trap | Did they commit to premium quality? |
| rainy-day | Did they conserve resources appropriately? |
| budget-conscious | Did they accept thin margins for volume? |
| health-conscious | Did they invest in quality? |
| competition-day | Did they differentiate rather than just cut prices? |
| lunch-rush | Did they optimize for speed/convenience? |
