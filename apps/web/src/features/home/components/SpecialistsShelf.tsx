import { getCatalog } from '@/common/api/serverApi'
import { Shelf } from '@/common/components/Shelf/Shelf'
import { SpecialistCard } from '@/common/components/SpecialistCard/SpecialistCard'

export const SpecialistsShelf = async () => {
  const { specialists } = await getCatalog()

  return (
    <Shelf label='Мастера'>
      {specialists.map((specialist) => (
        <li key={specialist.id}>
          <SpecialistCard specialist={specialist} />
        </li>
      ))}
    </Shelf>
  )
}
