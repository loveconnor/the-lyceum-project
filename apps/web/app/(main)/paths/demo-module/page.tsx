"use client";

import React, { useState, useRef, useEffect } from "react";
import { 
  FileText, 
  MessageSquareText, 
  Play, 
  AudioWaveform, 
  Network, 
  ChevronLeft, 
  ChevronRight, 
  HelpCircle, 
  CheckCircle2, 
  ExternalLink, 
  Image as ImageIcon,
  PlayCircle,
  Pause,
  SkipBack,
  SkipForward,
  Plus,
  Minus,
  Move,
  ChevronRight as ChevronRightSmall,
  ArrowLeft,
  Maximize2,
  Volume2,
  Settings2,
  Share2,
  Bookmark,
  Clock,
  BookOpen,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Markdown } from "@/components/ui/custom/prompt/markdown";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";

// --- Types & Constants ---

type ViewMode = "immersive_text" | "slides_narration" | "audio_lesson" | "mindmap";

interface MindmapNode {
  id: string;
  label: string;
  parentId?: string;
  children?: string[];
  color?: string;
}

const TABS: { key: ViewMode; label: string; icon: React.ElementType }[] = [
  { key: "immersive_text", label: "Reading", icon: MessageSquareText },
  { key: "slides_narration", label: "Slides", icon: Play },
  { key: "audio_lesson", label: "Audio", icon: AudioWaveform },
  { key: "mindmap", label: "Mindmap", icon: Network },
];

// --- Components ---

