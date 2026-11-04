# Postgres 일일 백업: pg_dump(커스텀 포맷) → rclone → Cloudflare R2
FROM postgres:16-alpine
RUN apk add --no-cache curl rclone tzdata
COPY deploy/backup/backup.sh deploy/backup/restore.sh deploy/backup/entrypoint.sh deploy/backup/notify.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/backup.sh /usr/local/bin/restore.sh /usr/local/bin/entrypoint.sh /usr/local/bin/notify.sh \
  && mkdir -p /root/.config/rclone && touch /root/.config/rclone/rclone.conf # 설정은 RCLONE_CONFIG_R2_* 환경변수로
HEALTHCHECK --interval=10m --timeout=10s --start-period=5m \
  CMD find /var/lib/backup/last-ok -mmin -1560 | grep -q . || exit 1
ENTRYPOINT ["entrypoint.sh"]
