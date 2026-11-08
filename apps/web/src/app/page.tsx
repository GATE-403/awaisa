import { CatalogPage } from '@/features/catalog/CatalogPage'

const HomeRoute = ({ searchParams }: PageProps<'/'>) => <CatalogPage searchParams={searchParams} />

export default HomeRoute
