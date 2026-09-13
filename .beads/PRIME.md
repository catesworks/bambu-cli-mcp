<!-- Written by the beads-superpowers plugin (safety net).
     Your session hook injects a curated beads context, so `bd prime` here
     returns this lean pointer instead of the full memory dump.
     To restore full `bd prime` output: delete this file.
     To stop it being recreated: bd config set custom.prime-safety-net false -->
# Beads Workflow (lean pointer)
Session context is injected by the beads-superpowers hook.
- Work queue: `bd ready -n 10` · commands: `bd human` · syntax: `bd <cmd> --help` first (the binary is SSOT)
- Memories: `bd memories <keyword>` · one memory: `bd recall <key>`
- Full default prime content: `bd prime --export`
