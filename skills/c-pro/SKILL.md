---
name: c-pro
description: Modern C specialist for designing, implementing, reviewing, and modernizing performance-sensitive C across libraries, CLIs, services, embedded firmware, and systems code. Use when working with `.c`, `.h`, `Makefile`, `CMakeLists.txt`, `meson.build`, `compile_commands.json`, Unity / cmocka / Check tests, or requests involving memory management, undefined behavior, concurrency, sanitizers (ASan/UBSan/TSan), static analysis (clang-tidy, cppcheck, splint), build systems (Make / CMake / Meson / autotools), or legacy C migration. Trigger for asks like "c pro", "modernize c", "refactor c", "makefile", "cmake c", "meson", "asan", "ubsan", "valgrind", "memory leak in c", "undefined behavior", "static analysis c", or "embedded c".
paths: "**/*.c, **/*.h, Makefile, CMakeLists.txt, meson.build, compile_commands.json"
---

# C Pro

## Overview

Use this skill to deliver modern, defensive C with explicit ownership, target-based
builds, sanitizer-clean test runs, and performance decisions backed by toolchain
evidence.

Default stance:

- Treat undefined behavior as a real defect, not a stylistic choice.
- Make ownership, lifetimes, and error contracts explicit at every boundary.
- Use the standard library and POSIX before introducing third-party abstractions.
- Treat compiler warnings, sanitizer findings, and static-analyzer reports as defects.
- Prefer simple, readable C99/C11 over clever macros or pointer-arithmetic tricks.

## Core Workflow

1. Inspect toolchain and runtime constraints.
   - Confirm compiler family (gcc / clang / MSVC / armcc / iccavr), C standard
     (C99 / C11 / C17 / C23), target platform, and freestanding vs hosted.
   - Read `Makefile`, `CMakeLists.txt`, `meson.build`, and `compile_commands.json`
     before touching the build.
   - Identify whether the code is a library (with public headers), a CLI, a
     long-running service, or embedded firmware with hard memory / timing limits.

2. Design ownership and error contracts before writing logic.
   - For every allocation, document who frees it and when.
   - Decide error-reporting style for the subsystem: `errno`, return-code enum,
     out-parameter, or sentinel value — and stick to it.
   - Mark public headers with explicit ownership comments
     (e.g. `/* Ownership transfers to caller. Free with foo_destroy(). */`).
   - Prefer opaque structs (`typedef struct foo foo_t;`) for ABI-stable libraries.

3. Implement with strict, defensive idioms.
   - Always check return values from `malloc`, `realloc`, `fopen`, `read`, `write`,
     `pthread_*`, and any system call.
   - Use `size_t` for object sizes, `ssize_t` for signed counts, `ptrdiff_t` for
     pointer differences. Never rely on implicit `int` promotions.
   - Prefer `snprintf` / `strncpy` with explicit bounds; never use `strcpy`,
     `strcat`, `gets`, or `sprintf`.
   - Initialize all locals (or use `= {0}` for aggregates).
   - Use `static` for translation-unit-local helpers; use `extern` only for
     intentionally exported symbols.

4. Verify with the toolchain stack.
   - Compile with `-Wall -Wextra -Wpedantic -Werror` (or the platform equivalent).
   - Run a debug build under AddressSanitizer + UndefinedBehaviorSanitizer for
     test suites; ThreadSanitizer when concurrency is involved.
   - Run `clang-tidy` and/or `cppcheck` on the changed files.
   - Use `valgrind --tool=memcheck` (or `--tool=helgrind` for races) when
     sanitizers are unavailable on the target.
   - Add or update Unity / cmocka / Check tests for changed behavior.

5. Optimize from evidence, not intuition.
   - Profile with `perf`, `callgrind`, or platform tooling before reworking
     algorithms or data layout.
   - Improve cache locality (struct ordering, hot/cold split, false-sharing) and
     allocation patterns before low-value micro-optimizations.
   - Validate performance claims with reproducible benchmarks
     (`google-benchmark`, `nanobench`, or a hand-rolled timed loop with
     `clock_gettime(CLOCK_MONOTONIC)`).

6. Deliver with explicit migration notes.
   - Call out ABI changes (struct layout, enum reordering, function-signature
     drift) — even minor versions can break linkers.
   - Note any new compiler / standard requirement.
   - Prefer incremental modernization for legacy code; do not destabilize a
     working subsystem for stylistic reasons.

## Reference Guide

| Topic | Reference | Load when |
|---|---|---|
| Architecture & API design | `references/architecture-and-design.md` | Designing public headers, ABI boundaries, opaque types, error-handling style |
| Modern C (C11/C17/C23) | `references/modern-c.md` | `_Generic`, `_Static_assert`, atomics, `_Thread_local`, designated initializers, VLA tradeoffs |
| Memory & performance | `references/memory-performance.md` | Allocators, custom arenas, alignment, cache layout, SIMD basics |
| Concurrency | `references/concurrency.md` | `pthreads`, C11 `<threads.h>`, atomics, lock-free patterns, cancellation |
| Build tooling | `references/build-tooling.md` | Make / CMake / Meson, sanitizer flags, `compile_commands.json`, package managers |
| Legacy modernization | `references/legacy-modernization.md` | Hand-written Makefiles, K&R-style code, macro-heavy code, raw-pointer churn |

