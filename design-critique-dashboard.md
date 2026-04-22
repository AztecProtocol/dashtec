# Design Critique: Main Dashboard (`/`)

> **Note on method**: Claude in Chrome was unreachable during this session, so this critique is based on static analysis of the JSX, Tailwind classes, and `tailwind.config.js` tokens rather than rendered pixels. That catches ~80% of final-polish issues (hierarchy, structure, tokens, a11y attributes, touch targets) but won't catch rendered-only issues like font weight anomalies, true contrast with shadow overlays, or animation jank. Worth re-running live once Chrome is connected.

## Overall Impression

The dashboard is a dense, professionally-structured analytics view with a consistent card system and thoughtful dark-mode support — but for "final polish" stage, three issues stand out: **the design token layer has a semantic lie** (brand tokens named "violet" / "purple" actually resolve to gold), **there's an aggressive amount of sub-12px text** (9px, 10px, 11px appear throughout metric cards), and the **hero section competes with itself** because the TokenPriceCard's numerical content and the H1 both fight for the eye.

## Usability

| Finding | Severity | Recommendation |
|---------|----------|----------------|
| "Quick Actions" in hero duplicate links already present in the header nav (`/sequencers`, `/epoch-performance`) — taking up ~40% of the hero real estate without adding navigation Affordance | 🟡 Moderate | Either rename to "Featured views" and add a value prop ("→ see the live committee now"), or demote them to small tertiary links and give the hero space back to the title/description |
| "Quick Actions" label is misleading — these are navigation shortcuts, not actions (no verb, no state change) | 🟢 Minor | Rename to "Explore" or "Jump to" |
| `NetworkSelector` and `RollupSelector` badges (`px-1.5 py-0.5`, `text-[10px]`) are tiny — ~20px tall, far below the 44×44px minimum for primary controls | 🔴 Critical | Bump to at least `px-2.5 py-1 text-xs` with a 32px+ hit area; this is the control users rely on to not accidentally view wrong-network data |
| `ConnectWallet` is hidden on `<lg` screens (only in header), presumably surfaced in the `RightSidebar` drawer. On mobile, wallet state is now two taps away | 🟡 Moderate | Surface a compact wallet-state chip next to the hamburger on mobile so users can see connection status without opening the drawer |
| Desktop nav dropdowns open on **hover** with a 150ms close delay — problematic for trackpad users who drift cursor and for keyboard users (click fallback exists but Tab navigation doesn't open the dropdown) | 🟡 Moderate | Match the pattern to accessible nav menu: open on focus via keyboard, support Esc to close, and ensure `aria-expanded` / `aria-haspopup` are set on the trigger button |
| Label inconsistency: hero card links to "Sequencer Registry" but the header dropdown labels it just "Registry" (under Sequencers) | 🟢 Minor | Pick one — recommend "Registry" since context is already set by parent |

## Visual Hierarchy

**What draws the eye first**: On desktop, the hero is a 5-column grid with title+description+quick-actions (`lg:col-span-3`) and the TokenPriceCard (`lg:col-span-2`). The card has a prominent numeric price, a gold accent chart, and a gain/loss pill — **it competes directly with the H1** "Aztec Sequencer Dashboard". For a dashboard, that's arguably fine (users want the number), but the H1's tracking and size suggest it *should* win.

**Reading flow**: The intended F-pattern (title → description → quick actions → metric grid → performance overview → voting overview → CTA) works — but the 5-column `MetricCardsGrid` on `xl:` creates horizontal cognitive load. Each card has 3–5 nested pills/micro-stats (attestation rates, selection odds, top providers, status badges), and the eye has to refocus for each card.

**Emphasis**:
- `text-3xl font-bold` values in `brand-violet` do good job as primary datapoint per card
- But every card also has **multiple** `text-[9px]`–`text-[10px]` micro-labels that dilute the primary number
- The gold accent is used **everywhere**: quick-action icons, nav-active state, metric card values, CTA button, price chart, hover states — with no hierarchy of "primary brand color" vs "data accent"

**Recommendation**: Constrain the gold to one role — either the brand/CTA role *or* the "primary metric value" role. Today it's both, so primary values don't feel distinct from clickable things.

## Consistency

| Element | Issue | Recommendation |
|---------|-------|----------------|
| **Border-radius** | `tailwind.config.js` defines a `rounded-card: 0.75rem` token, but components use a mix of `rounded-xl` (12px), `rounded-2xl` (16px), `rounded-xl sm:rounded-2xl`, and `rounded-lg` for nested elements | Adopt the `rounded-card` token for top-level cards and a single `rounded-lg` for nested pills. Today it's visually close but the intent is unclear |
| **Section spacing** | Most sections use `mb-8`, but `CallToActionCard` uses `mt-6 sm:mt-8` on itself — means the rhythm breaks at the CTA | Standardize on `mb-8` at the section level, remove the sibling's `mt-*` |
| **Color token naming** | `brand-violet = #D4A017`, `accent-purple = #E5B520`, `accent-purple-light = #F0C940` — all three are **gold**, not violet or purple. `bg-gradient-purple-pink` *is* actually purple-pink (`#7C3AED → #EC4899`) but is never rendered on the dashboard | 🔴 Rename tokens: `brand-gold`, `accent-gold`, `accent-gold-light`. This is a latent bug magnet — someone will add `text-brand-violet` expecting purple |
| **Slate palette override** | Custom config overrides `slate-600` through `slate-900` to `#303030 / #202020 / #101010 / #000000` — pure grays, no hint of blue. The *light-theme* slate scale (50–500) is untouched | The dark-theme gap between `slate-600` (#303030) and `slate-700` (#202020) is only 16 per channel — borders between them are nearly invisible. Widen that gap or use blue-tinted slate for consistency |
| **Hover patterns** | `KeyMetricCard` uses a subtle `border-2 border-transparent group-hover:border-brand-violet/10` overlay. Other cards (`TokenPriceCard`, `CallToActionCard`) don't have any hover state even though they're interactive containers | Decide: are cards hoverable surfaces or not? If only clickable cards hover, be consistent |
| **Duplicate sizing tokens** | Line 62 of `CallToActionCard.tsx`: `className="relative w-4 h-4 sm:w-5 sm:h-5 w-4 h-4 ..."` — `w-4 h-4` is declared twice | Clean up — the later one wins, but it's confusing and may hide a responsive intent |
| **Heading hierarchy inside cards** | `KeyMetricCard` uses `<h2>` for its title. The page already has an `<h1>`, then Hero's "Quick Actions" is `<h2>`, then each of 5 metric cards is `<h2>` — that's 6 sibling h2s with very different semantic weight | Downgrade card titles to `<h3>` or use a styled `<div>` with `role="heading" aria-level="3"` |

## Accessibility

**Color contrast** (key concerns — validate with a live checker when Chrome connects):
- `brand-violet` **#D4A017 on white (#FFFFFF)** → ratio ≈ **2.8:1** — **fails WCAG AA** (needs 4.5:1 for text, 3:1 for large text / UI components). This token is used for values, active nav, buttons, hover states.
- `brand-violet` on `slate-800` (#101010 per custom config) → ratio ≈ 9.1:1 — passes comfortably in dark mode
- `accent-purple-light` **#F0C940 on white** → ratio ≈ 2.2:1 — **fails** (used for dark-mode hover on brand-violet, so light-mode users won't see this combo)
- `text-amber-700 #B45309 on bg-amber-500/10` (InactiveRollupBanner) — border/background combo is low contrast; the **text** likely passes but warrants a check
- Status dots using `/20` and `/15` alpha (e.g. `border-cyan-500/20`) almost certainly fail the 3:1 UI component minimum

**Touch targets**:
- `NetworkSelector` / `RollupSelector`: ~20px tall — ❌ well below 44×44
- Header mobile-menu button: `min-w-[40px] min-h-[40px] xs:min-w-[44px] xs:min-h-[44px]` — ❌ 40px on `<xs` screens
- `subtextButton` in `KeyMetricCard`: `px-2 py-1 text-xs` — probably ~24–28px tall, below minimum
- Hero Quick Action cards: `p-3 sm:p-4` — ✅ large enough

**Text readability**:
- `text-[9px]` appears in at least 4 places in `MetricCardsGrid` (status dots, selection odds label, provider rank)
- `text-[10px]` appears ~12 times across the dashboard
- At typical zoom, 9–10px approaches the legibility floor — problematic for low-vision users and fails any reasonable "final polish" bar

**Keyboard / screen reader**:
- Header has `aria-label` on menu and search buttons — ✅
- Desktop nav dropdown triggers lack `aria-expanded` / `aria-haspopup`
- Heroicons imported as outline — used without `aria-hidden="true"`, so screen readers may announce `"CubeIcon"` etc. alongside visible label text (double announcement)
- Focus rings: the mobile menu button has `focus:ring-2 focus:ring-brand-violet`, but Quick Action Links and `KeyMetricCard` buttons rely on default focus styles, which may be invisible on the white card background
- No "skip to main content" link in the layout — long nav + mobile drawer means keyboard users have many Tab stops before reaching data

**Image alt**: Logo has `alt="Aztec Sequencer Dashboard Logo"` — ✅

**Motion**: Multiple `motion.div` components with infinite animations (logo glow, pulse-border). No `prefers-reduced-motion` guard visible — users with vestibular sensitivity will be affected.

## What Works Well

- **Dark-mode coverage is thorough** — every card, border, text color, hover state has both variants, and the custom ultra-dark slate scale (`#000000`/`#101010`) creates a genuinely premium dark aesthetic
- **Skeleton loading is designed per-card** (`KeyMetricCardSkeleton`, `EpochProgressCardSkeleton`) rather than a generic shimmer — preserves perceived structure during load
- **Responsive collapse is deliberate**: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5` for metric cards, and labels shorten (`"Dashtec"` on `lg+`, full name on `sm:inline lg:hidden`)
- **`tabular-nums` on all numeric values** — correct and frequently forgotten detail
- **`ResizeObserver` for header spacer** — robust pattern that handles dynamic header height (e.g. when the rollup banner appears)
- **Flat Heroicons throughout** matches the `CLAUDE.md` directive and keeps the aesthetic unified
- **`InactiveRollupBanner`** — proactively warns users viewing stale data with a clear link to the block explorer
- **External links use `rel="noopener noreferrer"`** — consistent and correct
- **`touch-manipulation` class** is applied to all interactive chrome — good for mobile tap responsiveness

## Priority Recommendations

**1. 🔴 Rename the `brand-violet` / `accent-purple` tokens to `brand-gold` / `accent-gold`.** This is a final-polish showstopper for a codebase — the tokens are semantically lying. Any new contributor reading JSX will expect purple and get gold. A simple codemod (`brand-violet` → `brand-gold`, `accent-purple` → `accent-gold`, `accent-purple-light` → `accent-gold-light`) plus `tailwind.config.js` key rename. 1–2 hours of work, prevents a class of future bugs.

**2. 🔴 Fix the `brand-gold` on white contrast failure.** `#D4A017` is below 3:1 on white. Options: (a) darken the light-theme brand color to `#B8860B` or `#996F0F` (amber-700-ish) which passes 4.5:1, while keeping the lighter shade for dark mode only, or (b) restrict `brand-violet` to dark-mode usage and pick a different light-mode primary. Option (a) is cheaper. This affects active nav, data values, buttons — the most visible surface.

**3. 🟡 Resize the `NetworkSelector` and `RollupSelector` badges.** These are the *most important* controls for correctness (wrong network = wrong data). They're currently ~20px tall with 10px labels. Bump to `px-3 py-1.5 text-xs` (~28–32px) and consider giving them proper button chrome instead of gradient-filled badges — the gradient fights with the header's visual weight.

**4. 🟡 Raise the sub-12px text floor.** Sweep `text-[9px]` and `text-[10px]` and promote to `text-[11px]` or `text-xs` (12px). There are ~16 occurrences just in `MetricCardsGrid`. If the concern is fitting data density, the cards themselves have room — reduce padding instead of font size.

**5. 🟢 Simplify the hero.** The hero carries: 1 title, 1 description, 2 quick-action links, and the entire `TokenPriceCard` chart. Three ideas to try: (a) move `TokenPriceCard` out of the hero and into the metric strip as a 6th card or its own row above `PerformanceOverview`; (b) drop "Quick Actions" entirely since the header nav covers the same ground; (c) if Quick Actions stay, make them 3–4 with actual value-props ("Find your sequencer", "See this epoch's committee").

**6. 🟢 Standardize card radius on the `rounded-card` token** you already defined. Today it's unused; a 10-minute sweep fixes the `rounded-xl` vs `rounded-2xl` drift.
