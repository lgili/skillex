# Component Patterns

> Reference for: ux-ui-pro
> Load when: Designing or reviewing buttons, forms, cards, modals, tables, navigation

## Buttons

### Hierarchy

| Variant | Use | CSS Class Pattern |
|---|---|---|
| Primary | One per view; the main action | `.btn-primary` |
| Secondary | Supplementary actions | `.btn-secondary` |
| Ghost / Outline | Low-emphasis actions inside crowded UIs | `.btn-ghost` |
| Danger | Destructive irreversible actions | `.btn-danger` |
| Link | Navigation within text; avoid in forms | `<a>` styled as inline text |

### Button Rules

- Min size: 36 px tall (web), 44 px tall (touch/mobile).
- Min horizontal padding: 12 px; prefer 16–20 px.
- Always include `:hover`, `:focus-visible`, `:active`, and `:disabled` states.
- Disabled buttons: reduce opacity to 0.4–0.5; `cursor: not-allowed`.
- Loading state: replace label with spinner + "Loading..." (or keep label and append spinner).
- Icon-only buttons: add `aria-label`; add a tooltip on hover.

```css
/* Focus ring — visible and modern */
.btn:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
```

## Forms & Inputs

### Anatomy

```
[Label]                     ← always visible, above the input
[Input / Select / Textarea] ← clear placeholder, never replaces label
[Helper text / error msg]   ← below the input, 12 px
```

### Input Rules

- Placeholder text is NOT a label. Always render a `<label>` element.
- Field width should hint at expected input length (short = postal code, full-width = email).
- Show inline validation on blur (not on every keystroke).
- Error state: red border + error icon + short error message below.
- Success state: green checkmark after successful async validation (e.g., username availability).
- Required fields: mark with `*` and explain at top of form ("* required").

```html
<div class="field">
  <label for="email">Email address <span aria-hidden="true">*</span></label>
  <input id="email" type="email" autocomplete="email" required
         aria-describedby="email-error" />
  <p id="email-error" class="field-error" role="alert" hidden>Enter a valid email.</p>
</div>
```

## Cards

- Consistent padding: 16–24 px.
- Clear visual boundary: subtle border OR shadow, not both.
- One primary action per card (usually a link on the whole card or a single button).
- Card states: default → hover (lift shadow or tint background) → selected (accent border).
- Avoid cards-within-cards; max 1 level of nesting.

## Modals & Dialogs

- Max 1 modal layer at a time; avoid chaining modals.
- Width: 480–600 px on desktop; full-screen on mobile.
- Always include: title, close button (top-right), and a safe escape (Esc key + backdrop click).
- Trap focus inside the modal when open; return focus to the trigger on close.
- Destructive confirmation modals: require an explicit action (button click), never auto-confirm on timeout.

```html
<dialog aria-labelledby="modal-title" aria-modal="true">
  <h2 id="modal-title">Confirm deletion</h2>
  <!-- content -->
  <button autofocus>Cancel</button>
  <button class="btn-danger">Delete</button>
</dialog>
```

## Navigation

### Top Nav / Header

- Logo left, primary nav center or left, user actions right.
- Highlight the active page/section.
- Collapse to hamburger at ≤ 768 px; drawer slides in from the left.

### Sidebar Nav

- Use for apps with 5+ top-level sections.
- Group items with section headers; avoid more than 2 nesting levels.
- Collapsible to icon-only mode (64 px → 240 px); show tooltips in collapsed state.
- Active item: accent-tinted background + accent-colored left border.

### Tabs

- Use for switching between related views within the same context (not for navigation between pages).
- Max 5–6 tabs before switching to a dropdown or sidebar.
- Active tab: underline with accent color or filled background.
- Keyboard: arrow keys navigate between tabs; Enter/Space selects.

## Tables & Data Lists

- Zebra striping or row hover highlight helps scan long lists.
- Right-align numeric columns for easy comparison.
- Sticky header for tables taller than the viewport.
- Empty state: explain why the table is empty and offer an action.
- Sortable columns: show sort direction arrow; highlight sorted column.
- Pagination: show total count and current range ("1–25 of 142").

## Anti-Patterns

| Anti-Pattern | Fix |
|---|---|
| Multiple primary buttons per view | Keep exactly one primary CTA per screen |
| Placeholder-only forms (no labels) | Always render visible `<label>` elements |
| Modal without escape route | Add close button + Esc key + backdrop click |
| Navigation with 3+ nesting levels | Flatten the information architecture |
| Table with no empty state | Always display a helpful empty state |
| Cards-within-cards | Flatten; use a list or a detail panel instead |

