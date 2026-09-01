---
title: Color-Code Render Categories
author: attilathedud
date: 2026-07-30
category: 3D Games & Rendering
layout: post
permalink: /pages/5/04/
chapter: "5.4"
minutes: 20
summary: Treat temporary color as a controlled classification experiment while accounting for materials, lighting, blending, and color space.
---

## Color is a debugging label

A solid temporary color can answer a classification question:

> Do these draw calls all belong to player models, or did our filter catch unrelated geometry?

This technique is often called **chams**. In this course it is a visual debugger for an offline target.

![An original player texture]({{ site.baseurl }}/assets/images/5/4/urbanterror1.png)

## A pixel's color has several contributors

“Set the color to red” sounds simple, but the final framebuffer value may combine:

```text
vertex color
× sampled texture
× material/light result
→ fragment output
→ blending with the existing framebuffer
→ display conversion
```

Multiplication is only one common model; a shader can compute anything. In the
fixed-function path used here, disabling selected arrays and textures reduces the
number of active contributors so the diagnostic color is easier to interpret.

Alpha does not automatically mean transparency. Blending must be enabled with a
specific source/destination rule, and draw order still matters. Likewise, RGB
values may be interpreted as linear light or sRGB-encoded display values. A debug
color only needs to be distinctive, but exact color comparison requires knowing
the framebuffer's color-space conversion.

## Separate classification from styling

```rust
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
enum RenderCategory {
    LocalPlayer,
    OtherPlayer,
    Weapon,
    World,
    Unknown,
}

#[derive(Clone, Copy, Debug)]
struct DrawSample {
    count: i32,
    texture: u32,
    call_site: usize,
}

fn classify(sample: DrawSample) -> RenderCategory {
    if sample.count > 500 {
        RenderCategory::OtherPlayer
    } else {
        RenderCategory::Unknown
    }
}
```

For this exact Urban Terror build, `count > 500` is the original course filter. It is intentionally simple so the color result can help you test what the filter catches.

Keep the classifier pure. It should not call OpenGL or change memory, which makes it easy to test with recorded samples.

Purity also makes uncertainty visible. Return `Unknown` when the observations do
not support a category. A confident-looking wrong label is harder to diagnose than
an explicit unknown.

```text
recorded draw state ──► pure classifier ──► category
                                           │
                                           ▼
                                temporary debug style
```

## Measure classification errors

A colored result gives immediate feedback, but “some players turned red” is not enough. Count four outcomes across a small labeled capture:

| Observation | Meaning |
|---|---|
| player colored | true positive |
| non-player colored | false positive |
| player left unchanged | false negative |
| non-player left unchanged | true negative |

Changing a threshold usually trades false positives against false negatives. Add independent features only when experiments show they help: call site, texture, model transform, or another stable render property. Avoid piling on conditions that merely memorize one map and graphics setting.

For a labeled set, calculate:

```text
precision = true_positive / (true_positive + false_positive)
recall    = true_positive / (true_positive + false_negative)
```

Precision asks “when the classifier says player, how often is it right?” Recall
asks “of all player draws, how many did it find?” If a denominator is zero, report
the metric as undefined instead of inventing a perfect score.

Keep the recorded samples separate from the classifier implementation. Then a new rule can be evaluated against the same evidence instead of judged from memory.

## Apply color for one draw

The rendering layer can choose a debug style:

```rust
#[derive(Clone, Copy)]
struct DebugColor {
    red: f32,
    green: f32,
    blue: f32,
    alpha: f32,
}

fn category_color(category: RenderCategory) -> Option<DebugColor> {
    match category {
        RenderCategory::OtherPlayer => Some(DebugColor {
            red: 0.95,
            green: 0.25,
            blue: 0.12,
            alpha: 1.0,
        }),
        _ => None,
    }
}
```

At the hook boundary:

1. capture the current texture/color/depth state;
2. apply the debug state;
3. forward exactly one draw;
4. restore every captured value.

The state must cover both server-side values such as enable flags and client array
state such as color or texture-coordinate arrays. Capturing only the visible color
is insufficient if the original draw obtains its color from a bound array.

![A color-coded model in the offline lab]({{ site.baseurl }}/assets/images/5/4/urbanterror2.png)

## Understand the build-specific Urban Terror fallback

The clean design above wraps one whole draw: capture, change, draw, restore. The
course's Urban Terror 4.3.4 cave is different. It runs in the middle of
`glDrawElements`, so it cannot surround the call and restore a snapshot after
that same draw. Instead, it applies a debug state to player-sized draws and
puts assumed engine defaults back on the next ordinary draw.

