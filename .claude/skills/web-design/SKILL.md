---
name: web-design
description: Use when building or restyling UI, fixing monotonous/plain-looking layouts, or when the user asks to improve visual design follow the design principles of a specific brand. This skill can also be used to generate a brand style guide for a new product or service.
---

# PANTAU — brand & UI guideline

**Portal Antar Unit untuk Monitoring Terpadu**

## 1. Concept

The mark is a **monitoring hub** (center, amber) connected by three spokes to **three unit nodes** (white), wrapped in a dashed **pulse ring** — a literal read of "pantau" (to watch) across "antar unit" (between units). It's a network diagram, not a decorative icon, so it stays legible even when someone recognizes what it represents.

Files included:
- `pantau-logo-horizontal.svg` — icon + wordmark + tagline, for headers and marketing surfaces
- `pantau-icon.svg` — icon only, for favicon, app icon, and small avatars

## 2. Color palette

No gradients anywhere — every fill is a flat, single hex value.

| Role | Hex | Usage |
|---|---|---|
| Navy (primary) | `#16233F` | Badge background, wordmark, primary buttons, headers |
| Amber (accent) | `#F5A623` | Hub node, pulse ring, active states, key CTAs — use sparingly |
| Slate (secondary text) | `#5B6B85` | Tagline, captions, secondary labels |
| White | `#FFFFFF` | Unit nodes, text on navy, card backgrounds |
| Off-white (page bg) | `#F7F8FA` | App background |
| Border | `#E1E4EA` | Dividers, card borders, input borders |

Semantic colors (not brand colors, use only for status):
- Success `#2E7D5B` · Warning `#B5790A` · Danger `#C03B3B` · Info `#2F6FB0`

Rule of thumb: **navy carries the interface, amber marks the one thing that matters** on a screen (an alert badge, an active tab, a primary button). If everything is amber, nothing is.

## 3. Typography

- Wordmark: bold, wide letter-spacing (~1px), sentence case is not used for the logo itself — "PANTAU" stays uppercase as a proper noun/wordmark.
- Everywhere else in the product UI: sentence case, not Title Case or ALL CAPS, for buttons, headings, and labels.
- Suggested UI typeface: a neutral grotesque — Inter, Public Sans, or system sans-serif. Avoid pairing the logo with a serif or rounded display font; it reads off-brand against the geometric mark.
- Two weights only for UI text: 400 regular, 500/600 medium for emphasis. Reserve 700 bold for the wordmark itself.

## 4. Logo variants & clear space

- **Horizontal lockup** (default): icon + wordmark + tagline, for the app header, login screen, and marketing pages.
- **Icon only**: favicon, browser tab, PWA/app icon, collapsed sidebar, avatar/notification badges. Never add the tagline at sizes below 32px — it becomes unreadable noise.
- **Stacked lockup** (icon above wordmark, tagline below): for square placements like splash screens or social cards. Not included as a file above but follows the same proportions — happy to generate it if you need it.

**Clear space:** leave a margin around the mark equal to the height of one unit-node circle (about 1/9 of the badge height) on all sides. Don't crop the badge corners or let other UI elements touch the icon.

**Minimum size:** icon-only down to 24×24px (favicon); horizontal lockup down to 120px wide. Below that, drop the tagline first, then simplify to icon-only.

## 5. Do / don't

- Do keep the badge a perfect rounded square (don't stretch it into a rectangle).
- Do keep navy and amber as the only brand colors in the mark itself.
- Don't add a drop shadow, glow, or gradient fill to the badge.
- Don't recolor the wordmark to anything other than navy (or white, on a navy/dark background).
- Don't rotate or skew the icon.
- Don't place the icon on a busy photo background — use a solid navy, white, or off-white field.

## 6. Applying it to the web app

Suggested CSS custom properties to drop into your global stylesheet so the rest of the UI matches the mark automatically:

```css
:root {
  --pantau-navy: #16233F;
  --pantau-navy-hover: #1E2E52;
  --pantau-amber: #F5A623;
  --pantau-amber-hover: #E0951A;
  --pantau-slate: #5B6B85;
  --pantau-border: #E1E4EA;
  --pantau-bg: #F7F8FA;
  --pantau-surface: #FFFFFF;
  --pantau-radius: 12px;
}
```

Concrete mapping:
- **Header/navbar background:** `--pantau-navy`, logo (white-on-navy variant) left-aligned, white nav text.
- **Primary button:** navy background, white text, hover to `--pantau-navy-hover`. Reserve solid-amber buttons for one primary action per screen (e.g. "Add unit," "Acknowledge alert").
- **Active/alert states:** amber dot or left-border accent (4px, square corners per the single-sided-border rule — no rounding on it) on the sidebar item or table row that needs attention. This echoes the hub node in the mark.
- **Cards:** white surface, `--pantau-border` 1px hairline, `12px` radius — matches the badge's rounding language without copying it exactly (icon uses a tighter ~22% radius, UI cards use a flatter 12px so the icon stays visually distinct as "the logo").
- **Favicon/app icon:** use `pantau-icon.svg` directly, or export to PNG at 16/32/180/512px for `<link rel="icon">` and PWA manifest icons.
- **Dark mode:** flip `--pantau-bg`/`--pantau-surface` to dark neutrals (e.g. `#0F1420` / `#16233F`) and keep amber as-is — it already has enough contrast on dark navy since that's literally the logo's own background.

If you want, I can also generate a dark-mode logo variant (amber + white on transparent, for navy backgrounds) or a stacked/square version for social previews.