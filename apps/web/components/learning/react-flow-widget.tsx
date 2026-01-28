"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useTheme } from "next-themes";
import {
  ReactFlow,
  Background,
  Controls,
  Node,
  Edge,
  MarkerType,
  Handle,
  Position,
  NodeProps,
  useNodesState,
  useEdgesState,
  ConnectionLineType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import "./react-flow-widget.css";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Network,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Markdown } from "./markdown";

interface ReactFlowWidgetData {
  title: string;
  description?: string;
  nodes: Array<{
    id: string;
    position: { x: number; y: number };
    data: { label: string };
    type?: "default" | "input" | "output";
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
    type?: "default" | "straight" | "step" | "smoothstep" | "bezier";
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
      type: "arrow" | "arrowclosed";
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
  viewedVisuals?: Set<number>;
  onVisualViewed?: (index: number) => void;
}

type RawVisual = Partial<ReactFlowWidgetData> & {
  steps?: Array<string | { label?: string; title?: string }>;
  items?: Array<string | { label?: string; title?: string }>;
};

const normalizeVisual = (visual: RawVisual): ReactFlowWidgetData => {
  const base = visual || {};
  let nodes = Array.isArray(base.nodes) ? [...base.nodes] : [];
  let edges = Array.isArray(base.edges) ? [...base.edges] : [];

  if (nodes.length === 0) {
    const steps = Array.isArray(base.steps)
      ? base.steps
      : Array.isArray(base.items)
        ? base.items
        : [];

    if (steps.length > 0) {
      nodes = steps.map((step, idx) => {
        const label =
          typeof step === "string"
            ? step
            : step?.label || step?.title || `Step ${idx + 1}`;
        return {
          id: `step-${idx + 1}`,
          position: { x: 0, y: idx * 120 },
          data: { label },
          type:
            idx === 0
              ? "input"
              : idx === steps.length - 1
                ? "output"
                : "default",
        } as ReactFlowWidgetData["nodes"][number];
      });

      edges = steps.slice(1).map((_, idx) => ({
        id: `e-${idx + 1}-${idx + 2}`,
        source: `step-${idx + 1}`,
        target: `step-${idx + 2}`,
        type: "smoothstep",
        animated: true,
      }));
    }
  }

  nodes = nodes.map((node, idx) => {
    const nodeId = node.id || node.data?.id || `node-${idx + 1}`;
    const label = node.data?.label || (node as any).label || (node as any).title || nodeId;
    return {
      ...node,
      id: nodeId,
      data: { ...(node.data || {}), label },
      position: node.position || { x: 0, y: idx * 120 },
      type: node.type || "default",
    };
  });

  if (edges.length === 0 && nodes.length > 1) {
    edges = nodes.slice(1).map((node, idx) => ({
      id: `e-${idx + 1}-${idx + 2}`,
      source: nodes[idx].id,
      target: node.id,
      type: "smoothstep",
      animated: true,
    }));
  }

  return {
    title: base.title || "Untitled Diagram",
    description: base.description,
    nodes,
    edges,
  } as ReactFlowWidgetData;
};

export function ReactFlowWidget({
  visuals,
  height = "500px",
  showNavigation = true,
  showSidebar = true,
  onViewComplete,
  variant = "card",
  viewedVisuals: controlledViewedVisuals,
  onVisualViewed,
}: ReactFlowWidgetProps) {
  const { theme } = useTheme();
  const [currentVisualIndex, setCurrentVisualIndex] = useState(0);
  const [localViewedVisuals, setLocalViewedVisuals] = useState<Set<number>>(
    new Set(),
  );

  const viewedVisuals = controlledViewedVisuals || localViewedVisuals;

  const markViewed = useCallback(
    (index: number) => {
      if (onVisualViewed) {
        onVisualViewed(index);
      } else {
        setLocalViewedVisuals((prev) => {
          const next = new Set(prev);
          next.add(index);
          return next;
        });
      }
    },
    [onVisualViewed],
  );

  // State for ReactFlow
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // Mark visual as viewed
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!viewedVisuals.has(currentVisualIndex)) {
        markViewed(currentVisualIndex);
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [currentVisualIndex, viewedVisuals, markViewed]);

  // Completion check
  useEffect(() => {
    if (
      viewedVisuals.size >= visuals.length &&
      visuals.length > 0 &&
      onViewComplete
    ) {
      onViewComplete();
    }
  }, [viewedVisuals.size, visuals.length, onViewComplete]);

