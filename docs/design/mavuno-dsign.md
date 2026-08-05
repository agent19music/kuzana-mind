# Mavuno — Design Language

A minimalist design system inspired by **Ryo Lu's** work across Notion, Stripe, and Cursor, tuned for the **Vercel + Cursor + Linear** aesthetic. Every rule here exists to answer one question first:

> **Does this make the work easier to see?**

If the answer is no, cut it.

---

## 0. North Star

**Restraint over decoration.** Whitespace is a design element. Typography does the heavy lifting. Color is a tool, not a texture. The interface should recede; the work should lead.

Three principles govern every decision:

1. **Clarity** — Every element must be legible at a glance.
2. **Flexibility** — Patterns compose; they don't prescribe.
3. **Power** — Simple surfaces, deep behavior.

> "The best product is the one people remember — not the interface it came in."

---

## 1. Typography

### Font Stack

```css
--font-sans:
  Manrope,
  -apple-system,
  BlinkMacSystemFont,
  "SF Pro Text",
  "Segoe UI",
  system-ui,
  sans-serif;

--font-mono:
  "SF Mono",
  "JetBrains Mono",
  "Cascadia Code",
  ui-monospace,
  monospace;
```

**Manrope** is the primary typeface. It carries the geometric clarity of Inter with slightly softer terminals — a good fit alongside Cursor's UI and Linear's marketing surfaces.

### Rules

- **Never more than 2 typefaces.** Manrope for everything. Mono only for code, keyboard shortcuts, and technical specs.
- **Hierarchy comes from size, weight, and spacing — not color.**
- Keep weights to **3 maximum**: `400` (regular), `500` (medium), `600` (semibold).
- All-caps is reserved for tiny labels and tags only.
- Negative tracking on large headings (`-0.01em` to `-0.02em`).

### Scale


| Role           | Size      | Weight    | Line Height         | Tracking           |
| -------------- | --------- | --------- | ------------------- | ------------------ |
| Display        | `48–56px` | `600–700` | `1.1`               | `-0.02em`          |
| H1             | `32–40px` | `600`     | `1.2`               | `-0.015em`         |
| H2             | `24–28px` | `600`     | `1.3`               | `-0.01em`          |
| H3             | `20px`    | `600`     | `1.4`               | `-0.005em`         |
| Body Large     | `18px`    | `400`     | `1.6` (`leading-8`) | `0`                |
| Body           | `16px`    | `400`     | `1.6`               | `0`                |
| Label / Button | `14–16px` | `500`     | `1.4`               | `0`                |
| Caption        | `13–14px` | `400–500` | `1.4`               | `0`, opacity `0.6` |


### Reference from `app/page.tsx`

```tsx
<h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight">
<p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
```

- `tracking-tight` on all semibold+ headings.
- Body copy pairs `text-lg` with `leading-8` for generous reading rhythm.
- Inline links: `font-medium text-zinc-950 dark:text-zinc-50` — weight change only, no color accent, no underline.

---

## 2. Color

### Philosophy

Default to **grayscale**. Color earns its place only when it signals state, identity, or a link. The work brings the color — the chrome stays quiet.

### Brand Accent Palette (use sparingly)

```css
--brand-cream: #F8F3E1;
--brand-olive: #41431B;
--brand-sand:  #E3DBBB;
--brand-moss:  #AEB784;
```

Usage priority:

- **Text accents first** (`brand-olive` / `brand-sand`), not backgrounds.
- **Chart elements second** (`chart-1`/`chart-2` map to olive/moss).
- **State indicators third** (`active` and `risk` badges).
- Buttons stay mostly neutral unless a specific CTA needs brand emphasis.

### Base Palette (Light) — layered off-white

