# Setup Guide

## Installation

### 1. Install BambuStudio

Download and install from [bambulab.com](https://bambulab.com/en/download/studio).

The CLI binary is located at:
- **macOS**: `/Applications/BambuStudio.app/Contents/MacOS/BambuStudio`
- **Linux**: Typically `/usr/bin/bambu-studio` or wherever you installed it
- **Windows**: `C:\Program Files\BambuStudio\bambu-studio.exe`

You can override the path with the `BAMBU_STUDIO_PATH` environment variable.

### 2. Build the MCP Server

```bash
git clone <repo-url>
cd bambu-cli-mcp
pnpm install
pnpm build
```

### 3. Configure Your MCP Client

#### Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "bambu-cli-mcp": {
      "command": "node",
      "args": ["/absolute/path/to/bambu-cli-mcp/dist/index.js"]
    }
  }
}
```

#### Claude Code

Add to your project's `.claude/settings.json` or `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "bambu-cli-mcp": {
      "command": "node",
      "args": ["/absolute/path/to/bambu-cli-mcp/dist/index.js"]
    }
  }
}
```

### 4. Verify

After restarting your MCP client, call `inspect_bambu_cli` — it should return the BambuStudio version and available flags.

## Printer Profiles

Export your current BambuStudio settings using the `export_settings` tool, or manually copy JSON profiles from:

```
~/.config/BambuStudio/user/        # Linux
~/Library/Application Support/BambuStudio/user/  # macOS
```

Place profiles in the `profiles/` directory:
- `profiles/printers/` — machine configs
- `profiles/process/` — print process configs (layer height, speed, etc.)
- `profiles/filament/` — filament configs (temps, flow, etc.)

## Troubleshooting

### BambuStudio not found

Set the `BAMBU_STUDIO_PATH` environment variable:

```bash
export BAMBU_STUDIO_PATH="/path/to/BambuStudio"
```

### CLI hangs on headless systems

BambuStudio CLI may require a display server. On headless Linux, use `xvfb-run`:

```bash
xvfb-run node dist/index.js
```

All CLI calls have a 5-minute timeout by default.
