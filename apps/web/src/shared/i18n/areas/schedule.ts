import type { CountedEntry, Entry } from './types'

// The cabinet's schedule (the day calendar, visits, new bookings, time off) and the master's «Мой день».
const SCHEDULE: Record<string, Entry> = {
  // Schedule actions
  'Клиенту уйдёт SMS через 15 секунд': [
    'Кардарга 15 секунддан кийин SMS кетет',
    'The client gets an SMS in 15 seconds',
  ],
  '{name} записан(а) на {time}, клиенту ушло SMS': [
    '{name} {time} убактысына жазылды, кардарга SMS кетти',
    '{name} is booked for {time}, the client got an SMS',
  ],
  'Перенесено на {time}': ['{time} убактысына жылдырылды', 'Moved to {time}'],
  '{name} · {master}. Клиенту уйдёт SMS через 15 секунд': [
    '{name} · {master}. Кардарга 15 секунддан кийин SMS кетет',
    '{name} · {master}. The client gets an SMS in 15 seconds',
  ],
  'Запись на прежнем месте': ['Жазылуу мурунку ордунда', 'The booking is back in place'],
  'Время закрыто': ['Убакыт жабылды', 'Time blocked'],
  'Время закрыто. В нём {count} — отмените или перенесите': [
    'Убакыт жабылды. Анда {count} бар: жокко чыгарыңыз же жылдырыңыз',
    'Time blocked. It has {count}: cancel or move them',
  ],
  'Время снова открыто': ['Убакыт кайра ачылды', 'Time open again'],

  // Schedule toolbar
  Лента: ['Тасма', 'Timeline'],
  'Записей нет': ['Жазылуулар жок', 'No bookings'],
  '{name} больше не ждёт': ['{name} мындан ары күтпөйт', '{name} is no longer waiting'],
  'Отмечено: {count}': ['Белгиленди: {count}', 'Marked: {count}'],
  'Все пришли, оплата по прайсу наличными — поправьте, где было иначе': [
    'Баары келди, прайс боюнча накталай төлөндү: башкача болгон жерин оңдоңуз',
    'Everyone arrived, paid the list price in cash: fix any that differ',
  ],
  'Записать в прошедший день нельзя': [
    'Өткөн күнгө жазууга болбойт',
    'You cannot book on a past day',
  ],
  'Ждут окна: {count}': ['Бош убакыт күтүшөт: {count}', 'Waiting for a slot: {count}'],
  'Вид расписания': ['Жадыбалдын көрүнүшү', 'Schedule view'],
  'Инструменты дня': ['Күндүн куралдары', 'Day tools'],
  'Обычный вид': ['Кадимки көрүнүш', 'Normal view'],
  'На всю ширину': ['Толук туурасына', 'Full width'],
  Перерыв: ['Тыныгуу', 'Break'],
  'Поделиться свободными окнами': ['Бош убакыттар менен бөлүшүү', 'Share free slots'],
  'Найти место под услугу': ['Кызматка орун табуу', 'Find room for a service'],
  'Места для «{service}»': ['«{service}» үчүн орундар', 'Room for «{service}»'],
  'Откройте раздел «Мастера» и добавьте хотя бы себя — здесь появится расписание.': [
    '«Усталар» бөлүмүн ачып, жок дегенде өзүңүздү кошуңуз: бул жерде жадыбал пайда болот.',
    'Open «Specialists» and add at least yourself: the schedule will appear here.',
  ],
  'Запись: {name}, {time}': ['Жазылуу: {name}, {time}', 'Booking: {name}, {time}'],

  // Visit outcome and inspector
  'Итог визита': ['Визиттин жыйынтыгы', 'Visit outcome'],
  'Оплачено абонементом': ['Абонемент менен төлөндү', 'Paid with a membership'],
  'Оплачено сертификатом': ['Сертификат менен төлөндү', 'Paid with a certificate'],
  'Оплачено, сом': ['Төлөндү, сом', 'Paid, som'],
  'Возврат №{number}': ['Кайтаруу №{number}', 'Refund №{number}'],
  'Код сертификата': ['Сертификаттын коду', 'Certificate code'],
  'Ввести код': ['Кодду жазуу', 'Enter code'],
  'Лояльность клиента': ['Кардардын лоялдуулугу', 'Client loyalty'],
  'осталось {count}': ['{count} калды', '{count} left'],
  'Списать визит': ['Визитти эсептен чыгаруу', 'Use a visit'],
  'Бонусы · {amount}': ['Бонустар · {amount}', 'Bonuses · {amount}'],
  Списать: ['Эсептен чыгаруу', 'Use'],
  'Клиенту начислится {percent}% бонусами от оплаты деньгами.': [
    'Кардарга акча менен төлөгөн сумманын {percent}% бонус болуп түшөт.',
    'The client earns {percent}% of the money paid in bonuses.',
  ],
  'Неявка видна в карточке клиента и в аналитике.': [
    'Келбей калганы кардардын карточкасында жана аналитикада көрүнөт.',
    'The no-show shows on the client card and in analytics.',
  ],
  'карточка клиента': ['кардардын карточкасы', 'client card'],
  'Карточка клиента': ['Кардардын карточкасы', 'Client card'],
  'по абонементу': ['абонемент менен', 'with a membership'],
  'предоплата {amount}, {status}': [
    'алдын ала төлөм {amount}, {status}',
    'deposit {amount}, {status}',
  ],
  'Связаться с клиентом': ['Кардар менен байланышуу', 'Contact the client'],
  'Ещё действия': ['Дагы аракеттер', 'More actions'],
  'Скопировать {phone}': ['{phone} көчүрүү', 'Copy {phone}'],

  // New booking
  'Ищем свободное время…': ['Бош убакыт издеп жатабыз…', 'Looking for free time…'],
  'У мастера нет свободного времени в этот день.': [
    'Устанын бул күнү бош убактысы жок.',
    'The specialist has no free time this day.',
  ],
  '{service}: {duration}, {price}. Клиенту придёт SMS с подтверждением.': [
    '{service}: {duration}, {price}. Кардарга ырастоо SMS келет.',
    '{service}: {duration}, {price}. The client gets a confirmation SMS.',
  ],
  'Были у вас': ['Сизде болушкан', 'Were here before'],
  'не пришёл {count}': ['{count} келген жок', 'no-show {count}'],
  'Нет услуг': ['Кызматтар жок', 'No services'],
  'Как зовут': ['Аты ким', 'Name'],
  'Комментарий, если нужен': ['Керек болсо, комментарий', 'Comment, if needed'],

  // Time off and waitlist
  'Закрыть время': ['Убакытты жабуу', 'Block time'],
  'Перерыв, обучение или выходной — клиенты не смогут записаться на это время.': [
    'Тыныгуу, окуу же дем алыш: кардарлар бул убакытка жазыла алышпайт.',
    'A break, training or a day off: clients cannot book this time.',
  ],
  'Конец должен быть позже начала.': [
    'Аягы башталышынан кеч болушу керек.',
    'The end must be after the start.',
  ],
  'Причина — необязательно': ['Себеби (милдеттүү эмес)', 'Reason (optional)'],
  'Ждут окна': ['Бош убакыт күтүшөт', 'Waiting for a slot'],
  '{day}. Освободится время — клиенты получат SMS сами; можно и записать их сразу.': [
    '{day}. Убакыт бошосо, кардарлар өздөрү SMS алышат; аларды азыр эле жазып койсо да болот.',
    '{day}. When time frees up, clients get an SMS on their own; you can also book them now.',
  ],
  'SMS отправлено: свободно {time}': ['SMS жөнөтүлдү: {time} бош', 'SMS sent: {time} is free'],
  'Ждёт с {date}': ['{date} бери күтүүдө', 'Waiting since {date}'],
  'Записать (клиента)': ['Жазуу', 'Book'],
  'Убрать {name} из листа ожидания': [
    '{name} күтүү тизмесинен алып салуу',
    'Remove {name} from the waiting list',
  ],

  // Now and unmarked visits
  'через {time}': ['{time} кийин', 'in {time}'],
  'Уведомления на iPhone': ['iPhone’до билдирмелер', 'Notifications on iPhone'],
  'Не получилось включить уведомления': [
    'Билдирмелерди күйгүзүү болбой калды',
    'Could not turn on notifications',
  ],
  'ещё {count} мин': ['дагы {count} мүн', '{count} min left'],
  'Позвонить: {name}': ['Чалуу: {name}', 'Call {name}'],
  'Уведомлять о новых записях': ['Жаңы жазылуулар тууралуу билдирүү', 'Notify me of new bookings'],
  'прошёл без отметки': ['белгисиз өттү', 'passed unmarked'],
  'прошли без отметки': ['белгисиз өттү', 'passed unmarked'],
  'Неотмеченные визиты': ['Белгиленбеген визиттер', 'Unmarked visits'],
  '{visits} {passed} — показать кто': [
    '{visits} {passed}: кимдер экенин көрсөтүү',
    '{visits} {passed}: show who',
  ],
  'без отметки': ['белгисиз', 'unmarked'],
  'Все пришли': ['Баары келди', 'Everyone came'],
  'в другие дни': ['башка күндөрдө', 'on other days'],

  // Sharing free slots
  'сегодня, {date}': ['бүгүн, {date}', 'today, {date}'],
  'Свободное время на «{service}» · {day}': [
    '«{service}» үчүн бош убакыт · {day}',
    'Free time for «{service}» · {day}',
  ],
  'Свободное время · {day}': ['Бош убакыт · {day}', 'Free time · {day}'],
  'Запись онлайн: {link}': ['Онлайн жазылуу: {link}', 'Book online: {link}'],
  'Скопировано — вставьте в чат или сторис': [
    'Көчүрүлдү: чатка же сторис’ке кыстарыңыз',
    'Copied: paste it into a chat or a story',
  ],
  'Свободные окна': ['Бош убакыттар', 'Free slots'],
  'Сообщение для клиентов': ['Кардарлар үчүн билдирүү', 'Message for clients'],
  Ссылка: ['Шилтеме', 'Link'],
  'На этот день окна под эту услугу нет.': [
    'Бул күнү бул кызмат үчүн бош убакыт жок.',
    'No slot for this service on this day.',
  ],
  'На этот день свободного времени нет.': ['Бул күнү бош убакыт жок.', 'No free time on this day.'],
  'Клиент увидит этот текст и ссылку на запись.': [
    'Кардар ушул текстти жана жазылуу шилтемесин көрөт.',
    'The client sees this text and the booking link.',
  ],
  'Отправить в мессенджер': ['Мессенджерге жөнөтүү', 'Send to a messenger'],

  // Day strip
  'есть незакрытые визиты': ['жабылбаган визиттер бар', 'has unclosed visits'],
  'занято на {percent}%': ['{percent}% бош эмес', '{percent}% booked'],

  // Мой день
  'Этот номер не привязан к мастеру. Попросите владельца указать его в карточке мастера.': [
    'Бул номер устага байланган эмес. Ээсинен аны устанын карточкасында көрсөтүүнү сураныңыз.',
    'This number is not linked to a specialist. Ask the owner to add it to the specialist card.',
  ],
  'В профиль': ['Профилге', 'To profile'],
  'Вы работаете {from}–{to}': ['Сиз {from}–{to} иштейсиз', 'You work {from}–{to}'],
  'Мой день.': ['Менин күнүм.', 'My day.'],
  'за день': ['күнү', 'for the day'],
  заработали: ['таптыңыз', 'earned'],
  'ваши {percent}%': ['сиздин {percent}%', 'your {percent}%'],
  'За {month} заработано': ['{month} айында табылганы', 'Earned in {month}'],
  январь: ['январь', 'January'],
  февраль: ['февраль', 'February'],
  март: ['март', 'March'],
  апрель: ['апрель', 'April'],
  май: ['май', 'May'],
  июнь: ['июнь', 'June'],
  июль: ['июль', 'July'],
  август: ['август', 'August'],
  сентябрь: ['сентябрь', 'September'],
  октябрь: ['октябрь', 'October'],
  ноябрь: ['ноябрь', 'November'],
  декабрь: ['декабрь', 'December'],
  '{name}, {service} до {time}': [
    '{name}, {service}, {time} чейин',
    '{name}, {service} until {time}',
  ],
  Следующий: ['Кийинки', 'Next'],
  '{name} в {time}, {wait}': ['{name} саат {time}, {wait}', '{name} at {time}, {wait}'],
  'Записей пока нет': ['Азырынча жазылуулар жок', 'No bookings yet'],
  'Новые записи появятся здесь сами.': [
    'Жаңы жазылуулар бул жерде өзү пайда болот.',
    'New bookings will appear here.',
  ],
  'В этот день записи к вам не открыты.': [
    'Бул күнү сизге жазылуу ачык эмес.',
    'Bookings with you are not open this day.',
  ],
  'Итог визита {time}': ['Визиттин жыйынтыгы {time}', 'Visit outcome {time}'],
  'Ваши отзывы': ['Сиздин пикирлер', 'Your reviews'],
  'Фото в «Образах»': ['Сүрөт «Образдарда»', 'Photo is in «Looks»'],
  'Ещё фото работы': ['Дагы иштин сүрөтү', 'Another work photo'],
  'Где вы работаете мастером.': [
    'Сиз уста болуп иштеген жерлер.',
    'Where you work as a specialist.',
  ],
  'Этот номер не привязан к мастеру': [
    'Бул номер устага байланган эмес',
    'This number is not linked to a specialist',
  ],
  'Попросите владельца указать его в карточке мастера: Кабинет → Мастера.': [
    'Ээсинен аны устанын карточкасында көрсөтүүнү сураныңыз: Кабинет → Усталар.',
    'Ask the owner to add it to the specialist card: Dashboard → Specialists.',
  ],

  // Day calendar
  'Не отмечен': ['Белгиленген жок', 'Unmarked'],
  'Ждёт оплату': ['Төлөм күтүүдө', 'Awaiting payment'],
  Отпуск: ['Өргүү', 'On leave'],
  'Открыть запись': ['Жазылууну ачуу', 'Open booking'],
  'с клиентом до {time}': ['{time} чейин кардар менен', 'with a client until {time}'],
  'занят до конца дня': ['күндүн аягына чейин бош эмес', 'busy for the rest of the day'],
  'свободен сейчас': ['азыр бош', 'free now'],
  'свободен с {time}': ['{time} баштап бош', 'free from {time}'],
  '{count} раньше': ['мурунураак {count}', '{count} earlier'],
  '{count} позже': ['кийинирээк {count}', '{count} later'],
  '{count} выше': ['жогоруда {count}', '{count} above'],
  '{count} ниже': ['төмөндө {count}', '{count} below'],
  'свободен весь день': ['күнү бою бош', 'free all day'],
  'занят на {percent}%': ['{percent}% бош эмес', '{percent}% booked'],
  'до конца дня': ['күндүн аягына чейин', 'for the rest of the day'],
  'Уменьшить масштаб': ['Кичирейтүү', 'Zoom out'],
  'Увеличить масштаб': ['Чоңойтуу', 'Zoom in'],
  'Новая запись к мастеру {name}': ['{name} устага жаңы жазылуу', 'New booking with {name}'],
  'записать к мастеру {name}': ['{name} устага жазуу', 'book with {name}'],
  'без записей': ['жазылуулар жок', 'no bookings'],
  свободен: ['бош', 'free'],
  'весь день': ['күнү бою', 'all day'],
  'Открыть время {from}–{to}': ['{from}–{to} убактысын ачуу', 'Open {from}–{to} again'],
  'Пришёл ли {name}?': ['{name} келдиби?', 'Did {name} come?'],
  пришёл: ['келди', 'arrived'],
  'не пришёл': ['келген жок', 'no-show'],
}

const SCHEDULE_COUNTED: Record<string, CountedEntry> = {
  раз: ['жолу', 'time', 'times'],
  минут: ['мүнөт', 'minute', 'minutes'],
  часов: ['саат', 'hour', 'hours'],
}

export { SCHEDULE, SCHEDULE_COUNTED }
