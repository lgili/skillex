## Context

O estado local do Skillex fica em `.agent-skills/skills.json` e hoje persiste apenas um catálogo remoto por workspace por meio do campo `catalog`. O CLI até aceita `--repo` como override por comando, mas isso substitui a fonte ativa temporariamente em vez de agregar várias fontes configuradas.

O repositório já publica um catálogo first-party em `lgili/skillex`, que é o melhor ponto de partida para novos usuários. A mudança precisa permitir esse default sem impedir que cada workspace adicione fontes extras depois.

## Goals / Non-Goals

- Goals:
  - Permitir múltiplos catálogos por workspace com ordem estável e metadados de origem
  - Reduzir atrito de onboarding inicializando o catálogo oficial por padrão
  - Manter compatibilidade com lockfiles existentes e com o override pontual via `--repo`
  - Tornar `list`, `search` e `install` determinísticos diante de múltiplas fontes
- Non-Goals:
  - Resolver priorização automática entre skills com ids duplicados em fontes diferentes
  - Sincronizar ou deduplicar remotamente catálogos entre si
  - Alterar o fluxo de instalação direta via `owner/repo[@ref]`

## Decisions

- Decision: substituir `catalog` por `sources[]` como fonte de verdade persistida
  - Why: o lockfile precisa representar mais de uma origem ao mesmo tempo e preservar ordem, `ref` e rótulo opcional

- Decision: tratar `lgili/skillex@main` como source inicial padrão apenas quando o usuário não informar `--repo` nem tiver fonte já configurada
  - Why: reduz atrito no primeiro uso sem impedir que usuários avancem para catálogos próprios quando quiserem

- Decision: manter `--repo` como override de escopo único para `list`, `search` e `install`
  - Why: preserva compatibilidade com o comportamento atual e oferece escape hatch para ambiguidade ou inspeção pontual

- Decision: agregar catálogos em memória e anexar metadados de origem a cada skill retornado internamente
  - Why: o volume esperado de skills continua pequeno e evita introduzir indexação local ou novo cache complexo nesta mudança

- Decision: falhar `install <skill-id>` quando o id existir em mais de um source configurado
  - Why: escolher automaticamente uma fonte tornaria o resultado implícito e difícil de confiar; o usuário deve desambiguar explicitamente

- Decision: migrar lockfiles legados de forma transparente na primeira escrita
  - Why: evita quebra para workspaces existentes e reduz suporte manual

## Risks / Trade-offs

- Agregar múltiplas fontes aumenta latência em `list` e `search`
  - Mitigação: reutilizar o cache existente por source e manter overrides com `--repo` para consultas pontuais

- Duplicidade de ids entre catálogos pode introduzir atrito em `install`
  - Mitigação: erro explícito com a lista de fontes conflitantes e instrução para usar `--repo`

- A migração do lockfile pode quebrar integrações que dependam do campo antigo `catalog`
  - Mitigação: ler o formato legado durante a transição e documentar o novo formato no README

## Migration Plan

1. Ler lockfiles legados com `catalog` e convertê-los para `sources[]` em memória
2. Persistir apenas o formato novo nas próximas operações de escrita
3. Fazer `init` popular `sources[]` com `lgili/skillex@main` por padrão
4. Adicionar a superfície de CLI para gerenciar sources e consumir a agregação
5. Atualizar documentação e exemplos para o fluxo padrão sem `--repo`

## Open Questions

- O comando `source add` deve rejeitar duplicatas apenas por `repo`, ou por `repo + ref`?
- O output de `list` deve ser sempre agrupado por source, mesmo em `--json`, ou apenas no formato humano?