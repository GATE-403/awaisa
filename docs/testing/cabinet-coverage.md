# Кабинет: функция → тест

Карта функций кабинета владельца (`/manage`, `/manage/<slug>`, `/master`, `/insights`) и тесты, которые их проверяют. e2e лежат в `apps/web/e2e`, unit-тесты API рядом с кодом в `apps/api/src` (`*.spec.ts`).

Новые e2e работают на бизнесе, который тест создаёт сам (`e2e/business.ts`: `createOwnBusiness`, `createVisit`). Такой бизнес называется `E2E Место …`, общий сид не меняется, глобальный teardown его удаляет. Поэтому каждая спека проходит сама по себе на свежем засеянном базе.

Роли: **В** владелец, **А** администратор (staff), **П** админ платформы, **М** мастер.

## Вход, навигация, роли

| Функция | Роли | Тест |
|---|---|---|
| `/manage` без входа ведёт на `/login?next=/manage` | гость | `cabinet-home.spec.ts` › a guest is asked to sign in first |
| Один бизнес: `/manage` сразу открывает кабинет; несколько: список строк (Открыта/Скрыта, роль, следующий визит, ↗ на страницу, «Новая страница») | В | `cabinet-home.spec.ts` › one business opens straight into its cabinet; two make a list of rows |
| Таб «Кабинет», «‹» туда, откуда вошли, переключатель бизнеса, меню профиля | П | `cabinet-flow.spec.ts` |
| «Что нового»: точка на мегафоне до прочтения | П | `updates.spec.ts` › the cabinet marks news until it is read |
| Доступ: гость 401, чужой 403, staff 403 на `@OwnerOnly` (метод или весь контроллер), владелец и админ платформы проходят | все | unit `businesses/business-access.guard.spec.ts` |
| Доступ мастера: только активный мастер этого бизнеса по своему номеру | М | unit `master/master.guard.spec.ts` |
| Администратор: видит день, не видит «Аналитику» и «Настройки», 403 на деньги, часы и команду; «Закрыть доступ» | В, А | `roles.spec.ts` |
| Чужой аккаунт не открывает расписание | клиент | `account.spec.ts` › non-staff accounts cannot open the schedule |
| Адрес бизнеса не может совпасть со своим разделом сайта (`RESERVED_SLUGS` ⊇ `APP_SEGMENTS` и папки `app/`) | | unit `businesses/business-rules.spec.ts` |
| Доступность всех вкладок кабинета (axe, WCAG 2.1 AA) | В | `cabinet-a11y.spec.ts` |

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

## Клиенты

| Функция | Тест |
|---|---|
| Итог визита (оплачено картой, неявка), карточка складывает, заметка | `clients.spec.ts` |
| Группы с числами, пустые скрыты, сортировка | `cabinet-clients.spec.ts` › clients fall into groups with counts; unit `clients/client-segments.spec.ts` |
| День рождения в карточке: с годом и без года | `cabinet-clients.spec.ts` › a birthday with its year / without a year |
| Импорт CSV клиентов и записей | `import.spec.ts`; unit `import/import-rows.spec.ts` |
| Рассылка «давно не были», раз в день, поздравления | `mailings.spec.ts`; unit `mailings/mailing-text.spec.ts`, `mailings/birthday.spec.ts` |

## Аналитика

| Функция | Тест |
|---|---|
| Выручка, клиенты, загрузка за период; чужим 403; только 7/30/90/365 | `analytics.spec.ts` |
| Процент мастера → к выплате | `analytics.spec.ts` › a master's percent turns their revenue into a payout |
| Строка мастера открывает его лист; CSV с теми же числами | `cabinet-analytics.spec.ts` › a master row opens their period |
| Цель месяца: лист, линия против выручки, «Убрать цель» | `cabinet-analytics.spec.ts` › the month’s goal; unit `admin/admin.schemas.spec.ts` |
| Материалы и маржа | `inventory.spec.ts` |

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
| Фото работы с тегами | `feed.spec.ts` |
| «Пора прийти снова» у услуги | `return-visit.spec.ts` |
| График и отпуск мастера | `master-schedule.spec.ts`; unit `catalog/master-hours.spec.ts` |
| Предоплата у услуги | `prepayment.spec.ts` |

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

## «Мой день» и «Воронки»

| Функция | Тест |
|---|---|
| Мастер видит и закрывает только свои визиты (API), `/master` ведёт в свой день | `master.spec.ts` |
| «Пришёл» в интерфейсе, «Ваши отзывы», чужой визит не виден | `master-day.spec.ts` › a master marks their own visit «Пришёл» |
| Номер не мастера: «Нет доступа», 403 на отзывы | `master-day.spec.ts` › a number that is not a master here |
| Воронки: срез по устройствам, остальным «не найдено» | `insights.spec.ts` |

## Не покрыто и почему

- «Найти место под услугу» и NowBar зависят от текущего времени суток: тест был бы флаки.
- Автоответ на отзывы срабатывает по крону раз в 10 минут после часа ожидания: проверена только логика шаблона (unit).
- Перетаскивание фото работ мышью: HTML5 drag-and-drop в Playwright ненадёжен; тот же `PUT work-photos/order` проверен через «Поставить первой».
- «Скачать QR» и системное меню «Поделиться»: загрузка файла и `navigator.share`.
- «Написать клиенту» только собирает ссылку WhatsApp или SMS.
