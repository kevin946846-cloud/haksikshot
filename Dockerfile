# 학식샷: 정적 화면(index.html, sync.js, config.js)을 nginx로 띄우는 이미지
# 데이터·로그인·AI 확인은 Supabase 클라우드를 그대로 씀 → 인터넷만 되면 어느 컴퓨터에서나 같은 화면
FROM nginx:1.27-alpine

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/40-config-js.sh /docker-entrypoint.d/40-config-js.sh
COPY index.html sync.js config.js /usr/share/nginx/html/

RUN chmod +x /docker-entrypoint.d/40-config-js.sh

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1
