#!/usr/bin/env node
// Regression guard for Portuguese strings in user-facing source.
//
// Scans src/ and ui/src/ recursively for .ts and .vue files, looking for a
// small list of common Portuguese tokens. Lines tagged with "i18n-allow:"
// are skipped. Exits with status 1 on any unannotated hit.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(new URL("./check-language.mjs", import.meta.url))).replace(/\/scripts$/, "");
const SCAN_DIRS = ["src", join("ui", "src")];

// Curated banned tokens. Keep this list short and unambiguous: each entry must
// be a Portuguese-only token that we never expect to see in English output.
const BANNED = [
  "Aguarde",
  "Instalar",
  "Instalado",
  "Instaladas",
  "Habilidades",
  "Habilidade",
  "cancelada",
  "indisponivel",
  "Buscar",
  "Explorar",
  "Confirmacao",
  "Instalacao",
  "Execucao",
  "Tempo limite",
  "Caminho invalido",
  "Caminho inseguro",
  "Falha ao sincronizar",
  "Adapter desconhecido",
  "nao define",
  "nao esta instalada",
  "nao declara",
  "Nenhuma instalacao",
  "Nenhum sync",
  "Nenhuma skill",
  "Comando .* nao existe",
  "skill instalada diretamente",
  "Agente ativo",
  "Adapters detectados",
];

const ALLOW_PATTERN = /i18n-allow:/;

const offenders = [];

function shouldScan(file) {
  if (file.endsWith(".test.ts") || file.endsWith(".test.tsx")) return false;
  return file.endsWith(".ts") || file.endsWith(".vue");
}

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    let stat;
    try {
      stat = statSync(full);
    } catch {
      continue;
    }
    if (stat.isDirectory()) {
      if (entry === "node_modules" || entry === "dist" || entry === "dist-ui" || entry === ".test-dist") {
        continue;
      }
      walk(full);
      continue;
    }
    if (!shouldScan(full)) continue;
    const text = readFileSync(full, "utf8");
    const lines = text.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (ALLOW_PATTERN.test(line)) continue;
      for (const token of BANNED) {
        const re = new RegExp(`\\b${token}\\b`);
        if (re.test(line)) {
          offenders.push({
            file: relative(ROOT, full).split(sep).join("/"),
            line: i + 1,
            token,
            preview: line.trim().slice(0, 120),
          });
        }
      }
    }
  }
}

for (const dir of SCAN_DIRS) {
  walk(join(ROOT, dir));
}

if (offenders.length === 0) {
  process.stdout.write("Language check: OK (no banned Portuguese tokens found)\n");
  process.exit(0);
}

process.stderr.write(`Language check: FAIL — ${offenders.length} hits\n`);
for (const hit of offenders) {
  process.stderr.write(`  ${hit.file}:${hit.line}  banned token "${hit.token}"\n    > ${hit.preview}\n`);
}
process.stderr.write(
  '\nFix: rewrite the line in English, OR add a "// i18n-allow: <reason>" comment when the token is intentional.\n',
);
process.exit(1);
