# Запуск в продакшен

Чек-лист от пустого сервера до первых живых салонов. Пункты собраны по коду: `apps/api/src/config/env.ts` (что API требует и что включено по умолчанию), `docker-compose.yml`, `apps/web/Dockerfile`, `.github/workflows/uptime.yml`. Отмечайте `[x]` по мере выполнения.

Принцип: на старте только то, без чего запись не работает или опасна. Оплата онлайн, чеки, WhatsApp и Wallet выключены и включаются позже, по одному.

## 0. Что уже исправлено в коде для запуска

- [x] **Адрес сайта и тайлы карты в сборке веба.** `apps/web/Dockerfile` принимает `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_MAP_TILES_URL(_DARK)` и `NEXT_PUBLIC_MAP_ATTRIBUTION(_DARK)`, сервис `web` в `docker-compose.yml` передаёт их из `.env`. Next вшивает их при сборке, поэтому после смены адреса или ключа образ веба нужно пересобрать. Пустое значение означает «по умолчанию».
- [x] **Образ веба снова собирается.** `next build` проверял типы вместе с тестами, а один тест импортирует код из `apps/api`, которого в Docker-сборке веба нет (`turbo prune web`). Сборка теперь проверяет приложение по `apps/web/tsconfig.build.json` без тестов, `pnpm typecheck` по-прежнему проверяет всё. В `.dockerignore` добавлены папки сборок, отчёты и `.claude`: контекст сборки сократился с 3,9 ГБ до 760 КБ.
- [x] **Доверенные прокси настраиваются.** `TRUST_PROXY` (по умолчанию только своя сеть: `loopback, linklocal, uniquelocal`). Если перед сайтом стоит Cloudflare, задайте число прокси перед API: Cloudflare, затем веб-сервер Next, то есть `TRUST_PROXY=2` (плюс один, если между ними ещё Caddy). Без этого все клиенты выглядят одним адресом Cloudflare, и лимит 5 записей в минуту становится общим на весь сайт.
- [x] **Резервные копии.** Сервис `backup` в compose (`scripts/db-backup.sh`): копия при старте и затем раз в сутки, 14 последних в томе `backups`. Восстановление в отдельную базу: `scripts/db-restore.sh` (в живую базу он восстанавливать отказывается). Проверено на демо-данных: 36 бизнесов и 16 397 записей вернулись полностью.

## 1. Что нужно от вас (аккаунты и решения)

