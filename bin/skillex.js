#!/usr/bin/env node

import { main } from "../dist/cli.js";
import { CliError } from "../dist/types.js";

main(process.argv.slice(2)).catch((error) => {
  const message =
    error instanceof CliError || error instanceof Error ? error.message : String(error);
  console.error(`Error: ${message}`);
  process.exitCode = 1;
});
