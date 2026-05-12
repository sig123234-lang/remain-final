/** Cursor debug ingest — session 4efa83 (remove after verification). */
const AGENT_DEBUG_URL =
  "http://127.0.0.1:7410/ingest/b8d96487-c0f3-44aa-9d75-1d455b108b4a";
const AGENT_DEBUG_SESSION = "4efa83";

export function agentDebugLog(entry: {
  location: string;
  message: string;
  hypothesisId: string;
  data?: Record<string, unknown>;
  runId?: string;
}) {
  if (typeof fetch === "undefined") {
    return;
  }

  fetch(AGENT_DEBUG_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": AGENT_DEBUG_SESSION,
    },
    body: JSON.stringify({
      sessionId: AGENT_DEBUG_SESSION,
      timestamp: Date.now(),
      ...entry,
    }),
  }).catch(() => {});
}
