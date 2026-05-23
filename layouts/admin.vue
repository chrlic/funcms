<script setup lang="ts">
import type { SiteSettings } from '~/types'

const auth = useAuthStore()
const sidebarOpen = ref(true)

const { data: settingsData } = useAsyncData<{ data: SiteSettings }>(
  'site-settings',
  () => $fetch('/api/settings'),
  { lazy: true, default: () => ({ data: { siteName: 'FunCMS', nav: [], footer: [], logo: '', tagline: '', favicon: '', socialLinks: {}, customCss: '', headScripts: '', typography: { bodyFont: 'system-ui, sans-serif', headingFont: 'system-ui, sans-serif', baseSize: '16px', styles: [] } } }) }
)
const siteName = computed(() => settingsData.value?.data?.siteName || 'FunCMS')
const siteLogo = computed(() => settingsData.value?.data?.logo || '')

const navItems = [
  { label: 'Dashboard', href: '/admin' },
  { label: 'Pages', href: '/admin/pages' },
  { label: 'Media', href: '/admin/media' },
  { label: 'Block Types', href: '/admin/block-types' },
  { label: 'Site Map', href: '/admin/sitemap' },
  { label: 'Audit', href: '/admin/audit' },
  { label: 'Settings', href: '/admin/settings' },
  { label: 'Users', href: '/admin/users' },
]

// SVG paths for nav icons (heroicons solid)
const navIcons: Record<string, string> = {
  '/admin': 'M9.293 2.293a1 1 0 0 1 1.414 0l7 7A1 1 0 0 1 17 11h-1v6a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-6H3a1 1 0 0 1-.707-1.707l7-7Z',
  '/admin/pages': 'M4 4a2 2 0 0 1 2-2h4.586A2 2 0 0 1 12 2.586L15.414 6A2 2 0 0 1 16 7.414V16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4Z',
  '/admin/media': 'M1 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V6Zm16.5 4a.5.5 0 0 0-.5-.5H15a.5.5 0 0 0 0 1h2a.5.5 0 0 0 .5-.5ZM3 9a1 1 0 1 0 2 0A1 1 0 0 0 3 9Zm3.5 3.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z',
  '/admin/block-types': 'M3.25 3A2.25 2.25 0 0 0 1 5.25v9.5A2.25 2.25 0 0 0 3.25 17h13.5A2.25 2.25 0 0 0 19 14.75v-9.5A2.25 2.25 0 0 0 16.75 3H3.25Zm.943 8.752a.75.75 0 0 1 .05-1.06L6.867 9l-2.624-1.692a.75.75 0 1 1 .814-1.26l3.38 2.184a.75.75 0 0 1 0 1.27l-3.38 2.184a.75.75 0 0 1-1.06-.05ZM9.25 12a.75.75 0 0 0 0 1.5h5.5a.75.75 0 0 0 0-1.5h-5.5Z',
  '/admin/sitemap': 'M17 4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v.5H9V4a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2v-.5h2V6a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2V4ZM9 10.5v-.5H7.5A2.5 2.5 0 0 0 5 12.5V13H3.5a.5.5 0 0 0 0 1H5v.5A2.5 2.5 0 0 0 7.5 17H9v.5a.5.5 0 0 0 1 0V17h1.5A2.5 2.5 0 0 0 14 14.5V14h1.5a.5.5 0 0 0 0-1H14v-.5A2.5 2.5 0 0 0 11.5 10H10v-.5a.5.5 0 0 0-1 0Z',
  '/admin/audit': 'M10 1a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 10 1ZM5.05 3.05a.75.75 0 0 1 1.06 0l1.062 1.06A.75.75 0 1 1 6.11 5.173L5.05 4.11a.75.75 0 0 1 0-1.06ZM14.95 3.05a.75.75 0 0 1 0 1.06l-1.06 1.062a.75.75 0 0 1-1.062-1.061l1.061-1.061a.75.75 0 0 1 1.06 0ZM3 8.75A.75.75 0 0 1 3.75 8h1.5a.75.75 0 0 1 0 1.5h-1.5A.75.75 0 0 1 3 8.75ZM14.75 8a.75.75 0 0 0 0 1.5h1.5a.75.75 0 0 0 0-1.5h-1.5ZM10 6.5a2.25 2.25 0 1 0 0 4.5 2.25 2.25 0 0 0 0-4.5ZM4.5 14a.75.75 0 0 0 0 1.5h2.146a3.251 3.251 0 0 1 6.708 0H15.5a.75.75 0 0 0 0-1.5h-2.146a3.251 3.251 0 0 1-6.708 0H4.5Z',
  '/admin/settings': 'M9 1.833a.75.75 0 0 1 .75.75v1.036c.393.085.768.214 1.118.382l.733-.733a.75.75 0 0 1 1.06 1.06l-.732.733c.168.35.297.725.382 1.119h1.036a.75.75 0 0 1 0 1.5H12.31a5.493 5.493 0 0 1-.382 1.118l.733.733a.75.75 0 1 1-1.06 1.06l-.733-.732a5.493 5.493 0 0 1-1.118.382v1.036a.75.75 0 0 1-1.5 0V12.31a5.493 5.493 0 0 1-1.118-.382l-.733.733a.75.75 0 0 1-1.06-1.06l.732-.733A5.493 5.493 0 0 1 5.69 9.75H4.654a.75.75 0 0 1 0-1.5H5.69a5.493 5.493 0 0 1 .382-1.118l-.733-.733a.75.75 0 0 1 1.06-1.06l.733.732A5.493 5.493 0 0 1 8.25 5.69V4.654a.75.75 0 0 1 .75-.75ZM9 7.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z',
  '/admin/users': 'M7 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM14.5 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM1.615 16.428a1.224 1.224 0 0 1-.569-1.175 6.002 6.002 0 0 1 11.908 0c.058.467-.172.92-.57 1.174A9.953 9.953 0 0 1 7 17a9.953 9.953 0 0 1-5.385-1.572ZM14.5 16h-.106c.07-.297.088-.611.048-.933a7.47 7.47 0 0 0-1.588-3.755 4.502 4.502 0 0 1 5.874 2.636.818.818 0 0 1-.36.98A7.465 7.465 0 0 1 14.5 16Z',
}
</script>

