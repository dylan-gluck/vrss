/**
 * Feed Procedures
 * Custom feed management and timeline retrieval
 */

import type { Post, CustomFeed, FeedFilter, PaginatedResponse } from '../types';

export namespace FeedProcedures {
  // feed.getFeed
  export namespace GetFeed {
    export interface Input {
      feedId?: string;
      limit?: number;
      cursor?: string;
    }

    export interface Output extends PaginatedResponse<Post> {}
  }

  // feed.createFeed
  export namespace CreateFeed {
    export interface Input {
      name: string;
      filters: FeedFilter[];
      isDefault?: boolean;
    }

    export interface Output {
      feed: CustomFeed;
    }
  }

  // feed.updateFeed
  export namespace UpdateFeed {
    export interface Input {
      feedId: string;
      name?: string;
      filters?: FeedFilter[];
      isDefault?: boolean;
    }

    export interface Output {
      feed: CustomFeed;
    }
  }

  // feed.deleteFeed
  export namespace DeleteFeed {
    export interface Input {
      feedId: string;
    }

    export interface Output {
      success: boolean;
    }
  }

  // feed.listFeeds
  export namespace ListFeeds {
    export interface Input {}

    export interface Output {
      feeds: CustomFeed[];
    }
  }
}
