# Обзор архитектуры: мёртвый код, дубли, границы

Срез на ветке `feat/booking-mvp` (коммит `7e376cc`), 24 ноября 2026. Только анализ, код не менялся.

Как искали: `knip@5` и `madge@8` через `pnpm dlx` (в зависимости не добавлены), свои скрипты для FSD-импортов, CSS-модулей и словаря i18n, затем ручная проверка каждой находки по коду. Ложные срабатывания инструментов (миграции TypeORM, `worker.ts`, `public/sw.js`, k6-скрипты, `react-native-worklets` как peer для reanimated, `:global` классы Leaflet и Recharts, строки i18n, которые приходят из API) в отчёт не вошли.

Ссылки ведут от этой папки (`docs/`).

## 1. Карта архитектуры

### Объём

| Часть | Файлов TS/TSX | Строк TS/TSX | Строк CSS |
|---|---:|---:|---:|
| `apps/web/src` | 617 | 60 300 | 31 900 |
| `apps/api/src` | 431 | 37 300 | - |
| `packages/contracts` | 1 | 2 220 | - |
| `packages/ui` | 37 | 1 000 | 1 700 |
| `packages/tokens` | 2 | 480 | - |
| `apps/mobile/src` | 9 | 445 | - |

### Веб: слои FSD

- `app` (маршруты, тонкие) → `views` (20 слайсов) → `widgets` (8) → `features` (23) → `entities` (6) → `shared`.
- Импортов вверх по слоям: **0**. Импортов в обход `index.ts` чужого слайса: **0**. Циклов (madge): **0**. Границы в целом соблюдены хорошо.
- Где сложность (строки TS/TSX):
  - `views/manage`: **18 160** (30% всего веба), 41 папка в `ui/`, 7 хуков в `model/`. Фактически это отдельное приложение «Кабинет» внутри одного слайса.
  - `views/booking`: 4 820 (`BookingPage.tsx` 946, `useBookingForm.ts` 849).
  - `shared/i18n`: 4 090 (словарь, 2 277 ключей).
  - `widgets/DayCalendar`: 2 300 (`DayCalendar.tsx` 1 631 строка и `DayCalendar.module.css` 3 051 строка, самый большой файл репозитория).
  - `shared/api/clientApi.ts`: 1 255 строк, все эндпоинты в одном файле.
- Самые большие файлы: `DayCalendar.module.css` 3 051, `contracts/src/index.ts` 2 220, `DayCalendar.tsx` 1 631, `clientApi.ts` 1 255, `AnalyticsTab.module.css` 951, `BookingPage.tsx` 946, `Place.module.css` 911, `useBookingForm.ts` 849, `AnalyticsTab.tsx` 800, `ScheduleTab.tsx` 750.

### API: модули

- 45 модулей в `src/`. Самые крупные (без тестов): `bookings` 3 130, `database` 2 900 (миграции), `businesses` 1 780, `admin` 1 730, `telegram` 1 250, `notifications` 1 250, `recommendations` 1 220, `cashdesk` 1 160, `reviews` 1 150, `billing` 1 050.
- Самые большие файлы: `telegram-bot.service.ts` 670, `analytics.service.ts` 659, `businesses.service.ts` 656, `fiscal.service.ts` 577, `bookings.service.ts` 560, `loyalty.service.ts` 556.
- Циклы (madge), все внутри `bookings`:
  - `bookings.service` → `subscription-orders.service` → `booking-payments.service` → обратно в `bookings.service`. Разорван в рантайме через `ModuleRef.get(..., { strict: false })` ([booking-payments.service.ts](../apps/api/src/bookings/booking-payments.service.ts), [subscription-orders.service.ts](../apps/api/src/bookings/subscription-orders.service.ts)).
  - `business.entity` ↔ `working-hours.entity` (обычная двусторонняя связь TypeORM, не проблема).

### Пакеты и мобильное приложение

- `packages/ui`: 17 компонентов. `Radio` и `RadioCard` используются только в Storybook кита. Часть «кита» живёт в `apps/web/src/shared/ui` (`Sheet`, `SegmentedControl`, `TextTabs`, `GlyphGroup` и др.), граница между ними историческая.
- `packages/contracts`: один файл на 2 220 строк.
- `apps/mobile`: маленькая оболочка, типы моста продублированы вручную с вебом (так задумано, см. AGENTS.md).

## 2. Находки

Оценка: **объём** S (до часа), M (полдня), L (день и больше); **риск** низкий / средний / высокий для поведения в продакшене.

### 2.1. Мёртвый код

