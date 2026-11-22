// Public API of the slice: other layers import only from here (Feature-Sliced Design).
export * from './CatalogPage'
export { INDEXED_KINDS } from './config/kindSeo'
export { catalogMetadata, kindHref } from './lib/catalogMetadata'
export { CatalogPageSkeleton } from './ui/CatalogSkeleton/CatalogSkeleton'
