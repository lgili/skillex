## Context

O projeto já possui `askill sync`, escrita por adapter e persistência do último sync. Falta agora reduzir risco operacional e automatizar o fluxo pós-instalação.

## Goals / Non-Goals

- Goals:
  - Permitir inspeção do resultado do sync antes de escrever em disco
  - Permitir que o usuário mantenha os arquivos do agente atualizados automaticamente
  - Reaproveitar ao máximo a infraestrutura já criada de renderização e sync
- Non-Goals:
  - Implementar preview interativo
  - Adicionar sistema de configuração genérico para todas as preferências futuras
  - Executar sync automático por múltiplos adapters ao mesmo tempo

## Decisions

- Decision: usar `askill sync --dry-run` para preview sem escrita
  - Why: semântica simples e comum em CLIs

- Decision: incluir diff textual unificado no preview
  - Why: mostrar apenas o arquivo final inteiro escala mal quando o conteúdo cresce

- Decision: persistir `autoSync` dentro do lockfile local
  - Why: a preferência é específica do workspace e deve acompanhar o estado local

- Decision: auto-sync reutiliza o adapter ativo do lockfile
  - Why: mantém previsibilidade e evita side effects em arquivos de outros agentes

## Risks / Trade-offs

- Diff textual simples pode não ser minimalista
  - Mitigação: priorizar legibilidade e estabilidade sobre algoritmo sofisticado nesta fase

- Auto-sync após `remove` pode surpreender se o usuário não lembrar da configuração
  - Mitigação: exibir `autoSync` no `status` e no output dos comandos quando aplicado

## Migration Plan

1. Introduzir `settings.autoSync` com default `false`
2. Adicionar preview/diff em `sync`
3. Integrar auto-sync às mutações locais
4. Atualizar documentação
