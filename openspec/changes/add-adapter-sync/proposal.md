## Why

O CLI já gerencia o catálogo local e detecta adapters, mas ainda não sincroniza as skills instaladas com os arquivos efetivamente lidos por cada agente. Sem isso, a instalação fica incompleta para uso real no workspace.

## What Changes

- Adicionar o comando `askill sync`
- Sincronizar skills instaladas com o arquivo de instruções esperado por cada adapter suportado
- Preservar conteúdo manual do usuário em arquivos compartilhados através de blocos gerenciados
- Registrar metadados de sincronização no lockfile local
- Exibir o estado de sincronização em `askill status`

## Impact

- Affected specs: `adapter-sync`
- Affected code: `src/cli.js`, `src/install.js`, `src/adapters.js`, novos módulos de sync/render e testes
