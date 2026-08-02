import type { Post } from '../models/post';
import type { Result } from '../../core/result';

/**
 * PostRepository — the domain-facing contract for reading posts. The UI / use
 * cases depend on this interface, never on the implementation. Mirrors the
 * sibling guides' `PostRepository`.
 */
export interface PostRepository {
  getPosts(): Promise<Result<Post[]>>;
}
