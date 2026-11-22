import type { CountedEntry, Entry } from './types'

// The cabinet's «Аналитика» and «Тариф».
const ANALYTICS: Record<string, Entry> = {
  // Head and period
  '{from} – {to} · по прошедшим визитам': [
    '{from} - {to} · өткөн визиттер боюнча',
    '{from} to {to} · past visits',
  ],
  'Выручка, клиенты и загрузка': [
    'Түшкөн акча, кардарлар жана жүктөм',
    'Revenue, clients and load',
  ],
  Период: ['Мезгил', 'Period'],
  Отчёт: ['Отчёт', 'Report'],
  'Скачать CSV': ['CSV жүктөп алуу', 'Download CSV'],
  'Визитов пока нет': ['Азырынча визиттер жок', 'No visits yet'],
  'Поделитесь ссылкой на страницу, и здесь появятся выручка, клиенты и загрузка мастеров.': [
    'Баракчанын шилтемесин бөлүшүңүз, ошондо бул жерде түшкөн акча, кардарлар жана усталардын жүктөмү көрүнөт.',
    'Share your page link, and revenue, clients and specialists’ load will show here.',
  ],
  'Акция создана': ['Акция түзүлдү', 'Promotion created'],
  'Ещё {count}': ['Дагы {count}', '{count} more'],

  // Revenue
  'нет данных для сравнения': ['салыштырууга маалымат жок', 'nothing to compare with'],
  'к прошлой неделе': ['өткөн аптага карата', 'vs last week'],
  'к прошлому месяцу': ['өткөн айга карата', 'vs last month'],
  'к прошлому кварталу': ['өткөн чейрекке карата', 'vs last quarter'],
  'к прошлому году': ['өткөн жылга карата', 'vs last year'],
  'Как на прошлой неделе': ['Өткөн аптадагыдай', 'Same as last week'],
  'Как в прошлом месяце': ['Өткөн айдагыдай', 'Same as last month'],
  'Как в прошлом квартале': ['Өткөн чейректегидей', 'Same as last quarter'],
  'Как в прошлом году': ['Өткөн жылдагыдай', 'Same as last year'],
  Впереди: ['Алдыда', 'Ahead'],
  '{visits} записано': ['{visits} жазылган', '{visits} booked'],
  'Без материалов': ['Материалдарсыз', 'Less materials'],
  'расходники {amount}': ['керектелүүчү материалдар {amount}', 'consumables {amount}'],
  'Как платили': ['Кантип төлөштү', 'How they paid'],
  Наличными: ['Накталай', 'Cash'],
  Картой: ['Карта менен', 'Card'],
  Переводом: ['Которуу менен', 'Transfer'],
  'Не отмечено': ['Белгиленген жок', 'Not marked'],
  'Неделя с {day}': ['{day} баштап апта', 'Week from {day}'],
  'визитов {change}': ['визиттер {change}', 'visits {change}'],
  'средний чек {change}': ['орточо чек {change}', 'average bill {change}'],
  'сильнее всех {name} {change}': ['баарынан көп {name} {change}', 'most of all {name} {change}'],

  // Chart
  'Выручка по периодам': ['Мезгилдер боюнча түшкөн акча', 'Revenue by period'],
  'Этот период': ['Ушул мезгил', 'This period'],
  Прошлый: ['Өткөн', 'Previous'],
  'Выручка по периодам и тот же отрезок в прошлом периоде': [
    'Мезгилдер боюнча түшкөн акча жана өткөн мезгилдин ошол эле бөлүгү',
    'Revenue by period and the same stretch of the previous period',
  ],
  'Прошлый период': ['Өткөн мезгил', 'Previous period'],

  // Goal
  'Задать цель на {month}': ['{month} үчүн максат коюу', 'Set a goal for {month}'],
  'Цель на {month}: {share} · {revenue} из {goal}': [
    '{month} үчүн максат: {share} · {goal} ичинен {revenue}',
    'Goal for {month}: {share} · {revenue} of {goal}',
  ],
  'цель достигнута': ['максатка жетти', 'goal reached'],
  'в этом темпе {amount}': ['ушул темп менен {amount}', 'at this pace {amount}'],
  'в этом темпе {amount}, не хватит {missing}': [
    'ушул темп менен {amount}, {missing} жетпейт',
    'at this pace {amount}, {missing} short',
  ],
  'Цель на месяц': ['Айлык максат', 'Monthly goal'],
  Цель: ['Максат', 'Goal'],
  'Выручка за {month}': ['{month} үчүн түшкөн акча', 'Revenue for {month}'],
  'Цель по выручке, сом': ['Түшкөн акча боюнча максат, сом', 'Revenue goal, som'],
  'Аналитика покажет, сколько уже есть и хватит ли текущего темпа до конца месяца.': [
    'Аналитика канча бар экенин жана азыркы темп ай аягына чейин жетеби, көрсөтөт.',
    'Analytics will show how much you have and whether the current pace will get you there by the end of the month.',
  ],
  'Убрать цель': ['Максатты алып салуу', 'Remove goal'],

  // Visits and clients
  'Визиты и клиенты': ['Визиттер жана кардарлар', 'Visits and clients'],
  'Средний чек': ['Орточо чек', 'Average bill'],
  'возвращаются {rate} за 6 недель': [
    '6 жуманын ичинде {rate} кайтып келет',
    '{rate} return within 6 weeks',
  ],
  Отмены: ['Жокко чыгаруулар', 'Cancellations'],
  'и неявки {rate}% · {count}': [
    'жана келбегендер {rate}% · {count}',
    'and no-shows {rate}% · {count}',
  ],
  'от всех записей': ['бардык жазылуулардан', 'of all bookings'],
  'Услуги за период': ['Мезгилдеги кызматтар', 'Services for the period'],
  'Здесь появятся услуги, которые приносят больше всего.': [
    'Бул жерде эң көп киреше алып келген кызматтар көрүнөт.',
    'The services that bring in the most will show here.',
  ],
  'материалы {amount}': ['материалдар {amount}', 'materials {amount}'],
  'Клиенты за период': ['Мезгилдеги кардарлар', 'Clients for the period'],
  'Здесь появятся клиенты, которые пришли за период.': [
    'Бул жерде мезгил ичинде келген кардарлар көрүнөт.',
    'Clients who came during the period will show here.',
  ],
  Новый: ['Жаңы', 'New'],
  '{visits} · был {day}': ['{visits} · акыркы жолу {day}', '{visits} · last {day}'],
  'Загрузка по часам': ['Сааттар боюнча жүктөм', 'Load by hour'],

  // Masters
  'Мастера за период': ['Мезгилдеги усталар', 'Specialists for the period'],
  загрузки: ['жүктөм', 'load'],
  'Итого к выплате {due}.': ['Бардыгы төлөнүүчү: {due}.', 'Total due {due}.'],
  'Итого к выплате {due}, выплачено {paid}.': [
    'Бардыгы төлөнүүчү: {due}, төлөндү {paid}.',
    'Total due {due}, paid out {paid}.',
  ],
  'У части мастеров зарплата не задана.': [
    'Айрым усталардын айлыгы коюлган эмес.',
    'Some specialists have no pay set.',
  ],
  'Задайте зарплату в карточке мастера на «Странице», и здесь появится, сколько кому выплатить.': [
    '«Баракчадагы» устанын карточкасында айлыкты коюңуз, ошондо бул жерде кимге канча төлөш керектиги көрүнөт.',
    'Set pay on the specialist’s card in «Page», and what each is owed will show here.',
  ],
  'Загрузка: доля рабочих часов, занятых визитами.': [
    'Жүктөм: визиттер ээлеген иш сааттарынын үлүшү.',
    'Load: the share of working hours taken by visits.',
  ],
  'выплачено {amount}': ['төлөндү {amount}', 'paid out {amount}'],
  'к выплате {amount}': ['төлөнүүчү {amount}', 'due {amount}'],

  // Master's sheet
  'Выплата отменена': ['Төлөм жокко чыгарылды', 'Payout cancelled'],
  'Выплата отмечена': ['Төлөм белгиленди', 'Payout marked'],
  'загрузка {load}': ['жүктөм {load}', 'load {load}'],
  Показатели: ['Көрсөткүчтөр', 'Figures'],
  'Возвращаются к мастеру': ['Устага кайтып келишет', 'Come back to them'],
  'мало данных': ['маалымат аз', 'too little data'],
  'Отзывы за период': ['Мезгилдеги пикирлер', 'Reviews for the period'],
  'Возвращаются: клиенты, которые снова записались к этому мастеру в течение 6 недель.': [
    'Кайтып келишет: 6 жуманын ичинде бул устага кайра жазылган кардарлар.',
    'Come back: clients who booked this specialist again within 6 weeks.',
  ],
  'Зарплата за период': ['Мезгилдеги айлык', 'Pay for the period'],
  'продал на {amount}': ['{amount} сатты', 'sold {amount}'],
  'без процента': ['пайызсыз', 'no percent'],
  Оклад: ['Оклад', 'Salary'],
  'в месяц, по дням': ['айына, күндөр боюнча', 'per month, by day'],
  'Минимум за период': ['Мезгилдеги минимум', 'Minimum for the period'],
  Начислено: ['Эсептелди', 'Earned'],
  Выплачено: ['Төлөндү', 'Paid out'],
  'К выплате': ['Төлөнүүчү', 'Due'],
  'Заработано {amount}, меньше минимума: выплачивается минимум.': [
    '{amount} иштелип табылды, минимумдан аз: минимум төлөнөт.',
    'Earned {amount}, under the minimum: the minimum is paid.',
  ],
  Выплаты: ['Төлөмдөр', 'Payouts'],
  'Отменить выплату {amount}': ['{amount} төлөмүн жокко чыгаруу', 'Cancel payout of {amount}'],
  Выплата: ['Төлөм', 'Payout'],
  'Сумма выплаты': ['Төлөмдүн суммасы', 'Payout amount'],
  'Дата выплаты': ['Төлөм күнү', 'Payout date'],
  'Комментарий к выплате': ['Төлөмгө комментарий', 'Payout comment'],
  'Комментарий, например «аванс»': ['Комментарий, мисалы «аванс»', 'Comment, e.g. «advance»'],
  'За период с {from} по {to}': ['{from} баштап {to} чейинки мезгил үчүн', 'For {from} to {to}'],
  'Выплатить {amount}': ['{amount} төлөө', 'Pay {amount}'],
  'Отметить выплату {amount}': ['{amount} төлөмүн белгилөө', 'Mark payout of {amount}'],

  // Heatmap
  'Визитов пока нет, карта заполнится по мере записей': [
    'Азырынча визиттер жок, жазылуулар келген сайын карта толот',
    'No visits yet, the map fills in as bookings come',
  ],
  'пик {day} {hour}:00, {visits}': [
    'чокусу {day} {hour}:00, {visits}',
    'peak {day} {hour}:00, {visits}',
  ],
  'Пик: {day}, {hours} · {visits}': [
    'Чокусу: {day}, {hours} · {visits}',
    'Peak: {day}, {hours} · {visits}',
  ],
  'наведите на час': ['саатка багыттаңыз', 'point at an hour'],
  'Скидка на {day} {hours}, чтобы заполнить час': [
    'Саатты толтуруу үчүн {day} {hours} арзандатуу',
    'Discount on {day} {hours} to fill the hour',
  ],
  'Визиты по дням недели и часам': [
    'Апта күндөрү жана сааттар боюнча визиттер',
    'Visits by weekday and hour',
  ],
  Меньше: ['Азыраак', 'Fewer'],
  Больше: ['Көбүрөөк', 'More'],

  // Needs attention
  'Требует внимания': ['Көңүл буруу керек', 'Needs attention'],
  '{visits} без отметки': ['{visits} белгисиз', '{visits} unmarked'],
  'с {day}': ['{day} баштап', 'since {day}'],
  Отметить: ['Белгилөө', 'Mark'],
  '{clients} давно не были': [
    '{clients} көптөн бери келишкен жок',
    '{clients} not seen for a while',
  ],
  'больше {days} дней': ['{days} күндөн ашык', 'over {days} days'],
  Позвать: ['Чакыруу', 'Invite back'],
  'Завтра свободно ≈ {hours}': ['Эртең бош ≈ {hours}', 'Free tomorrow ≈ {hours}'],
  'поделитесь окнами': ['бош убакыттар менен бөлүшүңүз', 'share your free times'],
  'Открыть день': ['Күндү ачуу', 'Open the day'],
  'Заканчивается: {names}': ['Түгөнүп баратат: {names}', 'Running low: {names}'],
  'Заканчивается: {names} и ещё {count}': [
    'Түгөнүп баратат: {names} жана дагы {count}',
    'Running low: {names} and {count} more',
  ],

  // Losses, sources, promotions
  Потери: ['Жоготуулар', 'Losses'],
  Неявки: ['Келбегендер', 'No-shows'],
  'Поздние отмены': ['Кеч жокко чыгаруулар', 'Late cancellations'],
  '{visits} отменили меньше чем за сутки': [
    '{visits} бир суткага жетпей жокко чыгарылды',
    '{visits} cancelled less than a day ahead',
  ],
  'не пришёл {times} за полгода': [
    'жарым жылда {times} келген жок',
    'no-show {times} in six months',
  ],
  'Предоплата при записи онлайн защищает от неявок: {link}.': [
    'Онлайн жазылууда алдын ала төлөм келбей калуудан коргойт: {link}.',
    'A deposit on online bookings protects against no-shows: {link}.',
  ],
  'включите её в услугах': ['аны кызматтарда күйгүзүңүз', 'turn it on in services'],
  'Откуда записи': ['Жазылуулар каяктан', 'Where bookings come from'],
  Онлайн: ['Онлайн', 'Online'],
  Импорт: ['Импорт', 'Import'],
  'Акции и лояльность': ['Акциялар жана лоялдуулук', 'Promotions and loyalty'],
  'скидки {amount}': ['арзандатуулар {amount}', 'discounts {amount}'],
  'бонусами оплачено {amount}': ['бонустар менен төлөндү {amount}', 'paid with bonuses {amount}'],
  'сертификатами {amount}': ['сертификаттар менен {amount}', 'with certificates {amount}'],
  'по абонементам {visits}': ['абонементтер менен {visits}', 'on passes {visits}'],
  'продано абонементов: {count} на {amount}': [
    'сатылган абонементтер: {count}, {amount}',
    'passes sold: {count} for {amount}',
  ],
  'Лояльность: {parts}.': ['Лоялдуулук: {parts}.', 'Loyalty: {parts}.'],

  // Profit
  Прибыль: ['Пайда', 'Profit'],
  'продано {count} шт.': ['{count} даана сатылды', '{count} pcs sold'],
  'продано {count}': ['{count} сатылды', '{count} sold'],
  Абонементы: ['Абонементтер', 'Passes'],
  'Материалы на визиты': ['Визиттерге материалдар', 'Materials for visits'],
  'Себестоимость товаров': ['Товарлардын өздүк наркы', 'Cost of products'],
  'расходы {amount}': ['чыгымдар {amount}', 'expenses {amount}'],
  'Из чего прибыль': ['Пайда эмнеден турат', 'What makes the profit'],

  // Plan
  бессрочно: ['мөөнөтсүз', 'for good'],
  'оплачен до {day}': ['{day} чейин төлөнгөн', 'paid until {day}'],
  'пробный период до {day}': ['{day} чейин сыноо мезгили', 'trial until {day}'],
  бесплатно: ['акысыз', 'free'],
  '«{plan}» закончился {day}': ['«{plan}» {day} бүттү', '«{plan}» ended {day}'],
  'закончился {day}': ['{day} бүттү', 'ended {day}'],
  '{used} из {limit}': ['{limit} ичинен {used}', '{used} of {limit}'],
  'мастера без ограничений': ['усталар чектөөсүз', 'unlimited specialists'],
  'до {masters}': ['{masters} чейин', 'up to {masters}'],
  'филиалы без ограничений': ['филиалдар чектөөсүз', 'unlimited branches'],
  'SMS без ограничений': ['SMS чектөөсүз', 'unlimited SMS'],
  '{count} SMS на мастера': ['ар бир устага {count} SMS', '{count} SMS per specialist'],
  '{count} SMS в месяц': ['айына {count} SMS', '{count} SMS a month'],
  Бесплатно: ['Акысыз', 'Free'],
  '{price} в месяц': ['айына {price}', '{price} a month'],
  'Тариф продлён': ['Тариф узартылды', 'Plan extended'],
  'SMS в этом месяце': ['Ушул айдагы SMS', 'SMS this month'],
  'Ещё {count} SMS из пакетов': ['Пакеттерден дагы {count} SMS', '{count} more SMS from packs'],
  'Записи, расписание и страница работают. Касса, аналитика, лояльность и рассылки откроются после оплаты.':
    [
      'Жазылуулар, жадыбал жана баракча иштейт. Касса, аналитика, лоялдуулук жана жөнөтүүлөр төлөгөндөн кийин ачылат.',
      'Bookings, the schedule and the page work. The cash desk, analytics, loyalty and mailings open after payment.',
    ],
  Оплатить: ['Төлөө', 'Pay'],
  'Оплатить «{plan}»': ['«{plan}» үчүн төлөө', 'Pay for «{plan}»'],
  Срок: ['Мөөнөт', 'Term'],
  '{price} в месяц за {masters}, ещё {extra} за каждого следующего.': [
    '{masters} үчүн айына {price}, ар бир кийинкиси үчүн дагы {extra}.',
    '{price} a month for {masters}, {extra} for each one more.',
  ],
  'Год по цене десяти месяцев.': ['Жыл он айдын баасында.', 'A year for the price of ten months.'],
  'Продлится после {day}.': ['{day} кийин узартылат.', 'It extends after {day}.'],
  'Онлайн-оплата пока недоступна: напишите нам, продлим вручную.': [
    'Онлайн төлөм азырынча жеткиликсиз: бизге жазыңыз, кол менен узартабыз.',
    'Online payment is not available yet: write to us and we will extend it by hand.',
  ],
  Тарифы: ['Тарифтер', 'Plans'],
  '{count} дней бесплатно': ['{count} күн акысыз', '{count} days free'],
  'Ваш тариф': ['Сиздин тариф', 'Your plan'],
  'Пакеты SMS': ['SMS пакеттери', 'SMS packs'],
  'Тратятся, когда SMS месяца закончились, и не сгорают.': [
    'Айдын SMS’тери бүткөндө колдонулат жана күйүп кетпейт.',
    'Used once the month’s SMS run out, and never expire.',
  ],
  Оплаты: ['Төлөмдөр', 'Payments'],
  'Для Awaisa': ['Awaisa үчүн', 'For Awaisa'],
  'Продлить вручную': ['Кол менен узартуу', 'Extend by hand'],
  '«{plan}» на месяц': ['«{plan}» бир айга', '«{plan}» for a month'],
  '«{plan}» на год': ['«{plan}» бир жылга', '«{plan}» for a year'],
  '«{plan}» бессрочно': ['«{plan}» мөөнөтсүз', '«{plan}» for good'],
}

const ANALYTICS_COUNTED: Record<string, CountedEntry> = {
  новых: ['жаңы', 'new', 'new'],
  вернулись: ['кайтып келди', 'returning', 'returning'],
  раз: ['жолу', 'time', 'times'],
  строк: ['сап', 'row', 'rows'],
  филиалов: ['филиал', 'branch', 'branches'],
  'рабочих дней': ['иш күнү', 'working day', 'working days'],
}

export { ANALYTICS, ANALYTICS_COUNTED }
