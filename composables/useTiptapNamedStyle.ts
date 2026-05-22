import { Mark, mergeAttributes } from '@tiptap/core'

// Matches any class starting with ts- so we can remove stale named style classes
const TS_CLASS_RE = /\bts-[a-z0-9-]+\b/g

export const NamedStyle = Mark.create({
  name: 'namedStyle',

  addAttributes() {
    return {
      class: {
        default: null,
        parseHTML: el => {
          const cls = Array.from(el.classList).find(c => c.startsWith('ts-'))
          return cls ?? null
        },
        renderHTML: attrs => attrs.class ? { class: attrs.class } : {},
      },
    }
  },

  parseHTML() {
    return [{ tag: 'span', getAttrs: el => (el as HTMLElement).className.match(TS_CLASS_RE) ? null : false }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes), 0]
  },

  addCommands() {
    return {
      setNamedStyle: (className: string) => ({ chain }) => {
        return chain().setMark('namedStyle', { class: className }).run()
      },
      unsetNamedStyle: () => ({ chain }) => {
        return chain().unsetMark('namedStyle').run()
      },
    }
  },
})
