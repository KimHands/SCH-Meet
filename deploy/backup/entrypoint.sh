#!/bin/sh
# cron 작업은 컨테이너 환경변수를 못 본다 → 파일로 넘긴다(컨테이너 안에서만, 600)
set -eu
mkdir -p /var/lib/backup
export -p > /var/lib/backup/env.sh
chmod 600 /var/lib/backup/env.sh
echo "${BACKUP_CRON:-0 4 * * *} . /var/lib/backup/env.sh && backup.sh >> /proc/1/fd/1 2>&1" > /etc/crontabs/root
[ "${BACKUP_ON_START:-1}" = 1 ] && backup.sh || echo "첫 백업 실패 — 로그 확인"
exec crond -f -l 8
