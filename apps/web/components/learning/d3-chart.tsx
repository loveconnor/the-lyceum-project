"use client";

import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { useTheme } from "next-themes";

// Math function evaluator - safely evaluates mathematical expressions
const evaluateMathFunction = (
  expression: string,
  x: number,
  parameters: Record<string, number> = {},
): number | null => {
  try {
    // Create safe math context
    const mathContext = {
      x,
      t: x, // Allow 't' as an alias for 'x' (time based functions)
      T: x,
      time: x,
      ...parameters, // Include custom parameters (a, v0, etc.)
      Math,
      sin: Math.sin,
      cos: Math.cos,
      tan: Math.tan,
      asin: Math.asin,
      acos: Math.acos,
      atan: Math.atan,
      sinh: Math.sinh,
      cosh: Math.cosh,
      tanh: Math.tanh,
      exp: Math.exp,
      log: Math.log,
      ln: Math.log,
      log10: Math.log10,
      sqrt: Math.sqrt,
      abs: Math.abs,
      floor: Math.floor,
      ceil: Math.ceil,
      round: Math.round,
      pow: Math.pow,
      PI: Math.PI,
      E: Math.E,
    };

    // Replace common math notation with JavaScript equivalents
    let jsExpression = expression
      .replace(/\^/g, "**") // x^2 -> x**2
      .replace(/π/g, "PI") // π -> PI
      .replace(/√/g, "sqrt") // √ -> sqrt
      .replace(/(\d+)([a-zA-Z])/g, "$1*$2") // 2x -> 2*x
      .replace(/\)(\d+)/g, ")*$1") // )(2 -> )*(2
      .replace(/(\d+)\(/g, "$1*("); // 2( -> 2*(

    // Create function with safe context
    const fn = new Function(
      ...Object.keys(mathContext),
      `return ${jsExpression}`,
    );
    const result = fn(...Object.values(mathContext));

    return typeof result === "number" && isFinite(result) ? result : null;
  } catch (error) {
    console.warn("Error evaluating math function:", error);
    return null;
  }
};

