"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  MessageSquareText, 
  ChevronLeft, 
  ChevronRight, 
  ArrowRight,
  HelpCircle, 
  CheckCircle2, 
  BookOpen,
  Lightbulb,
  ArrowLeft,
  Eye,
  GitBranch,
  Workflow,
  Network,
  FileText,
  Clock,
  X,
  Code2,
  Brain,
  CheckSquare,
  XCircle,
  Wrench,
  Globe,
  ChevronDown,
  ArrowDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "motion/react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Markdown } from "@/components/ui/custom/prompt/markdown";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  ReactFlow, 
  Background, 
  Controls, 
  Node, 
  Edge,
  MarkerType,
  Position
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './reactflow.css';
import Link from "next/link";
import { fetchPathItem, updatePathItemProgress, fetchPathById, renderRegistryModule } from "@/lib/api/paths";
import { fetchLabById, generateLab } from "@/lib/api/labs";
import { Lab } from "@/app/(main)/labs/types";
import LabViewer from "@/components/labs/lab-viewer";
import { toast } from "sonner";
import { ShortAnswerWidget, MultipleChoiceWidget, MultiStepWidget } from "@/components/exercises";
import { ReflectionModal } from "@/components/reflections";
import { shouldTriggerReflection } from "@/types/reflections";

// --- Types & Constants ---

interface Chapter {
  id: number;
  title: string;
  duration: string;
  content: string;
  quizzes: Array<{
    question: string;
    options: Array<{ id: string; text: string }>;
    correct: string;
    explanation?: string;
  }>;
}

interface ModuleData {
  id: string;
  title: string;
  description: string;
  content_mode?: 'ai_generated' | 'registry_backed';
  source_asset_id?: string | null;
  source_node_ids?: string[];
  content_unavailable?: boolean;
  last_resolved_at?: string | null;
  citation_display?: string;
  progress_data?: any;
  content_data: {
    overview: string;
    learning_objectives: string[];
    chapters?: Chapter[];
    key_concepts: Array<{
      concept: string;
      explanation: string;
      examples?: string[]; // Legacy support
      example_sections?: Array<{
        type: 'code' | 'conceptual' | 'pattern' | 'antipattern' | 'applied' | 'walkthrough';
        title: string;
        items: string[];
      }>;
    }>;
    practical_exercises: Array<{
      title: string;
      description: string;
      exercise_type?: 'short_answer' | 'multiple_choice' | 'multi_step';
      difficulty: string;
      estimated_time?: string;
      correct_answer?: string;
      options?: string[];
      hints?: string[];
      worked_example?: string;
      common_mistakes?: string[];
    }>;
    resources: Array<{
      type: 'reading' | 'video' | 'interactive';
      title: string;
      description: string;
    }>;
    assessment: {
      questions: Array<{
        question: string;
        type: 'multiple-choice' | 'short-answer' | 'practical';
        options?: string[];
        correct_answer?: string;
        explanation?: string;
      }>;
    };
    visuals?: Array<{
      title: string;
      description?: string;
      nodes: Array<{
        id: string;
        position: { x: number; y: number };
        data: { label: string };
        type?: 'default' | 'input' | 'output';
        style?: {
          background?: string;
          border?: string;
          borderRadius?: string;
          padding?: string;
          fontSize?: string;
          fontWeight?: number;
          width?: number;
          color?: string;
        };
      }>;
      edges: Array<{
        id: string;
        source: string;
        target: string;
        label?: string;
        type?: 'default' | 'straight' | 'step' | 'smoothstep' | 'bezier';
        animated?: boolean;
        style?: {
          stroke?: string;
          strokeWidth?: number;
        };
        labelStyle?: {
          fontSize?: number;
          fontWeight?: number;
        };
        markerEnd?: {
          type: 'arrow' | 'arrowclosed';
          color?: string;
        };
      }>;
    }>;
  } | null;
  item_type: string;
  status: string;
}

type ViewMode = "immersive_text" | "examples" | "visuals";

const TABS: { key: ViewMode; label: string; icon: React.ElementType }[] = [
  { key: "immersive_text", label: "Reading", icon: MessageSquareText },
  { key: "examples", label: "Examples", icon: Lightbulb },
  { key: "visuals", label: "Visuals", icon: Eye },
];

// --- Registry Content Helpers ---
const estimateReadingDuration = (text: string): string => {
  const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
  const minutes = Math.max(1, Math.round(words / 180));
  const upper = Math.max(minutes + 1, minutes + Math.ceil(minutes * 0.25));
  return `${minutes}-${upper} min`;
};

const buildConceptQuiz = (
  concept: { concept?: string; explanation?: string },
  distractors: string[]
) => {
  const correctOption = { id: 'A', text: concept.explanation || `This describes ${concept.concept || 'the topic'}.` };
  const incorrectOptions = distractors.slice(0, 3).map((text, idx) => ({ 
    id: String.fromCharCode(66 + idx), // B, C, D
    text 
  }));

  const options = [correctOption, ...incorrectOptions];

  while (options.length < 4) {
    options.push({
      id: String.fromCharCode(65 + options.length), // Continue with E, F if needed
      text: 'Not discussed in this section.',
    });
  }

  // Shuffle options so correct answer isn't always first
  const shuffled = [...options].sort(() => Math.random() - 0.5);

  return {
    question: `Which statement best describes ${concept.concept || 'this section'}?`,
    options: shuffled,
    correct: 'A', // Keep track of original correct option ID
    explanation: concept.explanation || 'This matches the source explanation.',
  };
};

const buildSectionQuiz = (title: string) => ({
  question: `What was the main idea of "${title}"?`,
  options: [
    { id: 'A', text: `It covered ${title}.` },
    { id: 'B', text: 'It was unrelated to this module.' },
    { id: 'C', text: 'It focused on different topics.' },
    { id: 'D', text: 'It provided background context only.' },
  ],
  correct: 'A',
  explanation: `This section focused on ${title}.`,
});

const normalizeRegistryContent = (
  moduleTitle: string,
  rendered: any
): ModuleData['content_data'] | null => {
  if (!rendered) return null;

  // If backend provided full chapters with quizzes, use those
  if (Array.isArray(rendered.chapters) && rendered.chapters.length > 0) {
    return {
      overview: rendered.overview || '',
      learning_objectives: rendered.learning_objectives || [],
      chapters: rendered.chapters,
      key_concepts: rendered.key_concepts || [],
      practical_exercises: rendered.practical_exercises || [],
      assessment: rendered.assessment || { questions: [] },
      visuals: rendered.visuals || [],
      resources: [],
    };
  }

  // Otherwise build chapters from sections (legacy fallback)
  const chapters: Chapter[] = [];
  const concepts = Array.isArray(rendered.key_concepts) ? rendered.key_concepts : [];

  const addChapter = (title: string, content: string, quiz: Chapter['quizzes'][number]) => {
    chapters.push({
      id: chapters.length + 1,
      title: title || `Section ${chapters.length + 1}`,
      duration: estimateReadingDuration(content),
      content: content || 'Content pending from source registry.',
      quizzes: [quiz],
    });
  };

  if (rendered.overview) {
    const quiz = concepts.length > 0
      ? buildConceptQuiz(concepts[0], concepts.slice(1).map(c => c.explanation || c.concept || ''))
      : buildSectionQuiz(`Overview: ${moduleTitle}`);

    addChapter(`Overview: ${moduleTitle}`, rendered.overview, quiz);
  }

  if (Array.isArray(rendered.sections)) {
    rendered.sections.forEach((section: any, idx: number) => {
      const concept = concepts[idx % (concepts.length || 1)] || { concept: section.title, explanation: section.content };
      const otherConcepts = concepts.filter((_, cIdx) => cIdx !== idx).map(c => c.explanation || c.concept || '');
      const quiz = concepts.length > 0
        ? buildConceptQuiz(concept, otherConcepts)
        : buildSectionQuiz(section.title || `Section ${idx + 1}`);

      addChapter(section.title || `Section ${idx + 1}`, section.content || rendered.overview || '', quiz);
    });
  }

  if (chapters.length === 0 && rendered.overview) {
    addChapter(`Overview: ${moduleTitle}`, rendered.overview, buildSectionQuiz(`Overview: ${moduleTitle}`));
  }

  if (chapters.length === 0) {
    addChapter(moduleTitle, 'No source content could be rendered for this module yet.', buildSectionQuiz(moduleTitle));
  }

  return {
    overview: rendered.overview || '',
    learning_objectives: rendered.learning_objectives || [],
    chapters,
    key_concepts: rendered.key_concepts || [],
    practical_exercises: rendered.practical_exercises || [],
    resources: rendered.resources || [],
    assessment: rendered.assessment || { questions: [] },
    visuals: rendered.visuals || [],
  };
};

// --- Utility Functions ---

/**
 * Auto-wraps LaTeX expressions in dollar signs if they're not already wrapped.
 * Detects common LaTeX commands like \mathbf, \frac, \int, \sum, etc.
 */
const ensureMathDelimiters = (text: string): string => {
  // If already has $ delimiters, return as-is
  if (text.includes('$')) {
    return text;
  }
  
  // Check if text contains LaTeX commands
  const latexPattern = /\\(?:mathbf|mathit|mathrm|frac|int|sum|prod|sqrt|vec|hat|bar|tilde|alpha|beta|gamma|delta|theta|lambda|mu|sigma|pi|infty|partial|nabla|cdot|times|div|pm|leq|geq|neq|approx|equiv|rightarrow|leftarrow|Rightarrow|Leftarrow)/;
  
  if (latexPattern.test(text)) {
    // Wrap entire text in inline math delimiters
    return `$${text}$`;
  }
  
  return text;
};

/**
 * Auto-detects and formats mathematical expressions for rendering.
 * Converts plain math notation to LaTeX-wrapped expressions.
 * Handles expressions like "x^2 + 2x + 1 = 0" or "f(x) = 2x + 3"
 */
const autoFormatMathExpression = (input: string): string => {
  // If already has $ delimiters, return as-is
  if (input.includes('$')) {
    return input;
  }
  
  const trimmed = input.trim();
  if (!trimmed) return input;
  
  // Check if text contains explicit LaTeX commands - wrap entire thing
  const latexCommandPattern = /\\(?:frac|sqrt|sum|prod|int|lim|sin|cos|tan|log|ln|exp|mathbf|mathit|mathrm|vec|hat|bar|tilde|alpha|beta|gamma|delta|theta|lambda|mu|sigma|pi|phi|psi|omega|infty|partial|nabla|cdot|times|div|pm|mp|leq|geq|neq|approx|equiv|rightarrow|leftarrow|Rightarrow|Leftarrow|subset|supset|cup|cap|in|forall|exists|left|right|begin|end)/;
  
  if (latexCommandPattern.test(trimmed)) {
    return `$${trimmed}$`;
  }
  
  // Patterns that strongly indicate mathematical content
  const mathIndicators = [
    /[a-zA-Z]\s*\^\s*[\d{}\w]/,        // Exponents: x^2, x^{2n}
    /[a-zA-Z]\s*_\s*[\d{}\w]/,          // Subscripts: x_1, a_{n}
    /\d+\s*[a-zA-Z]/,                    // Coefficients: 2x, 3y
    /[a-zA-Z]\s*\(\s*[a-zA-Z]\s*\)/,    // Functions: f(x), g(t)
    /[=<>]\s*\d/,                        // Equations/inequalities: = 5, > 3
    /\d\s*[=<>]/,                        // Equations/inequalities: 5 =, 3 <
    /[+\-*/]\s*[a-zA-Z]/,               // Operations with variables: + x, - y
    /[a-zA-Z]\s*[+\-*/=]\s*[a-zA-Z\d]/, // Variable operations: x + y, a = 5
    /\(\s*[a-zA-Z\d+\-*/^_\s]+\s*\)/,   // Expressions in parens: (x + 1)
    /[±≤≥≠≈∞∑∏∫√]/,                     // Unicode math symbols
  ];
  
  const hasMathContent = mathIndicators.some(pattern => pattern.test(trimmed));
  
  if (hasMathContent) {
    // Process line by line for multi-line input
    const lines = trimmed.split('\n');
    const processedLines = lines.map(line => {
      const lineTrimmed = line.trim();
      if (!lineTrimmed) return line;
      
      // Check if line looks like pure text (starts with common text patterns)
      const textPatterns = /^(therefore|hence|since|because|let|where|given|note|thus|so|if|then|when|for|the|a|an|is|are|was|were|this|that|these|those|we|can|get|have|by|from|to|with|using|applying|substituting|factoring|expanding|simplifying|solving|evaluating)/i;
      
      if (textPatterns.test(lineTrimmed)) {
        // It's explanatory text - check if it contains inline math
        // Look for math-like segments within the text
        return lineTrimmed.replace(
          /([a-zA-Z]\s*[=<>≤≥]\s*[\d\w+\-*/^_().\s]+)|(\d+\s*[a-zA-Z][\w+\-*/^_().\s]*)|([a-zA-Z]\s*\^\s*\d+)|([a-zA-Z]\s*_\s*\d+)/g,
          (match) => `$${match.trim()}$`
        );
      }
      
      // Entire line looks like a math expression - wrap it
      if (mathIndicators.some(pattern => pattern.test(lineTrimmed))) {
        return `$${lineTrimmed}$`;
      }
      
      return line;
    });
    
    return processedLines.join('\n');
  }
  
  return input;
};

