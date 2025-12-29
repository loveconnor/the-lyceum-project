"use client";

import React, { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { 
  ReactFlow, 
  Background, 
  Controls, 
  Node, 
  Edge,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './react-flow-widget.css';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ChevronLeft, 
  ChevronRight, 
  Eye,
  Network,
  CheckCircle2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Markdown } from "@/components/ui/custom/prompt/markdown";

interface ReactFlowWidgetData {
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
}

interface ReactFlowWidgetProps {
  visuals: ReactFlowWidgetData[];
  height?: string;
  showNavigation?: boolean;
  showSidebar?: boolean;
  onViewComplete?: () => void;
  variant?: "card" | "full";
}

export function ReactFlowWidget({
  visuals,
  height = "500px",
  showNavigation = true,
  showSidebar = true,
  onViewComplete,
  variant = "card"
}: ReactFlowWidgetProps) {
  const { theme } = useTheme();
  const [currentVisualIndex, setCurrentVisualIndex] = useState(0);
  const [viewedVisuals, setViewedVisuals] = useState<Set<number>>(new Set());

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
    if (viewedVisuals.size >= visuals.length && onViewComplete) {
      onViewComplete();
    }
  }, [viewedVisuals.size, visuals.length, onViewComplete]);

  if (!visuals || visuals.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-2xl border-2 border-dashed">
          <CardContent className="p-12 text-center space-y-4">
            <Eye className="w-16 h-16 mx-auto text-muted-foreground opacity-20" />
            <h3 className="text-2xl font-display text-foreground">No Visuals Available</h3>
            <p className="text-muted-foreground leading-relaxed">
              Visual diagrams help illustrate concepts like processes, hierarchies, and relationships.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentVisual = visuals[currentVisualIndex];
  
  // Helper function to check if positions are valid and not overlapping
  const hasValidPositions = (nodes: typeof currentVisual.nodes) => {
    if (!nodes || nodes.length === 0) return false;
    
    // Check if all nodes have valid positions
    const allHavePositions = nodes.every(
      node => node.position && 
              typeof node.position.x === 'number' && 
              typeof node.position.y === 'number'
    );
    
    if (!allHavePositions) return false;
    
    // Check for overlapping (nodes too close together)
    const minDistance = 150; // Minimum distance between node centers
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].position.x - nodes[j].position.x;
        const dy = nodes[i].position.y - nodes[j].position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < minDistance) return false;
      }
    }
    
    return true;
  };

  // Simple hierarchical layout algorithm for better visualization
  const applyAutoLayout = (nodes: typeof currentVisual.nodes, edges: typeof currentVisual.edges) => {
    // Build adjacency list to understand the graph structure
    const nodeMap = new Map(nodes.map(n => [n.id, { ...n, children: [] as string[], parents: [] as string[] }]));
    
    edges.forEach(edge => {
      const source = nodeMap.get(edge.source);
      const target = nodeMap.get(edge.target);
      if (source && target) {
        source.children.push(edge.target);
        target.parents.push(edge.source);
      }
    });

    // Find root nodes (no parents)
    const roots = Array.from(nodeMap.values()).filter(n => n.parents.length === 0);
    if (roots.length === 0 && nodes.length > 0) {
      // No clear root, use first node
      roots.push(nodeMap.get(nodes[0].id)!);
    }

    // Assign levels using BFS
    const levels = new Map<string, number>();
    const queue = roots.map(r => ({ id: r.id, level: 0 }));
    const visited = new Set<string>();

    while (queue.length > 0) {
      const { id, level } = queue.shift()!;
      if (visited.has(id)) continue;
      visited.add(id);
      levels.set(id, level);

      const node = nodeMap.get(id);
      if (node) {
        node.children.forEach(childId => {
          if (!visited.has(childId)) {
            queue.push({ id: childId, level: level + 1 });
          }
        });
      }
    }

    // Assign positions based on levels
    const levelGroups = new Map<number, string[]>();
    levels.forEach((level, id) => {
      if (!levelGroups.has(level)) {
        levelGroups.set(level, []);
      }
      levelGroups.get(level)!.push(id);
    });

    const horizontalSpacing = 250;
    const verticalSpacing = 150;
    const startX = 300;
    const startY = 50;

    return nodes.map(node => {
      const level = levels.get(node.id) ?? 0;
      const nodesInLevel = levelGroups.get(level) ?? [node.id];
      const indexInLevel = nodesInLevel.indexOf(node.id);
      const totalInLevel = nodesInLevel.length;

      // Center the level horizontally
      const levelWidth = (totalInLevel - 1) * horizontalSpacing;
      const x = startX - levelWidth / 2 + indexInLevel * horizontalSpacing;
      const y = startY + level * verticalSpacing;

      return {
        ...node,
        position: { x, y }
      };
    });
  };

  // Determine if we need auto-layout
  const needsAutoLayout = !hasValidPositions(currentVisual.nodes);
  const layoutedNodes = needsAutoLayout 
    ? applyAutoLayout(currentVisual.nodes, currentVisual.edges)
    : currentVisual.nodes;
  
  // Get theme-aware colors
  const isDark = theme === 'dark';
  const nodeBackground = isDark ? '#1f2937' : '#ffffff';
  const nodeTextColor = isDark ? '#ffffff' : '#000000';
  const nodeBorderColor = isDark ? '#3b82f6' : '#2563eb';
  
  // Convert AI-generated nodes to ReactFlow format
  const nodes: Node[] = layoutedNodes.map((node, index) => ({
    id: node.id,
    type: node.type || 'default',
    position: node.position,
    data: {
      label: (
        <div className="text-sm font-medium text-center max-w-[200px]" style={{ color: nodeTextColor }}>
          <Markdown 
            className="prose-p:m-0 prose-p:leading-tight [&_*]:text-inherit" 
            components={{ 
              p: ({ children }) => <span className="inline-block" style={{ color: nodeTextColor }}>{children}</span>,
              code: ({ children }) => <code className="bg-transparent" style={{ color: nodeTextColor }}>{children}</code>
            }}
          >
            {node.data?.label || node.id}
          </Markdown>
        </div>
      )
    },
    style: {
      background: nodeBackground,
      border: `2px solid ${nodeBorderColor}`,
      borderRadius: '10px',
      padding: '16px 20px',
      fontSize: '14px',
      fontWeight: 600,
      color: nodeTextColor,
      minWidth: '140px',
      maxWidth: '250px',
      width: 'auto',
      ...(node.style as React.CSSProperties),
    },
  }));

  // Convert AI-generated edges to ReactFlow format with proper markerEnd
  const edges: Edge[] = currentVisual.edges.map((edge) => {
    const defaultStyle = {
      stroke: 'hsl(var(--primary))',
      strokeWidth: 3,
    };

    return {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.label,
      type: edge.type || 'smoothstep',
      animated: edge.animated || false,
      style: edge.style ? { ...defaultStyle, ...(edge.style as React.CSSProperties) } : defaultStyle,
      labelStyle: edge.labelStyle ? { 
        fontSize: 13,
        fontWeight: 600,
        fill: 'hsl(var(--foreground))',
        ...(edge.labelStyle as React.CSSProperties)
      } : {
        fontSize: 13,
        fontWeight: 600,
        fill: 'hsl(var(--foreground))',
      },
      markerEnd: edge.markerEnd ? {
        type: edge.markerEnd.type === 'arrowclosed' ? MarkerType.ArrowClosed : MarkerType.Arrow,
        color: edge.markerEnd.color || 'hsl(var(--primary))',
        width: 20,
        height: 20,
      } : {
        type: MarkerType.ArrowClosed,
        color: 'hsl(var(--primary))',
        width: 20,
        height: 20,
      },
    };
  });

  const isFull = variant === "full";

  const diagramContent = (
    <div className="space-y-3">
      {/* Header */}
      <div>
        <Badge variant="outline" className="mb-2">
          Diagram
        </Badge>
        <h3 className="text-lg font-semibold mb-1">{currentVisual.title}</h3>
        {currentVisual.description && (
          <p className="text-sm text-muted-foreground">{currentVisual.description}</p>
        )}
      </div>

      {/* React Flow Diagram */}
      <div className="overflow-hidden rounded-xl border bg-card">
        <div style={{ height, width: '100%' }}>
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

      {/* Navigation buttons */}
      {showNavigation && visuals.length > 1 && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
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
            size="sm"
            onClick={() => setCurrentVisualIndex(Math.min(visuals.length - 1, currentVisualIndex + 1))}
            disabled={currentVisualIndex === visuals.length - 1}
          >
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );

  if (!showSidebar) {
    return diagramContent;
  }

  return (
    <div className="flex gap-6 h-full">
      {/* Left sidebar - Visual navigation */}
      <div className="w-80 flex-shrink-0 min-w-0">
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
            {viewedVisuals.size >= visuals.length && (
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

      {/* Main content */}
      <div className="flex-1">
        {diagramContent}
      </div>
    </div>
  );
}

// Export the data type for use in lab templates
export type { ReactFlowWidgetData };