- [ ] Домен (по коду ожидается `awaisa.kg`) и DNS.
- [ ] Сервер: для старта хватит одного VPS на 2 vCPU и 4 ГБ (нагрузочные тесты: один процесс API держит ~700 запросов/с без кэша, `apps/api/load/README.md`).
- [ ] SMS: аккаунт Twilio с отправкой в Кыргызстан (`SMS_DRIVER` знает только `console` и `twilio`; местного шлюза в коде нет). Проверить цену и доставку на номера +996 до запуска.
- [ ] Telegram Gateway (`TELEGRAM_GATEWAY_TOKEN`): коды входа через Telegram дешевле SMS. Необязательно, но снижает расходы на SMS.
- [ ] Бот для владельцев в BotFather (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`): уведомления о записях, вход через Telegram, алерты.
- [ ] Хранилище фото: бакет Cloudflare R2 с публичным адресом.
- [ ] Sentry или GlitchTip (бесплатного плана хватит).
- [ ] Номера платформенных админов для `ADMIN_PHONES`.

## 2. Обязательные переменные API

Без них API не стартует в `NODE_ENV=production` или работает неправильно.

- [ ] `AUTH_SECRET`: не короче 32 символов (`openssl rand -base64 48`). От него зависят коды входа, подписи ссылок в SMS, ссылки на отзывы и чеки. **Сменить потом нельзя**: старые ссылки из SMS перестанут открываться.
- [ ] `DATABASE_URL`, `POSTGRES_PASSWORD`: не `awaisa` по умолчанию из compose.
- [ ] `REDIS_URL`: обязателен, потому что compose запускает раздельные `api` и `worker` (`PROCESS_ROLE=api|worker` без Redis не стартует).
- [ ] `WEB_ORIGIN=https://awaisa.kg` и `PUBLIC_WEB_URL=https://awaisa.kg`: из них строятся ссылки в SMS и Telegram.
- [ ] `ADMIN_PHONES`: доступ к `/insights`, `/moderation` и любому кабинету.
- [ ] `SMS_DRIVER=twilio` с `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` и `TWILIO_FROM` или `TWILIO_MESSAGING_SERVICE_SID`. Без них коды входа только пишутся в лог, и войти никто не сможет.
- [ ] `SMS_ALLOWED_COUNTRY_CODES=996` (по умолчанию так и есть): SMS и коды только на кыргызские номера.
- [ ] `STORAGE_DRIVER=s3`, `S3_BUCKET`, `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_PUBLIC_URL`. Без них фото лежат в томе `uploads` на одном сервере.
- [ ] Убедиться, что **не задан** `OTP_TEST_CODE` (API откажется стартовать) и не задан `PAYMENT_DRIVER=test` или `FISCAL_DRIVER=log` (тоже откажется).

## 3. Что в проде выключено по умолчанию (так и оставить на старте)

| Что | По умолчанию в production | Когда включать |
| --- | --- | --- |
| Предоплата | `PAYMENT_DRIVER=none` | Когда будет договор с Freedom Pay: `freedompay` + `FREEDOMPAY_MERCHANT_ID`, `FREEDOMPAY_SECRET_KEY`, сначала `FREEDOMPAY_TESTING_MODE=true` |
| Фискальные чеки | `FISCAL_DRIVER=off` | Когда eKassa даст описание API (`docs/fiscal.md`): сейчас драйвер `ekassa` держит чеки в очереди |
| WhatsApp | `off` без ключей | После одобрения шаблонов в Meta (`docs/whatsapp.md`) |
| Web Push | скрыт без `VAPID_*` | Сразу можно: `npx web-push generate-vapid-keys` |
| Пуши в приложении | только в лог без `EXPO_ACCESS_TOKEN` | Когда приложение будет в сторах |
| Apple и Google Wallet | кнопок нет без `WALLET_*`, `GOOGLE_WALLET_*` | Позже |

## 4. Сборка и запуск

- [ ] В `.env` на сервере: `NEXT_PUBLIC_SITE_URL=https://awaisa.kg` и ключи тайлов карты (MapTiler или 2GIS), если они есть. Они попадают в образ веба при сборке.
- [ ] Reverse proxy с TLS (Caddy проще всего): `awaisa.kg` на `web:3000`. За Cloudflare задать `TRUST_PROXY` (раздел 0). API наружу не открывать, веб ходит в него по `/api` (rewrite на `API_URL`).
- [ ] Порты Postgres и Redis в compose привязаны к `127.0.0.1`, наружу не открыты: так и оставить.
- [ ] `docker compose --profile app up -d --build`: сначала `migrate`, потом `api` и `worker`.
- [ ] `worker` строго в одном экземпляре: в нём все cron-задачи и Telegram long-poll. `api` можно масштабировать.
- [ ] Telegram: либо long-poll (по умолчанию, один процесс), либо `TELEGRAM_WEBHOOK_URL=https://awaisa.kg/api/telegram/webhook` + `TELEGRAM_WEBHOOK_SECRET`.
- [ ] **Никогда** не запускать `pnpm db:seed` на проде: демо-данные только для разработки.

## 5. Мониторинг

- [ ] `SENTRY_DSN`, `SENTRY_ENVIRONMENT=production`, `SENTRY_RELEASE` (хэш коммита) в окружении API.
- [ ] `ALERT_TELEGRAM_CHAT_ID`: чат для алертов (боту владельцев отправить `/chatid`). Worker каждые 5 минут шлёт туда новые ошибки сервера и отказ Redis.
- [ ] GitHub: переменная `UPTIME_URLS="https://awaisa.kg https://awaisa.kg/api/health"` и секреты `ALERT_TELEGRAM_BOT_TOKEN`, `ALERT_TELEGRAM_CHAT_ID`. Без переменной `uptime.yml` молча пропускается.
- [ ] Проверить, что `/api/health` отвечает `cache: redis`, а не `memory`.

## 6. Резервные копии

- [ ] Сервис `backup` запущен: `docker compose --profile app logs backup` показывает `backup: awaisa-….dump`.
- [ ] **Копия на другом сервере.** Том `backups` лежит на том же диске, что и база, и вместе с сервером пропадёт. Каждую ночь синхронизировать его в отдельный бакет R2, например `rclone sync /var/lib/docker/volumes/awaisa_backups/_data r2:awaisa-backups` по cron.
- [ ] **Один раз восстановить копию** и открыть сайт на ней:
  `docker compose --profile app run --rm --entrypoint sh backup /scripts/db-restore.sh /backups/<файл>.dump awaisa_restore`. Копия, которую ни разу не восстанавливали, не считается.
- [ ] Фото в R2 базой не копируются: включить версионирование бакета или отдельную копию.

## 7. Проверка перед первыми салонами

Пройти руками на дешёвом Android и на iPhone, на продовой сборке:

- [ ] Вход по SMS на реальный номер +996: код приходит меньше чем за минуту.
- [ ] Регистрация бизнеса, услуги, мастер, часы работы, обложка (фото уходит в R2).
- [ ] Запись гостем с телефона: SMS-подтверждение пришло, ссылка из SMS открывает визит.
- [ ] Отмена с «Вернуть», перенос, напоминание за 2 часа.
- [ ] Бот владельца присылает «Новая запись».
- [ ] Отзыв по ссылке из SMS через два часа после визита.
- [ ] `/sitemap.xml` и `/robots.txt` отдают адреса на `awaisa.kg`, а не на localhost.
- [ ] Ошибка, вызванная нарочно, видна в Sentry и в Telegram-чате алертов.

## 8. Первые салоны

- [ ] 3-5 салонов в Бишкеке, лучше разных видов (барбершоп, ногти, брови).
- [ ] Заводить данные вместе с владельцем или за него: услуги, мастера, фото работ. Пустая страница не продаёт.
- [ ] Тариф: бесплатно на время пилота (`POST /manage/:slug/billing/extend` от платформенного админа).
- [ ] Ссылки на запись по филиалам («Филиалы → Ссылки для записи») в 2ГИС и Instagram каждого салона.
- [ ] Две недели не добавлять функций: смотреть воронку записи в `/insights`, ошибки в чате алертов и спрашивать администраторов, где неудобно.