Light mode is also tiered, with the inversion that L2 lift is achieved by **shadow**, not by going lighter (you can't lift past `#FAFAFA` without pure white). Hover and inset go *darker* than L1 — toward the page. **No pure white anywhere.** See §14.1.

```css
--background:         #F5F5F5;   /* L0  page background — marketing/auth only */
--surface:            #FAFAFA;   /* L1  the app-shell plane: sidebar, topbar, bottom nav, page wrapper */
--card:               #FCFCFC;   /* Card  cards on the L1 plane — one measured step ABOVE so they lift off, paired with --shadow-xs. Hex literal (not oklch) to avoid warm drift on wide-gamut color-managed browsers. */
--inset-surface:      #F0F0F0;   /* Inset wells inside cards (avatars, badges, inputs, list items) */
--hover-surface:      #F0F0F0;   /* Hover wash on L1 (sinks toward the page) */
--popover:            #FAFAFA;   /* L2  modals, dropdowns, command palette — paired with --shadow-md */
--border:             rgba(0, 0, 0, 0.08);   /* black/[.08] — hair borders */
--border-strong:      #E8E8E8;                /* explicit dividers */
--foreground:         #171717;
--foreground-muted:   #52525B;
--foreground-subtle:  #A1A1AA;
```

### Base Palette (Dark) — layered charcoal

Dark mode is built on a **5-tier elevation system**. Each tier is one measured step lighter than the one below; nothing is pure black. See §14.1 for usage rules.

```css
--background:         #1A1A1A;   /* L0  page background — marketing/auth only */
--surface:            #2D2D2D;   /* L1  the app-shell plane: sidebar, topbar, bottom nav, page wrapper */
--card:               #2A2A2A;   /* Card  cards on the L1 plane — one measured step beneath, paired with --shadow-xs */
--inset-surface:      #252525;   /* Inset wells inside cards (avatars, badges, inputs, list items) — soft recess */
--hover-surface:      #3A3A3A;   /* L2  hover wash on L1 surfaces */
--popover:            #3A3A3A;   /* L2  modals, dropdowns, command palette */
--border:             rgba(255, 255, 255, 0.08);   /* white/[.08] — hair borders */
--border-strong:      #4A4A4A;                     /* explicit dividers, subtle warmth */
--foreground:         #EDEDED;
--foreground-muted:   #A1A1AA;
--foreground-subtle:  #52525B;
```

### Accents (use sparingly)

```css
--accent:             #41431B;   /* brand olive for selective text/interactive accents */
--success:            #00C853;
--warning:            #F5A623;
--danger:             #E5484D;
```

### Rules

- Background is white or near-white. **No colored backgrounds on page chrome.**
- Text is near-black (`#171717`), never pure black (`#000`), to soften contrast.
- **No gradients.** **No decorative shadows.** The only acceptable shadow is the button lift (§5) and focus rings.
- Brand colors are accents only: mostly text, chart primitives, and state tags.
- When in doubt, grayscale.

---

## 3. Spacing

### The 8px Grid

All spacing snaps to multiples of 8. This is non-negotiable.

```css
--space-1:  4px;
--space-2:  8px;
--space-3:  12px;
--space-4:  16px;
--space-6:  24px;
--space-8:  32px;
--space-12: 48px;
--space-16: 64px;
--space-24: 96px;
--space-32: 128px;
```

### Layout Scale


| Context                 | Desktop               | Mobile    |
| ----------------------- | --------------------- | --------- |
| Page vertical padding   | `128px` (`py-32`)     | `64px`    |
| Page horizontal padding | `64px` (`px-16`)      | `24px`    |
| Content max-width       | `768px` (`max-w-3xl`) | `100%`    |
| Section spacing         | `96px`                | `48px`    |
| Paragraph spacing       | `24–32px`             | `16–24px` |
| Inline gap (button row) | `16px` (`gap-4`)      | `16px`    |
| Stacked content gap     | `24px` (`gap-6`)      | `16px`    |


### Reference from `app/page.tsx`

```tsx
<main className="... max-w-3xl ... py-32 px-16 ...">
  <div className="flex flex-col items-center gap-6 ...">
  <div className="flex flex-col gap-4 ... sm:flex-row">
```

- `max-w-3xl` (`768px`) is the canonical reading column.
- `py-32 px-16` on desktop is the canonical page frame.
- `gap-6` between grouped content blocks, `gap-4` between adjacent actions.

### Rules

- Whitespace is **not empty space** — it's the element that makes hierarchy possible.
- Let large visuals **break out** of the reading column when they deserve it.
- Mobile reduces vertical spacing by ~30–40%, never hierarchy.

---

## 4. Layout

### Grid

- **12-column grid** for marketing / multi-column surfaces.
- **Single column** (`max-w-3xl` / 768px) for narrative and product pages.
- Gutters: `32px` desktop, `16px` mobile.

### Alignment Rules

- Text is **left-aligned**. Always. Center-alignment is reserved for page-level heroes on mobile (`items-center` → `sm:items-start`).
- Maintain a **consistent left margin** down the entire page.
- Images may break alignment for visual interest.
- **Never center body text.** Never justify.

### Responsive Pattern

```tsx
// from app/page.tsx
<div className="flex flex-col items-center ... sm:items-start sm:text-left">
```

The base is mobile (centered stack), `sm:` lifts into desktop (left-aligned). This is the canonical direction — never the reverse.

---

## 5. Buttons — The Canonical Component

Buttons are the most-touched surface in the app. Their shape, hover, and feedback define the feel of the entire product. These rules are **pulled directly from `app/page.tsx`** and should be followed exactly.

### 5.1 Shape & Geometry


| Property                        | Value             | Tailwind            |
| ------------------------------- | ----------------- | ------------------- |
| Height                          | `48px`            | `h-12`              |
| Padding                         | `20px` horizontal | `px-5`              |
| Border radius                   | **fully pill**    | `rounded-full`      |
| Fixed width (when matched pair) | `158px`           | `md:w-[158px]`      |
| Icon gap                        | `8px`             | `gap-2`             |
| Font size                       | `16px`            | `text-base`         |
| Font weight                     | `500`             | `font-medium`       |
| Transition                      | `colors` only     | `transition-colors` |


**Pill buttons are the house style.** No pill-vs-rounded mixing within a surface. No sharp corners on CTAs.

### 5.2 Primary Button

Solid, high-contrast, inverted in dark mode.

```tsx
<a
  className="
    flex h-12 w-full items-center justify-center gap-2
    rounded-full bg-foreground px-5 text-background
    transition-colors
    hover:bg-[#383838]
    dark:hover:bg-[#ccc]
    md:w-[158px]
  "
>
  <Image src="/icon.svg" width={16} height={16} alt="" />
  Deploy Now
</a>
```

- Rest: `bg-foreground` (`#171717` light / `#EDEDED` dark) on `text-background`.
- Hover (light): `#383838` — a measured step lighter than the rest state.
- Hover (dark): `#CCC` — a measured step darker than the rest state.
- **No scale. No shadow. No ring on hover.** Hover is a color shift only.

### 5.3 Secondary Button

Outlined, near-invisible border at rest, fills softly on hover.

```tsx
<a
  className="
    flex h-12 w-full items-center justify-center
    rounded-full border border-solid border-black/[.08] px-5
    transition-colors
    hover:border-transparent hover:bg-black/[.04]
    dark:border-white/[.145] dark:hover:bg-[#1a1a1a]
    md:w-[158px]
  "
>
  Documentation
</a>
```

- **The border is the signature.** `border-black/[.08]` in light, `border-white/[.145]` in dark. It is barely there — which is the point.
- On hover, the border dissolves (`border-transparent`) as a fill rises underneath (`bg-black/[.04]` / `bg-[#1a1a1a]`). The effect is a **soft wash**, not a highlight.

### 5.4 Hover Behavior — The Rules

Hover is a language. The same grammar applies across every button, card, and link.


| Principle                   | Spec                                                                                               |
| --------------------------- | -------------------------------------------------------------------------------------------------- |
| **Transition property**     | `transition-colors` — never `transition-all`                                                       |
| **Duration**                | `200ms` default, `300ms` for larger surfaces                                                       |
| **Easing**                  | `ease-out` for enter, `ease-in-out` for hold/leave                                                 |
| **No motion on press**      | No scale, no translate, no jiggle                                                                  |
| **Color shift only**        | Background and border may change; **never** add a shadow on hover for buttons                      |
| **Primary hover**           | Background moves one measured step (`#171717` → `#383838`)                                         |
| **Secondary hover**         | Border dissolves → soft background wash (`black/[.04]`) appears                                    |
| **Dark mode mirrors light** | Contrast direction inverts; step size stays the same                                               |
| **Focus-visible**           | `outline-none ring-2 ring-foreground/60 ring-offset-2 ring-offset-background` — ring, never shadow |
| **Active (pressed)**        | Slightly deeper wash only (`black/[.06]`). No translate.                                           |
| **Disabled**                | `opacity-50 pointer-events-none`. No hover.                                                        |


**Anti-patterns:**

- ❌ `hover:shadow-lg` on buttons
- ❌ `hover:scale-105` on buttons
- ❌ `transition-all duration-500`
- ❌ Gradient hover states
- ❌ Hover outlines that appear from nowhere
- ❌ Changing border-radius on hover

### 5.5 Icon-in-Button

Icons sit **before** the label, `16×16px`, with `gap-2` (`8px`) to the text. Vertically centered, never above. Inherit color via `currentColor` when possible; invert raster assets with `dark:invert`.

### 5.6 Button Group

- Stack on mobile (`flex-col gap-4`).
- Row on desktop (`sm:flex-row`).
- Matched pairs use a **fixed width** (`md:w-[158px]`) so the row looks balanced regardless of label length.

---

## 6. Links

Text links are **weight-based**, not color-based.

```tsx
<a className="font-medium text-zinc-950 dark:text-zinc-50">
  Templates
</a>
```

- Inline links: bump weight to `500` (medium), keep text color.
- Hover: `opacity-70` or a subtle underline (`hover:underline underline-offset-4`). Pick one per surface and stick with it.
- Standalone link-style CTAs may use `#0066FF` — sparingly.
- **Never** underline-by-default inside body copy; it's visual noise.

---

## 7. Cards & Surfaces

```
Border:         1px solid var(--border)        /* hairline both modes */
Border-radius:  8–12px (never above 16)
Padding:        24–32px
Shadow at rest: none
```

### Background by mode

| Element                       | Light (tier)                                | Dark (tier)                                  |
| ----------------------------- | ------------------------------------------- | -------------------------------------------- |
| Page background (marketing/auth) | `var(--background)` — L0 `#F5F5F5`       | `var(--background)` — L0 `#1A1A1A`           |
| App-shell plane (sidebar/topbar/main wrapper) | `var(--surface)` — L1 `#FAFAFA` | `var(--surface)` — L1 `#2D2D2D`              |
| Card / panel on the L1 plane  | `var(--card)` — Card `#FCFCFC` (lifts above plane) + `--shadow-xs` | `var(--card)` — Card `#2A2A2A` (settles beneath plane) + dark `--shadow-xs` |
| Nested item inside a card     | `var(--inset-surface)` — Inset `#F0F0F0`    | `var(--inset-surface)` — Inset `#252525`     |
| Modal / popover               | `var(--popover)` — L1 + `--shadow-md`       | `var(--popover)` — L2 `#3A3A3A` + dark `--shadow-md` |

Reach for the **token in both modes** — `bg-card`, `bg-surface`, `bg-inset-surface`, `bg-popover`, `bg-background`. Never hardcode `bg-white`, `bg-zinc-50`, `bg-zinc-100`, `dark:bg-black`, or `dark:bg-zinc-900`. The token is the contract; switching themes is a CSS-variable update, not a class-list rewrite.

### Card Hover (the one place motion is allowed)

```css
.card {
  transition: transform 200ms ease-out, box-shadow 200ms ease-out;
}
.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.04);     /* light */
}
.dark .card:hover {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6);      /* dark — deeper, still soft */
}
```

A **2px lift** with a whisper of shadow. That's it. This is the only approved translate in the system, and it does **not** apply to buttons.

---

## 8. Shadows — Approved Set

The system has exactly **four** shadows. Nothing else. Each has a **light** and a **dark** value — the spread/offset stay identical, only opacity scales up in dark mode so the lift remains visible against charcoal surfaces.

```css
/* None — default for flat UI */
--shadow-none:                  none;

/* Hairline — subtle elevation for resting cards */
--shadow-xs-light:              0 1px 2px rgba(0, 0, 0, 0.04);
--shadow-xs-dark:               0 1px 2px rgba(0, 0, 0, 0.4);

/* Lift — hovered cards, dropdowns */
--shadow-sm-light:              0 8px 24px rgba(0, 0, 0, 0.04);
--shadow-sm-dark:               0 8px 24px rgba(0, 0, 0, 0.6);

/* Float — modals, command palette, popovers */
--shadow-md-light:              0 16px 48px rgba(0, 0, 0, 0.08);
--shadow-md-dark:               0 16px 48px rgba(0, 0, 0, 0.6);
```

### Rules

- **Buttons use none of these.** Their feedback is color, not elevation.
- Pair every floating element (popover, modal, command palette) with **both** the L2 surface (`--popover`) **and** `--shadow-md` so the elevation reads in either mode.
- In dark mode, **never** rely on a light-mode shadow to convey lift — `rgba(0,0,0,0.04)` is invisible on `#2D2D2D`. Always pair `shadow-*` with its `dark:shadow-*` twin.

---

## 9. Motion


| Interaction              | Duration | Easing                          |
| ------------------------ | -------- | ------------------------------- |
| Color / background hover | `200ms`  | `ease-out`                      |
| Card lift                | `200ms`  | `ease-out`                      |
| Page transition (fade)   | `300ms`  | `ease-out`                      |
| Modal enter              | `300ms`  | `cubic-bezier(0.16, 1, 0.3, 1)` |
| Dismiss                  | `200ms`  | `ease-in`                       |


### Rules

- Nothing animates longer than `500ms`.
- No parallax. No entrance animations on scroll for text blocks.
- No auto-playing video or looping motion.
- **Respect `prefers-reduced-motion`** — disable transforms, keep color transitions.
- When in doubt, no animation is better than bad animation.

---

## 10. Navigation

- Height: `64–72px`.
- Background: transparent or `bg-white/80 backdrop-blur` when content can scroll behind it.
- Bottom border: `1px solid var(--border)` — hairline only.
- 3–5 items maximum.
- Font: `14–15px`, `font-medium`.
- Active state: full-weight foreground color. Inactive: `foreground-muted`.
- Mobile: hamburger under `768px`, slide-in sheet, no bounce.

---

## 11. Forms & Inputs

```
Height:          44–48px (matches button h-12)
Border:          1px solid var(--border-strong)
Border-radius:   8px
Padding:         12px 16px
Font-size:       16px (prevents iOS zoom)
Focus:           ring-2 ring-foreground/60 ring-offset-2
```

Same philosophy as buttons: **color shifts, not motion.** No animated floating labels.

---

## 12. Imagery

- No borders, frames, or drop shadows on images.
- Preserve original aspect ratios.
- `2x` retina minimum.
- Full-bleed when the image deserves the stage; otherwise cap at `max-w-3xl`.
- Generous vertical breathing room: `48–96px` above and below.
- Lazy-load everything below the fold.

---

## 13. Accessibility

- Contrast ratio: **4.5:1 minimum** for body, **3:1** for large text.
- Every interactive element has a visible **focus-visible** ring — no exceptions.
- Semantic HTML (`<main>`, `<nav>`, `<article>`, `<button>`, `<a>`).
- All images have `alt` text (empty `alt=""` for decorative).
- Keyboard: tab order matches visual order; Escape closes overlays; Enter/Space activates buttons.
- Respect `prefers-reduced-motion` and `prefers-color-scheme`.

---

## 14. Dark Mode

Dark mode is a **first-class citizen**, not an afterthought.

- Background: `#1A1A1A` (charcoal, never `#000` for content areas).
- Text: `#EDEDED`.
- Borders: `rgba(255, 255, 255, 0.08)` — the hairline.
- Every color token has a dark twin — test both on every component.
- Primary button **inverts** in dark mode (light fill, dark text) and its hover steps **darker** (`#CCC`), mirroring the light-mode direction.

### 14.1 Elevation tiers (both modes)

Both palettes are **layered, not flat**. Each tier is one measured step away from the page in lightness. Dark mode lifts by getting **lighter**; light mode lifts by getting **lighter into white**, which we cap at `#FAFAFA` — so L2 elevation in light mode is carried by **shadow**, not surface change. The page never sits on pure black or pure white.

#### Dark mode

| Tier   | Token                  | Value     | Use                                                              |
| ------ | ---------------------- | --------- | ---------------------------------------------------------------- |
| L0     | `--background`         | `#1A1A1A` | Page background — marketing (`app/page.tsx`) and auth only       |
| L1     | `--surface`            | `#2D2D2D` | The app-shell plane: sidebar, topbar, bottom nav, page wrapper   |
| Card   | `--card`               | `#2A2A2A` | Cards sitting on the L1 plane — one measured step beneath, paired with `--shadow-xs` for a whisper of lift |
| L2     | `--popover`            | `#3A3A3A` | Modals, dropdowns, command palette, search overlay               |
| Hover  | `--hover-surface`      | `#3A3A3A` | Hover wash on L1 (matches L2 — the surface "lifts" toward you)   |
| Inset  | `--inset-surface`      | `#252525` | Wells *inside* a card — avatars, badges, inputs, list items (soft recess, not a hole) |
| Border | `--border-strong`      | `#4A4A4A` | Explicit dividers (subtle warmth)                                |

#### Light mode

| Tier   | Token                  | Value     | Use                                                              |
| ------ | ---------------------- | --------- | ---------------------------------------------------------------- |
| L0     | `--background`         | `#F5F5F5` | Page background — marketing (`app/page.tsx`) and auth only       |
| L1     | `--surface`            | `#FAFAFA` | The app-shell plane: sidebar, topbar, bottom nav, page wrapper   |
| Card   | `--card`               | `#FCFCFC` | Cards sitting on the L1 plane — one measured step **above** so they lift off, paired with `--shadow-xs`. Hex literal (not oklch) to dodge warm drift on color-managed browsers |
| L2     | `--popover`            | `#FAFAFA` | Modals, dropdowns, command palette — **paired with `--shadow-md`** for lift |
| Hover  | `--hover-surface`      | `#F0F0F0` | Hover wash on L1 (sinks toward the page)                         |
| Inset  | `--inset-surface`      | `#F0F0F0` | Wells *inside* a card — avatars, badges, inputs, list items     |
| Border | `--border-strong`      | `#E8E8E8` | Explicit dividers                                                |

#### Shadow pairing per tier

| Element       | Light shadow      | Dark shadow      |
| ------------- | ----------------- | ---------------- |
| Resting card  | `--shadow-xs-light` (`0 1px 2px rgba(0,0,0,0.04)`) | `--shadow-xs-dark` (`0 1px 2px rgba(0,0,0,0.5)`) |
| Card hover    | `--shadow-sm-light` (`0 8px 24px rgba(0,0,0,0.04)`) | `--shadow-sm-dark` (`0 8px 24px rgba(0,0,0,0.6)`) |
| Popover/modal | `--shadow-md-light` (`0 16px 48px rgba(0,0,0,0.08)`) | `--shadow-md-dark` (`0 16px 48px rgba(0,0,0,0.6)`) |

### Usage rules

- **The app shell is a single plane.** Inside the authenticated `(app)` routes, the page wrapper and the sidebar both render on `--surface` (L1) — no L0 → L1 seam between sidenav and main content. L0 (`--background`) is reserved for marketing/auth surfaces (`app/page.tsx`, `app/(auth)/`) where a recessed page bg under a lifted card is the right read.
- **Cards lift opposite directions in light vs. dark — by design.** In **light mode** the Card tier (`#FCFCFC`) sits one step **above** the L1 plane; in **dark mode** it sits one step **beneath** (`#2A2A2A`). This isn't a mistake. Light mode runs out of headroom near pure white (which we don't use), so cards pop by going closer to white *and* leaning on `--shadow-xs`. Dark mode has plenty of room to lift, but a darker card reads as "settled into" the plane while still being clearly above the deeper inset wells — which feels more honest on a charcoal page than a brighter card would. In both modes, the card always sits **above** the inset wells inside it (`#FCFCFC > #F0F0F0`, `#2A2A2A > #252525`), so the inner hierarchy is consistent.
- **Hex over OKLCH for near-white card surfaces.** `oklch(0.97 0 0)` and friends can drift visibly warm on color-managed wide-gamut displays (Display P3 Macs, Chrome ≥ 111). For tokens close to either extreme of the lightness axis (anywhere above ~0.96 or below ~0.2), prefer a hex literal — it's interpreted as plain sRGB and won't surprise you.
- **One step at a time.** Don't skip tiers. An item nested two levels deep doesn't need two tier jumps — visual hierarchy comes from grouping, not stacked tints.
- **Hover direction inverts by mode.** Dark hover lifts to a **lighter** tier; light hover sinks to a **darker** wash. The token (`hover-surface`) handles this — components don't pick a side.
- **L2 lift in light mode = shadow, not lightness.** Popovers and modals stay on `--surface` and earn their elevation from `--shadow-md`. Don't try to invent a lighter-than-`#FAFAFA` token; pure white is off-limits.
- **Inset goes _inside_ L1, not next to it.** An avatar inside a card uses `inset-surface`. A card sitting on the page uses `surface`.
- **Floating elements always pair surface + shadow** — the surface change carries weight in dark, the shadow carries airspace in light. Both modes work because both layers are present.
- **No raw `bg-white`, `bg-zinc-50`, `bg-zinc-100`, `dark:bg-black`, `dark:bg-zinc-900`, or arbitrary hex.** Reach for the token. If a token doesn't exist, the element probably doesn't need its own tier.

