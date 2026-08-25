import { Extension, type Editor, type Range } from '@tiptap/core'
import Suggestion from '@tiptap/suggestion'
import { filterSlashItems, type SlashItem } from './slash-items'

export type SlashState = {
  open: boolean
  items: SlashItem[]
  index: number
  rect: { left: number; top: number; bottom: number } | null
  select: (i: number) => void
}

type Options = {
  onUpdate: (state: Omit<SlashState, 'select'> & { command: (i: SlashItem) => void }) => void
}

/**
 * 슬래시 메뉴. 팝업은 React가 그리고, 이 확장은 상태만 올려보낸다.
 * tippy 같은 추가 의존성을 들이지 않기 위한 구성.
 */
export const SlashCommand = Extension.create<Options>({
  name: 'slashCommand',

  addOptions() {
    return { onUpdate: () => {} }
  },

  addProseMirrorPlugins() {
    const onUpdate = this.options.onUpdate

    return [
      Suggestion<SlashItem>({
        editor: this.editor,
        char: '/',
        startOfLine: false,
        allowSpaces: false,
        items: ({ query }) => filterSlashItems(query),
        command: ({ editor, range, props }) => props.run(editor, range),

        render: () => {
          let items: SlashItem[] = []
          let index = 0
          let cmd: ((item: SlashItem) => void) | null = null

          const push = (rect: DOMRect | null) =>
            onUpdate({
              open: items.length > 0,
              items,
              index,
              rect: rect
                ? { left: rect.left, top: rect.top, bottom: rect.bottom }
                : null,
              command: (item) => cmd?.(item),
            })

          return {
            onStart: (props) => {
              items = props.items
              index = 0
              cmd = (item) => props.command(item)
              push(props.clientRect?.() ?? null)
            },
            onUpdate: (props) => {
              items = props.items
              if (index >= items.length) index = 0
              cmd = (item) => props.command(item)
              push(props.clientRect?.() ?? null)
            },
            onKeyDown: (props) => {
              if (items.length === 0) return false
              const { key } = props.event
              if (key === 'ArrowDown') {
                index = (index + 1) % items.length
                push(null)
                return true
              }
              if (key === 'ArrowUp') {
                index = (index - 1 + items.length) % items.length
                push(null)
                return true
              }
              if (key === 'Enter') {
                cmd?.(items[index])
                return true
              }
              if (key === 'Escape') {
                items = []
                push(null)
                return true
              }
              return false
            },
            onExit: () => {
              items = []
              onUpdate({ open: false, items: [], index: 0, rect: null, command: () => {} })
            },
          }
        },
      }),
    ]
  },
})

export type { Editor, Range }
