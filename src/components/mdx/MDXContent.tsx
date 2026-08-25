import * as runtime from 'react/jsx-runtime'
import { Mark } from './Mark'
import { Caption } from './Caption'
import { Callout } from './Callout'

const components = { Mark, Caption, Callout }

/** velite가 컴파일한 MDX 함수 본문을 컴포넌트로 되살린다. */
export function MDXContent({ code }: { code: string }) {
  const fn = new Function(code)
  const Component = fn({ ...runtime }).default
  return <Component components={components} />
}