| # | Что | Где | Почему проблема | Что делать | Объём / риск |
|---|---|---|---|---|---|
| D1 | ~100 неиспользуемых классов в CSS-модулях (126 по скрипту минус `:global`) | крупнее всего: [BookingDetailsDialog.module.css](../apps/web/src/views/manage/ui/BookingDetailsDialog/BookingDetailsDialog.module.css) 25 классов (старый «талон»: `ticket`, `stub`, `leaf*`), [CatalogPage.module.css](../apps/web/src/views/catalog/CatalogPage.module.css) 15 (`empty*`, `results*`, `filters`), [manageForms.module.css](../apps/web/src/views/manage/ui/manageForms.module.css) 13 (`saveBar`, `switchRow`, `fieldRow`), [Place.module.css](../apps/web/src/views/business/ui/Place/Place.module.css) 12, [DayCalendar.module.css](../apps/web/src/widgets/DayCalendar/DayCalendar.module.css) 12 (`filterChip`, `ghost*`, `liveDot`), [ReviewsTab.module.css](../apps/web/src/views/manage/ui/ReviewsTab/ReviewsTab.module.css) 8 | Шум при правке стилей, лишние байты в CSS | Удалить классы, которых нет ни в одном TSX; проверять скриптом из этого обзора | S-M / низкий |
| D2 | 6 функций `clientApi`, которых никто не вызывает | [clientApi.ts](../apps/web/src/shared/api/clientApi.ts): `getModerationLog`, `getModerationQueue`, `getVisitReview`, `getReviewer`, `renameCategory`, `deleteCategory` | Модерация и отзыв по SMS читаются на сервере (`sessionApi`), категории правятся через сервис | Удалить | S / низкий |
| D3 | Неиспользуемые хелперы веба | `formatDuration`, `formatDayShort` в [bookingUtils.ts](../apps/web/src/entities/booking/lib/bookingUtils.ts) (дубли `t.duration`, `t.dayShort`); `_dateFormatter` в [ReviewsSection.tsx](../apps/web/src/views/business/ui/Place/ReviewsSection.tsx); `niceCeiling` экспортируется без использования | Мёртвый код и соблазн взять непереведённую версию | Удалить, лишние `export` убрать | S / низкий |
| D4 | Эндпоинты API, которые вызывают только e2e или документация | `POST /feed/:id/report` ([moderation.controller.ts](../apps/api/src/moderation/moderation.controller.ts), веб давно шлёт `POST /reports`), `GET /manage/:slug/loyalty/certificates/:code`, `GET /telemetry/errors`, `GET /recommendations/stats`, `/interleaving`, `POST /recommendations/affinities/refresh` | Первые два стоит убрать или перевести e2e на рабочий путь; остальные админские инструменты без экрана | `/feed/:id/report` убрать вместе с правкой `feed-deck.spec.ts`; админские оставить, но отметить в AGENTS.md как «только API» | S / низкий |
| D5 | Компоненты кита только для демо | `Radio`, `RadioCard` из `packages/ui` используются лишь в историях Storybook (`packages/ui`) | Мелочь: держим код, который не видит ни один клиент | Оставить (есть в Storybook), либо удалить вместе с их историями | S / низкий |
| D6 | ~30 строк словаря, похоже, не используются | например «Читать целиком», «Куда приедете», «Сотрудник», «Мои», «Шаги» ([dictionary.ts](../apps/web/src/shared/i18n/dictionary.ts), [areas/cabinet.ts](../apps/web/src/shared/i18n/areas/cabinet.ts)) | Скрипт нашёл 86 ключей без литерала в коде, но большая часть приходит из API (названия медалей, причины «Для вас») | Проверить вручную каждую; удалять только по одной, с прогоном `dictionary.test.ts` и `languages.spec.ts` | S / низкий |
| D7 | Лишние зависимости | `@awaisa/tokens` в `packages/ui/package.json` (кит читает только CSS-переменные), `supertest` и `@types/supertest` в API, `pg` в `tests/ux` (проверить) | Лишнее в lockfile | Убрать после проверки | S / низкий |
| D8 | Расхождение документации с кодом | AGENTS.md описывает «floating material save bar» в формах кабинета, его больше нет (класс `saveBar` мёртв); `apps/mobile/AGENTS.md` говорит про Expo Router, а приложение на одном `App.tsx` | Агенты и люди ищут то, чего нет | Поправить тексты | S / нет |

### 2.2. Дубли в вебе

