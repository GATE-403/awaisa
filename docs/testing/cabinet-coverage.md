# Кабинет: функция → тест

Карта функций кабинета владельца (`/manage`, `/manage/<slug>`, `/master`, `/insights`) и тесты, которые их проверяют. e2e лежат в `apps/web/e2e`, unit-тесты API рядом с кодом в `apps/api/src` (`*.spec.ts`), unit-тесты web в `<слайс>/tests/*.test.ts` (Vitest, `pnpm --filter web test`, запускаются и в `pnpm test`).

Новые e2e работают на бизнесе, который тест создаёт сам (`e2e/business.ts`: `createOwnBusiness`, `createVisit`). Такой бизнес называется `E2E Место …`, общий сид не меняется, глобальный teardown его удаляет. Поэтому каждая спека проходит сама по себе на свежем засеянном базе.

Роли: **В** владелец, **А** администратор (staff), **П** админ платформы, **М** мастер.

## Вход, навигация, роли

| Функция | Роли | Тест |
|---|---|---|
| `/manage` без входа ведёт на `/login?next=/manage` | гость | `cabinet-home.spec.ts` › a guest is asked to sign in first |
| Один бизнес: `/manage` сразу открывает кабинет; несколько: список строк (Открыта/Скрыта, роль, следующий визит, ↗ на страницу, «Новая страница») | В | `cabinet-home.spec.ts` › one business opens straight into its cabinet; two make a list of rows |
| Таб «Кабинет», «‹» туда, откуда вошли, переключатель бизнеса, меню профиля | П | `cabinet-home.spec.ts` |
| «Что нового»: точка на мегафоне до прочтения | П | `updates.spec.ts` › the cabinet marks news until it is read |
| Доступ: гость 401, чужой 403, staff 403 на `@OwnerOnly` (метод или весь контроллер), владелец и админ платформы проходят | все | unit `businesses/business-access.guard.spec.ts` |
| Доступ мастера: только активный мастер этого бизнеса по своему номеру | М | unit `master/master.guard.spec.ts` |
| Администратор: видит день, не видит «Аналитику» и «Настройки», 403 на деньги, часы и команду; «Закрыть доступ» | В, А | `roles.spec.ts` |
| Чужой аккаунт не открывает расписание | клиент | `account.spec.ts` › non-staff accounts cannot open the schedule |
| Адрес бизнеса не может совпасть со своим разделом сайта (`RESERVED_SLUGS` ⊇ `APP_SEGMENTS` и папки `app/`) | | unit `businesses/business-rules.spec.ts` |
| Доступность всех вкладок кабинета (axe, WCAG 2.1 AA) | В | `cabinet-a11y.spec.ts` |
| Доступность открытых листов (новая запись, инспектор, клиент, рассылка, импорт, акция, «Редактировать», услуга, мастер, ответы на отзывы) и всех вкладок в тёмной теме | В | `cabinet-a11y.spec.ts` |
| Администратор не видит денег: выручка дня, траты клиента, «Рассылка», «Импорт», чек-лист запуска (владелец на тех же данных видит) | В, А | `cabinet-staff-money.spec.ts` |
| Вкладки: старые ссылки ведут на «Страницу», администратору только Расписание · Клиенты · Отзывы | | unit web `views/manage/tests/manageTabs.test.ts` |
| «‹» кабинета помнит, откуда вошли (без входа, новой страницы и «Что нового») | | unit web `shared/lib/tests/cabinetFrom.test.ts` |

## Расписание

