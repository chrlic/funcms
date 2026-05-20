<script setup lang="ts">
const auth = useAuthStore()

const navItems = [
  { label: 'Dashboard', href: '/admin', icon: 'i-heroicons-home' },
  { label: 'Pages', href: '/admin/pages', icon: 'i-heroicons-document-text' },
  { label: 'Media', href: '/admin/media', icon: 'i-heroicons-photo' },
  { label: 'Settings', href: '/admin/settings', icon: 'i-heroicons-cog-6-tooth' },
  { label: 'Users', href: '/admin/users', icon: 'i-heroicons-users' },
]
</script>

<template>
  <div class="flex min-h-screen bg-gray-100 dark:bg-gray-900">
    <!-- Sidebar -->
    <aside class="w-60 bg-white dark:bg-gray-800 shadow-sm flex flex-col">
      <div class="px-6 py-5 border-b dark:border-gray-700">
        <span class="text-lg font-bold text-indigo-600">FunCMS</span>
      </div>

      <nav class="flex-1 px-3 py-4 space-y-1">
        <NuxtLink
          v-for="item in navItems"
          :key="item.href"
          :to="item.href"
          class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          active-class="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-medium"
        >
          <Icon :name="item.icon" class="w-5 h-5" />
          {{ item.label }}
        </NuxtLink>
      </nav>

      <div class="px-3 py-4 border-t dark:border-gray-700">
        <div class="flex items-center gap-3 px-3 py-2">
          <div class="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-bold">
            {{ auth.user?.name?.[0]?.toUpperCase() }}
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-gray-900 dark:text-white truncate">{{ auth.user?.name }}</p>
            <p class="text-xs text-gray-500 truncate">{{ auth.user?.role }}</p>
          </div>
          <button @click="auth.logout()" class="text-gray-400 hover:text-gray-600">
            <Icon name="i-heroicons-arrow-right-on-rectangle" class="w-5 h-5" />
          </button>
        </div>
      </div>
    </aside>

    <!-- Main content -->
    <main class="flex-1 overflow-auto flex flex-col">
      <header class="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b dark:border-gray-700 px-6 py-3 flex items-center justify-end">
        <SessionToolbar />
      </header>
      <div class="max-w-6xl mx-auto px-6 py-8 w-full">
        <slot />
      </div>
    </main>
  </div>
</template>
