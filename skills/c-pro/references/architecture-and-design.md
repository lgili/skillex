# C Architecture and Design

> Reference for: c-pro
> Load when: header design, ownership contracts, API boundaries, library layout, service structure

## Default Design Priorities

1.  Stable interfaces before clever implementations.
2.  Ownership and lifetime must be obvious from function signatures and documentation.
3.  Keep recompilation cost under control by minimizing public-header churn.
4.  Separate domain logic from transport, process lifecycle, and platform glue.

## Header Hygiene

-   Keep public headers self-contained and include only what they need.
-   Use opaque pointers (forward-declared structs) in headers to hide implementation details.
-   Avoid inline implementation in public headers unless the code is a simple, performance-critical macro.
-   Do not expose heavy third-party headers in public APIs unless the dependency is part of the contract.

Example:

```c
#pragma once

#include <stddef.h>

// Forward declaration of an opaque struct
typedef struct TelemetryClient TelemetryClient;

TelemetryClient* telemetry_client_create(const char* endpoint);
void telemetry_client_destroy(TelemetryClient* client);
int telemetry_client_send(TelemetryClient* client, const char* payload, size_t len);
const char* telemetry_client_get_endpoint(const TelemetryClient* client);
```

## Ownership Contracts

Use function signatures and documentation to communicate lifetime rules:

-   `const T*`: Borrowed object that must outlive the call.
-   `T*`: Can be borrowed, or ownership can be transferred (must be documented).
-   `T**`: Often used for returning ownership of a newly created object.
-   Functions that create resources (`*_create`) should have a corresponding `*_destroy` function.

Prefer this:

```c
// The caller retains ownership of 'logger'
void attach_logger(Logger* logger);

// The caller must free the returned string
char* get_error_message();
```

Over this:

```c
// Ambiguous: who frees the logger?
void attach_logger(Logger* logger);
```

## Error Modeling

Pick one dominant model per subsystem:

-   Return codes (integers or enums) for predictable operational failures.
-   `errno` for system call failures.
-   Longjumps for exceptional control flow (use with extreme care).
-   Assertions for programmer mistakes and impossible states.

Make the choice explicit in APIs:

```c
typedef enum {
    PARSE_OK,
    PARSE_ERROR_INVALID_MAGIC,
    PARSE_ERROR_TRUNCATED_PAYLOAD,
} ParseResult;

ParseResult parse_header(const unsigned char* bytes, size_t len, Header* out_header);
```

## API-Sensitive Boundaries

When a library may be distributed independently, public API/ABI matters:

-   Use opaque pointers to hide implementation details and keep the ABI stable.
-   Prefer semantic versioning with compatibility notes when changing public types or functions.
-   Be mindful of struct padding and alignment.

Minimal opaque pointer pattern:

**`engine.h`**
```c
#ifndef ENGINE_H
#define ENGINE_H

typedef struct Engine Engine;

Engine* engine_create();
void engine_destroy(Engine* engine);
void engine_tick(Engine* engine);

#endif // ENGINE_H
```

**`engine.c`**
```c
#include "engine.h"

struct Engine {
    // private members
    int tick_count;
};

Engine* engine_create() {
    Engine* engine = malloc(sizeof(Engine));
    if (engine) {
        engine->tick_count = 0;
    }
    return engine;
}

void engine_destroy(Engine* engine) {
    free(engine);
}

void engine_tick(Engine* engine) {
    if (engine) {
        engine->tick_count++;
    }
}
```

## Library Layout

For non-trivial repos, prefer:

```text
include/project_name/
src/
tests/
examples/
```

Guidelines:

-   `include/`: public headers only.
-   `src/`: implementation files.
-   `examples/`: example usage of the library.
-   `tests/`: behavior and regression coverage.

## Service and CLI Structure

Keep process concerns at the edge:

-   CLI argument parsing in `main.c` or a thin adapter layer.
-   Service lifecycle, signals, and configuration loading near the process boundary.
-   Business logic in reusable library modules, not buried in the executable.

## Review Checklist

-   Are ownership and borrowing rules obvious from signatures and documentation?
-   Are public headers small, stable, and dependency-light?
-   Is the build target structure aligned with the runtime architecture?
-   Are error contracts consistent inside the subsystem?
-   Would this API still make sense six months from now under maintenance pressure?
