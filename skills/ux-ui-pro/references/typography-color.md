# Typography & Color

> Reference for: ux-ui-pro
> Load when: Choosing fonts, color palettes, or verifying contrast ratios

## Typography

### Type Scale (4-step minimum)

| Role | Size | Weight | Line-height |
|------|------|--------|-------------|
| Display / Hero | 36–48 px | 700–800 | 1.1 |
| Heading 1 | 28–32 px | 700 | 1.2 |
| Heading 2 | 22–24 px | 600 | 1.2 |
| Heading 3 | 18–20 px | 600 | 1.3 |
| Body | 15–16 px | 400 | 1.55 |
| Small / Caption | 12–13 px | 400 | 1.4 |
| Label / Overline | 11–12 px | 500–600 (uppercase) | 1.3 |

### Typeface Selection Rules

- **Limit to 2 families**: one for UI text, one optional for display/marketing.
- **Prefer variable fonts** (reduce HTTP requests, support fine weight tuning).
- **System font stack** is acceptable and performant for data-heavy UIs:
  ```css
  font-family: "Inter", "Segoe UI", system-ui, -apple-system, sans-serif;
  ```
- **Avoid purely decorative fonts** in product UI — they harm readability.
- **Monospace** for code, IDs, file paths, and numeric data that must align:
  ```css
  font-family: "JetBrains Mono", "Fira Code", ui-monospace, monospace;
  ```

### Readability Rules

- Optimal line length: 60–80 characters (45–75 for mobile).
- Never `text-align: justify` in UI — produces uneven word spacing.
- Letter-spacing: tighten display headings (−0.02em), loosen all-caps labels (+0.08em).
- Avoid all-caps for body text; use for labels/overlines only.

## Color

### Palette Architecture

A product palette has four layers:

1. **Brand / Accent** — 1–2 hues that define identity. Used sparingly for primary actions, highlights.
2. **Neutral** — 10-step grey scale used for backgrounds, surfaces, borders, and text.
3. **Semantic** — Fixed-meaning colors: success (green), warning (amber), danger (red), info (blue).
4. **Surface hierarchy** — 3–4 lightness levels for background layering (page → panel → elevated → overlay).

### Dark Theme Recommendations

```css
/* Backgrounds — avoid pure black; use dark greys */
--bg:          #1a1a1f;   /* page background */
--bg-elevated: #242429;   /* cards, panels */
--bg-hover:    #2e2e34;   /* hover state */

/* Text */
--text:        #f0f0f3;   /* primary text */
--text-muted:  #9898a8;   /* secondary / captions */
--text-dim:    #70707e;   /* placeholders, disabled */

/* Borders */
--line:        rgba(255,255,255,0.08);
--line-strong: rgba(255,255,255,0.15);

/* Accent example */
--accent:      #10b981;   /* emerald-500 */
--accent-soft: rgba(16,185,129,0.12);
```

### Light Theme Recommendations

```css
--bg:          #f8f8fb;
--bg-elevated: #ffffff;
--bg-hover:    #f0f0f5;
--text:        #111118;
--text-muted:  #5a5a6e;
--text-dim:    #9898a8;
--line:        rgba(0,0,0,0.08);
--line-strong: rgba(0,0,0,0.15);
```

### WCAG Contrast Requirements

| Content Type | Minimum Ratio | Target |
|---|---|---|
| Body text (< 18 pt, < 14 pt bold) | 4.5:1 | 7:1 (AAA) |
| Large text (≥ 18 pt or ≥ 14 pt bold) | 3:1 | 4.5:1 |
| UI components (borders, icons) | 3:1 | 4.5:1 |
| Decorative / disabled | No requirement | — |

Verification tools: [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/), browser DevTools accessibility panel.

### Color Usage Rules

- Use accent color for ≤ 10% of the visible UI surface — the more rare, the more attention it draws.
- Never use red for anything other than errors or destructive actions.
- Semantic colors must be consistent: green = success, amber = warning, red = danger, blue = info — do not repurpose them.
- Always test designs in grayscale to verify hierarchy doesn't break without color.

## Anti-Patterns

| Anti-Pattern | Problem |
|---|---|
| Pure black (#000000) backgrounds | Causes halation / visual vibration on OLED; use dark grey |
| Pure white (#ffffff) text on dark | Often too harsh; use near-white (e.g., #f0f0f3) |
| Using 6+ accent colors | Creates visual chaos; stick to 1–2 brand hues |
| Low-contrast muted text | Common WCAG AA failure; check every grey |
| Inconsistent semantic colors | red for success and danger — confuses users |
| Font sizes < 12 px | Unreadable on high pixel-density screens |

