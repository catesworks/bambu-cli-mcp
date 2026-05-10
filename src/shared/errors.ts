import { toolError } from "./types.js";

export class BambuCliError extends Error {
  constructor(
    message: string,
    public readonly stderr: string,
    public readonly exitCode: number,
  ) {
    super(message);
    this.name = "BambuCliError";
  }

  toToolResult() {
    return toolError(`${this.message}\nstderr: ${this.stderr}`);
  }
}

export function handleToolError(error: unknown) {
  if (error instanceof BambuCliError) {
    return error.toToolResult();
  }
  const message =
    error instanceof Error ? error.message : "Unknown error occurred";
  return toolError(message);
}
