'use client';

import * as React from 'react';
import { ArrowLeft, Calendar, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ReflectionEditor } from './reflection-editor';
import { useReflection } from '@/hooks/use-reflection';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { ReflectionContextType } from '@/types/reflections';
import type { Value } from 'platejs';
import { isReflectionComplete } from '@/types/reflections';

interface ReflectionViewProps {
  contextType: ReflectionContextType;
  contextId: string;
  contextTitle: string;
  onBack?: () => void;
  onComplete?: () => void;
  className?: string;
}

/**
 * ReflectionView Component
 * 
 * A full-page reflection interface that can be used as a standalone page
 * or embedded in a larger flow. Uses minimal, focused UI to maintain
 * attention on the thinking and writing process.
 */
export function ReflectionView({
  contextType,
  contextId,
  contextTitle,
  onBack,
  onComplete,
  className,
}: ReflectionViewProps) {
  const { reflection, saveReflection, loading } = useReflection(contextType, contextId);
  const [values, setValues] = React.useState<{
    what_i_tried: Value;
    what_worked_or_failed: Value;
    what_i_would_do_differently: Value;
  } | null>(null);
  const [saving, setSaving] = React.useState(false);

  // Initialize values from existing reflection
  React.useEffect(() => {
    if (reflection && !values) {
      setValues({
        what_i_tried: reflection.what_i_tried,
        what_worked_or_failed: reflection.what_worked_or_failed,
        what_i_would_do_differently: reflection.what_i_would_do_differently,
      });
    }
  }, [reflection, values]);

  const handleSave = async () => {
    if (!values) return;

    const input = {
      context_type: contextType,
      context_id: contextId,
      context_title: contextTitle,
      what_i_tried: values.what_i_tried,
      what_worked_or_failed: values.what_worked_or_failed,
      what_i_would_do_differently: values.what_i_would_do_differently,
    };

    const isComplete = isReflectionComplete(input);
    
    if (!isComplete) {
      toast.error('Please complete all reflection sections');
      return;
    }

    try {
      setSaving(true);
      await saveReflection(input);
      toast.success('Reflection saved');
      onComplete?.();
    } catch (error) {
      toast.error('Failed to save reflection');
      console.error('Error saving reflection:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={cn("min-h-screen bg-background", className)}>
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container max-w-4xl py-6">
          <div className="flex items-center justify-between mb-4">
            {onBack && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            )}
          </div>
          
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight">
              Reflection
            </h1>
            <p className="text-lg text-muted-foreground">
              {contextTitle}
            </p>
          </div>

          <p className="mt-4 text-sm text-muted-foreground max-w-2xl leading-relaxed">
            Convert your experience into understanding. Write clearly and concisely about 
            what you tried, what happened, and what you learned.
          </p>

          {reflection && (
            <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                <span>
                  {new Date(reflection.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </div>
              {reflection.updated_at !== reflection.created_at && (
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  <span>
                    Updated {new Date(reflection.updated_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="container max-w-4xl py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-foreground" />
          </div>
        ) : (
          <div className="space-y-8">
            <ReflectionEditor
              initialValues={reflection ? {
                what_i_tried: reflection.what_i_tried,
                what_worked_or_failed: reflection.what_worked_or_failed,
                what_i_would_do_differently: reflection.what_i_would_do_differently,
              } : undefined}
              onChange={setValues}
            />

            <div className="flex items-center justify-end pt-4">
              <Button
                onClick={handleSave}
                disabled={saving || loading || !values}
                size="lg"
              >
                {saving ? 'Saving...' : 'Save Reflection'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
