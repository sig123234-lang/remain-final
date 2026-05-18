#!/usr/bin/env bash
# 회상치료 프롬프트 (.md) → lib/ai-prompts.ts 동기화.
# 진료 규칙을 바꾸려면 markdown 원본을 수정한 뒤 이 스크립트를 한 번 돌린다.
#
# 사용:
#   bash scripts/sync-ai-prompts.sh
#
# 단일 source of truth = 대화 프로픔트 모음집/*.md
# 빌드 의존: lib/ai-prompts.ts (TypeScript import 대상)

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

OUT="lib/ai-prompts.ts"
V8="대화 프로픔트 모음집/회상치료_실행_프롬프트_v8.md"
V2_REC="대화 프로픔트 모음집/회상치료_세션기록_실행_프롬프트_v2.md"
V1_GUARDIAN="대화 프로픔트 모음집/보호자_리포트_생성_프롬프트_v1.md"

for f in "$V8" "$V2_REC" "$V1_GUARDIAN"; do
  if [ ! -f "$f" ]; then
    echo "❌ 프롬프트 .md 파일을 찾지 못했습니다: $f" >&2
    exit 1
  fi
done

python3 - "$V8" "$V2_REC" "$V1_GUARDIAN" > "$OUT" <<'PY'
import json, sys
v8 = open(sys.argv[1], encoding="utf-8").read()
v2 = open(sys.argv[2], encoding="utf-8").read()
v1_guardian = open(sys.argv[3], encoding="utf-8").read()

print("// AUTO-GENERATED from 대화 프로픔트 모음집/*.md")
print("// Edit those .md files (single source of truth), then regenerate via")
print("// scripts/sync-ai-prompts.sh.")
print()
print("export const INTERVIEWER_SYSTEM_PROMPT_V8 =")
print("  " + json.dumps(v8, ensure_ascii=False) + ";")
print()
print("export const SESSION_RECORD_SYSTEM_PROMPT_V2 =")
print("  " + json.dumps(v2, ensure_ascii=False) + ";")
print()
print("export const GUARDIAN_REPORT_SYSTEM_PROMPT_V1 =")
print("  " + json.dumps(v1_guardian, ensure_ascii=False) + ";")
PY

echo "✅ $OUT 생성 완료 ($(wc -l < "$OUT") lines)"
