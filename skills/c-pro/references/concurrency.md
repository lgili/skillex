# C Concurrency and Parallel Programming

> Reference for: c-pro
> Load when: Atomics, lock-free structures, thread pools, parallel programming

## C11 Atomics and Memory Ordering

```c
#include <stdatomic.h>
#include <threads.h>

// Basic atomics
atomic_int counter = ATOMIC_VAR_INIT(0);
atomic_flag lock_flag = ATOMIC_FLAG_INIT;

// Memory ordering
void producer(atomic_int* data, atomic_bool* ready) {
    atomic_store_explicit(data, 42, memory_order_relaxed);
    atomic_store_explicit(ready, true, memory_order_release); // Release barrier
}

void consumer(atomic_int* data, atomic_bool* ready) {
    while (!atomic_load_explicit(ready, memory_order_acquire)) { // Acquire barrier
        thrd_yield();
    }
    int value = atomic_load_explicit(data, memory_order_relaxed);
}

// Compare-and-swap (used for spinlocks)
void spinlock_acquire(atomic_flag* lock) {
    while (atomic_flag_test_and_set_explicit(lock, memory_order_acquire)) {
        // spin
    }
}

void spinlock_release(atomic_flag* lock) {
    atomic_flag_clear_explicit(lock, memory_order_release);
}


// Fetch-and-add
int increment_counter(atomic_int* counter) {
    return atomic_fetch_add_explicit(counter, 1, memory_order_relaxed);
}
```

## Pthreads

The POSIX threads (Pthreads) library is a standard for threads in C.

### Thread Creation and Joining

```c
#include <pthread.h>
#include <stdio.h>

void* thread_func(void* arg) {
    int* value = (int*)arg;
    printf("Hello from thread! Got value: %d
", *value);
    return NULL;
}

int main() {
    pthread_t thread_id;
    int data = 42;

    if (pthread_create(&thread_id, NULL, thread_func, &data) != 0) {
        perror("pthread_create");
        return 1;
    }

    if (pthread_join(thread_id, NULL) != 0) {
        perror("pthread_join");
        return 1;
    }

    return 0;
}
```

### Mutexes

```c
#include <pthread.h>

pthread_mutex_t lock = PTHREAD_MUTEX_INITIALIZER;
int shared_data = 0;

void* increment_data(void* arg) {
    for (int i = 0; i < 10000; ++i) {
        pthread_mutex_lock(&lock);
        shared_data++;
        pthread_mutex_unlock(&lock);
    }
    return NULL;
}
```

### Condition Variables

```c
#include <pthread.h>

pthread_mutex_t lock = PTHREAD_MUTEX_INITIALIZER;
pthread_cond_t cond = PTHREAD_COND_INITIALIZER;
int items_in_queue = 0;

void* producer(void* arg) {
    for (int i = 0; i < 10; ++i) {
        pthread_mutex_lock(&lock);
        items_in_queue++;
        printf("Produced one item, total: %d
", items_in_queue);
        pthread_cond_signal(&cond); // Signal the consumer
        pthread_mutex_unlock(&lock);
    }
    return NULL;
}

void* consumer(void* arg) {
    for (int i = 0; i < 10; ++i) {
        pthread_mutex_lock(&lock);
        while (items_in_queue == 0) {
            printf("Consumer waiting...
");
            pthread_cond_wait(&cond, &lock); // Wait for producer signal
        }
        items_in_queue--;
        printf("Consumed one item, remaining: %d
", items_in_queue);
        pthread_mutex_unlock(&lock);
    }
    return NULL;
}
```

## Thread Pool

A basic thread pool implementation in C.

```c
// Simplified thread pool concept
typedef struct {
    void (*function)(void*);
    void* argument;
} task_t;

typedef struct {
    pthread_t* threads;
    int thread_count;
    task_t* queue;
    int queue_size;
    int head;
    int tail;
    int count;
    pthread_mutex_t lock;
    pthread_cond_t notify;
    int shutdown;
} threadpool_t;

// ... implementation of threadpool_create, threadpool_add, threadpool_destroy
```

## Quick Reference

| Primitive | C11 Atomics | Pthreads | Use Case |
|---|---|---|---|
| Atomic Ops | `atomic_fetch_add` | N/A | Simple shared state, lock-free counters |
| Mutex | N/A | `pthread_mutex_t` | Exclusive access to critical sections |
| Condition Var | N/A | `pthread_cond_t` | Signaling between threads (e.g., producer-consumer) |
| Thread | `thrd_t` | `pthread_t` | Creating and managing threads of execution |
| Spinlock | `atomic_flag` | `pthread_spin_t` | Short-lived locks in high-contention scenarios |


## Memory Ordering Guide

| Ordering | Guarantees | Use Case |
|---|---|---|
| `memory_order_relaxed` | No synchronization | Simple counters where order doesn't matter |
| `memory_order_acquire` | Load barrier; prevents later memory accesses from being reordered before it | Acquiring a lock, reading a ready flag |
| `memory_order_release` | Store barrier; prevents earlier memory accesses from being reordered after it | Releasing a lock, setting a ready flag |
| `memory_order_acq_rel` | Both acquire and release semantics | Read-modify-write operations |
| `memory_order_seq_cst` | Total global order; strongest guarantee | Default, when unsure or complex interactions exist |
