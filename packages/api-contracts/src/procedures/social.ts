/**
 * Social Procedures
 * Following, friendship, and social graph management
 */

import type { Follow, Friendship, FriendshipStatus, PaginatedResponse, User } from "../types";

export namespace SocialProcedures {
  // social.follow
  export namespace Follow {
    export interface Input {
      userId: string;
    }

    export interface Output {
      follow: import("../types").Follow;
    }
  }

  // social.unfollow
  export namespace Unfollow {
    export interface Input {
      userId: string;
    }

    export interface Output {
      success: boolean;
    }
  }

  // social.getFollowers
  export namespace GetFollowers {
    export interface Input {
      userId: string;
      limit?: number;
      cursor?: string;
    }

    export interface Output extends PaginatedResponse<User> {}
  }

  // social.getFollowing
  export namespace GetFollowing {
    export interface Input {
      userId: string;
      limit?: number;
      cursor?: string;
    }

    export interface Output extends PaginatedResponse<User> {}
  }

  // social.sendFriendRequest
  export namespace SendFriendRequest {
    export interface Input {
      userId: string;
    }

    export interface Output {
      friendship: Friendship;
    }
  }

  // social.respondToFriendRequest
  export namespace RespondToFriendRequest {
    export interface Input {
      friendshipId: string;
      action: "accept" | "reject";
    }

    export interface Output {
      friendship: Friendship;
    }
  }

  // social.getFriends
  export namespace GetFriends {
    export interface Input {
      userId: string;
      limit?: number;
      cursor?: string;
    }

    export interface Output extends PaginatedResponse<User> {}
  }
}
