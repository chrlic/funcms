<script setup lang="ts">
const props = withDefaults(defineProps<{
  heading: string
  subheading?: string
  image?: string
  ctaLabel?: string
  ctaHref?: string
  overlay?: boolean
  height?: 'sm' | 'md' | 'lg' | 'full'
}>(), {
  overlay: true,
  height: 'lg',
})

const heightMap = {
  sm: 'min-h-[30vh]',
  md: 'min-h-[50vh]',
  lg: 'min-h-[70vh]',
  full: 'min-h-screen',
}
</script>

<template>
  <section
    class="relative flex items-center justify-center text-white bg-gray-800"
    :class="heightMap[height]"
  >
    <!-- Background Image -->
    <img
      v-if="image"
      :src="image"
      :alt="heading"
      class="absolute inset-0 w-full h-full object-cover"
    />

    <!-- Overlay -->
    <div
      v-if="overlay"
      class="absolute inset-0 bg-black/50"
    />

    <!-- Content -->
    <div class="relative z-10 text-center px-6 max-w-4xl mx-auto">
      <h1 class="text-4xl md:text-6xl font-bold mb-4 leading-tight">
        {{ heading }}
      </h1>
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div v-if="subheading" class="text-lg md:text-xl mb-8 opacity-90 prose prose-invert max-w-none" v-html="subheading" />
      <a
        v-if="ctaLabel && ctaHref"
        :href="ctaHref"
        class="inline-block bg-white text-gray-900 font-semibold px-8 py-3 rounded-full hover:bg-gray-100 transition"
      >
        {{ ctaLabel }}
      </a>
    </div>
  </section>
</template>
