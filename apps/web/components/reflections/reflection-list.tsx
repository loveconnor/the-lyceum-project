'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Eye, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Reflection } from '@/types/reflections';
import { EditorWidgetReadOnly } from '@/components/widgets';
import Link from 'next/link';

/**
 * ReflectionCard Component
 * 
 * Displays a single reflection in a card format with read-only content.
 * Useful for showing reflection history or reviewing past reflections.
 */
interface ReflectionCardProps {
  reflection: Reflection;
  onView?: (reflection: Reflection) => void;
  onDelete?: (reflection: Reflection) => void;
  compact?: boolean;
  className?: string;
  pathTitle?: string;
  pathId?: string;
}

export function ReflectionCard({
  reflection,
  onView,
  onDelete,
  compact = false,
  className,
  pathTitle,
  pathId,
}: ReflectionCardProps) {
  const [expanded, setExpanded] = React.useState(false);

  const contextTypeLabels: Record<string, string> = {
    lab: 'Lab',
    exercise: 'Exercise',
    module: 'Module',
    path_item: 'Learning Path Item',
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Determine if we should link to the module
  const isModule = reflection.context_type === 'module' || reflection.context_type === 'path_item';
  const hasModuleLink = isModule && pathId && reflection.context_id;
  const moduleHref = hasModuleLink ? `/paths/${pathId}/modules/${reflection.context_id}` : '#';

  const BadgeComponent = hasModuleLink ? (
    <Link href={moduleHref} className="hover:opacity-80 transition-opacity">
      <Badge variant="secondary">
        {contextTypeLabels[reflection.context_type]}
      </Badge>
    </Link>
  ) : (
    <Badge variant="secondary">
      {contextTypeLabels[reflection.context_type]}
    </Badge>
  );

  if (compact) {
    return (
      <Card className={cn("hover:border-primary/50 transition-colors", className)}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-2">
                {BadgeComponent}
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatDate(reflection.created_at)}
                </span>
              </div>
              <CardTitle className="text-base line-clamp-1">
                {reflection.context_title}
              </CardTitle>
              {pathTitle && (
                <p className="text-xs text-muted-foreground">
                  {pathTitle}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1">
              {onView && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onView(reflection)}
                  className="h-8 w-8 p-0"
                >
                  <Eye className="h-4 w-4" />
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(reflection)}
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              {BadgeComponent}
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatDate(reflection.created_at)}
              </span>
            </div>
            <div className="space-y-1">
              <CardTitle className="text-lg">
                {reflection.context_title}
              </CardTitle>
              {pathTitle && (
                <p className="text-sm text-muted-foreground">
                  {pathTitle}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? 'Hide' : 'Show'}
            </Button>
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(reflection)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-6 border-t pt-6">
          {/* What I Tried */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">
              What I Tried
            </h4>
            <div className="text-sm">
              <EditorWidgetReadOnly
                initialValue={reflection.what_i_tried}
                className="border-none p-0"
              />
            </div>
          </div>

          {/* What Worked or Didn't Work */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">
              What Worked or Didn't Work
            </h4>
            <div className="text-sm">
              <EditorWidgetReadOnly
                initialValue={reflection.what_worked_or_failed}
                className="border-none p-0"
              />
            </div>
          </div>

          {/* What I Would Do Differently */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">
              What I Would Do Differently
            </h4>
            <div className="text-sm">
              <EditorWidgetReadOnly
                initialValue={reflection.what_i_would_do_differently}
                className="border-none p-0"
              />
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

/**
 * ReflectionList Component
 * 
 * Displays a list of reflections, useful for a reflections history page
 */
interface ReflectionListProps {
  reflections: Reflection[];
  onView?: (reflection: Reflection) => void;
  onDelete?: (reflection: Reflection) => void;
  compact?: boolean;
  emptyMessage?: string;
  className?: string;
}

export function ReflectionList({
  reflections,
  onView,
  onDelete,
  compact = false,
  emptyMessage = 'No reflections yet',
  className,
}: ReflectionListProps) {
  if (reflections.length === 0) {
    return (
      <div className={cn("text-center py-12", className)}>
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {reflections.map((reflection) => (
        <ReflectionCard
          key={reflection.id}
          reflection={reflection}
          onView={onView}
          onDelete={onDelete}
          compact={compact}
        />
      ))}
    </div>
  );
}
