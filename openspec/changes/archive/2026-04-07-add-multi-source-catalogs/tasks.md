## 1. Implementation

- [x] 1.1 Introduzir `sources[]` no lockfile e migrar o formato legado com `catalog`
- [x] 1.2 Fazer `init` criar `lgili/skillex@main` como source padrão quando nenhum repo for informado
- [x] 1.3 Adicionar os comandos `source add`, `source remove` e `source list`
- [x] 1.4 Agregar múltiplos catálogos em `list` e `search`, preservando metadados de origem
- [x] 1.5 Resolver `install <skill-id>` em qualquer source configurado e tratar colisões de ids com erro claro
- [x] 1.6 Cobrir migração, agregação multi-source, comandos `source` e casos de ambiguidade com testes automatizados
- [x] 1.7 Atualizar README, help da CLI e exemplos de onboarding para o novo fluxo padrão