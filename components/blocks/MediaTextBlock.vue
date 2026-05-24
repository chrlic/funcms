<script setup lang="ts">
withDefaults(defineProps<{
  image?: string
  imageAlt?: string
  imagePosition?: 'left' | 'right'
  imageWidth?: 'third' | 'half' | 'two-thirds'
  layout?: 'columns' | 'float'
  caption?: string
  content?: string
  verticalAlign?: 'top' | 'center' | 'bottom'
}>(), {
  imagePosition: 'left',
  imageWidth: 'half',
  layout: 'columns',
  verticalAlign: 'center',
})

const columnWidthMap = {
  third: 'w-full md:w-1/3',
  half: 'w-full md:w-1/2',
  'two-thirds': 'w-full md:w-2/3',
}

const floatWidthMap = {
  third: 'w-full sm:w-1/3',
  half: 'w-full sm:w-1/2',
  'two-thirds': 'w-full sm:w-2/3',
}

const alignMap = {
  top: 'items-start',
  center: 'items-center',
  bottom: 'items-end',
}
</script>

<template>
  <!-- Float layout: image floated, text wraps around it -->
  <div v-if="layout === 'float'" class="px-6 py-8 mx-auto max-w-6xl">
    <figure
      v-if="image"
      :class="[
        floatWidthMap[imageWidth ?? 'half'],
        imagePosition === 'right' ? 'sm:float-right sm:ml-8' : 'sm:float-left sm:mr-8',
        'mb-4',
      ]"
    >
      <img :src="image" :alt="imageAlt ?? ''" class="w-full rounded-xl object-cover" />
      <figcaption v-if="caption" class="mt-2 text-sm text-gray-500 text-center">{{ caption }}</figcaption>
    </figure>
    <!-- eslint-disable-next-line vue/no-v-html -->
    <div v-if="content" class="prose prose-lg dark:prose-invert max-w-none" v-html="content" />
    <div class="clear-both" />
  </div>

  <!-- Columns layout: strict side-by-side (default) -->
  <div
    v-else
    class="flex flex-col gap-6 px-6 py-8 mx-auto max-w-6xl"
    :class="[
      imagePosition === 'right' ? 'md:flex-row-reverse' : 'md:flex-row',
      alignMap[verticalAlign ?? 'center'],
    ]"
  >
    <div v-if="image" :class="columnWidthMap[imageWidth ?? 'half']" class="shrink-0">
      <figure>
        <img :src="image" :alt="imageAlt ?? ''" class="w-full rounded-xl object-cover" />
        <figcaption v-if="caption" class="mt-2 text-sm text-gray-500 text-center">{{ caption }}</figcaption>
      </figure>
    </div>
    <div class="flex-1 min-w-0">
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div v-if="content" class="prose prose-lg dark:prose-invert max-w-none" v-html="content" />
    </div>
  </div>
</template>
