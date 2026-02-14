"use client";

import React, { useState, useCallback } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface ShortAnswerWidgetProps {
  correctAnswer: string;
  isCompleted: boolean;
  onComplete: () => void;
  onAttempt: () => void;
  initialAnswer?: string;
  onAnswerChange?: (answer: string) => void;
}

// Normalize answer for comparison
const normalizeAnswer = (answer: string): string => {
  return answer.trim().toLowerCase().replace(/\s+/g, ' ').replace(/\s*=\s*/g, '=');
};

export const ShortAnswerWidget = ({
  correctAnswer,
  isCompleted,
  onComplete,
  onAttempt,
  initialAnswer = '',
  onAnswerChange,
}: ShortAnswerWidgetProps) => {
  const [userAnswer, setUserAnswer] = useState(initialAnswer);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  
  const handleAnswerChange = (value: string) => {
    setUserAnswer(value);
    if (onAnswerChange) {
      onAnswerChange(value);
    }
    if (feedback) setFeedback(null);
  };

  const checkAnswer = useCallback(() => {
    const correctNormalized = normalizeAnswer(correctAnswer);
    const userNormalized = normalizeAnswer(userAnswer);
    
    // Try exact match first
    let isCorrect = userNormalized === correctNormalized;
    
    // For numeric answers, also try parsing as numbers
    if (!isCorrect) {
      const correctNum = parseFloat(correctNormalized);
      const userNum = parseFloat(userNormalized);
      if (!isNaN(correctNum) && !isNaN(userNum)) {
        isCorrect = Math.abs(correctNum - userNum) < 0.0001;
      }
    }
    
    // Handle "x = 5" vs "5" cases
    if (!isCorrect && correctNormalized.includes('=')) {
      const correctValue = correctNormalized.split('=').pop()?.trim();
      if (correctValue && userNormalized === correctValue) {
        isCorrect = true;
      }
    }
    if (!isCorrect && !userNormalized.includes('=')) {
      const correctValue = correctNormalized.split('=').pop()?.trim();
      if (correctValue && userNormalized === correctValue) {
        isCorrect = true;
      }
    }
    
    setFeedback(isCorrect ? 'correct' : 'incorrect');
    onAttempt();
    
    if (isCorrect) {
      onComplete();
    }
  }, [correctAnswer, userAnswer, onComplete, onAttempt]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && userAnswer.trim()) {
      checkAnswer();
    }
  };

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-foreground">Your Answer</label>
      <div className="flex gap-3">
        <Input
          value={userAnswer}
          onChange={(e) => handleAnswerChange(e.target.value)}
          placeholder="Type your answer..."
          wrapperClassName={cn(
            isCompleted && "border-green-500 bg-green-500/5"
          )}
          className={cn(
            "flex-1 text-lg"
          )}
          disabled={isCompleted}
          onKeyDown={handleKeyDown}
        />
        <Button
          onClick={checkAnswer}
          disabled={!userAnswer.trim() || isCompleted}
          className={cn(
            isCompleted && "bg-green-600 hover:bg-green-600"
          )}
        >
          {isCompleted ? (
            <>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Correct
            </>
          ) : (
            'Check'
          )}
        </Button>
      </div>
      
      {/* Inline feedback for incorrect */}
      {feedback === 'incorrect' && !isCompleted && (
        <p className="text-sm text-red-600 dark:text-red-400">
          Not quite — try again or check the hints.
        </p>
      )}
    </div>
  );
};

export default ShortAnswerWidget;
