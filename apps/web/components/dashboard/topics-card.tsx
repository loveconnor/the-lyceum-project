"use client";

import { ChevronRight, ChevronLeft } from "lucide-react";
import { useState } from "react";

import { EmptyState } from "./empty-state";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export type Topic = {
  name: string;
  category?: string;
  confidence?: string;
  progress?: number; // percentage
  hours?: number; // hours studied
  count?: number;
};

export function TopicsCard({ topics = [] }: { topics?: Topic[] }) {
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 3;
  const hasTopics = topics.length > 0;
  
  // Calculate pagination
  const totalPages = Math.ceil(topics.length / itemsPerPage);
  const startIndex = currentPage * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentTopics = topics.slice(startIndex, endIndex);
  
  const canGoPrevious = currentPage > 0;
  const canGoNext = currentPage < totalPages - 1;
  
  const handlePrevious = () => {
    if (canGoPrevious) {
      setCurrentPage(currentPage - 1);
    }
  };
  
  const handleNext = () => {
    if (canGoNext) {
      setCurrentPage(currentPage + 1);
    }
  };

  return (
    <Card className="h-full">
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle>Top Topics</CardTitle>
        {hasTopics && totalPages > 1 && (
          <CardAction className="-mt-2.5">
            <div className="flex items-center gap-1">
              <Button 
                variant="outline" 
                size="icon" 
                aria-label="Previous topics"
                onClick={handlePrevious}
                disabled={!canGoPrevious}
              >
                <ChevronLeft />
              </Button>
              <Button 
                variant="outline" 
                size="icon" 
                aria-label="Next topics"
                onClick={handleNext}
                disabled={!canGoNext}
              >
                <ChevronRight />
              </Button>
            </div>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        {hasTopics ? (
          <div className="space-y-4">
            {currentTopics.map((topic, index) => (
              <li key={`${topic.name}-${startIndex + index}`} className="flex items-center space-x-4">
                <span className="text-muted-foreground">{startIndex + index + 1}.</span>
                <div className="flex-1">
                  <div className="font-medium">{topic.name}</div>
                  <div className="text-muted-foreground text-xs">
                    Topic • From activity
                  </div>
                </div>
                <Badge variant="outline">{Math.round(topic.progress ?? 0)}% progress</Badge>
              </li>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={ChevronRight}
            title="No topics yet"
            description="Complete an activity and we will surface your top strengths and focus areas."
          />
        )}
      </CardContent>
    </Card>
  );
}