| # | Что | Копий | Где (примеры) | Куда свести | Объём / риск |
|---|---|---:|---|---|---|
| W1 | Чтение и запись JSON в `localStorage` с try/catch | 13 пар | [bookingStorage.ts](../apps/web/src/entities/booking/lib/bookingStorage.ts), [contactStorage.ts](../apps/web/src/entities/booking/lib/contactStorage.ts), [bookingDraft.ts](../apps/web/src/features/bookingDraft/lib/bookingDraft.ts), [useFavorites.ts](../apps/web/src/features/favorites/model/useFavorites.ts), [preferences.ts](../apps/web/src/features/forYou/lib/preferences.ts), [waitlistStorage.ts](../apps/web/src/features/waitlist/model/waitlistStorage.ts), [recentSearches.ts](../apps/web/src/shared/lib/recentSearches.ts), [myPlace.ts](../apps/web/src/shared/lib/myPlace.ts) и др. | `shared/lib/storage.ts`: `readJson(key, guard)`, `writeJson(key, value)` | M / низкий (ключи и формат не меняются) |
| W2 | Копировать ссылку и показать тост | 8 | [CalendarFeedSheet.tsx](../apps/web/src/features/calendarFeed/ui/CalendarFeedGroup/CalendarFeedSheet.tsx), [BookingLinks.tsx](../apps/web/src/views/manage/ui/BranchesTab/BookingLinks.tsx), [ShareSheet.tsx](../apps/web/src/views/manage/ui/PageTab/ShareSheet.tsx), [ReceiptSheet.tsx](../apps/web/src/views/manage/ui/ReceiptSheet/ReceiptSheet.tsx), [ShareWindowsSheet.tsx](../apps/web/src/views/manage/ui/ShareWindowsSheet.tsx), [SetupProgress.tsx](../apps/web/src/views/manage/ui/SetupProgress/SetupProgress.tsx), [BookingInspector.tsx](../apps/web/src/views/manage/ui/BookingInspector/BookingInspector.tsx) | `shared/lib/share.ts`: `copyLink`, `shareLink` (с проверкой `pointer: coarse` в одном месте), `saveFile` | M / низкий |
| W3 | Поделиться ссылкой, иначе скопировать | 5 | [PlaceActions.tsx](../apps/web/src/views/business/ui/Place/PlaceActions.tsx), [FeedActions.tsx](../apps/web/src/views/feed/ui/FeedActions.tsx), [ShareProfile.tsx](../apps/web/src/views/publicProfile/ui/ShareProfile.tsx), ShareSheet, ReceiptSheet. Проверку `(pointer: coarse)` делает только ShareProfile, хотя правило AGENTS.md про это | там же | (в W2) |
| W4 | Файл: поделиться, иначе скачать | 2 | [TicketViewer.tsx](../apps/web/src/features/ticketView/ui/TicketViewer.tsx), [AccountSettings.tsx](../apps/web/src/views/bookings/ui/AccountSettings/AccountSettings.tsx) | `saveFile` там же | (в W2) |
| W5 | Листок календаря (месяц над числом) | 7 разметок + мёртвая копия CSS | [BookingHistory](../apps/web/src/views/bookings/ui/BookingHistory/BookingHistory.tsx), [UpcomingBooking](../apps/web/src/views/bookings/ui/UpcomingBooking/UpcomingBooking.tsx), [ClientSheet](../apps/web/src/views/manage/ui/ClientSheet/ClientSheet.tsx), [BookingReview](../apps/web/src/views/booking/ui/BookingReview/BookingReview.tsx), [BookingSummary](../apps/web/src/views/booking/ui/BookingSummary/BookingSummary.tsx), [BookingPage](../apps/web/src/views/booking/BookingPage.tsx), [Ticket](../apps/web/src/entities/booking/ui/Ticket/Ticket.tsx) | `entities/booking/ui/DateLeaf` с `size` и `tone` | M / средний (видно глазами, нужна сверка скриншотами) |
| W6 | Лента отзывов «три + MoreFade + ReviewItem» | 3, плюс свой ряд в профиле | [ReviewThread.tsx](../apps/web/src/views/business/ui/Place/ReviewThread.tsx), [MasterReviews.tsx](../apps/web/src/views/masterDay/ui/MasterReviews.tsx), [PlaceReviews.tsx](../apps/web/src/views/booking/ui/PlaceReviews/PlaceReviews.tsx); [ProfileReviews.tsx](../apps/web/src/views/publicProfile/ui/ProfileReviews.tsx) рисует свой ряд с датой всегда по-русски | `entities/review/ui/ReviewThread`, `REVIEW_WORDS` туда же | M / средний |
| W7 | Подпись группы в стиле `SectionCaption`, написанная заново в CSS | 8 правил | [RescheduleSheet.module.css](../apps/web/src/features/rescheduleBooking/ui/RescheduleSheet/RescheduleSheet.module.css), [InsightsPage.module.css](../apps/web/src/views/insights/InsightsPage.module.css), [AnalyticsTab.module.css](../apps/web/src/views/manage/ui/AnalyticsTab/AnalyticsTab.module.css), [SetupProgress.module.css](../apps/web/src/views/manage/ui/SetupProgress/SetupProgress.module.css), [PayPage.module.css](../apps/web/src/views/pay/PayPage.module.css) и др. | Где это подпись над группой: `SectionCaption`. Где это просто мелкий заглавный текст (eyebrow шага, подпись суммы): оставить, но взять общий токен-набор | S-M / низкий-средний |
| W8 | Свой скрим и своя заливка цвета места на карточках | 2 скрима, 5+2 копии градиента оттенка | скрим: [BookingReview.module.css](../apps/web/src/views/booking/ui/BookingReview/BookingReview.module.css), [BookingSummary.module.css](../apps/web/src/views/booking/ui/BookingSummary/BookingSummary.module.css); оттенок: OfferCard, BusinessCard, MasterCard, BusinessTile, BookingSummary, BookingReview, Place | `var(--card-scrim)` и новый `--tint-fill` в `shell.css` | S / средний (визуально) |
| W9 | Пустые состояния без `EmptyState` | 2 | [BookingsPage.tsx](../apps/web/src/views/bookings/BookingsPage.tsx) `.panelEmpty`, [WorkReviewsSheet.tsx](../apps/web/src/views/feed/ui/WorkReviewsSheet.tsx) | `EmptyState variant='inline'` | S / низкий |
| W10 | Форматирование денег, рейтинга, заглавной буквы | «N сом» 5 способов, рейтинг 3 способа (с запятой, через `toLocaleString`, с точкой), `capitalize` 5 копий | [bookingUtils.ts](../apps/web/src/entities/booking/lib/bookingUtils.ts) `formatPrice`, [BillingTab.tsx](../apps/web/src/views/manage/ui/BillingTab/BillingTab.tsx), [analyticsFormat.ts](../apps/web/src/views/manage/ui/AnalyticsTab/analyticsFormat.ts), [payText.ts](../apps/web/src/views/manage/lib/payText.ts), [ManageIndexPage.tsx](../apps/web/src/views/manage/ManageIndexPage.tsx); рейтинг в OfferCard, MasterCard, PlaceHeader, ReviewsTab и др. | `shared/lib/format.ts`: `formatPrice`, `formatRating`, `capitalize` | S-M / низкий (рейтинг «4.5» vs «4,5» станет единым, это видимо) |
| W11 | Ссылки WhatsApp и `tel:` вне `ContactRows` | 4 | [DayCalendar.tsx](../apps/web/src/widgets/DayCalendar/DayCalendar.tsx), [BookingInspector.tsx](../apps/web/src/views/manage/ui/BookingInspector/BookingInspector.tsx), [ContactClientSheet.tsx](../apps/web/src/views/manage/ui/ReviewsTab/ContactClientSheet.tsx), [PlaceActions.tsx](../apps/web/src/views/business/ui/Place/PlaceActions.tsx) | `whatsappHref(phone)` рядом с `formatPhone` (сами кнопки по дизайну разные, сводить только адреса) | S / низкий |
| W12 | `matchMedia` вручную | `prefers-reduced-motion` в 11 местах, `pointer: coarse` в 5, свой `useMediaQuery` в [AnalyticsCharts.tsx](../apps/web/src/views/manage/ui/AnalyticsTab/AnalyticsCharts.tsx) | | `shared/lib`: `prefersReducedMotion()`, `isTouch()` | S / низкий |
| W13 | «Определить автоматически» (геолокация в «моё место») | 2 одинаковых | [PlacePickerSheet.tsx](../apps/web/src/features/myPlace/ui/PlacePickerSheet.tsx), [PreferencesSheet.tsx](../apps/web/src/features/forYou/ui/PreferencesSheet.tsx) | `shared/lib/geo.ts` | S / низкий |
| W14 | Часовой пояс строкой | 1 | [PayPage.tsx](../apps/web/src/views/pay/PayPage.tsx) `'Asia/Bishkek'` вместо `BUSINESS_TIME_ZONE` | заменить | S / нет |

