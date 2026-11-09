import { CatalogPage } from '@/views/catalog'

const HomeRoute = ({ searchParams }: PageProps<'/'>) => <CatalogPage searchParams={searchParams} />

export default HomeRoute
