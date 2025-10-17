/**
 * Custom Feed Builder for Test Fixtures
 *
 * Flexible builder pattern for creating test custom feeds with filters.
 * Supports all filter types and operators.
 */

import type { CustomFeed, FeedFilter, FilterOperator, FilterType } from "@prisma/client";
import { getTestDatabase } from "../setup";

/**
 * Custom feed builder with fluent interface
 */
export class FeedBuilder {
  private data: Partial<{
    userId: bigint;
    name: string;
    description: string;
    algorithmConfig: any;
    isDefault: boolean;
    displayOrder: number;
  }> = {};

  private filters: Array<{
    type: FilterType;
    operator: FilterOperator;
    value: any;
    groupId?: number;
    logicalOperator?: string;
  }> = [];

  /**
   * Set the user who owns the feed (required)
   */
  forUser(userId: bigint): this {
    this.data.userId = userId;
    return this;
  }

  /**
   * Set feed name
   */
  name(name: string): this {
    this.data.name = name;
    return this;
  }

  /**
   * Set feed description
   */
  description(description: string): this {
    this.data.description = description;
    return this;
  }

  /**
   * Set algorithm configuration
   */
  algorithmConfig(config: any): this {
    this.data.algorithmConfig = config;
    return this;
  }

  /**
   * Mark as default feed
   */
  asDefault(): this {
    this.data.isDefault = true;
    return this;
  }

  /**
   * Set display order
   */
  displayOrder(order: number): this {
    this.data.displayOrder = order;
    return this;
  }

  /**
   * Add a filter to the feed
   */
  addFilter(filter: {
    type: FilterType;
    operator: FilterOperator;
    value: any;
    groupId?: number;
    logicalOperator?: string;
  }): this {
    this.filters.push({
      groupId: 0,
      logicalOperator: "AND",
      ...filter,
    });
    return this;
  }

  /**
   * Filter by post type
   */
  filterByPostType(types: string[], operator: FilterOperator = "in_range"): this {
    return this.addFilter({
      type: "post_type",
      operator,
      value: types,
    });
  }

  /**
   * Filter by user (only show posts from specific users)
   */
  filterByUser(userIds: bigint[], operator: FilterOperator = "in_range"): this {
    return this.addFilter({
      type: "author",
      operator,
      value: userIds.map((id) => id.toString()),
    });
  }

  /**
   * Filter by hashtag
   */
  filterByHashtag(hashtags: string[], operator: FilterOperator = "contains"): this {
    return this.addFilter({
      type: "tag",
      operator,
      value: hashtags,
    });
  }

  /**
   * Filter by engagement (e.g., minimum likes)
   */
  filterByEngagement(metric: "likes" | "comments" | "reposts", minValue: number): this {
    return this.addFilter({
      type: "engagement",
      operator: "greater_than",
      value: { metric, threshold: minValue },
    });
  }

  /**
   * Filter by date range
   */
  filterByDateRange(startDate: Date, endDate: Date): this {
    return this.addFilter({
      type: "date_range",
      operator: "in_range",
      value: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
    });
  }

  /**
   * Filter by content (keyword search)
   */
  filterByContent(keyword: string, operator: FilterOperator = "contains"): this {
    return this.addFilter({
      type: "content",
      operator,
      value: keyword,
    });
  }

  /**
   * Generate default values
   */
  private getDefaults(): {
    name: string;
    algorithmConfig: any;
  } {
    const timestamp = Date.now();
    return {
      name: `Test Feed ${timestamp}`,
      algorithmConfig: {
        sortBy: "created_at",
        sortOrder: "desc",
        limit: 50,
      },
    };
  }