Хорошая новость: ни одной даты из ISO без `timeZone`, ни одного `<input type="date">` вне `DateField`, ни своих диалогов подтверждения вместо `HoldButton`.

### 2.3. Дубли в API

| # | Что | Копий | Где | Куда свести | Объём / риск |
|---|---|---:|---|---|---|
| A1 | Выражение «заработано за визит» `COALESCE(paid_amount, visitPrice() - discount)` | 7 полных + 3 частичных | [analytics.service.ts](../apps/api/src/admin/analytics.service.ts), [clients.service.ts](../apps/api/src/clients/clients.service.ts), [money-report.service.ts](../apps/api/src/cashdesk/money-report.service.ts), [payroll.service.ts](../apps/api/src/payroll/payroll.service.ts) (с комментарием «держите равным analytics»), [business-attention.service.ts](../apps/api/src/admin/business-attention.service.ts), [telegram-bot.service.ts](../apps/api/src/telegram/telegram-bot.service.ts), [admin.service.ts](../apps/api/src/admin/admin.service.ts) | `visitEarned(b, s)` и `visitDue(b, s)` в [visit-sql.ts](../apps/api/src/bookings/visit-sql.ts), где уже живут `visitPrice` и `visitLines` | M / средний: это деньги в аналитике, зарплате, кассе. Нужны `test:db` до и после, суммы должны совпасть до сома |
| A2 | Фильтр «подтверждён и не неявка» | 17 | те же плюс referrals, recommendations, rankings, profiles, return-visits | `countedVisit(b)`, `pastVisit(b)` в `visit-sql.ts` | M / средний |
| A3 | День по времени бизнеса в SQL | 3 стиля, ~20 строк | `AT TIME ZONE 'UTC' + interval '6 hours'` в admin, analytics, business-attention, money-report, businesses, recommendations, inventory, waitlist; `make_interval` в [strategy.service.ts](../apps/api/src/telemetry/strategy.service.ts); смещение числом в [plan-rules.ts](../apps/api/src/billing/plan-rules.ts), [ics.ts](../apps/api/src/calendar/ics.ts) | `localDate(col)`, `localToday()` рядом с [business-time.ts](../apps/api/src/common/business-time.ts) | M / средний |
| A4 | Разбор `[rows, affected]` после `UPDATE … RETURNING` | 21 (6 хелперов + 15 инлайн) | например `rowsOf` в [billing.service.ts](../apps/api/src/billing/billing.service.ts), `rows()` в fiscal, inventory, cashdesk, expenses, work-photos, moderation; инлайн в admin.service, reminders, return-visits, reviews | `common/sql.ts` `returnedRows()` | S / низкий |
| A5 | Подпись ссылок HMAC | 5 почти одинаковых | [payment-signature.ts](../apps/api/src/bookings/payment-signature.ts) и [receipt-signature.ts](../apps/api/src/fiscal/receipt-signature.ts) совпадают до префикса; [visit-link.ts](../apps/api/src/common/visit-link.ts), [client-telegram.ts](../apps/api/src/notifications/client-telegram.ts), инлайн в [reviews.service.ts](../apps/api/src/reviews/reviews.service.ts) | `common/signature.ts`: `sign(prefix, id)`, `isValidSignature` с `timingSafeEqual` | S / средний: префиксы и длины должны остаться байт в байт, иначе старые ссылки из SMS перестанут открываться. Покрыть тестом «старая подпись = новая» |
| A6 | `sha256`-хеш токена | 5 | waitlist, calendar-feeds, bookings, auth, telegram-login | `common/hash.ts` | S / низкий |
| A7 | Тексты: даты по-русски (месяцы в родительном), «N сом», плюралы, «Айгерим С.» | месяцы 5, деньги 4, плюралы 6, имя 3 | [telegram-messages.ts](../apps/api/src/telegram/telegram-messages.ts), [messages.ts](../apps/api/src/notifications/messages.ts), [whatsapp-messages.ts](../apps/api/src/notifications/whatsapp-messages.ts), [follow-messages.ts](../apps/api/src/follows/follow-messages.ts), [push-messages.ts](../apps/api/src/push/push-messages.ts); `pluralRu` в plan-rules и свои `plural` в дайджестах; `publicName` в profiles, questions, reviews | `common/ru-text.ts`: `formatDayRu`, `formatSom`, `pluralRu`, `publicName` | M / средний: тексты SMS и WhatsApp (шаблоны WhatsApp должны совпадать с Meta слово в слово). Только с юнит-тестами, которые сравнивают строки до и после |
| A8 | `toNumber` | 10 | clients, subscription-orders, fiscal, analytics, loyalty, inventory, expenses, money-report, cashdesk, strategy | `common/sql.ts` | S / низкий |
| A9 | Обёртка «нормализуй телефон или 400» | 3 (+1 с 404) | auth.service, businesses.service, members.controller, clients.service | `common/phone.ts` `requirePhone` | S / низкий |
| A10 | Истечение неоплаченных заказов | 2 | [subscription-orders.service.ts](../apps/api/src/bookings/subscription-orders.service.ts), [certificate-sales.service.ts](../apps/api/src/certificates/certificate-sales.service.ts) | общий метод в `PaymentsService` рядом с `failPendingOrders` | S / средний |
| A11 | Клиентская база по телефону | 5 запросов, имя берётся по-разному (последнее vs `MAX`) | clients.service, mailings.service, analytics (2), rankings | CTE `clientBase` в `clients/` | M / средний (поменяется отображаемое имя в аналитике) |
| A12 | Два списка зарезервированных слов | 2 | `RESERVED_SLUGS` в [business-rules.ts](../apps/api/src/businesses/business-rules.ts), `RESERVED_HANDLES` в [profiles.service.ts](../apps/api/src/profiles/profiles.service.ts) | Оставить разными (разные пространства адресов), но вынести `RESERVED_HANDLES` в `profile-rules.ts` | S / нет |