// Generate data points from a mathematical function
const generateFunctionData = (
  expression: string,
  xMin: number,
  xMax: number,
  numPoints: number = 200,
  parameters: Record<string, number> = {},
): Array<{ x: number; y: number }> => {
  const data: Array<{ x: number; y: number }> = [];
  const step = (xMax - xMin) / (numPoints - 1);

  for (let i = 0; i < numPoints; i++) {
    const x = xMin + i * step;
    const y = evaluateMathFunction(expression, x, parameters);
    if (y !== null) {
      data.push({ x, y });
    }
  }

  return data;
};

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
        height: typeof height === "number" ? height : h || 350,
      });
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, [height]);

  useEffect(() => {
    if (
      !svgRef.current ||
      dimensions.width === 0 ||
      dimensions.height === 0 ||
      !options
    )
      return;

    let { data, series } = options;
    if (!series || series.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 30, right: 30, bottom: 50, left: 60 };
    const width = dimensions.width - margin.left - margin.right;
    const height = dimensions.height - margin.top - margin.bottom;

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const isDark = theme === "dark";
    const textColor = isDark ? "#94a3b8" : "#64748b";
    const gridColor = isDark ? "#1e293b" : "#f1f5f9";

    // Colors
    const defaultColors = isDark
      ? ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"]
      : ["#2563eb", "#059669", "#d97706", "#dc2626", "#7c3aed"];

    // Check if we have function-type series and generate data
    const hasFunctionSeries = series.some((s: any) => s.type === "function");
    if (hasFunctionSeries) {
      // For function series, generate data points
      const firstFunctionSeries = series.find(
        (s: any) => s.type === "function",
      );
      const xMin = firstFunctionSeries.xMin ?? -10;
      const xMax = firstFunctionSeries.xMax ?? 10;
      const numPoints = firstFunctionSeries.numPoints ?? 200;
      const parameters = options.parameters || {}; // Extract parameters from options

      // Generate combined data from all function series
      const functionData = generateFunctionData(
        firstFunctionSeries.function || "x",
        xMin,
        xMax,
        numPoints,
        parameters,
      );

      // Use generated data if no data was provided
      if (!data || data.length === 0) {
        data = functionData;
      }
    }

    if (!data || data.length === 0) return;

    // Determine X scale type based on the first series
    const firstSeries = series[0];
    const xKey =
      firstSeries.xKey ||
      (firstSeries.type === "function" ? "x" : firstSeries.xKey);
    const isNumericX =
      data.length > 0 &&
      data.every(
        (d: any) => !isNaN(Number(d[xKey])) && typeof d[xKey] !== "boolean",
      );

    let x: any;
    if (isNumericX && firstSeries.type !== "bar") {
      const xExtent = d3.extent(data, (d: any) => Number(d[xKey])) as [
        number,
        number,
      ];
      x = d3
        .scaleLinear()
        .domain([xExtent[0], xExtent[1]])
        .nice()
        .range([0, width]);
    } else {
      x = d3
        .scaleBand()
        .domain(data.map((d: any) => String(d[xKey])))
        .range([0, width])
        .padding(0.3);
    }

    // Determine Y scale - handle both positive and negative values for function plots
    const allYValues: number[] = series
      .flatMap((s: any) => {
        if (s.type === "function") {
          return data.map((d: any) => Number(d["y"]));
        }
        return data.map((d: any) => Number(d[s.yKey]));
      })
      .filter((v: number) => isFinite(v));

    const yMinValue = d3.min(allYValues);
    const yMaxValue = d3.max(allYValues);
    const yMin: number =
      typeof yMinValue === "number" && isFinite(yMinValue) ? yMinValue : 0;
    const yMax: number =
      typeof yMaxValue === "number" && isFinite(yMaxValue) ? yMaxValue : 10;
    const yPadding: number = (yMax - yMin) * 0.1;

    const y = d3
      .scaleLinear()
      .domain([yMin - yPadding, yMax + yPadding])
      .nice()
      .range([height, 0]);

    // Grid lines
    const yGrid = g
      .append("g")
      .attr("class", "grid grid-y")
      .attr("stroke-opacity", 0.1)
      .call(
        d3
          .axisLeft(y)
          .tickSize(-width)
          .tickFormat(() => ""),
      )
      .call((g) => g.select(".domain").remove())
      .selectAll("line")
      .attr("stroke", gridColor);

    // Add X grid lines for better readability
    g.append("g")
      .attr("class", "grid grid-x")
      .attr("stroke-opacity", 0.1)
      .attr("transform", `translate(0,${height})`)
      .call(
        d3
          .axisBottom(x)
          .tickSize(-height)
          .tickFormat(() => ""),
      )
      .call((g) => g.select(".domain").remove())
      .selectAll("line")
      .attr("stroke", gridColor);

    // Axes
    const xAxis = g
      .append("g")
      .attr("transform", `translate(0,${height})`)
      .call(
        isNumericX && firstSeries.type !== "bar"
          ? d3.axisBottom(x)
          : d3.axisBottom(x),
      );

    xAxis
      .selectAll("text")
      .attr("fill", textColor)
      .attr("font-size", "12px")
      .attr("transform", data.length > 10 ? "rotate(-45)" : "rotate(0)")
      .style("text-anchor", data.length > 10 ? "end" : "middle");

    xAxis.select(".domain").attr("stroke", gridColor);
    xAxis.selectAll("line").attr("stroke", gridColor);

    const yAxis = g.append("g").call(d3.axisLeft(y).ticks(5));

    yAxis.selectAll("text").attr("fill", textColor).attr("font-size", "12px");

    yAxis.select(".domain").attr("stroke", gridColor);
    yAxis.selectAll("line").attr("stroke", gridColor);

    // Render each series
    series.forEach((s: any, index: number) => {
      const type = s.type || "bar";
      const yKey = s.yKey;
      const color =
        s.fill || s.stroke || defaultColors[index % defaultColors.length];
      const strokeWidth = s.strokeWidth || 3;
      const opacity = s.fillOpacity || s.opacity || 0.7;

      const curveMap: Record<string, any> = {
        basis: d3.curveBasis,
        bundle: d3.curveBundle,
        cardinal: d3.curveCardinal,
        "catmull-rom": d3.curveCatmullRom,
        linear: d3.curveLinear,
        "monotone-x": d3.curveMonotoneX,
        "monotone-y": d3.curveMonotoneY,
        natural: d3.curveNatural,
        step: d3.curveStep,
        "step-after": d3.curveStepAfter,
        "step-before": d3.curveStepBefore,
      };
      const curve = curveMap[s.curve] || d3.curveMonotoneX;

      if (type === "bar") {
        g.selectAll(`.bar-${index}`)
          .data(data)
          .enter()
          .append("rect")
          .attr("class", `bar bar-${index}`)
          .attr("x", (d: any) => x(String(d[xKey])) || 0)
          .attr("y", (d: any) => y(Number(d[yKey])))
          .attr("width", x.bandwidth())
          .attr("height", (d: any) => height - y(Number(d[yKey])))
          .attr("fill", color)
          .attr("fill-opacity", opacity)
          .attr("rx", 4);
      } else if (type === "line" || type === "area") {
        const getX = (d: any) => {
          if (isNumericX && type !== "bar") return x(Number(d[xKey]));
          return (x(String(d[xKey])) || 0) + x.bandwidth() / 2;
        };

        if (type === "area") {
          const area = d3
            .area<any>()
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

        const line = d3
          .line<any>()
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
            .enter()
            .append("circle")
            .attr("class", `dot-${index}`)
            .attr("cx", getX)
            .attr("cy", (d: any) => y(Number(d[yKey])))
            .attr("r", s.markerSize || 4)
            .attr("fill", isDark ? "#0f172a" : "#ffffff")
            .attr("stroke", color)
            .attr("stroke-width", 2);
        }
      } else if (type === "function") {
        // Mathematical function plot
        const functionExpression = s.function || "x";
        const xMin = s.xMin ?? -10;
        const xMax = s.xMax ?? 10;
        const numPoints = s.numPoints ?? 200;

        // Generate function data
        const functionData = generateFunctionData(
          functionExpression,
          xMin,
          xMax,
          numPoints,
        );

        // Add zero line for reference (x-axis)
        if (s.showZeroLine !== false) {
          g.append("line")
            .attr("x1", x(xMin))
            .attr("x2", x(xMax))
            .attr("y1", y(0))
            .attr("y2", y(0))
            .attr("stroke", textColor)
            .attr("stroke-width", 1)
            .attr("stroke-dasharray", "3,3")
            .attr("opacity", 0.3);
        }

        // Plot the function curve
        const line = d3
          .line<any>()
          .x((d: any) => x(d.x))
          .y((d: any) => y(d.y))
          .curve(d3.curveMonotoneX);

        g.append("path")
          .datum(functionData)
          .attr("fill", "none")
          .attr("stroke", color)
          .attr("stroke-width", strokeWidth)
          .attr("stroke-linecap", "round")
          .attr("d", line);

        // Add dots at key points if requested
        if (s.showPoints) {
          const pointsToShow = s.pointsToShow || 20;
          const step = Math.floor(functionData.length / pointsToShow);
          g.selectAll(`.dot-${index}`)
            .data(functionData.filter((_: any, i: number) => i % step === 0))
            .enter()
            .append("circle")
            .attr("class", `dot-${index}`)
            .attr("cx", (d: any) => x(d.x))
            .attr("cy", (d: any) => y(d.y))
            .attr("r", s.markerSize || 3)
            .attr("fill", color)
            .attr("stroke", isDark ? "#0f172a" : "#ffffff")
            .attr("stroke-width", 1.5);
        }

        // Add function label if provided
        if (s.label) {
          g.append("text")
            .attr("x", x(xMax) - 10)
            .attr("y", y(functionData[functionData.length - 1]?.y || 0) - 10)
            .attr("fill", color)
            .attr("font-size", "12px")
            .attr("font-weight", "600")
            .attr("text-anchor", "end")
            .text(s.label);
        }
      } else if (type === "scatter" || type === "bubble") {
        const getX = (d: any) => {
          if (isNumericX) return x(Number(d[xKey]));
          return (x(String(d[xKey])) || 0) + x.bandwidth() / 2;
        };

        const sizeKey = s.sizeKey;
        const rScale =
          type === "bubble" && sizeKey
            ? d3
                .scaleLinear()
                .domain([0, d3.max(data, (d: any) => Number(d[sizeKey])) || 10])
                .range([2, 20])
            : null;

        g.selectAll(`.scatter-${index}`)
          .data(data)
          .enter()
          .append("circle")
          .attr("class", `scatter-${index}`)
          .attr("cx", getX)
          .attr("cy", (d: any) => y(Number(d[yKey])))
          .attr("r", (d: any) => (rScale ? rScale(Number(d[sizeKey])) : 5))
          .attr("fill", color)
          .attr("fill-opacity", 0.7)
          .attr("stroke", color)
          .attr("stroke-width", 1);
      } else if (type === "heatmap") {
        const xKey = s.xKey;
        const yKey = s.yKey;
        const colorKey = s.colorKey || s.yKey;

        const xValues: string[] = Array.from(
          new Set(data.map((d: any) => String(d[xKey]))),
        );
        const yValues: string[] = Array.from(
          new Set(data.map((d: any) => String(d[yKey]))),
        );

        const hX = d3
          .scaleBand()
          .domain(xValues)
          .range([0, width])
          .padding(0.05);

        const hY = d3
          .scaleBand()
          .domain(yValues)
          .range([height, 0])
          .padding(0.05);

        const colorScale = d3
          .scaleSequential()
          .interpolator(
            s.interpolator === "viridis"
              ? d3.interpolateViridis
              : s.interpolator === "magma"
                ? d3.interpolateMagma
                : s.interpolator === "inferno"
                  ? d3.interpolateInferno
                  : d3.interpolateBlues,
          )
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
          .enter()
          .append("rect")
          .attr("class", `rect-${index}`)
          .attr("x", (d: any) => hX(String(d[xKey])) || 0)
          .attr("y", (d: any) => hY(String(d[yKey])) || 0)
          .attr("width", hX.bandwidth())
          .attr("height", hY.bandwidth())
          .attr("fill", (d: any) => colorScale(Number(d[colorKey])))
          .attr("rx", 2);
      } else if (type === "histogram") {
        // For histogram, we assume the AI has already binned the data
        // We just render it as bars with no padding
        const hX = d3
          .scaleBand()
          .domain(data.map((d: any) => String(d[xKey])))
          .range([0, width])
          .padding(0.01); // Minimal padding for histogram look

        if (index === 0) {
          xAxis.call(d3.axisBottom(hX));
        }

        g.selectAll(`.hist-${index}`)
          .data(data)
          .enter()
          .append("rect")
          .attr("class", `hist hist-${index}`)
          .attr("x", (d: any) => hX(String(d[xKey])) || 0)
          .attr("y", (d: any) => y(Number(d[yKey])))
          .attr("width", hX.bandwidth())
          .attr("height", (d: any) => height - y(Number(d[yKey])))
          .attr("fill", color)
          .attr("fill-opacity", opacity);
      } else if (type === "pie" || type === "donut") {
        // Pie charts need a different coordinate system
        // We only support one pie chart per widget for now
        if (index === 0) {
          g.remove();
          const pieG = svg
            .append("g")
            .attr(
              "transform",
              `translate(${dimensions.width / 2},${dimensions.height / 2})`,
            );

          const radius = Math.min(width, height) / 2;
          const pie = d3.pie<any>().value((d: any) => Number(d[yKey]));
          const arc = d3
            .arc<any>()
            .innerRadius(type === "donut" ? radius * 0.6 : 0)
            .outerRadius(radius);

          const arcs = pieG
            .selectAll(".arc")
            .data(pie(data))
            .enter()
            .append("g")
            .attr("class", "arc");

          arcs
            .append("path")
            .attr("d", arc)
            .attr(
              "fill",
              (d, i) => defaultColors[i % defaultColors.length] || "#64748b",
            )
            .attr("stroke", isDark ? "#0f172a" : "#ffffff")
            .attr("stroke-width", 2);
        }
      }
    });
  }, [dimensions, options, theme]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full flex items-center justify-center"
    >
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        className="overflow-visible"
      />
    </div>
  );
}
