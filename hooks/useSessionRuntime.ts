"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  ACTIVE_SESSION_STORAGE_KEY,
  REMAIN_DEFAULT_ELDER_ID,
  REMAIN_FIRST_QUESTION,
} from "@/lib/remain-config";
import {
  addMessage,
  createInitialRuntimeState,
  createSession,
  createSessionRecommendations,
  endSession,
  getSessionSnapshot,
  saveSessionSummary,
  updateCommandStatus,
  updateRecommendationStatus,
  updateSessionCurrentState,
} from "@/services/sessionService";
import { subscribeToSessionRuntime } from "@/services/sessionRealtime";
import type {
  ChatCompletionPayload,
  SessionCommandRecord,
  SessionMessageRecord,
  SessionRecommendationRecord,
  SessionRuntimeState,
} from "@/types/session";

type AiStatus =
  | "waiting"
  | "speaking"
  | "listening"
  | "thinking";

interface UseSessionRuntimeParams {
  elderId?: string;
  firstQuestion?: string;
  facilityId?: string;
}

interface LocalSessionSnapshot {
  sessionId: string;
  messages: SessionMessageRecord[];
  recommendations: SessionRecommendationRecord[];
  currentState: SessionRuntimeState;
}

function isLocalSessionId(
  sessionId: string | null
) {
  return (
    typeof sessionId === "string" &&
    sessionId.startsWith("local:")
  );
}

