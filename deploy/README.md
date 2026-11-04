# OCI 서버 배포

프론트·API·DB를 oci-server(ARM64, Ubuntu 24.04)의 Compose 스택 하나로 띄운다. 공개는 Cloudflare 터널로만 하고 호스트 포트는 열지 않는다.

```
Cloudflare 터널 → web(Caddy) ─┬ /api/* → api(gunicorn) → db(Postgres 16)
  sch-meet.kimhands.com       └ 그 외  → 정적 파일         ↑
                                              backup(일일 pg_dump → R2)
```

아래 명령은 모두 `~/stacks/sch-meet/deploy`에서 실행한다.

## 최초 배포

1. 저장소를 `~/stacks/sch-meet`에 받는다(레포 전용 읽기 전용 deploy key).
2. 공유 네트워크가 없으면 만든다: `docker network create edge`
3. 환경변수를 채운다: `cp .env.example .env && chmod 600 .env`
4. DB와 API를 올린다: `docker compose up -d --build db api`
5. 마이그레이션을 실행한다: `docker compose run --rm api python manage.py migrate`
6. 나머지를 올린다: `docker compose up -d --build`
7. 터널에 `sch-meet.kimhands.com → http://sch-meet-web:8080`을 추가한다. 외부 공개이므로 매번 사람이 승인한다.

## 업데이트

마이그레이션은 시작 시 자동으로 돌지 않는다. 새 마이그레이션이 있으면 백업 후 직접 실행한다.

```bash
git pull
docker compose exec backup backup.sh
docker compose up -d --build
docker compose run --rm api python manage.py showmigrations api
docker compose run --rm api python manage.py migrate
```

gunicorn은 워커 1개에 스레드 4개로 둔다. 레이트리밋이 프로세스 메모리 캐시라서, 워커를 늘리려면 공유 캐시를 먼저 도입해야 한다. 재시작하면 레이트리밋 카운터는 초기화된다.

## Render·Vercel에서 전환

각 단계는 사람이 승인한 뒤 실행한다.

1. OCR.space 키를 재발급한다. 옛 키는 공개 git 이력에 남아 있다.
2. Render DB의 Postgres 버전을 확인한다. 16보다 높으면 `compose.yml`의 `db`와 `backup/Dockerfile`의 이미지 버전을 올린다.
3. PR #13을 머지하기 전에 Render DB를 백업한다. 마이그레이션 0011은 역방향 복구가 안 된다.
4. Google OAuth 승인된 자바스크립트 원본에 `https://sch-meet.kimhands.com`을 추가한다.
5. 터널 경로를 추가하고 실제 요청을 확인한다.
   - `X-Forwarded-Proto: https`가 Django까지 와서 리다이렉트가 반복되지 않는지
   - `CF-Connecting-IP`로 레이트리밋이 IP별로 나뉘는지
   - Google 로그인, OCR, 백업 업로드와 복원
6. 쓰기를 멈추고 데이터를 옮긴 뒤 마이그레이션을 실행한다. 옮기지 않기로 했다면 이 단계를 건너뛴다.

   ```bash
   docker compose run --rm -T --no-deps --entrypoint pg_dump backup \
     "<Render 외부 DB URL>?sslmode=require" -Fc --no-owner --no-privileges > render.dump
   docker compose stop api web
   docker compose exec -T db pg_restore -U schmeet -d schmeet --clean --if-exists --no-owner --no-privileges < render.dump
   docker compose up -d api web
   docker compose run --rm api python manage.py migrate
   ```

   `render.dump`에는 사용자 데이터가 들어 있으므로 확인 후 서버에서 지운다.
7. `sch-meet.vercel.app`을 새 도메인으로 리다이렉트한다. 이미 공유된 초대 링크가 끊기지 않게 하기 위해서다.
8. `frontend/index.html`의 `og:url`과 루트 `README.md`의 서비스 주소를 고친다.
9. 안정화를 확인할 때까지 Render·Vercel을 지우지 않는다. 그 뒤에 `render.yaml`과 `frontend/vercel.json`을 지운다.

공개 전에 ADR 0015(서버의 Hermes 권한과 공개 웹앱 증가에 따른 위험 재검토)를 사람이 검토한다.

## 롤백

- **전환 전이나 직후:** 터널 경로를 빼고 Vercel·Render를 그대로 쓴다. OCI에서 받은 쓰기는 Render로 돌아가지 않으므로, 쓰기를 다시 연 뒤의 롤백은 데이터 차이를 먼저 판단한다.
- **코드 업데이트:** 이전 커밋으로 `git checkout` 후 `docker compose up -d --build`. 이미 적용한 마이그레이션이 되돌릴 수 없는 것이면 백업에서 복원한다.

## 백업과 복원

- 매일 04:00 KST에 `pg_dump`를 R2의 `sch-meet/postgres`로 올리고 30일 보관한다. 컨테이너가 시작될 때도 한 번 실행한다.
- 업로드 이미지는 디스크에 저장하지 않으므로 백업 대상은 DB뿐이다.
- 지금 바로 백업: `docker compose exec backup backup.sh`
- 목록 확인: `docker compose exec backup sh -c 'rclone ls "r2:$R2_BUCKET/$BACKUP_PREFIX"'`
- 복원: DB 내용을 덮어쓰므로 사람이 승인한 뒤 실행한다.

  ```bash
  docker compose stop api web
  docker compose run --rm --entrypoint restore.sh backup sch-meet-20261101-040000.dump
  docker compose up -d api web
  ```

R2 업로드와 복원은 로컬에서 시험하지 않았다. 공개 전에 서버에서 한 번 시험한다.
