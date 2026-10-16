// A small tour of C syntax. Hover anything, or put the cursor on a keyword
// or a declaration name to see its scope highlighted.
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdarg.h>
#include <stdbool.h>

#define MAX_ITEMS 8
#define SQUARE(x) ((x) * (x))
#define STR(x) #x
#define GLUE(a, b) a##b

#ifdef DEBUG
#define LOG(msg) fprintf(stderr, "%s\n", msg)
#else
#define LOG(msg) ((void)0)
#endif

typedef unsigned long ulong;

enum Color { RED, GREEN = 5, BLUE };

struct Point {
    int x;
    int y;
};

typedef struct Node {
    int value;
    struct Node *next;
} Node;

union Number {
    int i;
    float f;
};

static int counter = 0;
extern int shared_total;
const char *greeting = "héllo 👋";
const char *joined = "split " "string";

static inline int add(int a, int b) {
    return a + b;
}

int next_id(void) {
    static int id = 0;
    return ++id;
}

int sum(int count, ...) {
    va_list args;
    va_start(args, count);
    int total = 0;
    for (int k = 0; k < count; k++) total += va_arg(args, int);
    va_end(args);
    return total;
}

void push(Node **head, int value) {
    Node *n = malloc(sizeof(Node));
    if (n == NULL) {
        return;
    }
    n->value = value;
    n->next = *head;
    *head = n;
}

size_t length(const Node *list) {
    size_t len = 0;
    for (const Node *p = list; p != NULL; p = p->next) {
        len++;
    }
    return len;
}

int main(int argc, char *argv[]) {
    struct Point pt = { .x = 1, .y = 2 };
    struct Point *pp = &pt;
    int nums[MAX_ITEMS] = {0};
    Node *list = NULL;
    int (*op)(int, int) = add;
    volatile bool ready = false;
    register int i;

    for (i = 0; i < MAX_ITEMS; i++) {
        if (i % 2 == 0) {
            continue;
        }
        nums[i] = SQUARE(i) * 2;
        push(&list, nums[i]);
    }

    int n = 0;
    while (true) {
        if (++n > 3) break;
    }
    do {
        n--;
    } while (n > 0);

    switch (pt.x) {
    case 1:
        printf("one\n");
        break;
    default:
        printf("other\n");
    }

    char c = 'A';
    char *copy = calloc(strlen(greeting) + 1, sizeof(char));
    memcpy(copy, greeting, strlen(greeting) + 1);
    printf("%s %c %d %zu\n", copy, c, pp->x, sizeof pt);
    free(copy);

    int big = pt.x > pt.y ? pt.x : pt.y;
    unsigned int mask = (1u << 3) | (0x0F & ~0x1);
    if (big < 0) {
        goto cleanup;
    } else if (big == 0) {
        puts("zero");
    } else {
        printf("%d %u %d %zu\n", op(big, 1), mask, sum(2, 3, 4), length(list));
    }
    (void)ready; (void)argc; (void)argv; (void)counter; (void)next_id();
    return 0;

cleanup:
    LOG(STR(failed));
    return EXIT_FAILURE;
}
