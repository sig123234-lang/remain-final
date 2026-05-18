"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

type StartListeningOptions = {
  onError?: (error: string) => void;
};

export function useBrowserSpeechTranscriber() {
  const recognitionRef =
    useRef<SpeechRecognition | null>(null);
  const finalTranscriptRef = useRef("");
  /** 마지막 onresult에서 계산한 전체 전사(확정+임시) — stop 시 React state보다 최신 */
  const latestCombinedTranscriptRef = useRef("");
  /** 사용자가 명시적으로 stopListening 호출했는지. true면 onerror=aborted 가 정상 흐름이라 노출 안 함. */
  const manualStopRef = useRef(false);
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
    // 내부 재귀 호출을 위해 named function expression. preserveTranscript=true
    // 는 자동 재시작 시에만 외부에서는 안 쓰는 옵션.
    function start(
      options: StartListeningOptions = {},
      preserveTranscript = false
    ): boolean {
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

      // 이전 인스턴스 정리. ref 를 먼저 비우는 이유: 그 인스턴스의 onend 가
      // 자동 재시작 분기로 들어가지 않게 (`ref !== recognition` 으로 판정).
      const previous = recognitionRef.current;
      recognitionRef.current = null;
      if (previous) {
        try {
          previous.stop();
        } catch {
          /* 이미 종료된 상태 가능 */
        }
      }

      if (!preserveTranscript) {
        resetTranscript();
      }
      manualStopRef.current = false;

      const recognition = new recognitionCtor();

      recognition.lang = "ko-KR";
      recognition.interimResults = true;
      // 어르신이 충분히 생각하고 말할 수 있도록, 침묵 동안에도 마이크를 끄지 않는다.
      // 자동 종료를 막아 발화 중간의 긴 호흡이 인식 종료로 이어지지 않게 한다.
      // 흐름 종료는 어르신이 명시적으로 정지 버튼을 눌러 stopListening() 을 호출했을 때만.
      recognition.continuous = true;

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
        // 사용자가 명시적으로 stopListening() 호출하면 브라우저가 자동으로
        // onerror = "aborted" 를 발동시킨다. 정상 흐름이라 화면에 노출하지 않는다.
        if (manualStopRef.current) {
          return;
        }

        const errorCode = event.error || "";

        // 시스템 사유로 인식이 중단된 경우 (다른 앱이 마이크 점유, 백그라운드 전환 등).
        // 사용자에게 "aborted" 라는 영어 원문을 노출하지 말고 silently 무시한다.
        if (errorCode === "aborted") {
          return;
        }

        // 권한·하드웨어·언어 미지원 같은 치명적 에러는 자동 재시작하면 무한 루프.
        // manualStop 으로 강제 표시해서 onend 의 자동 재시작 분기를 막는다.
        const fatalErrors = [
          "not-allowed",
          "service-not-allowed",
          "audio-capture",
          "language-not-supported",
        ];
        if (fatalErrors.includes(errorCode)) {
          manualStopRef.current = true;
          recognitionRef.current = null;
        }

        // 알려진 에러 코드를 사람이 이해할 수 있는 한국어 안내로 변환.
        let friendly = event.message || "";
        if (errorCode === "no-speech") {
          friendly =
            "잘 안 들렸어요. 다시 한 번 말씀해 주시겠어요?";
        } else if (
          errorCode === "audio-capture"
        ) {
          friendly =
            "마이크에 접근하지 못했어요. 권한을 확인해 주세요.";
        } else if (
          errorCode === "not-allowed" ||
          errorCode === "service-not-allowed"
        ) {
          friendly =
            "마이크 사용 권한이 필요해요. 브라우저 설정에서 허용해 주세요.";
        } else if (
          errorCode === "language-not-supported"
        ) {
          friendly =
            "이 기기에서는 한국어 음성 인식이 지원되지 않아요.";
        } else if (errorCode === "network") {
          friendly =
            "인터넷 연결이 불안정해서 음성 인식을 못 했어요.";
        }

        if (!friendly) {
          friendly =
            "음성 인식 중 문제가 생겼어요. 다시 시도해 주세요.";
        }

        options.onError?.(friendly);
      };

      recognition.onend = () => {
        // 명시적 stop 이면 그대로 종료.
        if (manualStopRef.current) {
          return;
        }
        // 이미 다른 startListening 이 진행돼서 ref 가 바뀌었다면 skip.
        if (
          recognitionRef.current !== recognition
        ) {
          return;
        }
        // continuous=true 라도 모바일/일부 브라우저는 시스템 사유로 인식을 끊는다.
        // 어르신이 정지 버튼을 누르지 않는 한 마이크가 자동으로 닫히지 않도록
        // 새 인스턴스로 즉시 재시작한다. transcript 누적은 보존.
        window.setTimeout(() => {
          if (manualStopRef.current) return;
          start(options, true);
        }, 0);
      };

      recognitionRef.current = recognition;
      try {
        recognition.start();
      } catch {
        // start() 가 InvalidStateError 를 던지는 경우 (이미 시작됨)
        recognitionRef.current = null;
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
