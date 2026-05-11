"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type {
  SessionCommandRecord,
  SessionMessageRecord,
  SessionRecommendationRecord,
  SessionRecord,
  SessionSummaryRecord,
} from "@/types/session";

interface SessionRealtimeHandlers {
  onSessionChange?: (
    session: SessionRecord
  ) => void;
  onMessageChange?: (
    message: SessionMessageRecord
  ) => void;
  onRecommendationChange?: (
    recommendation: SessionRecommendationRecord
  ) => void;
  onCommandChange?: (
    command: SessionCommandRecord
  ) => void;
  onSummaryChange?: (
    summary: SessionSummaryRecord
  ) => void;
}

export function subscribeToSessionRuntime(
  sessionId: string,
  handlers: SessionRealtimeHandlers
) {
  const supabase =
    getSupabaseBrowserClient();

  const channel = supabase.channel(
    `session-runtime:${sessionId}`
  );

  channel.on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "sessions",
      filter: `id=eq.${sessionId}`,
    },
    (payload) => {
      if (payload.new) {
        handlers.onSessionChange?.(
          payload.new as SessionRecord
        );
      }
    }
  );

  channel.on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "messages",
      filter: `session_id=eq.${sessionId}`,
    },
    (payload) => {
      if (payload.new) {
        handlers.onMessageChange?.(
          payload.new as SessionMessageRecord
        );
      }
    }
  );

  channel.on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "session_recommendations",
      filter: `session_id=eq.${sessionId}`,
    },
    (payload) => {
      if (payload.new) {
        handlers.onRecommendationChange?.(
          payload.new as SessionRecommendationRecord
        );
      }
    }
  );

  channel.on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "session_commands",
      filter: `session_id=eq.${sessionId}`,
    },
    (payload) => {
      if (payload.new) {
        handlers.onCommandChange?.(
          payload.new as SessionCommandRecord
        );
      }
    }
  );

  channel.on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "session_summaries",
      filter: `session_id=eq.${sessionId}`,
    },
    (payload) => {
      if (payload.new) {
        handlers.onSummaryChange?.(
          payload.new as SessionSummaryRecord
        );
      }
    }
  );

  channel.subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

export function subscribeToActiveSessions(
  onSessionChange: (
    session: SessionRecord
  ) => void
) {
  const supabase =
    getSupabaseBrowserClient();

  const channel = supabase.channel(
    "active-sessions"
  );

  channel.on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "sessions",
    },
    (payload) => {
      if (payload.new) {
        onSessionChange(
          payload.new as SessionRecord
        );
      }
    }
  );

  channel.subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