### 2.4. Нарушения границ

| # | Что | Где | Почему проблема | Что делать | Объём / риск |
|---|---|---|---|---|---|
| B1 | «Все пришли» и его отмена живут в `AdminService` и повторяют побочные эффекты `SalonBookingsService.setOutcome` (лояльность, склад, чеки) | [admin.service.ts](../apps/api/src/admin/admin.service.ts) `closeDay`, `reopen`; [salon-bookings.service.ts](../apps/api/src/bookings/salon-bookings.service.ts) | Два места, которые должны делать одно и то же с деньгами и складом. Добавят новый эффект в одно место, забудут во втором. Плюс нет общей транзакции: если списание склада упадёт после `UPDATE`, визиты уже отмечены, и повторное «Все пришли» их не возьмёт (`fiscal.syncVisits` сам не падает). И ещё баг: `reopen` откатывал лояльность и склад по всем пришедшим id, хотя `UPDATE` ограничен бизнесом, то есть по id чужого визита можно было вернуть чужие бонусы и материалы | Перенести в `SalonBookingsService`, общий приватный `applyOutcomeEffects(ids)` | M / средний |
| B2 | Перенос и отмена салоном (`moveBooking`, `cancelBooking`) с отложенными сообщениями клиенту в `AdminService` | [admin.service.ts](../apps/api/src/admin/admin.service.ts) | Против правила «код в сервисе того, кто действует»; `SalonBookingsService` возвращает телефон только чтобы AdminService отправил SMS | Перенести в `SalonBookingsService` | M / средний |
| B3 | Ветки «это сотрудник» внутри `BookingsService.create` (6 мест) и `markCancelled(id, 'salon')` | [bookings.service.ts](../apps/api/src/bookings/bookings.service.ts) | Клиентский сервис знает про салон | Вынести общее ядро создания в `booking-create.ts`, клиент и салон вызывают его со своими правилами | L / высокий (сердце записи) |
| B4 | SQL и репозитории в контроллерах | [master.controller.ts](../apps/api/src/master/master.controller.ts) (5 запросов, `getDay` грузит весь день салона и фильтрует в коде), [members.controller.ts](../apps/api/src/businesses/members.controller.ts) (создаёт клиента, участника, шлёт SMS), [manage-media.controller.ts](../apps/api/src/media/manage-media.controller.ts), [feed.controller.ts](../apps/api/src/media/feed.controller.ts), [me.controller.ts](../apps/api/src/customers/me.controller.ts), [me-avatar.controller.ts](../apps/api/src/media/me-avatar.controller.ts) | Логику нельзя переиспользовать и тестировать без HTTP | `MasterService`, `MembersService`, остальное в существующие сервисы | M / низкий (перенос без изменения SQL) |
| B5 | Ответ на отзыв из Telegram пишет в `reviews` напрямую | [telegram-bot.service.ts](../apps/api/src/telegram/telegram-bot.service.ts) | Обходит `review-replies`: другой путь сброса метки автоответа и кэша | Вызывать сервис ответов | S / средний |
| B6 | Цикл `BookingsService` ↔ `SubscriptionOrdersService` ↔ `BookingPaymentsService` через `ModuleRef` | `bookings/` | Зависимость скрыта от DI, ошибка проявится только в рантайме | Развязать через событие «оплачено» (`EventEmitter2`) или общий `PaymentsService.registerOrder` | M / средний |
| B7 | Кроны ожидания окна и подписок на мастеров зовут `getAvailability` в цикле, а пакетный `firstFreeTimes` приватный | [waitlist.service.ts](../apps/api/src/waitlist/waitlist.service.ts), [follows.service.ts](../apps/api/src/follows/follows.service.ts), [availability.service.ts](../apps/api/src/bookings/availability.service.ts) | AGENTS.md прямо запрещает `getAvailability` в цикле; при росте числа ждущих это N×8 запросов в минуту | Открыть пакетный метод и перевести кроны | M / средний |
| B8 | Импорты внутри слайса через `@/` вместо относительных путей | 178 импортов, из них 124 в `views/manage` | Правило dev-docs: внутри слайса относительные пути. Сейчас слайс импортирует сам себя по абсолютному пути, это не ошибка сборки, но маскирует границу | Механическая замена (codemod) | S / низкий |
| B9 | Сущности импортируют друг друга | [OfferCard.tsx](../apps/web/src/entities/offer/ui/OfferCard/OfferCard.tsx) → `entities/booking`, `entities/business`; [LiveStatus.tsx](../apps/web/src/entities/business/ui/BusinessCard/LiveStatus.tsx) → `entities/booking`; [ReviewItem.tsx](../apps/web/src/entities/review/ui/ReviewItem.tsx) → `entities/business`; `widgets/Header` → `widgets/HeaderSearch` | Слайсы одного слоя не должны знать друг о друге. Что именно берут: `addDayKey`, `formatPrice`, `PersonAvatar`, `BusinessTile`, `pickTint`, `useNextFree`. Почти всё это общие вещи, которые лежат не в том слое | `addDayKey`, `formatPrice`, `pickTint` в `shared/lib`; `PersonAvatar` и `BusinessTile` в `shared/ui` (без данных, только картинка); `useNextFree` передать в `OfferCard` пропом или слотом; `HeaderSearch` передать в `Header` слотом из layout | M / низкий |

