"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { updatePathItemProgress, fetchPathItem } from "@/lib/api/paths";
import { 
  MessageSquareText, 
  ChevronLeft, 
  ChevronRight, 
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
  X
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
// --- Types & Constants ---

type ViewMode = "immersive_text" | "examples" | "visuals";

const TABS: { key: ViewMode; label: string; icon: React.ElementType }[] = [
  { key: "immersive_text", label: "Reading", icon: MessageSquareText },
  { key: "examples", label: "Examples", icon: Lightbulb },
  { key: "visuals", label: "Visuals", icon: Eye },
];

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

// --- Components ---

const ImmersiveTextView = ({ 
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

  const chapters = [
    {
      id: 0,
      title: "Introduction to Abstraction",
      duration: "5 min",
      content: `
# Introduction to Abstraction

In computer science, **abstraction** is a technique for managing complexity of computer systems. It works by establishing a level of complexity on which a person interacts with the system, suppressing the more complex details below the current level.

### Why Abstraction Matters
Think of a car. You interact with the steering wheel and pedals (the abstraction), without needing to understand the internal combustion engine or the fuel injection system (the implementation). This separation of concerns allows users to focus on what the system does rather than how it does it.

### The Layers of Complexity
Abstraction is not a single step but a series of layers. In modern computing, we move from high-level programming languages down to assembly, then to machine code, and finally to the physical logic gates of the processor. Each layer provides a simplified interface to the one below it.

> "The art of abstraction is the art of finding the common thread in a sea of complexity."

By mastering abstraction, engineers can build systems that are far more complex than any single human could understand in full detail. It is the fundamental tool that makes modern software development possible.
      `,
      quizzes: [
        {
          question: "Which of the following best describes the primary goal of 'abstraction' in software engineering?",
          options: [
            { id: 'A', text: "To make the code run faster on modern hardware." },
            { id: 'B', text: "To hide complex implementation details and reduce cognitive load." },
            { id: 'C', text: "To ensure that all data is stored in a relational database." },
            { id: 'D', text: "To prevent other developers from seeing your source code." }
          ],
          correct: 'B'
        },
        {
          question: "In the car analogy, which part represents the 'abstraction'?",
          options: [
            { id: 'A', text: "The internal combustion engine." },
            { id: 'B', text: "The fuel injection system." },
            { id: 'C', text: "The steering wheel and pedals." },
            { id: 'D', text: "The spark plugs." }
          ],
          correct: 'C'
        }
      ]
    },
    {
      id: 1,
      title: "Data Types & Classifications",
      duration: "8 min",
      content: `
# Data Types & Classifications

Data types are a classification of data which tells the compiler or interpreter how the programmer intends to use the data. Most programming languages support basic data types of integer, real, character or boolean.

### Primitive vs Composite
* **Primitive**: The most basic data types available within a language. These are the building blocks of all other data types. Examples include \`int\`, \`float\`, \`char\`, and \`bool\`.
* **Composite**: Data types derived from more than one primitive type. These allow for more complex structures like \`arrays\`, \`structs\`, and \`classes\`.

### Static vs Dynamic Typing
Understanding how a language handles these types is crucial. Static typing (like in C++ or Java) requires types to be known at compile time, while dynamic typing (like in Python or JavaScript) allows types to be determined at runtime. This choice significantly impacts how abstraction is implemented in a given system.

Data types are the first level of abstraction we encounter in programming. They allow us to treat a sequence of bits as a meaningful concept, like a number or a letter.
      `,
      quizzes: [
        {
          question: "What is the main difference between primitive and composite data types?",
          options: [
            { id: 'A', text: "Primitive types are faster than composite types." },
            { id: 'B', text: "Composite types are built from multiple primitive types." },
            { id: 'C', text: "Primitive types can only store numbers." },
            { id: 'D', text: "There is no real difference between them." }
          ],
          correct: 'B'
        },
        {
          question: "Which of these is an example of a primitive data type?",
          options: [
            { id: 'A', text: "Array" },
            { id: 'B', text: "Class" },
            { id: 'C', text: "Boolean" },
            { id: 'D', text: "Struct" }
          ],
          correct: 'C'
        }
      ]
    },
    {
      id: 2,
      title: "Abstract Data Types (ADTs)",
      duration: "10 min",
      content: `
# Abstract Data Types (ADTs)

An Abstract Data Type (ADT) is a mathematical model for data types. An ADT is defined by its behavior (semantics) from the point of view of a user of the data, specifically in terms of possible values, possible operations on data of this type, and the behavior of these operations.

### Common ADTs and Their Uses
* **Stack**: A Last-In-First-Out (LIFO) structure. Think of a stack of plates; you can only add or remove from the top.
* **Queue**: A First-In-First-Out (FIFO) structure. Like a line at a grocery store; the first person in is the first person served.
* **List**: A sequence of elements that can be accessed by position.

### Implementation Independence
The key power of an ADT is that it is independent of its implementation. A Stack can be implemented using an array or a linked list, but the user of the Stack ADT doesn't need to know which one is being used. They only care about the \`push\` and \`pop\` operations.

This level of abstraction allows developers to swap out implementations for better performance without changing the code that uses the ADT.
      `,
      quizzes: [
        {
          question: "Which principle defines an Abstract Data Type (ADT)?",
          options: [
            { id: 'A', text: "The specific memory address where data is stored." },
            { id: 'B', text: "The behavior and operations from the user's perspective." },
            { id: 'C', text: "The programming language used to implement it." },
            { id: 'D', text: "The speed at which it processes data." }
          ],
          correct: 'B'
        },
        {
          question: "Which ADT follows the Last-In-First-Out (LIFO) principle?",
          options: [
            { id: 'A', text: "Queue" },
            { id: 'B', text: "List" },
            { id: 'C', text: "Stack" },
            { id: 'D', text: "Tree" }
          ],
          correct: 'C'
        }
      ]
    }
  ];

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
    }
  };

  return (
    <div className="flex h-full gap-12">
      {/* Left Chapter Outline Sidebar */}
      <div className="w-80 flex-shrink-0 hidden xl:block">
        <div className="sticky top-[calc(var(--header-height)+6rem)]">
          <Card className="py-0">
            <CardContent className="p-2">
              <div className="flex items-center justify-between px-2 py-2 mb-1">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Chapter Outline</h3>
                <Badge variant="outline" className="text-xs h-5">
                  {chapters.length}
                </Badge>
              </div>
              <nav className="flex flex-col space-y-0.5">
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
                        }
                      }}
                      disabled={isLocked}
                      className={cn(
                        "w-full justify-start h-auto py-3 px-3 flex-col items-start gap-1.5",
                        isActive && "bg-muted hover:bg-muted"
                      )}
                    >
                      <div className="flex items-center gap-2.5 w-full">
                        <div className={cn(
                          "w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-semibold transition-colors",
                          isDone 
                            ? "bg-primary text-primary-foreground" 
                            : "bg-muted text-muted-foreground"
                        )}>
                          {isDone ? (
                            <CheckCircle2 className="w-3 h-3" />
                          ) : (
                            <span>{i + 1}</span>
                          )}
                        </div>
                        <span className="text-sm font-semibold text-left flex-1 line-clamp-2 break-words">
                          {chapter.title}
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
            <h1 className="text-3xl font-bold tracking-tight">{chapters[currentChapter].title}</h1>
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

