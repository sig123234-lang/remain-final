"use client";

import Link from "next/link";
import {
  useEffect,
  useState,
} from "react";

import {
  deriveAgeFromBirthDate,
  normalizeEntryCode,
} from "@/lib/elder-utils";
import {
  deleteElder,
  listElders,
  updateElder,
} from "@/services/elderService";
import type {
  CreateElderParams,
  ElderGender,
  ElderRecord,
} from "@/types/elder";

type ElderEditFormState = {
  fullName: string;
  displayName: string;
  entryCode: string;
  birthDate: string;
  gender: ElderGender;
  facilityName: string;
  diagnosis: string;
  note: string;
};

function createEditForm(
  elder: ElderRecord
): ElderEditFormState {
  return {
    fullName: elder.full_name,
    displayName:
      elder.display_name ?? "",
    entryCode: elder.entry_code ?? "",
    birthDate: elder.birth_date ?? "",
    gender: elder.gender ?? "female",
    facilityName:
      elder.facility_name ?? "",
    diagnosis: elder.diagnosis ?? "",
    note: elder.note ?? "",
  };
}

export default function AdminElderlyPage() {
  const createdElderId =
    typeof window === "undefined"
      ? null
      : new URLSearchParams(
          window.location.search
        ).get("created");
  const [elders, setElders] = useState<
    ElderRecord[]
  >([]);
  const [isLoading, setIsLoading] =
    useState(true);
  const [error, setError] =
    useState<string | null>(null);
  const [editingElderId, setEditingElderId] =
    useState<string | null>(null);
  const [editForm, setEditForm] =
    useState<ElderEditFormState | null>(null);
  const [savingElderId, setSavingElderId] =
    useState<string | null>(null);
  const [deletingElderId, setDeletingElderId] =
    useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data =
          await listElders();
        setElders(data);
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "어르신 목록을 불러오지 못했어요."
        );
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, []);

  const derivedAge =
    editForm?.birthDate
      ? deriveAgeFromBirthDate(
          editForm.birthDate
        )
      : null;

  const startEditing = (
    elder: ElderRecord
  ) => {
    setEditingElderId(elder.id);
    setEditForm(createEditForm(elder));
    setError(null);
  };

  const cancelEditing = () => {
    setEditingElderId(null);
    setEditForm(null);
  };

  const handleSave = async (
    elderId: string
  ) => {
    if (!editForm) {
      return;
    }

    if (!editForm.fullName.trim()) {
      setError("이름은 꼭 입력해 주세요.");
      return;
    }

    if (!editForm.entryCode.trim()) {
      setError("입장 코드를 입력해 주세요.");
      return;
    }

    if (!editForm.birthDate || derivedAge === null) {
      setError(
        "생년월일을 올바르게 입력해 주세요."
      );
      return;
    }

    setSavingElderId(elderId);
    setError(null);

    const params: CreateElderParams = {
      fullName: editForm.fullName.trim(),
      displayName:
        editForm.displayName.trim() ||
        undefined,
      entryCode: editForm.entryCode,
      birthDate: editForm.birthDate,
      age: derivedAge ?? undefined,
      birthYear: Number(
        editForm.birthDate.slice(0, 4)
      ),
      gender: editForm.gender,
      facilityName:
        editForm.facilityName.trim() ||
        undefined,
      diagnosis:
        editForm.diagnosis.trim() ||
        undefined,
      note:
        editForm.note.trim() || undefined,
    };

    try {
      const updatedElder =
        await updateElder(
          elderId,
          params
        );

      setElders((previous) =>
        previous.map((elder) =>
          elder.id === elderId
            ? updatedElder
            : elder
        )
      );
      cancelEditing();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "어르신 수정에 실패했어요."
      );
    } finally {
      setSavingElderId(null);
    }
  };

  const handleDelete = async (
    elderId: string,
    elderName: string
  ) => {
    if (
      !window.confirm(
        `${elderName} 어르신을 목록에서 삭제할까요?`
      )
    ) {
      return;
    }

    setDeletingElderId(elderId);
    setError(null);

    try {
      await deleteElder(elderId);
      setElders((previous) =>
        previous.filter(
          (elder) => elder.id !== elderId
        )
      );

      if (editingElderId === elderId) {
        cancelEditing();
      }
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "어르신 삭제에 실패했어요."
      );
    } finally {
      setDeletingElderId(null);
    }
  };

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black tracking-tight">
              어르신 관리
            </h1>
            <p className="mt-2 text-[#6f5d50]">
              등록된 어르신 정보를 보고 바로 회상 세션을 시작할 수 있어요.
            </p>
          </div>

          <Link
            href="/admin/elderly/new"
            className="rounded-2xl bg-[#6f9075] px-5 py-3 text-sm font-semibold text-white shadow-sm"
          >
            새 어르신 등록
          </Link>
        </div>

        {error && (
          <div className="mt-6 rounded-3xl bg-[#fff3ef] p-5 text-sm text-[#8a5f57] shadow-sm">
            {error}
          </div>
        )}

        <div className="mt-8 grid gap-4">
          {isLoading && (
            <div className="rounded-3xl bg-white p-6 shadow-sm">
              목록을 불러오고 있어요.
            </div>
          )}

          {!isLoading &&
            elders.length === 0 && (
              <div className="rounded-3xl bg-white p-6 shadow-sm">
                아직 등록된 어르신이 없습니다.
              </div>
            )}

          {elders.map((elder) => {
            const isEditing =
              editingElderId === elder.id &&
              editForm !== null;
            const isSaving =
              savingElderId === elder.id;
            const isDeleting =
              deletingElderId === elder.id;

            return (
              <div
                key={elder.id}
                className={`rounded-[28px] bg-white p-6 shadow-sm ${
                  createdElderId === elder.id
                    ? "ring-2 ring-[#8ba77c]"
                    : ""
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-[#8a7463]">
                      elder {elder.id.slice(0, 8)}
                    </p>
                    <h2 className="mt-2 text-2xl font-black">
                      {elder.display_name ||
                        elder.full_name}
                    </h2>
                    <p className="mt-2 text-[#6f5d50]">
                      {elder.age
                        ? `${elder.age}세`
                        : "나이 미기록"}{" "}
                      ·{" "}
                      {elder.facility_name ||
                        "시설 미기록"}{" "}
                      ·{" "}
                      {elder.diagnosis ||
                        "진단 정보 없음"}
                    </p>

                    <div className="mt-4 inline-flex flex-wrap items-center gap-2 rounded-full bg-[#edf4ec] px-4 py-2 text-sm font-semibold text-[#5f7b62]">
                      <span>입장 코드</span>
                      <span className="font-black tracking-[0.16em]">
                        {elder.entry_code ||
                          "미발급"}
                      </span>
                    </div>

                    {createdElderId ===
                      elder.id && (
                      <p className="mt-3 text-sm font-semibold text-[#6f9075]">
                        새 입장 코드가 발급되었습니다.
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/talk/today?elderId=${elder.id}`}
                      className="rounded-xl bg-[#6f9075] px-4 py-3 text-sm font-semibold text-white"
                    >
                      대화 시작
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        if (isEditing) {
                          cancelEditing();
                        } else {
                          startEditing(elder);
                        }
                      }}
                      className="rounded-xl bg-[#edf4ec] px-4 py-3 text-sm font-semibold text-[#5f7b62]"
                    >
                      {isEditing
                        ? "수정 닫기"
                        : "수정"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        void handleDelete(
                          elder.id,
                          elder.display_name ||
                            elder.full_name
                        );
                      }}
                      disabled={isDeleting}
                      className="rounded-xl bg-[#fff3ef] px-4 py-3 text-sm font-semibold text-[#9b5f57] disabled:opacity-60"
                    >
                      {isDeleting
                        ? "삭제 중..."
                        : "삭제"}
                    </button>
                    <Link
                      href="/admin/live"
                      className="rounded-xl bg-[#f7f4ee] px-4 py-3 text-sm font-semibold"
                    >
                      운영 패널
                    </Link>
                  </div>
                </div>

                {elder.note && !isEditing && (
                  <div className="mt-5 rounded-2xl bg-[#faf8f4] p-4 text-sm leading-6 text-[#5f5a53]">
                    {elder.note}
                  </div>
                )}

                {isEditing && editForm && (
                  <div className="mt-5 rounded-[24px] border border-[#ece4d8] bg-[#faf8f4] p-5">
                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="block">
                        <span className="text-sm font-bold text-[#8a715c]">
                          성함
                        </span>
                        <input
                          value={editForm.fullName}
                          onChange={(event) => {
                            setEditForm({
                              ...editForm,
                              fullName:
                                event.target.value,
                            });
                          }}
                          className="mt-2 h-12 w-full rounded-2xl border border-[#eadfce] bg-white px-4 outline-none focus:border-[#8ba77c]"
                        />
                      </label>

                      <label className="block">
                        <span className="text-sm font-bold text-[#8a715c]">
                          호칭 이름
                        </span>
                        <input
                          value={
                            editForm.displayName
                          }
                          onChange={(event) => {
                            setEditForm({
                              ...editForm,
                              displayName:
                                event.target.value,
                            });
                          }}
                          className="mt-2 h-12 w-full rounded-2xl border border-[#eadfce] bg-white px-4 outline-none focus:border-[#8ba77c]"
                        />
                      </label>

                      <label className="block">
                        <span className="text-sm font-bold text-[#8a715c]">
                          입장 코드
                        </span>
                        <input
                          value={editForm.entryCode}
                          onChange={(event) => {
                            setEditForm({
                              ...editForm,
                              entryCode:
                                normalizeEntryCode(
                                  event.target.value
                                ),
                            });
                          }}
                          className="mt-2 h-12 w-full rounded-2xl border border-[#eadfce] bg-white px-4 uppercase outline-none focus:border-[#8ba77c]"
                        />
                      </label>

                      <label className="block">
                        <span className="text-sm font-bold text-[#8a715c]">
                          생년월일
                        </span>
                        <input
                          type="date"
                          value={editForm.birthDate}
                          onChange={(event) => {
                            setEditForm({
                              ...editForm,
                              birthDate:
                                event.target.value,
                            });
                          }}
                          className="mt-2 h-12 w-full rounded-2xl border border-[#eadfce] bg-white px-4 outline-none focus:border-[#8ba77c]"
                        />
                        {!editForm.birthDate && (
                          <p className="mt-2 text-xs text-[#8a7463]">
                            기존 데이터에 생년월일이 없으면 직접 입력해 주세요.
                          </p>
                        )}
                      </label>

                      <label className="block">
                        <span className="text-sm font-bold text-[#8a715c]">
                          나이
                        </span>
                        <input
                          value={
                            derivedAge !== null
                              ? `${derivedAge}세`
                              : ""
                          }
                          readOnly
                          placeholder="생년월일 입력 시 자동 계산"
                          className="mt-2 h-12 w-full rounded-2xl border border-dashed border-[#d7ccb9] bg-[#f7f4ee] px-4 text-[#8a7463] outline-none"
                        />
                      </label>

                      <label className="block">
                        <span className="text-sm font-bold text-[#8a715c]">
                          성별
                        </span>
                        <select
                          value={editForm.gender}
                          onChange={(event) => {
                            setEditForm({
                              ...editForm,
                              gender:
                                event.target
                                  .value as ElderGender,
                            });
                          }}
                          className="mt-2 h-12 w-full rounded-2xl border border-[#eadfce] bg-white px-4 outline-none focus:border-[#8ba77c]"
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

                      <label className="block md:col-span-2">
                        <span className="text-sm font-bold text-[#8a715c]">
                          시설명
                        </span>
                        <input
                          value={
                            editForm.facilityName
                          }
                          onChange={(event) => {
                            setEditForm({
                              ...editForm,
                              facilityName:
                                event.target.value,
                            });
                          }}
                          className="mt-2 h-12 w-full rounded-2xl border border-[#eadfce] bg-white px-4 outline-none focus:border-[#8ba77c]"
                        />
                      </label>
                    </div>

                    <label className="mt-4 block">
                      <span className="text-sm font-bold text-[#8a715c]">
                        진단 / 상태 메모
                      </span>
                      <input
                        value={editForm.diagnosis}
                        onChange={(event) => {
                          setEditForm({
                            ...editForm,
                            diagnosis:
                              event.target.value,
                          });
                        }}
                        className="mt-2 h-12 w-full rounded-2xl border border-[#eadfce] bg-white px-4 outline-none focus:border-[#8ba77c]"
                      />
                    </label>

                    <label className="mt-4 block">
                      <span className="text-sm font-bold text-[#8a715c]">
                        진행자 메모
                      </span>
                      <textarea
                        value={editForm.note}
                        onChange={(event) => {
                          setEditForm({
                            ...editForm,
                            note:
                              event.target.value,
                          });
                        }}
                        className="mt-2 h-32 w-full rounded-2xl border border-[#eadfce] bg-white p-4 outline-none focus:border-[#8ba77c]"
                      />
                    </label>

                    <div className="mt-5 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          void handleSave(
                            elder.id
                          );
                        }}
                        disabled={isSaving}
                        className="rounded-2xl bg-[#6f9075] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
                      >
                        {isSaving
                          ? "저장 중..."
                          : "수정 저장"}
                      </button>
                      <button
                        type="button"
                        onClick={cancelEditing}
                        className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold"
                      >
                        취소
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