| Функция | Тест |
|---|---|
| Колонки · Лента: вид меняет доску и переживает перезагрузку | `cabinet-schedule.spec.ts` › «Колонки · Лента» |
| Лента дней: другой день со своими визитами, «Сегодня» | `cabinet-schedule.spec.ts` › the day strip opens another day |
| Загрузка дней `schedule/load` (минуты из ёмкости, ≤ 42 дней) | `cabinet-schedule.spec.ts` › the strip’s load; unit `admin/admin.schemas.spec.ts` |
| Инспектор визита (поповер или лист): клиент, услуга · мастер, цена, время; «Пришёл» | `cabinet-schedule.spec.ts` › a visit opens its inspector |
| «Все пришли» и «Вернуть» | `cabinet-schedule.spec.ts` › «Все пришли» marks the day’s ended visits |
| Неотмеченные визиты прошлых дней, нет «Новой записи» в прошлом | `clients.spec.ts` › visits left open in past days are flagged |
| «Поделиться свободными окнами»: окна с мастером, ссылка на запись | `cabinet-schedule.spec.ts` › «Поделиться свободными окнами» |
| «На всю ширину» сохраняется на устройстве | `cabinet-schedule.spec.ts` › «На всю ширину» |
| Тост «Новая запись» (опрос раз в 20 с) | `cabinet-schedule.spec.ts` › a client booking … arrives as a «Новая запись» toast |
| Правый клик по визиту → «Открыть запись» (только мышь) | `cabinet-schedule.spec.ts` › a right click on a visit |
| Новая запись по клику в пустой слот, перетаскивание с «Вернуть» | `platform.spec.ts` |
| Перерыв: закрыть и открыть время | `account.spec.ts` › staff see the day by master, close time and open it again |
| Отмена записи салоном, клиент видит отмену | `account.spec.ts` › staff cancel a client booking |
| Ждут окна: лист и «Записать» | `waitlist.spec.ts` |
| Подсказки клиентов в новой записи | `client-suggestions.spec.ts` (PR #87) |
| Схемы: перерыв (конец позже начала), перенос, итог визита, «Вернуть» | unit `admin/admin.schemas.spec.ts` |
| NowBar: кто в кресле и кто следующий, «Сейчас» с прогрессом, «Не отмечен» (часы браузера зафиксированы) | `cabinet-schedule-now.spec.ts` › NowBar names who is in the chair |
| «Сейчас ←/→» возвращает к текущему времени | `cabinet-schedule-now.spec.ts` › «Сейчас ←» |
| «Найти место под услугу»: подсвеченные окна, запись к мастеру с начала окна, «Готово» | `cabinet-schedule-now.spec.ts` › «Найти место под услугу»; unit web `widgets/DayCalendar/tests/freeGaps.test.ts` |
| «⋯» в инспекторе: карточка клиента, копирование номера, отмена с «Вернуть» | `cabinet-schedule-extra.spec.ts` › «⋯» in the inspector |
| «Записать снова» у отменённого визита впереди | `cabinet-schedule-extra.spec.ts` › a cancelled visit ahead |
| Масштаб ленты − / + (мышь), на телефоне капсулы нет | `cabinet-schedule-extra.spec.ts` › the timeline zooms |
| Вкладки у краёв ленты «‹ 12:30 +2» | `cabinet-schedule-extra.spec.ts` › an edge tab |
| Колонки → Лента на будущем дне открывает начало дня | `cabinet-schedule-extra.spec.ts` › switching to «Лента» |
| Свайп дня и перетаскивание долгим нажатием на телефоне | `cabinet-schedule-extra.spec.ts` › a sideways swipe / a long press drags |
| Состояния карточки (Ждём, Сейчас, Не отмечен, Пришёл, Не пришёл, Отменена, Ждёт оплату), загрузка мастера и первое свободное время, диапазон дня, шаг делений масштаба | unit web `widgets/DayCalendar/tests/blockState.test.ts`, `calendarLayout.test.ts` |

## Клиенты

| Функция | Тест |
|---|---|
| Итог визита (оплачено картой, неявка), карточка складывает, заметка | `clients.spec.ts` |
| Группы с числами, пустые скрыты, сортировка | `cabinet-clients.spec.ts` › clients fall into groups with counts; unit `clients/client-segments.spec.ts` |
| День рождения в карточке: с годом и без года | `cabinet-clients.spec.ts` › a birthday with its year / without a year |
| Импорт CSV клиентов и записей | `import.spec.ts`; unit `import/import-rows.spec.ts` |
| Рассылка «давно не были», раз в день, поздравления | `mailings.spec.ts`; unit `mailings/mailing-text.spec.ts`, `mailings/birthday.spec.ts` |
| «Записать снова» из карточки, история с «Ещё», «Продать абонемент» | `cabinet-clients-ui.spec.ts` |
| «Позвать N клиентов» открывает рассылку на группе «Давно не были» | `cabinet-clients-ui.spec.ts` › «Позвать» |
| Разбор CSV (разделители, кавычки, Windows-1251, BOM), поиск колонок | unit web `views/manage/tests/csv.test.ts` |
| Маски телефона и суммы | unit web `shared/lib/tests/inputMasks.test.ts` |

## Аналитика

| Функция | Тест |
|---|---|
| Выручка, клиенты, загрузка за период; чужим 403; только 7/30/90/365 | `analytics.spec.ts` |
| Процент мастера → к выплате | `analytics.spec.ts` › a master's percent turns their revenue into a payout |
| Строка мастера открывает его лист; CSV с теми же числами | `cabinet-analytics.spec.ts` › a master row opens their period |
| Цель месяца: лист, линия против выручки, «Убрать цель» | `cabinet-analytics.spec.ts` › the month’s goal; unit `admin/admin.schemas.spec.ts` |
| Материалы и маржа | `inventory.spec.ts` |
| «Требует внимания», «Потери», «Откуда записи», удержание, акции и лояльность: точные числа на собранной истории и строки на вкладке | `cabinet-analytics-report.spec.ts` |
| Столбец выручки открывает день в расписании | `cabinet-analytics-ui.spec.ts` › a revenue column |
| Тепловая карта: чтение часа, «Скидка на …» открывает акцию с днём и часами | `cabinet-analytics-ui.spec.ts` › the heatmap |

## Отзывы и вопросы

| Функция | Тест |
|---|---|
| Ответ владельца на отзыв | `reviews.spec.ts` |
| «Ответы на отзывы»: быстрый ответ сохраняется | `cabinet-reviews.spec.ts` › «Ответы на отзывы» keeps a new quick reply |
| «Без ответа»: плохие первыми; быстрый ответ с именем; «Решено»; «Ответить всем» только тихим хорошим | `cabinet-reviews.spec.ts` › poor reviews lead «Без ответа» |
| Администратор: читает быстрые ответы, 403 на настройки, «Ответить всем» и цель | `cabinet-reviews.spec.ts` › staff use the quick replies |
| Шаблоны ответов | unit `reviews/review-reply-text.spec.ts` |
| Вопросы: ответ, правка, удаление | `questions.spec.ts` |
| Telegram: подключить и отключить чат | `reviews.spec.ts` › Telegram for owners; unit `telegram/*.spec.ts` |
| Кнопки отзыва в Telegram: быстрый ответ и «Свой ответ» публикуются один раз и только из чата этого бизнеса | `cabinet-reviews.spec.ts` |
| Быстрые ответы в поле дают те же слова, что автоответ на сервере | unit web `views/manage/tests/replyTemplate.test.ts` |

## Страница

| Функция | Тест |
|---|---|
| «Редактировать»: название и описание на публичной странице; «Страница открыта» выкл. скрывает | `cabinet-page.spec.ts` › «Редактировать» saves the name |
| Чек-лист страницы (пункт описания уходит) | `cabinet-page.spec.ts` › «Редактировать» … |
| «Время»: выходной и шаг слотов доходят до графика и свободного времени | `cabinet-page.spec.ts` › «Время» |
| «За 7 дней»: записи и просмотры | `cabinet-page.spec.ts` › «За 7 дней» |
| Логотип: добавить и удалить | `cabinet-page.spec.ts` › the logo |
| «Поделиться»: QR, адрес, копирование ссылки | `cabinet-page.spec.ts` › «Поделиться» |
| Порядок работ: «Поставить первой» | `cabinet-page.spec.ts` › «Поставить первой» |
| Услуга, мастер, обложка | `platform.spec.ts` |
| Фото работы с тегами | `feed-deck.spec.ts` |
| «Пора прийти снова» у услуги | `return-visit.spec.ts` |
| График и отпуск мастера | `master-schedule.spec.ts`; unit `catalog/master-hours.spec.ts` |
| Предоплата у услуги | `prepayment.spec.ts` |
| Обложка: добавить, заменить, удалить | `cabinet-page.spec.ts` |
| «Редактировать»: вид и контакты (телефон, WhatsApp) на публичной странице | `cabinet-page.spec.ts` |
| «+ Акция» и капсулы акций на «Странице» | `cabinet-page.spec.ts` |
| Фото мастера; выключенный мастер уходит со страницы и из записи; цена услуги с карточки | `cabinet-page.spec.ts` |
| Описание акции одной строкой | unit web `shared/lib/tests/promotionText.test.ts` |

## Настройки

| Функция | Тест |
|---|---|
| Значения строк из `settings-summary`; staff 403 | `cabinet-settings.spec.ts` › each row says what is inside |
| Корень: «Филиалы» рядом со списком (мышь), список отдельно (телефон) | `cabinet-settings.spec.ts` › the root opens «Филиалы» |
| Поиск по разделам, включая разделы «Страницы» | `cabinet-settings.spec.ts` › the search finds sections |
| Филиалы: последний нельзя удалить или закрыть, второй удаляется | `cabinet-settings.spec.ts` › the only branch; `platform.spec.ts` (добавить филиал) |
| Ссылки для записи по филиалам | `visit-link.spec.ts` › each branch has its own booking link |
| Сотрудники | `roles.spec.ts` |
| Акции | `promotions.spec.ts`; unit `promotions/pricing.spec.ts` |
| Лояльность | `loyalty.spec.ts` |
| Склад | `inventory.spec.ts` |
| Уведомления в Telegram | `reviews.spec.ts` |
| Правка и удаление акции, плана абонемента, позиции склада (удержание кнопки) | `cabinet-settings.spec.ts` |
| История рассылок | `cabinet-settings.spec.ts` |
| Владелец не может закрыть доступ себе | `cabinet-settings.spec.ts` |
| Поиск сертификата по коду с остатком | `cabinet-settings.spec.ts` |
| Лояльность при откате: повторное сохранение ничего не списывает дважды, неявка и «Ждём» возвращают бонусы, сертификат, визит абонемента и материалы; «Все пришли» и «Вернуть» | `cabinet-loyalty-rollback.spec.ts` |
| Текст предоплаты | unit web `entities/booking/tests/paymentText.test.ts` |

## «Мой день» и «Воронки»

| Функция | Тест |
|---|---|
| Мастер видит и закрывает только свои визиты (API), `/master` ведёт в свой день | `master.spec.ts` |
| «Пришёл» в интерфейсе, «Ваши отзывы», чужой визит не виден | `master-day.spec.ts` › a master marks their own visit «Пришёл» |
| Номер не мастера: «Нет доступа», 403 на отзывы | `master-day.spec.ts` › a number that is not a master here |
| Воронки: срез по устройствам, остальным «не найдено» | `insights.spec.ts` |
| «ваши N%» за день, без процента вся сумма; «Фото работы» с пришедшего визита с тегами | `master-day.spec.ts` |

## Не покрыто и почему

- Кроны: выбор строк (напоминания о визите, «Пора прийти снова», просьбы об отзыве, автоответ на отзывы, неотмеченные визиты в 20:00) проверен на настоящей базе в `apps/api/src/**/*.db-spec.ts` (`pnpm --filter api test:db`, своя база `<имя>_dbtest`, job `db` в CI). Еженедельные дайджесты пока только unit-тестами текстов.
- Отправку подсказки «Свой ответ» ботом без токена не проверить: тест кладёт сохранённую подсказку сам и проверяет путь ответа.
- Перетаскивание фото работ мышью: HTML5 drag-and-drop в Playwright ненадёжен; тот же `PUT work-photos/order` проверен через «Поставить первой».
- «Скачать QR», системное меню «Поделиться», «Написать клиенту» (только собирает ссылку), скраб спарклайна (нет стабильной цели под указателем).
- Поиск сертификата в интерфейсе: такого экрана нет, проверен API.
