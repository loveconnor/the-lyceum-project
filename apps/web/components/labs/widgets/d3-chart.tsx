"use client";

import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { useTheme } from 'next-themes';

interface D3ChartProps {
  options: any;
  height: string | number;
}

export function D3Chart({ options, height }: D3ChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const { theme } = useTheme();
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries[0]) return;
      const { width, height: h } = entries[0].contentRect;
      setDimensions({ 
        width, 
        height: typeof height === 'number' ? height : h || 350 
      });
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, [height]);

  useEffect(() => {
    if (!svgRef.current || dimensions.width === 0 || dimensions.height === 0 || !options) return;

    const { data, series } = options;
    if (!data || !series || series.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 30, right: 30, bottom: 50, left: 60 };
    const width = dimensions.width - margin.left - margin.right;
    const height = dimensions.height - margin.top - margin.bottom;

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const isDark = theme === 'dark';
    const textColor = isDark ? "#94a3b8" : "#64748b";
    const gridColor = isDark ? "#1e293b" : "#f1f5f9";

    // Colors
    const defaultColors = isDark 
      ? ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"]
      : ["#2563eb", "#059669", "#d97706", "#dc2626", "#7c3aed"];

    // Determine X scale type based on the first series
    const firstSeries = series[0];
    const xKey = firstSeries.xKey;
    const isNumericX = data.length > 0 && data.every((d: any) => !isNaN(Number(d[xKey])) && typeof d[xKey] !== 'boolean');

    let x: any;
    if (isNumericX && firstSeries.type !== 'bar') {
      const xExtent = d3.extent(data, (d: any) => Number(d[xKey])) as [number, number];
      x = d3.scaleLinear()
        .domain([xExtent[0] * 0.9, xExtent[1] * 1.1])
        .nice()
        .range([0, width]);
    } else {
      x = d3.scaleBand()
        .domain(data.map((d: any) => String(d[xKey])))
        .range([0, width])
        .padding(0.3);
    }

    // Determine Y scale (shared for all series for now)
    const yMax = d3.max(series.flatMap((s: any) => data.map((d: any) => Number(d[s.yKey])))) || 10;
    const y = d3.scaleLinear()
      .domain([0, yMax * 1.1])
      .nice()
      .range([height, 0]);

    // Grid lines
    g.append("g")
      .attr("class", "grid")
      .attr("stroke-opacity", 0.1)
      .call(d3.axisLeft(y)
        .tickSize(-width)
        .tickFormat(() => "")
      )
      .call(g => g.select(".domain").remove())
      .selectAll("line")
      .attr("stroke", gridColor);

    // Axes
    const xAxis = g.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(isNumericX && firstSeries.type !== 'bar' ? d3.axisBottom(x) : d3.axisBottom(x));

    xAxis.selectAll("text")
      .attr("fill", textColor)
      .attr("font-size", "12px")
      .attr("transform", data.length > 10 ? "rotate(-45)" : "rotate(0)")
      .style("text-anchor", data.length > 10 ? "end" : "middle");
    
    xAxis.select(".domain").attr("stroke", gridColor);
    xAxis.selectAll("line").attr("stroke", gridColor);

    const yAxis = g.append("g")
      .call(d3.axisLeft(y).ticks(5));

    yAxis.selectAll("text")
      .attr("fill", textColor)
      .attr("font-size", "12px");

    yAxis.select(".domain").attr("stroke", gridColor);
    yAxis.selectAll("line").attr("stroke", gridColor);

    // Render each series
    series.forEach((s: any, index: number) => {
      const type = s.type || 'bar';
      const yKey = s.yKey;
      const color = s.fill || s.stroke || defaultColors[index % defaultColors.length];
      const strokeWidth = s.strokeWidth || 3;
      const opacity = s.fillOpacity || s.opacity || 0.7;
      
      const curveMap: Record<string, any> = {
        'basis': d3.curveBasis,
        'bundle': d3.curveBundle,
        'cardinal': d3.curveCardinal,
        'catmull-rom': d3.curveCatmullRom,
        'linear': d3.curveLinear,
        'monotone-x': d3.curveMonotoneX,
        'monotone-y': d3.curveMonotoneY,
        'natural': d3.curveNatural,
        'step': d3.curveStep,
        'step-after': d3.curveStepAfter,
        'step-before': d3.curveStepBefore,
      };
      const curve = curveMap[s.curve] || d3.curveMonotoneX;

      if (type === 'bar') {
        g.selectAll(`.bar-${index}`)
          .data(data)
          .enter().append("rect")
          .attr("class", `bar bar-${index}`)
          .attr("x", (d: any) => x(String(d[xKey])) || 0)
          .attr("y", (d: any) => y(Number(d[yKey])))
          .attr("width", x.bandwidth())
          .attr("height", (d: any) => height - y(Number(d[yKey])))
          .attr("fill", color)
          .attr("fill-opacity", opacity)
          .attr("rx", 4);
      } else if (type === 'line' || type === 'area') {
        const getX = (d: any) => {
          if (isNumericX && type !== 'bar') return x(Number(d[xKey]));
          return (x(String(d[xKey])) || 0) + x.bandwidth() / 2;
        };

        if (type === 'area') {
          const area = d3.area<any>()
            .x(getX)
            .y0(height)
            .y1((d: any) => y(Number(d[yKey])))
            .curve(curve);

          g.append("path")
            .datum(data)
            .attr("fill", color)
            .attr("fill-opacity", s.fillOpacity || 0.2)
            .attr("d", area);
        }

        const line = d3.line<any>()
          .x(getX)
          .y((d: any) => y(Number(d[yKey])))
          .curve(curve);

        g.append("path")
          .datum(data)
          .attr("fill", "none")
          .attr("stroke", color)
          .attr("stroke-width", strokeWidth)
          .attr("stroke-linecap", "round")
          .attr("d", line);

        // Dots for line
        if (s.marker !== false) {
          g.selectAll(`.dot-${index}`)
            .data(data)
            .enter().append("circle")
            .attr("class", `dot-${index}`)
            .attr("cx", getX)
            .attr("cy", (d: any) => y(Number(d[yKey])))
            .attr("r", s.markerSize || 4)
            .attr("fill", isDark ? "#0f172a" : "#ffffff")
            .attr("stroke", color)
            .attr("stroke-width", 2);
        }
      } else if (type === 'scatter' || type === 'bubble') {
        const getX = (d: any) => {
          if (isNumericX) return x(Number(d[xKey]));
          return (x(String(d[xKey])) || 0) + x.bandwidth() / 2;
        };

        const sizeKey = s.sizeKey;
        const rScale = type === 'bubble' && sizeKey
          ? d3.scaleLinear()
              .domain([0, d3.max(data, (d: any) => Number(d[sizeKey])) || 10])
              .range([2, 20])
          : null;

        g.selectAll(`.scatter-${index}`)
          .data(data)
          .enter().append("circle")
          .attr("class", `scatter-${index}`)
          .attr("cx", getX)
          .attr("cy", (d: any) => y(Number(d[yKey])))
          .attr("r", (d: any) => rScale ? rScale(Number(d[sizeKey])) : 5)
          .attr("fill", color)
          .attr("fill-opacity", 0.7)
          .attr("stroke", color)
          .attr("stroke-width", 1);
      } else if (type === 'heatmap') {
        const xKey = s.xKey;
        const yKey = s.yKey;
        const colorKey = s.colorKey || s.yKey;

        const xValues = Array.from(new Set(data.map((d: any) => String(d[xKey]))));
        const yValues = Array.from(new Set(data.map((d: any) => String(d[yKey]))));

        const hX = d3.scaleBand()
          .domain(xValues)
          .range([0, width])
          .padding(0.05);

        const hY = d3.scaleBand()
          .domain(yValues)
          .range([height, 0])
          .padding(0.05);

        const colorScale = d3.scaleSequential()
          .interpolator(s.interpolator === 'viridis' ? d3.interpolateViridis : 
                       s.interpolator === 'magma' ? d3.interpolateMagma :
                       s.interpolator === 'inferno' ? d3.interpolateInferno :
                       d3.interpolateBlues)
          .domain([0, d3.max(data, (d: any) => Number(d[colorKey])) || 10]);

        // Re-render axes for heatmap if it's the first series
        if (index === 0) {
          xAxis.call(d3.axisBottom(hX));
          yAxis.call(d3.axisLeft(hY));
          
          // Remove grid lines for heatmap as they look messy
          g.selectAll(".grid").remove();
        }

        g.selectAll(`.rect-${index}`)
          .data(data)
          .enter().append("rect")
          .attr("class", `rect-${index}`)
          .attr("x", (d: any) => hX(String(d[xKey])) || 0)
          .attr("y", (d: any) => hY(String(d[yKey])) || 0)
          .attr("width", hX.bandwidth())
          .attr("height", hY.bandwidth())
          .attr("fill", (d: any) => colorScale(Number(d[colorKey])))
          .attr("rx", 2);
      } else if (type === 'histogram') {
        // For histogram, we assume the AI has already binned the data
        // We just render it as bars with no padding
        const hX = d3.scaleBand()
          .domain(data.map((d: any) => String(d[xKey])))
          .range([0, width])
          .padding(0.01); // Minimal padding for histogram look

        if (index === 0) {
          xAxis.call(d3.axisBottom(hX));
        }

        g.selectAll(`.hist-${index}`)
          .data(data)
          .enter().append("rect")
          .attr("class", `hist hist-${index}`)
          .attr("x", (d: any) => hX(String(d[xKey])) || 0)
          .attr("y", (d: any) => y(Number(d[yKey])))
          .attr("width", hX.bandwidth())
          .attr("height", (d: any) => height - y(Number(d[yKey])))
          .attr("fill", color)
          .attr("fill-opacity", opacity);
      } else if (type === 'pie' || type === 'donut') {
        // Pie charts need a different coordinate system
        // We only support one pie chart per widget for now
        if (index === 0) {
          g.remove();
          const pieG = svg.append("g")
            .attr("transform", `translate(${dimensions.width / 2},${dimensions.height / 2})`);

          const radius = Math.min(width, height) / 2;
          const pie = d3.pie<any>().value((d: any) => Number(d[yKey]));
          const arc = d3.arc<any>()
            .innerRadius(type === 'donut' ? radius * 0.6 : 0)
            .outerRadius(radius);

          const arcs = pieG.selectAll(".arc")
            .data(pie(data))
            .enter().append("g")
            .attr("class", "arc");

          arcs.append("path")
            .attr("d", arc)
            .attr("fill", (d, i) => defaultColors[i % defaultColors.length])
            .attr("stroke", isDark ? "#0f172a" : "#ffffff")
            .attr("stroke-width", 2);
        }
      }
    });

  }, [dimensions, options, theme]);

  return (
    <div ref={containerRef} className="w-full h-full flex items-center justify-center">
      <svg 
        ref={svgRef} 
        width={dimensions.width} 
        height={dimensions.height}
        className="overflow-visible"
      />
    </div>
  );
}
