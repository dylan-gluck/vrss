/**
 * Post Builder for Test Fixtures
 *
 * Flexible builder pattern for creating test posts with media.
 * Supports all post types: text, image, video, audio, gallery.
 */

import { Post, PostMedia, PostType, PostStatus, MediaType } from "@prisma/client";
import { getTestDatabase } from "../setup";

/**
 * Post builder with fluent interface
 */
export class PostBuilder {
  private data: Partial<{
    userId: bigint;
    type: PostType;
    status: PostStatus;
    title: string;
    content: string;
    contentHtml: string;
    mediaUrls: any;
    thumbnailUrl: string;
    likesCount: number;
    commentsCount: number;
    repostsCount: number;
    viewsCount: number;
    publishedAt: Date;
    scheduledFor: Date;
  }> = {};

  private mediaItems: Array<{
    type: MediaType;
    fileUrl: string;
    fileSizeBytes: bigint;
    mimeType: string;
    width?: number;
    height?: number;
    durationSeconds?: number;
    thumbnailUrl?: string;
    displayOrder: number;
  }> = [];

  /**
   * Set the user who creates the post (required)
   */
  byUser(userId: bigint): this {
    this.data.userId = userId;
    return this;
  }

  /**
   * Set post type
   */
  type(type: PostType): this {
    this.data.type = type;
    return this;
  }

  /**
   * Create a text post
   */
  asText(): this {
    this.data.type = "text_short";
    return this;
  }

  /**
   * Create an image post
   */
  asImage(): this {
    this.data.type = "image";
    return this;
  }

  /**
   * Create a video post
   */
  asVideo(): this {
    this.data.type = "video";
    return this;
  }

  /**
   * Create an audio post
   */
  asAudio(): this {
    this.data.type = "audio";
    return this;
  }

  /**
   * Create a gallery post
   */
  asGallery(): this {
    this.data.type = "gallery";
    return this;
  }

  /**
   * Set post status
   */
  status(status: PostStatus): this {
    this.data.status = status;
    return this;
  }

  /**
   * Mark as draft
   */
  draft(): this {
    this.data.status = "draft";
    return this;
  }

  /**
   * Mark as scheduled
   */
  scheduled(scheduledFor?: Date): this {
    this.data.status = "scheduled";
    if (scheduledFor) {
      this.data.scheduledFor = scheduledFor;
    }
    return this;
  }

  /**
   * Set post title
   */
  title(title: string): this {
    this.data.title = title;
    return this;
  }

  /**
   * Set post content
   */
  content(content: string, html?: string): this {
    this.data.content = content;
    if (html) {
      this.data.contentHtml = html;
    }
    return this;
  }

  /**
   * Set thumbnail URL
   */
  thumbnail(url: string): this {
    this.data.thumbnailUrl = url;
    return this;
  }

  /**
   * Set engagement metrics
   */
  withEngagement(metrics: {
    likes?: number;
    comments?: number;
    reposts?: number;
    views?: number;
  }): this {
    if (metrics.likes !== undefined) this.data.likesCount = metrics.likes;
    if (metrics.comments !== undefined) this.data.commentsCount = metrics.comments;
    if (metrics.reposts !== undefined) this.data.repostsCount = metrics.reposts;
    if (metrics.views !== undefined) this.data.viewsCount = metrics.views;
    return this;
  }

  /**
   * Mark as published
   */
  published(publishedAt?: Date): this {
    this.data.status = "published";
    this.data.publishedAt = publishedAt ?? new Date();
    return this;
  }

  /**
   * Add a media item to the post
   */
  addMedia(media: {
    type: MediaType;
    fileUrl: string;
    fileSizeBytes: bigint;
    mimeType: string;
    width?: number;
    height?: number;
    durationSeconds?: number;
    thumbnailUrl?: string;
  }): this {
    this.mediaItems.push({
      ...media,
      displayOrder: this.mediaItems.length,
    });
    return this;
  }

  /**
   * Add an image media item (convenience method)
   */
  addImage(options?: {
    fileUrl?: string;
    fileSizeBytes?: bigint;
    width?: number;
    height?: number;
  }): this {
    const timestamp = Date.now();
    return this.addMedia({
      type: "image",
      fileUrl: options?.fileUrl ?? `https://cdn.test.com/images/test_${timestamp}.jpg`,
      fileSizeBytes: options?.fileSizeBytes ?? BigInt(1024 * 512), // 512KB
      mimeType: "image/jpeg",
      width: options?.width ?? 1920,
      height: options?.height ?? 1080,
    });
  }

  /**
   * Add a video media item (convenience method)
   */
  addVideo(options?: {
    fileUrl?: string;
    fileSizeBytes?: bigint;
    durationSeconds?: number;
  }): this {
    const timestamp = Date.now();
    return this.addMedia({
      type: "video",
      fileUrl: options?.fileUrl ?? `https://cdn.test.com/videos/test_${timestamp}.mp4`,
      fileSizeBytes: options?.fileSizeBytes ?? BigInt(1024 * 1024 * 10), // 10MB
      mimeType: "video/mp4",
      width: 1920,
      height: 1080,
      durationSeconds: options?.durationSeconds ?? 60,
      thumbnailUrl: `https://cdn.test.com/thumbnails/test_${timestamp}.jpg`,
    });
  }

