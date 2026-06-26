export default function sitemap() {
  const baseUrl = 'https://awscc-ddu.vercel.app';

  const routes = [
    '',
    '/about',
    '/community',
    '/community-day',
    '/contact',
    '/events',
    '/gallery',
    '/knowledge',
    '/resources',
    '/team',
    '/verify',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date().toISOString().split('T')[0],
    changeFrequency: 'monthly',
    priority: route === '' ? 1 : 0.8,
  }));

  return routes;
}
