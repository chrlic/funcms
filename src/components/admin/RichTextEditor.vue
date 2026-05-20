<script setup lang="ts">
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import Placeholder from '@tiptap/extension-placeholder'

const props = defineProps<{ modelValue: string; placeholder?: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const { pages, load: loadPages } = usePagePicker()

// ─── Link dialog state ────────────────────────────────────────────────────────
const showLinkDialog = ref(false)
const linkHref = ref('')
const linkNewTab = ref(false)
const linkMode = ref<'page' | 'url'>('page')

function openLinkDialog() {
  const prev = editor.value?.getAttributes('link')
  linkHref.value = prev?.href ?? ''
  linkNewTab.value = prev?.target === '_blank'
  linkMode.value = linkHref.value.startsWith('/') || linkHref.value === '' ? 'page' : 'url'
  loadPages()
  showLinkDialog.value = true
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

// ─── Editor setup ─────────────────────────────────────────────────────────────
const editor = useEditor({
  content: props.modelValue,
  extensions: [
    StarterKit,
    Underline,
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    Link.configure({ openOnClick: false, HTMLAttributes: { rel: 'noopener noreferrer' } }),
    Placeholder.configure({ placeholder: props.placeholder ?? 'Start writing…' }),
  ],
  onUpdate({ editor }) {
    emit('update:modelValue', editor.getHTML())
  },
})

// Keep editor in sync when value changes externally (e.g. block swap)
watch(() => props.modelValue, (val) => {
  if (editor.value && editor.value.getHTML() !== val) {
    editor.value.commands.setContent(val, false)
  }
})

onBeforeUnmount(() => editor.value?.destroy())

// ─── Toolbar helpers ──────────────────────────────────────────────────────────
type TipBtn = { icon: string; title: string; action: () => void; active?: () => boolean }

const toolbarGroups: TipBtn[][] = [
  [
    { icon: 'i-heroicons-bold', title: 'Bold', action: () => editor.value?.chain().focus().toggleBold().run(), active: () => !!editor.value?.isActive('bold') },
    { icon: 'i-heroicons-italic', title: 'Italic', action: () => editor.value?.chain().focus().toggleItalic().run(), active: () => !!editor.value?.isActive('italic') },
    { icon: 'i-heroicons-underline', title: 'Underline', action: () => editor.value?.chain().focus().toggleUnderline().run(), active: () => !!editor.value?.isActive('underline') },
    { icon: 'i-heroicons-strikethrough', title: 'Strikethrough', action: () => editor.value?.chain().focus().toggleStrike().run(), active: () => !!editor.value?.isActive('strike') },
  ],
  [
    { icon: 'i-heroicons-h1', title: 'Heading 1', action: () => editor.value?.chain().focus().toggleHeading({ level: 1 }).run(), active: () => !!editor.value?.isActive('heading', { level: 1 }) },
    { icon: 'i-heroicons-h2', title: 'Heading 2', action: () => editor.value?.chain().focus().toggleHeading({ level: 2 }).run(), active: () => !!editor.value?.isActive('heading', { level: 2 }) },
    { icon: 'i-heroicons-h3', title: 'Heading 3', action: () => editor.value?.chain().focus().toggleHeading({ level: 3 }).run(), active: () => !!editor.value?.isActive('heading', { level: 3 }) },
  ],
  [
    { icon: 'i-heroicons-list-bullet', title: 'Bullet list', action: () => editor.value?.chain().focus().toggleBulletList().run(), active: () => !!editor.value?.isActive('bulletList') },
    { icon: 'i-heroicons-numbered-list', title: 'Ordered list', action: () => editor.value?.chain().focus().toggleOrderedList().run(), active: () => !!editor.value?.isActive('orderedList') },
    { icon: 'i-heroicons-chat-bubble-bottom-center-text', title: 'Blockquote', action: () => editor.value?.chain().focus().toggleBlockquote().run(), active: () => !!editor.value?.isActive('blockquote') },
    { icon: 'i-heroicons-minus', title: 'Divider', action: () => editor.value?.chain().focus().setHorizontalRule().run() },
  ],
  [
    { icon: 'i-heroicons-bars-3-bottom-left', title: 'Align left', action: () => editor.value?.chain().focus().setTextAlign('left').run(), active: () => !!editor.value?.isActive({ textAlign: 'left' }) },
    { icon: 'i-heroicons-bars-3', title: 'Align center', action: () => editor.value?.chain().focus().setTextAlign('center').run(), active: () => !!editor.value?.isActive({ textAlign: 'center' }) },
    { icon: 'i-heroicons-bars-3-bottom-right', title: 'Align right', action: () => editor.value?.chain().focus().setTextAlign('right').run(), active: () => !!editor.value?.isActive({ textAlign: 'right' }) },
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
        >
          <Icon :name="btn.icon" class="w-4 h-4" />
        </button>
        <div v-if="gi < toolbarGroups.length - 1" class="w-px bg-gray-200 dark:bg-gray-600 mx-0.5 self-stretch" />
      </template>

      <!-- Separator before link -->
      <div class="w-px bg-gray-200 dark:bg-gray-600 mx-0.5 self-stretch" />

      <!-- Link button -->
      <button
        title="Link"
        type="button"
        :class="[
          'p-1.5 rounded text-sm transition',
          editor?.isActive('link') ? 'bg-indigo-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600',
        ]"
        @mousedown.prevent="openLinkDialog"
      >
        <Icon name="i-heroicons-link" class="w-4 h-4" />
      </button>

      <div class="flex-1" />

      <!-- Clear formatting -->
      <button
        title="Clear formatting"
        type="button"
        class="p-1.5 rounded text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition"
        @mousedown.prevent="editor?.chain().focus().clearNodes().unsetAllMarks().run()"
      >
        <Icon name="i-heroicons-x-circle" class="w-4 h-4" />
      </button>
    </div>

    <!-- Editor area -->
    <EditorContent
      :editor="editor"
      class="prose prose-sm dark:prose-invert max-w-none px-4 py-3 min-h-[8rem] focus:outline-none dark:bg-gray-800 dark:text-white [&_.tiptap]:outline-none [&_.tiptap.is-empty_p.is-empty::before]:text-gray-400 [&_.tiptap.is-empty_p.is-empty::before]:content-[attr(data-placeholder)] [&_.tiptap.is-empty_p.is-empty::before]:pointer-events-none [&_.tiptap.is-empty_p.is-empty::before]:float-left [&_.tiptap.is-empty_p.is-empty::before]:h-0"
    />

    <!-- Link dialog -->
    <Teleport to="body">
      <div v-if="showLinkDialog" class="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" @click.self="showLinkDialog = false">
        <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
          <h3 class="font-bold text-gray-900 dark:text-white">Insert link</h3>

          <!-- Mode tabs -->
          <div class="flex rounded-lg border dark:border-gray-600 overflow-hidden text-sm w-fit">
            <button
              :class="['px-4 py-2 font-medium transition', linkMode === 'page' ? 'bg-indigo-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700']"
              @click="linkMode = 'page'; linkHref = ''"
            >Page</button>
            <button
              :class="['px-4 py-2 font-medium transition', linkMode === 'url' ? 'bg-indigo-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700']"
              @click="linkMode = 'url'; linkHref = linkHref.startsWith('/') ? 'https://' : linkHref"
            >URL</button>
          </div>

          <!-- Page picker -->
          <div v-if="linkMode === 'page'">
            <label class="block text-xs font-medium text-gray-500 mb-1">Select page</label>
            <select v-model="linkHref" class="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white">
              <option value="">— select a page —</option>
              <option v-for="p in pages" :key="p._id" :value="p.slug">{{ p.title }} ({{ p.slug }})</option>
            </select>
          </div>

          <!-- URL input -->
          <div v-else>
            <label class="block text-xs font-medium text-gray-500 mb-1">URL</label>
            <input
              v-model="linkHref"
              type="url"
              placeholder="https://example.com"
              class="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              @keydown.enter.prevent="applyLink"
            />
          </div>

          <label class="flex items-center gap-2 cursor-pointer text-sm text-gray-700 dark:text-gray-300">
            <input type="checkbox" v-model="linkNewTab" class="rounded" />
            Open in new tab
          </label>

          <div class="flex gap-2 justify-end pt-1">
            <button
              v-if="editor?.isActive('link')"
              class="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
              @click="removeLink"
            >Remove link</button>
            <button class="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition" @click="showLinkDialog = false">Cancel</button>
            <button
              class="px-4 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
              :disabled="!linkHref"
              @click="applyLink"
            >Apply</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
