import { describe, it, expect, beforeEach } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { queryClient } from '../queryClient';

describe('QueryClient', () => {
  describe('default configuration', () => {
    it('should be an instance of QueryClient', () => {
      expect(queryClient).toBeInstanceOf(QueryClient);
    });

    it('should have correct staleTime (5 minutes)', () => {
      const defaultOptions = queryClient.getDefaultOptions();
      expect(defaultOptions.queries?.staleTime).toBe(1000 * 60 * 5);
    });

    it('should have correct gcTime (30 minutes)', () => {
      const defaultOptions = queryClient.getDefaultOptions();
      expect(defaultOptions.queries?.gcTime).toBe(1000 * 60 * 30);
    });

    it('should have retry set to 3', () => {
      const defaultOptions = queryClient.getDefaultOptions();
      expect(defaultOptions.queries?.retry).toBe(3);
    });

    it('should have refetchOnWindowFocus enabled', () => {
      const defaultOptions = queryClient.getDefaultOptions();
      expect(defaultOptions.queries?.refetchOnWindowFocus).toBe(true);
    });
  });

  describe('query operations', () => {
    beforeEach(() => {
      queryClient.clear();
    });

    it('should set and get query data', () => {
      const testData = { id: '1', name: 'Test' };
      queryClient.setQueryData(['test'], testData);

      const data = queryClient.getQueryData(['test']);
      expect(data).toEqual(testData);
    });

    it('should invalidate queries', async () => {
      const testData = { id: '1', name: 'Test' };
      queryClient.setQueryData(['test'], testData);

      await queryClient.invalidateQueries({ queryKey: ['test'] });

      // Query should still exist but be marked as stale
      const cache = queryClient.getQueryCache();
      const queries = cache.findAll({ queryKey: ['test'] });
      expect(queries.length).toBeGreaterThan(0);
    });

    it('should remove queries', () => {
      const testData = { id: '1', name: 'Test' };
      queryClient.setQueryData(['test'], testData);

      queryClient.removeQueries({ queryKey: ['test'] });

      const data = queryClient.getQueryData(['test']);
      expect(data).toBeUndefined();
    });

    it('should clear all queries', () => {
      queryClient.setQueryData(['test1'], { id: '1' });
      queryClient.setQueryData(['test2'], { id: '2' });

      queryClient.clear();

      const cache = queryClient.getQueryCache();
      const allQueries = cache.getAll();
      expect(allQueries.length).toBe(0);
    });
  });

  describe('cache behavior', () => {
    beforeEach(() => {
      queryClient.clear();
    });

    it('should maintain multiple queries in cache', () => {
      queryClient.setQueryData(['query1'], { data: '1' });
      queryClient.setQueryData(['query2'], { data: '2' });
      queryClient.setQueryData(['query3'], { data: '3' });

      const cache = queryClient.getQueryCache();
      const allQueries = cache.getAll();
      expect(allQueries.length).toBe(3);
    });

    it('should support nested query keys', () => {
      const testData = { id: '1', posts: [] };
      queryClient.setQueryData(['users', '1', 'posts'], testData);

      const data = queryClient.getQueryData(['users', '1', 'posts']);
      expect(data).toEqual(testData);
    });

    it('should handle query key with parameters', () => {
      const testData = { id: '1', name: 'Test' };
      queryClient.setQueryData(['user', { id: '1' }], testData);

      const data = queryClient.getQueryData(['user', { id: '1' }]);
      expect(data).toEqual(testData);
    });
  });

  describe('query cache operations', () => {
    beforeEach(() => {
      queryClient.clear();
    });

    it('should find queries by partial key', () => {
      queryClient.setQueryData(['feed', 'algo1'], { posts: [] });
      queryClient.setQueryData(['feed', 'algo2'], { posts: [] });
      queryClient.setQueryData(['profile', 'user1'], { name: 'Test' });

      const cache = queryClient.getQueryCache();
      const feedQueries = cache.findAll({ queryKey: ['feed'] });
      expect(feedQueries.length).toBe(2);
    });

    it('should cancel queries', async () => {
      queryClient.setQueryData(['test'], { data: 'initial' });

      await queryClient.cancelQueries({ queryKey: ['test'] });

      // Should complete without error
      const data = queryClient.getQueryData(['test']);
      expect(data).toEqual({ data: 'initial' });
    });
  });

  describe('mutation operations', () => {
    beforeEach(() => {
      queryClient.clear();
    });

    it('should access mutation cache', () => {
      const mutationCache = queryClient.getMutationCache();
      expect(mutationCache).toBeDefined();
    });

    it('should clear mutation cache', () => {
      const mutationCache = queryClient.getMutationCache();
      mutationCache.clear();

      const allMutations = mutationCache.getAll();
      expect(allMutations.length).toBe(0);
    });
  });
});
