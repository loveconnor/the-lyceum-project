"use client";

import React, { useEffect, useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, Text, Line } from '@react-three/drei';
import { useTheme } from 'next-themes';
import * as THREE from 'three';

// Math function evaluator - safely evaluates mathematical expressions
const evaluateMathFunction = (expression: string, x: number, z?: number): number | null => {
  try {
    // Create safe math context
    const mathContext = {
      x,
      z: z ?? 0,
      y: 0, // placeholder
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
      .replace(/\^/g, '**')
      .replace(/π/g, 'PI')
      .replace(/√/g, 'sqrt')
      .replace(/(\d+)([a-zA-Z])/g, '$1*$2')
      .replace(/\)(\d+)/g, ')*$1')
      .replace(/(\d+)\(/g, '$1*(');

    const fn = new Function(...Object.keys(mathContext), `return ${jsExpression}`);
    const result = fn(...Object.values(mathContext));
    
    return typeof result === 'number' && isFinite(result) ? result : null;
  } catch (error) {
    console.warn('Error evaluating math function:', error);
    return null;
  }
};

// Generate 3D surface data from a mathematical function
const generateSurfaceData = (
  expression: string,
  xMin: number,
  xMax: number,
  zMin: number,
  zMax: number,
  resolution: number = 50
): THREE.Vector3[] => {
  const points: THREE.Vector3[] = [];
  const xStep = (xMax - xMin) / (resolution - 1);
  const zStep = (zMax - zMin) / (resolution - 1);
  
  for (let i = 0; i < resolution; i++) {
    for (let j = 0; j < resolution; j++) {
      const x = xMin + i * xStep;
      const z = zMin + j * zStep;
      const y = evaluateMathFunction(expression, x, z);
      if (y !== null) {
        points.push(new THREE.Vector3(x, y, z));
      }
    }
  }
  
  return points;
};

// Generate 3D curve data from a parametric function
const generateCurveData = (
  xExpr: string,
  yExpr: string,
  zExpr: string,
  tMin: number,
  tMax: number,
  numPoints: number = 200
): THREE.Vector3[] => {
  const points: THREE.Vector3[] = [];
  const step = (tMax - tMin) / (numPoints - 1);
  
  for (let i = 0; i < numPoints; i++) {
    const t = tMin + i * step;
    const x = evaluateMathFunction(xExpr.replace(/t/g, 'x'), t);
    const y = evaluateMathFunction(yExpr.replace(/t/g, 'x'), t);
    const z = evaluateMathFunction(zExpr.replace(/t/g, 'x'), t);
    
    if (x !== null && y !== null && z !== null) {
      points.push(new THREE.Vector3(x, y, z));
    }
  }
  
  return points;
};

// Surface mesh component
function SurfaceMesh({ 
  expression, 
  xMin, 
  xMax, 
  zMin, 
  zMax, 
  resolution, 
  color,
  wireframe = false,
  opacity = 0.8
}: {
  expression: string;
  xMin: number;
  xMax: number;
  zMin: number;
  zMax: number;
  resolution: number;
  color: string;
  wireframe?: boolean;
  opacity?: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const xStep = (xMax - xMin) / (resolution - 1);
    const zStep = (zMax - zMin) / (resolution - 1);
    
    const vertices: number[] = [];
    const indices: number[] = [];
    const colors: number[] = [];
    
    // Generate vertices
    for (let i = 0; i < resolution; i++) {
      for (let j = 0; j < resolution; j++) {
        const x = xMin + i * xStep;
        const z = zMin + j * zStep;
        const y = evaluateMathFunction(expression, x, z) || 0;
        vertices.push(x, y, z);
        
        // Color based on height
        const colorObj = new THREE.Color(color);
        colors.push(colorObj.r, colorObj.g, colorObj.b);
      }
    }
    
    // Generate indices for triangles
    for (let i = 0; i < resolution - 1; i++) {
      for (let j = 0; j < resolution - 1; j++) {
        const a = i * resolution + j;
        const b = i * resolution + (j + 1);
        const c = (i + 1) * resolution + j;
        const d = (i + 1) * resolution + (j + 1);
        
        indices.push(a, b, d);
        indices.push(a, d, c);
      }
    }
    
    geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    
    return geo;
  }, [expression, xMin, xMax, zMin, zMax, resolution, color]);

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshStandardMaterial
        color={color}
        wireframe={wireframe}
        transparent={!wireframe}
        opacity={wireframe ? 1 : opacity}
        side={THREE.DoubleSide}
        vertexColors={wireframe}
      />
    </mesh>
  );
}

// 3D Curve component
function Curve3D({ 
  points, 
  color, 
  lineWidth = 3 
}: { 
  points: THREE.Vector3[]; 
  color: string; 
  lineWidth?: number;
}) {
  return (
    <Line
      points={points}
      color={color}
      lineWidth={lineWidth}
    />
  );
}

// Scatter plot component
function ScatterPlot({ 
  data, 
  xKey = 'x', 
  yKey = 'y', 
  zKey = 'z',
  color,
  size = 0.1
}: {
  data: any[];
  xKey?: string;
  yKey?: string;
  zKey?: string;
  color: string;
  size?: number;
}) {
  return (
    <group>
      {data.map((point, i) => {
        const x = Number(point[xKey]);
        const y = Number(point[yKey]);
        const z = Number(point[zKey]);
        
        if (isFinite(x) && isFinite(y) && isFinite(z)) {
          return (
            <mesh key={i} position={[x, y, z]}>
              <sphereGeometry args={[size, 16, 16]} />
              <meshStandardMaterial color={color} />
            </mesh>
          );
        }
        return null;
      })}
    </group>
  );
}

