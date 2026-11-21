import type { CountedEntry, Entry } from './types'

const PLACE: Record<string, Entry> = {
  // Business bar
  Обзор: ['Сереп', 'Overview'],
  'Услуги и цены': ['Кызматтар жана баалар', 'Services and prices'],
  Мастера: ['Усталар', 'Specialists'],
  Каталог: ['Каталог', 'Catalogue'],
  'Страница бизнеса {name}': ['{name} бизнес барагы', '{name} business page'],

  // Place head and quick actions
  Позвонить: ['Чалуу', 'Call'],
  Написать: ['Жазуу', 'Message'],
  Поделиться: ['Бөлүшүү', 'Share'],
  'Ссылка скопирована': ['Шилтеме көчүрүлдү', 'Link copied'],

  // Services
  'Найти услугу': ['Кызмат издөө', 'Find a service'],
  'Разделы услуг': ['Кызмат бөлүмдөрү', 'Service sections'],
  'Часто выбирают': ['Көп тандашат', 'Popular'],
  'Часто выбирают: {name}': ['Көп тандашат: {name}', 'Popular: {name}'],
  'Нашли {count}': ['Табылды: {count}', 'Found {count}'],
  'Ничего не нашли: попробуйте другое слово или раздел «Все».': [
    'Эч нерсе табылган жок: башка сөздү же «Баары» бөлүмүн көрүңүз.',
    'Nothing found: try another word or the «All» section.',
  ],
  'Все услуги': ['Бардык кызматтар', 'All services'],
  ' в {name}': [' · {name}', ' at {name}'],
  'от {price}': ['{price} баштап', 'from {price}'],
  Категории: ['Категориялар', 'Categories'],

  // Masters
  'Рейтинг ›': ['Рейтинг ›', 'Rating ›'],

  // Reviews
  '{count} последних': ['акыркы {count}', 'latest {count}'],
  '{rating} из 5': ['{rating} / 5', '{rating} of 5'],
  '{name}: профиль': ['{name}: профиль', '{name}: profile'],
  Ответ: ['Жооп', 'Reply'],
  'Фото {index} из {total}': ['Сүрөт {index}/{total}', 'Photo {index} of {total}'],
  'Фото из отзыва — {name}': ['Пикирдеги сүрөт: {name}', 'Review photo: {name}'],

  // Works
  Работы: ['Иштер', 'Work'],
  'Смотреть с ценами ›': ['Баалары менен көрүү ›', 'See with prices ›'],
  'Открыть фото {index} из {total}': [
    '{index}/{total} сүрөттү ачуу',
    'Open photo {index} of {total}',
  ],

  // Questions
  Вопросы: ['Суроолор', 'Questions'],
  Вопрос: ['Суроо', 'Question'],
  'Задать вопрос': ['Суроо берүү', 'Ask a question'],
  'Спросите о парковке, оплате или детях — место ответит здесь.': [
    'Унаа токтотуучу жай, төлөм же балдар жөнүндө сураңыз: жооп ушул жерде чыгат.',
    'Ask about parking, payment or children: the place will answer here.',
  ],
  'Напишите вопрос': ['Суроону жазыңыз', 'Write your question'],
  'Вопрос отправлен': ['Суроо жөнөтүлдү', 'Question sent'],
  'Ответ появится здесь, когда место ответит': [
    'Жооп берилгенде ушул жерде чыгат',
    'The answer will appear here once the place replies',
  ],
  Отправить: ['Жөнөтүү', 'Send'],
  'Отправляем…': ['Жөнөтүп жатабыз…', 'Sending…'],
  'Вопрос для {name}': ['{name} үчүн суроо', 'Question for {name}'],
  'Есть парковка? Можно оплатить картой?': [
    'Унаа токтотуучу жай барбы? Карта менен төлөсө болобу?',
    'Is there parking? Can I pay by card?',
  ],
  'Вопрос увидят после ответа места — с вашим именем, без номера.': [
    'Суроо жооп берилгенден кийин көрүнөт: атыңыз менен, номерсиз.',
    'Your question shows once the place answers: with your name, without your number.',
  ],

  // Nearest free time and contacts
  'Ближайшее окно': ['Жакынкы бош убакыт', 'Next free time'],
  'Ищем ближайшее окно…': ['Жакынкы бош убакытты издеп жатабыз…', 'Looking for a free time…'],
  'Окна появятся скоро': ['Бош убакыт жакында чыгат', 'Free times coming soon'],
  'Записаться на ': ['Жазылуу: ', 'Book for '],
  'Записаться: ': ['Жазылуу: ', 'Book: '],
  'Как нас найти': ['Бизди кантип табасыз', 'How to find us'],
  Адрес: ['Дарек', 'Address'],
  Часы: ['Иш убактысы', 'Hours'],
  Выходной: ['Дем алыш', 'Closed'],
  'Сегодня {hours}': ['Бүгүн {hours}', 'Today {hours}'],
  '{name} на карте': ['{name} картада', '{name} on the map'],
  'Открыть на карте': ['Картадан ачуу', 'Open on the map'],

  // Similar places
  'Похожие места': ['Окшош жайлар', 'Similar places'],
  'Ещё {kind} рядом.': ['Жакын жерде дагы {kind}.', 'More {kind} nearby.'],
  'Ещё места рядом.': ['Жакын жерде дагы жайлар.', 'More places nearby.'],
  'Смотреть все ›': ['Баарын көрүү ›', 'See all ›'],

  // Map
  'Список свёрнут': ['Тизме жыйылган', 'List collapsed'],
  'Список наполовину': ['Тизме жарымына ачык', 'List half open'],
  'Список на весь экран': ['Тизме толук экранда', 'List full screen'],
  '{state}. Изменить высоту списка': [
    '{state}. Тизменин бийиктигин өзгөртүү',
    '{state}. Change the list height',
  ],
  'Рядом.': ['Жакын жерде.', 'Nearby.'],
  'Выберите место на карте или в списке.': [
    'Жайды картадан же тизмеден тандаңыз.',
    'Pick a place on the map or in the list.',
  ],
  'Виды бизнеса': ['Бизнес түрлөрү', 'Business types'],
  'Ищем…': ['Издеп жатабыз…', 'Searching…'],
  '{count}, ближайшие сверху': ['{count}, жакындары өйдөдө', '{count}, nearest first'],
  'Где вы?': ['Сиз кайдасыз?', 'Where are you?'],
  'Укажите, где вы, — покажем ближайшие места и точку на карте.': [
    'Кайда экениңизди көрсөтүңүз: жакынкы жайларды жана картадагы чекитти көрсөтөбүз.',
    'Tell us where you are: we will show the nearest places and a dot on the map.',
  ],
  'Здесь пока нет мест на карте. Попробуйте другой вид или': [
    'Бул жерде картада азырынча жай жок. Башка түрүн же',
    'No places on the map here yet. Try another type or the',
  ],
  каталог: ['каталогду караңыз', 'catalogue'],
  Карта: ['Карта', 'Map'],
  'Карта салонов и мастеров': ['Салондор жана усталар картасы', 'Map of salons and specialists'],

  // Feed («Образы»)
  Образы: ['Образдар', 'Looks'],
  'Образов пока нет': ['Азырынча образ жок', 'No looks yet'],
  'Здесь появятся фото работ мастеров — с ценой и записью в один тап.': [
    'Бул жерде усталардын иштеринин сүрөттөрү чыгат: баасы менен, бир басуу менен жазылуу.',
    'Specialists’ work photos will appear here, with prices and one-tap booking.',
  ],
  'Открыть каталог ›': ['Каталогду ачуу ›', 'Open the catalogue ›'],
  'Предыдущая работа': ['Мурунку иш', 'Previous work'],
  'Следующая работа': ['Кийинки иш', 'Next work'],
  'Потяните вверх — вернуть прошлую': [
    'Өйдө тартыңыз: мурункусун кайтаруу',
    'Pull up to bring back the last one',
  ],
  Ещё: ['Дагы', 'More'],
  Пожаловаться: ['Арыздануу', 'Report'],
  'Спасибо, проверим фото': ['Рахмат, сүрөттү текшеребиз', 'Thanks, we will check the photo'],
  'Нравится: {count}': ['Жакты: {count}', 'Likes: {count}'],
  '{count} тыс.': ['{count} миң', '{count}k'],
  '{count} м': ['{count} м', '{count} m'],
  '{count} км': ['{count} км', '{count} km'],
  'Работа: {name}': ['Иш: {name}', 'Work: {name}'],
  'Работа в {name}': ['{name}: иш', 'Work at {name}'],
  'Записаться к мастеру {name}': ['{name} устага жазылуу', 'Book with {name}'],
  'Об этой услуге ещё не писали — станьте первым после визита.': [
    'Бул кызмат жөнүндө азырынча эч ким жаза элек: визиттен кийин биринчи болуп жазыңыз.',
    'No one has written about this service yet: be the first after your visit.',
  ],
}

const PLACE_COUNTED: Record<string, CountedEntry> = {
  услуг: ['кызмат', 'service', 'services'],
  мастеров: ['уста', 'specialist', 'specialists'],
  оценок: ['баа', 'rating', 'ratings'],
  вопросов: ['суроо', 'question', 'questions'],
  мест: ['жай', 'place', 'places'],
}

export { PLACE, PLACE_COUNTED }
