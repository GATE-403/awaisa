import { Trans } from '@lingui/react/macro'
import styles from '@/views/forBusiness/ForBusinessPage.module.css'
import { DEMO_SLOTS } from '@/views/forBusiness/forBusinessContent'

// Small slices of the real interface for each feature row.
const SlotsVisual = () => (
  <div className={styles.visual} aria-hidden='true'>
    <p className={styles.visualLabel}>
      <Trans>Thu, 20 November · free</Trans>
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
      <Trans>Messages · today 12:30</Trans>
    </p>
    <p className={styles.bubble}>
      <Trans>Barber Pro: a reminder, men’s haircut today at 14:30 with Timur. See you soon!</Trans>
    </p>
    <p className={styles.bubbleMeta}>
      <Trans>Delivered</Trans>
    </p>
  </div>
)

const DragVisual = () => (
  <div className={styles.visual} aria-hidden='true'>
    <p className={styles.visualLabel}>
      <Trans>Drag it: the client gets an SMS</Trans>
    </p>
    <div className={styles.dragDemo}>
      <span className={styles.dragFrom}>12:30 · Daniyar</span>
      <span className={styles.dragTo}>14:30 · Daniyar</span>
    </div>
  </div>
)

export { DragVisual, ReminderVisual, SlotsVisual }
