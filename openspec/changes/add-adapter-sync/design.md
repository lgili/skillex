## Context

Os adapters já são detectados e persistidos, mas ainda não possuem uma operação concreta para materializar skills nas estruturas esperadas por cada agente. Os formatos e caminhos variam entre ferramentas, então a sincronização precisa ser adapter-aware.

## Goals / Non-Goals

- Goals:
  - Fazer o CLI produzir arquivos consumíveis pelos agentes suportados
  - Evitar sobrescrever conteúdo manual do usuário em arquivos compartilhados
  - Manter a sincronização explícita e previsível
- Non-Goals:
  - Implementar sync automático em toda instalação nesta mudança
  - Resolver import/include nativo entre arquivos de instruções de cada agente
  - Cobrir agentes fora de `codex`, `copilot`, `cline` e `cursor`

## Decisions

- Decision: introduzir `askill sync` como comando explícito
  - Why: evita modificar arquivos do workspace de forma implícita após cada `install`, `update` ou `remove`

- Decision: usar bloco gerenciado em arquivos compartilhados (`AGENTS.md`, `.github/copilot-instructions.md`)
  - Why: preserva conteúdo manual já existente

- Decision: usar arquivo dedicado e inteiramente gerenciado para Cline e Cursor
  - Why: os formatos oficiais já são baseados em arquivos de regras versionados e permitem ownership claro do arquivo gerado

- Decision: remover frontmatter das skills ao compor o conteúdo sincronizado
  - Why: os arquivos de destino não necessariamente interpretam frontmatter da mesma forma que o catálogo de skills

## Risks / Trade-offs

- Blocos gerenciados em `AGENTS.md` e `copilot-instructions.md` podem crescer demais
  - Mitigação: consolidar com cabeçalhos curtos e sem duplicar manifesto técnico

- Cursor usa MDC com metadados próprios, o que torna a renderização mais sensível ao formato
  - Mitigação: gerar um arquivo único com frontmatter mínimo e conteúdo markdown consolidado

## Migration Plan

1. Adicionar infraestrutura de renderização consolidada
2. Adicionar sync por adapter
3. Persistir metadados de sync no lockfile
4. Atualizar status e documentação

## Open Questions

- Devemos no futuro adicionar `--all-detected` além de `--adapter`?
- Devemos oferecer `--write false` para preview do sync em uma etapa posterior?
