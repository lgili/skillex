## Context

O projeto já evoluiu a CLI, os adapters e o catálogo, mas a identidade continua misturada entre:

- nome do pacote: `@lgili/askill`
- comando do usuário: `askill`
- repositório: `lgili/askill`
- artefatos gerados: `askill-skills.*`

Esse acoplamento espalha o rename por várias camadas. Não é só trocar o `package.json`: o CLI exibe o nome, o motor de sync grava esse namespace em arquivos do workspace, e as specs/documentação também citam explicitamente o identificador antigo.

## Goals / Non-Goals

- Goals:
  - Fazer o produto e a CLI se apresentarem como `skillex`
  - Publicar o pacote no npm sem escopo, usando o nome `skillex`
  - Alinhar repositório, README, workflows e exemplos com a nova marca
  - Atualizar os artefatos gerados do sync para a nova identidade
- Non-Goals:
  - Manter compatibilidade permanente com o comando antigo `askill`
  - Implementar uma camada de migração automática para workspaces já sincronizados
  - Renomear o conceito de `skill` ou o formato do catálogo

## Decisions

- Decision: o nome canônico do pacote e do comando será `skillex`
  - Package: `skillex`
  - Binary: `skillex`
  - Why: simplifica instalação via `npx skillex` e remove dependência do escopo do mantenedor

- Decision: atualizar metadata do repositório para `lgili/skillex`
  - Why: o repositório já existe e isso mantém badges, homepage, issues e catálogo first-party coerentes

- Decision: renomear os artefatos gerados pelo sync
  - Examples:
    - `.clinerules/skillex-skills.md`
    - `.cursor/rules/skillex-skills.mdc`
    - `.windsurf/rules/skillex-skills.md`
    - blocos `<!-- SKILLEX:START -->`
  - Why: evita expor a marca antiga dentro dos workspaces dos usuários

- Decision: tratar o rename como breaking change sem alias permanente
  - Why: a meta do usuário é mudar o nome em todos os lugares necessários
  - Consequence: help, docs, mensagens e publish passam a usar apenas `skillex`

## Risks / Trade-offs

- Workspaces que já tenham blocos `ASKILL` ou arquivos `askill-skills.*` não serão renomeados automaticamente
  - Mitigação: manter escrita idempotente no novo formato e documentar que o primeiro `skillex sync` gera os novos arquivos

- O repositório local atual ainda está em uma pasta chamada `Skill`
  - Mitigação: isso não afeta pacote, binário ou publicação; a identidade pública fica correta mesmo sem renomear o diretório local

- Specs arquivadas antigas continuarão mencionando `askill`
  - Mitigação: atualizar apenas `openspec/specs/`, que são a verdade atual do projeto

## Migration Plan

1. Atualizar specs atuais para `skillex`
2. Renomear pacote, binário e documentação
3. Ajustar sync e arquivos gerados
4. Atualizar catálogo first-party e skill scaffold
5. Validar testes, empacotamento e publicação

## Open Questions

- Devemos manter um binário secundário `askill` por uma versão para transição? Nesta mudança, a proposta é não manter.
