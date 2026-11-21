# WhatsApp для клиентов

Сообщения клиентам о визитах уходят так: в Telegram, если клиент привязал номер к боту; иначе в WhatsApp, если он включён; иначе по SMS. Если WhatsApp не принял сообщение (номера нет в WhatsApp, шаблон не одобрен, сбой Meta), это сообщение уходит по SMS. Рассылки и коды входа WhatsApp не используют.

WhatsApp работает через Meta WhatsApp Business Cloud API (`POST https://graph.facebook.com/<версия>/<phone-number-id>/messages`). Первое сообщение клиенту можно отправить только по одобренному шаблону, поэтому каждое сообщение у нас: шаблон категории **Utility** на русском (`ru`).

Код: `apps/api/src/notifications/whatsapp-messages.ts` (тексты шаблонов и параметры, должны совпадать с Meta слово в слово), `whatsapp.service.ts` (отправка), `whatsapp-webhook.controller.ts` (статусы доставки).

## Что сделать в Meta

1. **Аккаунт.** Зайдите в [Meta for Developers](https://developers.facebook.com/apps), создайте приложение типа «Business» и добавьте продукт «WhatsApp». Приложение привяжется к Meta Business Portfolio (бизнес-аккаунту); подтвердите компанию (Business Verification) в Business Manager, иначе лимит: 250 клиентов в сутки.
2. **Номер.** В «WhatsApp → API Setup» добавьте номер, с которого будут приходить сообщения (номер не должен быть занят обычным WhatsApp или WhatsApp Business на телефоне). Укажите отображаемое имя «Awaisa» и дождитесь его одобрения. Скопируйте **Phone number ID** (не сам номер): это `WHATSAPP_PHONE_NUMBER_ID`.
3. **Постоянный токен.** Временный токен со страницы API Setup живёт 24 часа. Для работы: Business Settings → Users → System users → создайте системного пользователя (Admin), назначьте ему приложение и WhatsApp-аккаунт (Full control), нажмите «Generate new token» с правами `whatsapp_business_messaging` и `whatsapp_business_management`, срок «Never». Это `WHATSAPP_TOKEN`.
4. **Оплата.** В WhatsApp Manager добавьте способ оплаты: utility-сообщения платные (цена по стране получателя).
5. **Шаблоны.** WhatsApp Manager → Message templates → Create template. Для каждого шаблона ниже: категория **Utility**, имя точно как в таблице, язык **Russian (ru)**, тип переменных **Number** (`{{1}}`, `{{2}}` …), текст тела слово в слово. Кнопка: «Call to action» → «Visit website» → тип URL **Dynamic**, адрес `https://awaisa.kg/{{1}}` (ваш `PUBLIC_WEB_URL` и косая черта; мы подставляем только часть после неё). В примерах (Samples) укажите что-то вроде `v/123?s=abc`.
6. **Webhook (по желанию).** В приложении: WhatsApp → Configuration → Webhook. Callback URL `https://<api>/whatsapp/webhook`, Verify token: любая строка, её же в `WHATSAPP_VERIFY_TOKEN`. Подпишитесь на поле `messages`. App secret (App settings → Basic) в `WHATSAPP_APP_SECRET`: без него API отвечает 403 на все уведомления. Сейчас webhook только пишет в лог недоставленные сообщения.

## Шаблоны

| Имя | Когда | Текст | Кнопка |
| --- | --- | --- | --- |
| `booking_confirmation` | после записи (и после оплаты предоплаты) | Вы записаны в {{1}}: {{2}}, {{3}} в {{4}}, мастер {{5}}. Ждём вас! | Перенести или отменить |
| `booking_reminder` | за 1 час, 2 часа или сутки до визита | Напоминаем: {{1}} в {{2}} у вас {{3}} в {{4}}, мастер {{5}}. Ждём вас! | Перенести или отменить |
| `booking_rescheduled` | клиент или салон перенёс запись | Запись в {{1}} перенесена: {{2}}, {{3}} в {{4}}, мастер {{5}}. Подробности по кнопке ниже. | Открыть запись |
| `booking_cancelled` | салон отменил запись | К сожалению, запись в {{1}} на {{2}} в {{3}} отменена. Выберите другое время по кнопке ниже. | Выбрать время |
| `waitlist_freed` | освободилось время для листа ожидания | В {{1}} освободилось время: {{2}}, {{3}} в {{4}}. Успейте записаться по кнопке ниже. | Записаться |
| `review_request` | через 2 часа после визита | Как прошёл визит в {{1}}? Оцените мастера, это займёт 10 секунд. | Оценить |
| `return_visit` | «Пора прийти снова» | Пора снова на «{{1}}» в {{2}}? {{3}} ждёт вас, записаться можно по кнопке ниже. | Записаться |

Что подставляется:

- `booking_confirmation`, `booking_rescheduled`: 1 место, 2 услуга, 3 дата («24 ноября»), 4 время («15:30»), 5 мастер.
- `booking_reminder`: 1 «сегодня» или «завтра», 2 время, 3 услуга, 4 место, 5 мастер.
- `booking_cancelled`: 1 место, 2 дата, 3 время.
- `waitlist_freed`: 1 место, 2 услуга, 3 дата, 4 время.
- `review_request`: 1 место.
- `return_visit`: 1 услуга, 2 место, 3 имя мастера.

Пример для проверки в Meta (Samples): место «Awaisa Studio», услуга «Мужская стрижка», дата «24 ноября», время «15:30», мастер «Эрлан Асанов».

Шаблон, который ещё не одобрен или отклонён, не ломает ничего: Meta отвечает ошибкой, и сообщение уходит по SMS.

## Настройки API

| Переменная | Что это |
| --- | --- |
| `WHATSAPP_DRIVER` | `meta` отправляет, `log` только пишет в лог («WhatsApp booking_reminder to …»), `off` выключает (сообщения по SMS). По умолчанию `meta`, если заданы токен и номер, иначе `log` (в production `off`). |
| `WHATSAPP_TOKEN` | постоянный токен системного пользователя |
| `WHATSAPP_PHONE_NUMBER_ID` | Phone number ID |
| `WHATSAPP_API_VERSION` | версия Graph API, по умолчанию `v23.0` |
| `WHATSAPP_LANGUAGE` | язык шаблонов, по умолчанию `ru` |
| `WHATSAPP_VERIFY_TOKEN` | строка для проверки webhook |
| `WHATSAPP_APP_SECRET` | App secret, им проверяется подпись `X-Hub-Signature-256` |

WhatsApp уходит только на номера стран из `SMS_ALLOWED_COUNTRY_CODES` и только тем, кто не отключил SMS-сообщения при записи: те же правила, что у SMS.
