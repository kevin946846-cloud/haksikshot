# 학식샷: 정적 화면(index.html, css/, js/, sync.js, config.js)을 nginx로 띄우는 이미지
# 데이터·로그인·AI 확인은 Supabase 클라우드를 그대로 씀 → 인터넷만 되면 어느 컴퓨터에서나 같은 화면
# 라이브러리(supabase-js)와 글꼴은 vendor/에 들어 있어 CDN이 막힌 학교망에서도 화면이 뜸
FROM nginx:1.27-alpine

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/40-config-js.sh /docker-entrypoint.d/40-config-js.sh
COPY index.html sync.js config.js /usr/share/nginx/html/
COPY css /usr/share/nginx/html/css
COPY js /usr/share/nginx/html/js
COPY vendor /usr/share/nginx/html/vendor

RUN chmod +x /docker-entrypoint.d/40-config-js.sh

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1
