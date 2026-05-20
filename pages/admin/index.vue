<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const headers = useRequestHeaders(['cookie'])
const { data } = await useFetch('/api/pages', {
  headers,
  credentials: 'include',
  query: { status: 'all', limit: 5 },
})
const pages = computed(() => (data.value as { data: unknown[] })?.data ?? [])
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-6">Dashboard</h1>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div class="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
        <p class="text-sm text-gray-500">Total Pages</p>
        <p class="text-3xl font-bold">{{ (data as { total?: number })?.total ?? 0 }}</p>
      </div>
    </div>

    <h2 class="text-lg font-semibold mb-3">Recent Pages</h2>
    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
          <tr>
            <th class="px-4 py-3 text-left">Title</th>
            <th class="px-4 py-3 text-left">Slug</th>
            <th class="px-4 py-3 text-left">Status</th>
            <th class="px-4 py-3 text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="page in pages"
            :key="(page as { _id: string })._id"
            class="border-t dark:border-gray-700"
          >
            <td class="px-4 py-3 font-medium">{{ (page as { title: string }).title }}</td>
            <td class="px-4 py-3 text-gray-500">{{ (page as { slug: string }).slug }}</td>
            <td class="px-4 py-3">
              <span class="px-2 py-1 rounded-full text-xs font-medium"
                :class="{
                  'bg-green-100 text-green-700': (page as { status: string }).status === 'published',
                  'bg-yellow-100 text-yellow-700': (page as { status: string }).status === 'draft',
                  'bg-gray-100 text-gray-600': (page as { status: string }).status === 'archived',
                }"
              >
                {{ (page as { status: string }).status }}
              </span>
            </td>
            <td class="px-4 py-3">
              <NuxtLink
                :to="`/admin/pages/${(page as { _id: string })._id}`"
                class="text-indigo-600 hover:underline"
              >Edit</NuxtLink>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="mt-4">
      <NuxtLink to="/admin/pages" class="text-indigo-600 hover:underline text-sm">View all pages →</NuxtLink>
    </div>
  </div>
</template>
