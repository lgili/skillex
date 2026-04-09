# Design Principles

> Reference for: ux-ui-pro
> Load when: Any design decision involving layout, visual hierarchy, or clarity

## The Core Principles

### 1. Visual Hierarchy
Guide the user's eye by varying size, weight, color, and position. The most important element on a screen should demand the most visual attention.

- One primary action per view (the thing the user should do next).
- Use size contrast aggressively: headings 2–3× larger than body text.
- High-contrast items are perceived as more important — use accent color sparingly.
- Place the most critical content in the top-left quadrant (F-pattern reading).

### 2. Proximity
Group related items close together; separate unrelated items with whitespace.

- Labels sit immediately above or beside their inputs — never separated by unrelated content.
- Cards group all information about one entity; leave clear gutters between cards.
- A gap of 24–32 px between sections, 8–12 px within a section.

### 3. Alignment
Every element on screen should be aligned to an invisible grid. Misalignment creates visual noise.

- Use a 4 px or 8 px base grid for all spacing decisions.
- Left-align body text and labels by default; center-align short headings or hero text only.
- Align icon baselines to the text baseline they accompany.

### 4. Contrast & Differentiation
Contrast makes things findable. Apply it to color, size, weight, and shape.

- Text on backgrounds: WCAG AA minimum 4.5:1 (body), 3:1 (large text ≥ 18 pt or 14 pt bold).
- UI components (borders, focus rings): 3:1 against adjacent color.
- Use contrast to show state changes: hover, active, disabled, selected.

### 5. Whitespace (Negative Space)
Whitespace is not empty — it is breathing room that improves readability and focus.

- Double the whitespace you think you need, then halve it if it feels too sparse.
- Padding inside cards/panels: 16–24 px minimum.
- Line-height for body text: 1.5–1.6×; for headings: 1.1–1.3×.

### 6. Consistency
Same pattern, same appearance. Users build mental models — breaking the pattern costs them cognitive effort.

- Use design tokens. Never hardcode hex values inline.
- All primary buttons look identical across the product.
- Destructive actions always use the danger color; success actions always use the success color.

### 7. Feedback & Affordance
Every interaction must give feedback. Every interactive element must look interactive.

- Buttons: visible hover + active states. Never flat+unstyled links masquerading as buttons.
- Loading: show a spinner or skeleton immediately (< 100 ms); never a blank screen.
- Form validation: show errors inline next to the field, not only in a top banner.
- Toast / snackbar: confirm destructive or async actions completed successfully.

### 8. Progressive Disclosure
Show only what the user needs now. Reveal complexity on demand.

- Advanced settings behind a "More options" toggle or secondary page.
- Long lists behind "Show all" or pagination; default to 5–10 items.
- Wizard / multi-step flows: show only the current step; breadcrumbs for orientation.

## Anti-Patterns

| Anti-Pattern | Problem | Fix |
|---|---|---|
| Wall of text | Overwhelming, no structure | Use headings, bullets, and spacing |
| Competing CTAs | User doesn't know what to do | One primary action per view |
| Icon-only navigation | Ambiguous without labels | Always pair icons with text labels (or tooltip) |
| Color-coded state with no label | Inaccessible to color-blind users | Add icon or text alongside color |
| Micro-font sizes (< 12 px) | Illegible, especially on mobile | Body text ≥ 14 px; prefer 15–16 px |
| Infinite nested modals | Disorienting | Max 1 modal layer; use full pages for complex flows |
| Disabled buttons with no explanation | Frustrating | Either explain why it's disabled or hide it |