  // Update Graph when visual changes
  useEffect(() => {
    if (!visuals || visuals.length === 0) return;

    const current = normalizeVisual(visuals[currentVisualIndex] as RawVisual);
    if (!current) return;

    // Apply Layout
    const layoutedNodesData = calculateTreeLayout(current.nodes, current.edges);

    // Map to ReactFlow Nodes
    const newNodes: Node[] = layoutedNodesData.map((node) => ({
      id: node.id,
      type: "default", // Use our custom default type
      position: node.position,
      data: {
        label: node.data?.label || node.id,
      },
      // Keep only specific style overrides if strictly necessary, but prefer our component style
      style: node.style
        ? { backgroundColor: "transparent", border: "none", width: "auto" }
        : { backgroundColor: "transparent", border: "none", width: "auto" },
    }));

    // Map to ReactFlow Edges
    const newEdges: Edge[] = current.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.label,
      type: "default", // Using 'default' (bezier) for smoother flow
      animated: true,
      style: {
        strokeWidth: 2,
        stroke: "var(--foreground)",
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: "var(--foreground)",
      },
      labelBgStyle: {
        fill: "var(--card)",
        opacity: 0.8,
      },
      labelStyle: {
        fill: "var(--foreground)",
        fontWeight: 700,
      },
    }));

    setNodes(newNodes);
    setEdges(newEdges);
  }, [currentVisualIndex, visuals, setNodes, setEdges]);

  if (!visuals || visuals.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-2xl border-2 border-dashed">
          <CardContent className="p-12 text-center space-y-4">
            <Eye className="w-16 h-16 mx-auto text-muted-foreground opacity-20" />
            <h3 className="text-2xl font-display text-foreground">
              No Visuals Available
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              Visual diagrams help illustrate concepts like processes,
              hierarchies, and relationships.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentVisual = normalizeVisual(visuals[currentVisualIndex] as RawVisual);
  if (!currentVisual) {
    return null;
  }

  const diagramContent = (
    <div className="flex flex-col gap-4" style={{ height: height }}>
      {/* Header */}
      <div className="flex items-start justify-between px-1">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-semibold tracking-tight">
              {currentVisual.title}
            </h3>
          </div>
          {currentVisual.description && (
            <p className="text-sm text-muted-foreground">
              {currentVisual.description}
            </p>
          )}
        </div>

        {/* Navigation buttons (compact) */}
        {showNavigation && visuals.length > 1 && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() =>
                setCurrentVisualIndex(Math.max(0, currentVisualIndex - 1))
              }
              disabled={currentVisualIndex === 0}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-xs text-muted-foreground font-mono w-12 text-center">
              {currentVisualIndex + 1} / {visuals.length}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() =>
                setCurrentVisualIndex(
                  Math.min(visuals.length - 1, currentVisualIndex + 1),
                )
              }
              disabled={currentVisualIndex === visuals.length - 1}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      <div
        className="relative flex-1 min-h-[240px] rounded-xl border bg-muted/30 overflow-hidden shadow-inner"
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          colorMode={theme === "dark" ? "dark" : "light"}
          fitView
          fitViewOptions={{ padding: 0.1, minZoom: 0.8, maxZoom: 1.5 }}
          minZoom={0.5}
          maxZoom={2}
          className="bg-muted/10 react-flow-widget-container w-full h-full"
        >
          <Background gap={20} size={1} className="opacity-40" />
          <Controls className="!bg-card !border-border !shadow-sm" />
        </ReactFlow>
      </div>
    </div>
  );

  if (!showSidebar) {
    return diagramContent;
  }

  return (
    <div className="flex gap-6">
      {/* Left sidebar - Visual navigation */}
      <div
        className="w-80 flex-shrink-0 min-w-0 md:block hidden"
        style={{ height: height }}
      >
        <Card className="py-0 h-full">
          <CardContent className="p-2 h-full flex flex-col">
            <div className="flex items-center justify-between px-2 py-2 mb-1">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Diagrams
              </h3>
              <Badge variant="outline" className="text-xs h-5">
                {visuals.length}
              </Badge>
            </div>
            <nav className="flex flex-col space-y-0.5 overflow-y-auto flex-1 pr-1">
              {visuals.map((visual, i) => {
                const isViewed = viewedVisuals.has(i);
                const isActive = currentVisualIndex === i;

                return (
                  <Button
                    key={i}
                    variant="ghost"
                    onClick={() => setCurrentVisualIndex(i)}
                    className={cn(
                      "w-full text-left px-3 py-2 h-auto flex-col items-start gap-1 overflow-hidden shrink-0",
                      isActive && "bg-muted hover:bg-muted",
                    )}
                  >
                    <div className="flex items-center justify-between w-full mb-1 min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <Network className="w-3 h-3 flex-shrink-0" />
                        <span className="font-medium text-sm truncate">
                          {visual.title}
                        </span>
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
              <Card className="border shadow-none bg-green-500/5 border-green-500/20 mt-2 shrink-0">
                <CardContent className="p-2">
                  <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                    <CheckCircle2 className="w-3 h-3" />
                    <span className="text-xs font-medium">
                      All visuals viewed!
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0 flex flex-col">{diagramContent}</div>
    </div>
  );
}

// Custom Node Component with enhanced styling
const CustomNode = ({ data, selected }: NodeProps) => {
  return (
    <div
      className={cn(
        "relative min-w-[200px] max-w-[300px] rounded-xl border bg-card px-5 py-4 shadow-sm transition-all duration-300",
        selected
          ? "border-primary ring-2 ring-primary/20 shadow-lg scale-105"
          : "border-border hover:border-primary/50 hover:shadow-md",
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!h-3 !w-3 !bg-muted-foreground/30 transition-colors hover:!bg-primary !-top-1.5 !border-2 !border-background"
      />

      <div className="flex flex-col gap-2">
        <div className="text-center">
          <div className="text-sm font-semibold leading-tight text-foreground">
            <Markdown className="prose-sm dark:prose-invert prose-p:m-0 prose-p:leading-tight [&_*]:text-inherit pointer-events-none">
              {data.label as string}
            </Markdown>
          </div>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-3 !w-3 !bg-muted-foreground/30 transition-colors hover:!bg-primary !-bottom-1.5 !border-2 !border-background"
      />
    </div>
  );
};

const nodeTypes = {
  default: CustomNode,
  input: CustomNode,
  output: CustomNode,
};

// Improved Tree Layout Algorithm (Reingold-Tilford inspired)
const calculateTreeLayout = (nodes: any[], edges: any[]) => {
  if (!nodes || nodes.length === 0) return [];

  // Deep clone to avoid mutating original data during calculation
  const layoutNodes = nodes.map((n) => ({ ...n }));

  // 1. Build Graph Structure
  const nodeMap = new Map();
  layoutNodes.forEach((n) =>
    nodeMap.set(n.id, { ...n, children: [], width: 0, x: 0, y: 0 }),
  );

  const childrenSet = new Set();
  edges.forEach((e) => {
    // Determine directionality - usually source -> target
    const parent = nodeMap.get(e.source);
    if (parent) {
      parent.children.push(e.target);
      childrenSet.add(e.target);
    }
  });

  // 2. Identify Roots
  let roots = layoutNodes.map((n) => n.id).filter((id) => !childrenSet.has(id));
  if (roots.length === 0 && layoutNodes.length > 0) roots = [layoutNodes[0].id]; // Cycle or disconnected

  // Constants for spacing
  const NODE_WIDTH = 240; // Assumed width with spacing
  const NODE_HEIGHT = 120; // Vertical layer spacing
  const SIBLING_GAP = 50;

  // 3. Recursive Width Calculation & Initial Placement
  const calculateVisited = new Set<string>();
  const calculateSubtree = (nodeId: string): number => {
    // Prevent infinite recursion / cycles
    if (calculateVisited.has(nodeId)) return 0;
    calculateVisited.add(nodeId);

    const node = nodeMap.get(nodeId);
    if (!node) return 0;

    if (node.children.length === 0) {
      node.subtreeWidth = NODE_WIDTH;
      return NODE_WIDTH;
    }

    let w = 0;
    node.children.forEach((childId: string, index: number) => {
      w += calculateSubtree(childId);
      if (index < node.children.length - 1) w += SIBLING_GAP;
    });

    node.subtreeWidth = w;
    return w;
  };

  roots.forEach(calculateSubtree);

  // 4. Assign Absolute Positions
  const positionVisited = new Set<string>();
  const assignPositions = (nodeId: string, x: number, y: number) => {
    // Prevent infinite recursion / re-positioning
    if (positionVisited.has(nodeId)) return;
    positionVisited.add(nodeId);

    const node = nodeMap.get(nodeId);
    if (!node) return;

    node.x = x;
    node.y = y;

    if (node.children && node.children.length > 0) {
      let currentX = x - node.subtreeWidth / 2;

      node.children.forEach((childId: string) => {
        const child = nodeMap.get(childId);
        // Place child centered in its subtree allocation
        const childWidth = child.subtreeWidth;
        const childCenterX = currentX + childWidth / 2;

        assignPositions(childId, childCenterX, y + NODE_HEIGHT);

        currentX += childWidth + SIBLING_GAP;
      });
    }
  };

  // Place roots side-by-side
  let currentRootX = 0;
  roots.forEach((rootId) => {
    const root = nodeMap.get(rootId);
    // Center the root's subtree starting at currentRootX
    const rootCenterX = currentRootX + root.subtreeWidth / 2;
    assignPositions(rootId, rootCenterX, 50);
    currentRootX += root.subtreeWidth + SIBLING_GAP * 2;
  });

  // Return nodes with new ReactFlow positions
  return layoutNodes.map((n) => {
    const node = nodeMap.get(n.id);
    return {
      ...n,
      position: { x: node.x - 100, y: node.y }, // Center offset adjustment if needed
    };
  });
};

// Export the data type for use in lab templates
export type { ReactFlowWidgetData };
