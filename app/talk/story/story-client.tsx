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
} from "@/lib/preferences";

/**
 * 무음 0.5초 짜리 WAV (44 byte). 모바일 브라우저의 audio autoplay 정책
 * 우회용: 첫 user gesture 안에서 audio element 에 대해 한 번 play() 를 호출
 * 해두면 그 element 는 unlock 되어 이후 (async fetch 뒤) 에도 자유롭게 재생된다.
 */
const SILENT_WAV_DATA_URI =
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";

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
  const isProcessingTurnRef = useRef(false);
  const activeCommandId =
    currentState.activeCommandId;
  const hasSession = Boolean(sessionId);

  // 단일 <audio> 인스턴스를 재사용. 모바일 브라우저는 한 element 가
  // user gesture 안에서 한 번이라도 play() 됐으면 그 element 는 unlock 된다.
  const audioRef = useRef<HTMLAudioElement | null>(
    null
  );
  const audioUnlockedRef = useRef(false);
  // 현재 BlobURL — 새 발화 큐잉 시 revoke 해서 메모리 누수 막음.
  const currentAudioUrlRef = useRef<string | null>(
    null
  );
  // 현재 발화 cancel/race-condition 가드용 토큰.
  const speakTokenRef = useRef(0);

  const getAudio = useCallback(() => {
    if (typeof window === "undefined") {
      return null;
    }
    if (!audioRef.current) {
      const audio = new Audio();
      audio.preload = "auto";
      audioRef.current = audio;
    }
    return audioRef.current;
  }, []);

  /**
   * 모바일 autoplay 정책 우회. user gesture (탭) 안에서 동기 호출.
   * 무음 WAV 를 한 번 재생해서 audio element 를 unlock 시킨다.
   */
  const unlockAudio = useCallback(() => {
    if (audioUnlockedRef.current) return;
    const audio = getAudio();
    if (!audio) return;
    try {
      audio.src = SILENT_WAV_DATA_URI;
      const playPromise = audio.play();
      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(() => {
          /* unlock 실패해도 진짜 재생에서 다시 시도 */
        });
      }
      audioUnlockedRef.current = true;
    } catch {
      /* noop */
    }
  }, [getAudio]);

  const releaseCurrentAudioUrl = useCallback(() => {
    if (currentAudioUrlRef.current) {
      URL.revokeObjectURL(currentAudioUrlRef.current);
      currentAudioUrlRef.current = null;
    }
  }, []);

  const cancelCurrentSpeech = useCallback(() => {
    speakTokenRef.current += 1; // 진행 중인 speak 호출 무효화
    const audio = audioRef.current;
    if (audio) {
      try {
        audio.pause();
      } catch {
        /* noop */
      }
    }
    releaseCurrentAudioUrl();
  }, [releaseCurrentAudioUrl]);

  // handleFinalTranscript 가 speak 보다 먼저 정의되어야 startListening 콜백으로
  // 넘길 수 있어 ref 우회.
  const handleFinalTranscriptRef = useRef<
    (text: string) => Promise<void>
  >(async () => undefined);

  /**
   * 서버 TTS (/api/tts) 로 mp3 받아 audio element 로 재생.
   * 기존 browser speechSynthesis 는 Samsung 태블릿 등 한국어 TTS voice 가
   * 없는 device 에서 silently fail. OpenAI TTS 는 mp3 binary 라 어느 device 든 재생.
   */
  const speak = useCallback(
    async (text: string) => {
      if (typeof window === "undefined") {
        return;
      }
      if (!text || !text.trim()) {
        return;
      }

      const audio = getAudio();
      if (!audio) {
        return;
      }

      // 새 speak 호출은 이전 발화를 cancel. 토큰 증가시켜 이전 async 분기 무효화.
      cancelCurrentSpeech();
      const myToken = speakTokenRef.current;

      let advanced = false;
      const advanceToListening = () => {
        if (advanced) return;
        advanced = true;
        setStatus("listening");
        startListening({
          onError: (message) => {
            setBrowserError(message);
            setStatus("waiting");
          },
        });
      };

      const showFallbackHint = () => {
        setBrowserError(
          "음성이 잠시 나오지 않아요. 화면의 글을 보고 편하게 말씀해 주세요."
        );
      };

      try {
        const response = await fetch("/api/tts", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text,
            voice: preferences.voice,
          }),
        });

        // 이 시점에 다른 speak() 가 시작됐다면 이 흐름 중단.
        if (
          myToken !== speakTokenRef.current
        ) {
          return;
        }

        if (!response.ok) {
          throw new Error(
            `TTS HTTP ${response.status}`
          );
        }

        const blob = await response.blob();

        if (
          myToken !== speakTokenRef.current
        ) {
          return;
        }

        const url = URL.createObjectURL(blob);
        // 이전 url 이 남아있으면 정리
        releaseCurrentAudioUrl();
        currentAudioUrlRef.current = url;

        audio.src = url;
        audio.playbackRate = getSpeechRateValue(
          preferences.speechRate
        );

        const handleEnded = () => {
          audio.onended = null;
          audio.onerror = null;
          audio.onplay = null;
          releaseCurrentAudioUrl();
          advanceToListening();
        };

        const handleError = () => {
          audio.onended = null;
          audio.onerror = null;
          audio.onplay = null;
          releaseCurrentAudioUrl();
          if (!advanced) showFallbackHint();
          advanceToListening();
        };

        audio.onplay = () => {
          if (
            myToken === speakTokenRef.current
          ) {
            setStatus("speaking");
          }
        };
        audio.onended = handleEnded;
        audio.onerror = handleError;

        // 30초 안전망: 어떤 사유로든 onended/onerror 가 안 뜨면 강제 advance.
        window.setTimeout(() => {
          if (
            myToken === speakTokenRef.current &&
            !advanced
          ) {
            advanceToListening();
          }
        }, 30_000);

        try {
          await audio.play();
        } catch (playError) {
          // autoplay 차단 — 사용자에게 안내 후 listening 진입
          console.warn(
            "audio.play() rejected:",
            playError
          );
          showFallbackHint();
          advanceToListening();
        }
      } catch (fetchError) {
        console.error(
          "TTS fetch failed:",
          fetchError
        );
        if (
          myToken === speakTokenRef.current
        ) {
          showFallbackHint();
          advanceToListening();
        }
      }
    },
    [
      cancelCurrentSpeech,
      getAudio,
      preferences.speechRate,
      preferences.voice,
      releaseCurrentAudioUrl,
      setStatus,
      startListening,
    ]
  );

  const handleFinalTranscript = useCallback(
    async (finalTranscript: string) => {
      if (isProcessingTurnRef.current) {
        return;
      }

      const cleaned = finalTranscript.trim();

      if (!cleaned) {
        resetTranscript();
        setStatus("waiting");
        return;
      }

      setBrowserError(null);
      isProcessingTurnRef.current = true;
      setStatus("thinking");

      try {
        const result = await processUserTurn(
          cleaned
        );
        resetTranscript();

        if (result?.ttsText) {
          void speak(result.ttsText);
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
        void speak(
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

  useEffect(() => {
    handleFinalTranscriptRef.current =
      handleFinalTranscript;
  }, [handleFinalTranscript]);

  const stopAndProcess = useCallback(() => {
    const finalTranscript = stopListening();
    void handleFinalTranscript(finalTranscript);
  }, [handleFinalTranscript, stopListening]);

  const handleVoiceButton = async () => {
    if (isLoading || isEndingSession) {
      return;
    }

    // 모든 분기 진입 직전 동기로 audio unlock — 첫 탭이 user gesture 인 동안.
    unlockAudio();
    setBrowserError(null);

    if (!sessionId) {
      setStatus("thinking");

      // 첫 질문은 default value 가 있으니 init 기다리지 않고 바로 호출.
      void speak(currentQuestion);

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
      void speak(currentQuestion);
      return;
    }

    if (status === "speaking") {
      cancelCurrentSpeech();
      if (!isSupported) {
        setBrowserError(
          "이 브라우저에서는 음성 인식이 지원되지 않아요."
        );
        return;
      }
      setStatus("listening");
      startListening({
        onError: (message) => {
          setBrowserError(message);
          setStatus("waiting");
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

    cancelCurrentSpeech();
    stopListening();
    resetTranscript();
    setStatus("thinking");

    try {
      await finalizeSession();
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
    return () => {
      cancelCurrentSpeech();
    };
  }, [cancelCurrentSpeech]);

  useEffect(() => {
    if (sessionStatus === "active") {
      return;
    }
    cancelCurrentSpeech();
  }, [
    cancelCurrentSpeech,
    sessionStatus,
  ]);

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
      void speak(currentQuestion);
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
      <div className="mx-auto flex max-w-md flex-col px-6 pt-6 pb-[260px]">
        <Header subtitle="편안하게 이야기를 이어가볼까요?" />

        <main className="flex flex-col items-center pt-4">
          <div className="mt-2 scale-[0.78] sm:scale-90">
            <SeasonalOrb
              status={status}
              season="summer"
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