const ImmersiveTextView = ({ isQuizPassed, setIsQuizPassed }: { isQuizPassed: boolean; setIsQuizPassed: (v: boolean) => void }) => {
  const [currentChapter, setCurrentChapter] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [completedChapters, setCompletedChapters] = useState<Set<number>>(new Set());
  const [completedQuestions, setCompletedQuestions] = useState<Set<number>>(new Set());
  const [showQuiz, setShowQuiz] = useState(false);

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
      {/* Left Outline Sidebar */}
      <div className="w-80 flex-shrink-0 hidden xl:block">
        <div className="space-y-8 sticky top-[calc(var(--header-height)+6rem)]">
          <div>
            <div className="flex items-center justify-between px-2 mb-6">
              <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Module Outline</h3>
              <Badge variant="outline" className="text-[10px] font-bold px-2 py-0 h-5 border-primary/20 text-primary">
                {chapters.length} SECTIONS
              </Badge>
            </div>
            <div className="space-y-2">
              {chapters.map((chapter, i) => {
                const isLocked = i > 0 && !completedChapters.has(i - 1);
                const isActive = currentChapter === i;
                const isDone = completedChapters.has(i);

                return (
                  <div 
                    key={chapter.id}
                    onClick={() => {
                      if (!isLocked) {
                        setCurrentChapter(i);
                        setCurrentQuestionIndex(0);
                        setCompletedQuestions(new Set());
                        setSelectedOption(null);
                        setIsCorrect(null);
                      }
                    }}
                    className={cn(
                      "group relative flex flex-col gap-1 p-4 rounded-[20px] transition-all cursor-pointer border-2",
                      isActive 
                        ? "bg-card border-primary/20 shadow-sm" 
                        : "border-transparent hover:bg-muted/50",
                      isLocked && "opacity-40 cursor-not-allowed"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all",
                        isDone 
                          ? "bg-primary border-primary shadow-[0_0_10px_rgba(var(--primary),0.3)]" 
                          : isActive 
                            ? "border-primary" 
                            : "border-muted group-hover:border-muted-foreground"
                      )}>
                        {isDone ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-primary-foreground" />
                        ) : (
                          <span className={cn(
                            "text-[10px] font-bold",
                            isActive ? "text-primary" : "text-muted-foreground"
                          )}>{i + 1}</span>
                        )}
                      </div>
                      <span className={cn(
                        "text-sm font-bold transition-colors flex-1",
                        isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                      )}>
                        {chapter.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 ml-9">
                      <div className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground/60">
                        <Clock className="w-3 h-3" />
                        {chapter.duration}
                      </div>
                      <div className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground/60">
                        <HelpCircle className="w-3 h-3" />
                        {chapter.quizzes.length} questions
                      </div>
                    </div>
                    {isActive && (
                      <motion.div 
                        layoutId="active-indicator"
                        className="absolute -left-1 top-4 bottom-4 w-1 bg-primary rounded-full"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
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

          <div className="prose prose-stone dark:prose-invert max-w-none mb-16">
            <Markdown>{chapters[currentChapter].content}</Markdown>
          </div>

          <Separator className="my-12" />

          {/* Quiz Section */}
          <div className="space-y-6">
            <div className="flex items-end justify-between">
              <div className="space-y-1">
                <h2 className="text-2xl font-display">Check your understanding</h2>
                <p className="text-sm text-muted-foreground">Complete these questions to proceed to the next section.</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Question</p>
                <p className="text-xl font-display text-primary">
                  {currentQuestionIndex + 1}<span className="text-muted-foreground/30 mx-1">/</span>{chapters[currentChapter].quizzes.length}
                </p>
              </div>
            </div>

            <Card className="border-2 border-border rounded-[32px] overflow-hidden shadow-sm bg-card">
              <CardContent className="p-8 space-y-8">
                <div className="space-y-4">
                  <div className="flex gap-2">
                    {chapters[currentChapter].quizzes.map((_, i) => (
                      <div 
                        key={i}
                        className={cn(
                          "h-1.5 flex-1 rounded-full transition-all duration-500",
                          i < currentQuestionIndex ? "bg-primary" : 
                          i === currentQuestionIndex ? "bg-primary/30" : "bg-muted"
                        )}
                      />
                    ))}
                  </div>
                  <p className="text-xl font-medium leading-tight text-foreground">
                    {currentQuiz.question}
                  </p>
                </div>
                
                <div className="grid gap-3">
                  {currentQuiz.options.map((option) => (
                    <button 
                      key={option.id} 
                      onClick={() => handleOptionSelect(option.id)}
                      disabled={isCorrect === true}
                      className={cn(
                        "w-full text-left p-4 rounded-2xl border-2 transition-all flex items-center gap-4 group relative overflow-hidden",
                        selectedOption === option.id 
                          ? (isCorrect ? "border-green-500 bg-green-500/5" : "border-destructive bg-destructive/5")
                          : "border-border hover:border-primary/50 hover:bg-accent/50",
                        isCorrect === true && selectedOption !== option.id && "opacity-50"
                      )}
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center font-bold text-base transition-all",
                        selectedOption === option.id
                          ? (isCorrect ? "bg-green-500 text-white" : "bg-destructive text-white")
                          : "bg-muted text-muted-foreground group-hover:bg-accent group-hover:text-primary"
                      )}>
                        {option.id}
                      </div>
                      <span className="text-base font-medium text-foreground/80 group-hover:text-foreground flex-1">{option.text}</span>
                      
                      {selectedOption === option.id && isCorrect && (
                        <motion.div 
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute right-4"
                        >
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                        </motion.div>
                      )}
                    </button>
                  ))}
                </div>

                <AnimatePresence mode="wait">
                  {isCorrect === true && (
                    <motion.div 
                      key="correct-feedback"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-6"
                    >
                      <div className="p-6 bg-green-500/5 border border-green-500/20 rounded-[24px] flex items-center gap-5">
                        <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-green-500/20">
                          <CheckCircle2 className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <p className="text-lg font-bold text-green-600 dark:text-green-400">Excellent work!</p>
                          <p className="text-sm text-green-600/70 dark:text-green-500/70">That's the correct answer. You're making great progress.</p>
                        </div>
                      </div>

                      <Button 
                        onClick={nextQuestion}
                        className="w-full py-7 rounded-2xl text-lg font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xl shadow-primary/20 transition-all group"
                      >
                        {currentQuestionIndex < chapters[currentChapter].quizzes.length - 1 
                          ? "Next Question" 
                          : currentChapter < chapters.length - 1 
                            ? "Next Chapter" 
                            : "Complete Module"}
                        <ChevronRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </motion.div>
                  )}

                  {isCorrect === false && (
                    <motion.div 
                      key="incorrect-feedback"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="p-6 bg-destructive/5 border border-destructive/20 rounded-[24px] flex items-center gap-5"
                    >
                      <div className="w-12 h-12 rounded-full bg-destructive flex items-center justify-center flex-shrink-0 shadow-lg shadow-destructive/20">
                        <HelpCircle className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="text-lg font-bold text-destructive">Not quite right</p>
                        <p className="text-sm text-destructive/70">Review the section above and try another option.</p>
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

const SlidesNarrationView = () => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState("1");
  const [autoPlay, setAutoPlay] = useState(true);
  const [showCaptions, setShowCaptions] = useState(true);
  const totalSlides = 12;

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsFullscreen(false);
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  const nextSlide = () => setCurrentSlide(prev => Math.min(prev + 1, totalSlides - 1));
  const prevSlide = () => setCurrentSlide(prev => Math.max(prev - 1, 0));

  const SlideContent = ({ isFull = false }: { isFull?: boolean }) => (
    <div className={cn(
      "relative group flex items-center justify-center overflow-hidden",
      isFull ? "h-full w-full" : "aspect-[16/9]"
    )}>
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1635070041078-e363dbe005cb?q=80&w=2000')] bg-cover bg-center opacity-10 grayscale" />
      
      <div className="relative z-10 text-center p-12">
        <motion.div 
          key={currentSlide}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="mb-6 inline-block p-4 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10">
            <Network className="w-12 h-12 text-white" />
          </div>
          <h3 className="text-3xl md:text-5xl text-white font-display mb-2">
            {currentSlide === 0 ? "The Layers of Abstraction" : `Slide ${currentSlide + 1}: Deep Dive`}
          </h3>
          <p className="text-white/60 text-lg max-w-2xl mx-auto">
            {currentSlide === 0 
              ? "How complex systems are built on simple foundations." 
              : "Exploring the intricate relationships between system components and their underlying logic."}
          </p>
        </motion.div>
      </div>

      <div className="absolute inset-y-0 left-4 flex items-center">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={prevSlide}
          disabled={currentSlide === 0}
          className="rounded-full text-white/30 hover:text-white hover:bg-white/10 disabled:opacity-0"
        >
          <ChevronLeft className="w-8 h-8" />
        </Button>
      </div>
      <div className="absolute inset-y-0 right-4 flex items-center">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={nextSlide}
          disabled={currentSlide === totalSlides - 1}
          className="rounded-full text-white/30 hover:text-white hover:bg-white/10 disabled:opacity-0"
        >
          <ChevronRight className="w-8 h-8" />
        </Button>
      </div>

      {isFull && (
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setIsFullscreen(false)}
          className="absolute top-6 right-6 rounded-full text-white/30 hover:text-white hover:bg-white/10"
        >
          <X className="w-6 h-6" />
        </Button>
      )}
    </div>
  );

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="flex justify-between items-end">
        <div className="space-y-1">
          <h2 className="text-3xl font-display">Visualizing Abstraction</h2>
          <p className="text-muted-foreground">A visual walkthrough of complex system layers.</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="icon-sm"
            onClick={() => setIsFullscreen(true)}
          >
            <Maximize2 className="w-4 h-4" />
          </Button>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon-sm">
                <Settings2 className="w-4 h-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium leading-none">Playback Settings</h4>
                  <p className="text-sm text-muted-foreground">
                    Customize your learning experience.
                  </p>
                </div>
                <div className="grid gap-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="speed">Playback Speed</Label>
                    <Select value={playbackSpeed} onValueChange={setPlaybackSpeed}>
                      <SelectTrigger id="speed" className="w-24 h-8">
                        <SelectValue placeholder="1x" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0.5">0.5x</SelectItem>
                        <SelectItem value="0.75">0.75x</SelectItem>
                        <SelectItem value="1">1x</SelectItem>
                        <SelectItem value="1.25">1.25x</SelectItem>
                        <SelectItem value="1.5">1.5x</SelectItem>
                        <SelectItem value="2">2x</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="autoplay">Auto-play Next Slide</Label>
                    <Switch 
                      id="autoplay" 
                      checked={autoPlay} 
                      onCheckedChange={setAutoPlay} 
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="captions">Show Captions</Label>
                    <Switch 
                      id="captions" 
                      checked={showCaptions} 
                      onCheckedChange={setShowCaptions} 
                    />
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
      
      <Card className="overflow-hidden border-2 bg-neutral-950">
        <SlideContent />
      </Card>

      <Card>
        <CardContent className="pt-6 space-y-6">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon-sm"><SkipBack className="w-5 h-5" /></Button>
              <Button size="icon" className="size-12 rounded-full">
                <Play className="w-6 h-6 fill-current ml-1" />
              </Button>
              <Button variant="ghost" size="icon-sm" onClick={nextSlide}><SkipForward className="w-5 h-5" /></Button>
            </div>
            
            <div className="flex-1 space-y-1.5">
              <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                <span>Narration</span>
                <span>0:42 / 2:15</span>
              </div>
              <Slider defaultValue={[33]} max={100} step={1} />
            </div>

            <div className="flex items-center gap-2 pl-4 border-l">
              <Volume2 className="w-4 h-4 text-muted-foreground" />
              <div className="w-20">
                <Slider defaultValue={[80]} max={100} step={1} />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
             <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Slides</span>
             <div className="flex-1 flex gap-1 h-1.5">
               {[...Array(totalSlides)].map((_, i) => (
                 <div key={i} className={cn(
                   "flex-1 rounded-full transition-all",
                   i === currentSlide ? "bg-primary" : i < currentSlide ? "bg-primary/20" : "bg-muted"
                 )} />
               ))}
             </div>
             <span className="text-xs font-medium">{currentSlide + 1} / {totalSlides}</span>
          </div>
        </CardContent>
      </Card>

      <AnimatePresence>
        {isFullscreen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-neutral-950 flex flex-col"
          >
            <div className="flex-1">
              <SlideContent isFull />
            </div>
            <div className="p-6 bg-neutral-900/50 backdrop-blur-xl border-t border-white/10">
              <div className="max-w-5xl mx-auto flex items-center gap-8">
                <div className="flex items-center gap-4">
                  <Button variant="ghost" size="icon" className="text-white/70 hover:text-white hover:bg-white/10"><SkipBack className="w-6 h-6" /></Button>
                  <Button size="icon" className="size-14 rounded-full bg-white text-black hover:bg-white/90">
                    <Play className="w-7 h-7 fill-current ml-1" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-white/70 hover:text-white hover:bg-white/10" onClick={nextSlide}><SkipForward className="w-6 h-6" /></Button>
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex justify-between text-xs font-bold text-white/50 uppercase tracking-wider">
                    <span>Narration</span>
                    <span>0:42 / 2:15</span>
                  </div>
                  <Slider defaultValue={[33]} max={100} step={1} className="[&_[role=slider]]:bg-white" />
                  
                  <div className="flex gap-1 h-1 mt-4">
                    {[...Array(totalSlides)].map((_, i) => (
                      <div key={i} className={cn(
                        "flex-1 rounded-full transition-all",
                        i === currentSlide ? "bg-white" : i < currentSlide ? "bg-white/40" : "bg-white/10"
                      )} />
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-white font-medium">{currentSlide + 1} / {totalSlides}</span>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={() => setIsFullscreen(false)}
                    className="border-white/20 text-white hover:bg-white/10"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const AudioLessonView = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [progress, setProgress] = useState(45);

  const transcript = [
    { time: "0:00", text: "Welcome to this lesson on the Philosophy of Abstraction. Today we'll explore how the human mind simplifies complex systems." },
    { time: "0:45", text: "The Greek roots of abstraction come from 'abstrahere', meaning to draw away. It's about focusing on the essential while ignoring the incidental." },
    { time: "1:30", text: "In modern computing, this translates to layers. Each layer provides a service to the one above it, hiding the messy details of implementation." },
    { time: "2:15", text: "Think of a car. You don't need to understand internal combustion to drive; you just need to understand the interface: the steering wheel and pedals." },
    { time: "3:00", text: "This is the power of a well-designed abstraction. It reduces cognitive load and allows us to build systems of incredible complexity." }
  ];

  return (
    <div className="max-w-4xl mx-auto py-12 space-y-16">
      <div className="grid md:grid-cols-[300px_1fr] gap-12 items-center">
        <Card className="aspect-square rounded-3xl bg-muted flex items-center justify-center overflow-hidden border-2 relative">
          <AnimatePresence>
            {isPlaying && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex items-center justify-center gap-1"
              >
                {[...Array(5)].map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{ 
                      height: [20, 40, 20],
                    }}
                    transition={{ 
                      repeat: Infinity, 
                      duration: 0.6, 
                      delay: i * 0.1,
                      ease: "easeInOut"
                    }}
                    className="w-1.5 bg-primary/40 rounded-full"
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
          <AudioWaveform className={cn(
            "w-24 h-24 transition-all duration-500",
            isPlaying ? "text-primary scale-110 opacity-20" : "text-muted-foreground/40"
          )} />
        </Card>

        <div className="space-y-6">
          <div className="space-y-2">
            <Badge variant="outline">Audio Lesson</Badge>
            <h2 className="text-4xl font-display">The Philosophy of Abstraction</h2>
            <p className="text-lg text-muted-foreground">
              Exploring the historical roots of abstraction and its impact on modern computing.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between text-sm font-medium">
              <span className="text-muted-foreground">Chapter 1: The Greek Roots</span>
              <span>12:45 remaining</span>
            </div>
            <Slider 
              value={[progress]} 
              onValueChange={(val) => setProgress(val[0])}
              max={100} 
              step={1} 
              className="py-4"
            />
          </div>

          <div className="flex items-center gap-4">
            <Button 
              size="lg" 
              className="rounded-full px-8 min-w-[180px]"
              onClick={() => setIsPlaying(!isPlaying)}
            >
              {isPlaying ? (
                <>
                  <Pause className="w-5 h-5 mr-2 fill-current" />
                  Pause Lesson
                </>
              ) : (
                <>
                  <PlayCircle className="w-5 h-5 mr-2" />
                  Resume Listening
                </>
              )}
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="rounded-full px-8"
              onClick={() => setShowTranscript(!showTranscript)}
            >
              {showTranscript ? "Hide Transcript" : "View Transcript"}
            </Button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showTranscript && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="space-y-8"
          >
            <Separator />
            <div className="space-y-6">
              <h3 className="text-2xl font-display">Transcript</h3>
              <div className="space-y-8">
                {transcript.map((item, i) => (
                  <div key={i} className="flex gap-6 group">
                    <span className="text-sm font-mono text-muted-foreground pt-1 w-12 flex-shrink-0">
                      {item.time}
                    </span>
                    <p className="text-lg leading-relaxed text-foreground/80 group-hover:text-foreground transition-colors">
                      {item.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const MindmapView = () => {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(["root"]));
  const [zoom, setZoom] = useState(0.8);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const nodes: MindmapNode[] = [
    {
      id: "root",
      label: "Foundations of Logic",
      color: "bg-primary text-primary-foreground border-primary/20 shadow-lg shadow-primary/20",
      children: ["abstraction", "data-types", "adts"]
    },
    {
      id: "abstraction",
      label: "Abstraction",
      parentId: "root",
      children: ["complexity", "layers", "independence"]
    },
    {
      id: "complexity",
      label: "Managing Complexity",
      parentId: "abstraction"
    },
    {
      id: "layers",
      label: "Layers of Abstraction",
      parentId: "abstraction"
    },
    {
      id: "independence",
      label: "Implementation Independence",
      parentId: "abstraction"
    },
    {
      id: "data-types",
      label: "Data Types",
      parentId: "root",
      children: ["primitive", "composite", "typing"]
    },
    {
      id: "primitive",
      label: "Primitive Types",
      parentId: "data-types"
    },
    {
      id: "composite",
      label: "Composite Types",
      parentId: "data-types"
    },
    {
      id: "typing",
      label: "Static vs Dynamic",
      parentId: "data-types"
    },
    {
      id: "adts",
      label: "Abstract Data Types",
      parentId: "root",
      children: ["stack", "queue", "list"]
    },
    {
      id: "stack",
      label: "Stack (LIFO)",
      parentId: "adts"
    },
    {
      id: "queue",
      label: "Queue (FIFO)",
      parentId: "adts"
    },
    {
      id: "list",
      label: "Linked List",
      parentId: "adts"
    }
  ];

  // Simple tree layout calculation
  const getLayout = () => {
    const layout = new Map<string, { x: number; y: number }>();
    const levelWidth = 350;
    const nodeHeight = 100;

    const calculate = (nodeId: string, x: number, minY: number): number => {
      const node = nodes.find(n => n.id === nodeId);
      if (!node) return minY;

      const children = (node.children || []).filter(id => expandedNodes.has(nodeId));
      
      if (children.length === 0) {
        layout.set(nodeId, { x, y: minY });
        return minY + nodeHeight;
      }

      let currentY = minY;
      const childYPositions: number[] = [];

      children.forEach(childId => {
        const nextY = calculate(childId, x + levelWidth, currentY);
        childYPositions.push((currentY + nextY - nodeHeight) / 2);
        currentY = nextY;
      });

      const avgY = childYPositions.reduce((a, b) => a + b, 0) / childYPositions.length;
      layout.set(nodeId, { x, y: avgY });
      
      return currentY;
    };

    calculate("root", -450, -200);
    return layout;
  };

  const nodePositions = getLayout();
  const visibleNodeIds = new Set<string>();
  const traverse = (id: string) => {
    visibleNodeIds.add(id);
    if (expandedNodes.has(id)) {
      const node = nodes.find(n => n.id === id);
      node?.children?.forEach(traverse);
    }
  };
  traverse("root");

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <h2 className="text-2xl font-display">Interactive Concept Map</h2>
          <p className="text-sm text-muted-foreground">Visualize the hierarchy and connections of logical foundations.</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 px-3 py-1">
            {visibleNodeIds.size} Concepts
          </Badge>
        </div>
      </div>

      <Card className="h-[700px] relative overflow-hidden bg-muted/10 border-2 rounded-[32px] cursor-grab active:cursor-grabbing group/map">
        {/* Grid Background */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
          style={{ 
            backgroundImage: `radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)`,
            backgroundSize: '32px 32px',
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`
          }} 
        />

        <motion.div 
          className="absolute inset-0"
          drag
          dragMomentum={false}
          animate={{ x: pan.x, y: pan.y, scale: zoom }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          onDragEnd={(_, info) => setPan({ x: pan.x + info.offset.x, y: pan.y + info.offset.y })}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            {/* SVG Connections */}
            <svg className="absolute inset-0 w-full h-full overflow-visible pointer-events-none" style={{ left: '50%', top: '50%' }}>
              <AnimatePresence>
                {nodes.map(node => {
                  if (!node.parentId || !visibleNodeIds.has(node.id) || !visibleNodeIds.has(node.parentId)) return null;
                  const start = nodePositions.get(node.parentId)!;
                  const end = nodePositions.get(node.id)!;
                  
                  // Calculate curve
                  const midX = (start.x + end.x) / 2;
                  
                  return (
                    <motion.path
                      key={`edge-${node.id}`}
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: 1 }}
                      exit={{ opacity: 0 }}
                      d={`M ${start.x + 120} ${start.y} C ${midX} ${start.y}, ${midX} ${end.y}, ${end.x - 120} ${end.y}`}
                      stroke="currentColor"
                      className="text-primary/30 dark:text-primary/50"
                      strokeWidth="2.5"
                      fill="none"
                    />
                  );
                })}
              </AnimatePresence>
            </svg>

            {/* Nodes */}
            <AnimatePresence>
              {nodes.map(node => {
                if (!visibleNodeIds.has(node.id)) return null;
                const pos = nodePositions.get(node.id)!;
                const isExpanded = expandedNodes.has(node.id);
                const hasChildren = (node.children?.length ?? 0) > 0;
                const isRoot = node.id === "root";

                return (
                  <motion.div
                    key={node.id}
                    initial={{ opacity: 0, scale: 0.8, x: pos.x, y: pos.y }}
                    animate={{ opacity: 1, scale: 1, x: pos.x, y: pos.y }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    whileHover={{ y: pos.y - 4, transition: { duration: 0.2 } }}
                    className={cn(
                      "absolute w-[240px] p-4 rounded-[20px] border-2 shadow-sm flex items-center gap-3 transition-all",
                      node.color || "bg-card/80 backdrop-blur-md text-card-foreground border-border/50 hover:border-primary/30 hover:shadow-md"
                    )}
                    style={{ 
                      left: '50%',
                      top: '50%',
                      translateX: '-50%',
                      translateY: '-50%',
                    }}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0",
                      isRoot ? "bg-white/20" : "bg-primary/10 text-primary"
                    )}>
                      {isRoot ? <Network className="w-4 h-4" /> : <BookOpen className="w-4 h-4" />}
                    </div>
                    
                    <span className="text-sm font-bold flex-1 leading-tight">
                      {node.label}
                    </span>

                    {hasChildren && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleNode(node.id);
                        }}
                        className={cn(
                          "w-6 h-6 rounded-lg flex items-center justify-center transition-all border",
                          isExpanded 
                            ? "bg-primary text-primary-foreground border-primary rotate-180" 
                            : "bg-muted/50 text-muted-foreground border-border hover:bg-accent hover:text-accent-foreground"
                        )}
                      >
                        <ChevronRightSmall className="w-3 h-3" />
                      </button>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Controls Overlay */}
        <div className="absolute bottom-8 left-8 flex items-center gap-3">
          <div className="flex flex-col gap-2 p-2 bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-10 w-10 rounded-xl hover:bg-primary/10 hover:text-primary transition-colors"
              onClick={() => setZoom(z => Math.min(z + 0.1, 2))}
            >
              <Plus className="w-4 h-4" />
            </Button>
            <Separator className="bg-border/50" />
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-10 w-10 rounded-xl hover:bg-primary/10 hover:text-primary transition-colors"
              onClick={() => setZoom(z => Math.max(z - 0.1, 0.4))}
            >
              <Minus className="w-4 h-4" />
            </Button>
          </div>
          
          <Button 
            variant="secondary" 
            className="h-12 px-6 rounded-2xl bg-card/80 backdrop-blur-xl border border-border/50 shadow-2xl hover:bg-accent transition-all flex items-center gap-2 font-bold"
            onClick={() => { setPan({ x: 0, y: 0 }); setZoom(0.8); }}
          >
            <Maximize2 className="w-4 h-4" />
            Reset View
          </Button>
        </div>

        {/* Legend */}
        <div className="absolute top-8 right-8 p-4 bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl hidden md:block">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Navigation</p>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span>Drag to pan</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-medium">
              <div className="w-2 h-2 rounded-full bg-muted-foreground" />
              <span>Scroll to zoom</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

// --- Main Page Component ---

export default function DemoModulePage() {
  const [activeMode, setActiveMode] = useState<ViewMode>("immersive_text");
  const [isQuizPassed, setIsQuizPassed] = useState(false);

  return (
    <div className="space-y-8">
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
              {TABS.map((tab) => (
                <TabsTrigger 
                  key={tab.key} 
                  value={tab.key}
                  className="px-6 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  <tab.icon className="w-4 h-4 mr-2" />
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </div>

        <div className="min-h-[600px]">
          <TabsContent value="immersive_text" className="mt-0 focus-visible:outline-none">
            <ImmersiveTextView isQuizPassed={isQuizPassed} setIsQuizPassed={setIsQuizPassed} />
          </TabsContent>
          
          <TabsContent value="slides_narration" className="mt-0 focus-visible:outline-none">
            <SlidesNarrationView />
          </TabsContent>
          
          <TabsContent value="audio_lesson" className="mt-0 focus-visible:outline-none">
            <AudioLessonView />
          </TabsContent>
          
          <TabsContent value="mindmap" className="mt-0 focus-visible:outline-none">
            <MindmapView />
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
