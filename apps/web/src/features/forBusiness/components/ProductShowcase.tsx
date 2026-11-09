import type { CSSProperties } from 'react'
import { Ticket } from '@/common/components/Ticket/Ticket'
import styles from '../ForBusinessPage.module.css'
import { DEMO_BOOKING, DEMO_SCHEDULE } from '../forBusinessContent'

// The product itself instead of an illustration: the cabinet's day, a client's ticket and the alert
// the owner gets when someone books.
export const ProductShowcase = () => (
  <div className={styles.showcase} aria-hidden='true'>
    <div className={styles.window}>
      <div className={styles.windowBar}>
        <span className={styles.lights}>
          <span />
          <span />
          <span />
        </span>
        <span className={styles.windowTitle}>Barber Pro. Кабинет</span>
      </div>
      <div className={styles.schedule}>
        {DEMO_SCHEDULE.map((column) => (
          <div
            key={column.master}
            className={styles.column}
            style={{ '--tint': column.tint } as CSSProperties}
          >
            <span className={styles.master}>{column.master}</span>
            <div className={styles.track}>
              {column.blocks.map((block) => (
                <span
                  key={block.time}
                  className={styles.block}
                  style={{ top: block.top, height: block.height }}
                >
                  <span className={styles.blockTime}>{block.time}</span>
                  <span className={styles.blockTitle}>{block.title}</span>
                  <span className={styles.blockClient}>{block.client}</span>
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>

    <div className={styles.ticket}>
      <Ticket booking={DEMO_BOOKING} />
    </div>

    <div className={styles.toast}>
      <span className={styles.toastIcon}>A</span>
      <span>
        <strong>Новая запись</strong>
        <span className={styles.toastText}>Данияр · 20 ноября, 14:30 · Стрижка</span>
      </span>
    </div>
  </div>
)
