## Why

Hoje o repositório entrega a CLI `askill`, mas ainda não funciona como catálogo da própria biblioteca. Para distribuir skills first-party no mesmo repositório, precisamos definir uma estrutura versionada de `skills/` e começar com uma skill que ajude a criar novas skills no formato correto do projeto.

## What Changes

- Adicionar um catálogo first-party no próprio repositório
- Criar a estrutura `skills/<skill-id>/` com manifesto e arquivo principal da skill
- Publicar `catalog.json` na raiz para listagem e instalação remota
- Criar a primeira skill `create-skills` para scaffolding de novas skills do projeto
- Documentar o fluxo de autoria de skills dentro deste repositório

## Impact

- Affected specs: `repo-skills-catalog`
- Affected code: `catalog.json`, `skills/create-skills/**`, `README.md`
