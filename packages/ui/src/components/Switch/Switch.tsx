import { Switch as BaseSwitch } from '@base-ui/react/switch'
import { mergeClassName } from '../../utils/className'

interface SwitchProps extends BaseSwitch.Root.Props {}

const Switch = ({ className, ...props }: SwitchProps) => (
  <BaseSwitch.Root
    data-slot='switch'
    className={mergeClassName(
      'peer group/switch relative inline-flex h-[18.4px] w-[32px] shrink-0 items-center rounded-full border border-transparent transition-all outline-none after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 data-checked:bg-primary data-unchecked:bg-input dark:data-unchecked:bg-input/80 data-disabled:cursor-not-allowed data-disabled:opacity-50',
      className,
    )}
    {...props}
  >
    <BaseSwitch.Thumb
      data-slot='switch-thumb'
      className='pointer-events-none block size-4 rounded-full bg-background ring-0 transition-transform data-checked:translate-x-[calc(100%-2px)] data-unchecked:translate-x-0 rtl:data-checked:-translate-x-[calc(100%-2px)] dark:data-checked:bg-primary-foreground dark:data-unchecked:bg-foreground'
    />
  </BaseSwitch.Root>
)

export type { SwitchProps }
export { Switch }
