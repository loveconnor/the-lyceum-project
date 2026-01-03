'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import type {
  Reflection,
  CreateReflectionInput,
  UpdateReflectionInput,
  ReflectionContextType,
} from '@/types/reflections';

/**
 * Hook for managing reflections
 */
export function useReflection(contextType: ReflectionContextType, contextId: string) {
  const supabase = createClient();
  const [reflection, setReflection] = useState<Reflection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch existing reflection
  const fetchReflection = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error: fetchError } = await supabase
        .from('reflections')
        .select('*')
        .eq('user_id', user.id)
        .eq('context_type', contextType)
        .eq('context_id', contextId)
        .maybeSingle();

      if (fetchError) throw fetchError;
      
      setReflection(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch reflection'));
    } finally {
      setLoading(false);
    }
  }, [supabase, contextType, contextId]);

  // Create new reflection
  const createReflection = useCallback(
    async (input: CreateReflectionInput): Promise<Reflection> => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { data, error: createError } = await supabase
          .from('reflections')
          .insert({
            user_id: user.id,
            ...input,
          })
          .select()
          .single();

        if (createError) throw createError;
        if (!data) throw new Error('Failed to create reflection');

        setReflection(data);
        return data;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to create reflection');
        setError(error);
        throw error;
      }
    },
    [supabase]
  );

  // Update existing reflection
  const updateReflection = useCallback(
    async (input: UpdateReflectionInput): Promise<Reflection> => {
      try {
        if (!reflection) throw new Error('No reflection to update');

        const { data, error: updateError } = await supabase
          .from('reflections')
          .update(input)
          .eq('id', reflection.id)
          .select()
          .single();

        if (updateError) throw updateError;
        if (!data) throw new Error('Failed to update reflection');

        setReflection(data);
        return data;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to update reflection');
        setError(error);
        throw error;
      }
    },
    [supabase, reflection]
  );

  // Save reflection (create or update)
  const saveReflection = useCallback(
    async (input: CreateReflectionInput): Promise<Reflection> => {
      if (reflection) {
        return updateReflection(input);
      } else {
        return createReflection(input);
      }
    },
    [reflection, createReflection, updateReflection]
  );

  // Delete reflection
  const deleteReflection = useCallback(async () => {
    try {
      if (!reflection) throw new Error('No reflection to delete');

      const { error: deleteError } = await supabase
        .from('reflections')
        .delete()
        .eq('id', reflection.id);

      if (deleteError) throw deleteError;

      setReflection(null);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete reflection');
      setError(error);
      throw error;
    }
  }, [supabase, reflection]);

  // Fetch on mount and when context changes
  useEffect(() => {
    fetchReflection();
  }, [fetchReflection]);

  return {
    reflection,
    loading,
    error,
    saveReflection,
    deleteReflection,
    refetch: fetchReflection,
  };
}

/**
 * Hook for fetching all reflections for a user
 */
export function useReflections() {
  const supabase = createClient();
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchReflections = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error: fetchError } = await supabase
        .from('reflections')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setReflections(data || []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch reflections'));
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchReflections();
  }, [fetchReflections]);

  return {
    reflections,
    loading,
    error,
    refetch: fetchReflections,
  };
}
