## Why

O repositório já possui CI e publicação por tag, mas ainda não expõe o estado do projeto visualmente no README nem cria releases no GitHub com notas automáticas. Isso reduz a clareza para usuários e deixa o fluxo de release incompleto.

## What Changes

- Adicionar badges de CI e npm no README
- Gerar release automática no GitHub quando uma tag `v*` for publicada
- Usar notas automáticas de release do GitHub
- Disparar a primeira tag de release `v0.1.0`

## Impact

- Affected specs: `release-publishing`
- Affected code: `README.md`, `.github/workflows/publish.yml`, operação git de tagging
