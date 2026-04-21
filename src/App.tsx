/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  Upload, 
  Heart, 
  Star, 
  Circle, 
  Square,
  Triangle,
  Hexagon,
  Pentagon,
  Info, 
  HelpCircle, 
  Columns2, 
  Rows2, 
  Trash2, 
  Plus,
  Move,
  Download,
  RotateCcw,
  Link,
  Link2Off,
  Copy,
  Check,
  Share2
} from 'lucide-react';

// --- Types ---

type ShapeType = 'heart' | 'heart_bubble' | 'star' | 'star_bubble' | 'circle' | 'square' | 'triangle' | 'exclamation' | 'question' | 'custom';
type LayoutType = 'horizontal' | 'vertical';
type PanelOrder = 'image-first' | 'punch-first';

interface PunchShape {
  id: string;
  type: ShapeType;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  size: number; // px
  rotation: number;
}

// --- Constants & Helpers ---

const SHAPE_ICONS: Record<ShapeType, React.ReactNode> = {
  heart: <Heart className="w-5 h-5" />,
  heart_bubble: <div className="relative"><Heart className="w-5 h-5" /><div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full" /></div>,
  star: <Star className="w-5 h-5" />,
  star_bubble: <div className="relative"><Star className="w-5 h-5" /><div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full" /></div>,
  circle: <Circle className="w-5 h-5" />,
  square: <Square className="w-5 h-5" />,
  triangle: <Triangle className="w-5 h-5" />,
  exclamation: <Info className="w-5 h-5" />,
  question: <HelpCircle className="w-5 h-5" />,
  custom: <span className="text-xs font-bold">ABC</span>,
};

// SVG paths for the shapes (standardized 24x24 viewbox)
const SVG_PATHS: Record<ShapeType, string> = {
  heart: "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z",
  heart_bubble: "M12,21.35 C12,21.35 2,14.5 2,8.5 C2,4.5 5.5,2 8.5,2 C10.5,2 11.5,3 12,4 C12.5,3 13.5,2 15.5,2 C18.5,2 22,4.5 22,8.5 C22,14.5 12,21.35 12,21.35 Z",
  star: "M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z",
  star_bubble: "M12,2 Q13,2 14,5 L15,8 Q15.5,9 18,9.5 L21,10 Q22,10.2 21,11 L18,13.5 Q17,14.5 17.5,17 L18.5,20 Q18.8,21.5 17.5,21 L14,19 Q12,18 10,19 L6.5,21 Q5.2,21.5 5.5,20 L6.5,17 Q7,14.5 6,13.5 L3,11 Q2,10.2 3,10 L6,9.5 Q8.5,9 9,8 L10,5 Q11,2 12,2 Z",
  circle: "M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2z",
  square: "M3 3h18v18H3z",
  triangle: "M12 2L2 22h20z",
  exclamation: "M10 3h4v12h-4zM10 18h4v4h-4z",
  question: "M12 2c-3.86 0-7 3.14-7 7h3c0-2.21 1.79-4 4-4s4 1.79 4 4c0 2-3 1.75-3 5h3c0-2.25 3-2.5 3-5 0-3.86-3.14-7-7-7zm-1.5 17h3v3h-3v-3z",
  custom: "",
};

