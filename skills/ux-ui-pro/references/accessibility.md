# Accessibility

> Reference for: ux-ui-pro
> Load when: Any UI work — accessibility is not optional

## WCAG 2.2 AA — Quick Checklist

### Perceivable
- [ ] Text contrast ≥ 4.5:1 (body), ≥ 3:1 (large text, UI components).
- [ ] Images have meaningful `alt` text; decorative images use `alt=""`.
- [ ] Color is never the sole indicator of meaning or state.
- [ ] Video/audio has captions; audio-only has a transcript.
- [ ] Content reflows without horizontal scroll at 320 px viewport width.
- [ ] Text can be resized to 200% without loss of content or functionality.

### Operable
- [ ] All functionality is reachable and operable by keyboard alone.
- [ ] No keyboard trap (focus can always move in and out of any component).
- [ ] Skip navigation link at the top of the page (visible on focus).
- [ ] Focus indicator is clearly visible (`outline: 2px` minimum; never `outline: none` without a replacement).
- [ ] Sufficient time is given for time-limited interactions (or warnings are shown).
- [ ] No flashing content > 3 Hz (seizure risk).
- [ ] Touch targets ≥ 44 × 44 CSS px (WCAG 2.5.5 AAA; 24 × 24 is the AA minimum).

### Understandable
- [ ] `<html lang="en">` (or correct language code) is set.
- [ ] Labels are descriptive; avoid "Click here" or "Read more" without context.
- [ ] Error messages identify the field and describe how to fix the error.
- [ ] Autocomplete attributes are used on personal data fields.

### Robust
- [ ] HTML is valid and uses semantic elements (`<nav>`, `<main>`, `<header>`, `<button>`, `<a>`).
- [ ] ARIA is used to supplement — not replace — native HTML semantics.
- [ ] Interactive components work with assistive technologies (screen readers).

## Semantic HTML

Prefer native elements over ARIA whenever possible:

```html
<!-- ✅ Use native semantics -->
<button type="button">Save</button>
<a href="/profile">View profile</a>
<nav aria-label="Main navigation">...</nav>
<main>...</main>
<section aria-labelledby="section-heading">...</section>

<!-- ❌ Avoid ARIA-heavy DIV soup -->
<div role="button" tabindex="0" onclick="save()">Save</div>
```

## ARIA Patterns

### Labeling

```html
<!-- Icon-only button -->
<button aria-label="Close dialog">
  <svg aria-hidden="true">...</svg>
</button>

<!-- Input with visible label -->
<label for="search">Search skills</label>
<input id="search" type="search" />

<!-- Input with invisible label (search bars) -->
<input type="search" aria-label="Search skills" />
```

### Live Regions (Toast / Status)

```html
<!-- Polite: announced after current task finishes -->
<div aria-live="polite" aria-atomic="true" class="sr-only" id="toast-region"></div>

<!-- Assertive: interrupts immediately (use sparingly) -->
<div aria-live="assertive" aria-atomic="true"></div>
```

### Focus Management

- When a modal opens: move focus to the first focusable element inside (or `autofocus`).
- When a modal closes: return focus to the element that triggered it.
- When route changes (SPA): move focus to the new page heading or `<main>`.

```js
// Trap focus inside modal
const focusableSelectors = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
const focusable = modal.querySelectorAll(focusableSelectors);
const first = focusable[0];
const last = focusable[focusable.length - 1];

modal.addEventListener('keydown', (e) => {
  if (e.key === 'Tab') {
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault(); first.focus();
    }
  }
  if (e.key === 'Escape') closeModal();
});
```

## Motion & Animation

```css
/* Always wrap animations in this query */
@media (prefers-reduced-motion: no-preference) {
  .card { transition: transform 200ms ease, box-shadow 200ms ease; }
  .fade-enter { animation: fadeIn 150ms ease; }
}

/* Instant fallback for users who prefer reduced motion */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

## Screen Reader Only Utility

```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0,0,0,0);
  white-space: nowrap;
  border: 0;
}
```

## Anti-Patterns

| Anti-Pattern | Fix |
|---|---|
| `outline: none` with no replacement | Use `outline: 2px solid var(--accent); outline-offset: 2px` |
| `<div onclick>` for interactive elements | Use `<button>` or `<a>` |
| Color-only error indicators | Add icon + text label |
| Missing `alt` on meaningful images | Write descriptive alt text |
| Auto-playing video/audio | Require user consent; provide pause control |
| Tiny touch targets (< 24 px) | Minimum 44 × 44 px for primary actions |
| Placeholder as label | Always render a visible `<label>` |

