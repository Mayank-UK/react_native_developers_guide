import type { Post } from '../models/post';
import type { Result } from '../../core/result';
import type { PostRepository } from '../repositories/post-repository';

/**
 * GetPostsUseCase — a thin orchestration layer over the repository. Mirrors the
 * sibling guides' `GetPostsUseCase`.
 *
 * It's a one-liner today, but the seam matters: use cases are where
 * cross-cutting policy (logging, caching policy, combining multiple
 * repositories, business rules) lives, keeping repositories focused on a single
 * source.
 */
export class GetPostsUseCase {
  private readonly repository: PostRepository;

  constructor(repository: PostRepository) {
    this.repository = repository;
  }

  execute(): Promise<Result<Post[]>> {
    return this.repository.getPosts();
  }
}
