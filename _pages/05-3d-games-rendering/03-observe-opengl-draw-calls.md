---
title: Observe OpenGL Draw Calls
author: attilathedud
date: 2026-07-30
category: 3D Games & Rendering
layout: post
permalink: /pages/5/03/
chapter: "5.3"
minutes: 30
summary: Understand indexed drawing, observe OpenGL calls without stalling the render thread, and connect parameters to geometry and state.
---

## A wrapper records and forwards draw calls

OpenGL applications call functions such as `glDrawElements`. A wrapper sits between the caller and the real function:

```text
game calls glDrawElements
→ wrapper records a small observation
→ wrapper calls the real glDrawElements
→ frame continues
```

The wrapper must preserve the exact ABI and forward every normal call.

## What an indexed draw actually requests

`glDrawElements(mode, count, element_type, indices)` asks OpenGL to consume an
ordered sequence of vertex indices:

| Argument | Meaning |
|---|---|
| `mode` | how index results form primitives, such as triangles or lines |
| `count` | number of indices to read |
| `element_type` | width/format of each index, such as 16- or 32-bit unsigned |
| `indices` | byte offset into a bound index buffer, or an address in old client-memory mode |

The call does not directly identify a model. OpenGL combines those indices with
the currently bound vertex attributes, textures, transforms, and other state. One
character may require several draws—body, head, weapon, shadow—and one draw may
contain many instances or a batch of unrelated objects.

With `GL_TRIANGLES`, every complete group of three indices describes one submitted
triangle. The indices may repeat vertices, and some triangles may be degenerate,
clipped, back-face culled, or hidden by depth. Therefore:

```text
count / 3 = maximum submitted triangle groups
count / 3 ≠ visible triangle count
count     ≠ unique vertex count
```

The `indices` parameter is especially easy to misread. If an element-array buffer
is bound, a small value such as `0x120` is an offset into GPU-managed buffer state,
not a process pointer that should be dereferenced.

## CPU submission and GPU execution overlap

The CPU usually records commands faster than the GPU completes them. A draw call
returning does not mean its pixels are finished. Reads that force the GPU to catch
up can stall both processors. Treat the hook as observation of *submitted work*,
not a timestamp for completed pixels.

```text
CPU frame N+1: build and submit commands ──────────────►
GPU frame N:       execute vertices → rasterize → shade ─────────►
```

This overlap explains why a debugger pause or synchronous query can create a much
larger performance change than its own instruction count suggests.

## A hook sits on the program's critical path

The render thread has a deadline: finish enough work for the next frame. A hook adds work to a path that may execute thousands of times per second. Even memory-safe code can cause stutter if it allocates, waits for a lock, formats strings, or writes files there.

Split the design into two rates:

- the **capture path** copies a tiny fixed-size sample and returns immediately;
- the **analysis path** runs later on a worker and may aggregate, label, or save bounded results.

Measure both dropped samples and time spent in the hook. Dropping an observation changes what your log can prove, while blocking changes the game you are trying to observe.

![Locating glDrawElements in the debugger]({{ site.baseurl }}/assets/images/5/3/urbanterror3.png)

## Write the function type

For a 32-bit Windows OpenGL 1.x target, the calling convention is significant:

```rust
use std::ffi::c_void;

type GlDrawElements = unsafe extern "system" fn(
    mode: u32,
    count: i32,
    element_type: u32,
    indices: *const c_void,
);
```

The exact signature comes from the OpenGL API, not from guessing registers.

In an older fixed-function renderer, transforms and arrays may be ordinary OpenGL
state. In a modern renderer, shader programs and buffer objects carry the same
roles. The observation method is still valid, but the state needed to explain a
draw changes with the API version and engine.

## Keep the original function

```rust
use std::sync::OnceLock;

static ORIGINAL_DRAW_ELEMENTS: OnceLock<GlDrawElements> = OnceLock::new();
```

Initialization must resolve and store the real function before the wrapper can forward calls. Avoid resolving it recursively through your own wrapper.

## Forward first

Begin with a transparent wrapper:

