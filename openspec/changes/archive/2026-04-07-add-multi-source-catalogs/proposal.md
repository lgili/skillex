## Why

Hoje cada workspace do Skillex consegue apontar para apenas um catálogo remoto por vez. Isso impede um fluxo comum: começar usando as skills first-party publicadas neste repositório e, depois, combinar esse catálogo oficial com catálogos privados, de time ou pessoais no mesmo workspace.

Além disso, o onboarding ainda depende de `--repo` no `init`, mesmo quando o caso mais comum é usar o catálogo oficial do próprio projeto. O resultado é mais atrito no primeiro uso e nenhuma forma nativa de agregar múltiplas fontes em `list`, `search` e `install`.

## What Changes

- Migrar o lockfile local de um único `catalog` para uma lista ordenada de `sources[]`
- Inicializar novos workspaces com `lgili/skillex@main` como source padrão quando nenhum repo for informado
- Adicionar comandos `skillex source add`, `skillex source remove` e `skillex source list`
- Fazer `skillex list` e `skillex search` agregarem skills de todos os sources configurados por padrão
- Fazer `skillex install <skill-id>` resolver o skill em qualquer source configurado, com erro determinístico quando houver colisão de id
- Migrar lockfiles legados com `catalog` único para o novo formato sem exigir reinicialização manual

## Impact

- Affected specs: `catalog`, `install`, `skill-management-cli`
- Affected code: `src/install.ts`, `src/cli.ts`, `src/catalog.ts`, `src/types.ts`, `src/output.ts`, `README.md`, testes de instalação, catálogo e CLI