export function useSessionRuntime({
  elderId,
  firstQuestion = REMAIN_FIRST_QUESTION,
  facilityId,
}: UseSessionRuntimeParams) {
  const [sessionId, setSessionId] =
    useState<string | null>(null);
  const [messages, setMessages] =
    useState<SessionMessageRecord[]>(
      []
    );
  const [recommendations, setRecommendations] =
    useState<
      SessionRecommendationRecord[]
    >([]);
  const [currentState, setCurrentState] =
    useState<SessionRuntimeState>(
      createInitialRuntimeState(
        firstQuestion
      )
    );
  const [isLoading, setIsLoading] =
    useState(true);
  const [isEndingSession, setIsEndingSession] =
    useState(false);
  const [error, setError] =
    useState<string | null>(null);
  const [status, setStatus] =
    useState<AiStatus>("waiting");
  const handledCommandsRef =
    useRef<Set<string>>(new Set());
  const effectiveElderId =
    elderId ??
    REMAIN_DEFAULT_ELDER_ID;
  const sessionStorageKey = `${ACTIVE_SESSION_STORAGE_KEY}:${
    effectiveElderId
  }`;
  const localSessionStorageKey = `${sessionStorageKey}:snapshot`;

  const currentQuestion =
    currentState.currentQuestion ||
    firstQuestion;

  const saveLocalSnapshot =
    useCallback(
      (
        snapshot: LocalSessionSnapshot
      ) => {
        if (
          typeof window ===
          "undefined"
        ) {
          return;
        }

        window.sessionStorage.setItem(
          sessionStorageKey,
          snapshot.sessionId
        );
        window.sessionStorage.setItem(
          localSessionStorageKey,
          JSON.stringify(snapshot)
        );
      },
      [
        localSessionStorageKey,
        sessionStorageKey,
      ]
    );

  const loadLocalSnapshot =
    useCallback(() => {
      if (
        typeof window ===
        "undefined"
      ) {
        return null;
      }

      const rawSnapshot =
        window.sessionStorage.getItem(
          localSessionStorageKey
        );

      if (!rawSnapshot) {
        return null;
      }

      try {
        return JSON.parse(
          rawSnapshot
        ) as LocalSessionSnapshot;
      } catch {
        return null;
      }
    }, [localSessionStorageKey]);

  const clearLocalSnapshot =
    useCallback(() => {
      if (
        typeof window ===
        "undefined"
      ) {
        return;
      }

      window.sessionStorage.removeItem(
        localSessionStorageKey
      );
    }, [localSessionStorageKey]);

  const createLocalSession =
    useCallback(() => {
      const initialState =
        createInitialRuntimeState(
          firstQuestion
        );
      const nextSessionId = `local:${crypto.randomUUID()}`;
      const openingMessageId = `local-msg:${crypto.randomUUID()}`;
      const openingMessage: SessionMessageRecord =
        {
          id: openingMessageId,
          session_id: nextSessionId,
          elder_id:
            effectiveElderId,
          role: "assistant",
          content: firstQuestion,
          source: "ai",
          turn_index: 0,
          sequence_in_turn: 0,
          metadata: {
            kind: "opening",
          },
          is_final: true,
          created_at:
            new Date().toISOString(),
        };

      const snapshot: LocalSessionSnapshot =
        {
          sessionId:
            nextSessionId,
          messages: [
            openingMessage,
          ],
          recommendations:
            [],
          currentState:
            initialState,
        };

      setSessionId(nextSessionId);
      setCurrentState(
        initialState
      );
      setMessages([
        openingMessage,
      ]);
      setRecommendations([]);
      saveLocalSnapshot(
        snapshot
      );

      return snapshot;
    }, [
      effectiveElderId,
      firstQuestion,
      saveLocalSnapshot,
    ]);

  const applyRealtimeMessage =
    useCallback(
      (
        nextMessage: SessionMessageRecord
      ) => {
        setMessages((previous) => {
          const existingIndex =
            previous.findIndex(
              (message) =>
                message.id ===
                nextMessage.id
            );

          if (existingIndex >= 0) {
            const copy = [...previous];
            copy[existingIndex] =
              nextMessage;
            return copy;
          }

          return [...previous, nextMessage]
            .sort((left, right) =>
              left.created_at.localeCompare(
                right.created_at
              )
            );
        });
      },
      []
    );

  const applyRealtimeRecommendation =
    useCallback(
      (
        nextRecommendation: SessionRecommendationRecord
      ) => {
        setRecommendations(
          (previous) => {
            const existingIndex =
              previous.findIndex(
                (
                  recommendation
                ) =>
                  recommendation.id ===
                  nextRecommendation.id
              );

            if (
              existingIndex >= 0
            ) {
              const copy = [
                ...previous,
              ];
              copy[existingIndex] =
                nextRecommendation;
              return copy;
            }

            return [
              nextRecommendation,
              ...previous,
            ];
          }
        );
      },
      []
    );

  const finalizeSession =
    useCallback(async () => {
      if (
        !sessionId ||
        isEndingSession
      ) {
        return;
      }

      setIsEndingSession(true);

      try {
        await saveSessionSummary({
          sessionId,
          elderId:
            effectiveElderId,
          summary:
            currentState.sessionSummary,
          familyFriendlySummary:
            currentState.sessionSummary,
          emotions: [
            currentState.emotionDetected,
          ],
        });

        await endSession(
          sessionId,
          currentState.sessionSummary,
          currentState.emotionDetected,
          currentState
        );

        if (
          typeof window !==
          "undefined"
        ) {
          window.sessionStorage.removeItem(
            sessionStorageKey
          );
        }
        clearLocalSnapshot();
      } finally {
        setIsEndingSession(false);
      }
    }, [
      clearLocalSnapshot,
      currentState,
      effectiveElderId,
      isEndingSession,
      sessionStorageKey,
      sessionId,
    ]);

  const applyCommandEffect =
    useCallback(
      async (
        command: SessionCommandRecord
      ) => {
        if (
          command.status !== "queued" ||
          handledCommandsRef.current.has(
            command.id
          )
        ) {
          return;
        }

        handledCommandsRef.current.add(
          command.id
        );

        const payload =
          command.payload ?? {};
        let nextState =
          currentState;

        switch (
          command.command_type
        ) {
          case "ask": {
            const question =
              typeof payload.questionText ===
              "string"
                ? payload.questionText
                : currentQuestion;

            nextState = {
              ...currentState,
              action:
                "facilitator_intervention",
              currentQuestion:
                question,
              activeCommandId:
                command.id,
              facilitatorNote:
                typeof payload.note ===
                "string"
                  ? payload.note
                  : currentState.facilitatorNote,
            };

            setCurrentState(nextState);

            if (sessionId) {
              await addMessage({
                sessionId,
                elderId:
                  effectiveElderId,
                role: "assistant",
                content: question,
                source:
                  "facilitator",
                turnIndex:
                  nextState.turnCount,
                sequenceInTurn: 2,
                metadata: {
                  commandId:
                    command.id,
                },
              });

              await updateSessionCurrentState(
                sessionId,
                nextState
              );
            }

            break;
          }

          case "deepen":
          case "soften":
          case "switch_topic":
          case "safety_pause":
          case "take_over":
          case "note": {
            nextState = {
              ...currentState,
              action:
                command.command_type,
              currentTopic:
                typeof payload.topic ===
                "string"
                  ? payload.topic
                  : currentState.currentTopic,
              facilitatorNote:
                typeof payload.note ===
                "string"
                  ? payload.note
                  : currentState.facilitatorNote,
              activeCommandId:
                command.id,
            };

            setCurrentState(nextState);

            if (sessionId) {
              await updateSessionCurrentState(
                sessionId,
                nextState
              );
            }

            break;
          }

          case "end_session": {
            await finalizeSession();
            break;
          }
        }

        await updateCommandStatus(
          command.id,
          "applied"
        );
      },
      [
        currentQuestion,
        currentState,
        effectiveElderId,
        finalizeSession,
        sessionId,
      ]
    );

  const hydrateSession =
    useCallback(
      async (
        nextSessionId: string
      ) => {
        const snapshot =
          await getSessionSnapshot(
            nextSessionId
          );

        setSessionId(nextSessionId);
        setMessages(snapshot.messages);
        setRecommendations(
          snapshot.recommendations
        );
        setCurrentState(
          snapshot.session
            .current_state ??
            createInitialRuntimeState(
              firstQuestion
            )
        );

        if (
          typeof window !==
          "undefined"
        ) {
          window.sessionStorage.setItem(
            sessionStorageKey,
            nextSessionId
          );
        }
      },
      [
        firstQuestion,
        sessionStorageKey,
      ]
    );

  const initializeSession =
    useCallback(async () => {
      setIsLoading(true);
      setError(null);

      try {
        const storedSessionId =
          typeof window ===
          "undefined"
            ? null
            : window.sessionStorage.getItem(
                sessionStorageKey
              );

        if (storedSessionId) {
          if (
            isLocalSessionId(
              storedSessionId
            )
          ) {
            const localSnapshot =
              loadLocalSnapshot();

            if (
              localSnapshot
            ) {
              setSessionId(
                localSnapshot.sessionId
              );
              setMessages(
                localSnapshot.messages
              );
              setRecommendations(
                localSnapshot.recommendations
              );
              setCurrentState(
                localSnapshot.currentState
              );
              setIsLoading(false);
              return;
            }

            if (
              typeof window !==
              "undefined"
            ) {
              window.sessionStorage.removeItem(
                sessionStorageKey
              );
            }
            clearLocalSnapshot();
          }

          try {
            const snapshot =
              await getSessionSnapshot(
                storedSessionId
              );

            if (
              snapshot.session
                .status === "active"
            ) {
              setSessionId(
                storedSessionId
              );
              setMessages(
                snapshot.messages
              );
              setRecommendations(
                snapshot.recommendations
              );
              setCurrentState(
                snapshot.session
                  .current_state ??
                  createInitialRuntimeState(
                    firstQuestion
                  )
              );
              setIsLoading(false);
              return;
            }
          } catch {
            // Clear invalid cached session ids and fall through to create a fresh session.
          }

          if (
            typeof window !==
            "undefined"
          ) {
            window.sessionStorage.removeItem(
              sessionStorageKey
            );
          }
        }

        const initialState =
          createInitialRuntimeState(
            firstQuestion
          );

        const session =
          await createSession({
            elderId:
              effectiveElderId,
            facilityId,
            initialState,
          });

        const openingMessage =
          await addMessage({
            sessionId: session.id,
            elderId:
              effectiveElderId,
            role: "assistant",
            content: firstQuestion,
            source: "ai",
            turnIndex: 0,
            sequenceInTurn: 0,
            metadata: {
              kind: "opening",
            },
          });

        setSessionId(session.id);
        setCurrentState(
          initialState
        );
        setMessages([
          openingMessage,
        ]);
        setRecommendations([]);

        if (
          typeof window !==
          "undefined"
        ) {
          window.sessionStorage.setItem(
            sessionStorageKey,
            session.id
          );
        }
      } catch (caughtError) {
        const message =
          caughtError instanceof Error
            ? caughtError.message
            : "세션을 준비하지 못했어요.";

        if (
          message.includes(
            "row-level security"
          ) ||
          message.includes(
            "Unauthorized"
          )
        ) {
          createLocalSession();
          setError(null);
        } else {
          setError(message);
        }
      } finally {
        setIsLoading(false);
      }
    }, [
      clearLocalSnapshot,
      createLocalSession,
      effectiveElderId,
      facilityId,
      firstQuestion,
      loadLocalSnapshot,
      sessionStorageKey,
    ]);

  useEffect(() => {
    const timeoutId =
      window.setTimeout(() => {
        void initializeSession();
      }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [initializeSession]);

  useEffect(() => {
    if (!sessionId) {
      return;
    }

    if (
      isLocalSessionId(
        sessionId
      )
    ) {
      return;
    }

    return subscribeToSessionRuntime(
      sessionId,
      {
        onSessionChange: (
          session
        ) => {
          if (
            session.current_state
          ) {
            setCurrentState(
              session.current_state
            );
          }
        },
        onMessageChange:
          applyRealtimeMessage,
        onRecommendationChange:
          applyRealtimeRecommendation,
        onCommandChange: (
          command
        ) => {
          void applyCommandEffect(
            command
          );
        },
      }
    );
  }, [
    applyCommandEffect,
    applyRealtimeMessage,
    applyRealtimeRecommendation,
    sessionId,
  ]);

  const persistRuntimeState =
    useCallback(
      async (
        nextState: SessionRuntimeState
      ) => {
        setCurrentState(nextState);

        if (!sessionId) {
          return;
        }

        if (
          isLocalSessionId(
            sessionId
          )
        ) {
          saveLocalSnapshot(
            {
              sessionId,
              messages,
              recommendations,
              currentState:
                nextState,
            }
          );
          return;
        }

        await updateSessionCurrentState(
          sessionId,
          nextState
        );
      },
      [
        messages,
        recommendations,
        saveLocalSnapshot,
        sessionId,
      ]
    );

  const processUserTurn =
    useCallback(
      async (
        transcript: string
      ) => {
        if (!sessionId) {
          return;
        }

        const cleanAnswer =
          transcript.trim();

        if (!cleanAnswer) {
          return;
        }

        setStatus("thinking");

        const nextTurnCount =
          currentState.turnCount + 1;

        if (
          isLocalSessionId(
            sessionId
          )
        ) {
          const createdAt =
            new Date().toISOString();
          const userMessage: SessionMessageRecord =
            {
              id: `local-msg:${crypto.randomUUID()}`,
              session_id:
                sessionId,
              elder_id:
                effectiveElderId,
              role: "user",
              content:
                cleanAnswer,
              source:
                "browser-stt",
              turn_index:
                nextTurnCount,
              sequence_in_turn: 0,
              metadata: {
                kind: "elder-answer",
              },
              is_final: true,
              created_at:
                createdAt,
            };

          const updatedMessages = [
            ...messages,
            userMessage,
          ];

          setMessages(
            updatedMessages
          );

          const completionMessages =
            updatedMessages.map(
              (message) => ({
                role: message.role,
                content:
                  message.content,
              })
            );

          const response = await fetch(
            "/api/chat",
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify(
                {
                  messages:
                    completionMessages,
                  sessionState:
                    currentState,
                }
              ),
            }
          );

          const data =
            (await response.json()) as ChatCompletionPayload;

          const assistantMessage: SessionMessageRecord =
            {
              id: `local-msg:${crypto.randomUUID()}`,
              session_id:
                sessionId,
              elder_id:
                effectiveElderId,
              role: "assistant",
              content:
                data.speech,
              emotion:
                data.emotionDetected,
              risk_level:
                data.riskLevel,
              source: "ai",
              turn_index:
                nextTurnCount,
              sequence_in_turn: 1,
              metadata: {
                facilitatorNote:
                  data.facilitatorNote,
                responsePattern:
                  data.responsePattern,
                questionType:
                  data.questionType,
                tailType:
                  data.tailType,
              },
              is_final: true,
              created_at:
                new Date().toISOString(),
            };

          const nextState: SessionRuntimeState =
            {
              ...currentState,
              turnCount:
                nextTurnCount,
              depthLevel:
                data.depthLevel || 1,
              emotionDetected:
                data.emotionDetected ||
                "neutral",
              riskLevel:
                data.riskLevel ||
                "low",
              action:
                data.action ||
                "continue",
              facilitatorNote:
                data.facilitatorNote ||
                "",
              currentQuestion:
                data.speech ||
                currentState.currentQuestion,
              sessionSummary:
                data.sessionSummaryUpdate ||
                currentState.sessionSummary,
              turnSummary:
                data.turnSummary ||
                "",
              lastSpeaker:
                "assistant",
            };

          const nextRecommendations: SessionRecommendationRecord[] =
            (data.recommendations ||
              []).map(
              (
                recommendation,
                index
              ) => ({
                id: `local-rec:${crypto.randomUUID()}`,
                session_id:
                  sessionId,
                question_text:
                  recommendation.question,
                rationale:
                  recommendation.rationale,
                target_emotion:
                  recommendation.targetEmotion,
                target_depth:
                  recommendation.targetDepth,
                target_memory:
                  recommendation.targetMemory,
                risk_flag:
                  recommendation.riskFlag,
                rank:
                  index + 1,
                status:
                  "suggested",
                created_by:
                  "ai",
                created_at:
                  new Date().toISOString(),
              })
            );

          setMessages([
            ...updatedMessages,
            assistantMessage,
          ]);
          setRecommendations(
            nextRecommendations
          );
          setCurrentState(
            nextState
          );
          saveLocalSnapshot(
            {
              sessionId,
              messages: [
                ...updatedMessages,
                assistantMessage,
              ],
              recommendations:
                nextRecommendations,
              currentState:
                nextState,
            }
          );
          setStatus("waiting");

          return {
            aiMessage:
              data.speech,
            ttsText:
              data.tts_text ||
              data.speech,
            state: nextState,
            assistantMessage,
          };
        }

        const userMessage =
          await addMessage({
            sessionId,
            elderId:
              effectiveElderId,
            role: "user",
            content: cleanAnswer,
            source:
              "browser-stt",
            turnIndex:
              nextTurnCount,
            sequenceInTurn: 0,
            metadata: {
              kind: "elder-answer",
            },
          });

        applyRealtimeMessage(
          userMessage
        );

        const updatedMessages = [
          ...messages,
          userMessage,
        ].map((message) => ({
          role: message.role,
          content:
            message.content,
        }));

        const response = await fetch(
          "/api/chat",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              messages:
                updatedMessages,
              sessionState:
                currentState,
            }),
          }
        );

        const data =
          (await response.json()) as ChatCompletionPayload;

        const assistantMessage =
          await addMessage({
            sessionId,
            elderId:
              effectiveElderId,
            role: "assistant",
            content: data.speech,
            emotion:
              data.emotionDetected,
            riskLevel:
              data.riskLevel,
            source: "ai",
            turnIndex:
              nextTurnCount,
            sequenceInTurn: 1,
            metadata: {
              facilitatorNote:
                data.facilitatorNote,
              responsePattern:
                data.responsePattern,
              questionType:
                data.questionType,
              tailType:
                data.tailType,
            },
          });

        applyRealtimeMessage(
          assistantMessage
        );

        const nextState: SessionRuntimeState =
          {
            ...currentState,
            turnCount:
              nextTurnCount,
            depthLevel:
              data.depthLevel || 1,
            emotionDetected:
              data.emotionDetected ||
              "neutral",
            riskLevel:
              data.riskLevel || "low",
            action:
              data.action ||
              "continue",
            facilitatorNote:
              data.facilitatorNote ||
              "",
            currentQuestion:
              data.speech ||
              currentState.currentQuestion,
            sessionSummary:
              data.sessionSummaryUpdate ||
              currentState.sessionSummary,
            turnSummary:
              data.turnSummary ||
              "",
            lastSpeaker:
              "assistant",
          };

        await persistRuntimeState(
          nextState
        );

        const createdRecommendations =
          await createSessionRecommendations(
            sessionId,
            "ai",
            data.recommendations ||
              [],
            assistantMessage.id
          );

        setRecommendations(
          createdRecommendations
        );
        setStatus("waiting");

        return {
          aiMessage:
            data.speech,
          ttsText:
            data.tts_text ||
            data.speech,
          state: nextState,
          assistantMessage,
        };
      },
      [
        applyRealtimeMessage,
        currentState,
        effectiveElderId,
        saveLocalSnapshot,
        messages,
        persistRuntimeState,
        sessionId,
      ]
    );

  const markRecommendationSent =
    useCallback(
      async (
        recommendationId: string,
        sentMessageId?: string
      ) => {
        const updated =
          await updateRecommendationStatus(
            recommendationId,
            "sent",
            "facilitator",
            sentMessageId
          );

        applyRealtimeRecommendation(
          updated
        );
      },
      [
        applyRealtimeRecommendation,
      ]
    );

  const dismissRecommendation =
    useCallback(
      async (
        recommendationId: string
      ) => {
        const updated =
          await updateRecommendationStatus(
            recommendationId,
            "dismissed",
            "facilitator"
          );

        applyRealtimeRecommendation(
          updated
        );
      },
      [
        applyRealtimeRecommendation,
      ]
    );

  const resumeSession =
    useCallback(
      async (
        nextSessionId: string
      ) => {
        await hydrateSession(
          nextSessionId
        );
      },
      [hydrateSession]
    );

  const runtimeSnapshot =
    useMemo(
      () => ({
        sessionId,
        messages,
        recommendations,
        currentState,
        currentQuestion,
        status,
        isLoading,
        isEndingSession,
        error,
      }),
      [
        currentQuestion,
        currentState,
        error,
        isEndingSession,
        isLoading,
        messages,
        recommendations,
        sessionId,
        status,
      ]
    );

  return {
    ...runtimeSnapshot,
    setStatus,
    processUserTurn,
    persistRuntimeState,
    resumeSession,
    initializeSession,
    finalizeSession,
    markRecommendationSent,
    dismissRecommendation,
  };
}
