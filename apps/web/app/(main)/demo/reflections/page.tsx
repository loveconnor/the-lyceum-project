'use client';

/**
 * Reflection Demo Page
 * 
 * This page demonstrates the Reflections feature components.
 * Useful for testing and showing stakeholders.
 * 
 * To use: Create a page at app/(main)/demo/reflections/page.tsx
 */

import React, { useState } from 'react';
import { ReflectionModal, ReflectionEditor } from '@/components/reflections';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain, MessageSquare, FileText } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

export default function ReflectionDemoPage() {
  const [showModal, setShowModal] = useState(false);
  const [editorValues, setEditorValues] = useState<any>(null);

  return (
    <div className="container max-w-5xl py-10 space-y-10">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">Reflections Demo</h1>
        <p className="text-lg text-muted-foreground">
          Experience the structured thinking tool designed to help learners convert action into understanding.
        </p>
      </div>

      <Separator />

      {/* Demo Section 1: Modal */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <MessageSquare className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Reflection Modal</CardTitle>
              <CardDescription>
                Dialog-based interface for quick reflection after completing an activity
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This modal appears after a learner completes a lab or exercise. It provides
            three structured sections for guided reflection, with options to save or skip.
          </p>
          
          <Button onClick={() => setShowModal(true)} className="gap-2">
            <Brain className="h-4 w-4" />
            Open Reflection Modal
          </Button>

          <ReflectionModal
            open={showModal}
            onOpenChange={setShowModal}
            contextType="lab"
            contextId="demo-lab-123"
            contextTitle="Understanding React Hooks and State Management"
            onComplete={() => {
              console.log('Reflection completed or skipped');
            }}
          />
        </CardContent>
      </Card>

      {/* Demo Section 2: Editor Component */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Reflection Editor</CardTitle>
              <CardDescription>
                Standalone editor component that can be embedded anywhere
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            The core editor component with three structured sections. Each section includes
            a clear prompt to guide thinking without being prescriptive.
          </p>

          <div className="border rounded-lg p-6 bg-muted/20">
            <ReflectionEditor
              onChange={(values) => {
                setEditorValues(values);
                console.log('Editor values changed:', values);
              }}
            />
          </div>

          {editorValues && (
            <div className="text-xs text-muted-foreground">
              <p>Editor is working! Values are being captured in state.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Design Principles */}
      <Card>
        <CardHeader>
          <CardTitle>Design Principles</CardTitle>
          <CardDescription>
            What makes this reflection system different
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <h4 className="text-sm font-medium">✓ Structured thinking tool</h4>
              <p className="text-sm text-muted-foreground">
                Not free-writing or journaling. Clear sections guide reasoning.
              </p>
            </div>
            
            <div className="space-y-2">
              <h4 className="text-sm font-medium">✓ Concise and precise</h4>
              <p className="text-sm text-muted-foreground">
                Encourages specific explanations over long narratives.
              </p>
            </div>
            
            <div className="space-y-2">
              <h4 className="text-sm font-medium">✓ Professional interface</h4>
              <p className="text-sm text-muted-foreground">
                Minimal UI, calm styling, consistent with app design.
              </p>
            </div>
            
            <div className="space-y-2">
              <h4 className="text-sm font-medium">✓ Action to understanding</h4>
              <p className="text-sm text-muted-foreground">
                Appears after meaningful work to consolidate learning.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Use Cases */}
      <Card>
        <CardHeader>
          <CardTitle>When to Use Reflections</CardTitle>
          <CardDescription>
            Appropriate triggers for the reflection experience
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">→</span>
              <span>After completing a lab with multiple steps or attempts</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">→</span>
              <span>Following a challenging exercise that required problem-solving</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">→</span>
              <span>At the end of a module before moving to the next one</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">→</span>
              <span>After a meaningful attempt (not every single interaction)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">→</span>
              <span>When the learner can articulate what they tried and learned</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Integration Info */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle>Integration</CardTitle>
          <CardDescription>
            How to add reflections to your lab templates
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            See <code className="px-2 py-1 rounded bg-muted">components/reflections/integration-guide.tsx</code> for
            detailed examples of integrating reflections into existing lab templates.
          </p>
          <p>
            The minimal integration requires only:
          </p>
          <ol className="list-decimal list-inside space-y-2 text-muted-foreground ml-4">
            <li>Import ReflectionModal</li>
            <li>Add state: <code className="px-1.5 py-0.5 rounded bg-muted text-xs">useState(false)</code></li>
            <li>Show modal after lab completion</li>
            <li>Render the modal component</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
