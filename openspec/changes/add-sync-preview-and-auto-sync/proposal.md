## Why

O `sync` já escreve os arquivos finais por adapter, mas ainda não oferece uma forma segura de pré-visualizar mudanças antes da escrita e nem consegue manter esses arquivos atualizados automaticamente após `install`, `update` e `remove`. Isso deixa o fluxo funcional, porém manual demais.

## What Changes

- Adicionar modo de preview/diff para `askill sync`
- Registrar uma preferência local de `autoSync` no lockfile
- Permitir habilitar `autoSync` durante `init`
- Executar `sync` automaticamente após `install`, `update` e `remove` quando `autoSync` estiver habilitado
- Exibir a configuração de `autoSync` no `status`

## Impact

- Affected specs: `adapter-sync`
- Affected code: `src/cli.js`, `src/install.js`, `src/sync.js`, `README.md` e testes
