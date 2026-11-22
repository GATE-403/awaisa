import { T } from '@/shared/i18n'
import styles from '@/views/forBusiness/ForBusinessPage.module.css'
import { DEMO_SLOTS } from '@/views/forBusiness/forBusinessContent'

// Small slices of the real interface for each feature row.
const SlotsVisual = () => (
  <div className={styles.visual} aria-hidden='true'>
    <p className={styles.visualLabel}>
      <T>Чт, 20 ноября · свободно</T>
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
      <T>Сообщения · сегодня 12:30</T>
    </p>
    <p className={styles.bubble}>
      <T>Barber Pro: напоминаем — сегодня в 14:30 мужская стрижка, мастер Тимур. Ждём вас!</T>
    </p>
    <p className={styles.bubbleMeta}>
      <T>Доставлено</T>
    </p>
  </div>
)

const DragVisual = () => (
  <div className={styles.visual} aria-hidden='true'>
    <p className={styles.visualLabel}>
      <T>Перетащите — клиент получит SMS</T>
    </p>
    <div className={styles.dragDemo}>
      <span className={styles.dragFrom}>12:30 · Данияр</span>
      <span className={styles.dragTo}>14:30 · Данияр</span>
    </div>
  </div>
)

export { DragVisual, ReminderVisual, SlotsVisual }
