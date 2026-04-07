## Context

O projeto é um CLI Node distribuído por `npx` para instalação de skills a partir de um catálogo remoto no GitHub. O estado local fica em `.agent-skills/skills.json` e nas skills baixadas para `.agent-skills/<id>/`.

## Goals / Non-Goals

- Goals:
  - Cobrir o ciclo básico de gerenciamento local: buscar, instalar, atualizar e remover
  - Detectar qual agente está presente no workspace e registrar essa escolha
  - Manter a arquitetura simples e compatível com diferentes layouts de skills remotas
- Non-Goals:
  - Implementar injeção final completa para todos os agentes nesta mudança
  - Resolver versionamento semântico avançado ou dependências entre skills
  - Criar TUI interativa nesta entrega

## Decisions

- Decision: manter `.agent-skills/skills.json` como fonte de verdade local
  - Why: simplifica update/remove e evita depender de inspeção do filesystem

- Decision: representar adapters como módulos com `id`, `detect(cwd)` e `describe()`
  - Why: permite detecção simples agora e futura extensão para `inject()` sem refatoração ampla

- Decision: `update` reinstala a skill inteira a partir do catálogo remoto
  - Why: reduz complexidade no MVP e garante consistência entre manifest e arquivos

- Decision: `search` opera em memória sobre o catálogo carregado
  - Why: o catálogo inicial será pequeno o suficiente para não exigir indexação local

## Risks / Trade-offs

- Reinstalar a skill inteira em `update` pode rebaixar desempenho em catálogos grandes
  - Mitigação: introduzir checksums e diff remoto em mudança futura

- A detecção de adapter por arquivos do workspace pode ser ambígua
  - Mitigação: persistir o adapter escolhido no lockfile e permitir override por flag

## Migration Plan

1. Introduzir estrutura de adapters e persistência no lockfile
2. Implementar novos comandos sem quebrar `init`, `list`, `install` e `status`
3. Atualizar a documentação com o novo fluxo recomendado

## Open Questions

- A primeira versão deve persistir um único adapter ativo ou uma lista de adapters detectados?
- Devemos expor desde já um comando explícito `askill detect` ou manter a detecção dentro de `init`?
