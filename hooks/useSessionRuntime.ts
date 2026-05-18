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
  buildReturningOpening,
  REMAIN_DEFAULT_ELDER_ID,
  REMAIN_FIRST_QUESTION,
} from "@/lib/remain-config";
import {
  addMessage,
  createInitialRuntimeState,
  createSession,
  createSessionRecommendations,
  endSession,
  getLastEndedSession,
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
  SessionStatus,
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
  autoInitialize?: boolean;
}

export function useSessionRuntime({
  elderId,
  firstQuestion = REMAIN_FIRST_QUESTION,
  facilityId,
  autoInitialize = true,
}: UseSessionRuntimeParams) {
  const [sessionId, setSessionId] =
    useState<string | null>(null);
  const [messages, setMessages] =
    useState<SessionMessageRecord[]>([]);
  const [recommendations, setRecommendations] =
    useState<SessionRecommendationRecord[]>([]);
  const [currentState, setCurrentState] =
    useState<SessionRuntimeState>(() => ({
      // currentQuestion 을 일부러 빈 문자열로 시작한다. 그러면 아래의
      // `currentState.currentQuestion || effectiveFirstQuestion` 폴백 덕에,
      // 마운트 후 비동기로 setReturningOpening 이 들어오면 UI 가 자동으로
      // "지난번엔 ... 이야기를 나누셨지요. 오늘은 ..." 로 갱신된다.
      ...createInitialRuntimeState(firstQuestion),
      currentQuestion: "",
    }));
  const [isLoading, setIsLoading] =
    useState(autoInitialize);
  const [isEndingSession, setIsEndingSession] =
    useState(false);
  const [sessionStatus, setSessionStatus] =
    useState<SessionStatus>("active");
  const [error, setError] =
    useState<string | null>(null);
  const [status, setStatus] =
    useState<AiStatus>("waiting");
  const handledCommandsRef =
    useRef<Set<string>>(new Set());
  const effectiveElderId =
    elderId ?? REMAIN_DEFAULT_ELDER_ID;
  const sessionStorageKey = `${ACTIVE_SESSION_STORAGE_KEY}:${effectiveElderId}`;

  // 이전 ended 세션의 summary 로부터 만들어진 오프닝. 없으면 firstQuestion (기본).
  // 페이지 마운트 시 비동기로 fetch 해서 set. 사용자가 voice button 탭하기 전에
  // 보통 도착해서 첫 발화가 이걸 사용한다.
  const [returningOpening, setReturningOpening] =
    useState<string | null>(null);
  const effectiveFirstQuestion =
    returningOpening || firstQuestion;

  const currentQuestion =
    currentState.currentQuestion ||
    effectiveFirstQuestion;

  const applyRealtimeMessage = useCallback(
    (nextMessage: SessionMessageRecord) => {
      setMessages((previous) => {
        const existingIndex = previous.findIndex(
          (message) => message.id === nextMessage.id
        );

        if (existingIndex >= 0) {
          const copy = [...previous];
          copy[existingIndex] = nextMessage;
          return copy;
        }

        return [...previous, nextMessage].sort(
          (left, right) =>
            left.created_at.localeCompare(
              right.created_at
            )
        );
      });
    },
    []
  );

  const applyRealtimeRecommendation = useCallback(
    (
      nextRecommendation: SessionRecommendationRecord
    ) => {
      setRecommendations((previous) => {
        const existingIndex = previous.findIndex(
          (recommendation) =>
            recommendation.id ===
            nextRecommendation.id
        );

        if (existingIndex >= 0) {
          const copy = [...previous];
          copy[existingIndex] =
            nextRecommendation;
          return copy;
        }

        return [
          nextRecommendation,
          ...previous,
        ];
      });
    },
    []
  );

  const finalizeSession = useCallback(async () => {
    if (!sessionId || isEndingSession) {
      return;
    }

    setIsEndingSession(true);

    try {
      // 어르신이 "오늘 이야기 마무리하기" 누르면 항상 요약을 저장한다.
      // (admin autoSummary preference 와 무관하게 — 그건 진행자 측 정책이고
      //  어르신 측 종료 흐름은 무조건 기록을 남겨야 talk/records 에서 보인다.)
      const elderUtterances = messages.filter(
        (message) => message.role === "user"
      );
      const aiUtterances = messages.filter(
        (message) => message.role === "assistant"
      );
      const fallbackSummary =
        currentState.sessionSummary ||
        (elderUtterances.length > 0
          ? `어르신이 ${elderUtterances.length}번 이야기를 나누셨어요.`
          : "오늘 이야기가 짧게 마무리됐어요.");

      try {
        await saveSessionSummary({
          sessionId,
          elderId: effectiveElderId,
          summary: fallbackSummary,
          familyFriendlySummary: fallbackSummary,
          emotions: currentState.emotionDetected
            ? [currentState.emotionDetected]
            : [],
        });
      } catch (summaryError) {
        // 요약 저장이 실패해도 endSession 자체는 진행한다.
        console.error(
          "saveSessionSummary failed during finalize",
          summaryError,
          {
            elderTurns: elderUtterances.length,
            aiTurns: aiUtterances.length,
          }
        );
      }

      await endSession(
        sessionId,
        fallbackSummary,
        currentState.emotionDetected,
        currentState
      );
      setSessionStatus("ended");

      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem(
          sessionStorageKey
        );
      }
    } finally {
      setIsEndingSession(false);
    }
  }, [
    currentState,
    effectiveElderId,
    isEndingSession,
    messages,
    sessionStorageKey,
    sessionId,
  ]);

  const applyCommandEffect = useCallback(
    async (command: SessionCommandRecord) => {
      if (
        command.status !== "queued" ||
        handledCommandsRef.current.has(command.id)
      ) {
        return;
      }

      handledCommandsRef.current.add(command.id);

      const payload = command.payload ?? {};
      let nextState = currentState;

      switch (command.command_type) {
        case "ask": {
          const question =
            typeof payload.questionText === "string"
              ? payload.questionText
              : currentQuestion;

          nextState = {
            ...currentState,
            action: "facilitator_intervention",
            currentQuestion: question,
            activeCommandId: command.id,
            facilitatorNote:
              typeof payload.note === "string"
                ? payload.note
                : currentState.facilitatorNote,
          };

          setCurrentState(nextState);

          if (sessionId) {
            await addMessage({
              sessionId,
              elderId: effectiveElderId,
              role: "assistant",
              content: question,
              source: "facilitator",
              turnIndex: nextState.turnCount,
              sequenceInTurn: 2,
              metadata: {
                commandId: command.id,
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
            action: command.command_type,
            currentTopic:
              typeof payload.topic === "string"
                ? payload.topic
                : currentState.currentTopic,
            facilitatorNote:
              typeof payload.note === "string"
                ? payload.note
                : currentState.facilitatorNote,
            activeCommandId: command.id,
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

  const hydrateSession = useCallback(
    async (nextSessionId: string) => {
      const snapshot = await getSessionSnapshot(
        nextSessionId
      );

      setSessionId(nextSessionId);
      setSessionStatus(
        snapshot.session.status
      );
      setMessages(snapshot.messages);
      setRecommendations(snapshot.recommendations);
      setCurrentState(
        snapshot.session.current_state ??
          createInitialRuntimeState(firstQuestion)
      );

      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(
          sessionStorageKey,
          nextSessionId
        );
      }
    },
    [firstQuestion, sessionStorageKey]
  );

  const initializeSession = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const storedSessionId =
        typeof window === "undefined"
          ? null
          : window.sessionStorage.getItem(
              sessionStorageKey
            );

      if (storedSessionId) {
        try {
          const snapshot =
            await getSessionSnapshot(storedSessionId);

          if (
            snapshot.session.status === "active"
          ) {
            setSessionId(storedSessionId);
            setSessionStatus("active");
            setMessages(snapshot.messages);
            setRecommendations(
              snapshot.recommendations
            );
            setCurrentState(
              snapshot.session.current_state ??
                createInitialRuntimeState(
                  firstQuestion
                )
            );
            setIsLoading(false);
            return storedSessionId;
          }
        } catch {
          // 저장된 세션 ID 가 더 이상 유효하지 않거나 RLS 로 SELECT 가 막혔을 때
          // (서버 경유 API 와 달리 SELECT 는 브라우저 키로 가야 한다)
          // → 캐시를 비우고 새 세션을 만든다.
        }

        if (typeof window !== "undefined") {
          window.sessionStorage.removeItem(
            sessionStorageKey
          );
        }
      }

      // 이전 ended 세션 summary 가 있으면 그걸 기반으로 한 오프닝 사용.
      // mount 시 setReturningOpening 으로 미리 가져옴. 못 가져온 경우엔 기본 질문.
      const openingText =
        returningOpening || firstQuestion;
      const initialState =
        createInitialRuntimeState(openingText);

      const session = await createSession({
        elderId: effectiveElderId,
        facilityId,
        initialState,
      });

      const openingMessage = await addMessage({
        sessionId: session.id,
        elderId: effectiveElderId,
        role: "assistant",
        content: openingText,
        source: "ai",
        turnIndex: 0,
        sequenceInTurn: 0,
        metadata: { kind: "opening" },
      });

      setSessionId(session.id);
      setSessionStatus("active");
      setCurrentState(initialState);
      setMessages([openingMessage]);
      setRecommendations([]);

      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(
          sessionStorageKey,
          session.id
        );
      }

      return session.id;
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "세션을 준비하지 못했어요.";

      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [
    effectiveElderId,
    facilityId,
    firstQuestion,
    returningOpening,
    sessionStorageKey,
  ]);

  useEffect(() => {
    if (!autoInitialize) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void initializeSession();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [autoInitialize, initializeSession]);

  // Mount 시 이전 ended 세션을 가져와서 다음 세션의 첫 질문에 반영.
  // 어르신이 voice button 을 탭하기 전에 보통 완료된다.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const last = await getLastEndedSession(
          effectiveElderId
        );
        if (cancelled || !last) return;
        // 빈 문자열인 summary 도 의미 없으므로 || 로 폴백을 더 적극적으로.
        const summaryCandidate =
          last.session?.summary ||
          last.session?.session_summaries?.[0]
            ?.family_friendly_summary ||
          last.session?.session_summaries?.[0]
            ?.summary ||
          null;
        const opening = buildReturningOpening(
          summaryCandidate,
          firstQuestion
        );
        if (opening !== firstQuestion) {
          setReturningOpening(opening);
        }
      } catch {
        /* 못 가져오면 기본 firstQuestion 사용 — 무시 */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [effectiveElderId, firstQuestion]);


  useEffect(() => {
    if (!sessionId) {
      return;
    }

    return subscribeToSessionRuntime(sessionId, {
      onSessionChange: (session) => {
        setSessionStatus(session.status);

        if (session.current_state) {
          setCurrentState(session.current_state);
        }

        if (session.status === "ended") {
          setStatus("waiting");
          setError(
            "진행자가 세션을 종료했어요. 새 세션에서 다시 시작해 주세요."
          );

          if (typeof window !== "undefined") {
            window.sessionStorage.removeItem(
              sessionStorageKey
            );
          }
        }
      },
      onMessageChange: applyRealtimeMessage,
      onRecommendationChange:
        applyRealtimeRecommendation,
      onCommandChange: (command) => {
        void applyCommandEffect(command);
      },
    });
  }, [
    applyCommandEffect,
    applyRealtimeMessage,
    applyRealtimeRecommendation,
    sessionId,
    sessionStorageKey,
  ]);

  const persistRuntimeState = useCallback(
    async (nextState: SessionRuntimeState) => {
      setCurrentState(nextState);

      if (!sessionId) {
        return;
      }

      await updateSessionCurrentState(
        sessionId,
        nextState
      );
    },
    [sessionId]
  );

  const processUserTurn = useCallback(
    async (transcript: string) => {
      if (!sessionId) {
        return;
      }

      if (sessionStatus !== "active") {
        throw new Error(
          "이미 종료된 세션입니다."
        );
      }

      const cleanAnswer = transcript.trim();

      if (!cleanAnswer) {
        return;
      }

      setStatus("thinking");

      const nextTurnCount =
        currentState.turnCount + 1;

      const userMessage = await addMessage({
        sessionId,
        elderId: effectiveElderId,
        role: "user",
        content: cleanAnswer,
        source: "browser-stt",
        turnIndex: nextTurnCount,
        sequenceInTurn: 0,
        metadata: { kind: "elder-answer" },
      });

      applyRealtimeMessage(userMessage);

      const updatedMessages = [
        ...messages,
        userMessage,
      ].map((message) => ({
        role: message.role,
        content: message.content,
      }));

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: updatedMessages,
          sessionState: currentState,
        }),
      });

      if (!response.ok) {
        // /api/chat 가 5xx 로 명시적 실패를 알린 경우 (예: OpenAI 응답 잘림, 키 누락)
        // 임시 fallback 으로 대화를 망가뜨리지 말고 사용자에게 분명히 알린다.
        throw new Error(
          "AI 응답 생성에 실패했어요. 잠시 후 다시 이야기해 주세요."
        );
      }

      const data =
        (await response.json()) as ChatCompletionPayload;

      const assistantMessage = await addMessage({
        sessionId,
        elderId: effectiveElderId,
        role: "assistant",
        content: data.speech,
        emotion: data.emotionDetected,
        riskLevel: data.riskLevel,
        source: "ai",
        turnIndex: nextTurnCount,
        sequenceInTurn: 1,
        metadata: {
          facilitatorNote: data.facilitatorNote,
          responsePattern: data.responsePattern,
          questionType: data.questionType,
          tailType: data.tailType,
        },
      });

      applyRealtimeMessage(assistantMessage);

      const nextState: SessionRuntimeState = {
        ...currentState,
        turnCount: nextTurnCount,
        depthLevel: data.depthLevel || 1,
        emotionDetected:
          data.emotionDetected || "neutral",
        riskLevel: data.riskLevel || "low",
        action: data.action || "continue",
        facilitatorNote:
          data.facilitatorNote || "",
        currentQuestion:
          data.speech ||
          currentState.currentQuestion,
        sessionSummary:
          data.sessionSummaryUpdate ||
          currentState.sessionSummary,
        turnSummary: data.turnSummary || "",
        lastSpeaker: "assistant",
      };

      await persistRuntimeState(nextState);

      const createdRecommendations =
        await createSessionRecommendations(
          sessionId,
          "ai",
          data.recommendations || [],
          assistantMessage.id
        );

      setRecommendations(createdRecommendations);
      setStatus("waiting");

      return {
        aiMessage: data.speech,
        ttsText: data.tts_text || data.speech,
        state: nextState,
        assistantMessage,
      };
    },
    [
      applyRealtimeMessage,
      currentState,
      effectiveElderId,
      messages,
      persistRuntimeState,
      sessionId,
      sessionStatus,
    ]
  );

  const markRecommendationSent = useCallback(
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

      applyRealtimeRecommendation(updated);
    },
    [applyRealtimeRecommendation]
  );

  const dismissRecommendation = useCallback(
    async (recommendationId: string) => {
      const updated =
        await updateRecommendationStatus(
          recommendationId,
          "dismissed",
          "facilitator"
        );

      applyRealtimeRecommendation(updated);
    },
    [applyRealtimeRecommendation]
  );

  const resumeSession = useCallback(
    async (nextSessionId: string) => {
      await hydrateSession(nextSessionId);
    },
    [hydrateSession]
  );

  const runtimeSnapshot = useMemo(
    () => ({
      sessionId,
      messages,
      recommendations,
      currentState,
      currentQuestion,
      status,
      isLoading,
      isEndingSession,
      sessionStatus,
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
      sessionStatus,
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
