<script setup lang="ts">
import type { SiteSettings, NavItem } from '~/types'

const { data } = await useFetch<{ data: SiteSettings }>('/api/settings', {
  key: 'site-settings',
  default: () => ({ data: { siteName: 'FunCMS', nav: [], footer: [], logo: '', tagline: '', favicon: '', socialLinks: {}, customCss: '', headScripts: '' } }),
})

const settings = computed(() => data.value?.data)
const mobileOpen = ref(false)
const openDropdown = ref<number | null>(null)

function toggleDropdown(i: number) {
  openDropdown.value = openDropdown.value === i ? null : i
}

function closeDropdowns() {
  openDropdown.value = null
}

function navLinkProps(item: NavItem) {
  return item.newTab
    ? { target: '_blank', rel: 'noopener noreferrer' }
    : {}
}
</script>

<template>
  <header class="bg-white dark:bg-gray-900 border-b dark:border-gray-700 sticky top-0 z-40" @click.self="closeDropdowns">
    <div class="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between gap-6">

      <!-- Logo / site name -->
      <NuxtLink to="/" class="flex items-center gap-2 shrink-0" @click="closeDropdowns">
        <img v-if="settings?.logo" :src="settings.logo" class="h-8 w-auto" :alt="settings?.siteName" />
        <span v-else class="font-bold text-lg text-gray-900 dark:text-white">{{ settings?.siteName }}</span>
      </NuxtLink>

      <!-- Desktop nav -->
      <nav class="hidden md:flex items-center gap-1" @mouseleave="closeDropdowns">
        <div
          v-for="(item, i) in settings?.nav ?? []"
          :key="i"
          class="relative"
        >
          <!-- Item with children → dropdown trigger -->
          <template v-if="item.children && item.children.length > 0">
            <button
              class="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              @click="toggleDropdown(i)"
            >
              {{ item.label }}
              <Icon
                name="i-heroicons-chevron-down"
                class="w-3.5 h-3.5 transition-transform"
                :class="{ 'rotate-180': openDropdown === i }"
              />
            </button>

            <!-- Dropdown panel -->
            <div
              v-if="openDropdown === i"
              class="absolute top-full left-0 mt-1.5 w-52 bg-white dark:bg-gray-800 border dark:border-gray-600 rounded-xl shadow-lg py-1 z-50"
            >
              <!-- Parent link if it has an href -->
              <template v-if="item.href">
                <component
                  :is="item.newTab ? 'a' : NuxtLink"
                  :to="item.newTab ? undefined : item.href"
                  :href="item.newTab ? item.href : undefined"
                  v-bind="navLinkProps(item)"
                  class="flex items-center justify-between px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 font-medium"
                  @click="closeDropdowns"
                >
                  {{ item.label }}
                  <Icon v-if="item.newTab" name="i-heroicons-arrow-top-right-on-square" class="w-3 h-3 opacity-40" />
                </component>
                <div class="border-t dark:border-gray-600 my-1" />
              </template>

              <!-- Children -->
              <component
                v-for="(child, ci) in item.children"
                :key="ci"
                :is="child.newTab ? 'a' : NuxtLink"
                :to="child.newTab ? undefined : child.href"
                :href="child.newTab ? child.href : undefined"
                v-bind="navLinkProps(child)"
                class="flex items-center justify-between px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                @click="closeDropdowns"
              >
                {{ child.label }}
                <Icon v-if="child.newTab" name="i-heroicons-arrow-top-right-on-square" class="w-3 h-3 opacity-40" />
              </component>
            </div>
          </template>

          <!-- Plain link (no children) -->
          <template v-else>
            <component
              :is="item.newTab ? 'a' : NuxtLink"
              :to="item.newTab ? undefined : item.href"
              :href="item.newTab ? item.href : undefined"
              v-bind="navLinkProps(item)"
              class="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              active-class="text-indigo-600 dark:text-indigo-400 font-medium"
            >
              {{ item.label }}
              <Icon v-if="item.newTab" name="i-heroicons-arrow-top-right-on-square" class="w-3 h-3 opacity-50" />
            </component>
          </template>
        </div>
      </nav>

      <!-- Mobile hamburger -->
      <button
        class="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
        @click="mobileOpen = !mobileOpen"
      >
        <Icon :name="mobileOpen ? 'i-heroicons-x-mark' : 'i-heroicons-bars-3'" class="w-5 h-5" />
      </button>
    </div>

    <!-- Mobile menu -->
    <div v-if="mobileOpen" class="md:hidden border-t dark:border-gray-700 px-4 py-2 space-y-0.5">
      <template v-for="(item, i) in settings?.nav ?? []" :key="i">
        <!-- Top-level with children: expandable -->
        <template v-if="item.children && item.children.length > 0">
          <button
            class="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            @click="toggleDropdown(i)"
          >
            {{ item.label }}
            <Icon name="i-heroicons-chevron-down" class="w-4 h-4 transition-transform" :class="{ 'rotate-180': openDropdown === i }" />
          </button>
          <div v-if="openDropdown === i" class="pl-4 space-y-0.5">
            <component
              v-for="(child, ci) in item.children"
              :key="ci"
              :is="child.newTab ? 'a' : NuxtLink"
              :to="child.newTab ? undefined : child.href"
              :href="child.newTab ? child.href : undefined"
              v-bind="navLinkProps(child)"
              class="flex items-center gap-1 px-3 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              @click="mobileOpen = false; closeDropdowns()"
            >
              {{ child.label }}
              <Icon v-if="child.newTab" name="i-heroicons-arrow-top-right-on-square" class="w-3 h-3 opacity-50" />
            </component>
          </div>
        </template>

        <!-- Plain link -->
        <template v-else>
          <component
            :is="item.newTab ? 'a' : NuxtLink"
            :to="item.newTab ? undefined : item.href"
            :href="item.newTab ? item.href : undefined"
            v-bind="navLinkProps(item)"
            class="flex items-center gap-1 px-3 py-2 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            @click="mobileOpen = false"
          >
            {{ item.label }}
            <Icon v-if="item.newTab" name="i-heroicons-arrow-top-right-on-square" class="w-3 h-3 opacity-50" />
          </component>
        </template>
      </template>
    </div>
  </header>
</template>