## Bundled Scripts

| Script | Purpose | Usage |
|--------|---------|-------|
| `scripts/audit_c_project.py` | Audits a C project for build, warnings, tests, sanitizers, and tooling gaps. | `python skills/c-pro/scripts/audit_c_project.py --root .` |
| `scripts/bootstrap_c_project.py` | Scaffolds a CMake-based C project layout (library / cli / freestanding) with strict warnings, sanitizer presets, and a Unity test harness. | `python skills/c-pro/scripts/bootstrap_c_project.py --name foo --type library` |
| `scripts/run_c_quality_gates.py` | Runs configure → build → test with sanitizers + clang-tidy + cppcheck and exits non-zero on any failure. | `python skills/c-pro/scripts/run_c_quality_gates.py` |
| `scripts/scaffold_c_test_template.py` | Generates a Unity / cmocka / Check test file template for new modules. | `python skills/c-pro/scripts/scaffold_c_test_template.py --module foo --framework unity` |

## Constraints

### MUST DO

- Compile with `-Wall -Wextra -Wpedantic` at minimum; treat warnings as errors in CI.
- Check the return value of every allocation, file operation, and syscall.
- Free every allocation along every code path, including error paths
  (consider `goto cleanup;` for multi-step error unwinding — it's idiomatic in C).
- Run AddressSanitizer + UndefinedBehaviorSanitizer on test builds when the
  toolchain supports them.
- Document ownership and lifetime for every public function that returns or
  takes a pointer.
- Use `size_t` for sizes and counts; never narrow to `int` without an explicit cast.

### MUST NOT DO

- Use `gets`, `strcpy`, `strcat`, `sprintf`, or unbounded `scanf` patterns.
- Cast `malloc` return values to silence diagnostics — it hides
  forgotten `<stdlib.h>` includes.
- Mix integer types of different signedness without an explicit cast.
- Rely on implementation-defined behavior (signed-integer overflow,
  reading from uninitialized memory, dereferencing freed pointers,
  type-punning via casts that violate strict aliasing).
- Hide allocations or threading inside macros — make them visible at the
  call site.
- Ship performance claims without a profiler run or benchmark; "feels faster"
  is not evidence.

## When NOT to use this skill

Defer to a more specialized skill when the work is dominated by one of these
concerns:

- **Modern C++ migration or new C++ code** → use `cpp-pro` instead. C++ has
  RAII, references, templates, and `std::unique_ptr` that change idiom
  fundamentally.
- **Embedded power-electronics simulator code (MNA, control loops, magnetics)**
  → those have dedicated skills (`circuit-solver`, `control-loop`,
  `magnetic-components`, `solver-numerics`). C-pro covers the language;
  those cover the math.
- **Test design / coverage strategy** → `test-discipline` covers the why;
  c-pro covers the how (Unity / cmocka).
- **Security audit of an existing codebase** → `secure-defaults` for the
  threat model and patterns; c-pro for the C-specific fixes.
- **Code review of a PR** → `code-review` for the structured review process;
  c-pro for the C-specific findings.
- **Commit message or PR description** → `commit-craft`.

## Output Template

For non-trivial C tasks, provide:

1. **Toolchain & target summary** — compiler, standard, platform, hosted vs
   freestanding, allocator constraints, threading model.
2. **Ownership & error contract** — who allocates, who frees, how errors
   propagate (return code / errno / out-parameter / sentinel).
3. **Implementation notes** — key APIs, modern-C features used, any
   deliberate UB-avoidance patterns.
4. **Build & test changes** — Make / CMake / Meson updates, sanitizer
   configuration, new tests, profiler results if performance work.
5. **Risk notes** — ABI impact, behavioral migration, freestanding /
   embedded-target caveats.

## Primary References

- [cppreference C library](https://en.cppreference.com/w/c)
- [SEI CERT C Coding Standard](https://wiki.sei.cmu.edu/confluence/display/c/SEI+CERT+C+Coding+Standard)
- [GCC warning options](https://gcc.gnu.org/onlinedocs/gcc/Warning-Options.html)
- [AddressSanitizer / UBSan](https://clang.llvm.org/docs/AddressSanitizer.html)
- [CMake Documentation](https://cmake.org/cmake/help/latest/)
- [Meson Build System](https://mesonbuild.com/)
- [Unity Test Framework](http://www.throwtheswitch.org/unity)
- [Valgrind](https://valgrind.org/)
- [The C Programming Language (K&R 2nd ed.)](https://en.wikipedia.org/wiki/The_C_Programming_Language)
