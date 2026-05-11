"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

export function useBrowserSpeechTranscriber() {
  const recognitionRef =
    useRef<SpeechRecognition | null>(null);
  const finalTranscriptRef =
    useRef("");
  const [transcript, setTranscript] =
    useState("");
  const isSupported =
    typeof window !== "undefined" &&
    Boolean(
      window.SpeechRecognition ??
        window.webkitSpeechRecognition
    );

  const resetTranscript =
    useCallback(() => {
      finalTranscriptRef.current = "";
      setTranscript("");
    }, []);

  const startListening =
    useCallback(
      (
        onError?: (
          error: string
        ) => void
      ) => {
        if (typeof window === "undefined") {
          return false;
        }

        const recognitionCtor =
          window.SpeechRecognition ??
          window.webkitSpeechRecognition;

        if (!recognitionCtor) {
          onError?.(
            "이 브라우저에서는 음성 인식이 지원되지 않아요."
          );
          return false;
        }

        resetTranscript();

        const recognition =
          new recognitionCtor();

        recognition.lang = "ko-KR";
        recognition.interimResults = true;
        recognition.continuous = true;

        recognition.onresult = (
          event
        ) => {
          let interimTranscript = "";

          for (
            let index =
              event.resultIndex;
            index <
            event.results.length;
            index += 1
          ) {
            const result =
              event.results[index];
            const segment =
              result[0]?.transcript ??
              "";

            if (result.isFinal) {
              finalTranscriptRef.current +=
                `${segment} `;
            } else {
              interimTranscript += segment;
            }
          }

          setTranscript(
            (
              finalTranscriptRef.current +
              interimTranscript
            ).trim()
          );
        };

        recognition.onerror = (
          event
        ) => {
          onError?.(
            event.message ||
              event.error
          );
        };

        recognitionRef.current =
          recognition;
        recognition.start();

        return true;
      },
      [resetTranscript]
    );

  const stopListening =
    useCallback(() => {
      recognitionRef.current?.stop();
      recognitionRef.current = null;

      return (
        finalTranscriptRef.current ||
        transcript
      ).trim();
    }, [transcript]);

  useEffect(() => {
    return () => {
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
