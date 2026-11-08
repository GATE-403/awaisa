import type { ComponentProps } from 'react'
import styles from './Container.module.css'

interface ContainerProps extends ComponentProps<'div'> {
  size?: 'md' | 'lg'
}

export const Container = ({ size = 'lg', className, ...props }: ContainerProps) => (
  <div
    data-size={size}
    className={className ? `${styles.container} ${className}` : styles.container}
    {...props}
  />
)
