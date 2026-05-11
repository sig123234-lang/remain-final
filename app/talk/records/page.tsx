"use client";

import { useEffect, useState } from "react";

import Header from "@/components/talk/Header";
import BottomTab from "@/components/talk/BottomTab";

import {
  getElderSessions,
} from "@/services/sessionService";

const TEST_ELDER_ID =
  "d3468297-537c-46a8-9736-90e26e22f678";

type Session = {
  id: string;
  started_at: string;
  summary?: string;
  detected_emotion?: string;
  messages?: {
    id: string;
    role: string;
    content: string;
  }[];
};

export default function RecordsPage() {
  const [sessions, setSessions] =
    useState<Session[]>([]);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    const fetchSessions =
      async () => {
        try {
          const data =
            await getElderSessions(
              TEST_ELDER_ID
            );

          setSessions(data || []);
        } catch (error) {
          console.error(error);
        } finally {
          setLoading(false);
        }
      };

    fetchSessions();
  }, []);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fff4e5_0%,#f6ead9_45%,#edf3e8_100%)] px-6 pt-6 text-[#3d3128]">
      
      <div className="mx-auto flex min-h-screen max-w-md flex-col pb-32">
        
        <Header subtitle="함께 나눈 이야기들이에요" />

        <main className="flex flex-1 flex-col pt-8">

          {loading && (
            <div className="mt-10 text-center text-[#8a7463]">
              기록을 불러오고 있어요...
            </div>
          )}

          {!loading &&
            sessions.length === 0 && (
              <div className="mt-16 rounded-[28px] bg-white/80 p-8 text-center shadow-sm">
                
                <p className="text-[18px] font-bold">
                  아직 저장된 이야기가 없어요
                </p>

                <p className="mt-3 text-sm text-[#8a7463]">
                  첫 대화를 시작해보세요
                </p>
              </div>
            )}

          <div className="space-y-5">

            {sessions.map((session) => {
              const firstUserMessage =
                session.messages?.find(
                  (m) =>
                    m.role === "user"
                );

              return (
                <div
                  key={session.id}
                  className="rounded-[30px] bg-white/88 p-6 shadow-[0_18px_50px_rgba(93,68,42,0.08)] ring-1 ring-white/90"
                >
                  
                  <div className="flex items-center justify-between">
                    
                    <div>
                      <p className="text-sm text-[#8a7463]">
                        {new Date(
                          session.started_at
                        ).toLocaleString()}
                      </p>

                      <h3 className="mt-2 text-[22px] font-black leading-[1.4]">
                        함께 나눈 이야기
                      </h3>
                    </div>

                    <div className="rounded-full bg-[#edf4ec] px-3 py-1 text-xs font-bold text-[#6f9075]">
                      {session.detected_emotion ||
                        "편안함"}
                    </div>
                  </div>

                  <div className="mt-5 rounded-[22px] bg-[#faf6ef] p-5">
                    
                    <p className="text-sm font-bold text-[#8a7463]">
                      기억의 한 조각
                    </p>

                    <p className="mt-3 text-[17px] leading-[1.8] text-[#5e5148]">
                      {firstUserMessage
                        ?.content ||
                        "따뜻한 이야기를 나누셨어요."}
                    </p>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    
                    <span className="rounded-full bg-[#f4eadb] px-3 py-1 text-sm text-[#7c6857]">
                      #추억
                    </span>

                    <span className="rounded-full bg-[#edf4ec] px-3 py-1 text-sm text-[#6f9075]">
                      #이야기
                    </span>

                    <span className="rounded-full bg-[#f8efe4] px-3 py-1 text-sm text-[#9c7554]">
                      #기억
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </main>
      </div>

      <BottomTab />
    </div>
  );
}