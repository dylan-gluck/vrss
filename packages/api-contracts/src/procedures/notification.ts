/**
 * Notification Procedures
 * User notification management
 */

import type { Notification, PaginatedResponse } from "../types";

export namespace NotificationProcedures {
  // notification.getNotifications
  export namespace GetNotifications {
    export interface Input {
      limit?: number;
      cursor?: string;
      unreadOnly?: boolean;
    }

    export interface Output extends PaginatedResponse<Notification> {}
  }

  // notification.markAsRead
  export namespace MarkAsRead {
    export interface Input {
      notificationId: string;
    }

    export interface Output {
      success: boolean;
    }
  }

  // notification.markAllAsRead
  export namespace MarkAllAsRead {
    export type Input = Record<string, never>;

    export interface Output {
      count: number;
    }
  }

  // notification.getUnreadCount
  export namespace GetUnreadCount {
    export type Input = Record<string, never>;

    export interface Output {
      count: number;
    }
  }

  // notification.deleteNotification
  export namespace DeleteNotification {
    export interface Input {
      notificationId: string;
    }

    export interface Output {
      success: boolean;
    }
  }
}
