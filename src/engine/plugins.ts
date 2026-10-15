export interface Plugin {
  id: string;
  name: string;
  npm: string | null;          // exact package name e.g. "motion"
  description: string;         // one line
  importExample: string;       // e.g. "import { motion } from 'motion/react'"
  categories: string[];
  free: true;
}

export const PLUGIN_REGISTRY: Plugin[] = [
  // Animation
  { id: "motion", name: "Motion", npm: "motion", description: "Production animation library, tiny and fast", importExample: "import { motion } from 'motion/react'", categories: ["animation", "ui"], free: true },
  { id: "auto-animate", name: "AutoAnimate", npm: "@formkit/auto-animate", description: "Zero-config animation for list changes", importExample: "import autoAnimate from '@formkit/auto-animate'", categories: ["animation"], free: true },

  // Charts & Data
  { id: "recharts", name: "Recharts", npm: "recharts", description: "Composable chart library built on D3", importExample: "import { LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts'", categories: ["charts", "data"], free: true },

  // Maps
  { id: "leaflet", name: "Leaflet", npm: "leaflet", description: "Mobile-friendly interactive maps", importExample: "import L from 'leaflet'", categories: ["maps"], free: true },
  { id: "react-leaflet", name: "React Leaflet", npm: "react-leaflet", description: "React components for Leaflet maps", importExample: "import { MapContainer, TileLayer, Marker } from 'react-leaflet'", categories: ["maps"], free: true },

  // Rich Text
  { id: "tiptap", name: "Tiptap", npm: "@tiptap/react", description: "Headless rich text editor framework", importExample: "import { useEditor, EditorContent } from '@tiptap/react'", categories: ["editor", "text"], free: true },

  // Code Highlight
  { id: "shiki", name: "Shiki", npm: "shiki", description: "Beautiful syntax highlighter based on TextMate grammars", importExample: "import { codeToHtml } from 'shiki'", categories: ["code"], free: true },

  // Drag & Drop
  { id: "dnd-kit", name: "dnd kit", npm: "@dnd-kit/core", description: "Modern, lightweight drag and drop toolkit for React", importExample: "import { DndContext, useDraggable, useDroppable } from '@dnd-kit/core'", categories: ["ui", "drag-drop"], free: true },

  // 3D & WebGL
  { id: "three", name: "Three.js", npm: "three", description: "JavaScript 3D library", importExample: "import * as THREE from 'three'", categories: ["3d", "graphics"], free: true },
  { id: "r3f", name: "React Three Fiber", npm: "@react-three/fiber", description: "React renderer for Three.js", importExample: "import { Canvas, useFrame } from '@react-three/fiber'", categories: ["3d", "graphics"], free: true },
  { id: "drei", name: "Drei", npm: "@react-three/drei", description: "Useful helpers for React Three Fiber", importExample: "import { OrbitControls, Text, Float } from '@react-three/drei'", categories: ["3d", "graphics"], free: true },

  // Physics
  { id: "matter-js", name: "Matter.js", npm: "matter-js", description: "2D rigid body physics engine for the web", importExample: "import Matter from 'matter-js'", categories: ["physics", "game"], free: true },

  // Audio
  { id: "howler", name: "Howler.js", npm: "howler", description: "Audio library for the modern web", importExample: "import { Howl, Howler } from 'howler'", categories: ["audio", "media"], free: true },

  // PDF
  { id: "react-pdf", name: "React-PDF", npm: "@react-pdf/renderer", description: "Create PDF files on the browser and server", importExample: "import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'", categories: ["pdf", "documents"], free: true },

  // QR Codes
  { id: "qrcode-react", name: "QRCode.react", npm: "qrcode.react", description: "React component for generating QR codes", importExample: "import { QRCodeSVG } from 'qrcode.react'", categories: ["utilities", "qr"], free: true },

  // Markdown
  { id: "react-markdown", name: "React Markdown", npm: "react-markdown", description: "Markdown component for React using remark", importExample: "import ReactMarkdown from 'react-markdown'", categories: ["markdown", "text"], free: true },

  // Forms & Validation
  { id: "react-hook-form", name: "React Hook Form", npm: "react-hook-form", description: "Performant, flexible and extensible forms", importExample: "import { useForm } from 'react-hook-form'", categories: ["forms"], free: true },
  { id: "zod", name: "Zod", npm: "zod", description: "TypeScript-first schema validation with static type inference", importExample: "import { z } from 'zod'", categories: ["validation", "forms"], free: true },

  // Date Handling
  { id: "date-fns", name: "date-fns", npm: "date-fns", description: "Modern JavaScript date utility library", importExample: "import { format, addDays } from 'date-fns'", categories: ["dates", "utilities"], free: true },

  // Virtualized Lists
  { id: "react-window", name: "React Window", npm: "react-window", description: "Efficiently render large lists and tabular data", importExample: "import { FixedSizeList as List } from 'react-window'", categories: ["performance", "ui"], free: true },

  // State Management
  { id: "zustand", name: "Zustand", npm: "zustand", description: "Small, fast and scalable bear-necessities state management", importExample: "import { create } from 'zustand'", categories: ["state"], free: true },

  // Color Pickers
  { id: "react-colorful", name: "React Colorful", npm: "react-colorful", description: "Tiny, fast, and accessible color picker component", importExample: "import { HexColorPicker } from 'react-colorful'", categories: ["ui", "color"], free: true },

  // Canvas
  { id: "konva", name: "Konva / React Konva", npm: "react-konva", description: "2D canvas framework for desktop and mobile", importExample: "import { Stage, Layer, Rect, Circle } from 'react-konva'", categories: ["canvas", "graphics"], free: true },

  // Confetti
  { id: "canvas-confetti", name: "Canvas Confetti", npm: "canvas-confetti", description: "Performant confetti animation library", importExample: "import confetti from 'canvas-confetti'", categories: ["animation", "effects"], free: true }
];
