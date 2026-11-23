import type { CountedEntry, Entry } from './types'

// The owner cabinet's shared words and its shell: the bar, the tabs, «Настройки» and its
// sections (team, branches, hours, notifications). Tabs with many strings have their own area.
const CABINET: Record<string, Entry> = {
  // Shared words
  Удалить: ['Өчүрүү', 'Delete'],
  Отменить: ['Жокко чыгаруу', 'Cancel'],
  Сохранено: ['Сакталды', 'Saved'],
  Да: ['Ооба', 'Yes'],
  Нет: ['Жок', 'No'],
  Необязательно: ['Милдеттүү эмес', 'Optional'],
  'Загружаем…': ['Жүктөп жатабыз…', 'Loading…'],
  Название: ['Аталышы', 'Name'],
  Сумма: ['Сумма', 'Amount'],
  Цена: ['Баасы', 'Price'],
  Дата: ['Күнү', 'Date'],
  Месяц: ['Ай', 'Month'],
  Год: ['Жыл', 'Year'],
  Неделя: ['Апта', 'Week'],
  Квартал: ['Чейрек', 'Quarter'],
  Вчера: ['Кечээ', 'Yesterday'],
  Клиент: ['Кардар', 'Client'],
  Клиенты: ['Кардарлар', 'Clients'],
  Визиты: ['Визиттер', 'Visits'],
  Выручка: ['Түшкөн акча', 'Revenue'],
  Оплачено: ['Төлөндү', 'Paid'],
  Способ: ['Ыкма', 'Method'],
  Наличные: ['Накталай', 'Cash'],
  Перевод: ['Которуу', 'Transfer'],
  Ждём: ['Күтөбүз', 'Expected'],
  Пришёл: ['Келди', 'Arrived'],
  'Не пришёл': ['Келген жок', 'No-show'],
  'Новая запись': ['Жаңы жазылуу', 'New booking'],
  'День рождения': ['Туулган күн', 'Birthday'],
  'Скопировать ссылку': ['Шилтемени көчүрүү', 'Copy link'],

  // Sections
  Расписание: ['Жадыбал', 'Schedule'],
  Аналитика: ['Аналитика', 'Analytics'],
  Страница: ['Барак', 'Page'],
  Касса: ['Касса', 'Till'],
  Филиалы: ['Филиалдар', 'Branches'],
  Сотрудники: ['Кызматкерлер', 'Team'],
  Акции: ['Акциялар', 'Promotions'],
  Лояльность: ['Лоялдуулук', 'Loyalty'],
  Склад: ['Кампа', 'Stock'],
  Тариф: ['Тариф', 'Plan'],
  Товары: ['Товарлар', 'Products'],
  Расходы: ['Чыгымдар', 'Expenses'],
  Чек: ['Чек', 'Receipt'],
  Чеки: ['Чектер', 'Receipts'],
  Сертификат: ['Сертификат', 'Certificate'],
  Сертификаты: ['Сертификаттар', 'Certificates'],
  'Часы работы': ['Иштөө убактысы', 'Opening hours'],

  // Cabinet shell: errors, tabs, the bar, the business switcher
  'Нет доступа.': ['Кирүүгө уруксат жок.', 'No access.'],
  'Не получилось.': ['Болбой калды.', 'Something went wrong.'],
  'Этим бизнесом управляет другой аккаунт.': [
    'Бул бизнести башка аккаунт башкарат.',
    'Another account manages this business.',
  ],
  'Разделы кабинета': ['Кабинеттин бөлүмдөрү', 'Dashboard sections'],
  'Назад к настройкам': ['Жөндөөлөргө кайтуу', 'Back to settings'],
  'Мои бизнесы.': ['Менин бизнестерим.', 'My businesses.'],
  'Выберите, чем управлять.': ['Эмнени башкарарыңызды тандаңыз.', 'Choose what to manage.'],
  'Создайте первую страницу': ['Биринчи баракчаңызды түзүңүз', 'Create your first page'],
  'Создайте страницу бизнеса — это пять минут, и клиенты смогут записываться.': [
    'Бизнестин баракчасын түзүңүз: беш мүнөт, жана кардарлар жазыла алышат.',
    'Create a business page: it takes five minutes, and clients can start booking.',
  ],
  'Создать страницу': ['Баракча түзүү', 'Create a page'],
  'Новая страница': ['Жаңы баракча', 'New page'],
  'Назад: {label}': ['Артка: {label}', 'Back: {label}'],
  скрыта: ['жашырылган', 'hidden'],
  'Открыть страницу бизнеса': ['Бизнестин баракчасын ачуу', 'Open the business page'],
  'Что нового: есть обновления': ['Эмне жаңы: жаңыртуулар бар', "What's new: there are updates"],
  'Профиль: {name}': ['Профиль: {name}', 'Profile: {name}'],
  '{name}: другие бизнесы и разделы': [
    '{name}: башка бизнестер жана бөлүмдөр',
    '{name}: other businesses and sections',
  ],
  Модерация: ['Модерация', 'Moderation'],

  // My businesses list
  Владелец: ['Ээси', 'Owner'],
  Сотрудник: ['Кызматкер', 'Team member'],
  'Админ платформы': ['Платформанын админи', 'Platform admin'],
  Администратор: ['Администратор', 'Administrator'],
  'Записей впереди нет': ['Алдыда жазылуу жок', 'No bookings ahead'],
  '{minutes} мин': ['{minutes} мүн', '{minutes} min'],
  'Дальше: сегодня в {time}': ['Кийинкиси: бүгүн саат {time}', 'Next: today at {time}'],
  'Дальше: завтра в {time}': ['Кийинкиси: эртең саат {time}', 'Next: tomorrow at {time}'],
  'Дальше: {day}, {time}': ['Кийинкиси: {day}, {time}', 'Next: {day}, {time}'],
  Открыта: ['Ачык', 'Open'],
  Скрыта: ['Жашырылган', 'Hidden'],
  'Страница {name}': ['{name} баракчасы', '{name} page'],
  'Открыть страницу': ['Баракчаны ачуу', 'Open the page'],

  // Setup checklist
  'Добавьте услуги': ['Кызматтарды кошуңуз', 'Add services'],
  'Добавьте мастеров': ['Усталарды кошуңуз', 'Add specialists'],
  'Проверьте график': ['Иш графигин текшериңиз', 'Check the opening hours'],
  'Запись открыта': ['Жазылуу ачык', 'Booking is open'],
  'Отправьте клиентам ссылку на вашу страницу': [
    'Кардарларга баракчаңыздын шилтемесин жөнөтүңүз',
    'Send clients the link to your page',
  ],
  'Запуск записи': ['Жазылууну ишке киргизүү', 'Opening for bookings'],
  'Ещё {count}, и клиенты смогут записываться': [
    'Дагы {count}, жана кардарлар жазыла алышат',
    '{count} more, and clients can book',
  ],
  '{done} из {total}': ['{total} ичинен {done}', '{done} of {total}'],
  'Готово {done} из {total}': ['{total} ичинен {done} даяр', '{done} of {total} done'],
  'Начать ›': ['Баштоо ›', 'Start ›'],

  // Plan lock
  'Доступно на тарифе «{plan}»': [
    '«{plan}» тарифинде жеткиликтүү',
    'Available on the «{plan}» plan',
  ],
  'Недоступно на вашем тарифе': ['Сиздин тарифте жеткиликсиз', 'Not available on your plan'],
  'Тариф меняет владелец.': ['Тарифти ээси өзгөртөт.', 'The owner changes the plan.'],
  'Открыть тариф': ['Тарифти ачуу', 'Open the plan'],
  'Смены, продажи товаров и расходы: касса сходится сама.': [
    'Сменалар, товар сатуу жана чыгымдар: касса өзү туура келет.',
    'Shifts, product sales and expenses: the till balances itself.',
  ],
  'Остатки материалов списываются с каждым визитом.': [
    'Материалдардын калдыгы ар бир визит менен эсептен чыгарылат.',
    'Materials are written off with every visit.',
  ],
  'Выручка, загрузка мастеров и откуда приходят клиенты.': [
    'Түшкөн акча, усталардын жүктөмү жана кардарлар кайдан келет.',
    'Revenue, specialist workload and where clients come from.',
  ],
  'Бонусы, абонементы и сертификаты возвращают клиентов.': [
    'Бонустар, абонементтер жана сертификаттар кардарларды кайтарат.',
    'Bonuses, passes and certificates bring clients back.',
  ],
  'Скидки по часам, первому визиту и промокоды.': [
    'Саат боюнча, биринчи визитке арзандатуулар жана промокоддор.',
    'Discounts by the hour, for a first visit and promo codes.',
  ],
  'SMS-рассылки тем, кто давно не был.': [
    'Көптөн бери келбегендерге SMS-жөнөтүүлөр.',
    "SMS campaigns to clients who haven't been in a while.",
  ],
  'Клиенты и записи из Altegio или YCLIENTS одним файлом.': [
    'Altegio же YCLIENTS кардарлары жана жазылуулары бир файл менен.',
    'Clients and bookings from Altegio or YCLIENTS in one file.',
  ],
  'Зарплата мастеров считается сама.': [
    'Усталардын айлыгы өзү эсептелет.',
    'Specialist pay is calculated automatically.',
  ],
  'Администраторы ведут расписание без доступа к деньгам.': [
    'Администраторлор акчага кирбей эле жадыбалды жүргүзөт.',
    'Administrators run the schedule without access to money.',
  ],
  'Предоплата при онлайн-записи.': [
    'Онлайн жазылууда алдын ала төлөм.',
    'Prepayment for online bookings.',
  ],

  // Settings list
  Уведомления: ['Билдирмелер', 'Notifications'],
  Поиск: ['Издөө', 'Search'],
  'Поиск по настройкам': ['Жөндөөлөрдөн издөө', 'Search settings'],
  Найдено: ['Табылды', 'Found'],
  'Ничего не нашли': ['Эч нерсе табылган жок', 'Nothing found'],
  'Попробуйте другое слово.': ['Башка сөз менен издеп көрүңүз.', 'Try another word.'],
  'на Странице': ['Баракчада', 'on the Page'],
  'Выкл.': ['Өчүк', 'Off'],
  Пусто: ['Бош', 'Empty'],
  '{plan} · пробный': ['{plan} · сыноо', '{plan} · trial'],
  '{count} действует': ['{count} иштеп жатат', '{count} running'],
  '{count} действуют': ['{count} иштеп жатат', '{count} running'],
  'Бонусы {percent}%': ['Бонустар {percent}%', 'Bonuses {percent}%'],
  '{count} заканчивается': ['{count} түгөнүп баратат', '{count} running low'],
  '{count} заканчиваются': ['{count} түгөнүп баратат', '{count} running low'],
  '{count} не прошёл': ['{count} өткөн жок', '{count} failed'],
  '{count} не прошли': ['{count} өткөн жок', '{count} failed'],

  // Notifications
  'Новые записи, переносы и отмены: на телефоне и в Telegram, сразу как они случаются.': [
    "Жаңы жазылуулар, жылдыруулар жана жокко чыгаруулар: телефондо жана Telegram'да, болгон замат.",
    'New bookings, moves and cancellations: on your phone and in Telegram, as they happen.',
  ],
  'Telegram-бот ещё не подключён к платформе.': [
    'Telegram-бот платформага азырынча туташа элек.',
    'The Telegram bot is not connected to the platform yet.',
  ],
  Клиентам: ['Кардарларга', 'To clients'],
  'Подтверждения и напоминания о визитах приходят в WhatsApp, а без него по SMS.': [
    "Визит тууралуу ырастоолор жана эскертмелер WhatsApp'ка, ал жок болсо SMS менен келет.",
    'Visit confirmations and reminders go to WhatsApp, or by SMS without it.',
  ],
  'Уведомления в Telegram': ["Telegram'дагы билдирмелер", 'Telegram notifications'],
  'Telegram подключён': ['Telegram туташты', 'Telegram connected'],
  'Уведомления отключены': ['Билдирмелер өчүрүлдү', 'Notifications turned off'],
  'Чат Telegram': ['Telegram чаты', 'Telegram chat'],
  'Подключён {date}': ['{date} туташкан', 'Connected {date}'],
  Отключить: ['Өчүрүү', 'Disconnect'],
  'Ждём, когда вы нажмёте «Start» в Telegram…': [
    "Telegram'да «Start» баскычын басышыңызды күтүп жатабыз…",
    'Waiting for you to tap «Start» in Telegram…',
  ],
  'Готовим ссылку…': ['Шилтеме даярдап жатабыз…', 'Preparing the link…'],
  'Подключить ещё один чат': ['Дагы бир чат туташтыруу', 'Connect another chat'],
  'Подключить Telegram': ['Telegram туташтыруу', 'Connect Telegram'],
  'Новые записи, отмены и отзывы — сразу, расписание на день — в 9:00. В боте: /today — записи на сегодня, /stop — отключить.':
    [
      'Жаңы жазылуулар, жокко чыгаруулар жана пикирлер дароо келет, күндүн жадыбалы саат 9:00до. Ботто: /today (бүгүнкү жазылуулар), /stop (өчүрүү).',
      "New bookings, cancellations and reviews arrive at once, the day's schedule at 9:00. In the bot: /today (today's bookings), /stop (turn off).",
    ],
  'На этом устройстве': ['Бул түзмөктө', 'On this device'],
  'Уведомления на этом устройстве': ['Бул түзмөктөгү билдирмелер', 'Notifications on this device'],
  'Уведомлять о записях': ['Жазылуулар тууралуу билдирүү', 'Notify about bookings'],
  'Уведомления включены': ['Билдирмелер күйгүзүлдү', 'Notifications on'],
  'Уведомления выключены': ['Билдирмелер өчүрүлдү', 'Notifications off'],
  'На iPhone уведомления приходят только из приложения: «Поделиться» → «На экран Домой», затем включите их там.':
    [
      "iPhone'до билдирмелер тиркемеден гана келет: «Бөлүшүү» → «Башкы экранга», анан аларды ошол жерден күйгүзүңүз.",
      'On iPhone, notifications only come from the app: «Share» → «Add to Home Screen», then turn them on there.',
    ],
  'Уведомления запрещены в настройках браузера для этого сайта: разрешите их там.': [
    'Бул сайт үчүн браузердин жөндөөлөрүндө билдирмелерге тыюу салынган: аларды ошол жерден уруксат бериңиз.',
    'Notifications are blocked for this site in your browser settings: allow them there.',
  ],
  'Уведомления запрещены в настройках телефона для Awaisa: разрешите их там.': [
    'Телефондун жөндөөлөрүндө Awaisa үчүн билдирмелерге тыюу салынган: аларды ошол жерден уруксат бериңиз.',
    'Notifications for Awaisa are blocked in your phone settings: allow them there.',
  ],
  'Новые записи, переносы и отмены клиентов, даже когда кабинет закрыт.': [
    'Кардарлардын жаңы жазылуулары, жылдыруулары жана жокко чыгаруулары, кабинет жабык болсо да.',
    'New bookings, moves and cancellations from clients, even when the dashboard is closed.',
  ],
  'Новые записи к вам, переносы и отмены, даже когда страница закрыта.': [
    'Сизге жаңы жазылуулар, жылдыруулар жана жокко чыгаруулар, баракча жабык болсо да.',
    'New bookings with you, moves and cancellations, even when the page is closed.',
  ],

  // Phone calendar
  Календарь: ['Календарь', 'Calendar'],
  'Календарь на телефоне': ['Телефондогу календарь', 'Calendar on your phone'],
  Подключён: ['Туташкан', 'Connected'],
  'Записи в Календаре iPhone или Google: обновляются сами, кабинет открывать не нужно.': [
    'Жазылуулар iPhone же Google Календарында: өзү жаңырат, кабинетти ачуунун кереги жок.',
    'Bookings in iPhone or Google Calendar: they update themselves, no need to open the dashboard.',
  ],
  'Ваши записи в Календаре iPhone или Google: обновляются сами, «Мой день» открывать не нужно.': [
    'Сиздин жазылууларыңыз iPhone же Google Календарында: өзү жаңырат, «Менин күнүм» барагын ачуунун кереги жок.',
    'Your bookings in iPhone or Google Calendar: they update themselves, no need to open «My day».',
  ],
  'Без этого в календаре видны только последние цифры: +996 ••• ••• 456.': [
    'Мунсуз календарда акыркы сандар гана көрүнөт: +996 ••• ••• 456.',
    'Without this the calendar shows only the last digits: +996 ••• ••• 456.',
  ],
  'Касается всех календарей бизнеса.': [
    'Бизнестин бардык календарларына тиешелүү.',
    "Applies to all of the business's calendars.",
  ],
  'Ссылка сменилась, старая больше не работает': [
    'Шилтеме алмашты, эскиси мындан ары иштебейт',
    'The link has changed, the old one no longer works',
  ],
  'Календарь обновлялся {date}.': ['Календарь {date} жаңырган.', 'Calendar last updated {date}.'],
  'Ссылка выдана на другом устройстве. Новая отключит прежнюю.': [
    'Шилтеме башка түзмөктө берилген. Жаңысы мурункусун өчүрөт.',
    'The link was issued on another device. A new one turns the old one off.',
  ],
  'Записи за месяц назад и три вперёд появятся в Календаре iPhone или Google и будут обновляться сами. Отмены останутся зачёркнутыми.':
    [
      'Бир ай мурунку жана үч ай алдыдагы жазылуулар iPhone же Google Календарында пайда болуп, өзү жаңырып турат. Жокко чыгарылгандары сызылган бойдон калат.',
      'Bookings from a month back to three months ahead will appear in iPhone or Google Calendar and update themselves. Cancellations stay crossed out.',
    ],
  'Ваши записи за месяц назад и три вперёд появятся в Календаре iPhone или Google и будут обновляться сами. Отмены останутся зачёркнутыми.':
    [
      'Сиздин бир ай мурунку жана үч ай алдыдагы жазылууларыңыз iPhone же Google Календарында пайда болуп, өзү жаңырып турат. Жокко чыгарылгандары сызылган бойдон калат.',
      'Your bookings from a month back to three months ahead will appear in iPhone or Google Calendar and update themselves. Cancellations stay crossed out.',
    ],
  'Что показывать': ['Эмнени көрсөтүү', 'What to show'],
  'Все мастера': ['Бардык усталар', 'All specialists'],
  'Номера клиентов целиком': ['Кардарлардын номерлери толук', 'Full client numbers'],
  'Добавить в Google Календарь': ['Google Календарына кошуу', 'Add to Google Calendar'],
  'Сменить ссылку': ['Шилтемени алмаштыруу', 'Change the link'],
  Подписаться: ['Жазылуу', 'Subscribe'],
  'Получить новую ссылку': ['Жаңы шилтеме алуу', 'Get a new link'],
  'Получить ссылку': ['Шилтеме алуу', 'Get the link'],

  // Team
  'Администратор добавлен': ['Администратор кошулду', 'Administrator added'],
  'Ему придёт SMS со ссылкой': ['Ага шилтемеси бар SMS келет', "They'll get an SMS with a link"],
  'Доступ закрыт': ['Кирүү жабылды', 'Access removed'],
  'Администратор видит расписание, клиентов и отзывы — без денег и настроек.': [
    'Администратор жадыбалды, кардарларды жана пикирлерди көрөт, акча менен жөндөөлөрсүз.',
    'An administrator sees the schedule, clients and reviews, without money or settings.',
  ],
  'Закрыть доступ: {name}': ['Кирүүнү жабуу: {name}', 'Remove access: {name}'],
  'Администраторы доступны на тарифе «{plan}».': [
    'Администраторлор «{plan}» тарифинде жеткиликтүү.',
    'Administrators are available on the «{plan}» plan.',
  ],
  'Добавить администратора': ['Администратор кошуу', 'Add an administrator'],
  'Телефон администратора': ['Администратордун телефону', "Administrator's phone"],
  'Он войдёт по SMS на этот номер и сразу увидит кабинет.': [
    'Ал бул номерге SMS аркылуу кирип, кабинетти дароо көрөт.',
    'They sign in by SMS to this number and see the dashboard straight away.',
  ],

  // Branches
  'Филиал добавлен': ['Филиал кошулду', 'Branch added'],
  'Филиал сохранён': ['Филиал сакталды', 'Branch saved'],
  'Филиал удалён': ['Филиал өчүрүлдү', 'Branch deleted'],
  'Каждый адрес — своя метка на карте. Клиент выбирает ближайший при записи.': [
    'Ар бир даректин картада өз белгиси бар. Кардар жазылууда эң жакынын тандайт.',
    'Each address has its own pin on the map. Clients pick the nearest when booking.',
  ],
  'Добавить филиал': ['Филиал кошуу', 'Add a branch'],
  Закрыт: ['Жабык', 'Closed'],
  'Адрес не указан': ['Дарек көрсөтүлгөн эмес', 'No address'],
  'Нет метки': ['Белги жок', 'No pin'],
  'Без метки филиал не виден на карте. Мастера без филиала принимают во всех.': [
    'Белгиси жок филиал картада көрүнбөйт. Филиалы жок усталар бардык филиалдарда кабыл алат.',
    "Without a pin a branch isn't on the map. Specialists without a branch work at all of them.",
  ],
  'Все филиалы': ['Бардык филиалдар', 'All branches'],
  'Ссылки для записи': ['Жазылуу шилтемелери', 'Booking links'],
  'Скопировать ссылку: {name}': ['Шилтемени көчүрүү: {name}', 'Copy link: {name}'],
  Скопировать: ['Көчүрүү', 'Copy'],
  'Поставьте ссылку филиала в его карточку в 2ГИС, в Instagram или на QR у входа: клиент сразу попадёт в запись в нужный филиал.':
    [
      "Филиалдын шилтемесин анын 2ГИСтеги карточкасына, Instagram'га же кире бериштеги QRга коюңуз: кардар дароо керектүү филиалга жазылууга түшөт.",
      'Put the branch link on its 2GIS card, on Instagram or on a QR code by the door: clients land straight on booking at that branch.',
    ],
  'Новый филиал': ['Жаңы филиал', 'New branch'],
  'Центр, Джал, Асанбай': ['Борбор, Жал, Асанбай', 'Centre, Dzhal, Asanbai'],
  'ул. Токтогула, 125': ['Токтогул көч., 125', '125 Toktogul St'],
  'Как у бизнеса': ['Бизнестикиндей', 'Same as the business'],
  'Найденные адреса': ['Табылган даректер', 'Addresses found'],
  'Выберите адрес, и метка встанет на карте сама.': [
    'Даректи тандаңыз, белги картага өзү коюлат.',
    'Pick an address and the pin will move on the map by itself.',
  ],
  'Метка на карте': ['Картадагы белги', 'Map pin'],
  'По метке: {address}.': ['Белги боюнча: {address}.', 'From the pin: {address}.'],
  'Подставить адрес': ['Даректи коюу', 'Use this address'],
  'Передвиньте карту, чтобы метка указала на вход: адрес подставится сам.': [
    'Белги кире беришти көрсөтүшү үчүн картаны жылдырыңыз: дарек өзү коюлат.',
    'Move the map so the pin points at the entrance: the address fills itself in.',
  ],
  'Начните вводить адрес или передвиньте карту: адрес и метка заполнят друг друга.': [
    'Даректи жаза баштаңыз же картаны жылдырыңыз: дарек менен белги бири-бирин толтурат.',
    'Start typing the address or move the map: the address and the pin fill each other in.',
  ],
  'Принимает клиентов': ['Кардарларды кабыл алат', 'Accepts clients'],
  'Удалить филиал': ['Филиалды өчүрүү', 'Delete branch'],

  // Opening hours
  'Часы сохранены': ['Иштөө убактысы сакталды', 'Hours saved'],
  'Клиенты видят только время внутри этих часов и без чужих записей.': [
    'Кардарлар ушул сааттардын ичиндеги жана башка жазылуулар менен бош эмес убакытты гана көрөт.',
    'Clients only see times within these hours that are not already booked.',
  ],
  'Шаг записи': ['Жазылуу кадамы', 'Booking interval'],
  'Как часто начинаются окна: 10:00, 10:30…': [
    'Бош убакыттар канчалык тез-тез башталат: 10:00, 10:30…',
    'How often slots start: 10:00, 10:30…',
  ],
  Понедельник: ['Дүйшөмбү', 'Monday'],
  Вторник: ['Шейшемби', 'Tuesday'],
  Среда: ['Шаршемби', 'Wednesday'],
  Четверг: ['Бейшемби', 'Thursday'],
  Пятница: ['Жума', 'Friday'],
  Суббота: ['Ишемби', 'Saturday'],
  Воскресенье: ['Жекшемби', 'Sunday'],
  '{day}: открытие': ['{day}: ачылышы', '{day}: opens'],
  '{day}: закрытие': ['{day}: жабылышы', '{day}: closes'],
  '{day}: рабочий день': ['{day}: иш күнү', '{day}: working day'],
  '{day}: закрытие должно быть позже открытия': [
    '{day}: жабылуу убактысы ачылуудан кеч болушу керек',
    '{day}: closing must be after opening',
  ],
  // The foot of «Настройки»: hiding the page and deleting the business
  'Скрыть или удалить': ['Жашыруу же өчүрүү', 'Hide or delete'],
  'Страница скрыта': ['Барак жашырылды', 'Page hidden'],
  'Скрытую страницу не найдут в каталоге. Записи и кабинет остаются.': [
    'Жашырылган баракты каталогдон табышпайт. Жазылуулар жана кабинет калат.',
    'A hidden page is not found in the catalog. Bookings and the cabinet stay.',
  ],
  'Удалить бизнес': ['Бизнести өчүрүү', 'Delete business'],
  'Будущие записи отменим и напишем клиентам, предоплату вернём. Страница пропадёт, адрес освободится, команда потеряет доступ. Прошлые визиты и чеки останутся в учёте.':
    [
      'Алдыдагы жазылууларды жокко чыгарып, кардарларга жазабыз, алдын ала төлөмдү кайтарабыз. Барак жоголот, дарек бошойт, команда кирүү укугун жоготот. Өткөн визиттер жана чектер эсепте калат.',
      'We will cancel upcoming bookings, message the clients and refund deposits. The page goes, its address is freed and the team loses access. Past visits and receipts stay in the books.',
    ],
  'Чтобы удалить, введите адрес страницы:': [
    'Өчүрүү үчүн барактын дарегин жазыңыз:',
    'To delete, type the page address:',
  ],
  'Бизнес удалён': ['Бизнес өчүрүлдү', 'Business deleted'],
  // «Мои бизнесы»: what waits in each business, a platform admin's own and all of them
  'без ответа': ['жоопсуз', 'unanswered'],
  'не прошёл': ['өткөн жок', 'failed'],
  'не прошли': ['өткөн жок', 'failed'],
  'Какие бизнесы': ['Кайсы бизнестер', 'Which businesses'],
  Мои: ['Меники', 'Mine'],
  'Поиск по бизнесам': ['Бизнестерден издөө', 'Search businesses'],
  'Запуск {done} из {total} · {step}': [
    'Ишке киргизүү: {total} ичинен {done} · {step}',
    'Setup {done} of {total} · {step}',
  ],
  'За неделю:': ['Аптада:', 'This week:'],
  'За неделю': ['Аптада', 'This week'],
  'больше, чем неделей раньше': ['мурунку аптадан көп', 'more than the week before'],
  'меньше, чем неделей раньше': ['мурунку аптадан аз', 'fewer than the week before'],
  'Поделитесь ссылкой, и придут первые клиенты': [
    'Шилтемени бөлүшүңүз, биринчи кардарлар келет',
    'Share the link and the first clients will come',
  ],
  'Скопировать ссылку на {name}': ['{name} шилтемесин көчүрүү', 'Copy the link to {name}'],
  'ближайший в {time}, {name}': ['жакынкысы {time}, {name}', 'next at {time}, {name}'],
  'День занят на {percent}%': ['Күн {percent}% бош эмес', 'The day is {percent}% booked'],
  'Не удалили': ['Өчүрүлгөн жок', 'Not deleted'],
  'Не сохранили': ['Сакталган жок', 'Not saved'],
}

const CABINET_COUNTED: Record<string, CountedEntry> = {
  клиентов: ['кардар', 'client', 'clients'],
  абонементов: ['абонемент', 'pass', 'passes'],
  чеков: ['чек', 'receipt', 'receipts'],
}

export { CABINET, CABINET_COUNTED }
