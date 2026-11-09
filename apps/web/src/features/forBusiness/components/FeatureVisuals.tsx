import styles from '../ForBusinessPage.module.css'
import { DEMO_SLOTS } from '../forBusinessContent'

// Small slices of the real interface for each feature row.
const SlotsVisual = () => (
  <div className={styles.visual} aria-hidden='true'>
    <p className={styles.visualLabel}>Чт, 20 ноября · свободно</p>
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
    <p className={styles.visualLabel}>Сообщения · сегодня 12:30</p>
    <p className={styles.bubble}>
      Barber Pro: напоминаем — сегодня в 14:30 мужская стрижка, мастер Тимур. Ждём вас!
    </p>
    <p className={styles.bubbleMeta}>Доставлено</p>
  </div>
)

const DragVisual = () => (
  <div className={styles.visual} aria-hidden='true'>
    <p className={styles.visualLabel}>Перетащите — клиент получит SMS</p>
    <div className={styles.dragDemo}>
      <span className={styles.dragFrom}>12:30 · Данияр</span>
      <span className={styles.dragTo}>14:30 · Данияр</span>
    </div>
  </div>
)

export { DragVisual, ReminderVisual, SlotsVisual }
