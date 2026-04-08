## Context

O Skillex já tem:

- servidor local e API local para a Web UI
- catálogo agregado multi-source
- instalação local/global
- sync por adapter e por múltiplos adapters detectados
- rotas conceituais de catálogo e detalhe

O problema agora não é regra de negócio; é arquitetura de frontend e qualidade
de interface.

## Decision

Migrar a Web UI para:

- `Vue 3`
- `Vite`
- `Vue Router`
- styling orientado a design system leve, com CSS tokenizado e possibilidade de
  Tailwind se isso realmente acelerar a produção

## Why Not `vue-cli`

`vue-cli` não é a melhor escolha para um projeto novo em 2026:

- o ecossistema Vue moderno converge para `Vite`
- `Vite` tem DX melhor e builds mais rápidos
- integração com TypeScript, HMR e assets estáticos é mais simples
- a comunidade atual, exemplos e templates modernos priorizam `create-vue`/Vite

Então a recomendação arquitetural é **não usar `vue-cli`** e sim `Vue 3 + Vite`.

## Goals

- Deixar a Web UI visualmente mais profissional e consistente.
- Tirar HTML/CSS/JS inline de `src/web-ui.ts`.
- Melhorar manutenção por meio de componentes e rotas.
- Preservar o core e a bridge local HTTP já existentes.
- Permitir iteração futura em design, filtros, cards, preview e operações sem
  transformar o backend em um arquivo monolítico.

## Non-Goals

- Não mover lógica de install/update/remove/sync para o frontend.
- Não adicionar backend remoto.
- Não mudar o modelo de segurança local com token efêmero e loopback-only.
- Não reescrever o core de catálogo, adapters ou sync.

## Architecture

### 1. Split frontend from local server

Separar as responsabilidades:

- `src/web-ui.ts` ou `src/web/server.ts`
  - sobe servidor local
  - expõe `/api/*`
  - serve assets estáticos gerados
  - injeta config mínima na página inicial
- `ui/`
  - app Vue 3
  - roteamento
  - páginas
  - componentes
  - styling

### 2. Keep the local HTTP bridge thin

O backend local continua chamando:

- `src/catalog.ts`
- `src/install.ts`
- `src/sync.ts`
- `src/adapters.ts`

O frontend nunca decide sozinho como instalar, remover ou sincronizar. Ele só
orquestra requisições para a API local.

### 3. Frontend module layout

Estrutura proposta:

- `ui/src/main.ts`
- `ui/src/App.vue`
- `ui/src/router.ts`
- `ui/src/pages/CatalogPage.vue`
- `ui/src/pages/SkillDetailPage.vue`
- `ui/src/components/layout/AppShell.vue`
- `ui/src/components/catalog/SkillCard.vue`
- `ui/src/components/catalog/CatalogToolbar.vue`
- `ui/src/components/sidebar/WorkspaceSidebar.vue`
- `ui/src/components/detail/SkillHero.vue`
- `ui/src/components/detail/SkillMetaGrid.vue`
- `ui/src/components/common/ActionButton.vue`
- `ui/src/api/client.ts`
- `ui/src/stores/ui.ts` se um store realmente for necessário
- `ui/src/styles/`

### 4. Routing model

Rotas mínimas:

- `/`
  - catálogo
- `/skills/:skillId`
  - detalhe de skill

As rotas devem preservar:

- token efêmero de sessão
- scope local/global

Isso pode ser resolvido via:

- query params mínimos, ou
- bootstrap inicial injetado no HTML e estado compartilhado de cliente

### 5. Build and packaging model

Estrutura:

- `ui/`
  - fonte Vue/Vite
- `dist-ui/`
  - build estático

Fluxo:

1. `npm run build:ui` gera `dist-ui/`
2. `npm run build` compila TypeScript do CLI e builda a UI
3. o pacote npm inclui `dist-ui/`
4. o servidor local serve `dist-ui/` em vez de strings inline

### 6. Styling strategy

O objetivo não é “ter framework”, e sim ter um sistema visual consistente.

Diretrizes:

- manter design tokens claros: cor, raio, sombra, spacing, tipografia
- reduzir CSS inline e strings grandes dentro de TypeScript
- usar layout mais autoral de devtool/knowledge browser, não “dashboard admin”
- manter responsividade real para telas menores

Tailwind é aceitável se acelerar a construção do design system. Se não, CSS
modular ou `*.css` por feature também atende bem.

### 7. API contract stability

As APIs existentes devem ser mantidas ou evoluídas de forma compatível:

- `GET /api/state`
- `GET /api/catalog`
- `GET /api/catalog/:skillId`
- `POST /api/install`
- `POST /api/remove`
- `POST /api/update`
- `POST /api/sync`
- `GET /api/sources`
- `POST /api/sources`
- `DELETE /api/sources/:repo`

Se algum endpoint precisar de refinamento para a nova UI, a mudança deve ser
incremental e coberta por testes.

## Migration Plan

### Phase 1

- criar scaffold Vue 3 + Vite
- mover layout base e rotas de catálogo/detalhe
- ligar cliente aos endpoints atuais
- manter backend local atual servindo assets

### Phase 2

- remover HTML/CSS/JS inline antigo
- ajustar build/package/npm scripts
- consolidar testes e documentação

### Phase 3

- refinar design system
- melhorar feedback visual de operações
- considerar markdown renderer mais rico e previews avançados

## Risks

### Build complexity

Adicionar um frontend real aumenta a cadeia de build.

Mitigação:

- manter build UI isolado
- usar `Vite`
- incluir `dist-ui/` como artefato estático simples

### Package bloat

Frontend pode inflar o pacote.

Mitigação:

- code-splitting básico
- dependências pequenas
- evitar bibliotecas pesadas de componente se não forem realmente úteis

### API drift

Frontend novo pode pressionar backend local a crescer de forma desorganizada.

Mitigação:

- backend continua fino
- contratos explícitos
- testes cobrindo requests reais
