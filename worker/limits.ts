/** Input limits for /api and /mcp. Generous for real use, small enough to keep work per request bounded. */
export const LIMITS = {
  /** Show id or title. */
  show: 100,
  /** An episode position: "S2E1", "season 2 episode 1". */
  position: 40,
  /** Search text, a character name, a term. */
  text: 200,
  /** Request body of one MCP call. */
  mcpBody: 64 * 1024,
};
