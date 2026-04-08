# C Legacy Modernization

> Reference for: c-pro
> Load when: refactoring old C code (K&R, C89), replacing manual memory management, updating Makefiles or old CMake

## Modernize in Layers

Do not rewrite a legacy C codebase in one pass. Use a sequence like this:

1.  Make the current behavior observable.
2.  Stabilize the build and warnings.
3.  Add regression coverage around risky code.
4.  Modernize ownership and resource management.
5.  Improve data structures and algorithms only after correctness is stable.

## First Pass: Baseline the Repository

Capture the current state before changing behavior:

-   Compiler versions and target platforms
-   Current warning levels
-   Existing tests and their execution path
-   Sanitizer support
-   Dependencies (vendored, system-installed)
-   Public headers and binary interfaces

## Raise Safety Before Refactoring

Before large code movement:

-   Enable strict warnings (`-Wall -Wextra -Wpedantic`).
-   Fix all warnings, treating them as errors (`-Werror`).
-   Set up build configurations for sanitizers (ASan, UBSan).
-   Add regression tests for critical functionality.

If warnings are overwhelming, group them:

1.  Correctness and Undefined Behavior first (e.g., mismatched pointers, format strings).
2.  Implicit conversions and sign issues second.
3.  Style or deprecated function warnings last.

## Modernizing Memory and Resource Management

Typical migration sequence:

1.  Identify all `malloc`/`calloc` calls and their corresponding `free` calls.
2.  Wrap resource acquisition/release in `create`/`destroy` functions to enforce RAII-like patterns.
3.  Use tools like Valgrind to find memory leaks and errors.
4.  Replace magic numbers with `sizeof` and enums.
5.  Replace `char*` for byte buffers with `unsigned char*` or `uint8_t*`.

Watch for:

-   Inconsistent `malloc`/`free` patterns.
-   Re-implementations of standard library functions.
-   Integer overflows, especially in size calculations.
-   Manual pointer arithmetic where `sizeof` should be used.

## Moving From Old Build Systems

Legacy Makefiles often have global flags and implicit rules.

Prefer this modernization order:

1.  Create a `CMakeLists.txt` or a more structured `Makefile`.
2.  Define explicit targets for libraries and executables.
3.  Specify include directories and library linkage per target.
4.  Add build configurations for Debug, Release, and Sanitizers.
5.  Separate business logic into reusable libraries.

## Introducing Modern C Features Safely (C99/C11/C17)

Use modern C features where they reduce defects or complexity:

-   `<stdbool.h>` for `bool`, `true`, `false`.
-   `<stdint.h>` for fixed-width integer types (`int32_t`, `uint64_t`).
-   `snprintf` instead of `sprintf` to prevent buffer overflows.
-   Designated initializers for structs.
-   `const` and `static` wherever applicable to limit scope and mutability.

Avoid changing everything at once. Introduce new features module by module.

## High-Risk Areas

Treat these as separate workstreams with extra validation:

-   Code with heavy use of macros for control flow.
-   Custom memory allocators.
-   Signal handlers.
-   Serialization and on-disk formats.
-   Code that crosses DLL/shared-library boundaries.

## Practical Migration Checklist

-   Add tests before touching old logic.
-   Move side effects behind explicit interfaces.
-   Make ownership clear through function names (`create_*`, `destroy_*`) and documentation.
-   Break up large C files into smaller, more cohesive modules.
-   Introduce a modern build system and CI.
-   Keep each migration step small, reviewable, and reversible.

## Good Commit Shapes

Prefer commits like:

-   `build: migrate project to use cmake`
-   `test: add regression tests for protocol parser`
-   `refactor: replace manual memory management in user module with create/destroy functions`
-   `ci: add address sanitizer build configuration`

Avoid commits that mix:

-   Build system migration
-   Large API redesign
-   Algorithm changes
-   Style-only rewrites
