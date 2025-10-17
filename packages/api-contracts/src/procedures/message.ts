/**
 * Message Procedures
 * Direct messaging and conversation management
 */

import type { Conversation, Message, PaginatedResponse } from "../types";

export namespace MessageProcedures {
  // message.sendMessage
  export namespace SendMessage {
    export interface Input {
      conversationId?: string;
      recipientId?: string;
      content: string;
      mediaIds?: string[];
    }

    export interface Output {
      message: Message;
      conversation: Conversation;
    }
  }

  // message.getConversations
  export namespace GetConversations {
    export interface Input {
      limit?: number;
      cursor?: string;
    }

    export interface Output extends PaginatedResponse<Conversation> {}
  }

  // message.getMessages
  export namespace GetMessages {
    export interface Input {
      conversationId: string;
      limit?: number;
      cursor?: string;
    }

    export interface Output extends PaginatedResponse<Message> {}
  }

  // message.markAsRead
  export namespace MarkAsRead {
    export interface Input {
      messageId: string;
    }

    export interface Output {
      success: boolean;
    }
  }

  // message.deleteConversation
  export namespace DeleteConversation {
    export interface Input {
      conversationId: string;
    }

    export interface Output {
      success: boolean;
    }
  }
}
