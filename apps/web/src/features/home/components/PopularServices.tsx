import { getCatalog } from '@/common/api/serverApi'
import { ServiceCard } from '@/common/components/ServiceCard/ServiceCard'
import { Shelf } from '@/common/components/Shelf/Shelf'

export const PopularServices = async () => {
  const { services } = await getCatalog()
  const popular = services.filter((service) => service.isPopular)

  return (
    <Shelf label='Популярные услуги'>
      {popular.map((service) => (
        <li key={service.id}>
          <ServiceCard service={service} />
        </li>
      ))}
    </Shelf>
  )
}
