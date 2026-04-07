## Context

O projeto já consegue listar e instalar skills a partir de um catálogo remoto no GitHub, mas ainda não publica skills no próprio repositório. A primeira skill deve reduzir atrito de autoria e evitar deriva no formato de `skill.json`, `SKILL.md`, `agents/openai.yaml` e `catalog.json`.

## Goals / Non-Goals

- Goals:
  - Tornar este repositório um catálogo first-party utilizável pela própria CLI
  - Criar uma skill inicial focada em criar novas skills no formato correto do projeto
  - Deixar a estrutura simples e compatível com o `askill list/install`
- Non-Goals:
  - Criar múltiplas skills nesta mudança
  - Implementar validação formal completa do catálogo
  - Introduzir dependências externas para scaffold

## Decisions

- Decision: usar `catalog.json` explícito na raiz
  - Why: reduz ambiguidade e permite metadados curados para a listagem

- Decision: nomear a primeira skill como `create-skills`
  - Why: nome curto, direto e alinhado ao uso principal

- Decision: incluir um script local de scaffold em Node
  - Why: criação de arquivos estruturais é determinística e deve evitar trabalho manual repetitivo

- Decision: incluir `agents/openai.yaml`
  - Why: melhora discoverability e segue a recomendação do skill `skill-creator`

## Risks / Trade-offs

- Uma skill de autoria pode ficar detalhada demais
  - Mitigação: manter o `SKILL.md` enxuto e mover regras específicas para `references/`

- O script de scaffold pode refletir convenções que mudem depois
  - Mitigação: centralizar o template no script e manter README/catalogo alinhados

## Migration Plan

1. Criar `catalog.json`
2. Adicionar `skills/create-skills`
3. Documentar como novas skills entram no catálogo
