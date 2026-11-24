import type { Entry } from './types'

// `/login`: the number, the code, the name and the greeting.
const AUTH: Record<string, Entry> = {
  'Запись к мастерам.': ['Усталарга жазылуу.', 'Book your specialist.'],
  'Без звонков.': ['Чалуусуз.', 'No calls.'],
  'Номер телефона': ['Телефон номери', 'Phone number'],
  'Получить код': ['Код алуу', 'Get a code'],
  'Отправляем…': ['Жөнөтүп жатабыз…', 'Sending…'],
  или: ['же', 'or'],
  'Войти через Telegram': ['Telegram аркылуу кирүү', 'Sign in with Telegram'],
  'Код придёт в Telegram или по SMS': [
    'Код Telegram же SMS аркылуу келет',
    'The code comes in Telegram or by SMS',
  ],
  'Ссылка для входа устарела - нажмите «Войти через Telegram» ещё раз': [
    'Кирүү шилтемесинин мөөнөтү бүттү: «Telegram аркылуу кирүү» дегенди кайра басыңыз',
    'The sign-in link has expired: tap «Sign in with Telegram» again',
  ],
  Назад: ['Артка', 'Back'],
  'Изменить номер': ['Номерди өзгөртүү', 'Change the number'],
  'Подтвердите в Telegram': ['Telegram аркылуу ырастаңыз', 'Confirm in Telegram'],
  'Нажмите «Поделиться номером» в чате с ботом - и вернитесь сюда': [
    'Бот менен чатта «Номер менен бөлүшүү» дегенди басып, бул жакка кайтыңыз',
    'Tap «Share my number» in the chat with the bot, then come back here',
  ],
  'Ждём ваш номер…': ['Номериңизди күтүп жатабыз…', 'Waiting for your number…'],
  'Открыть Telegram снова': ['Telegramды кайра ачуу', 'Open Telegram again'],
  'Войти по SMS': ['SMS аркылуу кирүү', 'Sign in by SMS'],
  'Введите код': ['Кодду жазыңыз', 'Enter the code'],
  'Код отправлен в Telegram на {phone}': [
    'Код Telegram аркылуу {phone} номерине жөнөтүлдү',
    'The code was sent in Telegram to {phone}',
  ],
  'Код отправлен по SMS на {phone}': [
    'Код SMS аркылуу {phone} номерине жөнөтүлдү',
    'The code was sent by SMS to {phone}',
  ],
  'Код подтверждения': ['Ырастоо коду', 'Confirmation code'],
  'Проверяем…': ['Текшерип жатабыз…', 'Checking…'],
  'Сообщение придёт от официального чата Telegram': [
    'Билдирүү Telegramдын расмий чатынан келет',
    'The message comes from the official Telegram chat',
  ],
  'Войдём, как только наберёте все цифры': [
    'Бардык сандарды терериңиз менен киребиз',
    'We sign you in as soon as you type every digit',
  ],
  'Нет Telegram? Получить SMS': ['Telegram жокпу? SMS алуу', 'No Telegram? Get an SMS'],
  'Отправить снова': ['Кайра жөнөтүү', 'Send again'],
  'Отправить снова через {seconds} с': [
    '{seconds} сек кийин кайра жөнөтүү',
    'Send again in {seconds} s',
  ],
  'Вы вошли': ['Сиз кирдиңиз', 'You are signed in'],
  'Как к вам обращаться?': ['Сизге кантип кайрылабыз?', 'What should we call you?'],
  'Привет, {name}': ['Салам, {name}', 'Hi, {name}'],
}

export { AUTH }
