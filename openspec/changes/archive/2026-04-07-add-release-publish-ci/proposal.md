## Why

O projeto já está funcional como CLI, mas ainda não possui um fluxo de distribuição oficial. Sem isso, o usuário não consegue instalar a ferramenta de forma consistente via npm nem o mantenedor consegue publicar novas versões com segurança e repetibilidade.

## What Changes

- Ajustar o pacote para publicação como `@lgili/askill`
- Configurar o repositório GitHub `lgili/askill` como remoto principal
- Adicionar workflow de GitHub Actions para publicar no npm quando uma tag de versão for criada
- Validar o pacote no CI antes da publicação
- Documentar o fluxo de release e os segredos necessários

## Impact

- Affected specs: `release-publishing`
- Affected code: `package.json`, `.github/workflows/*`, `README.md`, configuração git do repositório
