export default defineEventHandler(async (event) => {
  if (event.method !== 'POST') {
    throw createError({ statusCode: 405, statusMessage: 'Method Not Allowed' })
  }

  deleteCookie(event, 'cms_token', { path: '/' })
  return { message: 'Logged out' }
})
