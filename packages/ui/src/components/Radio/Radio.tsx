import { Radio as BaseRadio } from '@base-ui/react/radio'
import { RadioGroup as BaseRadioGroup } from '@base-ui/react/radio-group'
import { mergeClassName } from '../../utils/className'
import styles from './Radio.module.css'

interface RadioGroupProps extends BaseRadioGroup.Props {}

interface RadioProps extends BaseRadio.Root.Props {}

const RadioGroup = ({ className, ...props }: RadioGroupProps) => (
  <BaseRadioGroup className={mergeClassName(styles.group, className)} {...props} />
)

const Radio = ({ className, ...props }: RadioProps) => (
  <BaseRadio.Root className={mergeClassName(styles.radio, className)} {...props}>
    <BaseRadio.Indicator className={styles.indicator} />
  </BaseRadio.Root>
)

export type { RadioGroupProps, RadioProps }
export { Radio, RadioGroup }
