import { absoluteUrl } from '@/shared/lib/seo/siteUrl'

// llms.txt (https://llmstxt.org): what the site is and where its public pages are, for AI agents.
// Without it /llms.txt fell through to the business-slug page and Lighthouse read that HTML
// as a broken file.
const LINKS = [
  ['Catalogue', '/', 'services and places in Bishkek with free times today and tomorrow'],
  [
    'Looks',
    '/feed',
    "photos of specialists' work with the price and booking with the same specialist",
  ],
  ['Map', '/map', 'places on a map, nearest first'],
  ['Rating', '/top', 'the best specialists and places by client reviews'],
  ['For business', '/business', 'how a salon or a specialist opens its own booking page'],
  ["What's new", '/updates', 'what changed for clients and for businesses'],
  ['Sitemap', '/sitemap.xml', 'every place and its services'],
] as const

const body = [
  '# Awaisa',
  '',
  '> Online booking with specialists in Bishkek: find a service, pick a specialist and a time, no calls.',
  '',
  'Every place has its own page at /<slug> with services, prices, specialists and reviews; booking is at /<slug>/book.',
  '',
  '## Pages',
  '',
  ...LINKS.map(([title, path, note]) => `- [${title}](${absoluteUrl(path)}): ${note}`),
  '',
].join('\n')

const GET = () => new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })

export { GET }