export default function App() {
  const [image, setImage] = useState<string | null>(null);
  const [shapes, setShapes] = useState<PunchShape[]>([]);
  const [punchColor, setPunchColor] = useState('#eab308'); // Default yellow-500
  const [bgColor, setBgColor] = useState('#eab308'); // Default linked
  const [isColorLinked, setIsColorLinked] = useState(true);
  const [selectedShapeType, setSelectedShapeType] = useState<ShapeType>('star');
  const [shapeSize, setShapeSize] = useState(60);
  const [layout, setLayout] = useState<LayoutType>('horizontal');
  const [panelOrder, setPanelOrder] = useState<PanelOrder>('image-first');
  const [dispersion, setDispersion] = useState<'narrow' | 'medium' | 'wide'>('medium');

  const [shapeCount, setShapeCount] = useState(12);
  const [isEditMode, setIsEditMode] = useState(false);
  const [customEmoji, setCustomEmoji] = useState('✨');
  const [isCopying, setIsCopying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const draggingId = useRef<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const panelARef = useRef<HTMLDivElement>(null);
  const panelBRef = useRef<HTMLDivElement>(null);
  const [panelASize, setPanelASize] = useState({ width: 0, height: 0 });
  const [panelBSize, setPanelBSize] = useState({ width: 0, height: 0 });

  // Update shape count while maintaining existing shapes
  useEffect(() => {
    if (shapes.length === 0 && image) {
      generateInitialShapes();
      return;
    }
    
    if (shapeCount > shapes.length) {
      const additionalCount = shapeCount - shapes.length;
      const newShapes: PunchShape[] = Array.from({ length: additionalCount }, () => ({
        id: Math.random().toString(36).substr(2, 9),
        type: selectedShapeType,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: shapeSize,
        rotation: Math.random() * 360,
      }));
      setShapes([...shapes, ...newShapes]);
    } else if (shapeCount < shapes.length) {
      setShapes(shapes.slice(0, shapeCount));
    }
  }, [shapeCount]);

  // Update all shapes when global settings change
  useEffect(() => {
    setShapes(prev => prev.map(s => ({
      ...s,
      type: selectedShapeType,
      size: shapeSize
    })));
  }, [selectedShapeType, shapeSize]);

  // Update panel sizes using ResizeObserver
  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === panelARef.current) {
          setPanelASize({ width: entry.contentRect.width, height: entry.contentRect.height });
        } else if (entry.target === panelBRef.current) {
          setPanelBSize({ width: entry.contentRect.width, height: entry.contentRect.height });
        }
      }
    });

    if (panelARef.current) observer.observe(panelARef.current);
    if (panelBRef.current) observer.observe(panelBRef.current);

    return () => observer.disconnect();
  }, [image, layout]);

  const generateInitialShapes = useCallback(() => {
    const newShapes: PunchShape[] = [];
    const cols = Math.ceil(Math.sqrt(shapeCount));
    const rows = Math.ceil(shapeCount / cols);
    const cellW = 100 / cols;
    const cellH = 100 / rows;
    const spreadFactor = dispersion === 'narrow' ? 0.3 : dispersion === 'medium' ? 0.6 : 0.9;
    
    for (let i = 0; i < shapeCount; i++) {
      const r = Math.floor(i / cols);
      const c = i % cols;
      
      // Center of the cell
      const centerX = (c + 0.5) * cellW;
      const centerY = (r + 0.5) * cellH;
      
      // Jitter within the cell based on dispersion
      const jitterX = (Math.random() - 0.5) * cellW * spreadFactor;
      const jitterY = (Math.random() - 0.5) * cellH * spreadFactor;

      newShapes.push({
        id: Math.random().toString(36).substr(2, 9),
        type: selectedShapeType,
        x: centerX + jitterX,
        y: centerY + jitterY,
        size: shapeSize,
        rotation: Math.random() * 360,
      });
    }
    setShapes(newShapes);
  }, [selectedShapeType, shapeSize, dispersion, shapeCount]);

  const [imageAspectRatio, setImageAspectRatio] = useState(1);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Revoke old URL if exists
      if (image && image.startsWith('blob:')) {
        URL.revokeObjectURL(image);
      }

      // Use URL.createObjectURL for better mobile performance
      const objectUrl = URL.createObjectURL(file);
      setImage(objectUrl);
      
      // Get aspect ratio
      const img = new Image();
      img.onload = () => {
        setImageAspectRatio(img.width / img.height);
        generateInitialShapes();
      };
      img.src = objectUrl;
    }
  };

  const addShape = () => {
    const newShape: PunchShape = {
      id: Math.random().toString(36).substr(2, 9),
      type: selectedShapeType,
      x: 50,
      y: 50,
      size: shapeSize,
      rotation: 0,
    };
    setShapes([...shapes, newShape]);
  };

  const updateShapePos = (id: string, x: number, y: number) => {
    setShapes(prev => prev.map(s => s.id === id ? { ...s, x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) } : s));
  };

  const handlePanelMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isEditMode || !draggingId.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    updateShapePos(draggingId.current, x, y);
  };

  const handlePanelTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isEditMode || !draggingId.current) return;
    e.preventDefault();
    const touch = e.touches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((touch.clientX - rect.left) / rect.width) * 100;
    const y = ((touch.clientY - rect.top) / rect.height) * 100;
    updateShapePos(draggingId.current, x, y);
  };

  const stopDrag = () => { draggingId.current = null; };

  const resetShapes = () => {
    generateInitialShapes();
  };

  const exportImage = async (mode: 'download' | 'clipboard') => {
    if (!image || !panelARef.current || !panelBRef.current) return;
    
    if (mode === 'download') setIsSaving(true);
    else setIsCopying(true);

    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const gap = 0;
      const isVert = layout === 'vertical';
      
      // Calculate total dimensions
      const totalW = isVert ? (panelASize.width + panelBSize.width + gap) : Math.max(panelASize.width, panelBSize.width);
      const totalH = isVert ? Math.max(panelASize.height, panelBSize.height) : (panelASize.height + panelBSize.height + gap);

      canvas.width = totalW;
      canvas.height = totalH;

      // Fill background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, totalW, totalH);

      // Helper to draw a panel
      const drawPanel = async (ref: HTMLElement, x: number, y: number, w: number, h: number, isPunch: boolean) => {
        const imgObj = new Image();
        imgObj.crossOrigin = "anonymous";
        await new Promise((resolve) => {
          imgObj.onload = resolve;
          imgObj.src = image;
        });

        ctx.save();
        ctx.translate(x, y);
        
        if (!isPunch) {
          // Draw original image
          ctx.drawImage(imgObj, 0, 0, w, h);
          // Draw shapes on top
          shapes.forEach(s => {
            ctx.save();
            ctx.translate((s.x / 100) * w, (s.y / 100) * h);
            ctx.rotate((s.rotation * Math.PI) / 180);
            ctx.fillStyle = punchColor;
            const path = new Path2D(SVG_PATHS[s.type]);
            const scale = s.size / 24;
            ctx.scale(scale, scale);
            ctx.translate(-12, -12);
            if (s.type === 'custom') {
              ctx.font = '18px sans-serif';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(customEmoji, 12, 13);
            } else {
              ctx.fill(path);
            }
            ctx.restore();
          });
        } else {
          // Draw punch background
          ctx.fillStyle = bgColor;
          ctx.fillRect(0, 0, w, h);
          // Draw punched holes
          shapes.forEach(s => {
            ctx.save();
            ctx.translate((s.x / 100) * w, (s.y / 100) * h);
            ctx.rotate((s.rotation * Math.PI) / 180);
            
            const scale = s.size / 24;
            ctx.scale(scale, scale);
            ctx.translate(-12, -12);
            
            const path = new Path2D(SVG_PATHS[s.type]);
            ctx.clip(path);
            
            // Draw image inside clip
            const imgScaleW = w / s.size;
            const imgScaleH = h / s.size;
            ctx.drawImage(
              imgObj, 
              -(s.x / 100) * w * (24 / s.size) + 12, 
              -(s.y / 100) * h * (24 / s.size) + 12, 
              w * (24 / s.size), 
              h * (24 / s.size)
            );
            ctx.restore();
          });
        }
        ctx.restore();
      };

      const order = panelOrder === 'image-first';
      const firstX = 0;
      const firstY = 0;
      const secondX = isVert ? (panelASize.width + gap) : 0;
      const secondY = isVert ? 0 : (panelASize.height + gap);

      if (order) {
        await drawPanel(panelARef.current, firstX, firstY, panelASize.width, panelASize.height, false);
        await drawPanel(panelBRef.current, secondX, secondY, panelBSize.width, panelBSize.height, true);
      } else {
        await drawPanel(panelBRef.current, firstX, firstY, panelBSize.width, panelBSize.height, true);
        await drawPanel(panelARef.current, secondX, secondY, panelASize.width, panelASize.height, false);
      }

      if (mode === 'download') {
        const link = document.createElement('a');
        link.download = `punch-image-${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      } else {
        canvas.toBlob(async (blob) => {
          if (blob) {
            try {
              await navigator.clipboard.write([
                new ClipboardItem({ 'image/png': blob })
              ]);
            } catch (err) {
              console.error('Clipboard failed', err);
              // Fallback for some browsers
              const dataUrl = canvas.toDataURL('image/png');
              const img = document.createElement('img');
              img.src = dataUrl;
              const win = window.open();
              win?.document.write(img.outerHTML);
            }
          }
        });
      }
    } catch (err) {
      console.error('Export failed', err);
    } finally {
      setTimeout(() => {
        setIsSaving(false);
        setIsCopying(false);
      }, 1500);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] font-sans text-slate-900 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden">
      {/* Sidebar / Controls */}
      <div className="w-full md:w-80 bg-white border-b md:border-b-0 md:border-r border-slate-200 p-6 flex flex-col gap-8 md:overflow-y-auto md:max-h-screen shadow-sm z-20 order-2 md:order-1">
        <header className="flex flex-col gap-1">
          <h1 className="text-xl font-black tracking-tighter text-slate-900 leading-none">
            PUNCHING IMAGE <br />
            <span className="text-teal-500">MAKER</span>
          </h1>
          <div className="flex items-center gap-1.5">
            <Star className="w-3 h-3 fill-teal-400 text-teal-400" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">by MJ</span>
          </div>
        </header>

        {/* Image Upload */}
        <section className="space-y-3">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500">원본 이미지</label>
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="w-full aspect-video border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-blue-400 hover:bg-blue-50 transition-all group overflow-hidden"
          >
            {image ? (
              <img src={image} alt="Preview" className="w-full h-full object-cover" />
            ) : (
              <>
                <Upload className="w-8 h-8 text-slate-300 group-hover:text-blue-500 transition-colors" />
                <span className="text-sm font-medium text-slate-400 group-hover:text-blue-600">이미지 첨부</span>
              </>
            )}
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImageUpload} 
            accept="image/*" 
            className="hidden" 
          />
        </section>

        {/* Shape Selection */}
        <section className="space-y-3">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500">펀칭 도형</label>
          <div className="grid grid-cols-5 gap-2">
            {(Object.keys(SHAPE_ICONS) as ShapeType[]).map((type) => (
              <button
                key={type}
                onClick={() => setSelectedShapeType(type)}
                className={`p-3 rounded-lg flex items-center justify-center transition-all ${
                  selectedShapeType === type 
                    ? 'bg-slate-900 text-white shadow-lg scale-105' 
                    : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                }`}
              >
                {type === 'custom' ? (customEmoji || '입력') : SHAPE_ICONS[type]}
              </button>
            ))}
          </div>

          {selectedShapeType === 'custom' && (
            <div className="mt-2 animate-in fade-in slide-in-from-top-1">
              <input 
                type="text"
                value={customEmoji}
                onChange={(e) => setCustomEmoji(e.target.value.slice(0, 2))}
                placeholder="이모지 입력"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <p className="text-[10px] text-slate-400 mt-1">원하는 이모지나 글자를 입력하세요 (최대 2자)</p>
            </div>
          )}
        </section>

        {/* Color Settings */}
        <section className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                펀칭 색상 <span>{punchColor}</span>
              </label>
              <button 
                onClick={() => setIsColorLinked(!isColorLinked)}
                className={`p-1 rounded transition-colors ${isColorLinked ? 'text-blue-600 bg-blue-50' : 'text-slate-400'}`}
                title="색상 동기화"
              >
                {isColorLinked ? <Link className="w-3 h-3" /> : <Link2Off className="w-3 h-3" />}
              </button>
            </div>
            <div className="flex gap-2">
              <input 
                type="color" 
                value={punchColor} 
                onChange={(e) => {
                  const val = e.target.value;
                  setPunchColor(val);
                  if (isColorLinked) setBgColor(val);
                }}
                className="w-10 h-10 rounded-lg cursor-pointer border-none p-0 overflow-hidden"
              />
              <input 
                type="text" 
                value={punchColor} 
                onChange={(e) => {
                  const val = e.target.value;
                  setPunchColor(val);
                  if (isColorLinked) setBgColor(val);
                }}
                placeholder="#000000"
                className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex justify-between">
              배경 색상 <span>{bgColor}</span>
            </label>
            <div className="flex gap-2">
              <input 
                type="color" 
                value={bgColor} 
                onChange={(e) => {
                  const val = e.target.value;
                  setBgColor(val);
                  if (isColorLinked) setPunchColor(val);
                }}
                className="w-10 h-10 rounded-lg cursor-pointer border-none p-0 overflow-hidden"
              />
              <input 
                type="text" 
                value={bgColor} 
                onChange={(e) => {
                  const val = e.target.value;
                  setBgColor(val);
                  if (isColorLinked) setPunchColor(val);
                }}
                placeholder="#FFFFFF"
                className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
        </section>

        {/* Size, Count & Dispersion */}
        <section className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex justify-between">
              도형 크기 <span>{shapeSize}px</span>
            </label>
            <input 
              type="range" 
              min="10" 
              max="100" 
              value={shapeSize} 
              onChange={(e) => setShapeSize(parseInt(e.target.value))}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex justify-between">
              도형 개수 <span>{shapeCount}개</span>
            </label>
            <input 
              type="range" 
              min="1" 
              max="100" 
              value={shapeCount} 
              onChange={(e) => setShapeCount(parseInt(e.target.value))}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">분산 정도</label>
            <div className="flex bg-slate-50 p-1 rounded-xl">
              {(['narrow', 'medium', 'wide'] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setDispersion(d)}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                    dispersion === d ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {d === 'narrow' ? '좁음' : d === 'medium' ? '중간' : '넓음'}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Layout Settings */}
        <section className="space-y-3">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500">레이아웃</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setLayout('horizontal')}
              className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all ${
                layout === 'horizontal' ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-slate-100 text-slate-400'
              }`}
            >
              <Rows2 className="w-4 h-4" />
              <span className="text-xs font-bold">가로형</span>
            </button>
            <button
              onClick={() => setLayout('vertical')}
              className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all ${
                layout === 'vertical' ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-slate-100 text-slate-400'
              }`}
            >
              <Columns2 className="w-4 h-4" />
              <span className="text-xs font-bold">세로형</span>
            </button>
          </div>
          
          <div className="flex bg-slate-50 p-1 rounded-xl mt-2">
            <button
              onClick={() => setPanelOrder('image-first')}
              className={`flex-1 py-2 text-[10px] font-bold rounded-lg transition-all ${
                panelOrder === 'image-first' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'
              }`}
            >
              이미지 먼저
            </button>
            <button
              onClick={() => setPanelOrder('punch-first')}
              className={`flex-1 py-2 text-[10px] font-bold rounded-lg transition-all ${
                panelOrder === 'punch-first' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'
              }`}
            >
              펀칭 먼저
            </button>
          </div>
        </section>

        {/* Actions */}
        <div className="pt-4 space-y-2">
          <button 
            onClick={() => setIsEditMode(!isEditMode)}
            className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 ${
              isEditMode 
                ? 'bg-green-600 text-white shadow-lg shadow-green-200' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Move className="w-4 h-4" />
            {isEditMode ? '✅ 수기 조정 중' : '✋ 수기 조정 모드'}
          </button>
          <button 
            onClick={resetShapes}
            className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-800 transition-all active:scale-95"
          >
            <RotateCcw className="w-4 h-4" />
            🎲 도형 생성
          </button>
          <button 
            onClick={addShape}
            className="w-full py-3 border-2 border-slate-900 text-slate-900 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-50 transition-all"
          >
            <Plus className="w-4 h-4" />
            도형 추가
          </button>
        </div>
      </div>

      {/* Main Preview Area */}
      <main className="flex-1 bg-slate-100 p-4 md:p-8 flex items-center justify-center relative min-h-[400px] md:min-h-0 order-1 md:order-2">
        {!image ? (
          <div className="text-center space-y-4 animate-pulse">
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto shadow-xl">
              <Upload className="w-10 h-10 text-slate-200" />
            </div>
            <p className="text-slate-400 font-medium">이미지를 업로드하여 시작하세요</p>
          </div>
        ) : (
          <div 
            style={{ 
              aspectRatio: layout === 'vertical' ? `${imageAspectRatio * 2}` : `${imageAspectRatio / 2}`,
              maxHeight: '70vh',
              maxWidth: '100%'
            }}
            className={`bg-white shadow-2xl rounded-2xl overflow-hidden flex ${
              layout === 'vertical' ? 'flex-row' : 'flex-col'
            }`}
          >
            {/* Panel A: Original Image + Colored Shapes */}
            <div
              ref={panelARef}
              className={`relative overflow-hidden flex-1 ${
                panelOrder === 'punch-first' ? 'order-2' : 'order-1'
              }`}
              onMouseMove={handlePanelMouseMove}
              onMouseUp={stopDrag}
              onMouseLeave={stopDrag}
              onTouchMove={handlePanelTouchMove}
              onTouchEnd={stopDrag}
            >
              <img src={image} className="w-full h-full object-cover select-none pointer-events-none" alt="Original" />
              <div className="absolute inset-0">
                {shapes.map(shape => (
                  <div
                    key={shape.id}
                    onMouseDown={() => { if (isEditMode) draggingId.current = shape.id; }}
                    onTouchStart={() => { if (isEditMode) draggingId.current = shape.id; }}
                    style={{
                      position: 'absolute',
                      left: `${shape.x}%`,
                      top: `${shape.y}%`,
                      width: shape.size,
                      height: shape.size,
                      transform: `translate(-50%, -50%) rotate(${shape.rotation}deg)`,
                      cursor: isEditMode ? 'grab' : 'default',
                      zIndex: 10,
                      userSelect: 'none',
                    }}
                  >
                    <svg viewBox="0 0 24 24" width="100%" height="100%" style={{ fill: punchColor }}>
                      {shape.type === 'custom' ? (
                        <text
                          x="12" y="13"
                          fontSize="18"
                          textAnchor="middle"
                          dominantBaseline="middle"
                          className="select-none"
                        >
                          {customEmoji}
                        </text>
                      ) : (
                        <path d={SVG_PATHS[shape.type]} />
                      )}
                    </svg>
                  </div>
                ))}
              </div>
            </div>
            {/* Panel B: Punched Background */}
            <div
              ref={panelBRef}
              className={`relative overflow-hidden flex-1 ${
                panelOrder === 'punch-first' ? 'order-1' : 'order-2'
              }`}
              style={{ backgroundColor: bgColor }}
              onMouseMove={handlePanelMouseMove}
              onMouseUp={stopDrag}
              onMouseLeave={stopDrag}
              onTouchMove={handlePanelTouchMove}
              onTouchEnd={stopDrag}
            >
              <div className="absolute inset-0">
                {shapes.map(shape => (
                  <div
                    key={shape.id}
                    onMouseDown={() => { if (isEditMode) draggingId.current = shape.id; }}
                    onTouchStart={() => { if (isEditMode) draggingId.current = shape.id; }}
                    style={{
                      position: 'absolute',
                      left: `${shape.x}%`,
                      top: `${shape.y}%`,
                      width: shape.size,
                      height: shape.size,
                      transform: `translate(-50%, -50%) rotate(${shape.rotation}deg)`,
                      cursor: isEditMode ? 'grab' : 'default',
                      zIndex: 10,
                      userSelect: 'none',
                    }}
                  >
                    <svg width="100%" height="100%" viewBox="0 0 24 24" style={{ overflow: 'visible' }}>
                      <defs>
                        <clipPath id={`clip-${shape.id}`}>
                          {shape.type === 'custom' ? (
                            <text 
                              x="12" y="13" 
                              fontSize="18" 
                              textAnchor="middle" 
                              dominantBaseline="middle"
                            >
                              {customEmoji}
                            </text>
                          ) : (
                            <path d={SVG_PATHS[shape.type]} />
                          )}
                        </clipPath>
                      </defs>
                      {image && (
                        <image
                          href={image}
                          x={12 - (shape.x / 100) * (panelBSize.width / shape.size * 24)}
                          y={12 - (shape.y / 100) * (panelBSize.height / shape.size * 24)}
                          width={(panelBSize.width / shape.size) * 24}
                          height={(panelBSize.height / shape.size) * 24}
                          clipPath={`url(#clip-${shape.id})`}
                          preserveAspectRatio="xMidYMid slice"
                        />
                      )}
                    </svg>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Floating Toolbar */}
        {image && (
          <div className="absolute bottom-6 md:bottom-12 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-md border border-slate-200 shadow-2xl rounded-2xl p-1 md:p-2 flex gap-0.5 md:gap-1 z-30 w-[95%] md:w-auto justify-center">
            <button 
              onClick={() => exportImage('download')}
              disabled={isSaving}
              className="p-2 md:p-3 hover:bg-slate-100 rounded-xl transition-all text-slate-600 flex items-center gap-1 md:gap-2 active:scale-95 disabled:opacity-50"
            >
              {isSaving ? <Check className="w-4 h-4 md:w-5 md:h-5 text-green-500" /> : <Download className="w-4 h-4 md:w-5 md:h-5" />}
              <span className="text-[10px] md:text-xs font-bold">{isSaving ? '저장됨' : '저장'}</span>
            </button>
            <div className="w-px h-6 md:h-8 bg-slate-200 my-auto mx-0.5 md:mx-1" />
            <button 
              onClick={() => exportImage('clipboard')}
              disabled={isCopying}
              className="p-2 md:p-3 hover:bg-slate-100 rounded-xl transition-all text-slate-600 flex items-center gap-1 md:gap-2 active:scale-95 disabled:opacity-50"
            >
              {isCopying ? <Check className="w-4 h-4 md:w-5 md:h-5 text-green-500" /> : <Copy className="w-4 h-4 md:w-5 md:h-5" />}
              <span className="text-[10px] md:text-xs font-bold">{isCopying ? '복사됨' : '복사'}</span>
            </button>
            <div className="w-px h-6 md:h-8 bg-slate-200 my-auto mx-0.5 md:mx-1" />
            <button 
              onClick={() => setShapes([])}
              className="p-2 md:p-3 hover:bg-red-50 rounded-xl transition-all text-red-500 flex items-center gap-1 md:gap-2 active:scale-95"
            >
              <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
              <span className="text-[10px] md:text-xs font-bold">삭제</span>
            </button>
          </div>
        )}
      </main>

      {/* Mobile Hint */}
      <div className="md:hidden fixed top-4 right-4 z-50">
        <div className="bg-slate-900 text-white p-2 rounded-full shadow-lg">
          <Move className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}
