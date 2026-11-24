import { Container } from '@/shared/ui/Container/Container'
import { Block, Picture, TextLine } from '@/shared/ui/Placeholder/Placeholder'
import stepStyles from '../BookingStep/BookingStep.module.css'
import pickerStyles from '../ServicePicker/ServicePicker.module.css'
import styles from './BookingSkeleton.module.css'

// While a direct /book link loads: the open card with its question and the service pictures, built
// from the step's and the picker's own classes, so the real form lands on the same shapes. Not a
// sheet of its own - the form slides up once, when it arrives.
export const BookingSkeleton = () => (
  <Container size='md' className={styles.page} data-page-skeleton='' aria-busy='true'>
    <div className={stepStyles.step}>
      <h2 className={stepStyles.title}>
        <TextLine chars={11} />
      </h2>
      <div className={pickerStyles.picker}>
        <div className={styles.chips}>
          <Block className={styles.chip} />
          <Block className={styles.chip} />
          <Block className={styles.chip} />
        </div>
        <div className={pickerStyles.grid}>
          {['a', 'b', 'c', 'd'].map((key) => (
            <Picture key={key} className={styles.picture} />
          ))}
        </div>
      </div>
    </div>
  </Container>
)
