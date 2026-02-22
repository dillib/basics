import { useState, useCallback } from 'react';
import { apiRequest } from '@/lib/queryClient';

interface QuickTopicResult {
  title: string;
  description: string;
  category: string;
  difficulty: string;
  estimatedMinutes: number;
  keyPoints: string[];
}

interface UseQuickSearchResult {
  result: QuickTopicResult | null;
  isLoading: boolean;
  error: string | null;
  search: (query: string) => Promise<void>;
  clear: () => void;
}

export function useQuickSearch(): UseQuickSearchResult {
  const [result, setResult] = useState<QuickTopicResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (query: string) => {
    if (!query.trim()) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await apiRequest('POST', '/api/topics/quick-search', { 
        title: query.trim() 
      });
      
      if (!response.ok) {
        throw new Error('Failed to search');
      }
      
      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return { result, isLoading, error, search, clear };
}
