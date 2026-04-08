## 1. Frontend Foundation

- [x] 1.1 Create a dedicated `ui/` frontend workspace using Vue 3 + Vite
- [x] 1.2 Add Vue Router and define routes for catalog and skill detail
- [x] 1.3 Define a lightweight visual system for spacing, color, type, cards, and actions

## 2. Local Server Integration

- [x] 2.1 Refactor the local Web UI server to serve built static assets from `dist-ui/`
- [x] 2.2 Preserve the existing local `/api/*` contract or evolve it compatibly
- [x] 2.3 Keep local token/session protection and loopback-only serving

## 3. UI Migration

- [x] 3.1 Move the catalog page from inline JS to Vue components
- [x] 3.2 Move the skill detail page from inline JS to Vue components
- [x] 3.3 Move source management, scope selection, and sync adapter selection to Vue components
- [x] 3.4 Remove the old inline HTML/CSS/JS shell from `src/web-ui.ts`

## 4. Build And Validation

- [x] 4.1 Add `build:ui` and integrate it into the package build
- [x] 4.2 Ensure the npm package includes the built frontend assets
- [x] 4.3 Add or update tests for frontend-serving integration and API-backed flows
- [x] 4.4 Update README with the new Web UI architecture and local development workflow