const ExamplesView = ({ 
  isExamplesComplete, 
  setIsExamplesComplete,
  currentExample,
  setCurrentExample,
  expandedSteps,
  setExpandedSteps,
  viewedExamples,
  setViewedExamples
}: { 
  isExamplesComplete: boolean; 
  setIsExamplesComplete: (v: boolean) => void;
  currentExample: number;
  setCurrentExample: (v: number) => void;
  expandedSteps: Set<number>;
  setExpandedSteps: React.Dispatch<React.SetStateAction<Set<number>>>;
  viewedExamples: Set<number>;
  setViewedExamples: React.Dispatch<React.SetStateAction<Set<number>>>;
}) => {
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

  // Check if current example is viewed (all steps expanded at least once)
  useEffect(() => {
    const current = examples[currentExample];
    const allStepsExpanded = current.steps.every((_, i) => expandedSteps.has(i));
    
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
  }, [expandedSteps, currentExample, viewedExamples, setViewedExamples, setIsExamplesComplete, examples]);

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
  isVisualsComplete, 
  setIsVisualsComplete,
  activeVisual,
  setActiveVisual,
  viewedVisuals,
  setViewedVisuals
}: { 
  isVisualsComplete: boolean; 
  setIsVisualsComplete: (v: boolean) => void;
  activeVisual: "flow" | "relationship" | "states" | "structure";
  setActiveVisual: (v: "flow" | "relationship" | "states" | "structure") => void;
  viewedVisuals: Set<string>;
  setViewedVisuals: React.Dispatch<React.SetStateAction<Set<string>>>;
}) => {
  const { theme } = useTheme();
  const [currentStep, setCurrentStep] = useState(0);
  const [highlightedNode, setHighlightedNode] = useState<string | null>(null);
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
        data: { 
          label: (
            <Markdown 
              className="text-black dark:text-black" 
              components={{ p: ({ children }) => <>{children}</> }}
            >
              {step.label}
            </Markdown>
          ) 
        },
        style: {
          padding: '16px',
          borderRadius: '8px',
          border: isActive ? '2px solid hsl(var(--primary))' : '1px solid #e2e8f0',
          background: isActive ? '#f0f9ff' : '#ffffff',
          opacity: isPast ? 0.4 : 1,
          fontSize: '14px',
          fontWeight: isActive ? 600 : 400,
          width: 300,
          color: '#000000',
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

        <div className="overflow-hidden rounded-xl">
          <div className="p-0">
            <div style={{ height: '600px', width: '100%' }}>
              <ReactFlow
                nodes={nodes}
                edges={edges}
                colorMode={theme === 'dark' ? 'dark' : 'light'}
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
          </div>
        </div>

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
        data: { 
          label: (
            <Markdown 
              className="text-black dark:text-black" 
              components={{ p: ({ children }) => <>{children}</> }}
            >
              Abstract Data Type
            </Markdown>
          ) 
        },
        style: {
          padding: '16px 24px',
          borderRadius: '8px',
          border: highlightedNode === 'adt' ? '2px solid hsl(var(--primary))' : '1px solid #e2e8f0',
          background: highlightedNode === 'adt' ? '#f0f9ff' : '#ffffff',
          fontWeight: 600,
          color: '#000000',
        },
      },
      { 
        id: 'interface', 
        type: 'default',
        position: { x: 150, y: 200 },
        data: { 
          label: (
            <Markdown 
              className="text-black dark:text-black" 
              components={{ p: ({ children }) => <>{children}</> }}
            >
              Interface
            </Markdown>
          ) 
        },
        style: {
          padding: '16px 24px',
          borderRadius: '8px',
          border: highlightedNode === 'interface' ? '2px solid hsl(var(--primary))' : '1px solid #e2e8f0',
          background: highlightedNode === 'interface' ? '#f0f9ff' : '#ffffff',
          fontWeight: 600,
          color: '#000000',
        },
      },
      { 
        id: 'impl', 
        type: 'default',
        position: { x: 650, y: 200 },
        data: { 
          label: (
            <Markdown 
              className="text-black dark:text-black" 
              components={{ p: ({ children }) => <>{children}</> }}
            >
              Implementation
            </Markdown>
          ) 
        },
        style: {
          padding: '16px 24px',
          borderRadius: '8px',
          border: highlightedNode === 'impl' ? '2px solid hsl(var(--primary))' : '1px solid #e2e8f0',
          background: highlightedNode === 'impl' ? '#f0f9ff' : '#ffffff',
          fontWeight: 600,
          color: '#000000',
        },
      },
      { 
        id: 'stack', 
        type: 'default',
        position: { x: 50, y: 350 },
        data: { 
          label: (
            <Markdown 
              className="text-black dark:text-black" 
              components={{ p: ({ children }) => <>{children}</> }}
            >
              Stack (LIFO)
            </Markdown>
          ) 
        },
        style: {
          padding: '12px 20px',
          borderRadius: '8px',
          border: highlightedNode === 'stack' ? '2px solid hsl(var(--primary))' : '1px solid #e2e8f0',
          background: highlightedNode === 'stack' ? '#f0f9ff' : '#ffffff',
          fontSize: '13px',
          color: '#000000',
        },
      },
      { 
        id: 'queue', 
        type: 'default',
        position: { x: 250, y: 350 },
        data: { 
          label: (
            <Markdown 
              className="text-black dark:text-black" 
              components={{ p: ({ children }) => <>{children}</> }}
            >
              Queue (FIFO)
            </Markdown>
          ) 
        },
        style: {
          padding: '12px 20px',
          borderRadius: '8px',
          border: highlightedNode === 'queue' ? '2px solid hsl(var(--primary))' : '1px solid #e2e8f0',
          background: highlightedNode === 'queue' ? '#f0f9ff' : '#ffffff',
          fontSize: '13px',
          color: '#000000',
        },
      },
      { 
        id: 'array', 
        type: 'default',
        position: { x: 600, y: 350 },
        data: { 
          label: (
            <Markdown 
              className="text-black dark:text-black" 
              components={{ p: ({ children }) => <>{children}</> }}
            >
              Array-based
            </Markdown>
          ) 
        },
        style: {
          padding: '12px 20px',
          borderRadius: '8px',
          border: highlightedNode === 'array' ? '2px solid hsl(var(--primary))' : '1px solid #e2e8f0',
          background: highlightedNode === 'array' ? '#f0f9ff' : '#ffffff',
          fontSize: '13px',
          color: '#000000',
        },
      },
      { 
        id: 'linked', 
        type: 'default',
        position: { x: 750, y: 350 },
        data: { 
          label: (
            <Markdown 
              className="text-black dark:text-black" 
              components={{ p: ({ children }) => <>{children}</> }}
            >
              Linked-based
            </Markdown>
          ) 
        },
        style: {
          padding: '12px 20px',
          borderRadius: '8px',
          border: highlightedNode === 'linked' ? '2px solid hsl(var(--primary))' : '1px solid #e2e8f0',
          background: highlightedNode === 'linked' ? '#f0f9ff' : '#ffffff',
          fontSize: '13px',
          color: '#000000',
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

        <div className="overflow-hidden rounded-xl">
          <div className="p-0">
            <div style={{ height: '500px', width: '100%' }}>
              <ReactFlow
                nodes={conceptNodes}
                edges={relationshipEdges}
                colorMode={theme === 'dark' ? 'dark' : 'light'}
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
          </div>
        </div>
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
        data: { 
          label: (
            <Markdown 
              className="text-black dark:text-black" 
              components={{ p: ({ children }) => <>{children}</> }}
            >
              {`Empty\nsize = 0`}
            </Markdown>
          ) 
        },
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
          background: '#f0fdf4',
          fontWeight: 600,
          fontSize: '14px',
          color: '#000000',
        },
      },
      {
        id: 'normal',
        type: 'default',
        position: { x: 400, y: 200 },
        data: { 
          label: (
            <Markdown 
              className="text-black dark:text-black" 
              components={{ p: ({ children }) => <>{children}</> }}
            >
              {`Normal\n0 < size < capacity`}
            </Markdown>
          ) 
        },
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
          background: '#f0f9ff',
          fontWeight: 600,
          fontSize: '14px',
          color: '#000000',
        },
      },
      {
        id: 'full',
        type: 'default',
        position: { x: 700, y: 200 },
        data: { 
          label: (
            <Markdown 
              className="text-black dark:text-black" 
              components={{ p: ({ children }) => <>{children}</> }}
            >
              {`Full\nsize = capacity`}
            </Markdown>
          ) 
        },
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
          background: '#fff7ed',
          fontWeight: 600,
          fontSize: '14px',
          color: '#000000',
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

        <div className="overflow-hidden rounded-xl">
          <div className="p-0">
            <div style={{ height: '500px', width: '100%' }}>
              <ReactFlow
                nodes={stateNodes}
                edges={stateEdges}
                colorMode={theme === 'dark' ? 'dark' : 'light'}
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
          </div>
        </div>

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
        data: { 
          label: (
            <Markdown components={{ p: ({ children }) => <>{children}</> }}>
              Abstract Data Types
            </Markdown>
          ) 
        },
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
          data: { 
            label: (
              <Markdown 
                className="text-black dark:text-black" 
                components={{ p: ({ children }) => <>{children}</> }}
              >
                Behavior Definition
              </Markdown>
            ) 
          },
          style: {
            padding: '16px 24px',
            borderRadius: '8px',
            border: '2px solid #e2e8f0',
            background: '#ffffff',
            fontWeight: 600,
            cursor: 'pointer',
            color: '#000000',
          },
        },
        {
          id: 'implementation',
          type: 'default',
          position: { x: 600, y: 200 },
          data: { 
            label: (
              <Markdown 
                className="text-black dark:text-black" 
                components={{ p: ({ children }) => <>{children}</> }}
              >
                Implementation Choices
              </Markdown>
            ) 
          },
          style: {
            padding: '16px 24px',
            borderRadius: '8px',
            border: '2px solid #e2e8f0',
            background: '#ffffff',
            fontWeight: 600,
            cursor: 'pointer',
            color: '#000000',
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
          data: { 
            label: (
              <Markdown 
                className="text-black dark:text-black" 
                components={{ p: ({ children }) => <>{children}</> }}
              >
                {`Stack Interface\npush(), pop(), peek()`}
              </Markdown>
            ) 
          },
          style: {
            padding: '12px 20px',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            background: '#ffffff',
            fontSize: '12px',
            textAlign: 'center',
            whiteSpace: 'pre-line',
            color: '#000000',
          },
        },
        {
          id: 'queue-interface',
          type: 'default',
          position: { x: 300, y: 350 },
          data: { 
            label: (
              <Markdown 
                className="text-black dark:text-black" 
                components={{ p: ({ children }) => <>{children}</> }}
              >
                {`Queue Interface\nenqueue(), dequeue()`}
              </Markdown>
            ) 
          },
          style: {
            padding: '12px 20px',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            background: '#ffffff',
            fontSize: '12px',
            textAlign: 'center',
            whiteSpace: 'pre-line',
            color: '#000000',
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
          data: { 
            label: (
              <Markdown 
                className="text-black dark:text-black" 
                components={{ p: ({ children }) => <>{children}</> }}
              >
                {`Array-Based\nFast access, fixed capacity`}
              </Markdown>
            ) 
          },
          style: {
            padding: '12px 20px',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            background: '#f8fafc',
            fontSize: '12px',
            textAlign: 'center',
            whiteSpace: 'pre-line',
            color: '#000000',
          },
        },
        {
          id: 'linked-based',
          type: 'default',
          position: { x: 750, y: 350 },
          data: { 
            label: (
              <Markdown 
                className="text-black dark:text-black" 
                components={{ p: ({ children }) => <>{children}</> }}
              >
                {`Linked Structure\nDynamic size, pointer overhead`}
              </Markdown>
            ) 
          },
          style: {
            padding: '12px 20px',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            background: '#f8fafc',
            fontSize: '12px',
            textAlign: 'center',
            whiteSpace: 'pre-line',
            color: '#000000',
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

        <div className="overflow-hidden rounded-xl">
          <div className="p-0">
            <div style={{ height: '500px', width: '100%' }}>
              <ReactFlow
                nodes={structureNodes}
                edges={structureEdges}
                colorMode={theme === 'dark' ? 'dark' : 'light'}
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
          </div>
        </div>
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

export default function DemoModulePage() {
  const searchParams = useSearchParams();
  const pathId = searchParams.get('pathId');
  const itemId = searchParams.get('itemId');
  
  const [activeMode, setActiveMode] = useState<ViewMode>("immersive_text");
  const [isLoading, setIsLoading] = useState(true);
  
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
  
  // Visuals tab state
  const [isVisualsComplete, setIsVisualsComplete] = useState(false);
  const [activeVisual, setActiveVisual] = useState<"flow" | "relationship" | "states" | "structure">("flow");
  const [viewedVisuals, setViewedVisuals] = useState<Set<string>>(new Set());
  
  // Module is complete when: Reading is done AND (Examples OR Visuals viewed)
  const isModuleComplete = isQuizPassed && (isExamplesComplete || isVisualsComplete);

  // Load initial progress from database
  useEffect(() => {
    const loadProgress = async () => {
      if (!pathId || !itemId) {
        console.log("No pathId/itemId provided - running in demo mode without persistence");
        setIsLoading(false);
        return;
      }

      try {
        const item = await fetchPathItem(pathId, itemId);
        const progress = item.progress_data;
        
        if (progress) {
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
          }
          
          // Load visuals progress
          if (progress.visuals) {
            setActiveVisual(progress.visuals.active_visual || "flow");
            setViewedVisuals(new Set(progress.visuals.viewed_visuals || []));
          }
        }
      } catch (error) {
        console.error("Error loading progress:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadProgress();
  }, [pathId, itemId]);

  // Save progress to database when state changes
  useEffect(() => {
    if (isLoading || !pathId || !itemId) return;

    const saveProgress = async () => {
      try {
        await updatePathItemProgress(pathId, itemId, {
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
          },
          visuals: {
            active_visual: activeVisual,
            viewed_visuals: Array.from(viewedVisuals),
          },
        });
      } catch (error) {
        console.error("Error saving progress:", error);
      }
    };

    // Debounce saves to avoid excessive API calls
    const timeoutId = setTimeout(saveProgress, 1000);
    return () => clearTimeout(timeoutId);
  }, [
    isLoading, pathId, itemId,
    isQuizPassed, isExamplesComplete, isVisualsComplete,
    currentChapter, currentQuestionIndex, selectedOption, isCorrect,
    completedChapters, completedQuestions,
    currentExample, expandedSteps, viewedExamples,
    activeVisual, viewedVisuals
  ]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading module...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Module Completion Banner */}
      {isModuleComplete && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border border-green-500/20 bg-green-500/5 p-4"
        >
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
            <div className="flex-1">
              <h3 className="font-semibold text-green-700 dark:text-green-300">
                Module Complete!
              </h3>
              <p className="text-sm text-green-600 dark:text-green-400">
                You&apos;ve completed the reading and explored {isExamplesComplete && isVisualsComplete ? 'both examples and visuals' : isExamplesComplete ? 'the examples' : 'the visuals'}. Ready to move forward?
              </p>
            </div>
            <Button className="bg-green-600 hover:bg-green-700">
              Continue to Next Module
            </Button>
          </div>
        </motion.div>
      )}
      
      {/* Header Section */}
      <div className="relative flex items-center justify-center min-h-[80px]">
        <div className="absolute left-0">
          <Link href="/paths">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Path
            </Button>
          </Link>
        </div>
        <h1 className="text-3xl font-display">Module 1: Foundations of Logic</h1>
      </div>

      {/* View Mode Tabs */}
      <Tabs value={activeMode} onValueChange={(v) => setActiveMode(v as ViewMode)} className="w-full">
        <div className="sticky top-[var(--header-height)] z-40 backdrop-blur py-4 mb-8 border-b border-transparent transition-all">
          <div className="flex justify-center">
            <TabsList className="h-12 p-1 bg-muted/50 border shadow-sm">
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
                      "px-6 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm relative",
                      isCompleted && "!text-green-600 dark:!text-green-400"
                    )}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-4 h-4 mr-2 text-green-600 dark:text-green-400" />
                    ) : (
                      <tab.icon className="w-4 h-4 mr-2" />
                    )}
                    <span className="flex items-center gap-2">
                      {tab.label}
                      {statusLabel && (
                        <Badge variant="secondary" className="text-xs h-5 px-1.5">
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
              isExamplesComplete={isExamplesComplete} 
              setIsExamplesComplete={setIsExamplesComplete}
              currentExample={currentExample}
              setCurrentExample={setCurrentExample}
              expandedSteps={expandedSteps}
              setExpandedSteps={setExpandedSteps}
              viewedExamples={viewedExamples}
              setViewedExamples={setViewedExamples}
            />
          </TabsContent>
          
          <TabsContent value="visuals" className="mt-0 focus-visible:outline-none">
            <VisualsView 
              isVisualsComplete={isVisualsComplete} 
              setIsVisualsComplete={setIsVisualsComplete}
              activeVisual={activeVisual}
              setActiveVisual={setActiveVisual}
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
    </div>
  );
}
