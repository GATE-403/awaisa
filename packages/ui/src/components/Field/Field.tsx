import { Field as BaseField } from '@base-ui/react/field'
import type { ReactNode } from 'react'
import { mergeClassName } from '../../utils/className'

interface FieldProps extends BaseField.Root.Props {
  label?: ReactNode
  description?: ReactNode
  error?: ReactNode
}

// shadcn's Field on Base UI's, which ties the label, the description and the error to the control.
const Field = ({ label, description, error, className, children, ...props }: FieldProps) => (
  <BaseField.Root
    data-slot='field'
    invalid={Boolean(error) || props.invalid}
    className={mergeClassName(
      'group/field flex w-full flex-col gap-2 data-invalid:text-destructive',
      className,
    )}
    {...props}
  >
    {label && (
      <BaseField.Label
        data-slot='field-label'
        className='flex w-fit items-center gap-2 text-sm leading-snug font-medium select-none group-data-disabled/field:opacity-50'
      >
        {label}
      </BaseField.Label>
    )}
    {children}
    {description && (
      <BaseField.Description
        data-slot='field-description'
        className='text-start text-sm leading-normal font-normal text-muted-foreground'
      >
        {description}
      </BaseField.Description>
    )}
    {error && (
      <BaseField.Error
        data-slot='field-error'
        className='text-sm font-normal text-destructive'
        match
      >
        {error}
      </BaseField.Error>
    )}
  </BaseField.Root>
)

export type { FieldProps }
export { Field }