  /**
   * Add an audio media item (convenience method)
   */
  addAudio(options?: {
    fileUrl?: string;
    fileSizeBytes?: bigint;
    durationSeconds?: number;
  }): this {
    const timestamp = Date.now();
    return this.addMedia({
      type: "audio",
      fileUrl: options?.fileUrl ?? `https://cdn.test.com/audio/test_${timestamp}.mp3`,
      fileSizeBytes: options?.fileSizeBytes ?? BigInt(1024 * 1024 * 5), // 5MB
      mimeType: "audio/mpeg",
      durationSeconds: options?.durationSeconds ?? 180,
    });
  }

  /**
   * Generate default values
   */
  private getDefaults(): {
    type: PostType;
    status: PostStatus;
    content: string;
  } {
    return {
      type: "text_short",
      status: "published",
      content: "Test post content",
    };
  }

  /**
   * Build and save the post to database
   */
  async build(): Promise<{
    post: Post;
    media: PostMedia[];
  }> {
    if (!this.data.userId) {
      throw new Error("Post must have a userId. Use .byUser(userId) to set it.");
    }

    const db = getTestDatabase();
    const defaults = this.getDefaults();

    // Merge defaults with provided data
    const postData = {
      userId: this.data.userId,
      type: this.data.type ?? defaults.type,
      status: this.data.status ?? defaults.status,
      title: this.data.title,
      content: this.data.content ?? defaults.content,
      contentHtml: this.data.contentHtml,
      thumbnailUrl: this.data.thumbnailUrl,
      likesCount: this.data.likesCount ?? 0,
      commentsCount: this.data.commentsCount ?? 0,
      repostsCount: this.data.repostsCount ?? 0,
      viewsCount: this.data.viewsCount ?? 0,
      publishedAt: this.data.publishedAt,
      scheduledFor: this.data.scheduledFor,
    };

    // Create post
    const post = await db.post.create({
      data: postData,
    });

    // Create media items if any
    const media: PostMedia[] = [];
    if (this.mediaItems.length > 0) {
      for (const mediaItem of this.mediaItems) {
        const createdMedia = await db.postMedia.create({
          data: {
            postId: post.id,
            userId: this.data.userId,
            ...mediaItem,
          },
        });
        media.push(createdMedia);
      }
    }

    return { post, media };
  }

  /**
   * Build multiple posts with the same configuration
   */
  async buildMany(count: number): Promise<Array<{
    post: Post;
    media: PostMedia[];
  }>> {
    const posts = [];
    for (let i = 0; i < count; i++) {
      // Clone the builder configuration
      const builder = new PostBuilder();
      Object.assign(builder.data, this.data);
      builder.mediaItems = [...this.mediaItems];

      // Add variation to content if not specified
      if (!this.data.content) {
        builder.content(`Test post content ${i + 1}`);
      }

      posts.push(await builder.build());
    }
    return posts;
  }
}

/**
 * Create a new post builder
 */
export function buildPost(): PostBuilder {
  return new PostBuilder();
}

/**
 * Quick helper to create a basic text post
 */
export async function createTextPost(
  userId: bigint,
  content?: string
): Promise<Post> {
  const builder = buildPost()
    .byUser(userId)
    .asText()
    .published();

  if (content) {
    builder.content(content);
  }

  const result = await builder.build();
  return result.post;
}

/**
 * Quick helper to create an image post with media
 */
export async function createImagePost(
  userId: bigint,
  options?: {
    content?: string;
    imageCount?: number;
  }
): Promise<{ post: Post; media: PostMedia[] }> {
  const builder = buildPost()
    .byUser(userId)
    .asImage()
    .published();

  if (options?.content) {
    builder.content(options.content);
  }

  const imageCount = options?.imageCount ?? 1;
  for (let i = 0; i < imageCount; i++) {
    builder.addImage();
  }

  return await builder.build();
}

/**
 * Quick helper to create a video post with media
 */
export async function createVideoPost(
  userId: bigint,
  options?: {
    content?: string;
    durationSeconds?: number;
  }
): Promise<{ post: Post; media: PostMedia[] }> {
  const builder = buildPost()
    .byUser(userId)
    .asVideo()
    .published();

  if (options?.content) {
    builder.content(options.content);
  }

  builder.addVideo({
    durationSeconds: options?.durationSeconds,
  });

  return await builder.build();
}

/**
 * Quick helper to create a gallery post with multiple images
 */
export async function createGalleryPost(
  userId: bigint,
  options?: {
    content?: string;
    imageCount?: number;
  }
): Promise<{ post: Post; media: PostMedia[] }> {
  const builder = buildPost()
    .byUser(userId)
    .asGallery()
    .published();

  if (options?.content) {
    builder.content(options.content);
  }

  const imageCount = options?.imageCount ?? 3;
  for (let i = 0; i < imageCount; i++) {
    builder.addImage();
  }

  return await builder.build();
}
