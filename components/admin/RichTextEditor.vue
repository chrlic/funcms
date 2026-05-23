<script setup lang="ts">
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import TextAlign from '@tiptap/extension-text-align'
import Placeholder from '@tiptap/extension-placeholder'
import { NamedStyle } from '~/composables/useTiptapNamedStyle'
import { slugifyStyle } from '~/composables/useTypography'

const props = defineProps<{ modelValue: string; placeholder?: string; locale?: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const { namedStyles } = useTypography()

const { pages, load: loadPages } = usePagePicker()

const showLinkDialog = ref(false)
const linkHref = ref('')
const linkNewTab = ref(false)
const linkMode = ref<'page' | 'url'>('page')
// The locale code to use for prefixing page links (e.g. 'en', 'de')
const linkLocale = ref('')

function openLinkDialog() {
  const prev = editor.value?.getAttributes('link')
  linkHref.value = prev?.href ?? ''
  linkNewTab.value = prev?.target === '_blank'
  linkMode.value = linkHref.value.startsWith('/') || linkHref.value === '' ? 'page' : 'url'
  linkLocale.value = props.locale ?? ''
  loadPages()
  showLinkDialog.value = true
}

function pageUrl(page: { slug: string; locales?: Record<string, unknown> }): string {
  const locale = linkLocale.value
  if (!locale) return page.slug
  const bare = page.slug.replace(/^\/[a-z]{2}(?:-[a-zA-Z]{2,4})?(?=\/|$)/i, '') || '/'
  return `/${locale}${bare === '/' ? '' : bare}`
}

function pageHasLocale(page: { locales?: Record<string, unknown> }): boolean {
  const locale = linkLocale.value
  if (!locale) return true
  return !!page.locales?.[locale]
}

function applyLink() {
  if (!linkHref.value) {
    editor.value?.chain().focus().unsetLink().run()
  } else {
    editor.value?.chain().focus().setLink({
      href: linkHref.value,
      target: linkNewTab.value ? '_blank' : null,
      rel: linkNewTab.value ? 'noopener noreferrer' : null,
    }).run()
  }
  showLinkDialog.value = false
}

function removeLink() {
  editor.value?.chain().focus().unsetLink().run()
  showLinkDialog.value = false
}

const editor = useEditor({
  content: props.modelValue,
  extensions: [
    StarterKit.configure({ link: { openOnClick: false, HTMLAttributes: { rel: 'noopener noreferrer' } } }),
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    Placeholder.configure({ placeholder: props.placeholder ?? 'Start writing…' }),
    NamedStyle,
  ],
  onUpdate({ editor }) {
    emit('update:modelValue', editor.getHTML())
  },
})

watch(() => props.modelValue, (val) => {
  if (editor.value && editor.value.getHTML() !== val) {
    editor.value.commands.setContent(val, false)
  }
})

onBeforeUnmount(() => editor.value?.destroy())

// Inline SVG icons for toolbar buttons
const svg = {
  bold: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4"><path fill-rule="evenodd" d="M6 4.75A.75.75 0 0 1 6.75 4h6a4.25 4.25 0 0 1 2.596 7.616A4.25 4.25 0 0 1 12.75 20H6.75a.75.75 0 0 1-.75-.75V4.75Zm1.5.75v5.5h5.25a2.75 2.75 0 0 0 0-5.5H7.5Zm0 7v6h6.25a2.75 2.75 0 0 0 0-5.5H7.5Z" clip-rule="evenodd"/></svg>',
  italic: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4"><path fill-rule="evenodd" d="M10.5 4.75a.75.75 0 0 0-.75.75v.765l-2.373 9.02H5.75a.75.75 0 0 0 0 1.5h4a.75.75 0 0 0 0-1.5h-1.624l2.373-9.02H12.5v.265a.75.75 0 0 0 1.5 0V5.5a.75.75 0 0 0-.75-.75h-2.75Z" clip-rule="evenodd"/></svg>',
  underline: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4"><path fill-rule="evenodd" d="M5.75 4a.75.75 0 0 1 .75.75v6.5a5.5 5.5 0 0 0 11 0v-6.5a.75.75 0 0 1 1.5 0v6.5a7 7 0 0 1-14 0v-6.5A.75.75 0 0 1 5.75 4ZM4 19.25a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H4.75a.75.75 0 0 1-.75-.75Z" clip-rule="evenodd"/></svg>',
  strike: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4"><path fill-rule="evenodd" d="M3.25 12a.75.75 0 0 1 .75-.75h16a.75.75 0 0 1 0 1.5H4a.75.75 0 0 1-.75-.75ZM8 6.5a3.5 3.5 0 0 1 6.965-.476.75.75 0 0 1-1.493.148A2 2 0 0 0 9.5 6.5v.25H8V6.5Zm0 10.75V17h1.5v.25a2 2 0 0 0 3.972-.352.75.75 0 0 1 1.493.148A3.5 3.5 0 0 1 8 17.25v-.25H8Z" clip-rule="evenodd"/></svg>',
  h1: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4"><path fill-rule="evenodd" d="M3.75 5a.75.75 0 0 1 .75.75v5h7.5v-5a.75.75 0 0 1 1.5 0v11.5a.75.75 0 0 1-1.5 0v-5h-7.5v5a.75.75 0 0 1-1.5 0V5.75A.75.75 0 0 1 3.75 5Zm13 0a.75.75 0 0 1 .69.46l.008.019V5.5a.75.75 0 0 1-.698.997L15.75 6.5v-1H15l1.5-1h.25Z" clip-rule="evenodd"/></svg>',
  h2: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4"><path d="M3.75 5a.75.75 0 0 1 .75.75v5h7.5v-5a.75.75 0 0 1 1.5 0v11.5a.75.75 0 0 1-1.5 0v-5h-7.5v5a.75.75 0 0 1-1.5 0V5.75A.75.75 0 0 1 3.75 5Zm12.5 0a2.5 2.5 0 0 1 1.912 4.144l-2.158 2.606H20a.75.75 0 0 1 0 1.5h-3.75a.75.75 0 0 1-.576-1.232l2.89-3.493A1 1 0 0 0 16.25 7a1 1 0 0 0-1 1 .75.75 0 0 1-1.5 0 2.5 2.5 0 0 1 2.5-2.5Z"/></svg>',
  h3: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4"><path d="M3.75 5a.75.75 0 0 1 .75.75v5h7.5v-5a.75.75 0 0 1 1.5 0v11.5a.75.75 0 0 1-1.5 0v-5h-7.5v5a.75.75 0 0 1-1.5 0V5.75A.75.75 0 0 1 3.75 5Zm12.5 0a2.5 2.5 0 0 1 1.641 4.395A2.5 2.5 0 0 1 16.25 14h-.5a2.5 2.5 0 0 1-2.5-2.5.75.75 0 0 1 1.5 0 1 1 0 0 0 1 1h.5a1 1 0 1 0 0-2 .75.75 0 0 1 0-1.5 1 1 0 1 0 0-2h-.5a1 1 0 0 0-1 1 .75.75 0 0 1-1.5 0 2.5 2.5 0 0 1 2.5-2.5h.5Z"/></svg>',
  ul: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4"><path fill-rule="evenodd" d="M2.625 6.75a1.125 1.125 0 1 1 2.25 0 1.125 1.125 0 0 1-2.25 0Zm4.875 0A.75.75 0 0 1 8.25 6h12a.75.75 0 0 1 0 1.5h-12A.75.75 0 0 1 7.5 6.75Zm-4.875 5.25a1.125 1.125 0 1 1 2.25 0 1.125 1.125 0 0 1-2.25 0Zm4.875 0a.75.75 0 0 1 .75-.75h12a.75.75 0 0 1 0 1.5h-12a.75.75 0 0 1-.75-.75Zm-4.875 5.25a1.125 1.125 0 1 1 2.25 0 1.125 1.125 0 0 1-2.25 0Zm4.875 0a.75.75 0 0 1 .75-.75h12a.75.75 0 0 1 0 1.5h-12a.75.75 0 0 1-.75-.75Z" clip-rule="evenodd"/></svg>',
  ol: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4"><path fill-rule="evenodd" d="M3 6.75A.75.75 0 0 1 3.75 6h.75V4.811a.75.75 0 0 1 .774-.75l.984.055A.75.75 0 0 1 6 4.86v1.89h.75a.75.75 0 0 1 0 1.5h-3A.75.75 0 0 1 3 7.5v-.75ZM3 12a.75.75 0 0 1 .75-.75H4.5v-.75a.75.75 0 0 1 1.5 0v.75h.75a.75.75 0 0 1 0 1.5H6a.75.75 0 0 0 0 .75.75.75 0 0 1-1.5 0A.75.75 0 0 0 3.75 13H3a.75.75 0 0 1 0-1.5v.5Zm5.25-6a.75.75 0 0 1 .75-.75h9a.75.75 0 0 1 0 1.5H9A.75.75 0 0 1 8.25 6Zm0 6a.75.75 0 0 1 .75-.75h9a.75.75 0 0 1 0 1.5H9A.75.75 0 0 1 8.25 12Zm0 6a.75.75 0 0 1 .75-.75h9a.75.75 0 0 1 0 1.5H9a.75.75 0 0 1-.75-.75ZM3 18.75a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 0 1.5H3.75a.75.75 0 0 1-.75-.75Z" clip-rule="evenodd"/></svg>',
  blockquote: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4"><path fill-rule="evenodd" d="M4.804 21.644A6.707 6.707 0 0 0 6 21.75a6.721 6.721 0 0 0 3.583-1.029c.774.182 1.584.279 2.417.279 5.322 0 9.75-3.97 9.75-9 0-5.03-4.428-9-9.75-9s-9.75 3.97-9.75 9c0 2.409 1.025 4.587 2.674 6.192.232.226.277.428.254.543a3.73 3.73 0 0 1-.814 1.686.75.75 0 0 0 .44 1.223ZM8.25 10.875a1.125 1.125 0 1 0 0 2.25 1.125 1.125 0 0 0 0-2.25ZM10.875 12a1.125 1.125 0 1 1 2.25 0 1.125 1.125 0 0 1-2.25 0Zm4.875-1.125a1.125 1.125 0 1 0 0 2.25 1.125 1.125 0 0 0 0-2.25Z" clip-rule="evenodd"/></svg>',
  hr: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4"><path fill-rule="evenodd" d="M3 12a.75.75 0 0 1 .75-.75h16.5a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 12Z" clip-rule="evenodd"/></svg>',
  alignLeft: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4"><path fill-rule="evenodd" d="M3 6.75A.75.75 0 0 1 3.75 6h16.5a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 6.75ZM3 12a.75.75 0 0 1 .75-.75H12a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 12Zm0 5.25a.75.75 0 0 1 .75-.75h16.5a.75.75 0 0 1 0 1.5H3.75a.75.75 0 0 1-.75-.75Z" clip-rule="evenodd"/></svg>',
  alignCenter: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4"><path fill-rule="evenodd" d="M3 6.75A.75.75 0 0 1 3.75 6h16.5a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 6.75ZM6 12a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H6.75A.75.75 0 0 1 6 12Zm-3 5.25a.75.75 0 0 1 .75-.75h16.5a.75.75 0 0 1 0 1.5H3.75a.75.75 0 0 1-.75-.75Z" clip-rule="evenodd"/></svg>',
  alignRight: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4"><path fill-rule="evenodd" d="M3 6.75A.75.75 0 0 1 3.75 6h16.5a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 6.75ZM12 12a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5h-7.5A.75.75 0 0 1 12 12Zm-8.25 5.25a.75.75 0 0 1 .75-.75h16.5a.75.75 0 0 1 0 1.5H3.75a.75.75 0 0 1-.75-.75Z" clip-rule="evenodd"/></svg>',
  link: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4"><path fill-rule="evenodd" d="M19.902 4.098a3.75 3.75 0 0 0-5.304 0l-4.5 4.5a3.75 3.75 0 0 0 1.035 6.037.75.75 0 0 1-.646 1.353 5.25 5.25 0 0 1-1.449-8.45l4.5-4.5a5.25 5.25 0 1 1 7.424 7.424l-1.757 1.757a.75.75 0 1 1-1.06-1.06l1.757-1.757a3.75 3.75 0 0 0 0-5.304Zm-7.389 4.267a.75.75 0 0 1 1-.353 5.25 5.25 0 0 1 1.449 8.45l-4.5 4.5a5.25 5.25 0 1 1-7.424-7.424l1.757-1.757a.75.75 0 1 1 1.06 1.06l-1.757 1.757a3.75 3.75 0 1 0 5.304 5.304l4.5-4.5a3.75 3.75 0 0 0-1.035-6.037.75.75 0 0 1-.354-1Z" clip-rule="evenodd"/></svg>',
  clear: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4"><path fill-rule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25Zm-1.72 6.97a.75.75 0 1 0-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 1 0 1.06 1.06L12 13.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L13.06 12l1.72-1.72a.75.75 0 1 0-1.06-1.06L12 10.94l-1.72-1.72Z" clip-rule="evenodd"/></svg>',
}

// ─── Named style picker ──────────────────────────────────────────────────────

const fontDropdownOpen = ref(false)

function closeFontDropdown() { fontDropdownOpen.value = false }
onMounted(() => document.addEventListener('click', closeFontDropdown))
onBeforeUnmount(() => document.removeEventListener('click', closeFontDropdown))

const activeStyleClass = computed(() => editor.value?.getAttributes('namedStyle')?.class ?? '')
const activeStyleName = computed(() => {
  const cls = activeStyleClass.value
  return namedStyles.value.find(s => slugifyStyle(s.name) === cls.replace('ts-', ''))?.name ?? 'Style'
})

function pickStyle(name: string) {
  fontDropdownOpen.value = false
  const e = editor.value
  if (!e) return
  if (!name) {
    e.chain().focus().unsetNamedStyle().run()
  } else {
    e.chain().focus().setNamedStyle(`ts-${slugifyStyle(name)}`).run()
  }
}

type TipBtn = { icon: keyof typeof svg; title: string; action: () => void; active?: () => boolean }

const toolbarGroups: TipBtn[][] = [
  [
    { icon: 'bold',    title: 'Bold',          action: () => editor.value?.chain().focus().toggleBold().run(),        active: () => !!editor.value?.isActive('bold') },
    { icon: 'italic',  title: 'Italic',        action: () => editor.value?.chain().focus().toggleItalic().run(),      active: () => !!editor.value?.isActive('italic') },
    { icon: 'underline', title: 'Underline',   action: () => editor.value?.chain().focus().toggleUnderline().run(),   active: () => !!editor.value?.isActive('underline') },
    { icon: 'strike',  title: 'Strikethrough', action: () => editor.value?.chain().focus().toggleStrike().run(),      active: () => !!editor.value?.isActive('strike') },
  ],
  [
    { icon: 'h1', title: 'Heading 1', action: () => editor.value?.chain().focus().toggleHeading({ level: 1 }).run(), active: () => !!editor.value?.isActive('heading', { level: 1 }) },
    { icon: 'h2', title: 'Heading 2', action: () => editor.value?.chain().focus().toggleHeading({ level: 2 }).run(), active: () => !!editor.value?.isActive('heading', { level: 2 }) },
    { icon: 'h3', title: 'Heading 3', action: () => editor.value?.chain().focus().toggleHeading({ level: 3 }).run(), active: () => !!editor.value?.isActive('heading', { level: 3 }) },
  ],
  [
    { icon: 'ul',         title: 'Bullet list',  action: () => editor.value?.chain().focus().toggleBulletList().run(),  active: () => !!editor.value?.isActive('bulletList') },
    { icon: 'ol',         title: 'Ordered list', action: () => editor.value?.chain().focus().toggleOrderedList().run(), active: () => !!editor.value?.isActive('orderedList') },
    { icon: 'blockquote', title: 'Blockquote',   action: () => editor.value?.chain().focus().toggleBlockquote().run(),  active: () => !!editor.value?.isActive('blockquote') },
    { icon: 'hr',         title: 'Divider',      action: () => editor.value?.chain().focus().setHorizontalRule().run() },
  ],
  [
    { icon: 'alignLeft',   title: 'Align left',   action: () => editor.value?.chain().focus().setTextAlign('left').run(),   active: () => !!editor.value?.isActive({ textAlign: 'left' }) },
    { icon: 'alignCenter', title: 'Align center', action: () => editor.value?.chain().focus().setTextAlign('center').run(), active: () => !!editor.value?.isActive({ textAlign: 'center' }) },
    { icon: 'alignRight',  title: 'Align right',  action: () => editor.value?.chain().focus().setTextAlign('right').run(),  active: () => !!editor.value?.isActive({ textAlign: 'right' }) },
  ],
]
</script>

<template>
  <div class="border rounded-xl overflow-hidden dark:border-gray-600 focus-within:ring-2 focus-within:ring-indigo-500">
    <!-- Toolbar -->
    <div class="flex flex-wrap gap-0.5 p-1.5 bg-gray-50 dark:bg-gray-700 border-b dark:border-gray-600">
      <template v-for="(group, gi) in toolbarGroups" :key="gi">
        <button
          v-for="btn in group"
          :key="btn.title"
          :title="btn.title"
          type="button"
          :class="[
            'p-1.5 rounded text-sm transition',
            btn.active?.() ? 'bg-indigo-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600',
          ]"
          @mousedown.prevent="btn.action()"
          v-html="svg[btn.icon]"
        />
        <div v-if="gi < toolbarGroups.length - 1" class="w-px bg-gray-200 dark:bg-gray-600 mx-0.5 self-stretch" />
      </template>

      <div class="w-px bg-gray-200 dark:bg-gray-600 mx-0.5 self-stretch" />

      <!-- Link -->
      <button
        title="Link"
        type="button"
        :class="['p-1.5 rounded text-sm transition', editor?.isActive('link') ? 'bg-indigo-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600']"
        @mousedown.prevent="openLinkDialog"
        v-html="svg.link"
      />

      <!-- Named style picker — only shown when styles are configured in Settings → Typography -->
      <template v-if="namedStyles.length">
        <div class="w-px bg-gray-200 dark:bg-gray-600 mx-0.5 self-stretch" />
        <div class="relative flex items-center">
          <button
            type="button"
            title="Named style"
            class="flex items-center gap-1 h-7 pl-2 pr-1 rounded text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition"
            @mousedown.prevent="fontDropdownOpen = !fontDropdownOpen"
            @click.stop
          >
            {{ activeStyleName }}
            <svg class="w-3 h-3 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd"/></svg>
          </button>
          <div v-if="fontDropdownOpen" class="absolute top-full left-0 z-50 mt-1 bg-white dark:bg-gray-800 border dark:border-gray-600 rounded-lg shadow-lg py-1 min-w-max">
            <button
              type="button"
              class="w-full text-left px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              @mousedown.prevent.stop="pickStyle('')"
            >Default</button>
            <button
              v-for="s in namedStyles"
              :key="s.name"
              type="button"
              class="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              :class="`ts-${slugifyStyle(s.name)}` === activeStyleClass ? 'text-indigo-600 dark:text-indigo-400 font-medium' : 'text-gray-700 dark:text-gray-300'"
              @mousedown.prevent.stop="pickStyle(s.name)"
            >{{ s.name }}</button>
          </div>
        </div>
      </template>

      <div class="flex-1" />

      <!-- Clear formatting -->
      <button
        title="Clear formatting"
        type="button"
        class="p-1.5 rounded text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition"
        @mousedown.prevent="editor?.chain().focus().clearNodes().unsetAllMarks().run()"
        v-html="svg.clear"
      />
    </div>

    <EditorContent
      :editor="editor"
      class="prose prose-sm dark:prose-invert max-w-none px-4 py-3 min-h-[8rem] focus:outline-none dark:bg-gray-800 dark:text-white [&_.tiptap]:outline-none [&_.tiptap.is-empty_p.is-empty::before]:text-gray-400 [&_.tiptap.is-empty_p.is-empty::before]:content-[attr(data-placeholder)] [&_.tiptap.is-empty_p.is-empty::before]:pointer-events-none [&_.tiptap.is-empty_p.is-empty::before]:float-left [&_.tiptap.is-empty_p.is-empty::before]:h-0"
    />

    <!-- Link dialog -->
    <Teleport to="body">
      <div v-if="showLinkDialog" class="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" @click.self="showLinkDialog = false">
        <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
          <h3 class="font-bold text-gray-900 dark:text-white">Insert link</h3>
          <div class="flex rounded-lg border dark:border-gray-600 overflow-hidden text-sm w-fit">
            <button :class="['px-4 py-2 font-medium transition', linkMode === 'page' ? 'bg-indigo-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700']" @click="linkMode = 'page'; linkHref = ''">Page</button>
            <button :class="['px-4 py-2 font-medium transition', linkMode === 'url'  ? 'bg-indigo-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700']" @click="linkMode = 'url'; linkHref = linkHref.startsWith('/') ? 'https://' : linkHref">URL</button>
          </div>
          <div v-if="linkMode === 'page'">
            <!-- Locale selector: shown when the editor has a locale, allows switching target locale -->
            <div v-if="locale" class="flex items-center gap-2 mb-2">
              <label class="text-xs font-medium text-gray-500">Link locale:</label>
              <button
                :class="['px-2 py-0.5 text-xs rounded-full font-medium transition', !linkLocale ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200']"
                @click="linkLocale = ''; linkHref = ''"
              >Default</button>
              <button
                :class="['px-2 py-0.5 text-xs rounded-full font-medium transition', linkLocale === locale ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200']"
                @click="linkLocale = locale; linkHref = ''"
              >{{ locale.toUpperCase() }}</button>
            </div>
            <label class="block text-xs font-medium text-gray-500 mb-1">Select page</label>
            <select
              :value="linkHref"
              @change="linkHref = ($event.target as HTMLSelectElement).value"
              class="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="">— select a page —</option>
              <template v-for="p in pages" :key="p._id">
                <option v-if="!linkLocale || pageHasLocale(p)" :value="pageUrl(p)">
                  {{ p.title }} ({{ pageUrl(p) }})
                </option>
              </template>
            </select>
            <p v-if="linkLocale && pages.filter(p => pageHasLocale(p)).length === 0" class="mt-1 text-xs text-gray-400">
              No pages have a <strong>{{ linkLocale }}</strong> variant yet.
            </p>
          </div>
          <div v-else>
            <label class="block text-xs font-medium text-gray-500 mb-1">URL</label>
            <input v-model="linkHref" type="url" placeholder="https://example.com" class="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" @keydown.enter.prevent="applyLink" />
          </div>
          <label class="flex items-center gap-2 cursor-pointer text-sm text-gray-700 dark:text-gray-300">
            <input type="checkbox" v-model="linkNewTab" class="rounded" /> Open in new tab
          </label>
          <div class="flex gap-2 justify-end pt-1">
            <button v-if="editor?.isActive('link')" class="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition" @click="removeLink">Remove link</button>
            <button class="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition" @click="showLinkDialog = false">Cancel</button>
            <button class="px-4 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50" :disabled="!linkHref" @click="applyLink">Apply</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
