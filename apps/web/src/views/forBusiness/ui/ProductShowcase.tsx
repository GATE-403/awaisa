import type { CSSProperties } from 'react'
import { Ticket } from '@/entities/booking'
import { T } from '@/shared/i18n'
import styles from '@/views/forBusiness/ForBusinessPage.module.css'
import { DEMO_BOOKING, DEMO_SCHEDULE } from '@/views/forBusiness/forBusinessContent'

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
        <span className={styles.windowTitle}>
          <T>Barber Pro. Кабинет</T>
        </span>
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
                  <span className={styles.blockTitle}>
                    <T>{block.title}</T>
                  </span>
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
        <strong>
          <T>Новая запись</T>
        </strong>
        <span className={styles.toastText}>
          <T>Данияр · 20 ноября, 14:30 · Стрижка</T>
        </span>
      </span>
    </div>
  </div>
)
