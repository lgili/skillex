# Mobile & Responsive Design

> Reference for: ux-ui-pro
> Load when: Responsive layouts, breakpoints, touch targets, or fluid grids

## Mobile-First Principle

Always design and write CSS for the smallest viewport first, then use `min-width` media queries to progressively enhance for larger screens.

```css
/* ✅ Mobile-first: base = mobile, enhance upward */
.card-grid {
  display: grid;
  grid-template-columns: 1fr;         /* 1 col on mobile */
  gap: var(--space-4);
}
@media (min-width: 640px) {
  .card-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (min-width: 1024px) {
  .card-grid { grid-template-columns: repeat(3, 1fr); }
}

/* ❌ Desktop-first with overrides — avoid */
.card-grid {
  grid-template-columns: repeat(3, 1fr);
}
@media (max-width: 1023px) { .card-grid { grid-template-columns: repeat(2,1fr); } }
@media (max-width: 639px)  { .card-grid { grid-template-columns: 1fr; } }
```

## Breakpoint System

| Name | Min-width | Typical devices |
|---|---|---|
| `sm` | 640 px | Large phones (landscape) |
| `md` | 768 px | Tablets (portrait) |
| `lg` | 1024 px | Tablets (landscape), small laptops |
| `xl` | 1280 px | Desktops |
| `2xl` | 1536 px | Large monitors |

Test at: **320 px** (smallest phones), **375 px** (iPhone SE), **390 px** (iPhone 15), **768 px**, **1024 px**, **1440 px**.

## Fluid Typography

Use `clamp()` to scale text smoothly between breakpoints without media queries:

```css
/* Body: 14px at 320px → 16px at 1280px */
font-size: clamp(0.875rem, 0.813rem + 0.313vw, 1rem);

/* Heading 1: 24px at 320px → 40px at 1280px */
font-size: clamp(1.5rem, 0.938rem + 2.813vw, 2.5rem);
```

## Touch Target Sizes

| Standard | Minimum |
|---|---|
| WCAG 2.5.5 (AAA) | 44 × 44 CSS px |
| WCAG 2.5.8 (AA, 2.2) | 24 × 24 CSS px |
| Apple HIG | 44 × 44 pt |
| Google Material | 48 × 48 dp |

**Rule:** All primary interactive elements (buttons, links, nav items, toggles) must be ≥ 44 × 44 px. Use `min-height` / `padding` to expand small visual elements without changing their appearance.

```css
.nav-icon-btn {
  width: 24px;
  height: 24px;
  /* Expand touch target with padding */
  padding: 10px;
  margin: -10px;
}
```

## Responsive Layout Patterns

### Stack → Side-by-side

```css
.layout {
  display: flex;
  flex-direction: column;        /* mobile: stacked */
  gap: var(--space-6);
}
@media (min-width: 768px) {
  .layout {
    flex-direction: row;         /* tablet+: side by side */
  }
  .layout .sidebar { width: 260px; flex-shrink: 0; }
  .layout .main { flex: 1; min-width: 0; }
}
```

### Responsive Navigation

```css
/* Mobile: hide nav, show hamburger */
.nav-links { display: none; }
.hamburger-btn { display: flex; }

@media (min-width: 768px) {
  .nav-links { display: flex; gap: var(--space-4); }
  .hamburger-btn { display: none; }
}
```

### Responsive Table → Card Stack

For data tables on mobile, transform rows into cards:

```css
@media (max-width: 639px) {
  table, thead, tbody, tr, th, td { display: block; }
  thead { display: none; }   /* hide column headers */
  td::before {
    content: attr(data-label);   /* show label inline */
    font-weight: 600;
    margin-right: 8px;
  }
}
```

## Images & Media

```css
/* Always make images responsive */
img, video { max-width: 100%; height: auto; }

/* Responsive background images */
.hero {
  background-image: url('hero-mobile.webp');
}
@media (min-width: 768px) {
  .hero { background-image: url('hero-desktop.webp'); }
}
```

Use `<picture>` with `srcset` for art-direction or resolution switching:

```html
<picture>
  <source media="(min-width: 768px)" srcset="hero-desktop.webp">
  <img src="hero-mobile.webp" alt="Dashboard overview" width="390" height="260">
</picture>
```

## Interaction Considerations

| Desktop | Mobile equivalent |
|---|---|
| Hover to reveal | Always-visible or tap to reveal |
| Right-click context menu | Long-press (custom) or kebab / action sheet |
| Drag and drop | Tap to select, tap target to move |
| Multi-select with Shift+click | Checkbox mode |
| Tooltips on hover | Avoid; use labels or inline help instead |

## Anti-Patterns

| Anti-Pattern | Fix |
|---|---|
| Hover-only interactions | Always provide a tap/click alternative |
| Fixed-width layouts | Use fluid grids and max-width containers |
| Small tap targets (< 24 px) | Expand with padding; minimum 44 × 44 px for primary |
| Horizontal overflow on mobile | Use `overflow-x: auto` on tables; stack columns |
| Desktop-first CSS with heavy overrides | Rewrite mobile-first |
| Images without explicit width/height | Causes layout shift (CLS); always set dimensions |
| Viewport meta missing | Add `<meta name="viewport" content="width=device-width, initial-scale=1">` |

