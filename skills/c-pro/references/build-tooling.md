# C Build Systems and Tooling

> Reference for: c-pro
> Load when: Makefile, CMake, Meson, sanitizers, static analysis, testing frameworks, CI/CD

## Modern CMake for C

```cmake
cmake_minimum_required(VERSION 3.15)
project(MyProject VERSION 1.0.0 LANGUAGES C)

# Set C standard
set(CMAKE_C_STANDARD 11)
set(CMAKE_C_STANDARD_REQUIRED ON)
set(CMAKE_C_EXTENSIONS OFF)

# Export compile commands for tools
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

# Compiler warnings
if(MSVC)
    add_compile_options(/W4 /WX)
else()
    add_compile_options(-Wall -Wextra -Wpedantic -Werror)
endif()

# Create library target
add_library(mylib
    src/mylib.c
    include/mylib.h
)

target_include_directories(mylib
    PUBLIC
        $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/include>
        $<INSTALL_INTERFACE:include>
    PRIVATE
        ${CMAKE_CURRENT_SOURCE_DIR}/src
)

# Create executable
add_executable(myapp src/main.c)
target_link_libraries(myapp PRIVATE mylib)

# Testing
enable_testing()
add_subdirectory(tests)

# Install rules
include(GNUInstallDirs)
install(TARGETS mylib myapp
    EXPORT MyProjectTargets
    LIBRARY DESTINATION ${CMAKE_INSTALL_LIBDIR}
    ARCHIVE DESTINATION ${CMAKE_INSTALL_LIBDIR}
    RUNTIME DESTINATION ${CMAKE_INSTALL_BINDIR}
)

install(DIRECTORY include/
    DESTINATION ${CMAKE_INSTALL_INCLUDEDIR}
)
```

## Classic Makefile

For smaller projects, a simple Makefile can be effective.

```makefile
CC = gcc
CFLAGS = -Wall -Wextra -pedantic -std=c11 -Iinclude
LDFLAGS =
SOURCES = src/main.c src/mylib.c
OBJECTS = $(SOURCES:.c=.o)
EXECUTABLE = myapp

.PHONY: all clean

all: $(EXECUTABLE)

$(EXECUTABLE): $(OBJECTS)
	$(CC) $(LDFLAGS) $(OBJECTS) -o $@

%.o: %.c
	$(CC) $(CFLAGS) -c $< -o $@

clean:
	rm -f $(OBJECTS) $(EXECUTABLE)
```

## Sanitizers

```cmake
# AddressSanitizer (ASan) - memory errors
set(CMAKE_C_FLAGS_ASAN
    "-g -O1 -fsanitize=address -fno-omit-frame-pointer"
    CACHE STRING "Flags for ASan build"
)

# UndefinedBehaviorSanitizer (UBSan)
set(CMAKE_C_FLAGS_UBSAN
    "-g -O1 -fsanitize=undefined -fno-omit-frame-pointer"
    CACHE STRING "Flags for UBSan build"
)

# ThreadSanitizer (TSan) - data races
set(CMAKE_C_FLAGS_TSAN
    "-g -O1 -fsanitize=thread -fno-omit-frame-pointer"
    CACHE STRING "Flags for TSan build"
)

# MemorySanitizer (MSan) - uninitialized reads
set(CMAKE_C_FLAGS_MSAN
    "-g -O1 -fsanitize=memory -fno-omit-frame-pointer"
    CACHE STRING "Flags for MSan build"
)
```

## Static Analysis

```bash
# Run clang-tidy
clang-tidy src/*.c -- -Iinclude

# Run cppcheck
cppcheck --enable=all --std=c11 --suppress=missingInclude src/
```

## Testing with Check

```c
#include <check.h>
#include "mylib.h"

START_TEST(test_addition)
{
    ck_assert_int_eq(add(2, 3), 5);
    ck_assert_int_eq(add(-1, 1), 0);
}
END_TEST

Suite* money_suite(void)
{
    Suite *s;
    TCase *tc_core;

    s = suite_create("Money");
    tc_core = tcase_create("Core");

    tcase_add_test(tc_core, test_addition);
    suite_add_tcase(s, tc_core);

    return s;
}

int main(void)
{
    int number_failed;
    Suite *s;
    SRunner *sr;

    s = money_suite();
    sr = srunner_create(s);

    srunner_run_all(sr, CK_NORMAL);
    number_failed = srunner_ntests_failed(sr);
    srunner_free(sr);

    return (number_failed == 0) ? 0 : 1;
}
```

## Performance Profiling

```bash
# Profiling with perf (Linux)
perf record -g ./myapp
perf report

# Profiling with Instruments (macOS)
instruments -t "Time Profiler" ./myapp

# Valgrind callgrind
valgrind --tool=callgrind ./myapp
kcachegrind callgrind.out.*

# Memory profiling with Valgrind
valgrind --tool=massif ./myapp
ms_print massif.out.*
```

## CI/CD with GitHub Actions

```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  build:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
        build_type: [Debug, Release]

    steps:
    - uses: actions/checkout@v3

    - name: Configure
      run: |
        cmake -B build -DCMAKE_BUILD_TYPE=${{ matrix.build_type }}

    - name: Build
      run: cmake --build build --config ${{ matrix.build_type }}

    - name: Test
      run: ctest --test-dir build -C ${{ matrix.build_type }}

  sanitizers:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        sanitizer: [asan, ubsan, tsan]

    steps:
    - uses: actions/checkout@v3

    - name: Build with sanitizer
      run: |
        cmake -B build -DCMAKE_BUILD_TYPE=Debug -DENABLE_SANITIZER=${{ matrix.sanitizer }}
        cmake --build build

    - name: Run tests
      run: ctest --test-dir build
```

## Quick Reference

| Tool | Purpose | Command |
|------|---------|---------|
| CMake | Build system | `cmake -B build && cmake --build build` |
| make | Build system | `make` |
| ASan | Memory errors | `-fsanitize=address` |
| UBSan | Undefined behavior | `-fsanitize=undefined` |
| TSan | Data races | `-fsanitize=thread` |
| clang-tidy | Static analysis | `clang-tidy src/*.c` |
| cppcheck | Static analysis | `cppcheck --enable=all src/` |
| Check | Unit testing | `ck_assert_int_eq(...)` |
| Valgrind | Memory profiler | `valgrind --tool=memcheck ./app` |
