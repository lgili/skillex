## Why

O nome atual `askill` ficou provisório e também já carregava decisões antigas, como publicação scoped em `@lgili/askill`. O objetivo agora é posicionar a biblioteca como produto com nome próprio, publicável como pacote unscoped e sem depender do prefixo do mantenedor.

Além do nome do pacote, o projeto ainda usa `askill` em comandos, documentação, metadata do repositório, blocos gerenciados de sync e nomes de arquivos gerados. Sem um rename coordenado, a experiência fica inconsistente e a publicação no npm continua desalinhada com a marca desejada.

## What Changes

- Renomear o pacote npm de `@lgili/askill` para `skillex`
- Renomear o comando CLI e o binário instalável de `askill` para `skillex`
- Atualizar metadata de repositório, badges, documentação e exemplos para `lgili/skillex`
- Renomear blocos gerenciados, cabeçalhos e arquivos gerados pelo sync para o namespace `skillex`
- Atualizar o catálogo first-party e a skill `create-skills` para a nova identidade
- Atualizar as specs OpenSpec para refletir a nova nomenclatura de produto e publicação

## Impact

- Affected specs: `release-publishing`, `skill-management-cli`, `adapter-sync`, `repo-skills-catalog`
- Affected code: `package.json`, `bin/`, `src/`, `.github/workflows/`, `README.md`, `catalog.json`, `skills/create-skills/`, `test/`, `openspec/specs/`
