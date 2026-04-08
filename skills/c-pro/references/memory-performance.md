# C Memory Management & Performance

> Reference for: c-pro
> Load when: Custom allocators, SIMD, cache optimization, memory pools, performance tuning

## Manual Memory Management

In C, memory is managed manually. This requires discipline.

```c
#include <stdlib.h>
#include <string.h>

// Allocation
int* arr = (int*)malloc(10 * sizeof(int));
if (arr == NULL) {
    // Handle allocation failure
}

// Re-allocation
int* new_arr = (int*)realloc(arr, 20 * sizeof(int));
if (new_arr == NULL) {
    free(arr); // Free original block if realloc fails
    // Handle allocation failure
}
arr = new_arr;

// Deallocation
free(arr);
arr = NULL; // Good practice to avoid use-after-free
```

**Rule of Thumb:** For every `malloc`, `calloc`, or `realloc`, there must be exactly one `free`.

## Custom Allocators

### Memory Pool

For frequent allocation/deallocation of fixed-size objects.

```c
#include <stddef.h>

#define POOL_SIZE 1024
#define OBJECT_SIZE sizeof(my_object_t)

typedef struct my_object_s {
    // ... object data
} my_object_t;


typedef struct block_s {
    struct block_s* next;
} block_t;

static block_t* free_list = NULL;
static char memory_pool[POOL_SIZE][OBJECT_SIZE];

void init_pool() {
    free_list = (block_t*)memory_pool;
    block_t* current = free_list;
    for (int i = 0; i < POOL_SIZE - 1; ++i) {
        current->next = (block_t*)((char*)current + OBJECT_SIZE);
        current = current->next;
    }
    current->next = NULL;
}

void* pool_alloc() {
    if (free_list == NULL) {
        return NULL; // Pool is full
    }
    block_t* block = free_list;
    free_list = free_list->next;
    return block;
}

void pool_free(void* ptr) {
    if (ptr == NULL) return;
    block_t* block = (block_t*)ptr;
    block->next = free_list;
    free_list = block;
}
```

### Arena (Bump) Allocator

For allocating many objects with the same lifetime. All are freed at once.

```c
typedef struct {
    char* buffer;
    size_t size;
    size_t offset;
} arena_t;

void arena_init(arena_t* arena, size_t size) {
    arena->buffer = (char*)malloc(size);
    arena->size = size;
    arena->offset = 0;
}

void* arena_alloc(arena_t* arena, size_t alloc_size) {
    if (arena->offset + alloc_size > arena->size) {
        return NULL; // Out of memory
    }
    void* ptr = arena->buffer + arena->offset;
    arena->offset += alloc_size;
    return ptr;
}

void arena_free(arena_t* arena) {
    free(arena->buffer);
}
```

## SIMD Optimization

Using Single Instruction, Multiple Data (SIMD) extensions like SSE or AVX.

```c
#include <immintrin.h> // For AVX/AVX2

// Vectorized sum using AVX2
float simd_sum(const float* data, size_t size) {
    __m256 sum_vec = _mm256_setzero_ps();
    size_t i = 0;

    // Process 8 floats at a time
    for (; i + 8 <= size; i += 8) {
        __m256 vec = _mm256_loadu_ps(&data[i]);
        sum_vec = _mm256_add_ps(sum_vec, vec);
    }

    // Horizontal sum
    float temp[8];
    _mm256_storeu_ps(temp, sum_vec);
    float result = 0.0f;
    for (int j = 0; j < 8; ++j) {
        result += temp[j];
    }

    // Handle remaining elements
    for (; i < size; ++i) {
        result += data[i];
    }

    return result;
}
```

## Cache-Friendly Design

### Structure of Arrays (SoA) vs. Array of Structures (AoS)

SoA often provides better cache locality for algorithms that access only a few members of a struct at a time.

```c
// Array of Structures (AoS) - Traditional approach
struct ParticleAoS {
    float x, y, z;
    float vx, vy, vz;
};
struct ParticleAoS particles_aos[1000];

// Structure of Arrays (SoA) - Better for cache
struct ParticlesSoA {
    float x[1000], y[1000], z[1000];
    float vx[1000], vy[1000], vz[1000];
};
struct ParticlesSoA particles_soa;

void update_positions(struct ParticlesSoA* p, float dt) {
    // All x coordinates are contiguous in memory
    for (int i = 0; i < 1000; ++i) {
        p->x[i] += p->vx[i] * dt;
    }
    // All y coordinates are contiguous
    for (int i = 0; i < 1000; ++i) {
        p->y[i] += p->vy[i] * dt;
    }
}
```

### Cache Line Padding

To prevent false sharing in multi-threaded contexts.

```c
#include <stdatomic.h>

// Assuming 64-byte cache lines
#define CACHE_LINE_SIZE 64

typedef struct {
    atomic_int counter;
    char padding[CACHE_LINE_SIZE - sizeof(atomic_int)];
} padded_counter_t;

padded_counter_t counters[NUM_THREADS];
```

## Alignment and Memory Layout

Controlling memory alignment is crucial for performance, especially with SIMD.

```c
#include <stdalign.h> // C11 standard

// Align a struct to a 64-byte boundary
typedef struct alignas(64) {
    int data[16];
} cache_aligned_t;

// Check alignment at compile time
_Static_assert(alignof(cache_aligned_t) == 64, "Alignment mismatch");

// Aligned allocation (C11)
void* aligned_ptr = aligned_alloc(64, 1024); // 64-byte alignment, 1024 bytes
if (aligned_ptr) {
    free(aligned_ptr);
}

// Aligned allocation (POSIX)
void* posix_aligned_ptr;
if (posix_memalign(&posix_aligned_ptr, 64, 1024) != 0) {
    // Handle error
} else {
    free(posix_aligned_ptr);
}
```

## Quick Reference

| Technique | Use Case | Benefit |
|---|---|---|
| `malloc`/`free` | General dynamic allocation | Flexibility |
| Custom Allocators | Specialized allocation patterns | Speed, control, less fragmentation |
| SIMD | Data-parallel computation | Significant speedup |
| SoA Layout | Sequential access to a subset of fields | Cache efficiency |
| Memory Pools | Frequent alloc/dealloc of same-sized objects | Reduced `malloc` overhead and fragmentation |
| Alignment | SIMD operations, cache optimization | Performance, correctness |
| `valgrind` | Debugging memory issues | Find leaks, use-after-free, etc. |
