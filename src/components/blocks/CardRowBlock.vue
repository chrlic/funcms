<script setup lang="ts">
const props = withDefaults(defineProps<{
  cards?: string
  cardStyle?: 'elevated' | 'outlined' | 'flat'
}>(), {
  cards: '[]',
  cardStyle: 'elevated',
})

interface Card { title?: string; body?: string; image?: string; href?: string; label?: string }

const parsedCards = computed<Card[]>(() => {
  try { return JSON.parse(props.cards) as Card[] } catch { return [] }
})

const cardClass = computed(() => ({
  'rounded-xl overflow-hidden': true,
  'shadow-md bg-white dark:bg-gray-800': props.cardStyle === 'elevated',
  'border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800': props.cardStyle === 'outlined',
  'bg-gray-50 dark:bg-gray-900': props.cardStyle === 'flat',
}))
</script>

<template>
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 my-8">
    <div v-for="(card, i) in parsedCards" :key="i" :class="cardClass">
      <img v-if="card.image" :src="card.image" :alt="card.title ?? ''" class="w-full h-44 object-cover" />
      <div class="p-5">
        <h3 v-if="card.title" class="font-semibold text-gray-900 dark:text-white mb-2">{{ card.title }}</h3>
        <p v-if="card.body" class="text-sm text-gray-600 dark:text-gray-400 mb-4">{{ card.body }}</p>
        <a v-if="card.href && card.label" :href="card.href" class="text-sm font-medium text-indigo-600 hover:underline">{{ card.label }}</a>
      </div>
    </div>
    <div v-if="parsedCards.length === 0" class="col-span-full h-24 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center text-gray-400 text-sm">
      No cards
    </div>
  </div>
</template>
