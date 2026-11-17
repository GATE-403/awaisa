# Аналитика: предложение и что уже сделано

Пункты 1–3 из «Порядка» ниже сделаны (ветка `feat/funnel-flows`): шаги всех сценариев, профиль
устройства, `form_error` и `toast_action`. Web Vitals и Clarity — нет. Как читать отчёты — в
разделе «Отчёты» в конце. Ниже — как измерять в живом
трафике то же, что UX-кит проверяет на тестах: где люди бросают каждый сценарий и с каких
устройств.

## Что есть сейчас

- `apps/web/src/shared/lib/telemetry.ts` → `POST /api/telemetry/events` → таблица `funnel_events`
  (`session` — случайный id устройства `awaisa:device:v1`, `step`, `slug`, `created_at`).
  Сторонних трекеров нет, персональных данных нет.
- Шаги — только запись: `catalog → business → booking_open → service → specialist → time →
  contacts → booked` (`FUNNEL_STEPS` в `apps/api/src/telemetry/telemetry.schemas.ts`).
- Ошибки: `POST /api/telemetry/errors` → `app_errors`; отчёты `GET /telemetry/funnel?days`,
  `GET /telemetry/errors?days` для платформенных админов.
- Чего нет: остальных сценариев (вход, перенос и отмена, предоплата, лист ожидания, отзыв,
  регистрация владельца), устройства и условий, времени между шагами, ошибок в формах.

## 1. События воронки по каждому сценарию

Принцип прежний: одно событие на шаг за загрузку страницы, без персональных данных. Предлагаю
добавить в событие поле `flow` и расширить список шагов. Имена — в стиле существующих.

| Сценарий (`flow`) | Шаги по порядку | Где ставить `trackStep` |
|---|---|---|
| `booking` (есть) | `catalog`, `business`, `booking_open`, `service`, `specialist`, `time`, `contacts`, `booked` | как сейчас |
| `search` | `search_open`, `search_typed`, `search_results`, `search_pick`, `search_empty` (ничего не нашли) | `widgets/HeaderSearch`, `views/catalog/ui/CatalogResults` |
| `login` | `login_open`, `otp_sent` (+ `channel`), `otp_error`, `otp_ok`, `name_set`, `login_done`, `telegram_login` | `views/auth/LoginPage.tsx`, `model/useTelegramLogin` |
| `manage_booking` | `ticket_open`, `reschedule_open`, `reschedule_done`, `cancel`, `cancel_undone` («Вернуть»), `wallet_add` | `views/bookings/ui/UpcomingBooking`, `features/rescheduleBooking`, `features/ticketView` |
| `prepayment` | `deposit_shown` (сумма видна в форме), `checkout_open`, `pay_click`, `paid`, `pay_failed`, `hold_expired` (сервер) | `views/booking`, `views/pay/PayPage.tsx`, `BookingPaymentsService` |
| `waitlist` | `full_day_shown`, `waitlist_open`, `waitlist_joined`, `waitlist_notified` (сервер), `waitlist_booked` | `features/waitlist`, `WaitlistService.notifyFreed` |
| `review` | `review_open` (по SMS или из профиля), `review_rated`, `review_sent`, `review_photo` | `views/review/ReviewPage.tsx`, `features/rateVisit` |
| `owner` | `business_landing`, `register_step1/2/3`, `register_done`, `setup_service`, `setup_master`, `first_booking` (сервер) | `views/forBusiness`, `views/manage/ui/SetupProgress` |

Плюс общие сигналы трудностей, которые UX-кит ловит на тестах:

| Событие | Когда | Что покажет |
|---|---|---|
| `form_error` + `field` (имя поля, не значение) | ошибка валидации показана | какие поля путают (`phone` в записи, код в `/login`) |
| `toast_action` + `kind` | нажали действие в тосте («Вернуть») | успевают ли нажать — если почти никогда, тост исчезает слишком быстро |
| `rage_tap` | 3 нажатия по одному месту за 1 с | «мёртвые» элементы и неочевидные цели |
| `back_from_step` + `step` | вернулись к шагу «Изменить» | шаги, где передумывают |

**API:** в `FUNNEL_STEPS` добавить шаги, в `funnelEventsSchema` — необязательные `flow` и
`meta` (`{ field?, channel?, kind? }`: короткие перечисления, не свободный текст), в
`funnel_events` — колонки `flow varchar(20)` и `meta jsonb`. `buildFunnel` уже считает удержание
по шагам; ему нужен параметр `flow`, чтобы отдавать отдельную воронку на сценарий.

## 2. Сегментация по устройству

Отправлять с каждой пачкой событий (а не с каждым событием) **грубый** профиль устройства —
без отпечатка браузера и без IP:

