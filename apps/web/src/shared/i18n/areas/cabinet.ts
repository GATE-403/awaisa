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
}

const CABINET_COUNTED: Record<string, CountedEntry> = {
  клиентов: ['кардар', 'client', 'clients'],
}

export { CABINET, CABINET_COUNTED }
