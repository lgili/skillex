---
name: "UX/UI Pro"
description: "Expert UI/UX designer for modern, user-friendly frontend and app interfaces. Activates when you say 'design a UI', 'improve UX', 'review my interface', 'make this more user-friendly', 'design a component', 'create a design system', 'improve accessibility', 'redesign this layout', 'choose colors', 'pick fonts', 'create a dark theme', or 'make this responsive'."
---

# UX/UI Pro

## Overview

Use this skill whenever you need expert UI/UX guidance: designing interfaces from scratch, reviewing existing layouts, choosing typography and color palettes, building reusable component patterns, enforcing accessibility standards, or establishing a design system. The goal is always a modern, polished result that feels effortless for the end user.

## Core Workflow

1. **Clarify the context.**
   - Identify the product type: web app, mobile app, marketing site, dashboard, or CLI tool.
   - Identify the target user and their primary goal on this screen.
   - Identify constraints: existing brand tokens, framework, platform (iOS/Android/web), dark / light mode expectation.

2. **Audit the current state (if redesigning).**
   - List visual problems: poor contrast, inconsistent spacing, unclear hierarchy, cluttered layout.
   - List UX problems: ambiguous labels, missing feedback, confusing flow, too many steps.
   - Prioritize issues by user impact.

3. **Apply design principles.**
   - Load `references/design-principles.md` for hierarchy, proximity, alignment, contrast, and whitespace rules.
   - Ensure one clear primary action per screen or card.
   - Use progressive disclosure: show advanced options only when needed.

4. **Establish or follow the design system.**
   - Load `references/design-system.md` for token naming, spacing scale, and component inventory conventions.
   - Reuse existing tokens (colors, radii, shadows) before inventing new ones.
   - Define missing tokens if the project has none.

5. **Choose typography and color.**
   - Load `references/typography-color.md` for pairing rules, scale, and contrast ratios.
   - Verify WCAG AA contrast (4.5:1 for body text, 3:1 for large text / UI components).
   - Use a maximum of 2 typefaces; prefer system fonts or a single variable font for performance.

6. **Design or review components.**
   - Load `references/component-patterns.md` for button, form, card, modal, nav, and table conventions.
   - Each component must have states: default, hover, focus, active, disabled, error.
   - Use consistent border-radius, shadow depth, and transition timing across all components.

7. **Ensure accessibility.**
   - Load `references/accessibility.md` for WCAG 2.2 AA checklist and ARIA patterns.
   - Every interactive element needs a visible focus ring, keyboard operability, and ARIA label when the visual label is absent.
   - Never rely on color alone to convey state.

8. **Make it responsive.**
   - Load `references/mobile-responsive.md` for breakpoint strategy, touch target sizes, and fluid layout patterns.
   - Design mobile-first: establish the smallest layout first, then progressively enhance for larger viewports.
   - Touch targets ≥ 44 × 44 px; avoid hover-only interactions on mobile.

9. **Deliver the output.**
   - Use the Output Template below as the response structure.
   - Provide concrete code (CSS/Tailwind/tokens) or annotated mockup descriptions — not vague advice.

## Reference Guide

| Topic | Reference | When to load |
|-------|-----------|--------------|
| Design Principles | `references/design-principles.md` | Any design decision involving hierarchy, layout, or visual clarity |
| Typography & Color | `references/typography-color.md` | Choosing fonts, color palettes, or verifying contrast ratios |
| Component Patterns | `references/component-patterns.md` | Designing or reviewing buttons, forms, cards, modals, tables, navs |
| Accessibility | `references/accessibility.md` | Any work where WCAG compliance, focus management, or ARIA is needed |
| Design System | `references/design-system.md` | Establishing or extending tokens, spacing scale, or component inventory |
| Mobile & Responsive | `references/mobile-responsive.md` | Responsive layouts, breakpoints, touch targets, and fluid grids |

## Constraints

### MUST DO

- Always verify WCAG AA contrast (4.5:1 body, 3:1 large text / UI components) before finalizing a color choice.
- Provide concrete output: token values, CSS snippets, Tailwind classes, or annotated component specs — not just advice.
- Define all interactive states: default, hover, focus, active, disabled, error, loading.
- Follow the spacing scale (multiples of 4 px or the project's base unit) for all padding, margin, and gap values.
- Design mobile-first; validate at 320 px, 768 px, and 1280 px minimum.
- Every destructive or irreversible action must require explicit confirmation from the user.
- Reference the active project design system tokens before introducing new ones.

### MUST NOT DO

- Do not use color alone to convey state or meaning (always pair with icon, label, or pattern).
- Do not design interactions that are only discoverable on hover (hover is not available on touch devices).
- Do not use more than 2 typeface families in a single product unless there is a strong brand reason.
- Do not create deeply nested navigation (max 3 levels); flatten where possible.
- Do not add animations with `prefers-reduced-motion: no-preference` assumed — wrap motion in the media query.
- Do not suggest layout changes without explaining the UX rationale.
- Do not generate placeholder lorem ipsum for UI copy — write intentional, context-appropriate microcopy instead.

## Output Template

When reviewing or designing, structure your response as:

```
## Summary
One-sentence description of what was designed or changed and why.

## Problems Identified (for redesign requests)
- [issue]: [user impact]

## Design Decisions
- [decision]: [rationale]

## Tokens / Variables
```css
/* or JSON / Tailwind config */
--color-primary: #...;
--spacing-base: 4px;
```

## Component Spec / Code
```html / jsx / vue / css
<!-- concrete implementation -->
```

## Accessibility Checklist
- [ ] Contrast ratio: X:1 (target ≥ 4.5:1)
- [ ] Keyboard navigable
- [ ] Focus ring visible
- [ ] ARIA labels present where needed
- [ ] No color-only state conveyance

## Responsive Notes
- Mobile (320–767 px): ...
- Tablet (768–1279 px): ...
- Desktop (1280 px+): ...
```

## References

- [WCAG 2.2 Quick Reference](https://www.w3.org/WAI/WCAG22/quickref/)
- [Nielsen Norman Group — UX Research & Guidelines](https://www.nngroup.com/)
- [Inclusive Components by Heydon Pickering](https://inclusive-components.design/)
- [Refactoring UI — Practical Design Tips](https://www.refactoringui.com/)
- [Google Material Design 3](https://m3.material.io/)
- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [Tailwind CSS Design System Conventions](https://tailwindcss.com/docs/theme)