<template>
  <div class="flex min-h-screen bg-gray-100 dark:bg-gray-900">
    <!-- Sidebar -->
    <aside
      class="flex flex-col bg-white dark:bg-gray-800 shadow-sm transition-all duration-200"
      :class="sidebarOpen ? 'w-60' : 'w-14'"
    >
      <!-- Logo / branding -->
      <div class="flex items-center gap-3 px-3 py-4 border-b dark:border-gray-700 min-h-[57px]">
        <button
          @click="sidebarOpen = !sidebarOpen"
          class="w-8 h-8 shrink-0 rounded-lg flex items-center justify-center text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition"
          :title="sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'"
        >
          <!-- bars-3 / chevron-left -->
          <svg v-if="sidebarOpen" class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" clip-rule="evenodd"/>
          </svg>
          <svg v-else class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75ZM2 10a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 10Zm0 5.25a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Z" clip-rule="evenodd"/>
          </svg>
        </button>
        <template v-if="sidebarOpen">
          <img v-if="siteLogo" :src="siteLogo" class="h-7 w-auto object-contain" :alt="siteName" />
          <span v-else class="text-lg font-bold text-indigo-600 truncate">{{ siteName }}</span>
        </template>
      </div>

      <!-- Nav -->
      <nav class="flex-1 px-2 py-3 space-y-0.5">
        <NuxtLink
          v-for="item in navItems"
          :key="item.href"
          :to="item.href"
          class="flex items-center gap-3 px-2 py-2 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          active-class="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-medium"
          :exact="item.href === '/admin'"
          :title="!sidebarOpen ? item.label : undefined"
        >
          <svg class="w-5 h-5 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path :d="navIcons[item.href]" />
          </svg>
          <span v-if="sidebarOpen" class="truncate">{{ item.label }}</span>
        </NuxtLink>
      </nav>

      <!-- User / logout -->
      <div class="px-2 py-3 border-t dark:border-gray-700">
        <ClientOnly>
        <div class="flex items-center gap-3 px-2 py-2">
          <div class="w-7 h-7 shrink-0 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold">
            {{ auth.user?.name?.[0]?.toUpperCase() }}
          </div>
          <template v-if="sidebarOpen">
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-900 dark:text-white truncate">{{ auth.user?.name }}</p>
              <p class="text-xs text-gray-500 truncate">{{ auth.user?.role }}</p>
            </div>
            <button @click="auth.logout()" class="text-gray-400 hover:text-gray-600" title="Log out">
              <!-- arrow-right-on-rectangle -->
              <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M3 4.25A2.25 2.25 0 0 1 5.25 2h5.5A2.25 2.25 0 0 1 13 4.25v2a.75.75 0 0 1-1.5 0v-2a.75.75 0 0 0-.75-.75h-5.5a.75.75 0 0 0-.75.75v11.5c0 .414.336.75.75.75h5.5a.75.75 0 0 0 .75-.75v-2a.75.75 0 0 1 1.5 0v2A2.25 2.25 0 0 1 10.75 18h-5.5A2.25 2.25 0 0 1 3 15.75V4.25Z" clip-rule="evenodd"/>
                <path fill-rule="evenodd" d="M19 10a.75.75 0 0 0-.75-.75H8.704l1.048-1.083a.75.75 0 1 0-1.004-1.114l-2.5 2.5a.75.75 0 0 0 0 1.114l2.5 2.5a.75.75 0 1 0 1.004-1.114l-1.048-1.083h9.546A.75.75 0 0 0 19 10Z" clip-rule="evenodd"/>
              </svg>
            </button>
          </template>
          <button v-else @click="auth.logout()" class="text-gray-400 hover:text-gray-600 mx-auto" title="Log out">
            <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M3 4.25A2.25 2.25 0 0 1 5.25 2h5.5A2.25 2.25 0 0 1 13 4.25v2a.75.75 0 0 1-1.5 0v-2a.75.75 0 0 0-.75-.75h-5.5a.75.75 0 0 0-.75.75v11.5c0 .414.336.75.75.75h5.5a.75.75 0 0 0 .75-.75v-2a.75.75 0 0 1 1.5 0v2A2.25 2.25 0 0 1 10.75 18h-5.5A2.25 2.25 0 0 1 3 15.75V4.25Z" clip-rule="evenodd"/>
              <path fill-rule="evenodd" d="M19 10a.75.75 0 0 0-.75-.75H8.704l1.048-1.083a.75.75 0 1 0-1.004-1.114l-2.5 2.5a.75.75 0 0 0 0 1.114l2.5 2.5a.75.75 0 1 0 1.004-1.114l-1.048-1.083h9.546A.75.75 0 0 0 19 10Z" clip-rule="evenodd"/>
            </svg>
          </button>
        </div>
        </ClientOnly>
      </div>
    </aside>

    <!-- Main content -->
    <main class="flex-1 overflow-auto flex flex-col min-w-0">
      <header class="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b dark:border-gray-700 px-6 py-3 flex items-center justify-end">
        <SessionToolbar />
      </header>
      <div class="max-w-6xl mx-auto px-6 py-8 w-full">
        <slot />
      </div>
    </main>
  </div>
</template>
