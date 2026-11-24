import { absoluteUrl } from '@/shared/lib/seo/siteUrl'

// llms.txt (https://llmstxt.org): what the site is and where its public pages are, for AI agents.
// Without it /llms.txt fell through to the business-slug page and Lighthouse read that HTML
// as a broken file.
const LINKS = [
  ['Catalogue', '/', 'услуги и места Бишкека со свободным временем на сегодня и завтра'],
  ['Looks', '/feed', 'фото работ мастеров с ценой и записью к тому же мастеру'],
  ['Map', '/map', 'места на карте, ближайшие первыми'],
  ['Rating', '/top', 'лучшие мастера и места по отзывам клиентов'],
  ['For business', '/business', 'как салону или мастеру открыть свою страницу записи'],
  ["What's new", '/updates', 'изменения сервиса для клиентов и для бизнеса'],
  ['Карта сайта', '/sitemap.xml', 'все места и их услуги'],
] as const

const body = [
  '# Awaisa',
  '',
  '> Онлайн-запись к мастерам в Бишкеке: найдите услугу, выберите мастера и время, без звонков.',
  '',
  'У каждого места своя страница по адресу /<slug> с услугами, ценами, мастерами и отзывами; запись на /<slug>/book.',
  '',
  '## Страницы',
  '',
  ...LINKS.map(([title, path, note]) => `- [${title}](${absoluteUrl(path)}): ${note}`),
  '',
].join('\n')

const GET = () => new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })

export { GET }
