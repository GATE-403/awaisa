import { Input as BaseInput } from '@base-ui/react/input'
import { mergeClassName } from '../../utils/className'
import styles from './Input.module.css'

interface InputProps extends BaseInput.Props {
  variant?: 'default' | 'plain'
}

const Input = ({ variant = 'default', className, ...props }: InputProps) => (
  <BaseInput
    data-variant={variant}
    className={mergeClassName(styles.input, className)}
    {...props}
  />
)

export type { InputProps }
export { Input }
