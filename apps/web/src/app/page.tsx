import type { Metadata } from 'next'
import { CatalogPage, catalogMetadata } from '@/views/catalog'

export const generateMetadata = async ({ searchParams }: PageProps<'/'>): Promise<Metadata> =>
  catalogMetadata(await searchParams)

const HomeRoute = ({ searchParams }: PageProps<'/'>) => <CatalogPage searchParams={searchParams} />

export default HomeRoute
