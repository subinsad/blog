import { Mark, mergeAttributes } from '@tiptap/core'
import { isMarkColor, markAlpha, type MarkColor } from './marks'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    colorMarks: {
      setTextColor: (color: MarkColor | null) => ReturnType
      setBgColor: (color: MarkColor | null) => ReturnType
    }
  }
}

const attrs = {
  color: {
    default: null as MarkColor | null,
    parseHTML: (el: HTMLElement) => el.getAttribute('data-color'),
    renderHTML: (a: Record<string, unknown>) =>
      a.color ? { 'data-color': a.color as string } : {},
  },
}

export const TextColor = Mark.create({
  name: 'textColor',
  addAttributes: () => attrs,
  parseHTML: () => [{ tag: 'span[data-color][data-kind="fg"]' }],
  renderHTML({ HTMLAttributes, mark }) {
    const c = mark.attrs.color as MarkColor
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-kind': 'fg',
        class: 'mark-fg',
        style: `--mark-c: var(--m-${c})`,
      }),
      0,
    ]
  },
  addCommands() {
    return {
      setTextColor:
        (color) =>
        ({ commands }) =>
          color ? commands.setMark(this.name, { color }) : commands.unsetMark(this.name),
    }
  },
})

export const BgColor = Mark.create({
  name: 'bgColor',
  addAttributes: () => attrs,
  parseHTML: () => [{ tag: 'span[data-color][data-kind="bg"]' }],
  renderHTML({ HTMLAttributes, mark }) {
    const c = mark.attrs.color as MarkColor
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-kind': 'bg',
        class: 'mark-bg',
        style: `--mark-c: var(--m-${c}); --mark-a: ${isMarkColor(c) ? markAlpha(c) : '20%'}`,
      }),
      0,
    ]
  },
  addCommands() {
    return {
      setBgColor:
        (color) =>
        ({ commands }) =>
          color ? commands.setMark(this.name, { color }) : commands.unsetMark(this.name),
    }
  },
})
