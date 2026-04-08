## Why

A Web UI atual do Skillex cumpriu bem o papel de MVP:

- validou a navegação local
- provou o backend local e as APIs
- cobriu catálogo, detalhe, install/remove/update/sync e source management

Mas ela foi construída como shell inline em `src/web-ui.ts`, com HTML, CSS e
JavaScript embutidos. Isso foi eficiente para validar rápido, porém começa a
limitar evolução em três frentes:

- qualidade visual e consistência de design
- manutenção do frontend conforme a UI cresce
- organização de estado, navegação e componentes

O usuário explicitamente quer uma UI mais profissional. Para esse estágio do
produto, vale migrar para um frontend real. `vue-cli` não é a escolha ideal
hoje; o padrão moderno do ecossistema Vue é `Vue 3 + Vite`.

## What Changes

- Migrar a Web UI local de shell inline para um frontend dedicado em `Vue 3`.
- Usar `Vite` como ferramenta de build e desenvolvimento da UI.
- Manter o backend local existente como bridge HTTP para o core do Skillex.
- Empacotar a UI como assets estáticos versionados e servidos pela própria CLI.
- Introduzir client-side routing para:
  - catálogo/home
  - detalhe de skill
- Estruturar a UI em componentes reutilizáveis e layout consistente.
- Atualizar build, pacote npm e documentação para incluir o novo frontend.

## Impact

- Affected specs:
  - `interactive-ui`
- Affected code:
  - `src/web-ui.ts` ou sua extração para servidor/bridge local
  - novo diretório `ui/` para frontend Vue
  - novo diretório `dist-ui/` gerado no build
  - scripts de build/test/package
  - documentação da Web UI local
