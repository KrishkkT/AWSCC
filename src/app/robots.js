export default function robots() {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/community/', '/api/', '/admin'],
    },
    sitemap: 'https://aws.ddu.ac.in/sitemap.xml',
  }
}
