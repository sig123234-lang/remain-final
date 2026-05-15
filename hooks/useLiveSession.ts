"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  createSessionCommand,
  getSessionSnapshot,
  updateRecommendationStatus,
  updateSessionCurrentState,
} from "@/services/sessionService";
import { subscribeToSessionRuntime } from "@/services/sessionRealtime";
import type {
  SessionCommandType,
  SessionRecommendationRecord,
  SessionRuntimeState,
  SessionSnapshot,
} from "@/types/session";

export function useLiveSession(
  sessionId: string,
  {
    enableRealtimeMonitor = true,
  }: {
    enableRealtimeMonitor?: boolean;
  } = {}
) {
  const [snapshot, setSnapshot] =
    useState<SessionSnapshot | null>(
      null
    );
  const [isLoading, setIsLoading] =
    useState(true);
  const [error, setError] =
    useState<string | null>(null);

  const hydrate = useCallback(
    async ({
      quiet = false,
    }: { quiet?: boolean } = {}) => {
      if (!quiet) {
        setIsLoading(true);
      }

      try {
        const nextSnapshot =
          await getSessionSnapshot(sessionId);

        setSnapshot(nextSnapshot);
        setError(null);
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "세션을 불러오지 못했어요."
        );
      } finally {
        if (!quiet) {
          setIsLoading(false);
        }
      }
    },
    [sessionId]
  );

  useEffect(() => {
    const timeoutId =
      window.setTimeout(() => {
        void hydrate();
      }, 0);

    if (!enableRealtimeMonitor) {
      return () => {
        window.clearTimeout(timeoutId);
      };
    }

    // 운영 RLS 가 anon SELECT 를 막아 realtime 으로 변경 이벤트가 안 들어온다.
    // 진행자 UI 가 죽지 않도록 7초 간격으로 quiet hydrate.
    const pollId = window.setInterval(() => {
      void hydrate({ quiet: true });
    }, 7_000);

    return () => {
      window.clearTimeout(timeoutId);
      window.clearInterval(pollId);
    };
  }, [
    enableRealtimeMonitor,
    hydrate,
  ]);

  useEffect(() => {
    if (
      !sessionId ||
      !enableRealtimeMonitor
    ) {
      return;
    }

    return subscribeToSessionRuntime(
      sessionId,
      {
        onSessionChange: (
          session
        ) => {
          setSnapshot((previous) =>
            previous
              ? {
                  ...previous,
                  session,
                }
              : previous
          );
        },
        onMessageChange: (
          message
        ) => {
          setSnapshot((previous) => {
            if (!previous) {
              return previous;
            }

            const existingIndex =
              previous.messages.findIndex(
                (
                  currentMessage
                ) =>
                  currentMessage.id ===
                  message.id
              );

            let nextMessages =
              previous.messages;

            if (
              existingIndex >= 0
            ) {
              nextMessages = [
                ...previous.messages,
              ];
              nextMessages[
                existingIndex
              ] = message;
            } else {
              nextMessages = [
                ...previous.messages,
                message,
              ].sort((left, right) =>
                left.created_at.localeCompare(
                  right.created_at
                )
              );
            }

            return {
              ...previous,
              messages:
                nextMessages,
            };
          });
        },
        onRecommendationChange: (
          recommendation
        ) => {
          setSnapshot((previous) => {
            if (!previous) {
              return previous;
            }

            const existingIndex =
              previous.recommendations.findIndex(
                (
                  currentRecommendation
                ) =>
                  currentRecommendation.id ===
                  recommendation.id
              );

            const nextRecommendations =
              existingIndex >= 0
                ? previous.recommendations.map(
                    (
                      currentRecommendation
                    ) =>
                      currentRecommendation.id ===
                      recommendation.id
                        ? recommendation
                        : currentRecommendation
                  )
                : [
                    recommendation,
                    ...previous.recommendations,
                  ];

            return {
              ...previous,
              recommendations:
                nextRecommendations,
            };
          });
        },
        onCommandChange: (
          command
        ) => {
          setSnapshot((previous) => {
            if (!previous) {
              return previous;
            }

            const existingIndex =
              previous.commands.findIndex(
                (
                  currentCommand
                ) =>
                  currentCommand.id ===
                  command.id
              );

            const nextCommands =
              existingIndex >= 0
                ? previous.commands.map(
                    (
                      currentCommand
                    ) =>
                      currentCommand.id ===
                      command.id
                        ? command
                        : currentCommand
                  )
                : [
                    command,
                    ...previous.commands,
                  ];

            return {
              ...previous,
              commands:
                nextCommands,
            };
          });
        },
        onSummaryChange: (
          summary
        ) => {
          setSnapshot((previous) =>
            previous
              ? {
                  ...previous,
                  summary,
                }
              : previous
          );
        },
      }
    );
  }, [
    enableRealtimeMonitor,
    sessionId,
  ]);

  const issueCommand =
    useCallback(
      async (
        commandType: SessionCommandType,
        payload?: Record<
          string,
          unknown
        >
      ) => {
        await createSessionCommand({
          sessionId,
          commandType,
          payload,
          issuedBy: "facilitator",
        });
      },
      [sessionId]
    );

  const sendRecommendation =
    useCallback(
      async (
        recommendation: SessionRecommendationRecord
      ) => {
        await updateRecommendationStatus(
          recommendation.id,
          "selected",
          "facilitator"
        );

        await issueCommand(
          "ask",
          {
            questionText:
              recommendation.question_text,
            rationale:
              recommendation.rationale,
            recommendationId:
              recommendation.id,
          }
        );
      },
      [issueCommand]
    );

  const dismissRecommendation =
    useCallback(
      async (
        recommendationId: string
      ) => {
        await updateRecommendationStatus(
          recommendationId,
          "dismissed",
          "facilitator"
        );
      },
      []
    );

  const saveFacilitatorNote =
    useCallback(
      async (
        currentState: SessionRuntimeState,
        note: string
      ) => {
        await updateSessionCurrentState(
          sessionId,
          {
            ...currentState,
            facilitatorNote:
              note,
          }
        );
      },
      [sessionId]
    );

  const assistantMessages =
    snapshot?.messages.filter(
      (message) =>
        message.role ===
        "assistant"
    ) ?? [];
  const userMessages =
    snapshot?.messages.filter(
      (message) =>
        message.role === "user"
    ) ?? [];
  const latestMessage =
    snapshot?.messages.at(-1) ?? null;

  return {
    snapshot,
    isLoading,
    error,
    hydrate,
    issueCommand,
    sendRecommendation,
    dismissRecommendation,
    saveFacilitatorNote,
    assistantMessages,
    userMessages,
    latestMessage,
  };
}
