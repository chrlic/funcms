# Custom Block Types

FunCMS lets you write your own Vue components and use them as blocks in the page editor — no code deployment or server restart required. Components are written as Vue SFCs, compiled server-side on save, and rendered with full SSR support.

---

## Table of Contents

1. [Creating a custom block](#creating-a-custom-block)
2. [Using a custom block on a page](#using-a-custom-block-on-a-page)
3. [SFC authoring guide](#sfc-authoring-guide)
4. [Field types reference](#field-types-reference)
5. [Example blocks](#example-blocks)
6. [Editing and deleting](#editing-and-deleting)
7. [Constraints](#constraints)

---

## Creating a custom block

1. Go to **Admin → Block Types** in the sidebar
2. Click **New Block Type**
3. Fill in the form:
   - **Slug** — unique identifier used internally, e.g. `testimonial-card`. Lowercase letters, numbers, and hyphens only. Cannot be changed after creation.
   - **Label** — name shown in the block picker, e.g. `Testimonial Card`
   - **Description** — optional, shown in the block list
   - **Vue SFC Source** — your component code (see [authoring guide](#sfc-authoring-guide))
   - **Admin Form Fields** — define what the editor sees when configuring this block (see [field types](#field-types-reference))
4. Click **Create & Compile**

The server compiles the component immediately. If there are template errors they are shown inline. On success the block is live with no restart needed.

---

## Using a custom block on a page

1. Open any page in the editor (**Admin → Pages → [page name]**)
2. Click **Add Block**
3. Custom blocks appear in the picker with a **purple badge** and "custom" label
4. Select your block — it is added to the page
5. Click the block to expand its settings panel and fill in the fields you defined
6. Save the page as normal

---

## SFC authoring guide

Custom blocks are written as Vue Single File Components with a `<template>` and an optional `<script>` block.

### Minimal example

```html
<template>
  <div class="px-6 py-8 mx-auto max-w-4xl">
    <h2 v-if="title" class="text-2xl font-bold mb-4">{{ title }}</h2>
    <div v-if="content" class="prose dark:prose-invert max-w-none" v-html="content" />
  </div>
</template>

<script>
const props = defineProps({
  title: { type: String, default: '' },
  content: { type: String, default: '' },
})
</script>
```

### Props and reactivity

Define props with `defineProps()` — the compiler extracts them automatically into Vue's Options API `props` option. The rest of your script runs inside `setup(props)`, so `props` is always in scope.

All Vue 3 composition APIs are available without importing:

```js
ref, computed, watch, watchEffect,
onMounted, onUnmounted,
reactive, toRef, toRefs,
nextTick, h, defineComponent
```

```html
<script>
const props = defineProps({
  items: { type: String, default: '[]' },
})

// props is in scope — use it in computed directly
const parsedItems = computed(() => {
  try { return JSON.parse(props.items) } catch { return [] }
})

// refs work too
const expanded = ref(false)
</script>
```

### Rendering rich text

Use `v-html` with the `prose` Tailwind class to render HTML from a `richtext` field:

```html
<div class="prose dark:prose-invert max-w-none" v-html="content" />
```

### Styling

Use Tailwind CSS utility classes. Dynamic classes work normally:

```html
<div :class="highlighted ? 'bg-indigo-600 text-white' : 'bg-white'">…</div>
```

For dynamic values that can't be expressed with Tailwind (e.g. user-supplied colours), use inline `:style` bindings:

```html
<div :style="{ backgroundColor: bgColor }">…</div>
```

---

## Field types reference

Each field in the **Admin Form Fields** section maps to a prop in your component. The `name` must match the prop name exactly.

| Type | Admin UI | Use for |
|------|----------|---------|
| `text` | Single-line input | Short strings, headings, labels |
| `textarea` | Multi-line input | Long plain text, JSON data |
| `richtext` | Rich text editor (Tiptap) | Formatted HTML content |
| `number` | Number input | Counts, sizes, ratings |
| `boolean` | Toggle checkbox | Feature flags, visibility |
| `select` | Dropdown | Predefined choices |
| `image` | URL input + media picker | Image URLs |
| `color` | Color picker | Hex color values |
| `url` | URL input | Links, hrefs |

### Passing structured data

For arrays or objects (e.g. a list of cards), use a `textarea` field and `JSON.parse` in a computed:

```html
<script>
const props = defineProps({
  cards: { type: String, default: '[]' },
})
const parsedCards = computed(() => {
  try { return JSON.parse(props.cards) } catch { return [] }
})
</script>
```

The editor pastes JSON directly into the textarea field.

---

## Example blocks

### Testimonial card

```html
<template>
  <div class="px-6 py-10 mx-auto max-w-3xl">
    <figure class="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border dark:border-gray-700 p-8">
      <blockquote
        class="prose dark:prose-invert max-w-none text-lg italic text-gray-700 dark:text-gray-300"
        v-html="quote"
      />
      <figcaption class="mt-6 flex items-center gap-4">
        <img v-if="avatar" :src="avatar" :alt="author" class="w-12 h-12 rounded-full object-cover" />
        <div v-else class="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-indigo-600 font-bold text-lg">
          {{ initials }}
        </div>
        <div>
          <p class="font-semibold text-gray-900 dark:text-white">{{ author }}</p>
          <p v-if="role" class="text-sm text-gray-500">{{ role }}</p>
        </div>
      </figcaption>
    </figure>
  </div>
</template>

<script>
const props = defineProps({
  quote:  { type: String, default: '' },
  author: { type: String, default: 'Anonymous' },
  role:   { type: String, default: '' },
  avatar: { type: String, default: '' },
})

const initials = computed(() =>
  props.author.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
)
</script>
```

**Fields:** `quote` (richtext), `author` (text), `role` (text), `avatar` (image)

---

### Pricing table

```html
<template>
  <div class="px-6 py-10 mx-auto max-w-5xl">
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div
        v-for="(tier, i) in parsedTiers" :key="i"
        class="relative rounded-2xl border p-8 flex flex-col"
        :class="tier.highlighted
          ? 'border-indigo-500 bg-indigo-600 text-white shadow-xl scale-105'
          : 'border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700'"
      >
        <div v-if="tier.badge" class="absolute -top-3 left-1/2 -translate-x-1/2">
          <span class="bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1 rounded-full">{{ tier.badge }}</span>
        </div>
        <h3 class="text-lg font-bold mb-1">{{ tier.name }}</h3>
        <p class="text-sm mb-6 opacity-70">{{ tier.description }}</p>
        <div class="mb-6">
          <span class="text-4xl font-extrabold">{{ tier.price }}</span>
          <span class="text-sm opacity-60 ml-1">{{ tier.period }}</span>
        </div>
        <ul class="space-y-2 mb-8 flex-1">
          <li v-for="(f, j) in tier.features" :key="j" class="flex items-start gap-2 text-sm">
            <span>✓</span><span>{{ f }}</span>
          </li>
        </ul>
        <a
          :href="tier.ctaHref || '#'"
          class="block text-center py-2.5 px-4 rounded-lg font-semibold text-sm transition"
          :class="tier.highlighted ? 'bg-white text-indigo-600 hover:bg-indigo-50' : 'bg-indigo-600 text-white hover:bg-indigo-700'"
        >{{ tier.ctaLabel || 'Get started' }}</a>
      </div>
    </div>
  </div>
</template>

<script>
const props = defineProps({
  tiers: { type: String, default: '[]' },
})
const parsedTiers = computed(() => {
  try { return JSON.parse(props.tiers) } catch { return [] }
})
</script>
```

**Fields:** `tiers` (textarea — paste JSON array)

**Example tiers value:**
```json
[
  { "name": "Free", "price": "$0", "period": "/mo", "features": ["5 pages", "1 GB"], "ctaLabel": "Start free", "ctaHref": "/signup" },
  { "name": "Pro", "price": "$29", "period": "/mo", "highlighted": true, "badge": "Popular", "features": ["Unlimited pages", "50 GB", "Priority support"], "ctaLabel": "Try Pro", "ctaHref": "/signup?plan=pro" },
  { "name": "Enterprise", "price": "Custom", "period": "", "features": ["Everything in Pro", "SSO", "SLA"], "ctaLabel": "Contact us", "ctaHref": "/contact" }
]
```

---

## Editing and deleting

- **Edit**: go to Admin → Block Types, click **Edit** on any block. Change the source or fields and click **Save & Recompile**. Pages using the block update immediately (no restart needed, but browser refresh required).
- **Delete**: click **Delete**. Any pages that already contain this block type will render nothing in its place — the block data remains in the page record but the component is gone. Remove the blocks from affected pages before deleting.

---

## Constraints

| What works | What doesn't |
|------------|--------------|
| Full Vue 3 template syntax (`v-for`, `v-if`, `v-model`, `:class`, `v-html`, etc.) | `<style>` blocks (use Tailwind classes or `:style` bindings) |
| All composition APIs (`ref`, `computed`, `watch`, etc.) | TypeScript in `<script>` (plain JS only) |
| `defineProps()` for declaring props | `import` statements (no bundler at eval time) |
| Tailwind CSS utility classes | Third-party component libraries |
| Inline SVGs | Nuxt-specific composables (`useRoute`, `useFetch`, etc.) |
| `:style` bindings for dynamic CSS | `<script setup>` syntax (use plain `<script>`) |

**Prop naming**: never name a prop `style`, `class`, `key`, or `ref` — these are reserved Vue attributes and will cause conflicts.