### 2.5. Лишняя сложность

| # | Что | Почему | Что делать | Объём / риск |
|---|---|---|---|---|
| C1 | `views/manage` на 18 тыс. строк (30% веба) | Один слайс со своими 41 подпапками. Части, которые нужны другим экранам (`SaleSheet`, `TemplateField`, `ClientSheet`), не могут переехать по FSD, потому что view не импортирует view | Не дробить сразу. Когда понадобится в другом экране, выносить по одному в `features/` (`sale`, `messageTemplate`) | L / средний |
| C2 | `DayCalendar`: 1 631 строка TSX и 3 051 строка CSS | Две раскладки («Колонки» и «Лента»), drag, зум, контекстное меню в одном компоненте | Разделить по раскладкам, общие куски (карточка визита, курсор слота) отдельно. Только с профилированием, правила производительности в AGENTS.md завязаны на внутреннее устройство | L / высокий |
| C3 | `clientApi.ts` на 1 255 строк и `contracts/src/index.ts` на 2 220 строк | Каждый PR трогает один файл: конфликты слияния | Разложить по доменам (`api/booking.ts`, `api/manage.ts` …) с тем же barrel-экспортом; контракты так же по файлам | M / низкий (чисто механически) |
| C4 | `BookingPage.tsx` 946 и `useBookingForm.ts` 849 строк | Самый важный путь, много состояний | Не трогать до запуска (см. раздел 4) | - |

