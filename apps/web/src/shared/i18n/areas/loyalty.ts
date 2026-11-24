import type { CountedEntry, Entry } from './types'

// The cabinet's «Лояльность» (bonuses, subscriptions, certificates) and «Акции».
const LOYALTY: Record<string, Entry> = {
  // Loyalty
  'Бонусы, абонементы и сертификаты списываются в «Итоге визита».': [
    'Бонустар, абонементтер жана сертификаттар «Визиттин жыйынтыгында» эсептен чыгарылат.',
    'Bonuses, passes and certificates are redeemed in «Visit outcome».',
  ],
  'Начислять бонусы': ['Бонус берүү', 'Give bonuses'],
  'С каждой оплаты': ['Ар бир төлөмдөн', 'From each payment'],
  'Процент бонусов': ['Бонустун пайызы', 'Bonus percentage'],
  'Клиент получает {percent}% от оплаты деньгами и тратит их на следующих визитах: 1 бонус = 1 сом.':
    [
      'Кардар акча менен төлөгөнүнүн {percent}% алат жана аларды кийинки визиттерде жумшайт: 1 бонус = 1 сом.',
      'Clients get {percent}% of what they pay in money and spend it on later visits: 1 bonus = 1 som.',
    ],
  'Возвращайте клиенту часть оплаты бонусами: он придёт снова, чтобы их потратить.': [
    'Төлөмдүн бир бөлүгүн кардарга бонус менен кайтарыңыз: ал аларды жумшаш үчүн кайра келет.',
    'Give clients part of their payment back as bonuses: they’ll come back to spend them.',
  ],
  'Например, «5 стрижек за 4»: клиент платит сразу, визиты списываются в «Итоге визита».': [
    'Мисалы, «4 баасына 5 чач кырктыруу»: кардар дароо төлөйт, визиттер «Визиттин жыйынтыгында» эсептен чыгарылат.',
    'For example, «5 haircuts for 4»: the client pays up front, visits are redeemed in «Visit outcome».',
  ],
  'Не продаётся': ['Сатылбайт', 'Not on sale'],
  'любая услуга': ['каалаган кызмат', 'any service'],
  '{days} дн.': ['{days} күн', '{days} days'],
  'Сертификаты онлайн': ['Онлайн сертификаттар', 'Certificates online'],
  'Продавать сертификаты онлайн': ['Сертификаттарды онлайн сатуу', 'Sell certificates online'],
  Суммы: ['Суммалар', 'Amounts'],
  'Клиенты покупают на странице места и платят картой. Сертификат появится ниже после оплаты, код придёт покупателю и получателю.':
    [
      'Кардарлар жайдын баракчасынан сатып алып, карта менен төлөшөт. Сертификат төлөмдөн кийин төмөндө пайда болот, код сатып алуучуга жана алуучуга келет.',
      'Clients buy on the place’s page and pay by card. The certificate appears below once paid; the code goes to the buyer and the recipient.',
    ],
  'Подарочный сертификат на странице места: клиент выбирает сумму, платит картой и получает код.': [
    'Жайдын баракчасындагы белек сертификаты: кардар сумманы тандап, карта менен төлөйт жана код алат.',
    'A gift certificate on the place’s page: the client picks an amount, pays by card and gets a code.',
  ],
  Выпустить: ['Чыгаруу', 'Issue'],
  'Подарочный сертификат на сумму: клиент тратит его частями, остаток виден по коду.': [
    'Суммага белек сертификаты: кардар аны бөлүп жумшайт, калдыгы код боюнча көрүнөт.',
    'A gift certificate for an amount: the client spends it in parts, the balance shows by its code.',
  ],
  'до {date}': ['{date} чейин', 'until {date}'],
  бессрочный: ['мөөнөтсүз', 'no expiry'],
  'из {amount}': ['{amount} ичинен', 'of {amount}'],
  '{amount}: назовите код клиенту': [
    '{amount}: кодду кардарга айтыңыз',
    '{amount}: tell the client the code',
  ],
  'Сертификаты продаются онлайн': [
    'Сертификаттар онлайн сатылууда',
    'Certificates are on sale online',
  ],
  'Онлайн-продажа выключена': ['Онлайн сатуу өчүрүлдү', 'Online sales turned off'],
  'Бонусы включены': ['Бонустар күйгүзүлдү', 'Bonuses on'],
  'Бонусы выключены': ['Бонустар өчүрүлдү', 'Bonuses off'],
  'Абонемент сохранён': ['Абонемент сакталды', 'Pass saved'],
  'Суммы сохранены': ['Суммалар сакталды', 'Amounts saved'],

  // Subscription plan
  Абонемент: ['Абонемент', 'Pass'],
  'Новый абонемент': ['Жаңы абонемент', 'New pass'],
  'Название абонемента': ['Абонементтин аталышы', 'Pass name'],
  '5 стрижек за 4': ['4 баасына 5 чач кырктыруу', '5 haircuts for 4'],
  'Услуга абонемента': ['Абонементтин кызматы', 'Pass service'],
  Любая: ['Каалаган', 'Any'],
  Визитов: ['Визиттер', 'Visits'],
  'Цена абонемента, сом': ['Абонементтин баасы, сом', 'Pass price, som'],
  Действует: ['Жарактуу', 'Valid for'],
  'Срок действия': ['Жарактуулук мөөнөтү', 'Validity'],
  '{days} дней': ['{days} күн', '{days} days'],
  Продаётся: ['Сатылат', 'On sale'],
  'Продавать онлайн': ['Онлайн сатуу', 'Sell online'],
  'По отдельности {visits} визитов стоят {full} сом - клиент экономит {saving} сом.': [
    'Өзүнчө {visits} визит {full} сом турат: кардар {saving} сом үнөмдөйт.',
    'Separately, {visits} visits cost {full} som: the client saves {saving} som.',
  ],
  'Клиенты купят его на странице места и при записи, оплатив картой. Абонемент появится у клиента после оплаты.':
    [
      'Кардарлар аны жайдын баракчасынан жана жазылууда карта менен төлөп сатып алышат. Абонемент төлөмдөн кийин кардарда пайда болот.',
      'Clients buy it on the place’s page and when booking, paying by card. The pass is theirs once paid.',
    ],
  'Удалить абонемент': ['Абонементти өчүрүү', 'Delete pass'],

  // Certificate
  'Сумма сертификата, сом': ['Сертификаттын суммасы, сом', 'Certificate amount, som'],
  'Телефон получателя': ['Алуучунун телефону', 'Recipient’s phone'],
  необязательно: ['милдеттүү эмес', 'optional'],
  'Действует до': ['Жарактуулугу', 'Valid until'],
  'Без срока': ['Мөөнөтсүз', 'No end date'],
  'Код из 8 символов покажем сразу. С номером сертификат виден в карточке клиента.': [
    '8 белгиден турган кодду дароо көрсөтөбүз. Номер менен сертификат кардардын карточкасында көрүнөт.',
    'We show the 8-character code right away. With a number, the certificate shows on the client’s card.',
  ],
  'Суммы сертификатов': ['Сертификаттардын суммалары', 'Certificate amounts'],
  'Ещё сумма': ['Дагы сумма', 'Another amount'],
  'Сумма {number}': ['{number}-сумма', 'Amount {number}'],
  'Сумма {number}, сом': ['{number}-сумма, сом', 'Amount {number}, som'],
  'Убрать сумму {number}': ['{number}-сумманы алып салуу', 'Remove amount {number}'],
  'Клиент выбирает одну из сумм на странице места. От 100 сом, до шести сумм.': [
    'Кардар жайдын баракчасында суммалардын бирин тандайт. 100 сомдон баштап, алтыга чейин сумма.',
    'The client picks one amount on the place’s page. From 100 som, up to six amounts.',
  ],

  // Promotions
  'Скидки не суммируются - клиент получает самую большую.': [
    'Арзандатуулар кошулбайт: кардар эң чоңун алат.',
    'Discounts don’t add up: the client gets the biggest one.',
  ],
  'Запустите первую акцию': ['Биринчи акцияны баштаңыз', 'Launch your first promotion'],
  'Заполните тихие часы скидкой, приведите новых клиентов или раздайте промокод.': [
    'Тынч сааттарды арзандатуу менен толтуруңуз, жаңы кардарларды тартыңыз же промокод таратыңыз.',
    'Fill quiet hours with a discount, bring in new clients or hand out a promo code.',
  ],
  Выключена: ['Өчүрүлгөн', 'Off'],
  'Скидка по часам': ['Саат боюнча арзандатуу', 'Happy hours'],
  'Тип акции': ['Акциянын түрү', 'Promotion type'],
  'По часам': ['Саат боюнча', 'By hours'],
  Новым: ['Жаңыларга', 'New clients'],
  Скидка: ['Арзандатуу', 'Discount'],
  'Название акции': ['Акциянын аталышы', 'Promotion name'],
  'Скидка, %': ['Арзандатуу, %', 'Discount, %'],
  'Заполните тихие часы: скидка действует в выбранные дни и время начала визита.': [
    'Тынч сааттарды толтуруңуз: арзандатуу тандалган күндөрү визит башталган убакытка жарайт.',
    'Fill quiet hours: the discount applies on the chosen days by the visit’s start time.',
  ],
  'Для тех, кто записывается к вам впервые - по номеру телефона.': [
    'Сизге биринчи жолу жазылгандар үчүн, телефон номери боюнча.',
    'For people booking with you for the first time, by phone number.',
  ],
  'Клиент вводит код при записи. Раздайте его в Instagram или на визитке.': [
    'Кардар кодду жазылууда киргизет. Аны Instagram’да же визиткада таратыңыз.',
    'The client enters the code when booking. Share it on Instagram or a business card.',
  ],
  'Дни недели': ['Жуманын күндөрү', 'Days of the week'],
  До: ['Чейин', 'Until'],
  Конец: ['Аягы', 'End'],
  'До даты': ['Датага чейин', 'Until date'],
  Включена: ['Күйгүзүлгөн', 'On'],
  'Без даты - пока не выключите.': [
    'Датасыз: өчүрмөйүнчө иштейт.',
    'Without a date: until you turn it off.',
  ],
  'Удалить акцию': ['Акцияны өчүрүү', 'Delete promotion'],
}

const LOYALTY_COUNTED: Record<string, CountedEntry> = {}

export { LOYALTY, LOYALTY_COUNTED }
