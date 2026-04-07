## Context

O nome unscoped `askill` já está ocupado no npm, então a publicação precisa usar escopo. O repositório GitHub alvo informado pelo usuário é `lgili/askill`, e a automação desejada é publicar no npm sempre que uma tag de versão for criada.

## Goals / Non-Goals

- Goals:
  - Tornar a instalação oficial previsível e automatizada
  - Garantir que tags de release publiquem apenas pacotes validados
  - Alinhar nome do pacote npm, repositório GitHub e documentação
- Non-Goals:
  - Publicar para múltiplos registries
  - Criar changelog automatizado nesta mudança
  - Implementar versionamento automático

## Decisions

- Decision: usar pacote scoped `@lgili/askill`
  - Why: o nome `askill` sem escopo já existe no npm

- Decision: usar GitHub Actions com gatilho em tags `v*`
  - Why: fluxo simples, auditável e comum para CLIs npm

- Decision: separar CI de testes e workflow de release
  - Why: mantém responsabilidades claras e facilita debug

## Risks / Trade-offs

- Publicação depende de `NPM_TOKEN` configurado no GitHub
  - Mitigação: documentar claramente o secret necessário

- Push inicial pode falhar por autenticação local ausente
  - Mitigação: preparar commit e remoto; reportar claramente se o push falhar

## Migration Plan

1. Ajustar nome do pacote e documentação
2. Adicionar workflows de CI e release
3. Configurar remoto git
4. Criar commit inicial
5. Tentar push para `lgili/askill`