```rust
unsafe extern "system" fn draw_elements_hook(
    mode: u32,
    count: i32,
    element_type: u32,
    indices: *const c_void,
) {
    let original = ORIGINAL_DRAW_ELEMENTS
        .get()
        .expect("OpenGL wrapper was not initialized");

    // 🔁 SAFETY: the wrapper preserves the API signature and forwards the exact
    // arguments supplied by the original caller.
    unsafe { original(mode, count, element_type, indices) };
}
```

Run the game and verify that rendering is unchanged. Only then add observation.

## Do not log every call to disk

Draw calls can occur thousands of times per frame. Synchronous file output inside the hook will destroy performance and can cause re-entry problems.

Use a bounded channel and allow drops:

```rust
#[derive(Clone, Copy, Debug)]
struct DrawSample {
    mode: u32,
    count: i32,
    element_type: u32,
}

// 🎯 In the hook, observe the state immediately before forwarding the call:
let _ = sender.try_send(DrawSample { mode, count, element_type });
```

A worker thread can aggregate samples later. If the channel is full, losing a sample is better than blocking the render thread.

## Classify with experiments

The `count` argument may correlate with a model in one exact build:

![Filtering draw calls by count]({{ site.baseurl }}/assets/images/5/3/urbanterror14.png)

But `count` alone is fragile. Different objects can share a vertex count, and model updates can change it.

Collect features such as:

- draw mode;
- element count;
- bound texture;
- shader or fixed-function state;
- model/view transform;
- call site.

Then change one visible object and compare the samples.

Capture the smallest feature vector that can answer the current question:

```rust
#[derive(Clone, Copy, Debug)]
struct DrawFingerprint {
    call_site: usize,
    mode: u32,
    index_count: i32,
    index_type: u32,
    texture: u32,
    frame_number: u64,
}
```

`call_site` distinguishes engine submission paths, but compiler inlining and
updates can change it. `texture` can identify a material in one scene, but skins,
quality settings, and atlases can change it. Features become evidence only after
controlled comparisons.

## Shaders turn vertex records into pixels

A **shader** is a small GPU program invoked many times in parallel. Two stages are
central here:

- a vertex shader reads one vertex (and often matrices) and produces clip-space
  position plus values to interpolate;
- a fragment shader runs for candidate covered samples and produces a color,
  depth, or another render-target output.

Values such as texture coordinates and normals are interpolated across a triangle.
The fragment shader usually does not receive the original vertex value. This is why
a draw's texture, program, uniforms, and vertex layout are part of its identity.

Older fixed-function OpenGL calls hide these programs behind predefined state, but
the pipeline still performs equivalent transformations and color calculations.

This is a classification problem. A threshold such as `count > 500` separates the examples you observed, not necessarily the concept “player.” Test it against weapons, detailed scenery, menus, different models, and different graphics settings. Report false positives (something your rule caught that is not a player) and false negatives (a player your rule missed) instead of quietly turning a correlation into a definition.

## Turn the wrapper into the actual Urban Terror wallhack

In Urban Terror 4.3.4, resolve `glDrawElements` from `opengl32.dll`. The historical build hooks the instruction at **`glDrawElements + 0x16`** and resumes six bytes later. This is not a function-entry wrapper: it is a real code cave in the middle of the OpenGL function. At this point in this 32-bit build, `EBX` holds `count`.

Resolve these two OpenGL functions with `GetProcAddress`:

```rust
type GlDepthFunc = unsafe extern "system" fn(function: u32);
type GlDepthRange = unsafe extern "system" fn(near: f64, far: f64);

const GL_LEQUAL: u32 = 0x0203;
const GL_ALWAYS: u32 = 0x0207;
```

The six bytes we replace are one whole x86 instruction:

```text
8B B6 18 0A 00 00    mov esi, dword ptr [esi + 0xA18]
```

The installer refuses to patch if those bytes do not match. It writes a five-byte near jump plus one `NOP`, and `LocalPatch` owns the saved bytes so dropping the patch restores them:

```rust
let draw_elements = resolve(opengl, s!("glDrawElements"))?;
let hook = draw_elements.checked_add(0x16)
    .context("glDrawElements hook address overflowed")?;
DRAW_RETURN.store(hook + 6, Ordering::Release);

const ORIGINAL: [u8; 6] = [0x8B, 0xB6, 0x18, 0x0A, 0x00, 0x00];
let jump = near_jump(hook, urban_terror_opengl_cave as *const () as usize)?;
let mut replacement = [0x90_u8; 6];
replacement[..5].copy_from_slice(&jump);
let patch = LocalPatch::apply(hook, &ORIGINAL, &replacement)?;
```