| Поле | Значения | Откуда |
|---|---|---|
| `device` | `phone` / `tablet` / `desktop` | ширина экрана: < 768 / < 1024 / больше |
| `os` | `ios` / `android` / `other` | `navigator.userAgentData` или UA, только семейство |
| `app` | `web` / `native` | `window.__NATIVE_APP__` (WebView-оболочка) |
| `textScale` | `1` / `1.3+` / `2+` | `devicePixelRatio` и `visualViewport.scale` для зума, сравнение `rem` с 16 px — для «крупного шрифта» |
| `reducedMotion`, `contrastMore`, `dark` | `0/1` | `matchMedia` |
| `net` | `slow-2g` / `2g` / `3g` / `4g` | `navigator.connection.effectiveType` (Chrome/Android) |
| `lang` | `ru` / `ky` / `en` | `awaisa:lang:v1` |

Хранить в `funnel_sessions (session, first_seen, device, os, app, text_scale, net, lang, …)` —
одна строка на устройство, обновляется раз в день. Отчёт `GET /telemetry/funnel?days&flow&device`
отдаёт воронку для сегмента: например, «запись на телефонах с крупным шрифтом» против
«запись на десктопе». Так мы увидим в живых данных то, что кит видит на тестах: падает ли
конверсия у людей с крупным шрифтом и медленной сетью.

Возраст не собираем и не угадываем. Связь с группами персон — через эти признаки
(крупный шрифт, зум, медленная сеть, планшет) и через живые сессии.

**Скорость** — добавить к пачке Web Vitals (`LCP`, `INP`, `CLS`, через `PerformanceObserver`
без библиотеки), с тем же сегментом: проверка «Slow 4G» из кита получит живое подтверждение.

## 3. Microsoft Clarity — как вариант

Бесплатно, даёт записи сессий, тепловые карты, «rage clicks», «dead clicks» и «quick backs».

**За:**
- Сразу видно, где люди теряются, без разметки событий; хорошо дополняет живые сессии.
- Сегменты по устройству, браузеру, стране — из коробки.

**Против и риски:**
- Это первый сторонний трекер: сейчас его нет намеренно. Нужно отдельное решение
  владельца, строка в политике конфиденциальности и баннер согласия (Clarity ставит cookies).
- Записи сессий — это экраны с именами, телефонами, кодами из SMS. Обязательно маскировать:
  режим маскировки «Strict», `data-clarity-mask="true"` на формах записи, `/login`, `/pay`,
  кабинете, профиле; кабинет и `/manage` лучше не записывать вовсе.
- Скрипт ~ 60 КБ и сетевые запросы — на «Slow 4G» это заметно. Грузить после `load`,
  только на публичных страницах, с выборкой (например, 10% сессий).
- Данные уходят в Microsoft (США). Проверить требования к персональным данным в КР.

**Как попробовать без риска:** включить на 2–4 недели только на `/` и `/<slug>` (каталог и
страница места — там нет личных данных), 10% сессий, после согласия. Решение о продлении — по
тому, нашли ли записи проблемы, которых не видно в воронке и на живых сессиях.

## Порядок

1. ✅ Шаги для всех сценариев (поиск, вход, талон и отмена, предоплата, лист ожидания, отзыв, регистрация владельца). Сценарий API определяет по шагу, `flow` с web не передаётся.
2. ✅ Профиль устройства (без Web Vitals — их можно добавить следующим шагом).
3. ✅ `form_error` (поле: `phone`, `name`, `code`…) и `toast_action` («Вернуть» у клиента и в кабинете).
4. Clarity — только после решения владельца и с маскировкой.

Отличия от предложения: профиль хранится в `funnel_sessions`, по строке на устройство (последние
настройки); `textScale` — размер шрифта браузера (`normal` / `large` от 120% / `huge` от 175%),
это стало возможно после перевода токенов в `rem`; зум страницы не определяется.

## Отчёты

Только для платформенных админов (номера из `ADMIN_PHONES`), через `/api` с их сессией:

- `GET /telemetry/funnel?days=30&flow=login` — воронка сценария: сколько устройств дошло до каждого шага, доля от предыдущего и от первого. `flow`: `booking`, `search`, `login`, `manage_booking`, `prepayment`, `waitlist`, `review`, `owner`.
- Добавьте отбор по устройству: `&type=phone`, `&os=ios`, `&app=native`, `&textScale=large`, `&net=slow`. Например, «запись на телефонах с крупным шрифтом»: `?flow=booking&type=phone&textScale=large`.
- `GET /telemetry/signals?days=30` — где спотыкаются: ошибки по полям, нажатия «Вернуть», пустые поиски, неверные коды, сбои оплаты.
- `GET /telemetry/segments?days=30` — сколько устройств каждого вида: телефоны и десктопы, iOS и Android, крупный шрифт, медленная сеть.
