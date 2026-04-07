## Why

O CLI atual cobre o fluxo inicial de listar e instalar skills remotas, mas ainda não cobre o ciclo completo de gerenciamento local nem prepara a base para integração por agente. Isso limita a utilidade real da lib para uso diário e para distribuição via `npx`.

## What Changes

- Adicionar `askill search` para filtrar skills remotas por id, nome, descrição, tags e compatibilidade
- Adicionar `askill remove <skill-id>` para remover skills instaladas e atualizar o lockfile local
- Adicionar `askill update` para sincronizar skills instaladas com versões mais recentes do catálogo remoto
- Adicionar detecção e persistência de adapter de agente via `askill init`
- Definir uma arquitetura de adapters extensível para `codex`, `copilot`, `cline` e `cursor`
- Preparar a base para futura injeção de contexto sem acoplar essa primeira entrega a todos os formatos finais

## Impact

- Affected specs: `skill-management-cli`
- Affected code: `src/cli.js`, `src/install.js`, `src/catalog.js`, novos módulos de adapters e testes
