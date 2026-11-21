// iPhone Safari cannot take pushes: the site has to be on the home screen first (iOS 16.4+).
const INSTALL_HINT =
  'На iPhone уведомления приходят только из приложения: «Поделиться» → «На экран Домой», затем включите их там.'

const DENIED_HINT = 'Уведомления запрещены в настройках браузера для этого сайта: разрешите их там.'

const AUDIENCE_NOTES = {
  business: 'Новые записи, переносы и отмены клиентов, даже когда кабинет закрыт.',
  master: 'Новые записи к вам, переносы и отмены, даже когда страница закрыта.',
}

export { AUDIENCE_NOTES, DENIED_HINT, INSTALL_HINT }
