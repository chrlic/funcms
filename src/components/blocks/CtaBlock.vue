<script setup lang="ts">
withDefaults(defineProps<{
  heading?: string
  body?: string
  primaryLabel?: string
  primaryHref?: string
  secondaryLabel?: string
  secondaryHref?: string
  background?: string
}>(), {})
</script>

<template>
  <section
    class="rounded-2xl px-8 py-12 text-center my-8"
    :style="background ? { backgroundColor: background } : {}"
    :class="background ? '' : 'bg-indigo-600 text-white'"
  >
    <h2 v-if="heading" class="text-3xl font-bold mb-3">{{ heading }}</h2>
    <p v-if="body" class="text-lg opacity-90 mb-6 max-w-xl mx-auto">{{ body }}</p>
    <div class="flex flex-wrap gap-4 justify-center">
      <a
        v-if="primaryLabel && primaryHref"
        :href="primaryHref"
        class="px-6 py-3 bg-white text-indigo-700 font-semibold rounded-lg hover:bg-gray-100 transition"
      >{{ primaryLabel }}</a>
      <a
        v-if="secondaryLabel && secondaryHref"
        :href="secondaryHref"
        class="px-6 py-3 border border-white text-white font-semibold rounded-lg hover:bg-white/10 transition"
      >{{ secondaryLabel }}</a>
    </div>
  </section>
</template>
