import { Input as BaseInput } from '@base-ui/react/input'
import { mergeClassName } from '../../utils/className'
import styles from './Input.module.css'

interface InputProps extends BaseInput.Props {}

const Input = ({ className, ...props }: InputProps) => (
  <BaseInput className={mergeClassName(styles.input, className)} {...props} />
)

export type { InputProps }
export { Input }
