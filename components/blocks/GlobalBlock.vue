<script setup lang="ts">
import staticBlockRegistry from '~/components/blocks/index'
import type { Component } from 'vue'
import type { GlobalComponent } from '~/types'

const props = defineProps<{ globalId?: string }>()

const { registry: customRegistry } = useCustomBlocks()

const { data } = await useAsyncData(
  `global-component-${props.globalId}`,
  () => props.globalId
    ? $fetch<{ data: GlobalComponent }>(`/api/global-components/${props.globalId}`)
    : Promise.resolve(null),
  { watch: [() => props.globalId] }
)

const gc = computed(() => data.value?.data ?? null)

// Inject the inner block's customCss scoped to the outer .block-{id} wrapper.
// The outer wrapper class is set by the page renderer on the parent element —
// we don't know its ID here, so we scope to .global-block instead.
const innerCss = computed(() => {
  const css = gc.value?.block.customCss?.trim()
  if (!css) return ''
  return css.includes('{') ? css : `.global-block[data-global-id="${props.globalId}"] { ${css} }`
})

useHead({ style: computed(() => innerCss.value ? [{ innerHTML: innerCss.value }] : []) })
</script>

<template>
  <div v-if="gc && gc.block.visible !== false" class="global-block" :data-global-id="globalId" :data-global-name="gc.name">
    <component
      :is="(staticBlockRegistry as Record<string, Component>)[gc.block.type] ?? customRegistry[gc.block.type]"
      v-bind="gc.block.props"
    />
  </div>
</template>
