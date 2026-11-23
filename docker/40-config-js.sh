#!/bin/sh
# SUPABASE_URL, SUPABASE_ANON_KEY 환경 변수를 주면 그 값으로 config.js를 만든다.
# 안 주면 저장소에 있는 config.js(운영 프로젝트의 공개 키)를 그대로 쓴다.
set -e
if [ -n "$SUPABASE_URL" ] && [ -n "$SUPABASE_ANON_KEY" ]; then
  printf 'window.CFG = { url: "%s", key: "%s" };\n' "$SUPABASE_URL" "$SUPABASE_ANON_KEY" > /usr/share/nginx/html/config.js
  echo "config.js: $SUPABASE_URL 사용"
fi
