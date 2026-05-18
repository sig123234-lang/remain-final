"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

type StartListeningOptions = {
  onError?: (error: string) => void;
  /**
   * 어르신이 말을 마치고 침묵해서 SpeechRecognition 이 스스로 종료된 경우 호출.
   * finalTranscript 가 전달된다 (trim된 문자열, 빈 문자열 가능).
   *
   * `continuous=false` 설정 덕에 어르신 한 발화가 끝나면 자동 발동.
   * 어르신이 매번 stop 버튼을 누르지 않아도 자연스럽게 다음 단계로 넘어감.
   */
  onAutoStop?: (finalTranscript: string) => void;
};

export function useBrowserSpeechTranscriber() {
  const recognitionRef =
    useRef<SpeechRecognition | null>(null);
  const finalTranscriptRef = useRef("");
  /** 마지막 onresult에서 계산한 전체 전사(확정+임시) — stop 시 React state보다 최신 */
  const latestCombinedTranscriptRef = useRef("");
  /** 사용자가 명시적으로 stopListening 호출했는지. true면 onend 자동 콜백 skip. */
  const manualStopRef = useRef(false);
  const onAutoStopRef =
    useRef<StartListeningOptions["onAutoStop"]>(
      undefined
    );
  const [transcript, setTranscript] =
    useState("");
  const isSupported =
    typeof window !== "undefined" &&
    Boolean(
      window.SpeechRecognition ??
        window.webkitSpeechRecognition
    );

  const resetTranscript = useCallback(() => {
    finalTranscriptRef.current = "";
    latestCombinedTranscriptRef.current = "";
    setTranscript("");
  }, []);

  const startListening = useCallback(
    (options: StartListeningOptions = {}) => {
      if (typeof window === "undefined") {
        return false;
      }

      const recognitionCtor =
        window.SpeechRecognition ??
        window.webkitSpeechRecognition;

      if (!recognitionCtor) {
        options.onError?.(
          "이 브라우저에서는 음성 인식이 지원되지 않아요."
        );
        return false;
      }

      // 이전 인식 세션이 살아있으면 정리. 이중 시작은 InvalidStateError 를 던진다.
      recognitionRef.current?.stop();
      resetTranscript();
      manualStopRef.current = false;
      onAutoStopRef.current = options.onAutoStop;

      const recognition = new recognitionCtor();

      recognition.lang = "ko-KR";
      recognition.interimResults = true;
      // continuous=true 였을 때:
      //   - 어르신이 한 번 답하고 침묵해도 STT 가 계속 켜져있어
      //     화면 transcript 가 누적된 모습으로 보이고, 다음 답변까지 한 덩어리로 묶임.
      //   - 또 다른 발화가 들어오면 final 이 또 더해져서 "같은 답이 반복되는" 처럼 표시.
      // continuous=false 로 두면 침묵 0.5~1초 후 SpeechRecognition 이 스스로 onend 를 발동.
      // 그 때 finalTranscript 를 자동으로 다음 턴으로 넘기면 어르신이 stop 을 안 눌러도 흐름이 이어진다.
      recognition.continuous = false;

      recognition.onresult = (event) => {
        let interimTranscript = "";

        for (
          let index = event.resultIndex;
          index < event.results.length;
          index += 1
        ) {
          const result = event.results[index];
          const segment =
            result[0]?.transcript ?? "";

          if (result.isFinal) {
            finalTranscriptRef.current += `${segment} `;
          } else {
            interimTranscript += segment;
          }
        }

        const combined = (
          finalTranscriptRef.current +
          interimTranscript
        ).trim();

        latestCombinedTranscriptRef.current =
          combined;
        setTranscript(combined);
      };

      recognition.onerror = (event) => {
        options.onError?.(
          event.message || event.error
        );
      };

      recognition.onend = () => {
        // 명시적 stop 이 아니라 자연 종료 (침묵 감지 등) 인 경우만 자동 콜백.
        if (manualStopRef.current) {
          return;
        }
        const finalText =
          latestCombinedTranscriptRef.current.trim();
        onAutoStopRef.current?.(finalText);
      };

      recognitionRef.current = recognition;
      try {
        recognition.start();
      } catch {
        // start() 가 InvalidStateError 를 던지는 경우 (이미 시작됨)
        options.onError?.(
          "음성 인식을 시작하지 못했어요. 잠시 후 다시 시도해 주세요."
        );
        return false;
      }

      return true;
    },
    [resetTranscript]
  );

  const stopListening = useCallback(() => {
    manualStopRef.current = true;
    recognitionRef.current?.stop();
    recognitionRef.current = null;

    return latestCombinedTranscriptRef.current.trim();
  }, []);

  useEffect(() => {
    return () => {
      manualStopRef.current = true;
      recognitionRef.current?.stop();
    };
  }, []);

  return {
    isSupported,
    transcript,
    resetTranscript,
    startListening,
    stopListening,
  };
}
