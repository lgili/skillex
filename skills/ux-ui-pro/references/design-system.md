# Design System

> Reference for: ux-ui-pro
> Load when: Establishing or extending tokens, spacing scale, or component inventory

## What Is a Design System?

A design system is the single source of truth that combines **design tokens** (variables), **component library** (coded UI building blocks), and **documentation** (usage rules).

## Design Tokens

### Token Naming Convention

Use a three-tier naming scheme: `category-role-variant`

```
--color-surface-base
--color-surface-elevated
--color-text-primary
--color-text-muted
--color-accent-default
--color-accent-hover
--color-danger-default
--color-danger-soft
--space-1   → 4px
--space-2   → 8px
--space-3   → 12px
--space-4   → 16px
--space-6   → 24px
--space-8   → 32px
--radius-sm → 6px
--radius-md → 10px
--radius-lg → 16px
--radius-xl → 24px
--shadow-sm
--shadow-md
--shadow-lg
--font-sans
--font-mono
--text-xs   → 12px
--text-sm   → 14px
--text-base → 16px
--text-lg   → 18px
--text-xl   → 20px
--text-2xl  → 24px
--text-3xl  → 30px
```

### Spacing Scale (4 px base)

| Token | Value | Common use |
|---|---|---|
| `--space-1` | 4 px | Icon gaps, tight insets |
| `--space-2` | 8 px | Within-component gaps |
| `--space-3` | 12 px | Field padding, chip insets |
| `--space-4` | 16 px | Card padding, section gap |
| `--space-6` | 24 px | Between cards, panel padding |
| `--space-8` | 32 px | Section separation |
| `--space-12` | 48 px | Hero/feature padding |
| `--space-16` | 64 px | Page-level vertical rhythm |

### Shadow Scale

```css
--shadow-sm:  0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.08);
--shadow-md:  0 4px 12px rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.10);
--shadow-lg:  0 8px 30px rgba(0,0,0,0.20), 0 4px 8px rgba(0,0,0,0.12);
--shadow-xl:  0 20px 60px rgba(0,0,0,0.25);
```

## Component Inventory

A minimal component library should cover:

| Category | Components |
|---|---|
| **Actions** | Button (primary, secondary, ghost, danger, icon-only), FAB |
| **Inputs** | Text input, Textarea, Select, Checkbox, Radio, Toggle/Switch, Slider, Date picker |
| **Feedback** | Toast/Snackbar, Alert banner, Progress bar, Skeleton loader, Spinner |
| **Overlay** | Modal/Dialog, Drawer/Sheet, Tooltip, Popover, Dropdown menu |
| **Navigation** | Top nav, Sidebar nav, Tabs, Breadcrumbs, Pagination, Stepper |
| **Data display** | Card, Table, List, Badge/Chip, Tag, Avatar, Stat card |
| **Layout** | Grid, Flex container, Divider, Spacer |

## Component Documentation Template

Each component should document:

```
## ButtonPrimary

**Purpose:** Main call-to-action; one per view.

**Props / Variants:** size (sm | md | lg), loading, disabled, iconLeft, iconRight

**States:** default → hover → focus → active → disabled → loading

**Accessibility:** role="button", keyboard: Enter + Space, aria-busy when loading

**Usage rules:**
- Use only ONE per page / card.
- Never use for navigation — use <a> instead.
- Destructive actions → use ButtonDanger.

**Token dependencies:** --color-accent-default, --color-accent-hover, --radius-md, --space-3
```

## File Organization (CSS/Tailwind)

```
tokens/
  colors.css
  spacing.css
  typography.css
  shadows.css
  radii.css
components/
  button.css
  input.css
  card.css
  modal.css
  ...
base/
  reset.css
  typography.css       ← sets body font, headings
  layout.css           ← page shell, grid
utilities/
  sr-only.css
  truncate.css
```

## When to Add a New Token

- Only add a token if the value is reused in ≥ 2 components.
- Never hardcode a hex value (or px value) inline — always reference a token.
- If no matching token exists, discuss with the team before adding; prefer mapping to the closest existing token first.

## Anti-Patterns

| Anti-Pattern | Fix |
|---|---|
| Hardcoded hex values in components | Use tokens |
| Duplicate components with minor variations | Parameterize with props/variants |
| Missing disabled/error states in component | Document all states before shipping |
| No spacing scale (arbitrary px values everywhere) | Adopt a 4 px base grid |
| Component library with no usage rules | Write a one-line "when NOT to use" per component |

