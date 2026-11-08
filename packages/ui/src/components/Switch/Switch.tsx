import { Switch as BaseSwitch } from '@base-ui/react/switch'
import { mergeClassName } from '../../utils/className'
import styles from './Switch.module.css'

interface SwitchProps extends BaseSwitch.Root.Props {}

const Switch = ({ className, ...props }: SwitchProps) => (
  <BaseSwitch.Root className={mergeClassName(styles.root, className)} {...props}>
    <BaseSwitch.Thumb className={styles.thumb} />
  </BaseSwitch.Root>
)

export type { SwitchProps }
export { Switch }
