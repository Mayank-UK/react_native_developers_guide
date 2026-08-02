import { guardedApiCall } from '../../core/error-handling/guards';
import { ServerException } from '../../core/error-handling/exceptions';
import type { HttpClient } from './http-client';
import { postDtoFromJson, type PostDTO } from './dtos/post-dto';

/**
 * PostRemoteDataSource — talks to the REST API and returns DTOs. Mirrors the
 * sibling guides' `PostRemoteDataSource`. Raw engine errors are upgraded to
 * typed AppExceptions by `guardedApiCall`; non-2xx responses are converted to a
 * `ServerException` (or `AuthException`) by the http client → guards pipeline.
 */
export interface PostRemoteDataSource {
  getPosts(): Promise<PostDTO[]>;
}

export class JsonPlaceholderPostRemoteDataSource implements PostRemoteDataSource {
  private readonly http: HttpClient;

  constructor(http: HttpClient) {
    this.http = http;
  }

  getPosts(): Promise<PostDTO[]> {
    return guardedApiCall(async () => {
      const json = await this.http.get<unknown>('/posts');

      if (!Array.isArray(json)) {
        throw new ServerException('Expected a list of posts');
      }

      return json.map((item) =>
        postDtoFromJson(item as Record<string, unknown>),
      );
    });
  }
}
