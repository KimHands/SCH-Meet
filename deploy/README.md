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
4. 이미지를 빌드한다: `docker compose build`
5. DB를 올리고 마이그레이션을 실행한다: `docker compose up -d db && docker compose run --rm api python manage.py migrate`
6. 나머지를 올린다: `docker compose up -d`
7. 터널에 `sch-meet.kimhands.com → http://sch-meet-web:8080`을 추가한다. 외부 공개이므로 매번 사람이 승인한다.

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

## Render·Vercel에서 전환

각 단계는 사람이 승인한 뒤 실행한다.

1. OCR.space의 옛 키를 폐기한다. 공개 git 이력에 남아 있고, OCR 기능은 제거했다.
2. Google OAuth 승인된 자바스크립트 원본에 `https://sch-meet.kimhands.com`을 추가한다.
3. 터널 경로를 추가하고 실제 요청을 확인한다.
   - `X-Forwarded-Proto: https`가 Django까지 와서 리다이렉트가 반복되지 않는지
   - `CF-Connecting-IP`로 레이트리밋이 IP별로 나뉘는지
   - Google 로그인, 백업 업로드와 복원
   - 실제 에브리타임 URL 등록. 비공식 API라서 서버 IP에서 막혀 있을 수 있다. 막혀 있으면 직접 입력으로만 등록된다
4. Render 데이터는 옮기지 않는다. 실사용자가 없고 전부 테스트 데이터다. 실사용자가 생긴 뒤에 전환하게 되면 이전 절차를 다시 세운다.
5. `sch-meet.vercel.app`을 새 도메인으로 리다이렉트한다. 이미 공유된 초대 링크가 끊기지 않게 하기 위해서다.
6. `frontend/index.html`의 `og:url`과 루트 `README.md`의 서비스 주소를 고친다.
7. 안정화를 확인할 때까지 Render·Vercel을 지우지 않는다. 그 뒤에 `render.yaml`과 `frontend/vercel.json`을 지운다.

공개 전에 ADR 0015(서버의 Hermes 권한과 공개 웹앱 증가에 따른 위험 재검토)를 사람이 검토한다.

## 롤백

- **전환 롤백:** Render·Vercel은 전환 후에도 남겨 두므로, Vercel 리다이렉트를 먼저 풀고 터널 경로를 뺀다. 리다이렉트를 남기면 Vercel 방문자가 끊긴 새 도메인으로 이동한다. 새 도메인으로 공유된 초대 링크는 터널을 빼는 동안 열리지 않고, OCI에서 받은 쓰기는 Render로 돌아가지 않으므로 쓰기를 연 뒤라면 데이터 차이를 먼저 판단한다.
- **코드 업데이트 롤백:** 이전 커밋으로 `git checkout` 후 `docker compose up -d --build`. 이미 적용한 마이그레이션이 되돌릴 수 없는 것이면 백업에서 복원한다.

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

- 백업 실패 알림은 없다. 컨테이너가 `unhealthy`로만 표시되므로 `docker compose ps backup`이나 서버 모니터링으로 확인한다.

R2 업로드는 로컬에서 시험하지 않았다. 공개 전에 서버에서 백업과 복원을 한 번 시험한다.

## 신뢰 경계

`web`은 다른 앱도 붙는 `edge` 네트워크에 있다. `edge`의 다른 컨테이너가 침해되면 터널을 거치지 않고 `web`을 직접 호출해 `CF-Connecting-IP`를 바꿔 가며 로그인·토큰 갱신 레이트리밋을 우회할 수 있다. 인터넷에서 직접 가능한 경로는 아니다. 같은 서버의 앱이 늘면 다시 검토한다.