---

## 15. Anti-Patterns

**Do not:**

- Use more than 3 font weights.
- Add drop shadows to everything.
- Use saturated color as a background.
- Animate for the sake of delight.
- Use carousels, sliders, or auto-playing video.
- Put text over imagery unless the image is the canvas.
- Use `transition-all`.
- Scale or translate buttons on hover.
- Mix pill buttons and squared buttons on the same surface.
- Use pure black (`#000`) for body text.

---

## 16. Quick Reference — Ship Checklist

Before merging any UI change:

- Does it breathe? (Whitespace on 8px grid?)
- Typography hierarchy clear without color?
- ≤ 3 font weights, ≤ 2 typefaces?
- Buttons are `h-12 rounded-full px-5`?
- Primary hover: `#383838` / `#ccc`. Secondary hover: border dissolves → `black/[.04]` wash?
- `transition-colors` only on buttons — no shadow, no scale on hover?
- Focus-visible ring present on every interactive element?
- Dark mode inverts correctly?
- Mobile stacks at `sm:` breakpoint, touch targets ≥ 44px?
- No animation over 500ms; `prefers-reduced-motion` respected?
- Contrast ≥ 4.5:1 for body?
- The work — not the chrome — is what the user remembers?

---

## 17. Tokens — Copy Into `globals.css`

