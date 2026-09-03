---
title: Recover Containers, Ownership, and Lifetimes
author: attilathedud
date: 2026-08-14
category: Memory, Types & Ownership
layout: post
permalink: /pages/3/05/
chapter: "3.5"
minutes: 40
summary: Identify vectors, strings, handles, component pools, reference counts, and destruction paths without assuming one compiler's private layout.
---

## A field layout is only half a model

Imagine that offset `0x40` points to a weapon. That observation does not answer the dangerous questions:

- Does the player own the weapon?
- Can several players share it?
- Can it disappear while another system still remembers it?
- Is the value a pointer, an index, or a generation-checked handle?

These are **lifetime** questions. A reliable memory tool needs them because an address that was correct one frame ago may now belong to a different allocation.

## Recognize behavior before naming a container

Compiler libraries have implementation details that can change. Instead of memorizing one screenshot of `std::vector`, recognize its behavior.

A vector-like container commonly needs three logical facts:

| Fact | Meaning |
|---|---|
| begin | address of the first element |
| end | one element past the last live element |
| capacity end | one element past the allocated storage |

The element count is `(end - begin) / element_size`. Before using that formula, verify all of these:

```text
begin <= end <= capacity_end
(end - begin) is divisible by element_size
the addresses belong to readable memory
the resulting count fits a sensible limit
```

Worked through with real numbers, a vector of 32-byte entities might look like
this:

```text
begin        = 0x0453_1000
end          = 0x0453_1140
capacity_end = 0x0453_1400

(0x140) / 32 = 10 live elements
(0x400) / 32 = 32 elements of allocated room
```

The gap between `end` and `capacity_end` is the container's spare room. That is
exactly why the count has to come from `end` rather than from the size of the
allocation — using the allocation would report 32 entities, 22 of which were
never constructed.

Notice how much rests on `element_size` being correct. Guess 16 bytes instead
of 32 and the same three pointers report 20 elements, half of them the second
halves of real entities. Every address is readable and the count looks
entirely reasonable. The divisibility check rejects many wrong guesses, but not
one that happens to divide evenly like this, so the element size needs its own
evidence: the stride the code actually uses when it walks from one element to
the next.

Those checks describe meaning. They remain useful even if a compiler changes field order.

## Fixed offsets and scaled offsets answer different questions

Machine code often exposes an address formula. Read the formula before naming
the container:

```text
base + fixed_offset             → one possible field
base + index × stride           → one possible array element
base + index × stride + offset  → one field inside an array element
```

For example, `base + index * 0x30 + 0x08` suggests records that are `0x30`
bytes apart and a candidate field eight bytes into each record. Test several
indexes and compare the same behavior at each calculated address.

The formula is evidence, not a final type declaration. A compiler can unroll a
small loop into three fixed-offset stores, making an array look like a structure.
Conversely, a table-driven system can compute what is logically a field offset,
making a structure look indexed. Use access patterns across time:

- repeated neighboring strides support an array-of-records model;
- many unrelated functions reusing the same constants support named fields;
- allocation size gives an upper bound, not a complete layout;
- instruction width constrains a field's size, not necessarily its full type;
- one readable value never distinguishes a pointer, handle, counter, or bit set.

Prefer the smallest model that predicts the next observation. You can always add
names and relationships after another test; removing a confident wrong model is
harder.

## Strings can store short text inside themselves

Many C++ string implementations use a **small-string optimization**. Short names may live directly inside the string object, while longer names use a heap buffer. This explains a confusing observation: one player name looks like text at offset `0x20`, but a longer name makes the same bytes look like a pointer.

Do not read an assumed pointer until you identify the mode flag or length behavior. Compare the same object with names on both sides of the suspected short-string limit. 🔬

## Linked structures leave different clues

A linked list node usually has one or two neighbor pointers plus a payload. Traversal repeatedly loads a pointer from the current node. A tree adds comparisons and chooses left or right children. A hash table often computes a hash or mask before choosing a bucket.

Validate structural invariants:

- a doubly linked node’s `next.prev` should return to the node;
- tree children should eventually end at a sentinel or null;
- bucket indices must stay below the bucket count;
- traversal needs a maximum-node limit and a visited-address set.

The visited set is important. Corrupted data could form a cycle and otherwise trap a scanner forever.

## Raw pointers, smart pointers, and handles

### Unique ownership

If one owner’s destructor directly destroys the pointed object, and moves clear the old pointer, unique ownership is likely. That resembles C++ `unique_ptr`, but use a neutral label until symbols confirm it.

### Shared ownership

Shared objects often have a separate control block with strong and weak reference counts. Copies increment a count; releases decrement it; a transition to zero calls a destructor. The object pointer and control-block pointer may travel together.

Never edit a suspected count. Observe calls around it and confirm whether updates are atomic. A plain integer that happens to rise and fall is not enough evidence.

### Handles

Games often avoid long-lived raw pointers by storing a small handle:

```rust
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct Handle {
    index: u32,
    generation: u32,
}

fn resolve<'a, T>(handle: Handle, slots: &'a [Slot<T>]) -> Option<&'a T> {
    let slot = slots.get(handle.index as usize)?;
    (slot.generation == handle.generation).then_some(slot.value.as_ref()?)
}

struct Slot<T> {
    generation: u32,
    value: Option<T>,
}
```

The index chooses a slot. The generation proves that the slot still represents the same logical object. If a deleted entity’s slot is reused, its generation changes and old handles stop resolving. ✅

## Follow destruction as carefully as construction

Constructors show default values and vptr writes. Destructors show ownership:

1. Which child objects are destroyed?
2. Which pointers are merely cleared?
3. Which reference counts are released?
4. Which collections remove the object?
5. Is memory freed immediately or returned to a pool?

Set a breakpoint on an owned toy object’s destructor and delete it through the normal game action. Record the call chain and field accesses. Repeat the experiment; one run may include unrelated cleanup.

## Component pools store fields in separate collections

In an entity-component system, an entity handle may resolve into several pools:

```text
entity 42 -> transform pool slot 7
          -> health pool slot 19
          -> inventory pool: absent
```

A sparse set often combines a sparse index array with a dense component array. Deletion may swap the final dense element into the removed slot, so a component’s address can move even while the entity remains valid.

That is why a stable entity ID is often more meaningful than a cached component pointer.

## Make the model honest

Do not immediately use `#[repr(C)] struct Player` for every observation. A staged representation communicates uncertainty better:

```rust
#[derive(Debug, Clone, Copy)]
struct SuspectedPlayerLayout {
    object_size: usize,
    health_offset: Option<usize>,
    weapon_link_offset: Option<usize>,
    weapon_link_kind: LinkKind,
}

#[derive(Debug, Clone, Copy)]
enum LinkKind {
    Unknown,
    RawPointer,
    SharedOwner,
    GenerationalHandle,
}
```

An `Option` says the field has not been confirmed. `Unknown` prevents a guess from silently becoming a fact. Once source, symbols, and repeated behavior agree, the model can become more precise.

## Evidence checklist

- object size agrees with allocation and construction;
- every field offset is seen at multiple call sites;
- container count and capacity pass arithmetic checks;
- traversal has bounds and cycle detection;
- ownership claims agree with destruction behavior;
- cached addresses are invalidated when the game changes scenes;
- build identity is recorded with the layout;
- disagreements remain visible instead of being “fixed” by guessing.

This evidence-first approach is slower for ten minutes and faster for the next ten hours.
