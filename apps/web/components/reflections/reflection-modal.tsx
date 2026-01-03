'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ReflectionEditor } from './reflection-editor';
import { useReflection } from '@/hooks/use-reflection';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { ReflectionContextType } from '@/types/reflections';
import type { Value } from 'platejs';
import { isReflectionComplete } from '@/types/reflections';

interface ReflectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contextType: ReflectionContextType;
  contextId: string;
  contextTitle: string;
  onComplete?: () => void;
}

export function ReflectionModal({
  open,
  onOpenChange,
  contextType,
  contextId,
  contextTitle,
  onComplete,
}: ReflectionModalProps) {
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

    // Check if reflection has meaningful content
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
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to save reflection');
      console.error('Error saving reflection:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    onOpenChange(false);
    onComplete?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className={cn(
          "w-[95vw] max-w-6xl sm:max-w-6xl max-h-[80vh] overflow-y-auto",
          "p-0"
        )}
      >
        {/* Header */}
        <DialogHeader className="px-8 pt-8 pb-4 space-y-3 border-b">
          <div className="flex items-start justify-between">
            <div className="space-y-1.5">
              <DialogTitle className="text-2xl font-semibold">
                Reflection
              </DialogTitle>
              <DialogDescription className="text-base text-muted-foreground">
                {contextTitle}
              </DialogDescription>
            </div>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Take a moment to consolidate your understanding. Be specific and concise—focus on 
            your reasoning and what you learned rather than storytelling.
          </p>
        </DialogHeader>

        {/* Editor Content */}
        <div className="px-8 py-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground" />
            </div>
          ) : (
            <ReflectionEditor
              initialValues={reflection ? {
                what_i_tried: reflection.what_i_tried,
                what_worked_or_failed: reflection.what_worked_or_failed,
                what_i_would_do_differently: reflection.what_i_would_do_differently,
              } : undefined}
              onChange={setValues}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-8 py-4 border-t bg-muted/20">
          <Button
            variant="ghost"
            onClick={handleSkip}
            disabled={saving}
          >
            Skip for now
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || loading || !values}
          >
            {saving ? 'Saving...' : 'Save Reflection'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
