#!/bin/sh
# pg_dump → R2(r2:$R2_BUCKET/$BACKUP_PREFIX/) → 보관 기간 지난 것 삭제
set -eu
prefix="r2:${R2_BUCKET}/${BACKUP_PREFIX:-sch-meet/postgres}"
name="sch-meet-$(date +%Y%m%d-%H%M%S).dump"
tmp="/tmp/$name"
on_exit() {
  status=$?
  rm -f "$tmp"
  [ "$status" -eq 0 ] || notify.sh "SCH-Meet DB 백업 실패 ($(date '+%F %T')). 서버 로그를 확인하세요."
  exit "$status"
}
trap on_exit EXIT

pg_dump -h "$PGHOST" -U "$PGUSER" -d "$PGDATABASE" -Fc --no-owner --no-privileges -f "$tmp"
rclone copyto "$tmp" "$prefix/$name" --s3-no-check-bucket
rclone delete "$prefix" --min-age "${BACKUP_KEEP_DAYS:-30}d" --include 'sch-meet-*.dump'
touch /var/lib/backup/last-ok
echo "$(date '+%F %T') 백업 완료 $name ($(wc -c < "$tmp") bytes)"