The fallback uses these functions and constants:

```rust
type GlToggle = unsafe extern "system" fn(capability: u32);
type GlColor4f = unsafe extern "system" fn(r: f32, g: f32, b: f32, a: f32);

const GL_COLOR_MATERIAL: u32 = 0x0B57;
const GL_COLOR_ARRAY: u32 = 0x8076;
const GL_TEXTURE_COORD_ARRAY: u32 = 0x8078;
```

Conceptually, its state transition is:

```rust
// SAFETY: every pointer was resolved from the current opengl32.dll and this
// hook runs on the thread with the current OpenGL context.
unsafe {
    gl_disable_client_state(GL_TEXTURE_COORD_ARRAY);
    gl_disable_client_state(GL_COLOR_ARRAY);
    gl_enable(GL_COLOR_MATERIAL);
    gl_color4f(1.0, 0.6, 0.6, 1.0);

    original(mode, count, element_type, indices);

    gl_enable_client_state(GL_TEXTURE_COORD_ARRAY);
    gl_enable_client_state(GL_COLOR_ARRAY);
    gl_disable(GL_COLOR_MATERIAL);
    gl_color4f(1.0, 1.0, 1.0, 1.0);
}
```

Keep the depth-state calls from the previous lesson around this block. In the
pinned Urban Terror build, player-sized models should appear through walls in
bright red. If the HUD, world, or later effects stay tinted, the assumed
defaults did not match the state owned by that render pass.

This is an exact-build, best-effort fallback—not general OpenGL state
restoration. It assumes texture and color arrays are normally enabled,
`GL_COLOR_MATERIAL` is normally disabled, the current color is white, the depth
range is `0..1`, and the depth function is `GL_LEQUAL`. A renderer may legally
use different values. For a reusable tool, hook at a boundary that encloses one
whole draw and query or track the exact prior state in a typed guard before
changing anything.
{: .block-warning }

Try `count <= 500`, `count > 500`, and no filter while logging samples. The visual differences let you prove which calls your classifier actually catches instead of treating the threshold as magic.

The compiled DLL uses the naked cave from the previous lesson. It resolves all
seven required OpenGL exports, switches to `OPENGL_CHAMS`, and applies this
documented fallback from the render thread. Inject it and press **F3** to toggle
chams; press **End** to restore normal rendering and the original instruction:

```powershell
.\target\i686-pc-windows-msvc\release\injector.exe `
  Quake3-UrT.exe `
  .\target\i686-pc-windows-msvc\release\gha_windows_labs.dll
```

Read the full implementation in [`opengl_hooks.rs`]({{ site.baseurl }}/windows-labs/src/windows_impl/opengl_hooks.rs), especially `apply_urban_terror_gl_state` and `urban_terror_opengl_cave`. Nothing is hidden behind a placeholder.

## Avoid global state leaks

OpenGL is a state machine. A color or depth change remains active until another call changes it. If the menu turns orange, the wrapper did not restore something.

Keep state changes in the narrowest possible scope and test:

- normal models before the target draw;
- the target model;
- normal models after it;
- menus and text;
- level reloads.

Also test early returns and errors. Scope guards help with CPU state, but graphics
APIs may require restoration on the render thread while the correct context is
current. A guard dropped on another thread is not equivalent cleanup.

## Distinguish a category from a render pass

The same player may appear in several passes: shadow, depth prepass, main color,
outline, reflection, or HUD portrait. A filter that recognizes one of those draws
does not automatically recognize the object everywhere. Conversely, a call site
may draw many categories through a shared material pass.

When color appears twice, through a mirror, or only in a shadow, add the current
framebuffer, shader/program, and pass position to the observation before changing
the category rule.

## Use better evidence than one number

A vertex count can be a quick first filter, not a durable identifier. Combine independent clues and include `Unknown` when they disagree.

```rust
fn likely_player(sample: DrawSample, profile: &TargetProfile) -> bool {
    profile.player_counts.contains(&sample.count)
        && profile.player_textures.contains(&sample.texture)
        && profile.player_call_sites.contains(&sample.call_site)
}
```

Version the profile and refuse to activate on an unrecognized build.

## Checkpoint

The lesson succeeds when:

- the normal frame is unchanged with classification disabled;
- only the intended offline model category changes color;
- state is restored after every call;
- unknown samples remain unknown instead of being forced into a category.
