#!/bin/sh
# 사용: restore.sh <파일 이름 | 로컬 경로>   예) restore.sh sch-meet-20261101-040000.dump
#   R2의 백업(또는 컨테이너 안 로컬 파일)을 현재 DB에 덮어쓴다. api를 멈춘 뒤 실행한다.
set -eu
src="${1:?백업 파일 이름이 필요하다 (rclone ls r2:\$R2_BUCKET/sch-meet/postgres)}"
if [ -f "$src" ]; then
  file="$src"
else
  file="/tmp/restore.dump"
  rclone copyto "r2:${R2_BUCKET}/${BACKUP_PREFIX:-sch-meet/postgres}/$src" "$file"
fi
pg_restore -h "$PGHOST" -U "$PGUSER" -d "$PGDATABASE" --clean --if-exists --no-owner --no-privileges "$file"
echo "복원 완료: $src"
