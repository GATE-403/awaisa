import { Button as BaseButton } from '@base-ui/react/button'
import { mergeClassName } from '../../utils/className'
import { type ButtonSize, type ButtonVariant, buttonVariants } from './buttonVariants'

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
    data-slot='button'
    data-variant={variant}
    data-size={size}
    data-full-width={fullWidth || undefined}
    className={mergeClassName(buttonVariants({ variant, size, fullWidth }), className)}
    {...props}
  />
)

export type { ButtonProps, ButtonSize, ButtonVariant }
export { Button }
