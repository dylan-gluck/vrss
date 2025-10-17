/**
 * Media Procedures
 * File upload and media management
 */

import type { Media, MediaType } from "../types";

export namespace MediaProcedures {
  // media.initiateUpload
  export namespace InitiateUpload {
    export interface Input {
      filename: string;
      contentType: string;
      size: number;
    }

    export interface Output {
      uploadUrl: string;
      mediaId: string;
      expiresAt: Date;
    }
  }

  // media.completeUpload
  export namespace CompleteUpload {
    export interface Input {
      mediaId: string;
    }

    export interface Output {
      media: Media;
    }
  }

  // media.getStorageUsage
  export namespace GetStorageUsage {
    export type Input = Record<string, never>;

    export interface Output {
      used: number;
      limit: number;
      percentage: number;
    }
  }

  // media.deleteMedia
  export namespace DeleteMedia {
    export interface Input {
      mediaId: string;
    }

    export interface Output {
      success: boolean;
    }
  }

  // media.getMedia
  export namespace GetMedia {
    export interface Input {
      mediaId: string;
    }

    export interface Output {
      media: Media;
    }
  }

  // media.listMedia
  export namespace ListMedia {
    export interface Input {
      limit?: number;
      cursor?: string;
      type?: MediaType;
    }

    export interface Output {
      items: Media[];
      nextCursor: string | null;
      hasMore: boolean;
    }
  }
}