// --- Components ---

const ImmersiveTextView = ({ 
  chapters,
  isQuizPassed, 
  setIsQuizPassed,
  currentChapter,
  setCurrentChapter,
  currentQuestionIndex,
  setCurrentQuestionIndex,
  selectedOption,
  setSelectedOption,
  isCorrect,
  setIsCorrect,
  completedChapters,
  setCompletedChapters,
  completedQuestions,
  setCompletedQuestions
}: { 
  chapters: Chapter[];
  isQuizPassed: boolean; 
  setIsQuizPassed: (v: boolean) => void;
  currentChapter: number;
  setCurrentChapter: (v: number) => void;
  currentQuestionIndex: number;
  setCurrentQuestionIndex: (v: number) => void;
  selectedOption: string | null;
  setSelectedOption: (v: string | null) => void;
  isCorrect: boolean | null;
  setIsCorrect: (v: boolean | null) => void;
  completedChapters: Set<number>;
  setCompletedChapters: React.Dispatch<React.SetStateAction<Set<number>>>;
  completedQuestions: Set<number>;
  setCompletedQuestions: React.Dispatch<React.SetStateAction<Set<number>>>;
}) => {

  if (!chapters || chapters.length === 0) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <p className="text-muted-foreground">No chapter content available for this module.</p>
      </div>
    );
  }

  const currentQuiz = chapters[currentChapter].quizzes[currentQuestionIndex];

  const handleOptionSelect = (optionId: string) => {
    setSelectedOption(optionId);
    const correct = optionId === currentQuiz.correct;
    setIsCorrect(correct);
    
    if (correct) {
      const newCompletedQuestions = new Set(completedQuestions);
      newCompletedQuestions.add(currentQuestionIndex);
      setCompletedQuestions(newCompletedQuestions);
      
      if (newCompletedQuestions.size === chapters[currentChapter].quizzes.length) {
        const newCompletedChapters = new Set(completedChapters);
        newCompletedChapters.add(currentChapter);
        setCompletedChapters(newCompletedChapters);
        
        if (newCompletedChapters.size === chapters.length) {
          setIsQuizPassed(true);
        }
      }
    }
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < chapters[currentChapter].quizzes.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedOption(null);
      setIsCorrect(null);
    } else if (currentChapter < chapters.length - 1) {
      setCurrentChapter(currentChapter + 1);
      setCurrentQuestionIndex(0);
      setCompletedQuestions(new Set());
      setSelectedOption(null);
      setIsCorrect(null);
      // Scroll to top when moving to next chapter
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="flex h-full gap-8">
      {/* Left Chapter Outline Sidebar */}
      <div className="w-64 flex-shrink-0 hidden xl:block">
        <div className="sticky top-[calc(var(--header-height)+6rem)]">
          <Card className="py-0 overflow-hidden">
            <CardContent className="p-2">
              <div className="flex items-center justify-between px-2 py-1.5 mb-0.5">
                <h3 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Chapter Outline</h3>
                <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                  {chapters.length}
                </Badge>
              </div>
              <nav className="flex flex-col space-y-0">
                {chapters.map((chapter, i) => {
                  const isLocked = i > 0 && !completedChapters.has(i - 1);
                  const isActive = currentChapter === i;
                  const isDone = completedChapters.has(i);

                  return (
                    <Button
                      key={chapter.id}
                      variant="ghost"
                      onClick={() => {
                        if (!isLocked) {
                          setCurrentChapter(i);
                          setCurrentQuestionIndex(0);
                          setCompletedQuestions(new Set());
                          setSelectedOption(null);
                          setIsCorrect(null);
                          // Scroll to top when changing chapters
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }
                      }}
                      disabled={isLocked}
                      className={cn(
                        "w-full justify-start h-auto py-1.5 px-2 flex-col items-start gap-0.5",
                        isActive && "bg-muted hover:bg-muted"
                      )}
                    >
                      <div className="flex items-center gap-2.5 w-full">
                        {isDone ? (
                          <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-green-600 dark:text-green-400" />
                        ) : (
                          <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-semibold transition-colors bg-muted text-muted-foreground">
                            <span>{i + 1}</span>
                          </div>
                        )}
                        <span className="text-sm font-semibold text-left flex-1 line-clamp-2 break-words prose prose-sm prose-stone dark:prose-invert max-w-none [&>p]:m-0 [&>p]:inline [&_code]:text-[1em] [&_code]:font-semibold [&_code]:before:content-none [&_code]:after:content-none [&_code]:px-0 [&_code]:py-0 [&_code]:bg-transparent">
                          <Markdown>{chapter.title}</Markdown>
                        </span>
                      </div>
                      <div className="flex items-center gap-3 ml-7 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {chapter.duration}
                        </div>
                        <div className="flex items-center gap-1">
                          <HelpCircle className="w-3 h-3" />
                          {chapter.quizzes.length} questions
                        </div>
                      </div>
                    </Button>
                  );
                })}
              </nav>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main Reading Surface */}
      <div className="flex-1 max-w-3xl mx-auto">
        <motion.div 
          key={currentChapter}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="pb-32"
        >
          {/* Chapter Title */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Badge variant="outline" className="text-xs">
                Chapter {currentChapter + 1}
              </Badge>
              <span className="text-xs text-muted-foreground">{chapters[currentChapter].duration}</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight prose prose-stone dark:prose-invert max-w-none [&>p]:m-0 [&>p]:inline [&_code]:text-[1em] [&_code]:font-bold [&_code]:before:content-none [&_code]:after:content-none [&_.katex]:text-[1em]">
              <Markdown>{chapters[currentChapter].title}</Markdown>
            </h1>
          </div>

          <div className="prose prose-stone dark:prose-invert max-w-none mb-16">
            <Markdown>{chapters[currentChapter].content}</Markdown>
          </div>

          <Separator className="my-12" />

          {/* Quiz Section */}
          <div className="space-y-4 max-w-3xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Check your understanding</h2>
                <p className="text-sm text-muted-foreground mt-0.5">Complete these questions to proceed to the next section.</p>
              </div>
              <div className="text-sm text-muted-foreground">
                {currentQuestionIndex + 1} / {chapters[currentChapter].quizzes.length}
              </div>
            </div>

            <Card className="border shadow-none">
              <CardContent className="p-6 space-y-5">
                <div className="space-y-3">
                  <div className="flex gap-1.5">
                    {chapters[currentChapter].quizzes.map((_, i) => (
                      <div 
                        key={i}
                        className={cn(
                          "h-1 flex-1 rounded-full transition-all duration-300",
                          i < currentQuestionIndex ? "bg-primary" : 
                          i === currentQuestionIndex ? "bg-primary/40" : "bg-muted"
                        )}
                      />
                    ))}
                  </div>
                  <div className="text-base font-medium leading-relaxed">
                    <Markdown components={{ p: ({ children }) => <>{children}</> }}>
                      {ensureMathDelimiters(currentQuiz.question)}
                    </Markdown>
                  </div>
                </div>
                
                <div className="grid gap-2">
                  {currentQuiz.options.map((option) => (
                    <button 
                      key={option.id} 
                      onClick={() => handleOptionSelect(option.id)}
                      disabled={isCorrect === true}
                      className={cn(
                        "w-full text-left px-3.5 py-3 rounded-lg border transition-all flex items-center gap-3 group relative",
                        selectedOption === option.id 
                          ? (isCorrect ? "border-green-500/50 bg-green-500/5" : "border-destructive/50 bg-destructive/5")
                          : "border-border hover:border-primary/30 hover:bg-accent/30",
                        isCorrect === true && selectedOption !== option.id && "opacity-40"
                      )}
                    >
                      <div className={cn(
                        "w-7 h-7 rounded-md flex items-center justify-center text-sm font-semibold transition-all flex-shrink-0",
                        selectedOption === option.id
                          ? (isCorrect ? "bg-green-500 text-white" : "bg-destructive text-white")
                          : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-foreground"
                      )}>
                        {option.id}
                      </div>
                      <div className="text-sm font-medium flex-1">
                        <Markdown components={{ p: ({ children }) => <span className="inline">{children}</span> }}>
                          {ensureMathDelimiters(option.text)}
                        </Markdown>
                      </div>
                      
                      {selectedOption === option.id && isCorrect && (
                        <motion.div 
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="flex-shrink-0"
                        >
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        </motion.div>
                      )}
                    </button>
                  ))}
                </div>

                <AnimatePresence mode="wait">
                  {isCorrect === true && (
                    <motion.div 
                      key="correct-feedback"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="space-y-3 pt-1"
                    >
                      <div className="px-3 py-2.5 bg-green-500/10 dark:bg-green-500/5 border border-green-500/20 rounded-lg flex items-center gap-2.5">
                        <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                          <CheckCircle2 className="w-3 h-3 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-green-700 dark:text-green-400">
                            {currentQuestionIndex === chapters[currentChapter].quizzes.length - 1 && currentChapter === chapters.length - 1
                              ? "Reading completed! Check out the other tabs."
                              : "Correct"}
                          </p>
                          {currentQuiz.explanation && (
                            <div className="text-xs text-green-600/80 dark:text-green-400/80 mt-1">
                              <Markdown components={{ p: ({ children }) => <>{children}</> }}>
                                {currentQuiz.explanation}
                              </Markdown>
                            </div>
                          )}
                        </div>
                      </div>

                      {!(currentQuestionIndex === chapters[currentChapter].quizzes.length - 1 && currentChapter === chapters.length - 1) && (
                        <Button 
                          onClick={nextQuestion}
                          className="w-full font-medium group"
                        >
                          {currentQuestionIndex < chapters[currentChapter].quizzes.length - 1 
                            ? "Next Question" 
                            : "Next Chapter"}
                          <ChevronRight className="ml-1.5 w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                        </Button>
                      )}
                    </motion.div>
                  )}

                  {isCorrect === false && (
                    <motion.div 
                      key="incorrect-feedback"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="px-3 py-2.5 bg-destructive/10 dark:bg-destructive/5 border border-destructive/20 rounded-lg flex items-center gap-2.5 pt-1"
                    >
                      <div className="w-5 h-5 rounded-full bg-destructive flex items-center justify-center flex-shrink-0">
                        <X className="w-3 h-3 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-destructive">Incorrect — try again</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

// Helper to get neutral, adaptive label for example type
const getExampleTypeLabel = (type: string): string => {
  switch (type) {
    case 'code':
      return 'Code Example';
    case 'conceptual':
      return 'Concept Example';
    case 'pattern':
      return 'Pattern Example';
    case 'antipattern':
      return 'Common Mistake';
    case 'applied':
      return 'Applied Example';
    case 'walkthrough':
      return 'Walkthrough';
    default:
      return 'Example';
  }
};

// Helper to get icon for example section type
const getExampleSectionIcon = (type: string) => {
  switch (type) {
    case 'code':
      return Code2;
    case 'conceptual':
      return Brain;
    case 'pattern':
      return CheckSquare;
    case 'antipattern':
      return XCircle;
    case 'applied':
      return Wrench;
    case 'walkthrough':
      return ArrowRight;
    default:
      return Lightbulb;
  }
};

// --- Concepts Sub-Tab (Passive, illustrative examples) ---
const ConceptsSubView = ({
  keyConcepts,
  currentIndex,
  setCurrentIndex,
  viewedConcepts,
}: {
  keyConcepts: Array<{
    concept: string;
    explanation: string;
    examples?: string[];
    example_sections?: Array<{
      type: 'code' | 'conceptual' | 'pattern' | 'antipattern' | 'applied' | 'walkthrough';
      title: string;
      items: string[];
    }>;
  }>;
  currentIndex: number;
  setCurrentIndex: (i: number) => void;
  viewedConcepts: Set<number>;
}) => {
  const currentConcept = keyConcepts[currentIndex];
  
  if (!currentConcept) return null;

  return (
    <motion.div
      key={`concept-${currentIndex}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Concept Header */}
      <div>
        <Badge variant="outline" className="mb-3">
          Concept {currentIndex + 1} of {keyConcepts.length}
        </Badge>
        <h2 className="text-2xl font-semibold mb-3">{currentConcept.concept}</h2>
        <div className="prose prose-stone dark:prose-invert max-w-none break-words">
          <Markdown>{currentConcept.explanation}</Markdown>
        </div>
      </div>

      <Separator />

      {/* Adaptive Examples - render based on example_sections or fallback to legacy examples */}
      {currentConcept.example_sections && currentConcept.example_sections.length > 0 ? (
        <div className="space-y-6">
          {currentConcept.example_sections.map((section, sectionIdx) => {
            const Icon = getExampleSectionIcon(section.type);
            const label = section.title || getExampleTypeLabel(section.type);
            
            return (
              <div key={sectionIdx} className="space-y-3">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Icon className="w-5 h-5 text-muted-foreground" />
                  {label}
                </h3>
                <div className="space-y-3">
                  {section.items.map((item, itemIdx) => (
                    <Card key={itemIdx} className="border shadow-none">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-xs font-medium text-muted-foreground">
                              {itemIdx + 1}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="prose prose-sm prose-stone dark:prose-invert max-w-none break-words overflow-hidden">
                              <Markdown>{item}</Markdown>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : currentConcept.examples && currentConcept.examples.length > 0 ? (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-muted-foreground" />
            Examples
          </h3>
          <div className="space-y-3">
            {currentConcept.examples.map((example, i) => (
              <Card key={i} className="border shadow-none">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-medium text-muted-foreground">{i + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="prose prose-sm prose-stone dark:prose-invert max-w-none break-words overflow-hidden">
                        <Markdown>{example}</Markdown>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : null}

      {/* Navigation buttons */}
      <div className="flex items-center justify-between pt-6">
        <Button
          variant="outline"
          onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
          disabled={currentIndex === 0}
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Previous
        </Button>
        <span className="text-sm text-muted-foreground">
          {currentIndex + 1} of {keyConcepts.length}
        </span>
        <Button
          variant="outline"
          onClick={() => setCurrentIndex(Math.min(keyConcepts.length - 1, currentIndex + 1))}
          disabled={currentIndex === keyConcepts.length - 1}
        >
          Next
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </motion.div>
  );
};

// --- Exercises Sub-Tab (Active workspace with AI-selected widgets) ---
const ExercisesSubView = ({
  practicalExercises,
  currentIndex,
  setCurrentIndex,
  attemptedExercises,
  setAttemptedExercises,
  completedExercises,
  setCompletedExercises,
}: {
  practicalExercises: Array<{
    title: string;
    description: string;
    exercise_type?: 'short_answer' | 'multiple_choice' | 'multi_step';
    difficulty: string;
    estimated_time?: string;
    correct_answer?: string;
    options?: string[];
    hints?: string[];
    worked_example?: string;
    common_mistakes?: string[];
  }>;
  currentIndex: number;
  setCurrentIndex: (i: number) => void;
  attemptedExercises: Set<number>;
  setAttemptedExercises: React.Dispatch<React.SetStateAction<Set<number>>>;
  completedExercises: Set<number>;
  setCompletedExercises: React.Dispatch<React.SetStateAction<Set<number>>>;
}) => {
  // Support section state
  const [showHints, setShowHints] = useState(false);
  const [showWorkedExample, setShowWorkedExample] = useState(false);
  const [showCommonMistakes, setShowCommonMistakes] = useState(false);
  const [hintsRevealed, setHintsRevealed] = useState(0);
  
  const currentExercise = practicalExercises[currentIndex];
  const hasAttempted = attemptedExercises.has(currentIndex);
  const isCompleted = completedExercises.has(currentIndex);
  
  // Determine widget type from exercise data (AI-selected) or fallback detection
  const widgetType = currentExercise?.exercise_type || 
    (currentExercise?.options && currentExercise.options.length > 0 ? 'multiple_choice' : 
     currentExercise?.correct_answer ? 'short_answer' : 'multi_step');
  
  // Reset support states when changing exercises
  useEffect(() => {
    setShowHints(false);
    setShowWorkedExample(false);
    setShowCommonMistakes(false);
    setHintsRevealed(0);
  }, [currentIndex]);
  
  // Mark as attempted when user starts working
  const markAttempted = useCallback(() => {
    if (!hasAttempted) {
      setAttemptedExercises(prev => new Set(prev).add(currentIndex));
    }
  }, [hasAttempted, currentIndex, setAttemptedExercises]);
  
  const revealNextHint = () => {
    const hints = currentExercise?.hints || [];
    if (hintsRevealed < hints.length) {
      setHintsRevealed(prev => prev + 1);
    }
  };
  
  if (!currentExercise) return null;

  const hints = currentExercise.hints || [];
  const hasHints = hints.length > 0;
  const hasWorkedExample = !!currentExercise.worked_example;
  const hasCommonMistakes = currentExercise.common_mistakes && currentExercise.common_mistakes.length > 0;

  return (
    <motion.div
      key={`exercise-${currentIndex}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Exercise Header */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Badge variant="outline">
            Exercise {currentIndex + 1} of {practicalExercises.length}
          </Badge>
          <Badge variant="secondary">
            {currentExercise.difficulty}
          </Badge>
          {currentExercise.estimated_time && (
            <Badge variant="outline" className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {currentExercise.estimated_time}
            </Badge>
          )}
        </div>
        <h2 className="text-2xl font-semibold mb-3">{currentExercise.title}</h2>
      </div>

      {/* Problem Prompt - Primary focus */}
      <Card className="border-2">
        <CardContent className="p-6">
          <div className="prose prose-stone dark:prose-invert max-w-none break-words overflow-hidden [&_.katex]:text-lg">
            <Markdown>{currentExercise.description}</Markdown>
          </div>
        </CardContent>
      </Card>

      {/* Completed Banner */}
      {isCompleted && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-4 rounded-lg bg-green-500/10 border border-green-500/20"
        >
          <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="font-semibold text-green-600 dark:text-green-400">Correct!</p>
            <p className="text-sm text-muted-foreground">Great work. You can move on to the next exercise.</p>
          </div>
        </motion.div>
      )}

      {/* Widget-based Answer Input - AI selects the widget type */}
      {widgetType === 'short_answer' && currentExercise.correct_answer ? (
        <ShortAnswerWidget
          correctAnswer={currentExercise.correct_answer}
          isCompleted={isCompleted}
          onComplete={() => setCompletedExercises(prev => new Set(prev).add(currentIndex))}
          onAttempt={markAttempted}
        />
      ) : widgetType === 'multiple_choice' && currentExercise.options && currentExercise.correct_answer ? (
        <MultipleChoiceWidget
          options={currentExercise.options}
          correctAnswer={currentExercise.correct_answer}
          isCompleted={isCompleted}
          onComplete={() => setCompletedExercises(prev => new Set(prev).add(currentIndex))}
          onAttempt={markAttempted}
        />
      ) : (
        <MultiStepWidget
          onAttempt={markAttempted}
          hasWorkedExample={hasWorkedExample}
          onShowWorkedExample={() => setShowWorkedExample(true)}
        />
      )}

      {/* Progressive Support Section - Secondary, collapsed by default */}
      {(hasHints || hasWorkedExample || hasCommonMistakes) && (
        <div className="space-y-3 pt-4 border-t">
          <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Support</p>
          
          {/* Hints - Progressive reveal */}
          {hasHints && (
            <div className="space-y-2">
              <button
                onClick={() => setShowHints(!showHints)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronDown className={cn("w-4 h-4 transition-transform", !showHints && "-rotate-90")} />
                <HelpCircle className="w-4 h-4" />
                <span>Hints ({hintsRevealed}/{hints.length} revealed)</span>
              </button>
              
              {showHints && (
                <div className="ml-6 space-y-2">
                  {hints.slice(0, hintsRevealed).map((hint, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="px-3 py-2 bg-muted/50 rounded-md text-sm"
                    >
                      <span className="font-medium text-muted-foreground mr-2">Hint {i + 1}:</span>
                      <Markdown className="inline prose prose-sm prose-stone dark:prose-invert [&>p]:inline">{hint}</Markdown>
                    </motion.div>
                  ))}
                  {hintsRevealed < hints.length && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={revealNextHint}
                      className="text-xs"
                    >
                      Reveal next hint
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
          
          {/* Common Mistakes - Collapsed */}
          {hasCommonMistakes && (
            <div className="space-y-2">
              <button
                onClick={() => {
                  markAttempted();
                  setShowCommonMistakes(!showCommonMistakes);
                }}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronDown className={cn("w-4 h-4 transition-transform", !showCommonMistakes && "-rotate-90")} />
                <XCircle className="w-4 h-4" />
                <span>Common Mistakes</span>
              </button>
              
              {showCommonMistakes && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="ml-6 space-y-2"
                >
                  {currentExercise.common_mistakes?.map((mistake, i) => (
                    <div key={i} className="px-3 py-2 bg-destructive/5 border border-destructive/10 rounded-md text-sm">
                      <Markdown className="prose prose-sm prose-stone dark:prose-invert max-w-none [&>p]:m-0">{mistake}</Markdown>
                    </div>
                  ))}
                </motion.div>
              )}
            </div>
          )}
          
          {/* Worked Example - Only after attempt */}
          {hasWorkedExample && (
            <div className="space-y-2">
              <button
                onClick={() => {
                  markAttempted();
                  setShowWorkedExample(!showWorkedExample);
                }}
                className={cn(
                  "flex items-center gap-2 text-sm transition-colors",
                  hasAttempted 
                    ? "text-muted-foreground hover:text-foreground" 
                    : "text-muted-foreground/50"
                )}
              >
                <ChevronDown className={cn("w-4 h-4 transition-transform", !showWorkedExample && "-rotate-90")} />
                <BookOpen className="w-4 h-4" />
                <span>Worked Example</span>
                {!hasAttempted && (
                  <span className="text-xs text-muted-foreground/50">(try first)</span>
                )}
              </button>
              
              {showWorkedExample && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="ml-6"
                >
                  <Card className="border shadow-none bg-muted/30">
                    <CardContent className="p-4">
                      <div className="prose prose-sm prose-stone dark:prose-invert max-w-none break-words overflow-hidden">
                        <Markdown>{currentExercise.worked_example}</Markdown>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Navigation buttons */}
      <div className="flex items-center justify-between pt-6">
        <Button
          variant="outline"
          onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
          disabled={currentIndex === 0}
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Previous
        </Button>
        <span className="text-sm text-muted-foreground">
          {currentIndex + 1} of {practicalExercises.length}
        </span>
        <Button
          variant="outline"
          onClick={() => setCurrentIndex(Math.min(practicalExercises.length - 1, currentIndex + 1))}
          disabled={currentIndex === practicalExercises.length - 1}
        >
          Next
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </motion.div>
  );
};

// --- Main Examples View (Parent Container) ---
const ExamplesView = ({ 
  keyConcepts, 
  practicalExercises,
  isExamplesComplete, 
  setIsExamplesComplete,
  viewedConcepts,
  setViewedConcepts,
  viewedExercises,
  setViewedExercises
}: { 
  keyConcepts: Array<{
    concept: string;
    explanation: string;
    examples?: string[];
    example_sections?: Array<{
      type: 'code' | 'conceptual' | 'pattern' | 'antipattern' | 'applied' | 'walkthrough';
      title: string;
      items: string[];
    }>;
  }>;
  practicalExercises: Array<{
    title: string;
    description: string;
    difficulty: string;
    estimated_time?: string;
    hints?: string[];
    worked_example?: string;
    common_mistakes?: string[];
  }>;
  isExamplesComplete: boolean; 
  setIsExamplesComplete: (v: boolean) => void;
  viewedConcepts: Set<number>;
  setViewedConcepts: React.Dispatch<React.SetStateAction<Set<number>>>;
  viewedExercises: Set<number>;
  setViewedExercises: React.Dispatch<React.SetStateAction<Set<number>>>;
}) => {
  const [conceptIndex, setConceptIndex] = useState(0);
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<'concepts' | 'exercises'>('concepts');
  const [attemptedExercises, setAttemptedExercises] = useState<Set<number>>(new Set());
  const [completedExercises, setCompletedExercises] = useState<Set<number>>(new Set());

  // Helper to strip markdown syntax for preview text
  const stripMarkdown = (text: string): string => {
    return text
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/`(.+?)`/g, '$1')
      .replace(/#{1,6}\s/g, '')
      .replace(/\[(.+?)\]\(.+?\)/g, '$1')
      .replace(/^>\s/gm, '')
      .replace(/^[-*+]\s/gm, '')
      .replace(/\n/g, ' ')
      .trim();
  };

  // Mark concept as viewed when user stays on it
  useEffect(() => {
    if (activeTab !== 'concepts') return;
    
    const timer = setTimeout(() => {
      if (!viewedConcepts.has(conceptIndex)) {
        setViewedConcepts(prev => {
          const newViewed = new Set(prev);
          newViewed.add(conceptIndex);
          return newViewed;
        });
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [conceptIndex, activeTab, viewedConcepts, setViewedConcepts]);

  // Mark exercise as viewed when user stays on it
  useEffect(() => {
    if (activeTab !== 'exercises') return;
    
    const timer = setTimeout(() => {
      if (!viewedExercises.has(exerciseIndex)) {
        setViewedExercises(prev => new Set(prev).add(exerciseIndex));
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [exerciseIndex, activeTab, viewedExercises, setViewedExercises]);

  // Mark examples complete when all concepts and exercises are viewed
  useEffect(() => {
    const conceptsComplete = viewedConcepts.size >= keyConcepts.length;
    const exercisesComplete = viewedExercises.size >= practicalExercises.length;
    
    if (conceptsComplete && exercisesComplete && !isExamplesComplete) {
      setIsExamplesComplete(true);
    }
  }, [viewedConcepts.size, keyConcepts.length, viewedExercises.size, practicalExercises.length, isExamplesComplete, setIsExamplesComplete]);

  // Empty state
  if ((!keyConcepts || keyConcepts.length === 0) && (!practicalExercises || practicalExercises.length === 0)) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <Card className="max-w-2xl border-2 border-dashed">
          <CardContent className="p-12 text-center space-y-4">
            <Lightbulb className="w-16 h-16 mx-auto text-muted-foreground opacity-20" />
            <h3 className="text-2xl font-display text-foreground">No Content Available</h3>
            <p className="text-muted-foreground leading-relaxed">
              Examples and exercises for this module haven't been generated yet.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const hasConcepts = keyConcepts && keyConcepts.length > 0;
  const hasExercises = practicalExercises && practicalExercises.length > 0;

  return (
    <div className="flex gap-6 h-full">
      {/* Left sidebar - Navigation */}
      <div className="w-80 flex-shrink-0 min-w-0">
        <div className="sticky top-[calc(var(--header-height)+6rem)]">
          <Card className="py-0">
            <CardContent className="p-2">
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'concepts' | 'exercises')}>
                <TabsList className="w-full grid grid-cols-2 mb-2">
                  <TabsTrigger value="concepts" className="text-xs" disabled={!hasConcepts}>
                    <Lightbulb className="w-3 h-3 mr-1" />
                    Concepts {hasConcepts && `(${keyConcepts.length})`}
                  </TabsTrigger>
                  <TabsTrigger value="exercises" className="text-xs" disabled={!hasExercises}>
                    <BookOpen className="w-3 h-3 mr-1" />
                    Exercises {hasExercises && `(${practicalExercises.length})`}
                  </TabsTrigger>
                </TabsList>

                {/* Concepts navigation list */}
                <TabsContent value="concepts" className="mt-0 space-y-0.5 max-h-[calc(100vh-20rem)] overflow-y-auto">
                  {keyConcepts.map((concept, i) => {
                    const isViewed = viewedConcepts.has(i);
                    const isActive = conceptIndex === i;

                    return (
                      <Button
                        key={i}
                        variant="ghost"
                        onClick={() => setConceptIndex(i)}
                        className={cn(
                          "w-full text-left px-3 py-2 h-auto flex-col items-start gap-1 overflow-hidden",
                          isActive && "bg-muted hover:bg-muted"
                        )}
                      >
                        <div className="flex items-center justify-between w-full mb-1 min-w-0">
                          <div className="font-medium text-sm truncate flex-1 min-w-0">{i + 1}. {concept.concept}</div>
                          {isViewed && (
                            <CheckCircle2 className="w-3 h-3 ml-2 text-green-600 dark:text-green-400 flex-shrink-0" />
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground line-clamp-2 w-full overflow-hidden">
                          {stripMarkdown(concept.explanation)}
                        </div>
                      </Button>
                    );
                  })}
                </TabsContent>

                {/* Exercises navigation list */}
                <TabsContent value="exercises" className="mt-0 space-y-0.5 max-h-[calc(100vh-20rem)] overflow-y-auto">
                  {practicalExercises.map((exercise, i) => {
                    const isViewed = viewedExercises.has(i);
                    const isAttempted = attemptedExercises.has(i);
                    const isCompleted = completedExercises.has(i);
                    const isActive = exerciseIndex === i;

                    return (
                      <Button
                        key={i}
                        variant="ghost"
                        onClick={() => setExerciseIndex(i)}
                        className={cn(
                          "w-full text-left px-3 py-2 h-auto flex-col items-start gap-1 overflow-hidden",
                          isActive && "bg-muted hover:bg-muted",
                          isCompleted && "bg-green-500/5"
                        )}
                      >
                        <div className="flex items-center justify-between w-full mb-1 min-w-0">
                          <div className="font-medium text-sm truncate flex-1 min-w-0">{exercise.title}</div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {isCompleted ? (
                              <Badge variant="outline" className="text-[10px] h-4 px-1 bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400">
                                <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" />
                                Correct
                              </Badge>
                            ) : isAttempted ? (
                              <Badge variant="outline" className="text-[10px] h-4 px-1 bg-primary/5 border-primary/20 text-primary">
                                Started
                              </Badge>
                            ) : null}
                            {isViewed && !isCompleted && (
                              <CheckCircle2 className="w-3 h-3 ml-1 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground w-full overflow-hidden">
                          <Badge variant="outline" className="text-xs h-4 px-1 flex-shrink-0">
                            {exercise.difficulty}
                          </Badge>
                          {exercise.estimated_time && (
                            <span className="truncate flex-1">{exercise.estimated_time}</span>
                          )}
                        </div>
                      </Button>
                    );
                  })}
                </TabsContent>
              </Tabs>

              {/* Progress indicator */}
              {isExamplesComplete && (
                <Card className="border shadow-none bg-green-500/5 border-green-500/20 mt-2">
                  <CardContent className="p-2">
                    <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                      <CheckCircle2 className="w-3 h-3" />
                      <span className="text-xs font-medium">All content reviewed!</span>
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 max-w-3xl">
        <AnimatePresence mode="wait">
          {activeTab === 'concepts' && hasConcepts && (
            <ConceptsSubView
              keyConcepts={keyConcepts}
              currentIndex={conceptIndex}
              setCurrentIndex={setConceptIndex}
              viewedConcepts={viewedConcepts}
            />
          )}

          {activeTab === 'exercises' && hasExercises && (
            <ExercisesSubView
              practicalExercises={practicalExercises}
              currentIndex={exerciseIndex}
              setCurrentIndex={setExerciseIndex}
              attemptedExercises={attemptedExercises}
              setAttemptedExercises={setAttemptedExercises}
              completedExercises={completedExercises}
              setCompletedExercises={setCompletedExercises}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

const ExamplesViewOld_Unused = ({ isExamplesComplete, setIsExamplesComplete }: { isExamplesComplete: boolean; setIsExamplesComplete: (v: boolean) => void }) => {
  const [currentExample, setCurrentExample] = useState(0);
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set([0]));
  const [viewedExamples, setViewedExamples] = useState<Set<number>>(new Set());

  // Check if current example is viewed (all steps expanded at least once)
  useEffect(() => {
    const example = examples[currentExample];
    const allStepsExpanded = example.steps.every((_, i) => expandedSteps.has(i));
    
    if (allStepsExpanded && !viewedExamples.has(currentExample)) {
      setViewedExamples(prev => {
        const newViewed = new Set(prev);
        newViewed.add(currentExample);
        
        // Mark examples complete when all are viewed
        if (newViewed.size === examples.length) {
          setIsExamplesComplete(true);
        }
        
        return newViewed;
      });
    }
  }, [expandedSteps, currentExample, setIsExamplesComplete]);

  const toggleStep = (index: number) => {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedSteps(newExpanded);
  };

  const examples = [
    {
      title: "Implementing a Stack with Abstraction",
      purpose: "Demonstrates how interface definitions separate behavior from implementation.",
      steps: [
        {
          type: "Problem Setup",
          title: "Define the abstract behavior",
          content: `We want a data structure that follows Last-In-First-Out (LIFO). Instead of jumping to implementation, we first define what operations it should support.`,
          code: `interface Stack<T> {
  push(item: T): void;
  pop(): T | undefined;
  peek(): T | undefined;
  isEmpty(): boolean;
  size(): number;
}`,
          insight: "This interface is a contract. Any implementation that provides these operations is a valid Stack, regardless of internal details."
        },
        {
          type: "Key Observation",
          title: "Multiple implementations are possible",
          content: `The same interface can be implemented using different data structures. The choice depends on performance needs, but users don't need to know which one we chose.`,
          code: `// Option 1: Array-based
class ArrayStack<T> implements Stack<T> {
  private items: T[] = [];
  
  push(item: T): void {
    this.items.push(item);
  }
  
  pop(): T | undefined {
    return this.items.pop();
  }
  
  // ... other methods
}`,
          insight: "The private keyword hides implementation details. Users can't access 'items' directly—they must use the defined interface."
        },
        {
          type: "Apply Concept",
          title: "Use the Stack without knowing internals",
          content: `When we use the Stack, we interact only with its public interface. The code below works identically whether ArrayStack or LinkedStack is used.`,
          code: `const stack = new ArrayStack<number>();

stack.push(10);
stack.push(20);
stack.push(30);

console.log(stack.peek());  // 30 (top element)
console.log(stack.pop());   // 30 (removes and returns)
console.log(stack.size());  // 2 (elements remaining)`,
          insight: "This is abstraction in action. We can swap implementations without changing any code that uses the Stack."
        },
        {
          type: "Why This Works",
          title: "Benefits of this approach",
          content: `By separating interface from implementation, we achieve modularity and flexibility. The implementation can be optimized or changed entirely without affecting code that depends on it.`,
          code: `// Later, we could swap to a linked list implementation
// const stack = new LinkedStack<number>();
// All the code above still works!

// We could even switch implementations at runtime:
function createStack<T>(useLinked: boolean): Stack<T> {
  return useLinked ? new LinkedStack<T>() : new ArrayStack<T>();
}`,
          insight: "This is where most mistakes occur: forgetting that abstractions protect against change. Good abstractions make systems resilient to future modifications."
        }
      ]
    },
    {
      title: "Queue Processing Model",
      purpose: "Shows how FIFO behavior models real-world task processing systems.",
      steps: [
        {
          type: "Problem Setup",
          title: "Model a print job queue",
          content: `A printer processes jobs in the order they arrive. The first document sent should be the first one printed. This is First-In-First-Out (FIFO) behavior.`,
          code: `// We need operations that maintain order
interface Queue<T> {
  enqueue(item: T): void;  // Add to back
  dequeue(): T | undefined; // Remove from front
  isEmpty(): boolean;
}`,
          insight: "Queue operations have asymmetric names (enqueue/dequeue) that reinforce the directional flow of data."
        },
        {
          type: "Key Observation",
          title: "Order is preserved internally",
          content: `Unlike a Stack where we access only the top, a Queue maintains insertion order and exposes both ends. Items leave in the same order they entered.`,
          code: `class PrintQueue {
  private jobs: string[] = [];
  
  addJob(document: string): void {
    this.jobs.push(document);
    console.log(\`Added: \${document}\`);
  }
  
  processNext(): string | undefined {
    const job = this.jobs.shift();
    if (job) console.log(\`Printing: \${job}\`);
    return job;
  }
}`,
          insight: "shift() removes from the front while push() adds to the back. This combination creates FIFO behavior."
        },
        {
          type: "Apply Concept",
          title: "Process jobs in order",
          content: `When we add three jobs and process them, they print in the exact order they were added. This mirrors how real print queues work.`,
          code: `const printer = new PrintQueue();

printer.addJob("Report.pdf");
printer.addJob("Photo.jpg");
printer.addJob("Memo.docx");

// Process all jobs
while (!printer.isEmpty()) {
  printer.processNext();
}

// Output:
// Printing: Report.pdf
// Printing: Photo.jpg
// Printing: Memo.docx`,
          insight: "This assumption allows us to apply the rule: any system that needs fair, ordered processing can use a Queue abstraction."
        },
        {
          type: "Why This Works",
          title: "Queues prevent starvation",
          content: `By guaranteeing FIFO order, Queues ensure that no job waits indefinitely. This fairness property makes them ideal for scheduling, task management, and resource allocation.`,
          code: `// Real-world applications:
// - CPU task scheduling
// - Network packet handling
// - Customer service systems
// - Event processing pipelines

// All rely on the fairness guarantee of FIFO`,
          insight: "This pattern appears everywhere in computing: whenever fairness and order matter, use a Queue."
        }
      ]
    },
    {
      title: "Type Abstraction in Programming",
      purpose: "Reveals how high-level types hide low-level binary representation.",
      steps: [
        {
          type: "Problem Setup",
          title: "What you write versus what the computer sees",
          content: `When you declare variables with types, you're working at a level of abstraction. The computer doesn't understand 'number' or 'string'—it only knows bits.`,
          code: `let age: number = 25;
let name: string = "Alice";
let isActive: boolean = true;`,
          insight: "These type annotations are for humans and compilers. At runtime, everything is just sequences of 0s and 1s in memory."
        },
        {
          type: "Key Observation",
          title: "Types map to binary representations",
          content: `Every high-level type has a corresponding binary encoding. The type system abstracts this away so you don't have to think about it.`,
          code: `// What you see:
let count = 25;

// What's actually stored in memory (32-bit integer):
// 00000000 00000000 00000000 00011001

// For a string like "Hi":
// 01001000 01101001  (ASCII encoding)

// For boolean true:
// 00000001 (or sometimes just a single bit)`,
          insight: "This step reduces the cognitive load of programming. Imagine manually manipulating bits for every value!"
        },
        {
          type: "Apply Concept",
          title: "Types catch errors at compile time",
          content: `The abstraction isn't just for convenience—it provides safety. Type systems prevent entire classes of bugs by enforcing constraints before code runs.`,
          code: `let age: number = 25;

// This is caught before the code runs:
age = "twenty-five";  
// Error: Type 'string' is not assignable to type 'number'

// Without types, this error would surface at runtime:
if (age > 18) {  // Would try to compare string to number
  console.log("Adult");
}`,
          insight: "Type abstraction prevents mixing incompatible representations. This is where most runtime errors come from in untyped languages."
        },
        {
          type: "Why This Works",
          title: "Abstraction enables reasoning",
          content: `By hiding binary details, types let you reason at a higher level. You think about 'numbers' and 'strings' rather than memory addresses and bit patterns.`,
          code: `// You can write expressive logic:
function greet(name: string, age: number): string {
  return \`Hello \${name}, you are \${age} years old.\`;
}

// Instead of this lower-level approach:
// - Allocate memory for strings
// - Copy byte sequences
// - Calculate pointer offsets
// - Free memory when done`,
          insight: "Every abstraction layer makes programming accessible to more people by hiding complexity that's irrelevant to the task at hand."
        }
      ]
    }
  ];

  const example = examples[currentExample];

  return (
    <div className="flex gap-6 h-full">
      {/* Left sidebar - Example index */}
      <div className="w-64 flex-shrink-0">
        <div className="sticky top-[calc(var(--header-height)+6rem)]">
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-3 mb-3">
              Examples
            </h3>
            <div className="space-y-1">
              {examples.map((ex, i) => {
                const isViewed = viewedExamples.has(i);
                return (
                  <button
                    key={i}
                    onClick={() => {
                      setCurrentExample(i);
                      setExpandedSteps(new Set([0]));
                    }}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors",
                      currentExample === i 
                        ? "bg-muted font-medium" 
                        : "hover:bg-muted/50 text-muted-foreground"
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-medium">Example {i + 1}</div>
                      {isViewed && (
                        <CheckCircle2 className="w-3 h-3 text-green-600 dark:text-green-400" />
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground line-clamp-2">
                      {ex.title}
                    </div>
                  </button>
                );
              })}
            </div>
            
            {/* Progress indicator */}
            {isExamplesComplete && (
              <Card className="border shadow-none bg-green-500/5 border-green-500/20 mt-4">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="text-xs font-medium">All examples viewed!</span>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {!isExamplesComplete && viewedExamples.size > 0 && (
              <Card className="border shadow-none bg-muted/30 mt-4">
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground">
                    {viewedExamples.size}/{examples.length} examples viewed
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Center - Example walkthrough */}
      <div className="flex-1 max-w-3xl space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-1">{example.title}</h2>
          <p className="text-sm text-muted-foreground">{example.purpose}</p>
        </div>

        <div className="space-y-3">
          {example.steps.map((step, i) => (
            <Card key={i} className="border shadow-none overflow-hidden">
              <button
                onClick={() => toggleStep(i)}
                className="w-full text-left"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={cn(
                        "w-6 h-6 rounded-md flex items-center justify-center text-xs font-semibold flex-shrink-0 mt-0.5",
                        expandedSteps.has(i) ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      )}>
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs font-normal">
                            {step.type}
                          </Badge>
                        </div>
                        <h4 className="font-semibold text-sm">{step.title}</h4>
                      </div>
                    </div>
                    <ChevronRight className={cn(
                      "w-4 h-4 text-muted-foreground transition-transform flex-shrink-0 mt-1",
                      expandedSteps.has(i) && "rotate-90"
                    )} />
                  </div>
                </CardHeader>
              </button>
              
              <AnimatePresence>
                {expandedSteps.has(i) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <CardContent className="pt-0 space-y-4">
                      <div className="text-sm leading-relaxed prose prose-sm prose-stone dark:prose-invert max-w-none">
                        <Markdown>{step.content}</Markdown>
                      </div>
                      
                      {step.code && (
                        <div className="prose prose-sm prose-stone dark:prose-invert max-w-none">
                          <Markdown>{'```typescript\n' + step.code + '\n```'}</Markdown>
                        </div>
                      )}
                      
                      <div className="flex items-start gap-2 p-3 bg-muted/30 border rounded-md">
                        <Lightbulb className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-medium mb-1">
                            Why this matters
                          </p>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {step.insight}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          ))}
        </div>

        {/* Example viewing status */}
        {viewedExamples.has(currentExample) && (
          <Card className="border shadow-none bg-green-500/5 border-green-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="text-sm font-medium">
                    {viewedExamples.size === examples.length
                      ? "All examples viewed!"
                      : "Example viewed"}
                  </span>
                </div>
                {currentExample < examples.length - 1 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCurrentExample(currentExample + 1);
                      setExpandedSteps(new Set([0]));
                    }}
                  >
                    Next Example
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}
        
        {!viewedExamples.has(currentExample) && (
          <Card className="border shadow-none bg-muted/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Eye className="w-4 h-4" />
                <p className="text-sm">
                  Expand all steps to mark this example as viewed
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

const VisualsView = ({ 
  visuals,
  isVisualsComplete, 
  setIsVisualsComplete,
  viewedVisuals,
  setViewedVisuals
}: { 
  visuals: Array<{
    title: string;
    description?: string;
    nodes: Array<{
      id: string;
      position: { x: number; y: number };
      data: { label: string };
      type?: 'default' | 'input' | 'output';
      style?: Record<string, unknown>;
    }>;
    edges: Array<{
      id: string;
      source: string;
      target: string;
      label?: string;
      type?: string;
      animated?: boolean;
      style?: Record<string, unknown>;
      labelStyle?: Record<string, unknown>;
      markerEnd?: {
        type: 'arrow' | 'arrowclosed';
        color?: string;
      };
    }>;
  }>;
  isVisualsComplete: boolean; 
  setIsVisualsComplete: (v: boolean) => void;
  viewedVisuals: Set<number>;
  setViewedVisuals: React.Dispatch<React.SetStateAction<Set<number>>>;
}) => {
  const { theme } = useTheme();
  const [currentVisualIndex, setCurrentVisualIndex] = useState(0);

  // Mark visual as viewed after a delay
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!viewedVisuals.has(currentVisualIndex)) {
        setViewedVisuals(prev => {
          const newViewed = new Set(prev);
          newViewed.add(currentVisualIndex);
          return newViewed;
        });
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [currentVisualIndex, viewedVisuals]);

  // Check if all visuals have been viewed
  useEffect(() => {
    if (viewedVisuals.size >= visuals.length && !isVisualsComplete) {
      setIsVisualsComplete(true);
    }
  }, [viewedVisuals.size, visuals.length, isVisualsComplete, setIsVisualsComplete]);

  if (!visuals || visuals.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <Card className="max-w-2xl border-2 border-dashed">
          <CardContent className="p-12 text-center space-y-4">
            <Eye className="w-16 h-16 mx-auto text-muted-foreground opacity-20" />
            <h3 className="text-2xl font-display text-foreground">No Visuals Available</h3>
            <p className="text-muted-foreground leading-relaxed">
              The AI hasn't generated visual diagrams for this module yet.
              <br />
              Visual diagrams help illustrate concepts like processes, hierarchies, and relationships.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentVisual = visuals[currentVisualIndex];
  
  // Convert AI-generated nodes to ReactFlow format with fallback positioning
  const nodes: Node[] = currentVisual.nodes.map((node, index) => ({
    id: node.id,
    type: node.type || 'default',
    position: node.position && typeof node.position.x === 'number' && typeof node.position.y === 'number'
      ? node.position
      : { x: 300, y: index * 120 }, // Fallback: vertical stack layout
    data: {
      label: (
        <Markdown 
          className="text-black dark:text-black prose-p:text-black dark:prose-p:text-black" 
          components={{ p: ({ children }) => <>{children}</> }}
        >
          {node.data?.label || node.id}
        </Markdown>
      )
    },
    style: {
      background: 'hsl(var(--primary) / 0.1)',
      border: '1px solid hsl(var(--primary) / 0.2)',
      borderRadius: '8px',
      padding: '12px 20px',
      fontSize: '14px',
      fontWeight: 500,
      color: '#000000', // Force pure black text for maximum contrast
      ...(node.style as React.CSSProperties),
    },
  }));

  // Convert AI-generated edges to ReactFlow format with proper markerEnd
  const edges: Edge[] = currentVisual.edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    label: edge.label,
    type: edge.type || 'smoothstep',
    animated: edge.animated || false,
    style: edge.style as React.CSSProperties || {
      stroke: 'hsl(var(--primary) / 0.3)',
      strokeWidth: 2,
    },
    labelStyle: edge.labelStyle as React.CSSProperties,
    markerEnd: edge.markerEnd ? {
      type: edge.markerEnd.type === 'arrowclosed' ? MarkerType.ArrowClosed : MarkerType.Arrow,
      color: edge.markerEnd.color || 'hsl(var(--primary) / 0.5)',
    } : {
      type: MarkerType.ArrowClosed,
      color: 'hsl(var(--primary) / 0.5)',
    },
  }));

  return (
    <div className="flex gap-6 h-full">
      {/* Left sidebar - Visual navigation */}
      <div className="w-80 flex-shrink-0 min-w-0">
        <div className="sticky top-[calc(var(--header-height)+6rem)]">
          <Card className="py-0">
            <CardContent className="p-2">
              <div className="flex items-center justify-between px-2 py-2 mb-1">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Diagrams</h3>
                <Badge variant="outline" className="text-xs h-5">
                  {visuals.length}
                </Badge>
              </div>
              <nav className="flex flex-col space-y-0.5">
                {visuals.map((visual, i) => {
                  const isViewed = viewedVisuals.has(i);
                  const isActive = currentVisualIndex === i;

                  return (
                    <Button
                      key={i}
                      variant="ghost"
                      onClick={() => setCurrentVisualIndex(i)}
                      className={cn(
                        "w-full text-left px-3 py-2 h-auto flex-col items-start gap-1 overflow-hidden",
                        isActive && "bg-muted hover:bg-muted"
                      )}
                    >
                      <div className="flex items-center justify-between w-full mb-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Network className="w-3 h-3" />
                          <span className="font-medium text-sm truncate">{visual.title}</span>
                        </div>
                        {isViewed && (
                          <CheckCircle2 className="w-3 h-3 ml-2 text-green-600 dark:text-green-400 flex-shrink-0" />
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground line-clamp-1 w-full overflow-hidden">
                        {visual.description || `${visual.nodes.length} nodes`}
                      </div>
                    </Button>
                  );
                })}
              </nav>

              {/* Progress indicator */}
              {isVisualsComplete && (
                <Card className="border shadow-none bg-green-500/5 border-green-500/20 mt-2">
                  <CardContent className="p-2">
                    <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                      <CheckCircle2 className="w-3 h-3" />
                      <span className="text-xs font-medium">All visuals viewed!</span>
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main content - ReactFlow diagram */}
      <div className="flex-1 space-y-6">
        <div>
          <Badge variant="outline" className="mb-3">
            Diagram
          </Badge>
          <h2 className="text-2xl font-semibold mb-2">{currentVisual.title}</h2>
          {currentVisual.description && (
            <p className="text-muted-foreground">{currentVisual.description}</p>
          )}
        </div>

        <div className="overflow-hidden rounded-xl">
          <div className="p-0">
            <div style={{ height: '500px', width: '100%' }}>
              <ReactFlow
                nodes={nodes}
                edges={edges}
                colorMode={theme === 'dark' ? 'dark' : 'light'}
                fitView
                fitViewOptions={{ padding: 0.3 }}
                nodesDraggable={true}
                nodesConnectable={false}
                elementsSelectable={true}
                zoomOnScroll={true}
                panOnScroll={true}
                proOptions={{ hideAttribution: true }}
              >
                <Background gap={16} size={1} color="hsl(var(--muted-foreground))" style={{ opacity: 0.2 }} />
                <Controls />
              </ReactFlow>
            </div>
          </div>
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentVisualIndex(Math.max(0, currentVisualIndex - 1))}
            disabled={currentVisualIndex === 0}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            {currentVisualIndex + 1} of {visuals.length}
          </span>
          <Button
            variant="outline"
            onClick={() => setCurrentVisualIndex(Math.min(visuals.length - 1, currentVisualIndex + 1))}
            disabled={currentVisualIndex === visuals.length - 1}
          >
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
};

const VisualsViewOld_Unused = ({ isVisualsComplete, setIsVisualsComplete }: { isVisualsComplete: boolean; setIsVisualsComplete: (v: boolean) => void }) => {
  const [activeVisual, setActiveVisual] = useState<"flow" | "relationship" | "states" | "structure">("flow");
  const [currentStep, setCurrentStep] = useState(0);
  const [highlightedNode, setHighlightedNode] = useState<string | null>(null);
  const [viewedVisuals, setViewedVisuals] = useState<Set<string>>(new Set());
  const [hasInteracted, setHasInteracted] = useState(false);
  
  // Track visual mode changes
  useEffect(() => {
    if (!viewedVisuals.has(activeVisual)) {
      setViewedVisuals(prev => {
        const newViewed = new Set(prev);
        newViewed.add(activeVisual);
        return newViewed;
      });
    }
  }, [activeVisual]);
  
  // Mark visuals complete when all 4 visual modes have been viewed
  useEffect(() => {
    if (viewedVisuals.size === 4 && !isVisualsComplete) {
      setIsVisualsComplete(true);
    }
  }, [viewedVisuals.size, isVisualsComplete, setIsVisualsComplete]);

  // Flow Diagram Component with ReactFlow
  const FlowDiagram = () => {
    const steps = [
      { id: '1', label: 'Start: Array [2, 7, 11, 15]', desc: 'We have an array and need to find two numbers that sum to a target.' },
      { id: '2', label: 'Initialize: seen = {}', desc: 'Create a hash map to store values we\'ve seen.' },
      { id: '3', label: 'For each number', desc: 'Iterate through the array one element at a time.' },
      { id: '4', label: 'Calculate complement', desc: 'For current number, find what we need: target - current.' },
      { id: '5', label: 'Is complement in seen?', desc: 'Check if we\'ve already seen the number we need.' },
      { id: '6', label: 'Return indices', desc: 'If found, return the pair of indices.' },
      { id: '7', label: 'Store current in seen', desc: 'If not found, remember this number for later.' },
      { id: '8', label: 'Continue or End', desc: 'Move to next number or finish if no pair found.' }
    ];

    const nodes: Node[] = steps.map((step, i) => {
      const isActive = i === currentStep;
      const isPast = i < currentStep;
      
      return {
        id: step.id,
        type: 'default',
        position: { x: 250, y: i * 120 },
        data: { label: step.label },
        style: {
          padding: '16px',
          borderRadius: '8px',
          border: isActive ? '2px solid hsl(var(--primary))' : '1px solid hsl(var(--border))',
          background: isActive ? 'hsl(var(--primary) / 0.05)' : 'hsl(var(--card))',
          opacity: isPast ? 0.4 : 1,
          fontSize: '14px',
          fontWeight: isActive ? 600 : 400,
          width: 300,
        },
      };
    });

    const edges: Edge[] = steps.slice(0, -1).map((step, i) => ({
      id: `e${step.id}-${steps[i + 1].id}`,
      source: step.id,
      target: steps[i + 1].id,
      type: 'smoothstep',
      animated: i === currentStep,
      style: {
        stroke: i <= currentStep ? '#2563eb' : '#94a3b8',
        strokeWidth: 2,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: i <= currentStep ? '#2563eb' : '#94a3b8',
      },
    }));

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Two Sum Algorithm Flow</h3>
            <p className="text-sm text-muted-foreground">Step through how the algorithm processes each element</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
              disabled={currentStep === 0}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="px-3 py-1 bg-muted rounded-md text-sm font-medium">
              Step {currentStep + 1} / {steps.length}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))}
              disabled={currentStep === steps.length - 1}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <Card className="border-2 overflow-hidden">
          <CardContent className="p-0">
            <div style={{ height: '600px', width: '100%' }}>
              <ReactFlow
                nodes={nodes}
                edges={edges}
                fitView
                fitViewOptions={{ padding: 0.2 }}
                nodesDraggable={false}
                nodesConnectable={false}
                elementsSelectable={false}
                zoomOnScroll={false}
                panOnScroll={false}
                panOnDrag={false}
                proOptions={{ hideAttribution: true }}
                defaultEdgeOptions={{
                  style: { strokeWidth: 2, stroke: 'hsl(var(--primary))' },
                  markerEnd: { type: MarkerType.ArrowClosed, color: 'hsl(var(--primary))' },
                }}
              >
                <Background gap={16} size={1} color="hsl(var(--muted-foreground))" style={{ opacity: 0.2 }} />
              </ReactFlow>
            </div>
          </CardContent>
        </Card>

        {currentStep < steps.length && (
          <Card className="border-2 bg-primary/5">
            <CardContent className="p-4">
              <p className="text-sm font-medium mb-1">Current Step:</p>
              <p className="text-sm text-muted-foreground">{steps[currentStep].desc}</p>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  // Relationship Diagram Component with ReactFlow
  const RelationshipDiagram = () => {
    const conceptNodes: Node[] = [
      { 
        id: 'adt', 
        type: 'default',
        position: { x: 400, y: 50 },
        data: { label: 'Abstract Data Type' },
        style: {
          padding: '16px 24px',
          borderRadius: '8px',
          border: highlightedNode === 'adt' ? '2px solid hsl(var(--primary))' : '1px solid hsl(var(--border))',
          background: highlightedNode === 'adt' ? 'hsl(var(--primary) / 0.1)' : 'hsl(var(--card))',
          fontWeight: 600,
        },
      },
      { 
        id: 'interface', 
        type: 'default',
        position: { x: 150, y: 200 },
        data: { label: 'Interface' },
        style: {
          padding: '16px 24px',
          borderRadius: '8px',
          border: highlightedNode === 'interface' ? '2px solid hsl(var(--primary))' : '1px solid hsl(var(--border))',
          background: highlightedNode === 'interface' ? 'hsl(var(--primary) / 0.1)' : 'hsl(var(--card))',
          fontWeight: 600,
        },
      },
      { 
        id: 'impl', 
        type: 'default',
        position: { x: 650, y: 200 },
        data: { label: 'Implementation' },
        style: {
          padding: '16px 24px',
          borderRadius: '8px',
          border: highlightedNode === 'impl' ? '2px solid hsl(var(--primary))' : '1px solid hsl(var(--border))',
          background: highlightedNode === 'impl' ? 'hsl(var(--primary) / 0.1)' : 'hsl(var(--card))',
          fontWeight: 600,
        },
      },
      { 
        id: 'stack', 
        type: 'default',
        position: { x: 50, y: 350 },
        data: { label: 'Stack (LIFO)' },
        style: {
          padding: '12px 20px',
          borderRadius: '8px',
          border: highlightedNode === 'stack' ? '2px solid hsl(var(--primary))' : '1px solid hsl(var(--border))',
          background: highlightedNode === 'stack' ? 'hsl(var(--primary) / 0.1)' : 'hsl(var(--card))',
          fontSize: '13px',
        },
      },
      { 
        id: 'queue', 
        type: 'default',
        position: { x: 250, y: 350 },
        data: { label: 'Queue (FIFO)' },
        style: {
          padding: '12px 20px',
          borderRadius: '8px',
          border: highlightedNode === 'queue' ? '2px solid hsl(var(--primary))' : '1px solid hsl(var(--border))',
          background: highlightedNode === 'queue' ? 'hsl(var(--primary) / 0.1)' : 'hsl(var(--card))',
          fontSize: '13px',
        },
      },
      { 
        id: 'array', 
        type: 'default',
        position: { x: 600, y: 350 },
        data: { label: 'Array-based' },
        style: {
          padding: '12px 20px',
          borderRadius: '8px',
          border: highlightedNode === 'array' ? '2px solid hsl(var(--primary))' : '1px solid hsl(var(--border))',
          background: highlightedNode === 'array' ? 'hsl(var(--primary) / 0.1)' : 'hsl(var(--card))',
          fontSize: '13px',
        },
      },
      { 
        id: 'linked', 
        type: 'default',
        position: { x: 750, y: 350 },
        data: { label: 'Linked-based' },
        style: {
          padding: '12px 20px',
          borderRadius: '8px',
          border: highlightedNode === 'linked' ? '2px solid hsl(var(--primary))' : '1px solid hsl(var(--border))',
          background: highlightedNode === 'linked' ? 'hsl(var(--primary) / 0.1)' : 'hsl(var(--card))',
          fontSize: '13px',
        },
      },
    ];

    const relationshipEdges: Edge[] = [
      {
        id: 'e-adt-interface',
        source: 'adt',
        target: 'interface',
        label: 'defines',
        type: 'smoothstep',
        animated: highlightedNode === 'adt' || highlightedNode === 'interface',
        style: {
          stroke: (highlightedNode === 'adt' || highlightedNode === 'interface') ? '#2563eb' : '#94a3b8',
          strokeWidth: (highlightedNode === 'adt' || highlightedNode === 'interface') ? 3 : 2,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: (highlightedNode === 'adt' || highlightedNode === 'interface') ? '#2563eb' : '#94a3b8',
        },
      },
      {
        id: 'e-adt-impl',
        source: 'adt',
        target: 'impl',
        label: 'realized by',
        type: 'smoothstep',
        animated: highlightedNode === 'adt' || highlightedNode === 'impl',
        style: {
          stroke: (highlightedNode === 'adt' || highlightedNode === 'impl') ? '#2563eb' : '#94a3b8',
          strokeWidth: (highlightedNode === 'adt' || highlightedNode === 'impl') ? 3 : 2,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: (highlightedNode === 'adt' || highlightedNode === 'impl') ? '#2563eb' : '#94a3b8',
        },
      },
      {
        id: 'e-interface-stack',
        source: 'interface',
        target: 'stack',
        label: 'specifies',
        type: 'smoothstep',
        animated: highlightedNode === 'interface' || highlightedNode === 'stack',
        style: {
          stroke: (highlightedNode === 'interface' || highlightedNode === 'stack') ? '#2563eb' : '#94a3b8',
          strokeWidth: (highlightedNode === 'interface' || highlightedNode === 'stack') ? 3 : 2,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: (highlightedNode === 'interface' || highlightedNode === 'stack') ? '#2563eb' : '#94a3b8',
        },
      },
      {
        id: 'e-interface-queue',
        source: 'interface',
        target: 'queue',
        label: 'specifies',
        type: 'smoothstep',
        animated: highlightedNode === 'interface' || highlightedNode === 'queue',
        style: {
          stroke: (highlightedNode === 'interface' || highlightedNode === 'queue') ? '#2563eb' : '#94a3b8',
          strokeWidth: (highlightedNode === 'interface' || highlightedNode === 'queue') ? 3 : 2,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: (highlightedNode === 'interface' || highlightedNode === 'queue') ? '#2563eb' : '#94a3b8',
        },
      },
      {
        id: 'e-impl-array',
        source: 'impl',
        target: 'array',
        label: 'can use',
        type: 'smoothstep',
        animated: highlightedNode === 'impl' || highlightedNode === 'array',
        style: {
          stroke: (highlightedNode === 'impl' || highlightedNode === 'array') ? '#2563eb' : '#94a3b8',
          strokeWidth: (highlightedNode === 'impl' || highlightedNode === 'array') ? 3 : 2,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: (highlightedNode === 'impl' || highlightedNode === 'array') ? '#2563eb' : '#94a3b8',
        },
      },
      {
        id: 'e-impl-linked',
        source: 'impl',
        target: 'linked',
        label: 'can use',
        type: 'smoothstep',
        animated: highlightedNode === 'impl' || highlightedNode === 'linked',
        style: {
          stroke: (highlightedNode === 'impl' || highlightedNode === 'linked') ? '#2563eb' : '#94a3b8',
          strokeWidth: (highlightedNode === 'impl' || highlightedNode === 'linked') ? 3 : 2,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: (highlightedNode === 'impl' || highlightedNode === 'linked') ? '#2563eb' : '#94a3b8',
        },
      },
    ];

    const onNodeMouseEnter = useCallback((_: React.MouseEvent, node: Node) => {
      setHighlightedNode(node.id);
    }, []);

    const onNodeMouseLeave = useCallback(() => {
      setHighlightedNode(null);
    }, []);

    return (
      <div className="space-y-6">
        <div>
          <h3 className="font-semibold">Data Structure Relationships</h3>
          <p className="text-sm text-muted-foreground">Hover over concepts to see how they connect</p>
        </div>

        <Card className="border-2 overflow-hidden">
          <CardContent className="p-0">
            <div style={{ height: '500px', width: '100%' }}>
              <ReactFlow
                nodes={conceptNodes}
                edges={relationshipEdges}
                fitView
                fitViewOptions={{ padding: 0.2 }}
                nodesDraggable={false}
                nodesConnectable={false}
                elementsSelectable={false}
                zoomOnScroll={true}
                panOnScroll={true}
                onNodeMouseEnter={onNodeMouseEnter}
                onNodeMouseLeave={onNodeMouseLeave}
                proOptions={{ hideAttribution: true }}
                defaultEdgeOptions={{
                  style: { strokeWidth: 2 },
                }}
              >
                <Background gap={16} size={1} color="hsl(var(--muted-foreground))" style={{ opacity: 0.2 }} />
                <Controls />
              </ReactFlow>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // State Diagram Component with ReactFlow
  const StateDiagram = () => {
    const stateNodes: Node[] = [
      {
        id: 'empty',
        type: 'default',
        position: { x: 100, y: 200 },
        data: { label: 'Empty\nsize = 0' },
        style: {
          padding: '24px',
          borderRadius: '50%',
          width: 150,
          height: 150,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          border: '3px solid hsl(142 76% 36%)',
          background: 'hsl(142 76% 36% / 0.1)',
          fontWeight: 600,
          fontSize: '14px',
        },
      },
      {
        id: 'normal',
        type: 'default',
        position: { x: 400, y: 200 },
        data: { label: 'Normal\n0 < size < capacity' },
        style: {
          padding: '24px',
          borderRadius: '50%',
          width: 150,
          height: 150,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          border: '3px solid hsl(var(--primary))',
          background: 'hsl(var(--primary) / 0.1)',
          fontWeight: 600,
          fontSize: '14px',
        },
      },
      {
        id: 'full',
        type: 'default',
        position: { x: 700, y: 200 },
        data: { label: 'Full\nsize = capacity' },
        style: {
          padding: '24px',
          borderRadius: '50%',
          width: 150,
          height: 150,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          border: '3px solid hsl(25 95% 53%)',
          background: 'hsl(25 95% 53% / 0.1)',
          fontWeight: 600,
          fontSize: '14px',
        },
      },
    ];

    const stateEdges: Edge[] = [
      {
        id: 'e-empty-normal',
        source: 'empty',
        target: 'normal',
        label: 'push(x)',
        type: 'smoothstep',
        animated: true,
        style: { stroke: '#2563eb', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#2563eb' },
      },
      {
        id: 'e-normal-empty',
        source: 'normal',
        target: 'empty',
        label: 'pop() [last]',
        type: 'smoothstep',
        sourceHandle: 'bottom',
        targetHandle: 'bottom',
        animated: true,
        style: { stroke: '#2563eb', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#2563eb' },
      },
      {
        id: 'e-normal-full',
        source: 'normal',
        target: 'full',
        label: 'push(x) [at capacity]',
        type: 'smoothstep',
        animated: true,
        style: { stroke: '#2563eb', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#2563eb' },
      },
      {
        id: 'e-full-normal',
        source: 'full',
        target: 'normal',
        label: 'pop()',
        type: 'smoothstep',
        sourceHandle: 'bottom',
        targetHandle: 'bottom',
        animated: true,
        style: { stroke: '#2563eb', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#2563eb' },
      },
    ];

    return (
      <div className="space-y-6">
        <div>
          <h3 className="font-semibold">Stack State Transitions</h3>
          <p className="text-sm text-muted-foreground">How operations move the stack between states</p>
        </div>

        <Card className="border-2 overflow-hidden">
          <CardContent className="p-0">
            <div style={{ height: '500px', width: '100%' }}>
              <ReactFlow
                nodes={stateNodes}
                edges={stateEdges}
                fitView
                fitViewOptions={{ padding: 0.2 }}
                nodesDraggable={false}
                nodesConnectable={false}
                elementsSelectable={false}
                zoomOnScroll={true}
                panOnScroll={true}
                proOptions={{ hideAttribution: true }}
                defaultEdgeOptions={{
                  style: { strokeWidth: 2, stroke: 'hsl(var(--primary))' },
                }}
              >
                <Background gap={16} size={1} color="hsl(var(--muted-foreground))" style={{ opacity: 0.2 }} />
                <Controls />
              </ReactFlow>
            </div>
          </CardContent>
        </Card>

        <Card className="border bg-muted/30">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">
              <strong>Key insight:</strong> The Stack can only transition between adjacent states. 
              You cannot go directly from Empty to Full, ensuring controlled growth.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Structure Decomposition Component with ReactFlow
  const StructureDecomposition = () => {
    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['root', 'behavior', 'implementation']));

    const toggleNode = useCallback((id: string) => {
      setExpandedNodes(prev => {
        const newExpanded = new Set(prev);
        if (newExpanded.has(id)) {
          newExpanded.delete(id);
        } else {
          newExpanded.add(id);
        }
        return newExpanded;
      });
    }, []);

    // Build nodes based on expanded state
    const structureNodes: Node[] = [
      {
        id: 'root',
        type: 'default',
        position: { x: 400, y: 50 },
        data: { label: 'Abstract Data Types' },
        style: {
          padding: '20px 32px',
          borderRadius: '8px',
          border: '2px solid hsl(var(--primary))',
          background: 'hsl(var(--primary))',
          color: 'hsl(var(--primary-foreground))',
          fontWeight: 700,
          fontSize: '16px',
        },
      },
    ];

    const structureEdges: Edge[] = [];

    if (expandedNodes.has('root')) {
      structureNodes.push(
        {
          id: 'behavior',
          type: 'default',
          position: { x: 200, y: 200 },
          data: { label: 'Behavior Definition' },
          style: {
            padding: '16px 24px',
            borderRadius: '8px',
            border: '2px solid hsl(var(--border))',
            background: 'hsl(var(--card))',
            fontWeight: 600,
            cursor: 'pointer',
          },
        },
        {
          id: 'implementation',
          type: 'default',
          position: { x: 600, y: 200 },
          data: { label: 'Implementation Choices' },
          style: {
            padding: '16px 24px',
            borderRadius: '8px',
            border: '2px solid hsl(var(--border))',
            background: 'hsl(var(--card))',
            fontWeight: 600,
            cursor: 'pointer',
          },
        }
      );

      structureEdges.push(
        {
          id: 'e-root-behavior',
          source: 'root',
          target: 'behavior',
          type: 'smoothstep',
          style: { stroke: '#2563eb', strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#2563eb' },
        },
        {
          id: 'e-root-implementation',
          source: 'root',
          target: 'implementation',
          type: 'smoothstep',
          style: { stroke: '#2563eb', strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#2563eb' },
        }
      );
    }

    if (expandedNodes.has('behavior')) {
      structureNodes.push(
        {
          id: 'stack-interface',
          type: 'default',
          position: { x: 100, y: 350 },
          data: { label: 'Stack Interface\npush(), pop(), peek()' },
          style: {
            padding: '12px 20px',
            borderRadius: '8px',
            border: '1px solid hsl(var(--border))',
            background: 'hsl(var(--card))',
            fontSize: '12px',
            textAlign: 'center',
            whiteSpace: 'pre-line',
          },
        },
        {
          id: 'queue-interface',
          type: 'default',
          position: { x: 300, y: 350 },
          data: { label: 'Queue Interface\nenqueue(), dequeue()' },
          style: {
            padding: '12px 20px',
            borderRadius: '8px',
            border: '1px solid hsl(var(--border))',
            background: 'hsl(var(--card))',
            fontSize: '12px',
            textAlign: 'center',
            whiteSpace: 'pre-line',
          },
        }
      );

      structureEdges.push(
        {
          id: 'e-behavior-stack',
          source: 'behavior',
          target: 'stack-interface',
          type: 'smoothstep',
          style: { stroke: '#64748b', strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#64748b' },
        },
        {
          id: 'e-behavior-queue',
          source: 'behavior',
          target: 'queue-interface',
          type: 'smoothstep',
          style: { stroke: '#64748b', strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#64748b' },
        }
      );
    }

    if (expandedNodes.has('implementation')) {
      structureNodes.push(
        {
          id: 'array-based',
          type: 'default',
          position: { x: 550, y: 350 },
          data: { label: 'Array-Based\nFast access, fixed capacity' },
          style: {
            padding: '12px 20px',
            borderRadius: '8px',
            border: '1px solid hsl(var(--border))',
            background: 'hsl(var(--muted) / 0.3)',
            fontSize: '12px',
            textAlign: 'center',
            whiteSpace: 'pre-line',
          },
        },
        {
          id: 'linked-based',
          type: 'default',
          position: { x: 750, y: 350 },
          data: { label: 'Linked Structure\nDynamic size, pointer overhead' },
          style: {
            padding: '12px 20px',
            borderRadius: '8px',
            border: '1px solid hsl(var(--border))',
            background: 'hsl(var(--muted) / 0.3)',
            fontSize: '12px',
            textAlign: 'center',
            whiteSpace: 'pre-line',
          },
        }
      );

      structureEdges.push(
        {
          id: 'e-impl-array',
          source: 'implementation',
          target: 'array-based',
          type: 'smoothstep',
          style: { stroke: '#64748b', strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#64748b' },
        },
        {
          id: 'e-impl-linked',
          source: 'implementation',
          target: 'linked-based',
          type: 'smoothstep',
          style: { stroke: '#64748b', strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#64748b' },
        }
      );
    }

    const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
      if (node.id === 'behavior' || node.id === 'implementation') {
        toggleNode(node.id);
      }
    }, [toggleNode]);

    return (
      <div className="space-y-6">
        <div>
          <h3 className="font-semibold">Abstraction Hierarchy</h3>
          <p className="text-sm text-muted-foreground">Click on Behavior or Implementation nodes to expand/collapse</p>
        </div>

        <Card className="border-2 overflow-hidden">
          <CardContent className="p-0">
            <div style={{ height: '500px', width: '100%' }}>
              <ReactFlow
                nodes={structureNodes}
                edges={structureEdges}
                fitView
                fitViewOptions={{ padding: 0.2 }}
                nodesDraggable={false}
                nodesConnectable={false}
                zoomOnScroll={true}
                panOnScroll={true}
                onNodeClick={onNodeClick}
                proOptions={{ hideAttribution: true }}
              >
                <Background gap={12} size={1} />
                <Controls />
              </ReactFlow>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="flex gap-6 h-full">
      {/* Left sidebar - Visual type selector */}
      <div className="w-48 flex-shrink-0">
        <div className="sticky top-[calc(var(--header-height)+6rem)]">
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-3 mb-3">
              Visual Type
            </h3>
            <div className="space-y-1">
              {[
                { key: 'flow' as const, label: 'Flow', icon: Workflow },
                { key: 'relationship' as const, label: 'Relationships', icon: GitBranch },
                { key: 'states' as const, label: 'States', icon: Network },
                { key: 'structure' as const, label: 'Structure', icon: BookOpen }
              ].map((visual) => {
                const isViewed = viewedVisuals.has(visual.key);
                return (
                  <button
                    key={visual.key}
                    onClick={() => setActiveVisual(visual.key)}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between gap-2",
                      activeVisual === visual.key
                        ? "bg-muted font-medium"
                        : "hover:bg-muted/50 text-muted-foreground"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <visual.icon className="w-4 h-4" />
                      {visual.label}
                    </div>
                    {isViewed && (
                      <CheckCircle2 className="w-3 h-3 text-green-600 dark:text-green-400" />
                    )}
                  </button>
                );
              })}
            </div>
            
            {/* Completion status */}
            {isVisualsComplete && (
              <Card className="border shadow-none bg-green-500/5 border-green-500/20 mt-4">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="text-xs font-medium">All visuals viewed!</span>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {!isVisualsComplete && viewedVisuals.size > 0 && (
              <Card className="border shadow-none bg-muted/30 mt-4">
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground">
                    {viewedVisuals.size}/4 visuals viewed
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Center - Visual canvas */}
      <div className="flex-1 max-w-5xl space-y-4">
        <AnimatePresence mode="wait">
          {activeVisual === 'flow' && (
            <motion.div
              key="flow"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <FlowDiagram />
            </motion.div>
          )}
          {activeVisual === 'relationship' && (
            <motion.div
              key="relationship"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <RelationshipDiagram />
            </motion.div>
          )}
          {activeVisual === 'states' && (
            <motion.div
              key="states"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <StateDiagram />
            </motion.div>
          )}
          {activeVisual === 'structure' && (
            <motion.div
              key="structure"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <StructureDecomposition />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// --- Main Page Component ---

export default function ModulePage() {
  const params = useParams();
  const router = useRouter();
  const pathId = params.id as string;
  const moduleId = params.moduleId as string;

  const [activeMode, setActiveMode] = useState<ViewMode>("immersive_text");
  const [module, setModule] = useState<ModuleData | null>(null);
  const [lab, setLab] = useState<Lab | null>(null);
  const [regeneratingLab, setRegeneratingLab] = useState(false);
  const [allModules, setAllModules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [renderingRegistryContent, setRenderingRegistryContent] = useState(false);
  const [registryRenderError, setRegistryRenderError] = useState<string | null>(null);

  const loadRegistryContent = useCallback(async (moduleMeta: ModuleData): Promise<ModuleData> => {
    setRenderingRegistryContent(true);
    setRegistryRenderError(null);

    try {
      const renderResult = await renderRegistryModule(pathId, moduleId);

      if (renderResult?.content_unavailable) {
        setRegistryRenderError(renderResult.unavailable_reason || 'Source content is unavailable for this module.');
        return { ...moduleMeta, content_unavailable: true };
      }

      if (renderResult?.content) {
        const normalized = normalizeRegistryContent(moduleMeta.title, renderResult.content);

        if (normalized) {
          return {
            ...moduleMeta,
            content_data: normalized,
            content_mode: 'registry_backed',
            citation_display: renderResult.citation_display,
            last_resolved_at: renderResult.rendered_at || moduleMeta.last_resolved_at,
          };
        }
      }

      setRegistryRenderError('No content returned from the source registry.');
      return moduleMeta;
    } catch (error: any) {
      console.error("Error rendering registry-backed module:", error);
      setRegistryRenderError(error?.message || 'Failed to render module content.');
      return moduleMeta;
    } finally {
      setRenderingRegistryContent(false);
    }
  }, [moduleId, pathId]);

  const handleRetryRender = useCallback(async () => {
    if (!module) return;
    const updated = await loadRegistryContent(module);
    setModule(updated);
  }, [module, loadRegistryContent]);
  
  // Reading tab state
  const [isQuizPassed, setIsQuizPassed] = useState(false);
  const [currentChapter, setCurrentChapter] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [completedChapters, setCompletedChapters] = useState<Set<number>>(new Set());
  const [completedQuestions, setCompletedQuestions] = useState<Set<number>>(new Set());
  
  // Examples tab state
  const [isExamplesComplete, setIsExamplesComplete] = useState(false);
  const [currentExample, setCurrentExample] = useState(0);
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set([0]));
  const [viewedExamples, setViewedExamples] = useState<Set<number>>(new Set());
  const [viewedConcepts, setViewedConcepts] = useState<Set<number>>(new Set());
  const [viewedExercises, setViewedExercises] = useState<Set<number>>(new Set());
  
  // Visuals tab state
  const [isVisualsComplete, setIsVisualsComplete] = useState(false);
  const [activeVisual, setActiveVisual] = useState<"flow" | "relationship" | "states" | "structure">("flow");
  const [viewedVisuals, setViewedVisuals] = useState<Set<number>>(new Set());
  
  // Reflection state
  const [showReflection, setShowReflection] = useState(false);
  const [hasShownReflection, setHasShownReflection] = useState(false);
  
  // Load module data and progress
  useEffect(() => {
    const loadModule = async () => {
      try {
        setLoading(true);
        setRegistryRenderError(null);

        const data = await fetchPathItem(pathId, moduleId);
        const isRegistryModule = data.item_type === 'module' && (
          data.content_mode === 'registry_backed' ||
          (!!data.source_asset_id && (data.source_node_ids?.length || 0) > 0)
        );

        let moduleData: ModuleData = data;

        const needsRegistryRender = isRegistryModule && (!moduleData.content_data || !moduleData.content_data.chapters?.length);

        if (needsRegistryRender) {
          moduleData = await loadRegistryContent(moduleData);
        }

        setModule(moduleData);
        
        // If this is a lab item, fetch or generate the lab data
        if (moduleData.item_type === 'lab') {
          console.log("Lab item detected. lab_id:", moduleData.lab_id);
          
          let needsRegeneration = false;
          let labData = null;
          
          // Try to fetch existing lab if lab_id exists
          if (moduleData.lab_id) {
            try {
              labData = await fetchLabById(moduleData.lab_id);
              console.log("Lab fetched:", labData);
              
              // Check if lab has content
              if (!labData || !labData.template_data || !labData.template_type) {
                console.log("Lab has no content");
                needsRegeneration = true;
              }
            } catch (labError: any) {
              console.error("Error loading lab:", labError);
              needsRegeneration = true;
            }
          } else {
            console.log("No lab_id, needs generation");
            needsRegeneration = true;
          }
          
          // Regenerate if needed
          if (needsRegeneration) {
            console.log("Starting lab regeneration...");
            setRegeneratingLab(true);
            toast.loading("Generating lab content...");
            
            try {
              const regeneratedLab = await generateLab({
                learningGoal: moduleData.title || "Learn the concepts",
                context: moduleData.description || "",
                path_id: pathId
              });
              
              console.log("Lab regenerated successfully:", regeneratedLab);
              setLab(regeneratedLab);
              setRegeneratingLab(false);
              toast.success("Lab generated successfully!");
            } catch (genError) {
              console.error("Error regenerating lab:", genError);
              setRegeneratingLab(false);
              toast.error("Failed to generate lab content");
            }
          } else if (labData) {
            console.log("Using existing lab data");
            setLab(labData);
          }
        }
        
        // Load progress from database
        const progress = moduleData.progress_data || {};
        
        // Load completion flags
        setIsQuizPassed(progress.reading_completed || false);
        setIsExamplesComplete(progress.examples_completed || false);
        setIsVisualsComplete(progress.visuals_completed || false);
        
        // Load reading progress
        if (progress.reading) {
          setCurrentChapter(progress.reading.current_chapter || 0);
          setCurrentQuestionIndex(progress.reading.current_question_index || 0);
          setSelectedOption(progress.reading.selected_option || null);
          setIsCorrect(progress.reading.is_correct || null);
          setCompletedChapters(new Set(progress.reading.completed_chapters || []));
          setCompletedQuestions(new Set(progress.reading.completed_questions || []));
        }
        
        // Load examples progress
        if (progress.examples) {
          setCurrentExample(progress.examples.current_example || 0);
          setExpandedSteps(new Set(progress.examples.expanded_steps || [0]));
          setViewedExamples(new Set(progress.examples.viewed_examples || []));
          setViewedConcepts(new Set(progress.examples.viewed_concepts || []));
          setViewedExercises(new Set(progress.examples.viewed_exercises || []));
        }
        
        // Load visuals progress
        if (progress.visuals) {
          setActiveVisual(progress.visuals.active_visual || "flow");
          setViewedVisuals(new Set(progress.visuals.viewed_visuals || []));
        }

        // Load all modules from the path to enable navigation
        const pathData = await fetchPathById(pathId);
        if (pathData.learning_path_items) {
          setAllModules(pathData.learning_path_items.sort((a: any, b: any) => a.order_index - b.order_index));
        }
      } catch (error) {
        console.error("Error loading module:", error);
        toast.error("Failed to load module content");
      } finally {
        setLoading(false);
      }
    };

    loadModule();
  }, [pathId, moduleId]);

  // Save progress whenever it changes
  useEffect(() => {
    if (!module || loading) return;

    const saveProgress = async () => {
      try {
        await updatePathItemProgress(pathId, moduleId, {
          reading_completed: isQuizPassed,
          examples_completed: isExamplesComplete,
          visuals_completed: isVisualsComplete,
          reading: {
            current_chapter: currentChapter,
            current_question_index: currentQuestionIndex,
            selected_option: selectedOption,
            is_correct: isCorrect,
            completed_chapters: Array.from(completedChapters),
            completed_questions: Array.from(completedQuestions),
          },
          examples: {
            current_example: currentExample,
            expanded_steps: Array.from(expandedSteps),
            viewed_examples: Array.from(viewedExamples),
            viewed_concepts: Array.from(viewedConcepts),
            viewed_exercises: Array.from(viewedExercises),
          },
          visuals: {
            active_visual: activeVisual,
            viewed_visuals: Array.from(viewedVisuals),
          },
        });
      } catch (error) {
        console.error("Error saving progress:", error);
        // Don't show toast error to avoid annoying the user
      }
    };

    // Debounce the save to avoid too many requests
    const timeoutId = setTimeout(saveProgress, 1000);
    return () => clearTimeout(timeoutId);
  }, [
    loading, module, pathId, moduleId,
    isQuizPassed, isExamplesComplete, isVisualsComplete,
    currentChapter, currentQuestionIndex, selectedOption, isCorrect,
    completedChapters, completedQuestions,
    currentExample, expandedSteps, viewedExamples, viewedConcepts, viewedExercises,
    activeVisual, viewedVisuals
  ]);

  // Handle navigation to next module
  const handleContinueToNext = () => {
    // Trigger reflection after module completion (primary reflection point)
    if (!hasShownReflection) {
      const shouldReflect = shouldTriggerReflection({
        event: 'module_completed',
      });

      if (shouldReflect) {
        setShowReflection(true);
        setHasShownReflection(true);
        return; // Don't navigate yet, wait for reflection
      }
    }

    // Navigate to next module
    navigateToNext();
  };

  const navigateToNext = () => {
    const currentIndex = allModules.findIndex((m: any) => m.id === moduleId);
    if (currentIndex !== -1 && currentIndex < allModules.length - 1) {
      const nextModule = allModules[currentIndex + 1];
      router.push(`/paths/${pathId}/modules/${nextModule.id}`);
    } else {
      // No next module, go back to path overview
      router.push(`/paths/${pathId}`);
      toast.success("Path completed! Great work!");
    }
  };

  const handleReflectionComplete = () => {
    // After reflection is saved or skipped, navigate to next module
    navigateToNext();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground">Loading module...</p>
        </div>
      </div>
    );
  }

  // If this is a lab item, render the lab viewer
  if (module?.item_type === 'lab') {
    if (regeneratingLab) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
            <p className="text-muted-foreground">Generating lab content...</p>
            <p className="text-sm text-muted-foreground">This may take a moment</p>
          </div>
        </div>
      );
    }

    if (!lab) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center space-y-4">
            <p className="text-muted-foreground">Lab content not available</p>
            <Link href={`/paths/${pathId}`}>
              <Button variant="outline">Back to Path</Button>
            </Link>
          </div>
        </div>
      );
    }

    return (
      <div className="h-[calc(100vh-var(--header-height))] flex flex-col">
        <div className="p-4 border-b flex items-center gap-4">
          <Link href={`/paths/${pathId}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
              Back to Path
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-semibold">{lab.title}</h1>
            {lab.description && (
              <p className="text-sm text-muted-foreground">{lab.description}</p>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          <LabViewer lab={lab} />
        </div>
      </div>
    );
  }

  // For regular modules, check if content_data exists
  if (!module || !module.content_data || !module.content_data.chapters) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <p className="text-muted-foreground">
            {module?.content_mode === 'registry_backed'
              ? renderingRegistryContent
                ? "Rendering content from the source registry..."
                : "Module content from the source registry is not available yet."
              : "Module content not available. The AI may still be generating the content."}
          </p>
          {registryRenderError && (
            <p className="text-sm text-red-500">{registryRenderError}</p>
          )}
          {module?.content_mode === 'registry_backed' && (
            <Button 
              variant="default" 
              disabled={renderingRegistryContent} 
              onClick={handleRetryRender}
            >
              {renderingRegistryContent ? "Rendering..." : "Retry rendering content"}
            </Button>
          )}
          <div className="pt-2">
            <Link href={`/paths/${pathId}`}>
              <Button variant="outline">Back to Path</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const chapters = module.content_data.chapters;
  
  // Module is complete when: Reading is done AND (Examples OR Visuals viewed)
  const isModuleComplete = isQuizPassed && (isExamplesComplete || isVisualsComplete);

  return (
    <div className="space-y-8">
      {/* Module Completion Banner */}
      {isModuleComplete && (
        <div className="fixed bottom-8 left-0 right-0 z-50 px-4 flex justify-center pointer-events-none">
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-green-500/20 bg-background/95 backdrop-blur-lg shadow-2xl p-4 max-w-2xl w-full pointer-events-auto"
          >
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex p-2 rounded-full bg-green-500/10">
                <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-green-700 dark:text-green-300">
                  Module Complete!
                </h3>
                <p className="text-xs text-muted-foreground line-clamp-1">
                  You've completed the reading and explored {isExamplesComplete && isVisualsComplete ? 'both examples and visuals' : isExamplesComplete ? 'the examples' : 'the visuals'}.
                </p>
              </div>
              <Button className="bg-green-600 hover:bg-green-700 text-white whitespace-nowrap" onClick={handleContinueToNext}>
                Continue <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        </div>
      )}
      
      {/* Header Section */}
      <div className="relative py-6">
        <div className="absolute left-0 top-7 z-10">
          <Link href={`/paths/${pathId}`}>
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground -ml-2">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Path
            </Button>
          </Link>
        </div>
        <div className="flex justify-center">
          <h1 className="text-3xl md:text-4xl font-display text-center leading-tight max-w-4xl px-32">
            {module.title}
          </h1>
        </div>
      </div>

      {/* View Mode Tabs */}
      <Tabs value={activeMode} onValueChange={(v) => setActiveMode(v as ViewMode)} className="w-full">
        <div className="sticky top-[var(--header-height)] z-40 backdrop-blur py-2 mb-6 border-b border-transparent transition-all">
          <div className="flex justify-center">
            <TabsList className="h-9 p-0.5 bg-muted/50 border shadow-sm">
              {TABS.map((tab) => {
                const isReadingCompleted = tab.key === "immersive_text" && isQuizPassed;
                const isExamplesViewed = tab.key === "examples" && isExamplesComplete;
                const isVisualsViewed = tab.key === "visuals" && isVisualsComplete;
                const isCompleted = isReadingCompleted || isExamplesViewed || isVisualsViewed;
                
                // Determine label suffix
                let statusLabel = "";
                if (isReadingCompleted) statusLabel = "Complete";
                else if (isExamplesViewed || isVisualsViewed) statusLabel = "Viewed";
                
                return (
                  <TabsTrigger 
                    key={tab.key} 
                    value={tab.key}
                    className={cn(
                      "px-4 py-1.5 text-sm rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm relative",
                      isCompleted && "!text-green-600 dark:!text-green-400"
                    )}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-green-600 dark:text-green-400" />
                    ) : (
                      <tab.icon className="w-3.5 h-3.5 mr-1.5" />
                    )}
                    <span className="flex items-center gap-1.5">
                      {tab.label}
                      {statusLabel && (
                        <Badge variant="secondary" className="text-[10px] h-4 px-1">
                          {statusLabel}
                        </Badge>
                      )}
                    </span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>
        </div>

        <div className="min-h-[600px]">
          <TabsContent value="immersive_text" className="mt-0 focus-visible:outline-none">
            <ImmersiveTextView 
              chapters={chapters} 
              isQuizPassed={isQuizPassed} 
              setIsQuizPassed={setIsQuizPassed}
              currentChapter={currentChapter}
              setCurrentChapter={setCurrentChapter}
              currentQuestionIndex={currentQuestionIndex}
              setCurrentQuestionIndex={setCurrentQuestionIndex}
              selectedOption={selectedOption}
              setSelectedOption={setSelectedOption}
              isCorrect={isCorrect}
              setIsCorrect={setIsCorrect}
              completedChapters={completedChapters}
              setCompletedChapters={setCompletedChapters}
              completedQuestions={completedQuestions}
              setCompletedQuestions={setCompletedQuestions}
            />
          </TabsContent>
          
          <TabsContent value="examples" className="mt-0 focus-visible:outline-none">
            <ExamplesView 
              keyConcepts={module.content_data.key_concepts || []}
              practicalExercises={module.content_data.practical_exercises || []}
              isExamplesComplete={isExamplesComplete} 
              setIsExamplesComplete={setIsExamplesComplete}
              viewedConcepts={viewedConcepts}
              setViewedConcepts={setViewedConcepts}
              viewedExercises={viewedExercises}
              setViewedExercises={setViewedExercises}
            />
          </TabsContent>
          
          <TabsContent value="visuals" className="mt-0 focus-visible:outline-none">
            <VisualsView 
              visuals={module.content_data.visuals || []} 
              isVisualsComplete={isVisualsComplete} 
              setIsVisualsComplete={setIsVisualsComplete}
              viewedVisuals={viewedVisuals}
              setViewedVisuals={setViewedVisuals} 
            />
          </TabsContent>

          <TabsContent value="source" className="mt-0 focus-visible:outline-none">
            <Card className="flex flex-col items-center justify-center h-[500px] text-muted-foreground border-2 border-dashed">
              <FileText className="w-12 h-12 mb-4 opacity-20" />
              <p className="text-xl font-display text-foreground">Source Material</p>
              <p className="text-sm mt-1">Original PDF source material will be rendered here.</p>
              <Button variant="outline" className="mt-6 rounded-full">Download PDF</Button>
            </Card>
          </TabsContent>
        </div>
      </Tabs>

      {/* Reflection Modal - Shown after module completion */}
      <ReflectionModal
        open={showReflection}
        onOpenChange={setShowReflection}
        contextType="module"
        contextId={moduleId}
        contextTitle={module.title}
        onComplete={handleReflectionComplete}
      />
    </div>
  );
}
