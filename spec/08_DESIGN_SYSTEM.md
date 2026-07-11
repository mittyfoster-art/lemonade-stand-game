# 08 — Design System: "Summer Pop"

> Adopted 2026-07-10. This document is the source of truth for the game's
> visual language. Implementation mapping is at the bottom.

```yaml
name: Summer Pop
colors:
  surface: '#f4fafd'
  surface-dim: '#d4dbdd'
  surface-bright: '#f4fafd'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eef5f7'
  surface-container: '#e8eff1'
  surface-container-high: '#e2e9ec'
  surface-container-highest: '#dde4e6'
  on-surface: '#161d1f'
  on-surface-variant: '#4d4732'
  inverse-surface: '#2b3234'
  inverse-on-surface: '#ebf2f4'
  outline: '#7e775f'
  outline-variant: '#d0c6ab'
  surface-tint: '#705d00'
  primary: '#705d00'
  on-primary: '#ffffff'
  primary-container: '#ffd700'
  on-primary-container: '#705e00'
  inverse-primary: '#e9c400'
  secondary: '#006875'
  on-secondary: '#ffffff'
  secondary-container: '#00e3fd'
  on-secondary-container: '#00616d'
  tertiary: '#2e6c00'
  on-tertiary: '#ffffff'
  tertiary-container: '#72f700'
  on-tertiary-container: '#2e6d00'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffe16d'
  primary-fixed-dim: '#e9c400'
  on-primary-fixed: '#221b00'
  on-primary-fixed-variant: '#544600'
  secondary-fixed: '#9cf0ff'
  secondary-fixed-dim: '#00daf3'
  on-secondary-fixed: '#001f24'
  on-secondary-fixed-variant: '#004f58'
  tertiary-fixed: '#80ff2c'
  tertiary-fixed-dim: '#67e100'
  on-tertiary-fixed: '#092100'
  on-tertiary-fixed-variant: '#215100'
  background: '#f4fafd'
  on-background: '#161d1f'
  surface-variant: '#dde4e6'
typography:
  display-xl:
    fontFamily: Bricolage Grotesque
    fontSize: 48px
    fontWeight: '800'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Bricolage Grotesque
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
  headline-lg-mobile:
    fontFamily: Bricolage Grotesque
    fontSize: 28px
    fontWeight: '700'
    lineHeight: '1.2'
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '500'
    lineHeight: '1.6'
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  label-bold:
    fontFamily: Space Grotesk
    fontSize: 14px
    fontWeight: '700'
    lineHeight: '1'
  sticker-text:
    fontFamily: Bricolage Grotesque
    fontSize: 20px
    fontWeight: '800'
    lineHeight: '1'
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 8px
  container-padding: 24px
  element-gap: 16px
  section-margin: 40px
  gutter: 20px
```

## Brand & Style

The design system is built for a high-energy, competitive gaming experience.
It captures the essence of a sun-drenched summer day through a **Modern Pop**
aesthetic. The personality is vibrant, youthful, and un-apologetically fun.

Key visual pillars:

- **Gamified Immersion:** Moving away from traditional SaaS layouts toward an
  interface that feels like a game console.
- **Dynamic Layers:** Extensive use of semi-transparent surfaces
  (glassmorphism) and vibrant background gradients to create a sense of depth
  and heat.
- **Playful Accents:** Floating "sticker" elements, thick outlines, and
  expressive iconography that appeal to a teenage demographic.
- **Kinetic Energy:** The UI should feel "bouncy" and responsive, using soft
  shadows to imply physical weight and tactile interaction.

## Colors — "Citrus & Sea"

- **Primary (Zesty Yellow `#ffd700`):** Main actions and branding — the sun
  and the product itself.
- **Secondary (Cool Cyan `#006875` / `#00e3fd`):** Cooling elements, water,
  secondary navigation. High-contrast relief against the yellow.
- **Tertiary (Neon Lime `#72f700` / `#67e100`):** Success states, growth
  indicators, upgrades.
- **Neutral (Deep Charcoal `#161d1f`):** High-readability text and heavy
  borders that ground the vibrant colors.
