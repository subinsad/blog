/*
  TipTap 커맨드 타입은 각 확장 패키지가 module augmentation으로 선언한다.
  StarterKit이 런타임에 전부 묶어주더라도, 타입은 해당 모듈이 프로그램에
  포함돼야 붙는다. pnpm은 직접 의존성만 최상위에 노출하므로 여기서 한 번에
  참조해 프로젝트 전역에 커맨드 타입을 등록한다.
*/
import type {} from '@tiptap/extension-bold'
import type {} from '@tiptap/extension-italic'
import type {} from '@tiptap/extension-underline'
import type {} from '@tiptap/extension-strike'
import type {} from '@tiptap/extension-code'
import type {} from '@tiptap/extension-code-block'
import type {} from '@tiptap/extension-link'
import type {} from '@tiptap/extension-list'
import type {} from '@tiptap/extension-blockquote'
import type {} from '@tiptap/extension-heading'
import type {} from '@tiptap/extension-horizontal-rule'
import type {} from '@tiptap/extensions'