The cave saves the CPU flags and all general-purpose registers, passes the live `EBX` value to an ordinary helper, replays the displaced instruction, and returns to the byte immediately after it:

```rust
#[unsafe(naked)]
unsafe extern "C" fn urban_terror_opengl_cave() {
    core::arch::naked_asm!(
        "pushfd",
        "pushad",
        "push ebx",
        "call {apply}",
        "add esp, 4",
        "popad",
        "popfd",
        "mov esi, dword ptr [esi + 0xA18]",
        "jmp dword ptr [{resume}]",
        apply = sym apply_urban_terror_gl_state,
        resume = sym DRAW_RETURN,
    );
}
```

Why save everything? The original OpenGL function expects its registers and flags to have particular values when it resumes. The compiler is free to use registers while `apply_urban_terror_gl_state` runs. Saving and restoring them makes the helper almost invisible to the interrupted function.

The helper changes the live OpenGL state. A later non-highlighted draw restores normal depth state:

```rust
extern "C" fn apply_urban_terror_gl_state(count: u32) {
    let highlighted = OPENGL_MODE.load(Ordering::Acquire) != OPENGL_OFF
        && count > 500;

    // 🛡️ SAFETY: these pointers were resolved from this process's opengl32.dll,
    // and the game reached the cave on its OpenGL render thread.
    unsafe {
        if highlighted {
            depth_range(0.0, 0.0);
            depth_func(GL_ALWAYS);
        } else {
            depth_range(0.0, 1.0);
            depth_func(GL_LEQUAL);
        }
    }
}
```

Build the DLL for 32-bit Windows, inject it into `Quake3-UrT.exe`, enter a local match, and press **F2**. Geometry with `count > 500` is forced to the near plane and uses `GL_ALWAYS`, producing the player/weapon-through-wall result shown below. Press **F2** again or **End** to restore normal state and the original six code bytes.

```powershell
cargo build --release --target i686-pc-windows-msvc
.\target\i686-pc-windows-msvc\release\injector.exe `
  Quake3-UrT.exe `
  .\target\i686-pc-windows-msvc\release\gha_windows_labs.dll
```

The complete compiled implementation—including export lookup, the naked cave, exact-byte verification, both graphics modes, and restoration—is in [`opengl_hooks.rs`]({{ site.baseurl }}/windows-labs/src/windows_impl/opengl_hooks.rs). The hotkey worker is in [`dll.rs`]({{ site.baseurl }}/windows-labs/src/windows_impl/dll.rs).

![Urban Terror wallhack after count filtering]({{ site.baseurl }}/assets/images/5/3/urbanterror16.png)

The threshold is a confirmed property of this lesson build, not a universal player detector. Log counts while toggling third-person and adding/removing bots so you can see exactly which models it includes.

## Restore graphics state

OpenGL is a state machine: a call changes settings that remain active until another call changes them. This middle-of-function cave cannot surround one typed `glDrawElements` call, so it restores the normal state when the next non-highlighted draw arrives and when the feature is disabled. Pressing **End** also disables the mode before removing the code patch. That ordering prevents the game from being left with `GL_ALWAYS` active.

State restoration must match what was changed. A robust typed wrapper queries or
tracks the previous depth function, depth range, enabled client arrays, color, and
bindings. Restoring guessed “defaults” works only until another legitimate render
pass enters with different state. A middle-of-function cave has fewer safe options,
which is a real limitation of that interception point rather than an implementation
detail to ignore.

## Diagnose common failures

| Result | Check |
|---|---|
| Immediate crash | Signature, calling convention, or original pointer |
| Infinite recursion | Original resolved to wrapper |
| Missing geometry | Parameters were not forwarded exactly |
| Broken later draws | Graphics state not restored |
| Huge slowdown | Blocking or allocation inside the hook |

The first success is not a visual effect. It is a transparent wrapper that produces bounded observations while the game draws normally.
