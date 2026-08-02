import { GetPostsUseCase } from './get-posts-usecase';
import type { PostRepository } from '../repositories/post-repository';
import type { Post } from '../models/post';
import type { Result } from '../../core/result';
import { success } from '../../core/result';

/** A tiny in-line fake repository keeps this spec focused on the use case. */
function fakeRepo(posts: Post[]): PostRepository {
  return {
    async getPosts(): Promise<Result<Post[]>> {
      return success(posts);
    },
  };
}

describe('GetPostsUseCase', () => {
  it('delegates to the repository and returns its Result', async () => {
    const repo = fakeRepo([{ id: 1, title: 't', body: 'b' }]);
    const useCase = new GetPostsUseCase(repo);

    const result = await useCase.execute();
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toHaveLength(1);
  });
});
