import { Field as BaseField } from '@base-ui/react/field'
import type { ReactNode } from 'react'
import { mergeClassName } from '../../utils/className'
import styles from './Field.module.css'

interface FieldProps extends BaseField.Root.Props {
  label?: ReactNode
  description?: ReactNode
  error?: ReactNode
}

const Field = ({ label, description, error, className, children, ...props }: FieldProps) => (
  <BaseField.Root
    invalid={Boolean(error) || props.invalid}
    className={mergeClassName(styles.root, className)}
    {...props}
  >
    {label && <BaseField.Label className={styles.label}>{label}</BaseField.Label>}
    {children}
    {description && (
      <BaseField.Description className={styles.description}>{description}</BaseField.Description>
    )}
    {error && (
      <BaseField.Error className={styles.error} match>
        {error}
      </BaseField.Error>
    )}
  </BaseField.Root>
)

export type { FieldProps }
export { Field }
