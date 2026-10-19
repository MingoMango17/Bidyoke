import type { ComponentProps } from 'react'
import { buttonStyles, type StyleOptions } from './buttonStyles'

type Props = ComponentProps<'button'> & StyleOptions

export function Button({ variant, size, block, className = '', type = 'button', ...rest }: Props) {
  return <button type={type} className={`${buttonStyles({ variant, size, block })} ${className}`} {...rest} />
}
