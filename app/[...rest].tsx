import { useGlobalSearchParams } from 'expo-router';
import { PlaceholderScreen } from '../src/ui/screens/placeholder-screen';

/**
 * Catch-all for not-yet-built topic routes. Every hub path that doesn't have a
 * dedicated file resolves here so navigation is always valid; the tile is the
 * SSOT for the human-readable title.
 */
export default function CatchAllScreen() {
  const params = useGlobalSearchParams<{ rest: string | string[] }>();
  const slug = Array.isArray(params.rest) ? params.rest[0] : params.rest;
  const title = prettify(slug);
  return <PlaceholderScreen title={title} />;
}

function prettify(slug: string | undefined): string {
  if (!slug) return 'Coming soon';
  return slug
    .split(/[-/]/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