  /**
   * Build and save the feed to database
   */
  async build(): Promise<{
    feed: CustomFeed;
    filters: FeedFilter[];
  }> {
    if (!this.data.userId) {
      throw new Error("Feed must have a userId. Use .forUser(userId) to set it.");
    }

    const db = getTestDatabase();
    const defaults = this.getDefaults();

    // Merge defaults with provided data
    const feedData = {
      userId: this.data.userId,
      name: this.data.name ?? defaults.name,
      description: this.data.description,
      algorithmConfig: this.data.algorithmConfig ?? defaults.algorithmConfig,
      isDefault: this.data.isDefault ?? false,
      displayOrder: this.data.displayOrder ?? 0,
    };

    // Create feed
    const feed = await db.customFeed.create({
      data: feedData,
    });

    // Create filters if any
    const createdFilters: FeedFilter[] = [];
    if (this.filters.length > 0) {
      for (const filter of this.filters) {
        const createdFilter = await db.feedFilter.create({
          data: {
            feedId: feed.id,
            type: filter.type,
            operator: filter.operator,
            value: filter.value,
            groupId: filter.groupId ?? 0,
            logicalOperator: filter.logicalOperator ?? "AND",
          },
        });
        createdFilters.push(createdFilter);
      }
    }

    return { feed, filters: createdFilters };
  }

  /**
   * Build multiple feeds with the same configuration
   */
  async buildMany(count: number): Promise<
    Array<{
      feed: CustomFeed;
      filters: FeedFilter[];
    }>
  > {
    const feeds = [];
    for (let i = 0; i < count; i++) {
      // Clone the builder configuration
      const builder = new FeedBuilder();
      Object.assign(builder.data, this.data);
      builder.filters = [...this.filters];

      // Make name unique if not specified
      if (!this.data.name) {
        builder.name(`Test Feed ${Date.now()}_${i}`);
      } else {
        builder.name(`${this.data.name} ${i + 1}`);
      }

      feeds.push(await builder.build());
    }
    return feeds;
  }
}

/**
 * Create a new feed builder
 */
export function buildFeed(): FeedBuilder {
  return new FeedBuilder();
}

/**
 * Quick helper to create a basic custom feed
 */
export async function createCustomFeed(userId: bigint, name?: string): Promise<CustomFeed> {
  const builder = buildFeed().forUser(userId);

  if (name) {
    builder.name(name);
  }

  const result = await builder.build();
  return result.feed;
}

/**
 * Quick helper to create a feed filtered by post type
 */
export async function createPostTypeFeed(
  userId: bigint,
  postTypes: string[],
  options?: {
    name?: string;
    description?: string;
  }
): Promise<{ feed: CustomFeed; filters: FeedFilter[] }> {
  const builder = buildFeed().forUser(userId).filterByPostType(postTypes);

  if (options?.name) {
    builder.name(options.name);
  }

  if (options?.description) {
    builder.description(options.description);
  }

  return await builder.build();
}

/**
 * Quick helper to create a feed filtered by user
 */
export async function createUserFeed(
  userId: bigint,
  followedUserIds: bigint[],
  options?: {
    name?: string;
    description?: string;
  }
): Promise<{ feed: CustomFeed; filters: FeedFilter[] }> {
  const builder = buildFeed().forUser(userId).filterByUser(followedUserIds);

  if (options?.name) {
    builder.name(options.name);
  } else {
    builder.name("Following Feed");
  }

  if (options?.description) {
    builder.description(options.description);
  }

  return await builder.build();
}

/**
 * Quick helper to create a feed with engagement filter
 */
export async function createEngagementFeed(
  userId: bigint,
  minLikes: number,
  options?: {
    name?: string;
    description?: string;
  }
): Promise<{ feed: CustomFeed; filters: FeedFilter[] }> {
  const builder = buildFeed().forUser(userId).filterByEngagement("likes", minLikes);

  if (options?.name) {
    builder.name(options.name);
  } else {
    builder.name("Popular Posts");
  }

  if (options?.description) {
    builder.description(options.description);
  }

  return await builder.build();
}

/**
 * Quick helper to create a hashtag feed
 */
export async function createHashtagFeed(
  userId: bigint,
  hashtags: string[],
  options?: {
    name?: string;
    description?: string;
  }
): Promise<{ feed: CustomFeed; filters: FeedFilter[] }> {
  const builder = buildFeed().forUser(userId).filterByHashtag(hashtags);

  if (options?.name) {
    builder.name(options.name);
  } else {
    builder.name(`#${hashtags[0]} Feed`);
  }

  if (options?.description) {
    builder.description(options.description);
  }

  return await builder.build();
}
