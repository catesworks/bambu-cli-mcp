/**
 * Read the JSON payload of a bambu-cli-mcp tool result. Throws when the tool
 * reported an error, so a workflow stops at the first failing step.
 */
export function unwrapToolEnvelope<T>(envelope: {
  content: { type: "text"; text: string }[];
  isError?: boolean;
}): T {
  const data = JSON.parse(envelope.content[0].text);
  if (envelope.isError) {
    throw new Error(data.error ?? "Cross-server step failed");
  }
  return data as T;
}
