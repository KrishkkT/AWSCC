import { OnePassDB } from './db';

/**
 * Wraps a Next.js API route handler to ensure the OnePass database
 * is hydrated from Supabase (cloud source of truth) before processing.
 * 
 * This is essential for serverless deployments (Vercel, AWS Lambda)
 * where each cold start would otherwise read stale data from the
 * bundled local JSON file instead of the latest cloud state.
 * 
 * Usage:
 *   import { withHydration } from '@/lib/onepass/withHydration';
 *   export const GET = withHydration(async (req) => { ... });
 *   export const POST = withHydration(async (req) => { ... });
 */
export function withHydration(handler) {
    return async function hydratedHandler(...args) {
        await OnePassDB.ensureHydrated();
        return handler(...args);
    };
}
