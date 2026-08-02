/**
 * Post — a pure domain model. It knows nothing about JSON, HTTP, or storage.
 * Consumed by use cases, hooks, and the UI. Mirrors the sibling guides' `Post`.
 */
export interface Post {
  id: number;
  title: string;
  body: string;
}