// Axes component
function Axes({ 
  xMin, 
  xMax, 
  yMin, 
  yMax, 
  zMin, 
  zMax,
  textColor 
}: {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  zMin: number;
  zMax: number;
  textColor: string;
}) {
  const axisColor = textColor;
  const axisWidth = 2;

  return (
    <group>
      {/* X Axis */}
      <Line
        points={[[xMin, 0, 0], [xMax, 0, 0]]}
        color={axisColor}
        lineWidth={axisWidth}
      />
      <Text
        position={[xMax + 0.5, 0, 0]}
        fontSize={0.5}
        color={axisColor}
      >
        X
      </Text>

      {/* Y Axis */}
      <Line
        points={[[0, yMin, 0], [0, yMax, 0]]}
        color={axisColor}
        lineWidth={axisWidth}
      />
      <Text
        position={[0, yMax + 0.5, 0]}
        fontSize={0.5}
        color={axisColor}
      >
        Y
      </Text>

      {/* Z Axis */}
      <Line
        points={[[0, 0, zMin], [0, 0, zMax]]}
        color={axisColor}
        lineWidth={axisWidth}
      />
      <Text
        position={[0, 0, zMax + 0.5]}
        fontSize={0.5}
        color={axisColor}
      >
        Z
      </Text>
    </group>
  );
}

// Main Scene component
function Scene({ 
  options, 
  isDark 
}: { 
  options: any; 
  isDark: boolean;
}) {
  const { data, series } = options;
  
  const defaultColors = isDark 
    ? ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"]
    : ["#2563eb", "#059669", "#d97706", "#dc2626", "#7c3aed"];

  const textColor = isDark ? "#94a3b8" : "#64748b";

  // Calculate bounds
  const bounds = useMemo(() => {
    let xMin = -10, xMax = 10;
    let yMin = -10, yMax = 10;
    let zMin = -10, zMax = 10;

    series?.forEach((s: any) => {
      if (s.type === 'surface' || s.type === 'function3d') {
        xMin = Math.min(xMin, s.xMin ?? -10);
        xMax = Math.max(xMax, s.xMax ?? 10);
        zMin = Math.min(zMin, s.zMin ?? -10);
        zMax = Math.max(zMax, s.zMax ?? 10);
      }
    });

    return { xMin, xMax, yMin, yMax, zMin, zMax };
  }, [series]);

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} />
      
      <Grid
        args={[bounds.xMax - bounds.xMin, bounds.zMax - bounds.zMin]}
        cellSize={1}
        cellThickness={0.5}
        cellColor={isDark ? '#374151' : '#e5e7eb'}
        sectionSize={5}
        sectionThickness={1}
        sectionColor={isDark ? '#4b5563' : '#d1d5db'}
        fadeDistance={100}
        fadeStrength={1}
        followCamera={false}
        position={[0, bounds.yMin, 0]}
      />

      <Axes {...bounds} textColor={textColor} />

      {series?.map((s: any, index: number) => {
        const type = s.type || 'surface';
        const color = s.color || s.fill || s.stroke || defaultColors[index % defaultColors.length];
        
        if (type === 'surface' || type === 'function3d') {
          const expression = s.function || s.expression || 'sin(sqrt(x^2 + z^2))';
          const xMin = s.xMin ?? -10;
          const xMax = s.xMax ?? 10;
          const zMin = s.zMin ?? -10;
          const zMax = s.zMax ?? 10;
          const resolution = s.resolution ?? 50;
          const wireframe = s.wireframe ?? false;
          const opacity = s.opacity ?? 0.8;

          return (
            <SurfaceMesh
              key={index}
              expression={expression}
              xMin={xMin}
              xMax={xMax}
              zMin={zMin}
              zMax={zMax}
              resolution={resolution}
              color={color}
              wireframe={wireframe}
              opacity={opacity}
            />
          );
        } else if (type === 'curve3d' || type === 'parametric') {
          const xExpr = s.x || s.xFunction || 't';
          const yExpr = s.y || s.yFunction || 'sin(t)';
          const zExpr = s.z || s.zFunction || 'cos(t)';
          const tMin = s.tMin ?? 0;
          const tMax = s.tMax ?? 2 * Math.PI;
          const numPoints = s.numPoints ?? 200;
          
          const points = generateCurveData(xExpr, yExpr, zExpr, tMin, tMax, numPoints);
          
          return (
            <Curve3D
              key={index}
              points={points}
              color={color}
              lineWidth={s.lineWidth || 3}
            />
          );
        } else if (type === 'scatter3d' && data) {
          return (
            <ScatterPlot
              key={index}
              data={data}
              xKey={s.xKey || 'x'}
              yKey={s.yKey || 'y'}
              zKey={s.zKey || 'z'}
              color={color}
              size={s.size || 0.1}
            />
          );
        }
        
        return null;
      })}
    </>
  );
}

interface Chart3DProps {
  options: any;
  height: string | number;
}

export function Chart3D({ options, height }: Chart3DProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  if (!options || !options.series || options.series.length === 0) {
    return (
      <div className="flex items-center justify-center w-full h-full bg-muted/30 rounded-lg">
        <p className="text-muted-foreground">No 3D data to display</p>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height }}>
      <Canvas
        camera={{ position: [15, 15, 15], fov: 50 }}
        style={{ background: isDark ? '#0f172a' : '#ffffff' }}
      >
        <Scene options={options} isDark={isDark} />
        <OrbitControls 
          enableDamping
          dampingFactor={0.05}
          rotateSpeed={0.5}
          zoomSpeed={0.5}
        />
      </Canvas>
    </div>
  );
}