## 3. План: небольшие независимые PR

По убыванию «польза к риску». Каждый PR сам по себе, можно брать в любом порядке внутри группы.

### До запуска (безопасно, приносит пользу сразу)

1. **Удалить мёртвый CSS и хелперы** (D1, D3). Только удаления, видимое не меняется. Проверка: `pnpm typecheck`, `pnpm build`, e2e `design.spec` и `a11y.spec`. S.
2. **Удалить неиспользуемые функции `clientApi` и маршрут `POST /feed/:id/report`** (D2, D4), e2e перевести на `POST /reports`. S.
3. **Поправить AGENTS.md** (D8) и пометить админские эндпоинты «только API». S, без кода.
4. **`common/sql.ts`: `returnedRows`, `toNumber`; `common/hash.ts`** (A4, A6, A8). Механика, поведение то же. Юнит-тесты на хелперы. S.
5. **Перенести SQL из контроллеров в сервисы** (B4). Без изменения запросов. Заодно `MasterService.day` с фильтром по мастеру в SQL. M.
6. **«Все пришли» в `SalonBookingsService` с общими эффектами и транзакцией** (B1). Реальный риск расхождения денег и склада, поэтому до запуска. Тесты: `clients.spec`, `inventory.spec`, `loyalty.spec`, `fiscal.spec`. M.
7. **Веб: `shared/lib/share.ts` и `shared/lib/storage.ts`** (W1-W4). Ключи хранилища и формат JSON без изменений; юнит-тесты на чтение старых значений. M.

