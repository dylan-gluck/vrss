/**
 * Discovery Procedures
 * Search and exploration features
 */

import type { PaginatedResponse, Post, User } from "../types";

export namespace DiscoveryProcedures {
  // discovery.searchUsers
  export namespace SearchUsers {
    export interface Input {
      query: string;
      limit?: number;
      cursor?: string;
    }

    export interface Output extends PaginatedResponse<User> {}
  }

  // discovery.searchPosts
  export namespace SearchPosts {
    export interface Input {
      query: string;
      limit?: number;
      cursor?: string;
    }

    export interface Output extends PaginatedResponse<Post> {}
  }

  // discovery.getDiscoverFeed
  export namespace GetDiscoverFeed {
    export interface Input {
      limit?: number;
      cursor?: string;
    }

    export interface Output extends PaginatedResponse<Post> {}
  }

  // discovery.getTrending
  export namespace GetTrending {
    export interface Input {
      limit?: number;
    }

    export interface Output {
      users: User[];
      posts: Post[];
      tags: string[];
    }
  }
}
