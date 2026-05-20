<script setup lang="ts">
withDefaults(defineProps<{
  image?: string
  imageAlt?: string
  imagePosition?: 'left' | 'right'
  imageWidth?: 'third' | 'half' | 'two-thirds'
  caption?: string
  content?: string
  verticalAlign?: 'top' | 'center' | 'bottom'
}>(), {
  imagePosition: 'left',
  imageWidth: 'half',
  verticalAlign: 'center',
})

const widthMap = {
  third: 'w-full md:w-1/3',
  half: 'w-full md:w-1/2',
  'two-thirds': 'w-full md:w-2/3',
}

const alignMap = {
  top: 'items-start',
  center: 'items-center',
  bottom: 'items-end',
}
</script>

<template>
  <div
    class="flex flex-col gap-6 px-6 py-8 mx-auto max-w-6xl"
    :class="[
      imagePosition === 'right' ? 'md:flex-row-reverse' : 'md:flex-row',
      alignMap[verticalAlign],
    ]"
  >
    <!-- Image side -->
    <div v-if="image" :class="widthMap[imageWidth]" class="shrink-0">
      <figure>
        <img
          :src="image"
          :alt="imageAlt ?? ''"
          class="w-full rounded-xl object-cover"
        />
        <figcaption v-if="caption" class="mt-2 text-sm text-gray-500 text-center">
          {{ caption }}
        </figcaption>
      </figure>
    </div>

    <!-- Text side -->
    <div class="flex-1 min-w-0">
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div v-if="content" class="prose prose-lg dark:prose-invert max-w-none" v-html="content" />
    </div>
  </div>
</template>
