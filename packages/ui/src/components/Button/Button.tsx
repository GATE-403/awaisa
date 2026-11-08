import { Button as BaseButton } from '@base-ui/react/button'
import { mergeClassName } from '../../utils/className'
import styles from './Button.module.css'

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'link' | 'contrast'

type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends BaseButton.Props {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
}

const Button = ({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className,
  ...props
}: ButtonProps) => (
  <BaseButton
    data-variant={variant}
    data-size={size}
    data-full-width={fullWidth || undefined}
    className={mergeClassName(styles.button, className)}
    {...props}
  />
)

export type { ButtonProps, ButtonSize, ButtonVariant }
export { Button }
