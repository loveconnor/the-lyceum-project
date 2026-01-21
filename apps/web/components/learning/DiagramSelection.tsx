"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check } from "lucide-react";
import * as d3 from "d3";

import type { ComponentRenderProps } from "./types";
import { baseClass, getCustomClass } from "./utils";

type Region = {
  id: string;
  label?: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  borderRadius?: string | number | null;
};

type D3Node = { id: string; label?: string; x?: number; y?: number };
type D3Link = { source: string; target: string };

type DiagramSelectionProps = {
  title?: string | null;
  description?: string | null;
  imagePath?: string | null;
  diagramType?: "default" | "image" | "d3";
  d3Diagram?: {
    nodes: D3Node[];
    links?: D3Link[];
  } | null;
  width?: number;
  height?: number;
  d3NodeRadius?: number;
  regions: Region[];
  multiSelect?: boolean;
  showLabels?: boolean;
  className?: string[];
};

const DefaultDiagram = () => (
  <svg
    viewBox="0 0 800 500"
    className="w-full h-full"
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
        <path
          d="M 40 0 L 0 0 0 40"
          fill="none"
          stroke="#f1f5f9"
          strokeWidth="1"
        />
      </pattern>
    </defs>
    <rect width="800" height="500" fill="#ffffff" />
    <rect width="800" height="500" fill="url(#grid)" />
    <g stroke="#cbd5e1" strokeWidth="3" fill="none">
      <path d="M 400 80 L 400 150" />
      <path d="M 400 230 L 250 320" />
      <path d="M 400 230 L 550 320" />
      <path d="M 250 400 L 400 480" strokeDasharray="5,5" />
      <path d="M 550 400 L 400 480" strokeDasharray="5,5" />
    </g>
    <g transform="translate(400, 50)">
      <circle r="30" fill="#e0f2fe" stroke="#38bdf8" strokeWidth="2" />
      <path
        d="M -15 5 Q 0 15 15 5"
        stroke="#38bdf8"
        strokeWidth="2"
        fill="none"
      />
      <text
        x="0"
        y="-40"
        textAnchor="middle"
        style={{ fontSize: "14px", fontFamily: "sans-serif", fill: "#64748b" }}
      >
        Internet
      </text>
    </g>
    <g transform="translate(360, 150)">
      <rect
        width="80"
        height="80"
        rx="8"
        fill="#f1f5f9"
        stroke="#94a3b8"
        strokeWidth="2"
      />
      <text
        x="40"
        y="45"
        textAnchor="middle"
        style={{
          fontSize: "14px",
          fontFamily: "sans-serif",
          fill: "#334155",
          fontWeight: "bold",
        }}
      >
        LB
      </text>
    </g>
    <g transform="translate(210, 320)">
      <rect
        width="80"
        height="80"
        rx="8"
        fill="#f0fdf4"
        stroke="#4ade80"
        strokeWidth="2"
      />
      <text
        x="40"
        y="45"
        textAnchor="middle"
        style={{
          fontSize: "14px",
          fontFamily: "sans-serif",
          fill: "#334155",
          fontWeight: "bold",
        }}
      >
        App 1
      </text>
    </g>
    <g transform="translate(510, 320)">
      <rect
        width="80"
        height="80"
        rx="8"
        fill="#f0fdf4"
        stroke="#4ade80"
        strokeWidth="2"
      />
      <text
        x="40"
        y="45"
        textAnchor="middle"
        style={{
          fontSize: "14px",
          fontFamily: "sans-serif",
          fill: "#334155",
          fontWeight: "bold",
        }}
      >
        App 2
      </text>
    </g>
    <g transform="translate(360, 440)">
      <path
        d="M0,10 A40,10 0 0,0 80,10 A40,10 0 0,0 0,10"
        fill="#fef9c3"
        stroke="#facc15"
        strokeWidth="2"
      />
      <path
        d="M0,10 L0,50 A40,10 0 0,0 80,50 L80,10"
        fill="#fef9c3"
        stroke="#facc15"
        strokeWidth="2"
      />
      <path
        d="M0,10 A40,10 0 0,1 80,10"
        fill="none"
        stroke="#facc15"
        strokeWidth="2"
      />
      <text
        x="40"
        y="75"
        textAnchor="middle"
        style={{
          fontSize: "14px",
          fontFamily: "sans-serif",
          fill: "#334155",
          fontWeight: "bold",
        }}
      >
        Primary DB
      </text>
    </g>
  </svg>
);

