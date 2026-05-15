"use client";

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
  const {
    currentQuestion,
    currentState,
    error,
    initializeSession,
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
  const activeCommandId =
    currentState.activeCommandId;
  const hasSession =
    Boolean(sessionId);

  const speak = useCallback(
    (text: string) => {
      if (typeof window === "undefined") {
        return;
      }

      window.speechSynthesis.cancel();

      const utterance =
        new SpeechSynthesisUtterance(text);

      utterance.lang = "ko-KR";
      utterance.rate =
        getSpeechRateValue(
          preferences.speechRate
        );
      utterance.pitch = 1;

      const preferredVoice =
        pickPreferredVoice(
          preferences.voice
        );

      if (preferredVoice) {
        utterance.voice =
          preferredVoice;
      }

      utterance.onstart = () => {
        setStatus("speaking");
      };

      utterance.onend = () => {
        setStatus("listening");

        startListening((message) => {
          setBrowserError(message);
          setStatus("waiting");
        });
      };

      window.speechSynthesis.speak(
        utterance
      );
    },
    [
      preferences.speechRate,
      preferences.voice,
      setStatus,
      startListening,
    ]
  );

  const startListeningFromUi = () => {
    if (!isSupported) {
      setBrowserError(
        "이 브라우저에서는 음성 인식이 지원되지 않아요."
      );
      return;
    }

    setBrowserError(null);
    setStatus("listening");

    startListening((message) => {
      setBrowserError(message);
      setStatus("waiting");
    });
  };

  const stopListeningFromUi =
    async () => {
      const finalTranscript =
        stopListening();

      setStatus("thinking");

      if (!finalTranscript) {
        resetTranscript();

        setTimeout(() => {
          speak(
            "괜찮아요. 천천히 생각나시는 만큼 말씀해 주세요."
          );
        }, 400);
        return;
      }

      try {
        const result =
          await processUserTurn(
            finalTranscript
          );

        resetTranscript();

        if (result?.ttsText) {
          setTimeout(() => {
            speak(result.ttsText);
          }, 500);
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

        setTimeout(() => {
          speak(
            "잠시 연결이 불안정해요. 다시 한번 이야기해볼까요?"
          );
        }, 500);
      }
    };

  const handleVoiceButton =
    async () => {
    if (isLoading) {
      return;
    }

    if (!sessionId) {
      setBrowserError(null);
      setStatus("thinking");

      const nextSessionId =
        await initializeSession();

      if (!nextSessionId) {
        setStatus("waiting");
        return;
      }

      setTimeout(() => {
        speak(currentQuestion);
      }, 300);
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
      startListeningFromUi();
      return;
    }

    if (status === "listening") {
      void stopListeningFromUi();
    }
  };

  useEffect(() => {
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

    spokenCommandRef.current =
      activeCommandId;

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
  const headline =
    hasSession
      ? currentQuestion
      : "준비가 되면 아래 버튼을 눌러 이야기를 시작해요.";
  const questionTextClass =
    getQuestionTextClass(
      preferences.fontSize
    );
  const bodyTextClass =
    getBodyTextClass(
      preferences.fontSize
    );

  return (
    <div className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,#fff4e5_0%,#f6ead9_45%,#edf3e8_100%)] px-6 pt-6 text-[#3d3128]">
      <div className="mx-auto flex min-h-screen max-w-md flex-col pb-32">
        <Header subtitle="편안하게 이야기를 이어가볼까요?" />

        <main className="flex flex-1 flex-col items-center pt-10">
          <div className="mt-6">
            <SeasonalOrb
              status={status}
              season="spring"
              showText={false}
            />
          </div>

          <div className="mt-10 text-center">
            <p className="text-sm font-bold text-[#8a715c]">
              {hasSession
                ? "이야기 도우미가 여쭤볼게요"
                : "이야기 도우미가 기다리고 있어요"}
            </p>

            <h3
              className={`mt-5 font-black leading-[1.5] tracking-tight ${questionTextClass}`}
            >
              {headline}
            </h3>

            {statusMessage && (
              <div className="mt-6 rounded-[24px] bg-[#fff2ef] px-5 py-4 text-left shadow-sm ring-1 ring-[#f1d4c9]">
                <p className="text-sm leading-[1.7] text-[#7a564f]">
                  {statusMessage}
                </p>
              </div>
            )}

            {lastAnswer && (
              <div className="mt-6 rounded-[24px] bg-[#fffaf2]/92 px-5 py-4 shadow-sm ring-1 ring-white/90">
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

          <div className="mt-10 w-full">
            <VoiceActionButton
              status={status}
              onClick={() => {
                void handleVoiceButton();
              }}
            />
          </div>
        </main>
      </div>

      <BottomTab />
    </div>
  );
}
