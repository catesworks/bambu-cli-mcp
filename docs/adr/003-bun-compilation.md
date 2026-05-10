# ADR 003: Use `bun build --compile` for Single-File Executable Distribution

## Status
Accepted

## Context
The MCP servers (bambu-cli-mcp and cad-geometry-mcp) need to be distributed to users. Currently, end users must:
- Install Node.js
- Install pnpm
- Clone the repository
- Run `pnpm install` and `pnpm build`
- Configure their MCP client to point to the server

This creates friction for adoption. Ideally, users should be able to:
- Download a single executable file
- Run it directly with configuration parameters
- Integrate with their MCP client without managing dependencies

The primary options for distribution are:

1. **Node.js binary distribution**: Distribute the JavaScript source or compiled/bundled code
   - Requires end-user Node.js installation
   - Still requires runtime dependency management
   - Not a true single-file executable

2. **Docker container**: Package the server as a container image
   - Eliminates host dependencies
   - Adds operational complexity (container runtime required)
   - Larger artifact size
   - Not portable for all user environments

3. **Native compilation (GraalVM, pkg, ncc)**: Compile to native binary
   - GraalVM: Steep learning curve, limited ecosystem support
   - pkg: Older, less maintained
   - ncc: Bundles but still requires Node.js runtime

4. **bun build --compile**: Bun's native executable compilation
   - Single executable with embedded runtime
   - No external Node.js/pnpm dependency required
   - Suitable for CLI tools and servers
   - Smaller file size than Docker
   - New but actively maintained (Oven.sh)

## Decision
Use **`bun build --compile`** to produce single-file executables for distribution.

## Reasoning

**Zero Runtime Dependencies**
- Bun embeds its runtime in the compiled executable
- End users do not need to install Node.js, pnpm, or any other dependencies
- Single file drop-in distribution model

**Simplified User Onboarding**
- Download executable → Configure MCP client → Done
- No setup steps or package manager learning curve
- Reduces support burden for deployment issues
- Attractive for non-technical users

**Faster Distribution**
- No need to wait for npm/pnpm operations on user machines
- Server starts immediately after download
- No transitive dependency resolution on user systems

**Suitable for CLI/Server Pattern**
- bun compile is well-suited for command-line tools and servers
- MCP servers are stateless, single-purpose processes
- Good fit for headless execution model

**Cost Efficiency**
- Single executable is smaller than Docker images
- Easy to distribute via GitHub releases
- Works with standard file hosting (no container registry needed)

**Alignment with Project Stack**
- pnpm manages the build environment (ADR 001)
- manifold-3d WASM bundles cleanly with bun (ADR 002)
- Development remains in Node.js/TypeScript; distribution becomes bun-compiled

## Consequences

### Positive
- Drastically lower barrier to entry for end users
- Single binary distribution is portable across systems
- Fast startup time (no JIT warmup like Node.js)
- Smaller download size than Docker images
- Aligns with Unix philosophy (single executable)

### Negative
- Requires testing compiled binaries at each phase
- WASM modules (manifold-3d) must be verified to bundle correctly
- Bun ecosystem is newer; less community precedent for large projects
- If bun bundling fails, requires fallback to Node.js distribution
- Larger file size than non-compiled JavaScript distribution (but still reasonable)

### Implementation Details

**Build Process**
```bash
# Compile bambu-cli-mcp server
bun build --compile --target bun ./packages/bambu-cli-mcp/src/index.ts --outfile ./dist/bambu-cli-mcp

# Compile cad-geometry-mcp server
bun build --compile --target bun ./packages/cad-geometry-mcp/src/index.ts --outfile ./dist/cad-geometry-mcp
```

**Testing Strategy**
- Test compiled binary on Linux, macOS, Windows (minimum)
- Verify WASM module loading in compiled binary
- Verify manifest-3d geometry operations work in compiled context
- Include binary test in CI/CD pipeline

**Distribution**
- Upload compiled binaries to GitHub Releases
- Document installation: "Download and run"
- Include platform-specific binaries (darwin-x64, darwin-arm64, linux-x64, etc.)

**Fallback Plan**
- If bun --compile has insurmountable issues with WASM bundling:
  - Use `bun build` to create a bundled JavaScript file
  - Distribute with a minimal Node.js shim or instructions to use bun runtime
  - Still simpler than full pnpm workflow, but not zero-dependency

**Version Management**
- Include version in compiled binary (bun allows embedding metadata)
- Compile binaries for each release tag
- Keep Node.js/TypeScript development stack separate from distribution artifacts

## Tradeoffs

| Criterion | bun --compile | Node.js + pkg | Docker |
|-----------|--------------|---------------|--------|
| **Dependencies** | None (zero-dep) | Requires Node.js | Container runtime |
| **File size** | ~80-150 MB | ~80-120 MB | 300+ MB |
| **Distribution** | Single file | Single file | Registry required |
| **User complexity** | Minimal | Low | Medium |
| **Platform support** | Linux, macOS, Windows | Linux, macOS, Windows | Linux, macOS, Windows + more |
| **Ecosystem maturity** | Emerging | Mature | Mature |

## Risk Mitigation

**WASM Bundling Risk**
- manifold-3d is a WASM module; ensure it loads correctly in compiled context
- Test early in development (Phase 1)
- Document any workarounds or limitations
- Monitor bun project for WASM bundling improvements

**Binary Size**
- Compiled bun executables are larger than expected (~100-150 MB)
- Document expected size to users
- Consider splitting binaries by server (bambu-cli-mcp vs cad-geometry-mcp)

**Updates and Patching**
- Recompile and re-release on critical updates
- Use semantic versioning for releases
- Automate binary generation in CI/CD

## Related Decisions
- ADR 001: pnpm Monorepo (manages build environment)
- ADR 002: Node.js + manifold-3d (WASM bundling must work)
- ADR 004: MCP Server Architecture (both servers will have compiled binaries)