export function DiagramSelection({ element }: ComponentRenderProps) {
  const props = element.props as DiagramSelectionProps;
  const customClass = getCustomClass(props);
  const title = props.title ?? null;
  const description = props.description ?? null;
  const imagePath = props.imagePath ?? null;
  const diagramType =
    props.diagramType ??
    (props.d3Diagram ? "d3" : imagePath ? "image" : "default");
  const d3Diagram = props.d3Diagram ?? null;
  const width =
    typeof props.width === "number" && props.width > 0 ? props.width : 800;
  const height =
    typeof props.height === "number" && props.height > 0 ? props.height : 500;
  const d3NodeRadius =
    typeof props.d3NodeRadius === "number" ? props.d3NodeRadius : 18;
  const baseRegions = Array.isArray(props.regions) ? props.regions : [];
  const multiSelect = Boolean(props.multiSelect);
  const showLabels = props.showLabels ?? true;

  const svgRef = useRef<SVGSVGElement | null>(null);

  const [value, setValue] = useState<string | string[] | null>(
    multiSelect ? [] : null,
  );
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [imagePath]);

  const computedNodes = useMemo(() => {
    if (!d3Diagram) return [];
    const nodes = d3Diagram.nodes ?? [];
    const provided = nodes.some(
      (n) => typeof n.x === "number" && typeof n.y === "number",
    );

    const maxX = Math.max(
      0,
      ...nodes.map((n) => (typeof n.x === "number" ? n.x : 0)),
    );
    const maxY = Math.max(
      0,
      ...nodes.map((n) => (typeof n.y === "number" ? n.y : 0)),
    );
    const normalized01 = provided && maxX <= 1 && maxY <= 1;
    const normalized100 = provided && maxX <= 100 && maxY <= 100;

    if (provided) {
      return nodes.map((node) => {
        const x = typeof node.x === "number" ? node.x : 0;
        const y = typeof node.y === "number" ? node.y : 0;
        if (normalized01) {
          return { ...node, x: x * width, y: y * height };
        }
        if (normalized100) {
          return { ...node, x: (x / 100) * width, y: (y / 100) * height };
        }
        return node;
      });
    }

    const cols = Math.max(1, Math.ceil(Math.sqrt(nodes.length)));
    const rows = Math.max(1, Math.ceil(nodes.length / cols));
    const cellW = width / (cols + 1);
    const cellH = height / (rows + 1);

    return nodes.map((node, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      return {
        ...node,
        x: (col + 1) * cellW,
        y: (row + 1) * cellH,
      };
    });
  }, [d3Diagram, height, width]);

  const regions = useMemo(() => {
    if (baseRegions.length > 0) return baseRegions;
    if (diagramType !== "d3" || !d3Diagram) return baseRegions;

    const nodes = computedNodes as D3Node[];
    return nodes
      .filter(
        (node) => typeof node.x === "number" && typeof node.y === "number",
      )
      .map((node) => {
        const effectiveRadius = Math.max(
          6,
          Math.min(d3NodeRadius, Math.min(width, height) * 0.05),
        );
        const size = effectiveRadius * 2.4;
        const xPercent = ((node.x ?? 0) / width) * 100;
        const yPercent = ((node.y ?? 0) / height) * 100;
        const wPercent = (size / width) * 100;
        const hPercent = (size / height) * 100;

        return {
          id: node.id,
          label: node.label ?? node.id,
          x: xPercent - wPercent / 2,
          y: yPercent - hPercent / 2,
          width: wPercent,
          height: hPercent,
          borderRadius: "999px",
        } as Region;
      });
  }, [
    baseRegions,
    computedNodes,
    d3Diagram,
    d3NodeRadius,
    diagramType,
    height,
    width,
  ]);

  useEffect(() => {
    if (diagramType !== "d3" || !svgRef.current || !d3Diagram) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    svg.attr("viewBox", `0 0 ${width} ${height}`);

    const nodes = computedNodes as D3Node[];
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const links = (d3Diagram.links ?? []) as D3Link[];

    svg
      .append("rect")
      .attr("width", width)
      .attr("height", height)
      .attr("fill", "#ffffff");

    if (links.length > 0) {
      svg
        .append("g")
        .attr("stroke", "#cbd5e1")
        .attr("stroke-width", 2)
        .selectAll("line")
        .data(links)
        .enter()
        .append("line")
        .attr("x1", (d: D3Link) => nodeMap.get(d.source)?.x ?? 0)
        .attr("y1", (d: D3Link) => nodeMap.get(d.source)?.y ?? 0)
        .attr("x2", (d: D3Link) => nodeMap.get(d.target)?.x ?? 0)
        .attr("y2", (d: D3Link) => nodeMap.get(d.target)?.y ?? 0);
    }

    const nodeGroup = svg.append("g");
    const radius = Math.max(
      6,
      Math.min(d3NodeRadius, Math.min(width, height) * 0.05),
    );

    nodeGroup
      .selectAll("circle")
      .data(nodes)
      .enter()
      .append("circle")
      .attr("cx", (d: D3Node) => d.x ?? 0)
      .attr("cy", (d: D3Node) => d.y ?? 0)
      .attr("r", radius)
      .attr("fill", "#f1f5f9")
      .attr("stroke", "#94a3b8")
      .attr("stroke-width", 2);

    nodeGroup
      .selectAll("text")
      .data(nodes)
      .enter()
      .append("text")
      .attr("x", (d: D3Node) => d.x ?? 0)
      .attr("y", (d: D3Node) => (d.y ?? 0) + radius + 14)
      .attr("text-anchor", "middle")
      .attr("font-size", 12)
      .attr("font-family", "sans-serif")
      .attr("fill", "#334155")
      .text((d: D3Node) => d.label ?? d.id);
  }, [computedNodes, d3Diagram, diagramType, d3NodeRadius, height, width]);

  const handleSelect = (id: string) => {
    if (multiSelect) {
      const current = Array.isArray(value) ? value : [];
      if (current.includes(id)) {
        setValue(current.filter((item) => item !== id));
      } else {
        setValue([...current, id]);
      }
      return;
    }
    setValue(value === id ? null : id);
  };

  const isSelected = (id: string) => {
    if (multiSelect) {
      return Array.isArray(value) && value.includes(id);
    }
    return value === id;
  };

  return (
    <div className={`${baseClass} ${customClass} w-full max-w-3xl mx-auto`}>
      {title ? (
        <div className="text-sm font-semibold text-left mb-1">{title}</div>
      ) : null}
      {description ? (
        <div className="text-xs text-muted-foreground text-left mb-3">
          {description}
        </div>
      ) : null}

      <div className="relative w-full overflow-hidden rounded-md border border-border bg-background select-none">
        <div className="relative w-full aspect-[8/5] bg-muted/20">
          {diagramType === "d3" ? (
            <svg ref={svgRef} className="w-full h-full" />
          ) : diagramType === "image" && imagePath && !imageError ? (
            <img
              src={imagePath}
              alt="Diagram"
              className="w-full h-full object-contain pointer-events-none"
              onError={() => setImageError(true)}
            />
          ) : diagramType === "image" ? (
            <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
              Diagram image failed to load
            </div>
          ) : (
            <DefaultDiagram />
          )}

          {regions.map((region) => {
            const active = isSelected(region.id);
            return (
              <button
                key={region.id}
                onClick={() => handleSelect(region.id)}
                className={`absolute transition-colors duration-200 group outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 ${
                  active
                    ? "bg-primary/20 ring-2 ring-primary/60 z-10"
                    : "hover:bg-muted/30 hover:ring-2 hover:ring-foreground/10 z-0"
                }`}
                style={{
                  left: `${region.x}%`,
                  top: `${region.y}%`,
                  width: `${region.width}%`,
                  height: `${region.height}%`,
                  borderRadius: region.borderRadius ?? "8px",
                }}
                aria-label={`Select ${region.label || region.id}`}
                aria-pressed={active}
              >
                <div
                  className={`absolute -top-2 -right-2 flex items-center justify-center w-5 h-5 rounded-full text-white transition-all duration-300 transform scale-0 ${
                    active
                      ? "bg-primary scale-100"
                      : "bg-muted-foreground/60 group-hover:scale-75 opacity-0 group-hover:opacity-100"
                  }`}
                >
                  {active ? (
                    <Check size={12} strokeWidth={3} />
                  ) : (
                    <div className="w-2 h-2 bg-white rounded-full" />
                  )}
                </div>

                {showLabels && region.label ? (
                  <div
                    className={`absolute left-1/2 -translate-x-1/2 -bottom-7 px-2 py-1 bg-foreground text-background text-[10px] rounded shadow-lg whitespace-nowrap pointer-events-none transition-all duration-200 ${
                      active
                        ? "opacity-100"
                        : "opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0"
                    }`}
                  >
                    {region.label}
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 border-4 border-transparent border-b-foreground" />
                  </div>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