### После запуска (полезно, но трогает видимое или деньги)

8. **SQL-хелперы денег и визитов: `visitEarned`, `countedVisit`, `localDate`** (A1-A3). Прогон `test:db` и сравнение отчётов аналитики, зарплаты и кассы на демо-данных до и после: суммы должны совпасть. M.
9. **Подписи ссылок в одном модуле** (A5) с тестом «старые подписи остаются валидными». S.
10. **Тексты сообщений в `common/ru-text.ts`** (A7) со снапшот-тестами всех SMS, Telegram и WhatsApp-текстов. M.
11. **Веб: форматтеры `formatPrice`, `formatRating`, `capitalize`, `whatsappHref`, медиа-хелперы** (W10-W13). Рейтинг станет везде «4,5»: это видимое решение, согласовать. M.
12. **`DateLeaf` и `ReviewThread` в сущностях** (W5, W6) со сверкой скриншотов. M.
13. **Подписи и скримы через `SectionCaption`, `--card-scrim`, `--tint-fill`** (W7-W9), через скилл `design-check`. S-M.
14. **Общие вещи из `entities` в `shared`, слот для `HeaderSearch`** (B9), относительные импорты внутри слайсов (B8, codemod). M.
15. **Пакетный поиск свободного времени в кронах** (B7). M.
16. **Перенос и отмена салоном в `SalonBookingsService`, ответ из Telegram через сервис** (B2, B5). M.
17. **Разложить `clientApi.ts` и контракты по файлам** (C3). M, лучше в спокойную неделю, чтобы не ломать открытые ветки.

## 4. Что я бы НЕ трогал до запуска

- **`BookingsService.create` и путь записи** (B3, C4: `BookingPage`, `useBookingForm`, `CardStack`). Это главный сценарий, он покрыт e2e, но много неявных правил (депозит, промо, абонемент, несколько услуг, ожидание оплаты, гонки на `bookings_no_overlap`). Любое «чистое» переписывание здесь рискует записью клиента, а выигрыш только в читаемости.
- **`DayCalendar`** (C2). Его устройство подогнано под замеры на слабых телефонах (стор курсора вне React, однократная запись в CSS-переменные). Дробление легко вернёт лишние перерисовки, а заметит это только владелец салона на Samsung A55.
- **Денежный SQL** (A1-A3, A11) до первых реальных отчётов. Сейчас выражения одинаковые по смыслу; свести их полезно, но ошибка в одном хелпере испортит сразу аналитику, зарплату и кассу. Лучше после запуска, со сравнением на копии живой базы.
- **Тексты SMS и WhatsApp** (A7). Шаблоны WhatsApp сверяются с Meta слово в слово, а у SMS считаются сегменты. Рефакторинг ради дедупликации не стоит риска лишнего сегмента или отклонённого шаблона в первую неделю.
- **Подписи ссылок** (A5). `AUTH_SECRET` и формат подписи после запуска менять нельзя (это сказано в `docs/launch.md`); объединять можно, но только с тестом на совместимость, и спешить незачем.
- **Цикл через `ModuleRef`** (B6). Он работает и покрыт `subscriptions-online.spec` и `prepayment.spec`; развязка событиями меняет порядок побочных эффектов оплаты.
- **Разбиение `views/manage`** (C1) и перенос `shared/ui` в `packages/ui`. Большие переезды файлов конфликтуют со всеми открытыми ветками, а пользы для клиента нет.
- **Строки словаря** (D6) массово. Удалять по одной и только после проверки, что строка не приходит из API.

## Как повторить проверки

```bash
pnpm dlx knip@5 --no-progress --reporter compact
```

```bash
cd apps/web && pnpm dlx madge@8 --circular --extensions ts,tsx --ts-config tsconfig.json src
```

Скрипты для FSD-импортов, CSS-модулей и словаря были разовыми (Python, по регулярным выражениям); если какой-то из пунктов плана возьмём, стоит оформить их как тест, чтобы мёртвые классы и импорты внутри слайса не появлялись снова.
