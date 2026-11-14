import { absoluteUrl } from './siteUrl'

/** schema.org `BreadcrumbList` for a trail of pages, with absolute URLs. */
const breadcrumbJsonLd = (items: { label: string; href: string }[]) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: item.label,
    item: absoluteUrl(item.href),
  })),
})

export { breadcrumbJsonLd }