```css
@import "tailwindcss";

:root {
  /* Color — light mode (layered off-white, no pure white) */
  --background: #f5f5f5;       /* L0 page (marketing/auth) */
  --surface: #fafafa;          /* L1 app-shell plane: sidebar, topbar, bottom nav, page wrapper */
  --card: #fcfcfc;             /* Card on the L1 plane — lifts above, pair with --shadow-xs (hex literal to avoid wide-gamut warm drift) */
  --inset-surface: #f0f0f0;    /* Inset wells inside cards */
  --popover: #fafafa;          /* L2 — pair with --shadow-md */
  --foreground: #171717;
  --foreground-muted: #52525b;
  --foreground-subtle: #a1a1aa;
  --border: rgba(0, 0, 0, 0.08);
  --border-strong: #e8e8e8;
  --hover-surface: #f0f0f0;
  --accent: #41431b;
  --brand-cream: #f8f3e1;
  --brand-olive: #41431b;
  --brand-sand: #e3dbbb;
  --brand-moss: #aeb784;
  --chart-1: #41431b;
  --chart-2: #aeb784;
  --chart-3: #e3dbbb;

  /* Spacing (8px grid) */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;
  --space-12: 48px;
  --space-16: 64px;
  --space-24: 96px;
  --space-32: 128px;

  /* Radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-pill: 9999px;

  /* Motion */
  --duration-fast: 200ms;
  --duration-base: 300ms;
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
}

@media (prefers-color-scheme: dark) {
  :root {
    --background: #1a1a1a;     /* L0 page (marketing/auth) */
    --surface: #2d2d2d;        /* L1 app-shell plane */
    --card: #2a2a2a;           /* Card on the L1 plane — pair with --shadow-xs */
    --inset-surface: #252525;  /* Inset wells inside cards — soft recess */
    --popover: #3a3a3a;        /* L2 */
    --foreground: #ededed;
    --foreground-muted: #a1a1aa;
    --foreground-subtle: #52525b;
    --border: rgba(255, 255, 255, 0.08);
    --border-strong: #4a4a4a;
    --hover-surface: #3a3a3a;
    --chart-1: #e3dbbb;
    --chart-2: #aeb784;
    --chart-3: #f8f3e1;
  }
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-manrope), -apple-system, BlinkMacSystemFont,
    "SF Pro Text", "Segoe UI", sans-serif;
  --font-mono: "SF Mono", "JetBrains Mono", ui-monospace, monospace;
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

---

## 18. Manrope Setup (Next.js App Router)

```tsx
// app/layout.tsx
import { Manrope } from "next/font/google";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={manrope.variable}>
      <body>{children}</body>
    </html>
  );
}
```

---

## Summary

> **Buttons are pills. Hover is a color shift, not motion. Whitespace is the design. Manrope does the talking.**

Everything else is an exception that needs to justify itself.

---

*Inspired by Ryo Lu's work at Notion, Stripe, and Cursor. Anchored to the component language already shipping in `client/app/page.tsx`.*