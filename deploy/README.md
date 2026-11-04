# OCI 서버 배포

프론트·API·DB를 OCI 서버(ARM64, Ubuntu 24.04)의 Compose 스택 하나로 띄운다. 공개는 Cloudflare 터널로만 하고 호스트 포트는 열지 않는다.

```
Cloudflare 터널 → web(Caddy) ─┬ /api/* → api(gunicorn) → db(Postgres 16)
  <PUBLIC_HOST>               └ 그 외  → 정적 파일         ↑
                                              backup(일일 pg_dump → R2)
```

아래 명령은 모두 저장소의 `deploy/` 폴더에서 실행한다.

## 최초 배포

1. 저장소를 서버에 받는다(레포 전용 읽기 전용 deploy key).
2. 공유 네트워크가 없으면 만든다: `docker network create edge`
3. 환경변수를 채운다: `cp .env.example .env && chmod 600 .env` (`PUBLIC_HOST`는 필수)
4. 이미지를 빌드한다: `docker compose build`
5. DB를 올리고 마이그레이션을 실행한다: `docker compose up -d db && docker compose run --rm api python manage.py migrate`
6. 나머지를 올린다: `docker compose up -d`
7. 터널에 `<PUBLIC_HOST> → http://sch-meet-web:8080`을 추가한다. 외부 공개이므로 매번 사람이 승인한다.

## 업데이트

마이그레이션은 시작 시 자동으로 돌지 않는다. 새 코드가 옛 스키마로 요청을 받지 않도록 서비스를 멈추고 마이그레이션한 뒤 다시 연다. 어느 단계든 실패하면 `&&`에서 멈추며, 그때는 서비스를 열기 전에 원인을 확인한다.

```bash
git pull \
  && docker compose exec backup backup.sh \
  && docker compose build \
  && docker compose stop web api \
  && docker compose run --rm api python manage.py migrate \
  && docker compose up -d
```

gunicorn은 워커 1개에 스레드 4개로 둔다. 레이트리밋이 프로세스 메모리 캐시라서, 워커를 늘리려면 공유 캐시를 먼저 도입해야 한다. 재시작하면 레이트리밋 카운터는 초기화된다.

## 롤백

- **코드 업데이트:** 이전 커밋으로 `git checkout` 후 `docker compose up -d --build`. 이미 적용한 마이그레이션이 되돌릴 수 없는 것이면 백업에서 복원한다.

## 백업과 복원

- 매일 04:00 KST에 `pg_dump`를 R2의 `sch-meet/postgres`로 올리고 30일 보관한다. 컨테이너가 시작될 때도 한 번 실행한다.
- 백업 대상은 DB뿐이다. 앱이 디스크에 저장하는 파일은 없다.
- 지금 바로 백업: `docker compose exec backup backup.sh`
- 목록 확인: `docker compose exec backup sh -c 'rclone ls "r2:$R2_BUCKET/$BACKUP_PREFIX"'`
- 복원: DB 내용을 덮어쓰므로 사람이 승인한 뒤 실행한다. 복원은 한 트랜잭션이라 실패하면 DB가 그대로 남고 `&&`에서 멈춘다. 백업 시점 스키마가 현재 코드보다 오래됐을 수 있으므로 서비스를 열기 전에 마이그레이션한다.

  ```bash
  docker compose stop web api \
    && docker compose run --rm --entrypoint restore.sh backup sch-meet-20261101-040000.dump \
    && docker compose run --rm api python manage.py migrate \
    && docker compose up -d web api
  ```

- 백업이 실패하면 `TELEGRAM_BOT_TOKEN`과 `TELEGRAM_CHAT_ID`로 알림을 보낸다. 백업 컨테이너 자체가 멈춘 경우는 알림이 가지 않으므로 `docker compose ps backup`이나 서버 모니터링으로 확인한다.


## 신뢰 경계

`web`은 다른 앱도 붙는 `edge` 네트워크에 있다. `edge`의 다른 컨테이너가 침해되면 터널을 거치지 않고 `web`을 직접 호출해 `CF-Connecting-IP`를 바꿔 가며 로그인·토큰 갱신 레이트리밋을 우회할 수 있다. 인터넷에서 직접 가능한 경로는 아니다. 같은 서버의 앱이 늘면 다시 검토한다.
