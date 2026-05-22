<script setup lang="ts">
import { resolveComponent } from 'vue'
import type { SiteSettings, NavItem } from '~/types'

const { data } = await useFetch<{ data: SiteSettings }>('/api/settings', {
  key: 'site-settings',
  default: () => ({ data: { siteName: 'FunCMS', navStyle: 'topbar', nav: [], footer: [], logo: '', tagline: '', favicon: '', socialLinks: {}, customCss: '', headScripts: '' } }),
})

const NuxtLink = resolveComponent('NuxtLink')
const settings = computed(() => data.value?.data)
const navStyle = computed(() => settings.value?.navStyle ?? 'topbar')
const mobileOpen = ref(false)
const openDropdown = ref<number | null>(null)
const sidebarOpen = ref(true)

function toggleDropdown(i: number) {
  openDropdown.value = openDropdown.value === i ? null : i
}

function closeDropdowns() {
  openDropdown.value = null
}

function navLinkProps(item: NavItem) {
  return item.newTab ? { target: '_blank', rel: 'noopener noreferrer' } : {}
}
</script>

<template>
  <!-- ── TOP BAR ──────────────────────────────────────────────────── -->
  <header
    v-if="navStyle === 'topbar'"
    class="bg-white dark:bg-gray-900 border-b dark:border-gray-700 sticky top-0 z-40"
    @click.self="closeDropdowns"
  >
    <div class="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between gap-6">

      <NuxtLink to="/" class="flex items-center gap-2 shrink-0" @click="closeDropdowns">
        <img v-if="settings?.logo" :src="settings.logo" class="h-8 w-auto" :alt="settings?.siteName" />
        <span v-else class="font-bold text-lg text-gray-900 dark:text-white">{{ settings?.siteName }}</span>
      </NuxtLink>

      <!-- Desktop nav -->
      <nav class="hidden md:flex items-center gap-1" @mouseleave="closeDropdowns">
        <div v-for="(item, i) in settings?.nav ?? []" :key="i" class="relative">

          <template v-if="item.children && item.children.length > 0">
            <button
              class="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              @click="toggleDropdown(i)"
            >
              {{ item.label }}
              <svg class="w-3.5 h-3.5 transition-transform" :class="{ 'rotate-180': openDropdown === i }" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd"/>
              </svg>
            </button>
            <div v-if="openDropdown === i" class="absolute top-full left-0 mt-1.5 w-52 bg-white dark:bg-gray-800 border dark:border-gray-600 rounded-xl shadow-lg py-1 z-50">
              <template v-if="item.href">
                <component :is="item.newTab ? 'a' : NuxtLink" :to="item.newTab ? undefined : item.href" :href="item.newTab ? item.href : undefined" v-bind="navLinkProps(item)" class="flex items-center justify-between px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 font-medium" @click="closeDropdowns">
                  {{ item.label }}
                  <svg v-if="item.newTab" class="w-3 h-3 opacity-40" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.25 5.5a.75.75 0 0 0-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 0 0 .75-.75v-4a.75.75 0 0 1 1.5 0v4A2.25 2.25 0 0 1 12.75 17h-8.5A2.25 2.25 0 0 1 2 14.75v-8.5A2.25 2.25 0 0 1 4.25 4h5a.75.75 0 0 1 0 1.5h-5Z" clip-rule="evenodd"/><path fill-rule="evenodd" d="M6.194 12.753a.75.75 0 0 0 1.06.053L16.5 4.44v2.81a.75.75 0 0 0 1.5 0v-4.5a.75.75 0 0 0-.75-.75h-4.5a.75.75 0 0 0 0 1.5h2.553l-9.056 8.194a.75.75 0 0 0-.053 1.06Z" clip-rule="evenodd"/></svg>
                </component>
                <div class="border-t dark:border-gray-600 my-1" />
              </template>
              <component v-for="(child, ci) in item.children" :key="ci" :is="child.newTab ? 'a' : NuxtLink" :to="child.newTab ? undefined : child.href" :href="child.newTab ? child.href : undefined" v-bind="navLinkProps(child)" class="flex items-center justify-between px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700" @click="closeDropdowns">
                {{ child.label }}
                <svg v-if="child.newTab" class="w-3 h-3 opacity-40" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.25 5.5a.75.75 0 0 0-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 0 0 .75-.75v-4a.75.75 0 0 1 1.5 0v4A2.25 2.25 0 0 1 12.75 17h-8.5A2.25 2.25 0 0 1 2 14.75v-8.5A2.25 2.25 0 0 1 4.25 4h5a.75.75 0 0 1 0 1.5h-5Z" clip-rule="evenodd"/><path fill-rule="evenodd" d="M6.194 12.753a.75.75 0 0 0 1.06.053L16.5 4.44v2.81a.75.75 0 0 0 1.5 0v-4.5a.75.75 0 0 0-.75-.75h-4.5a.75.75 0 0 0 0 1.5h2.553l-9.056 8.194a.75.75 0 0 0-.053 1.06Z" clip-rule="evenodd"/></svg>
              </component>
            </div>
          </template>

          <template v-else>
            <component :is="item.newTab ? 'a' : NuxtLink" :to="item.newTab ? undefined : item.href" :href="item.newTab ? item.href : undefined" v-bind="navLinkProps(item)" class="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition" active-class="text-indigo-600 dark:text-indigo-400 font-medium">
              {{ item.label }}
              <svg v-if="item.newTab" class="w-3 h-3 opacity-50" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.25 5.5a.75.75 0 0 0-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 0 0 .75-.75v-4a.75.75 0 0 1 1.5 0v4A2.25 2.25 0 0 1 12.75 17h-8.5A2.25 2.25 0 0 1 2 14.75v-8.5A2.25 2.25 0 0 1 4.25 4h5a.75.75 0 0 1 0 1.5h-5Z" clip-rule="evenodd"/><path fill-rule="evenodd" d="M6.194 12.753a.75.75 0 0 0 1.06.053L16.5 4.44v2.81a.75.75 0 0 0 1.5 0v-4.5a.75.75 0 0 0-.75-.75h-4.5a.75.75 0 0 0 0 1.5h2.553l-9.056 8.194a.75.75 0 0 0-.053 1.06Z" clip-rule="evenodd"/></svg>
            </component>
          </template>
        </div>
      </nav>

      <div class="hidden md:flex items-center gap-2">
        <LanguageSelector />
        <ThemeToggle />
      </div>

      <!-- Mobile hamburger -->
      <button class="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800" @click="mobileOpen = !mobileOpen">
        <svg v-if="mobileOpen" class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z"/></svg>
        <svg v-else class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75ZM2 10a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 10Zm0 5.25a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Z" clip-rule="evenodd"/></svg>
      </button>
    </div>

    <!-- Mobile menu -->
    <div v-if="mobileOpen" class="md:hidden border-t dark:border-gray-700 px-4 py-2 space-y-0.5">
      <template v-for="(item, i) in settings?.nav ?? []" :key="i">
        <template v-if="item.children && item.children.length > 0">
          <button class="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800" @click="toggleDropdown(i)">
            {{ item.label }}
            <svg class="w-4 h-4 transition-transform" :class="{ 'rotate-180': openDropdown === i }" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd"/></svg>
          </button>
          <div v-if="openDropdown === i" class="pl-4 space-y-0.5">
            <component v-for="(child, ci) in item.children" :key="ci" :is="child.newTab ? 'a' : NuxtLink" :to="child.newTab ? undefined : child.href" :href="child.newTab ? child.href : undefined" v-bind="navLinkProps(child)" class="flex items-center gap-1 px-3 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800" @click="mobileOpen = false; closeDropdowns()">
              {{ child.label }}
              <svg v-if="child.newTab" class="w-3 h-3 opacity-50" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.25 5.5a.75.75 0 0 0-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 0 0 .75-.75v-4a.75.75 0 0 1 1.5 0v4A2.25 2.25 0 0 1 12.75 17h-8.5A2.25 2.25 0 0 1 2 14.75v-8.5A2.25 2.25 0 0 1 4.25 4h5a.75.75 0 0 1 0 1.5h-5Z" clip-rule="evenodd"/><path fill-rule="evenodd" d="M6.194 12.753a.75.75 0 0 0 1.06.053L16.5 4.44v2.81a.75.75 0 0 0 1.5 0v-4.5a.75.75 0 0 0-.75-.75h-4.5a.75.75 0 0 0 0 1.5h2.553l-9.056 8.194a.75.75 0 0 0-.053 1.06Z" clip-rule="evenodd"/></svg>
            </component>
          </div>
        </template>
        <template v-else>
          <component :is="item.newTab ? 'a' : NuxtLink" :to="item.newTab ? undefined : item.href" :href="item.newTab ? item.href : undefined" v-bind="navLinkProps(item)" class="flex items-center gap-1 px-3 py-2 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800" @click="mobileOpen = false">
            {{ item.label }}
            <svg v-if="item.newTab" class="w-3 h-3 opacity-50" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.25 5.5a.75.75 0 0 0-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 0 0 .75-.75v-4a.75.75 0 0 1 1.5 0v4A2.25 2.25 0 0 1 12.75 17h-8.5A2.25 2.25 0 0 1 2 14.75v-8.5A2.25 2.25 0 0 1 4.25 4h5a.75.75 0 0 1 0 1.5h-5Z" clip-rule="evenodd"/><path fill-rule="evenodd" d="M6.194 12.753a.75.75 0 0 0 1.06.053L16.5 4.44v2.81a.75.75 0 0 0 1.5 0v-4.5a.75.75 0 0 0-.75-.75h-4.5a.75.75 0 0 0 0 1.5h2.553l-9.056 8.194a.75.75 0 0 0-.053 1.06Z" clip-rule="evenodd"/></svg>
          </component>
        </template>
      </template>
      <div class="pt-2 pb-1 flex items-center justify-start gap-3 px-3">
        <LanguageSelector />
        <ThemeToggle />
      </div>
    </div>
  </header>

  <!-- ── LEFT SIDEBAR ──────────────────────────────────────────────── -->
  <template v-else-if="navStyle === 'sidebar-left'">
    <!-- Mobile top bar -->
    <div class="md:hidden flex items-center justify-between px-4 h-12 bg-white dark:bg-gray-900 border-b dark:border-gray-700 sticky top-0 z-40">
      <NuxtLink to="/" class="flex items-center gap-2">
        <img v-if="settings?.logo" :src="settings.logo" class="h-7 w-auto" :alt="settings?.siteName" />
        <span v-else class="font-bold text-gray-900 dark:text-white">{{ settings?.siteName }}</span>
      </NuxtLink>
      <button class="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg" @click="mobileOpen = !mobileOpen">
        <svg v-if="mobileOpen" class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z"/></svg>
        <svg v-else class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75ZM2 10a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 10Zm0 5.25a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Z" clip-rule="evenodd"/></svg>
      </button>
    </div>

    <!-- Desktop sidebar — natural flow, full height via self-stretch -->
    <aside
      class="hidden md:flex flex-col self-stretch shrink-0 bg-white dark:bg-gray-900 border-r dark:border-gray-700 transition-all duration-200"
      :class="sidebarOpen ? 'w-56' : 'w-14'"
    >
      <!-- Logo + collapse toggle -->
      <div class="flex items-center gap-2 px-3 h-14 border-b dark:border-gray-700 shrink-0">
        <button
          @click="sidebarOpen = !sidebarOpen"
          class="w-8 h-8 shrink-0 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
        >
          <svg v-if="sidebarOpen" class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" clip-rule="evenodd"/></svg>
          <svg v-else class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd"/></svg>
        </button>
        <NuxtLink v-if="sidebarOpen" to="/" class="flex items-center gap-2 min-w-0">
          <img v-if="settings?.logo" :src="settings.logo" class="h-7 w-auto shrink-0" :alt="settings?.siteName" />
          <span v-else class="font-bold text-gray-900 dark:text-white truncate">{{ settings?.siteName }}</span>
        </NuxtLink>
      </div>

      <!-- Nav links -->
      <nav class="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        <template v-for="(item, i) in settings?.nav ?? []" :key="i">
          <template v-if="item.children && item.children.length > 0">
            <button
              class="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              @click="toggleDropdown(i)"
              :title="!sidebarOpen ? item.label : undefined"
            >
              <svg class="w-4 h-4 shrink-0 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75ZM2 10a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 10Zm0 5.25a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Z" clip-rule="evenodd"/></svg>
              <span v-if="sidebarOpen" class="flex-1 truncate text-left">{{ item.label }}</span>
              <svg v-if="sidebarOpen" class="w-3.5 h-3.5 shrink-0 transition-transform" :class="{ 'rotate-180': openDropdown === i }" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd"/></svg>
            </button>
            <div v-if="sidebarOpen && openDropdown === i" class="pl-6 space-y-0.5">
              <component v-for="(child, ci) in item.children" :key="ci" :is="child.newTab ? 'a' : NuxtLink" :to="child.newTab ? undefined : child.href" :href="child.newTab ? child.href : undefined" v-bind="navLinkProps(child)" class="flex items-center gap-1 px-2 py-1.5 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 truncate" active-class="text-indigo-600 dark:text-indigo-400 font-medium">
                {{ child.label }}
              </component>
            </div>
          </template>
          <template v-else>
            <component :is="item.newTab ? 'a' : NuxtLink" :to="item.newTab ? undefined : item.href" :href="item.newTab ? item.href : undefined" v-bind="navLinkProps(item)" class="flex items-center gap-2 px-2 py-2 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition" active-class="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-medium" :title="!sidebarOpen ? item.label : undefined">
              <svg class="w-4 h-4 shrink-0 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.25 5.5a.75.75 0 0 0-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 0 0 .75-.75v-4a.75.75 0 0 1 1.5 0v4A2.25 2.25 0 0 1 12.75 17h-8.5A2.25 2.25 0 0 1 2 14.75v-8.5A2.25 2.25 0 0 1 4.25 4h5a.75.75 0 0 1 0 1.5h-5Z" clip-rule="evenodd"/></svg>
              <span v-if="sidebarOpen" class="truncate">{{ item.label }}</span>
            </component>
          </template>
        </template>
      </nav>

      <!-- Sidebar footer: language selector + theme toggle -->
      <div class="shrink-0 border-t dark:border-gray-700 px-3 py-2 flex items-center gap-2" :class="sidebarOpen ? 'justify-start' : 'justify-center'">
        <LanguageSelector v-if="sidebarOpen" />
        <ThemeToggle />
      </div>
    </aside>

    <!-- Mobile drawer -->
    <div v-if="mobileOpen" class="md:hidden fixed inset-0 z-50 flex">
      <div class="w-64 bg-white dark:bg-gray-900 border-r dark:border-gray-700 flex flex-col shadow-xl">
        <div class="flex items-center justify-between px-4 h-12 border-b dark:border-gray-700">
          <NuxtLink to="/" class="font-bold text-gray-900 dark:text-white" @click="mobileOpen = false">{{ settings?.siteName }}</NuxtLink>
          <button @click="mobileOpen = false" class="p-1 text-gray-400 hover:text-gray-600">
            <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z"/></svg>
          </button>
        </div>
        <nav class="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
          <template v-for="(item, i) in settings?.nav ?? []" :key="i">
            <template v-if="item.children && item.children.length > 0">
              <button class="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800" @click="toggleDropdown(i)">
                {{ item.label }}
                <svg class="w-4 h-4 transition-transform" :class="{ 'rotate-180': openDropdown === i }" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd"/></svg>
              </button>
              <div v-if="openDropdown === i" class="pl-4 space-y-0.5">
                <component v-for="(child, ci) in item.children" :key="ci" :is="child.newTab ? 'a' : NuxtLink" :to="child.newTab ? undefined : child.href" :href="child.newTab ? child.href : undefined" v-bind="navLinkProps(child)" class="block px-3 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800" @click="mobileOpen = false">{{ child.label }}</component>
              </div>
            </template>
            <template v-else>
              <component :is="item.newTab ? 'a' : NuxtLink" :to="item.newTab ? undefined : item.href" :href="item.newTab ? item.href : undefined" v-bind="navLinkProps(item)" class="block px-3 py-2 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800" active-class="bg-indigo-50 text-indigo-600 font-medium" @click="mobileOpen = false">{{ item.label }}</component>
            </template>
          </template>
        </nav>
        <div class="shrink-0 border-t dark:border-gray-700 px-4 py-3 flex items-center gap-3">
          <LanguageSelector />
          <ThemeToggle />
        </div>
      </div>
      <!-- backdrop -->
      <div class="flex-1 bg-black/40" @click="mobileOpen = false" />
    </div>

  </template>
</template>
