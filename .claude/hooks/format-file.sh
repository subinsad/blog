#!/bin/bash
# PostToolUse: Edit/MultiEdit/Write 로 바뀐 ts/tsx/js/jsx 파일에 eslint --fix 를 돌린다.
#
# prettier 가 아니라 eslint 를 쓰는 이유: 이 프로젝트엔 prettier 가
# dependency 로도 config 로도 없다. pnpm exec prettier 를 그대로 쓰면
# 전역에 깔린 prettier 가 잡혀, 실제 스타일(작은따옴표·세미콜론 없음)과
# 다른 기본값(큰따옴표·세미콜론)으로 파일을 덮어쓴다. eslint.config.mjs
# (eslint-config-next) 가 이 프로젝트의 유일한 스타일 소스다.
#
# json/css/md 는 대상에서 뺐다 — eslint 가 다루지 않고, 이 프로젝트엔
# 그 파일들을 위한 formatter 가 아직 없다.

file_path=$(jq -r '.tool_input.file_path // empty')
[ -z "$file_path" ] && exit 0

echo "$file_path" | grep -qE '\.(ts|tsx|js|jsx)$' || exit 0

pnpm exec eslint --fix "$file_path"
