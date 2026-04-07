/**
 * Structured output helpers for the Skillex CLI.
 *
 * Applies ANSI colors when stdout/stderr are TTYs and NO_COLOR is unset.
 * Provides a verbose flag that gates debug-level output.
 */

let verboseEnabled = false;

// ---------------------------------------------------------------------------
// Color support detection
// ---------------------------------------------------------------------------

function colorEnabled(stream: NodeJS.WriteStream): boolean {
  return Boolean(stream.isTTY) && process.env.NO_COLOR === undefined;
}

function applyColor(ansiCode: string, text: string, stream: NodeJS.WriteStream): string {
  return colorEnabled(stream) ? `\x1b[${ansiCode}m${text}\x1b[0m` : text;
}

// ---------------------------------------------------------------------------
// Verbose flag
// ---------------------------------------------------------------------------

/**
 * Enables or disables verbose (debug) output for the current process.
 *
 * @param value - `true` to enable verbose output.
 */
export function setVerbose(value: boolean): void {
  verboseEnabled = value;
}

/**
 * Returns whether verbose mode is currently active.
 */
export function isVerbose(): boolean {
  return verboseEnabled;
}

// ---------------------------------------------------------------------------
// Output helpers
// ---------------------------------------------------------------------------

/**
 * Prints a green success message to stdout.
 *
 * @param message - Message to display.
 */
export function success(message: string): void {
  console.log(applyColor("32", message, process.stdout));
}

/**
 * Prints a plain informational message to stdout.
 *
 * @param message - Message to display.
 */
export function info(message: string): void {
  console.log(message);
}

/**
 * Prints a yellow warning to stderr.
 *
 * @param message - Warning message.
 */
export function warn(message: string): void {
  console.warn(applyColor("33", `Warning: ${message}`, process.stderr));
}

/**
 * Prints a red error message to stderr.
 *
 * @param message - Error message.
 */
export function error(message: string): void {
  console.error(applyColor("31", message, process.stderr));
}

/**
 * Prints a dim debug message to stderr when verbose mode is active.
 *
 * @param message - Debug message.
 */
export function debug(message: string): void {
  if (verboseEnabled) {
    process.stderr.write(applyColor("2", `[debug] ${message}`, process.stderr) + "\n");
  }
}
