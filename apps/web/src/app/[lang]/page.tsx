import type { Metadata } from 'next'
import { initLingui } from '@/shared/i18n/server'
import { CatalogPage, catalogMetadata } from '@/views/catalog'

export const generateMetadata = async ({
  searchParams,
}: PageProps<'/[lang]'>): Promise<Metadata> => {
  const i18n = await initLingui()
  return catalogMetadata(await searchParams, i18n)
}

const HomeRoute = async ({ searchParams }: PageProps<'/[lang]'>) => {
  await initLingui()

  return <CatalogPage searchParams={searchParams} />
}

export default HomeRoute