- **Backgrounds:** Radial gradients from `#FFF9C4` (pale sun) to `#FFECB3`
  (warm sand) for a bright, outdoor atmosphere.

## Typography

- **Headlines:** *Bricolage Grotesque* — quirky, loud, impactful.
- **Body:** *Plus Jakarta Sans* — friendly, modern, highly readable during
  fast-paced gameplay.
- **Labels / data:** *Space Grotesk* — timers and game stats get a slightly
  futuristic, digital edge.
- Over complex gradients, pair text with a subtle 1px dark stroke or soft
  white glow shadow for legibility.

## Layout & Spacing

Fluid "safe-zone" model: content centers in floating glass containers rather
than rigid full-screen blocks.

- **Mobile (<600px):** single column, 16px margins, bottom-anchored primary
  actions for thumb-friendly play.
- **Tablet (600–1024px):** 2-column dashboard stats.
- **Desktop (>1024px):** 12-column grid, max-width 1200px.
- **Rhythm:** 8px base unit; 16px+ gaps between interactive elements.

## Elevation & Depth

- **Level 0 (Environment):** vibrant animated gradients.
- **Level 1 (Panels):** semi-transparent white `#FFFFFFBA`, 20px backdrop
  blur, 1px white inner border (frosted glass).
- **Level 2 (Interactive):** soft diffused shadows
  (`0 10px 20px rgba(0,0,0,0.1)`), lift on hover.
- **Level 3 (Modals):** high-contrast shadows with a primary-tinted glow.

## Shapes

- Standard inputs / small cards: 8px corners.
- Main game panels: 24px corners.
- Buttons and chips: pill / highly rounded (up to 32px).
- Stickers and icons: irregular paths or thick 3px outlines.

## Components

- **Primary button:** bright yellow, thick 4px bottom border (skeuomorphic
  "push"), bold dark text; on press, translate Y by 2px.
- **Secondary button:** cyan ghost with thick border.
- **Cards ("The Stand"):** frosted glass; card headers may use a lime-green
  gradient separator.
- **Inputs:** white, soft 2px inner shadow (recessed); focus = bright cyan
  outer glow.
- **Stickers/badges:** rotated 5–7°, white 3px die-cut border, sharp shadow.
- **Progress bars:** lime fill on a dark translucent charcoal track.

---

## Implementation mapping (2026-07-10)

| Spec | Where it lives in code |
|---|---|
| Palette → shadcn tokens | `src/index.css` `:root` / `.dark` HSL variables (`--primary` = zesty yellow, `--secondary` = cool cyan, `--ring` = cyan glow, `--border` = outline-variant, etc.) |
| Raw accents | `tailwind.config.js` → `colors.pop.*` (`pop-zest`, `pop-sea`, `pop-lime`, `pop-charcoal`, …) |
| Fonts | Self-hosted via `@fontsource-variable/*` imports in `src/index.css`; `tailwind.config.js` `fontFamily.display/sans/label`. `h1–h3` default to the display face (base layer). |
| Environment gradient | `body` background radial gradient (pale sun → warm sand) in `src/index.css` |
| Frosted glass panels | `src/components/ui/card.tsx` base classes (`bg-card/75 backdrop-blur-xl border-white/60`) |
| Push-effect buttons | `src/components/ui/button.tsx` `default`/`secondary` variants (`border-b-4` + `active:translate-y-[2px]`) |
| Recessed inputs + cyan focus glow | `src/components/ui/input.tsx` |
| Lime-on-charcoal progress | `src/components/ui/progress.tsx` |
| Entry parallax scene | `src/components/EntryScene.tsx` (sky now uses the pale-sun → warm-sand ramp) |

Deliberate deviations, for legibility (WCAG contrast beats spec where they
conflict):

- Secondary "ghost" buttons use deep-teal text on light backgrounds instead
  of white text (white-on-ghost fails contrast outdoors on light surfaces).
- Dark mode is a pragmatic charcoal-sea adaptation of the palette — the spec
  defines light mode only.
