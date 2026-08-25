import Paragraph from '@tiptap/extension-paragraph'

/**
 * 크기는 임의 px이 아니라 블록 타입이다. (DESIGN.md §13.9)
 * '작은 글씨'는 문단의 속성으로 두고 <Caption>으로 직렬화한다.
 */
export const CaptionParagraph = Paragraph.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      caption: {
        default: false,
        parseHTML: (el: HTMLElement) => el.classList.contains('is-caption'),
        renderHTML: (attrs: Record<string, unknown>) =>
          attrs.caption ? { class: 'is-caption' } : {},
      },
    }
  },
})
