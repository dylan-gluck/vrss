/**
 * Post Procedures
 * Post creation, retrieval, and management
 */

import type { Post, Comment, PostType, PostVisibility, PaginatedResponse } from '../types';

export namespace PostProcedures {
  // post.create
  export namespace Create {
    export interface Input {
      type: PostType;
      content?: string;
      mediaIds?: string[];
      tags?: string[];
      visibility: PostVisibility;
    }

    export interface Output {
      post: Post;
    }
  }

  // post.getById
  export namespace GetById {
    export interface Input {
      postId: string;
    }

    export interface Output {
      post: Post;
    }
  }

  // post.update
  export namespace Update {
    export interface Input {
      postId: string;
      content?: string;
      tags?: string[];
      visibility?: PostVisibility;
    }

    export interface Output {
      post: Post;
    }
  }

  // post.delete
  export namespace Delete {
    export interface Input {
      postId: string;
    }

    export interface Output {
      success: boolean;
    }
  }

  // post.getComments
  export namespace GetComments {
    export interface Input {
      postId: string;
      limit?: number;
      cursor?: string;
    }

    export interface Output extends PaginatedResponse<Comment> {}
  }
}
