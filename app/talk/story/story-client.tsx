"use client";

import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import BottomTab from "@/components/talk/BottomTab";
import Header from "@/components/talk/Header";
import SeasonalOrb from "@/components/talk/SeasonalOrb";
import VoiceActionButton from "@/components/talk/VoiceActionButton";
import { useBrowserSpeechTranscriber } from "@/hooks/useBrowserSpeechTranscriber";
import { useTalkPreferencesStore } from "@/hooks/usePreferenceStore";
import { useSessionRuntime } from "@/hooks/useSessionRuntime";
import {
  getBodyTextClass,
  getQuestionTextClass,
  getSpeechRateValue,
  pickPreferredVoice,
} from "@/lib/preferences";

export default function StoryClientPage({
  elderId,
}: {
  elderId?: string;
}) {
  const router = useRouter();
  const {
    currentQuestion,
    currentState,
    error,
    finalizeSession,
    initializeSession,
    isEndingSession,
    isLoading,
    sessionId,
    sessionStatus,
    status,
    setStatus,
    processUserTurn,
  } = useSessionRuntime({
    elderId,
    autoInitialize: false,
  });

  const {
    isSupported,
    transcript,
    startListening,
    stopListening,
    resetTranscript,
  } = useBrowserSpeechTranscriber();
  const [browserError, setBrowserError] =
    useState<string | null>(null);
  const { preferences } =
    useTalkPreferencesStore();
  const spokenCommandRef =
    useRef<string | null>(null);
  /**
   * processUserTurn 이 동시에 두 번 발화되지 않게 가드.
   * - stop 버튼 + STT 자동 종료(onAutoStop) 가 거의 동시에 발생할 수 있음.
   * - 이전엔 같은 답이 두 번 AI 로 전송돼 "반복 녹음" 처럼 보였다.
   */
  const isProcessingTurnRef = useRef(false);
  const activeCommandId =
    currentState.activeCommandId;
  const hasSession = Boolean(sessionId);

  /**
   * iOS Safari / iPadOS / Samsung Internet 은 `speechSynthesis.speak()` 가
   * user gesture 와 같은 task 에서 실행돼야 소리를 낸다. `await` 가 끼면
   * activation 이 만료돼 에러 없이 무시된다.
   */
  const primeSpeechSynthesis = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }
    if (!("speechSynthesis" in window)) {
      return;
    }

    // volume=0 으로 두면 Samsung 태블릿의 Android Chrome 이 utterance 를
    // silently drop 하면서 큐 자체를 잠가버려, 뒤에 큐잉되는 진짜 발화도 무음.
    // 0.01 = 사실상 안 들리지만 audio pipeline 은 정상 동작.
    const primer = new SpeechSynthesisUtterance(
      "."
    );
    primer.volume = 0.01;
    primer.rate = 1;
    primer.lang = "ko-KR";
    try {
      window.speechSynthesis.speak(primer);
    } catch {
      /* noop */
    }
  }, []);

  // 큰 useCallback 사슬에서 `speak` 보다 `handleFinalTranscript` 가 먼저 정의돼야
  // startListening 의 onAutoStop 콜백으로 넘길 수 있다. 그래서 ref 우회.
  const handleFinalTranscriptRef = useRef<
    (text: string) => Promise<void>
  >(async () => undefined);

  const speak = useCallback(
    (text: string) => {
      if (typeof window === "undefined") {
        return;
      }
      if (!("speechSynthesis" in window)) {
        return;
      }
      if (!text || !text.trim()) {
        return;
      }

      const utterance = new SpeechSynthesisUtterance(
        text
      );

      utterance.lang = "ko-KR";
      utterance.rate = getSpeechRateValue(
        preferences.speechRate
      );
      utterance.pitch = 1;

      const preferredVoice = pickPreferredVoice(
        preferences.voice
      );

      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      const advanceToListening = () => {
        setStatus("listening");
        startListening({
          onError: (message) => {
            setBrowserError(message);
            setStatus("waiting");
          },
          onAutoStop: (finalText) => {
            void handleFinalTranscriptRef.current(
              finalText
            );
          },
        });
      };

      // 한 발화에 대해 listening 으로의 진입이 두 번 일어나지 않게 가드.
      // (onend + onstart-timeout 둘 다 발동될 수 있음)
      let advanced = false;
      let onstartFired = false;
      const advanceOnce = () => {
        if (advanced) return;
        advanced = true;
        advanceToListening();
      };

      utterance.onstart = () => {
        onstartFired = true;
        // fallback 타이머가 이미 listening 으로 advance 한 뒤 TTS 가 뒤늦게
        // 실제로 재생되기 시작하는 경우, status 를 speaking 으로 되돌리지 않는다.
        // 어색한 깜빡임 방지 (listening → speaking → listening).
        if (advanced) return;
        setStatus("speaking");
      };

      utterance.onend = () => {
        advanceOnce();
      };

      utterance.onerror = () => {
        advanceOnce();
      };

      // ⚠️ 핵심 fallback. Samsung 태블릿처럼 한국어 TTS voice 가 없거나
      // 시스템 TTS 엔진이 막혀 있으면 utterance.onstart 가 영원히 안 뜬다.
      // 이때 UI 가 "생각하고 있어요" 에 멈춰 사용자는 답조차 못 한다.
      // 2.5초 안에 onstart 가 안 뜨면 TTS 가 죽었다고 판단하고 즉시
      // listening 으로 진입해서 어르신이 화면을 보고 답할 수 있게 한다.
      window.setTimeout(() => {
        if (!onstartFired) {
          advanceOnce();
        }
      }, 2500);

      // 발화가 너무 길거나 엔진이 onend 를 안 보내는 경우 안전망. 한국어
      // 80자 문장이 가장 느린 rate 로도 ~15초 안에 끝나므로 30초면 충분.
      window.setTimeout(advanceOnce, 30_000);

      try {
        window.speechSynthesis.speak(utterance);
      } catch {
        // 일부 모바일 브라우저에서 speak() 가 throw. 그 즉시 listening 으로.
        advanceOnce();
      }
    },
    [
      preferences.speechRate,
      preferences.voice,
      setStatus,
      startListening,
    ]
  );

  /**
   * 어르신 발화 한 turn 을 끝까지 처리. stop 버튼 / STT 자동 종료 둘 다 여기로 모인다.
   * 동시 호출 방지 ref 로 한 turn 당 한 번만 실행.
   */
  const handleFinalTranscript = useCallback(
    async (finalTranscript: string) => {
      if (isProcessingTurnRef.current) {
        return;
      }

      const cleaned = finalTranscript.trim();

      if (!cleaned) {
        // 침묵 또는 인식 실패 — 다시 들을 준비
        resetTranscript();
        setStatus("waiting");
        return;
      }

      isProcessingTurnRef.current = true;
      setStatus("thinking");

      try {
        const result = await processUserTurn(
          cleaned
        );
        resetTranscript();

        if (result?.ttsText) {
          speak(result.ttsText);
        } else {
          setStatus("waiting");
        }
      } catch (caughtError) {
        resetTranscript();
        setBrowserError(
          caughtError instanceof Error
            ? caughtError.message
            : "대화를 이어가지 못했어요."
        );

        speak(
          "잠시 연결이 불안정해요. 다시 한번 이야기해볼까요?"
        );
      } finally {
        isProcessingTurnRef.current = false;
      }
    },
    [
      processUserTurn,
      resetTranscript,
      setStatus,
      speak,
    ]
  );

  // ref 에 최신 콜백 동기화 — speak 의 onend 가 capture 한 콜백이 stale 되지 않게.
  useEffect(() => {
    handleFinalTranscriptRef.current =
      handleFinalTranscript;
  }, [handleFinalTranscript]);

  const stopAndProcess = useCallback(() => {
    primeSpeechSynthesis();
    const finalTranscript = stopListening();
    void handleFinalTranscript(finalTranscript);
  }, [
    handleFinalTranscript,
    primeSpeechSynthesis,
    stopListening,
  ]);

  const handleVoiceButton = async () => {
    if (isLoading || isEndingSession) {
      return;
    }

    // 모바일 TTS 활성화: 모든 분기 앞에 동기 prime.
    primeSpeechSynthesis();

    if (!sessionId) {
      setBrowserError(null);
      setStatus("thinking");

      speak(currentQuestion);

      const nextSessionId =
        await initializeSession();

      if (!nextSessionId) {
        setStatus("waiting");
        return;
      }
      return;
    }

    if (sessionStatus !== "active") {
      return;
    }

    if (status === "waiting") {
      speak(currentQuestion);
      return;
    }

    if (status === "speaking") {
      window.speechSynthesis.cancel();
      if (!isSupported) {
        setBrowserError(
          "이 브라우저에서는 음성 인식이 지원되지 않아요."
        );
        return;
      }
      setBrowserError(null);
      setStatus("listening");
      startListening({
        onError: (message) => {
          setBrowserError(message);
          setStatus("waiting");
        },
        onAutoStop: (finalText) => {
          void handleFinalTranscript(finalText);
        },
      });
      return;
    }

    if (status === "listening") {
      stopAndProcess();
    }
  };

  const handleEndSession = async () => {
    if (!sessionId || isEndingSession) {
      return;
    }

    if (
      typeof window !== "undefined" &&
      !window.confirm(
        "오늘 이야기를 마무리할까요? 저장된 내용은 기록에서 다시 보실 수 있어요."
      )
    ) {
      return;
    }

    // 진행 중인 음성 인식/합성 정리
    if (typeof window !== "undefined") {
      window.speechSynthesis.cancel();
    }
    stopListening();
    resetTranscript();
    setStatus("thinking");

    try {
      await finalizeSession();
      // 종료 후 기록 화면으로 이동
      const target = elderId
        ? `/talk/records?elderId=${elderId}`
        : "/talk/records";
      router.replace(target);
    } catch (caughtError) {
      setBrowserError(
        caughtError instanceof Error
          ? caughtError.message
          : "세션을 마무리하지 못했어요."
      );
      setStatus("waiting");
    }
  };

  useEffect(() => {
    // 일부 브라우저(Samsung Internet, 일부 Android Chrome)는 첫 getVoices() 가
    // 빈 배열을 반환하고 voiceschanged 이벤트 후에야 채워진다. 마운트 즉시
    // 호출해서 비동기 로딩을 시작해 두면, 사용자가 음성 버튼을 탭할 때쯤
    // 한국어 voice 가 준비돼 있을 가능성이 높아진다.
    if (
      typeof window !== "undefined" &&
      "speechSynthesis" in window
    ) {
      window.speechSynthesis.getVoices();
    }

    return () => {
      if (typeof window !== "undefined") {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    if (
      sessionStatus === "active" ||
      typeof window === "undefined"
    ) {
      return;
    }
    window.speechSynthesis.cancel();
  }, [sessionStatus]);

  useEffect(() => {
    if (
      !activeCommandId ||
      activeCommandId ===
        spokenCommandRef.current ||
      status === "speaking" ||
      status === "listening" ||
      status === "thinking"
    ) {
      return;
    }

    spokenCommandRef.current = activeCommandId;
    setTimeout(() => {
      speak(currentQuestion);
    }, 300);
  }, [
    currentQuestion,
    activeCommandId,
    speak,
    status,
  ]);

  const lastAnswer = transcript;
  const statusMessage =
    sessionStatus === "active"
      ? browserError || error
      : error ||
        "진행자가 세션을 종료했어요. 새 세션에서 다시 시작해 주세요.";
  const headline = hasSession
    ? currentQuestion
    : "준비가 되면 아래 버튼을 눌러 이야기를 시작해요.";
  const questionTextClass = getQuestionTextClass(
    preferences.fontSize
  );
  const bodyTextClass = getBodyTextClass(
    preferences.fontSize
  );

  return (
    <div className="min-h-[100dvh] bg-[radial-gradient(circle_at_top,#fff4e5_0%,#f6ead9_45%,#edf3e8_100%)] text-[#3d3128]">
      {/* 스크롤 가능 영역. 하단의 fixed 컨트롤 (voice+종료+BottomTab) 만큼 패딩 */}
      <div className="mx-auto flex max-w-md flex-col px-6 pt-6 pb-[260px]">
        <Header subtitle="편안하게 이야기를 이어가볼까요?" />

        <main className="flex flex-col items-center pt-4">
          <div className="mt-2 scale-[0.78] sm:scale-90">
            <SeasonalOrb
              status={status}
              season="spring"
              showText={false}
            />
          </div>

          <div className="mt-4 w-full text-center">
            <p className="text-sm font-bold text-[#8a715c]">
              {hasSession
                ? "이야기 도우미가 여쭤볼게요"
                : "이야기 도우미가 기다리고 있어요"}
            </p>

            <h3
              className={`mt-4 font-black leading-[1.4] tracking-tight ${questionTextClass}`}
            >
              {headline}
            </h3>

            {statusMessage && (
              <div className="mt-5 rounded-[20px] bg-[#fff2ef] px-4 py-3 text-left shadow-sm ring-1 ring-[#f1d4c9]">
                <p className="text-sm leading-[1.7] text-[#7a564f]">
                  {statusMessage}
                </p>
              </div>
            )}

            {lastAnswer && (
              <div className="mt-5 rounded-[20px] bg-[#fffaf2]/92 px-4 py-3 text-left shadow-sm ring-1 ring-white/90">
                <p className="text-sm font-bold text-[#8a7463]">
                  들은 이야기
                </p>
                <p
                  className={`mt-2 leading-[1.7] text-[#6f5d50] ${bodyTextClass}`}
                >
                  {lastAnswer}
                </p>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* 하단 고정 컨트롤: 큰 음성 버튼 + 종료 버튼. BottomTab 위에 안전하게 layered */}
      <div className="fixed bottom-[88px] left-0 right-0 z-40 px-6">
        <div className="mx-auto max-w-md space-y-3">
          <VoiceActionButton
            status={status}
            onClick={() => {
              void handleVoiceButton();
            }}
          />
          {hasSession && sessionStatus === "active" && (
            <button
              type="button"
              onClick={() => {
                void handleEndSession();
              }}
              disabled={isEndingSession}
              className="flex h-12 w-full items-center justify-center rounded-2xl bg-white/85 text-sm font-bold text-[#8a715c] shadow-sm ring-1 ring-white/70 backdrop-blur active:scale-[0.99] disabled:opacity-60"
            >
              {isEndingSession
                ? "오늘 이야기 마무리하는 중..."
                : "오늘 이야기 마무리하기"}
            </button>
          )}
        </div>
      </div>

      <BottomTab />
    </div>
  );
}
