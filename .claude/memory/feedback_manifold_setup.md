---
name: manifold-3d requires setup() call
description: manifold-3d WASM module requires mod.setup() after initialization to attach static methods and Mesh class
type: feedback
---

manifold-3d v3.4.1 WASM module requires `mod.setup()` to be called after async initialization. Without it, `Mesh` is undefined and static methods like `Manifold.cube()` don't exist.

**Why:** The WASM module exports raw functions (`_Cube`, `_Sphere`, etc.) and `setup()` attaches them as ergonomic static methods on the `Manifold` class. The type definitions describe the post-setup API but the module initializes without it.

**How to apply:** Always call `mod.setup()` immediately after `await init()` in any code using manifold-3d. The engine module caches the initialized instance as a singleton.
