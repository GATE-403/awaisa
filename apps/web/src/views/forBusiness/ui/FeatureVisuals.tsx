import { T } from '@/shared/i18n'
import styles from '@/views/forBusiness/ForBusinessPage.module.css'
import { DEMO_SLOTS } from '@/views/forBusiness/forBusinessContent'

// Small slices of the real interface for each feature row.
const SlotsVisual = () => (
  <div className={styles.visual} aria-hidden='true'>
    <p className={styles.visualLabel}>
      <T>Thu, 20 November · free</T>
    </p>
    <div className={styles.slots}>
      {DEMO_SLOTS.map((slot, index) => (
        <span key={slot} className={styles.slot} data-picked={index === 7 || undefined}>
          {slot}
        </span>
      ))}
    </div>
  </div>
)

const ReminderVisual = () => (
  <div className={styles.visual} aria-hidden='true'>
    <p className={styles.visualLabel}>
      <T>Messages · today 12:30</T>
    </p>
    <p className={styles.bubble}>
      <T>Barber Pro: a reminder, men’s haircut today at 14:30 with Timur. See you soon!</T>
    </p>
    <p className={styles.bubbleMeta}>
      <T>Delivered</T>
    </p>
  </div>
)

const DragVisual = () => (
  <div className={styles.visual} aria-hidden='true'>
    <p className={styles.visualLabel}>
      <T>Drag it: the client gets an SMS</T>
    </p>
    <div className={styles.dragDemo}>
      <span className={styles.dragFrom}>12:30 · Данияр</span>
      <span className={styles.dragTo}>14:30 · Данияр</span>
    </div>
  </div>
)

export { DragVisual, ReminderVisual, SlotsVisual }
