// The Russian text is the key: untranslated strings simply stay Russian. `{name}` is filled in.
// Kyrgyz covers the booking path first — the way from a service to «Вы записаны».
type Entry = [ky: string, en: string]

const DICTIONARY: Record<string, Entry> = {
  // Actions and the bar
  Записаться: ['Жазылуу', 'Book'],
  'Записываем…': ['Жазып жатабыз…', 'Booking…'],
  'Выбрать услугу': ['Кызматты тандоо', 'Choose a service'],
  'Выбрать мастера': ['Устаны тандоо', 'Choose a specialist'],
  'Выбрать время': ['Убакытты тандоо', 'Choose a time'],
  'Ввести контакты': ['Байланышты жазуу', 'Enter contacts'],
  'Выберите услугу': ['Кызматты тандаңыз', 'Choose a service'],
  'Выберите мастера': ['Устаны тандаңыз', 'Choose a specialist'],
  'Выберите время': ['Убакытты тандаңыз', 'Choose a time'],
  'Оставьте контакты': ['Байланышыңызды калтырыңыз', 'Leave your contacts'],
  'Шаг {step} из {total}': ['{step}/{total}-кадам', 'Step {step} of {total}'],
  '{when} · предоплата {amount}': [
    '{when} · алдын ала төлөм {amount}',
    '{when} · deposit {amount}',
  ],
  'Показать, что выбрано': ['Тандалганды көрсөтүү', 'Show what is chosen'],
  'Онлайн-запись': ['Онлайн жазылуу', 'Online booking'],
  'Ваша запись': ['Сиздин жазылууңуз', 'Your booking'],
  Готово: ['Даяр', 'Done'],
  Услуга: ['Кызмат', 'Service'],
  Мастер: ['Уста', 'Specialist'],
  Когда: ['Качан', 'When'],
  Длительность: ['Узактыгы', 'Duration'],
  'Скидка «{title}»': ['«{title}» арзандатуусу', 'Discount «{title}»'],
  Итого: ['Жалпы', 'Total'],
  Предоплата: ['Алдын ала төлөм', 'Deposit'],
  '{amount} картой при записи': ['{amount} жазылууда карта менен', '{amount} by card when booking'],
  'Предоплата {amount} — картой сразу после записи, остальное в салоне. Вернём при отмене за сутки.':
    [
      'Алдын ала төлөм {amount} — жазылгандан кийин дароо карта менен, калганы салондо. Бир сутка мурун жокко чыгарсаңыз, кайтарабыз.',
      'Deposit {amount} — by card right after booking, the rest at the salon. Refunded if you cancel a day ahead.',
    ],

  // Steps
  'Сегодня с {time}': ['Бүгүн {time} баштап', 'Today from {time}'],
  'Завтра с {time}': ['Эртең {time} баштап', 'Tomorrow from {time}'],
  'любой мастер': ['каалаган уста', 'any specialist'],
  'Любой мастер': ['Каалаган уста', 'Any specialist'],
  'Куда приедете': ['Кайсы филиалга барасыз', 'Where you will come'],
  Филиал: ['Филиал', 'Branch'],
  'Маршрут до «{name}» ›': ['«{name}» чейин маршрут ›', 'Directions to «{name}» ›'],
  'Как в прошлый раз': ['Өткөндөгүдөй', 'Same as last time'],
  'Ближайшее время': ['Жакынкы убакыт', 'Next free time'],
  'Сначала выберите услугу': ['Адегенде кызматты тандаңыз', 'Choose a service first'],
  'Сначала выберите мастера': ['Адегенде устаны тандаңыз', 'Choose a specialist first'],
  'Дата и время': ['Күнү жана убактысы', 'Date and time'],
  Контакты: ['Байланыш', 'Contacts'],
  Имя: ['Аты', 'Name'],
  Телефон: ['Телефон', 'Phone'],
  'Кого записываете': ['Кимди жаздырасыз', 'Who is coming'],
  'Как к вам обращаться': ['Сизге кантип кайрылалы', 'Your name'],
  'Записать себя': ['Өзүмдү жаздыруу', 'Book for myself'],
  'Записать другого человека': ['Башка адамды жаздыруу', 'Book for someone else'],
  Комментарий: ['Комментарий', 'Comment'],
  Убрать: ['Алып салуу', 'Remove'],
  'Например, «нужна парковка»': [
    'Мисалы, «унаа токтотуучу жай керек»',
    'For example, «need parking»',
  ],
  Добавить: ['Кошуу', 'Add'],
  Дополнительно: ['Кошумча', 'More'],
  Изменить: ['Өзгөртүү', 'Change'],
  Показать: ['Көрсөтүү', 'Show'],
  Свернуть: ['Жыйноо', 'Hide'],
  'Укажите имя': ['Атыңызды жазыңыз', 'Enter a name'],
  'Укажите номер, чтобы мы подтвердили запись': [
    'Жазылууну ырастоо үчүн номериңизди жазыңыз',
    'Enter a number so we can confirm the booking',
  ],

  // Masters
  Любой: ['Каалаган', 'Any'],
  'кто свободен': ['ким бош болсо', 'whoever is free'],
  'Любой мастер — подберём свободного на выбранное время': [
    'Каалаган уста — тандалган убакытка бош устаны табабыз',
    'Any specialist — we pick whoever is free at that time',
  ],

  // Date and time
  Сегодня: ['Бүгүн', 'Today'],
  Завтра: ['Эртең', 'Tomorrow'],
  День: ['Күн', 'Day'],
  '{day}, выходной': ['{day}, дем алыш', '{day}, closed'],
  Повторить: ['Кайталоо', 'Retry'],
  'На этот день свободного времени нет — выберите другой': [
    'Бул күнү бош убакыт жок — башка күндү тандаңыз',
    'No free time this day — choose another',
  ],
  'Выбрано {time}': ['Тандалды: {time}', 'Chosen {time}'],
  Время: ['Убакыт', 'Time'],

  // Notifications
  'За 1 час': ['1 саат мурун', '1 hour before'],
  'За 2 часа': ['2 саат мурун', '2 hours before'],
  'За день': ['Бир күн мурун', 'A day before'],
  'Не напоминать': ['Эскертпөө', 'No reminder'],
  'SMS-подтверждение': ['SMS ырастоо', 'SMS confirmation'],
  'Без SMS': ['SMSсиз', 'No SMS'],
  'без напоминания': ['эскертүүсүз', 'no reminder'],
  'напомним {when}': ['эскертебиз: {when}', 'reminder {when}'],
  'SMS с подтверждением': ['Ырастоочу SMS', 'Confirmation SMS'],
  'на {phone}': ['{phone} номерине', 'to {phone}'],
  'Напомнить о визите': ['Визит жөнүндө эскертүү', 'Remind me'],
  'Когда напомнить': ['Качан эскертүү', 'When to remind'],

  // Promo code
  Промокод: ['Промокод', 'Promo code'],
  Ввести: ['Киргизүү', 'Enter'],
  Применить: ['Колдонуу', 'Apply'],
  'проверим со временем': ['убакыт менен текшеребиз', 'checked with the time'],
  'не на это время': ['бул убакытка эмес', 'not for this time'],

  // Check step
  'Проверьте запись': ['Жазылууну текшериңиз', 'Check your booking'],
  'Любой свободный': ['Каалаган бош уста', 'Anyone free'],
  подберём: ['тандап беребиз', 'we will pick'],
  'На кого': ['Кимге', 'For'],
  'К оплате': ['Төлөөгө', 'To pay'],
  сегодня: ['бүгүн', 'today'],
  завтра: ['эртең', 'tomorrow'],
  послезавтра: ['бүрсүгүнү', 'the day after tomorrow'],
  'через {days} дней': ['{days} күндөн кийин', 'in {days} days'],
  'Оплата в салоне — наличными или картой. Перенести или отменить можно по ссылке из SMS.': [
    'Төлөм салондо — накталай же карта менен. SMSтеги шилтеме аркылуу которуп же жокко чыгарсаңыз болот.',
    'Pay at the salon — cash or card. Move or cancel by the link in the SMS.',
  ],

  // Done
  'Событие для календаря готово': ['Календарь үчүн окуя даяр', 'Calendar event is ready'],
  'Откройте файл, чтобы добавить': ['Кошуу үчүн файлды ачыңыз', 'Open the file to add it'],
  'Вы записаны': ['Сиз жазылдыңыз', 'You are booked'],
  '{day} в {time} · {place}': ['{day}, {time} · {place}', '{day} at {time} · {place}'],
  'Приходите к {time}': ['{time} келиңиз', 'Come at {time}'],
  ' по адресу {address}': [', дареги: {address}', ' to {address}'],
  'Остаток оплатите в салоне.': ['Калганын салондо төлөйсүз.', 'Pay the rest at the salon.'],
  'Оплата в салоне.': ['Төлөм салондо.', 'Pay at the salon.'],
  'Перенести или отменить можно по ссылке из SMS.': [
    'SMSтеги шилтеме аркылуу которуп же жокко чыгарсаңыз болот.',
    'Move or cancel by the link in the SMS.',
  ],
  'Показать талон': ['Талонду көрсөтүү', 'Show the ticket'],
  'В календарь': ['Календарга', 'To calendar'],
  Маршрут: ['Маршрут', 'Directions'],
  Талон: ['Талон', 'Ticket'],
  'Мои записи': ['Менин жазылууларым', 'My bookings'],
  'Запись сохранена на этом телефоне.': [
    'Жазылуу ушул телефондо сакталды.',
    'The booking is saved on this phone.',
  ],
  'Войдите по номеру': ['Номериңиз менен кириңиз', 'Sign in with your number'],
  ', чтобы видеть записи на любом устройстве.': [
    ', жазылууларды каалаган түзмөктөн көрүү үчүн.',
    ' to see bookings on any device.',
  ],
  'Напомним в Telegram': ['Telegram аркылуу эскертебиз', 'We will remind you in Telegram'],
  'Напоминать в Telegram вместо SMS ›': [
    'SMSтин ордуна Telegram аркылуу эскертүү ›',
    'Remind me in Telegram instead of SMS ›',
  ],
  'Вам может понравиться': ['Сизге жагышы мүмкүн', 'You may like'],
  'Все места и услуги ›': ['Бардык жайлар жана кызматтар ›', 'All places and services ›'],

  // Reviews and chrome
  Отзывы: ['Пикирлер', 'Reviews'],
  'Все ›': ['Баары ›', 'All ›'],
  'Не получилось открыть запись': ['Жазылууну ачуу мүмкүн болбоду', 'Could not open booking'],
  'Проверьте соединение и попробуйте ещё раз.': [
    'Байланышты текшерип, кайра аракет кылыңыз.',
    'Check the connection and try again.',
  ],
  Закрыть: ['Жабуу', 'Close'],
  'Закрыть запись': ['Жазылууну жабуу', 'Close booking'],
  Запись: ['Жазылуу', 'Booking'],
}

// Counted words: Kyrgyz does not change the noun after a number; English has one/other.
const COUNTED: Record<string, [ky: string, enOne: string, enOther: string]> = {
  свободных: ['бош', 'free', 'free'],
  отзывов: ['пикир', 'review', 'reviews'],
}

export { COUNTED, DICTIONARY }
