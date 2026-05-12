"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { createElder } from "@/services/elderService";
import type { ElderGender } from "@/types/elder";

export default function AdminElderlyNewPage() {
  const router = useRouter();
  const [fullName, setFullName] =
    useState("");
  const [displayName, setDisplayName] =
    useState("");
  const [age, setAge] = useState("");
  const [birthYear, setBirthYear] =
    useState("");
  const [gender, setGender] =
    useState<ElderGender>("female");
  const [facilityName, setFacilityName] =
    useState("");
  const [diagnosis, setDiagnosis] =
    useState("");
  const [note, setNote] = useState("");
  const [error, setError] =
    useState<string | null>(null);
  const [isSaving, setIsSaving] =
    useState(false);

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!fullName.trim()) {
      setError("이름은 꼭 입력해 주세요.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const elder =
        await createElder({
          fullName: fullName.trim(),
          displayName:
            displayName.trim() || undefined,
          age: age
            ? Number(age)
            : undefined,
          birthYear: birthYear
            ? Number(birthYear)
            : undefined,
          gender,
          facilityName:
            facilityName.trim() ||
            undefined,
          diagnosis:
            diagnosis.trim() ||
            undefined,
          note:
            note.trim() || undefined,
        });

      router.push(
        `/admin/elderly?created=${elder.id}`
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "어르신 등록에 실패했어요."
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-3xl">
        <div>
          <h1 className="text-4xl font-black tracking-tight">
            어르신 등록
          </h1>
          <p className="mt-2 text-[#6f5d50]">
            운영에 필요한 기본 정보를 먼저 등록해 주세요.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-8 rounded-[32px] bg-white p-7 shadow-sm"
        >
          <div className="grid gap-5 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-bold text-[#8a715c]">
                성함
              </span>
              <input
                value={fullName}
                onChange={(event) => {
                  setFullName(
                    event.target.value
                  );
                }}
                placeholder="김영자"
                className="mt-2 h-14 w-full rounded-2xl border border-[#eadfce] bg-[#faf7f1] px-4 outline-none focus:border-[#8ba77c]"
              />
            </label>

            <label className="block">
              <span className="text-sm font-bold text-[#8a715c]">
                호칭 이름
              </span>
              <input
                value={displayName}
                onChange={(event) => {
                  setDisplayName(
                    event.target.value
                  );
                }}
                placeholder="김영자 어르신"
                className="mt-2 h-14 w-full rounded-2xl border border-[#eadfce] bg-[#faf7f1] px-4 outline-none focus:border-[#8ba77c]"
              />
            </label>

            <label className="block">
              <span className="text-sm font-bold text-[#8a715c]">
                나이
              </span>
              <input
                value={age}
                onChange={(event) => {
                  setAge(
                    event.target.value
                  );
                }}
                inputMode="numeric"
                placeholder="84"
                className="mt-2 h-14 w-full rounded-2xl border border-[#eadfce] bg-[#faf7f1] px-4 outline-none focus:border-[#8ba77c]"
              />
            </label>

            <label className="block">
              <span className="text-sm font-bold text-[#8a715c]">
                출생년도
              </span>
              <input
                value={birthYear}
                onChange={(event) => {
                  setBirthYear(
                    event.target.value
                  );
                }}
                inputMode="numeric"
                placeholder="1941"
                className="mt-2 h-14 w-full rounded-2xl border border-[#eadfce] bg-[#faf7f1] px-4 outline-none focus:border-[#8ba77c]"
              />
            </label>

            <label className="block">
              <span className="text-sm font-bold text-[#8a715c]">
                성별
              </span>
              <select
                value={gender}
                onChange={(event) => {
                  setGender(
                    event.target
                      .value as ElderGender
                  );
                }}
                className="mt-2 h-14 w-full rounded-2xl border border-[#eadfce] bg-[#faf7f1] px-4 outline-none focus:border-[#8ba77c]"
              >
                <option value="female">
                  여성
                </option>
                <option value="male">
                  남성
                </option>
                <option value="other">
                  기타
                </option>
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-bold text-[#8a715c]">
                시설명
              </span>
              <input
                value={facilityName}
                onChange={(event) => {
                  setFacilityName(
                    event.target.value
                  );
                }}
                placeholder="행복요양원"
                className="mt-2 h-14 w-full rounded-2xl border border-[#eadfce] bg-[#faf7f1] px-4 outline-none focus:border-[#8ba77c]"
              />
            </label>

            <label className="block md:col-span-2">
              <span className="text-sm font-bold text-[#8a715c]">
                입장 코드
              </span>
              <input
                value="등록 후 자동 발급됩니다"
                readOnly
                className="mt-2 h-14 w-full rounded-2xl border border-dashed border-[#d7ccb9] bg-[#f7f4ee] px-4 text-[#8a7463] outline-none"
              />
            </label>
          </div>

          <label className="mt-5 block">
            <span className="text-sm font-bold text-[#8a715c]">
              진단 / 상태 메모
            </span>
            <input
              value={diagnosis}
              onChange={(event) => {
                setDiagnosis(
                  event.target.value
                );
              }}
              placeholder="경도 인지장애"
              className="mt-2 h-14 w-full rounded-2xl border border-[#eadfce] bg-[#faf7f1] px-4 outline-none focus:border-[#8ba77c]"
            />
          </label>

          <label className="mt-5 block">
            <span className="text-sm font-bold text-[#8a715c]">
              진행자 메모
            </span>
            <textarea
              value={note}
              onChange={(event) => {
                setNote(
                  event.target.value
                );
              }}
              placeholder="좋아하는 기억 단서나 금기 주제를 적어주세요."
              className="mt-2 h-36 w-full rounded-2xl border border-[#eadfce] bg-[#faf7f1] p-4 outline-none focus:border-[#8ba77c]"
            />
          </label>

          <div className="mt-5 rounded-2xl bg-[#f7f4ee] p-4 text-sm leading-6 text-[#6f5d50]">
            입장 코드는 등록과 동시에 자동 발급됩니다.
            등록 후 어르신 관리 목록에서 바로 확인할 수 있어요.
          </div>

          {error && (
            <div className="mt-5 rounded-2xl bg-[#fff3ef] p-4 text-sm text-[#8a5f57]">
              {error}
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={isSaving}
              className="flex h-14 items-center justify-center rounded-2xl bg-[#6f9075] px-6 text-lg font-semibold text-white disabled:opacity-60"
            >
              {isSaving
                ? "등록 중..."
                : "어르신 등록하기"}
            </button>

            <button
              type="button"
              onClick={() => {
                router.push(
                  "/admin/elderly"
                );
              }}
              className="flex h-14 items-center justify-center rounded-2xl bg-[#f7f4ee] px-6 text-lg font-semibold"
            >
              목록으로
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
