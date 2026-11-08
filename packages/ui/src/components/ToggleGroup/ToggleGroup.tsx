import { Toggle as BaseToggle } from '@base-ui/react/toggle'
import { ToggleGroup as BaseToggleGroup } from '@base-ui/react/toggle-group'
import { mergeClassName } from '../../utils/className'
import styles from './ToggleGroup.module.css'

type ToggleSize = 'sm' | 'md' | 'card'

interface ToggleGroupProps<Value extends string> extends BaseToggleGroup.Props<Value> {
  layout?: 'wrap' | 'scroll' | 'grid'
}

interface ToggleProps<Value extends string> extends BaseToggle.Props<Value> {
  size?: ToggleSize
}

const ToggleGroup = <Value extends string>({
  layout = 'wrap',
  className,
  ...props
}: ToggleGroupProps<Value>) => (
  <BaseToggleGroup
    data-layout={layout}
    className={mergeClassName(styles.group, className)}
    {...props}
  />
)

const Toggle = <Value extends string>({ size = 'md', className, ...props }: ToggleProps<Value>) => (
  <BaseToggle data-size={size} className={mergeClassName(styles.toggle, className)} {...props} />
)

export type { ToggleGroupProps, ToggleProps, ToggleSize }
export { Toggle, ToggleGroup }
