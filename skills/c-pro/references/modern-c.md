# Modern C (C99/C11/C17)

> Reference for: c-pro
> Load when: Using features from C99 or later, improving code safety and readability.

## Key C99 Features

C99 introduced many features that are now standard practice.

### `<stdbool.h>` and `<stdint.h>`

Always prefer these for clarity and portability.

```c
#include <stdbool.h>
#include <stdint.h>

bool is_ready = true;
int32_t user_id = -12345;
uint64_t file_size = 1024 * 1024 * 5; // 5MB
```

### Designated Initializers

This feature makes struct initialization much safer and more readable.

```c
typedef struct {
    const char* host;
    int port;
    bool ssl_enabled;
    int timeout_ms;
} config_t;

// Old way (C89) - error-prone if order changes
config_t cfg_old = { "example.com", 443, true, 5000 };

// Modern way (C99) - order doesn't matter, self-documenting
config_t cfg_new = {
    .host = "example.com",
    .port = 443,
    .ssl_enabled = true,
    .timeout_ms = 5000,
};
```

### `for` Loop Initial Declarations

Limits the scope of loop variables.

```c
// Old way
int i;
for (i = 0; i < 10; ++i) {
    // ...
}
// 'i' is still in scope here

// Modern way
for (int i = 0; i < 10; ++i) {
    // ...
}
// 'i' is not in scope here
```

### Variable Length Arrays (VLAs)

Use with caution. VLAs are allocated on the stack and can cause stack overflow if the size is large. They were made optional in C11.

```c
void process_data(int n) {
    // VLA - size is determined at runtime
    int data[n];

    for (int i = 0; i < n; ++i) {
        data[i] = i;
    }
    // ...
}
```
A safer alternative is to use `malloc` and `free`.

### `<inttypes.h>` for portable printing

Provides macros for printing fixed-width types.

```c
#include <inttypes.h>
#include <stdio.h>

int main(void) {
    uint64_t large_number = 1234567890123456789ULL;
    printf("The number is %" PRIu64 "
", large_number);
    return 0;
}
```

## Key C11 Features

C11 added more safety and concurrency features.

### `_Static_assert`

Compile-time assertions.

```c
#include <assert.h>

_Static_assert(sizeof(void*) == 8, "This code requires a 64-bit architecture");

// With a message (C11)
static_assert(sizeof(void*) == 8, "This code requires a 64-bit architecture");
```

### Type-Generic Expressions with `_Generic`

Allows you to write code that behaves differently based on the type of its argument at compile time.

```c
#include <stdio.h>

#define print(X) _Generic((X), 
    int: print_int, 
    double: print_double, 
    default: print_other 
)(X)

void print_int(int x) { printf("int: %d
", x); }
void print_double(double x) { printf("double: %f
", x); }
void print_other(...) { printf("other type
"); }

int main() {
    print(123);
    print(45.67);
    print("hello");
}
```

### `<stdalign.h>` for Alignment Control

`alignas` and `alignof` provide portable ways to control and query memory alignment.

```c
#include <stdalign.h>

// Align a struct to a 32-byte boundary
typedef struct alignas(32) {
    float data[8];
} simd_vec;

_Static_assert(alignof(simd_vec) == 32, "Alignment error");
```

### Safer File Operations

The `fopen_s`, `fprintf_s`, etc. functions were added to provide bounds-checked versions of standard I/O functions. These are part of the optional Annex K and not widely supported. A better cross-platform approach is to use functions like `snprintf`.

## Key C17 Features

C17 was primarily a bug-fix release, clarifying and refining existing features. It did not introduce major new language features.

## General Best Practices

-   **`const` correctness:** Use `const` wherever possible to prevent accidental modification of data.
-   **`static` for internal linkage:** Hide implementation details within a translation unit by declaring helper functions and global variables as `static`.
-   **Header guards:** Always use header guards to prevent multiple inclusion. `#pragma once` is a common, non-standard but widely supported alternative.
-   **Avoid `gets()`:** Never use `gets()`. Use `fgets()` instead, which allows you to specify a buffer size.
-   **Use `snprintf()`:** Prefer `snprintf()` over `sprintf()` to prevent buffer overflows.
-   **Check return values:** Always check the return values of functions that can fail (e.g., `malloc`, `fopen`).
