# ADR 001: Use pnpm as Package Manager for TypeScript Monorepo

## Status
Accepted

## Context
The bambu-cli-mcp project is a TypeScript monorepo containing multiple MCP servers:
- **bambu-cli-mcp**: MCP server wrapping BambuStudio CLI operations
- **cad-geometry-mcp**: MCP server for geometry operations using manifold-3d

We need to select a package manager that:
1. Provides efficient dependency resolution for multiple workspaces
2. Minimizes disk usage and installation time
3. Supports strict dependency isolation (no phantom dependencies)
4. Has strong monorepo tooling support
5. Works well with TypeScript projects

The primary candidates were npm (bundled with Node.js), yarn (classic and berry), and pnpm.

## Decision
Use **pnpm** as the package manager for this monorepo.

## Reasoning

**Faster Installation Times**
- pnpm uses a content-addressable store that deduplicates dependencies globally across projects
- No need to duplicate files on disk for each workspace
- Installation is significantly faster than npm or yarn classic

**Strict Dependency Resolution**
- pnpm enforces explicit dependency declaration
- Eliminates phantom dependencies (accessing packages not listed in package.json)
- Reduces compatibility issues from implicit transitive dependencies
- Aligns with best practices for monorepo package management

**Disk Efficiency**
- Content-addressable storage means identical versions of a package exist only once on disk
- Saves significant space when managing many workspaces with overlapping dependencies
- Particularly valuable for development environments with multiple projects

**Monorepo Support**
- Native workspace support with `pnpm-workspace.yaml`
- Clean package linking between workspaces
- Better than npm for monorepo scenarios; competitive with yarn workspaces

**Ecosystem Maturity**
- Growing adoption in the TypeScript community
- Good IDE and tooling support (VS Code, TypeScript, ESLint, etc.)
- Active maintenance and community support

## Consequences

### Positive
- Faster local development with quicker dependency installation
- Reduced disk footprint for the monorepo
- Stricter dependency management prevents runtime surprises
- Easy workspace management and cross-workspace linking

### Negative
- Developers must have pnpm installed locally (requires: `npm install -g pnpm`)
- Unfamiliar to developers who have only used npm/yarn
- Some legacy tools may require configuration adjustments for pnpm (mitigated by widespread support in 2024+)
- CI/CD pipelines must install pnpm explicitly

### Implementation Details
- Package lock file: `pnpm-lock.yaml` (should be committed to version control)
- Configuration: `pnpm-workspace.yaml` in repository root
- Monorepo member packages listed in the workspace configuration
- Use `pnpm install` (not `pnpm i`) in documentation for clarity
- CI/CD: Install pnpm via `npm install -g pnpm` or corepack

### Alternatives Considered
- **npm**: Bundled with Node.js but slower for monorepos; phantom dependency issues
- **yarn (berry)**: Excellent alternative but adds complexity for this project's scope
- **npm workspaces**: Native support but slower installation and less strict dependency resolution

## Related Decisions
- ADR 003: Bun compilation (bun also works well with pnpm monorepos)
- ADR 004: MCP Server Architecture (workspaces support the two-server design)
