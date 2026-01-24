'use client';

import { useRef, useState, useEffect } from 'react';
import styles from './DrawingCanvas.module.css';
import { Pen, Eraser, Trash2, Check, X, Undo } from 'lucide-react';

export default function DrawingCanvas({ onClose, onSave }) {
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [color, setColor] = useState('#000000');
    const [brushSize, setBrushSize] = useState(3);
    const [tool, setTool] = useState('pen'); // pen, eraser

    // For Undo
    const [history, setHistory] = useState([]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Set canvas size
        canvas.width = 800;
        canvas.height = 500;

        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        saveState(); // Save initial blank state
    }, []);

    const saveState = () => {
        const canvas = canvasRef.current;
        if (canvas) {
            setHistory(prev => [...prev.slice(-10), canvas.toDataURL()]); // Keep last 10 states
        }
    };

    const startDrawing = (e) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX || e.touches[0].clientX) - rect.left;
        const y = (e.clientY || e.touches[0].clientY) - rect.top;

        ctx.beginPath();
        ctx.moveTo(x, y);

        ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
        ctx.lineWidth = tool === 'eraser' ? 20 : brushSize;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        setIsDrawing(true);
    };

    const draw = (e) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX || e.touches[0].clientX) - rect.left;
        const y = (e.clientY || e.touches[0].clientY) - rect.top;

        ctx.lineTo(x, y);
        ctx.stroke();
    };

    const stopDrawing = () => {
        if (isDrawing) {
            setIsDrawing(false);
            saveState();
        }
    };

    const handleClear = () => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        saveState();
    };

    const handleUndo = () => {
        if (history.length <= 1) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const newHistory = [...history];
        newHistory.pop(); // Remove current state
        const previousState = newHistory[newHistory.length - 1];

        const img = new Image();
        img.src = previousState;
        img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
            setHistory(newHistory);
        };
    };

    const handleSave = () => {
        const canvas = canvasRef.current;
        onSave(canvas.toDataURL('image/png'));
        onClose();
    };

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <div className={styles.toolbar}>
                    <div className={styles.tools}>
                        <button
                            className={`${styles.toolBtn} ${tool === 'pen' ? styles.activeTool : ''}`}
                            onClick={() => setTool('pen')}
                            title="Pen"
                        >
                            <Pen size={20} />
                        </button>
                        <button
                            className={`${styles.toolBtn} ${tool === 'eraser' ? styles.activeTool : ''}`}
                            onClick={() => setTool('eraser')}
                            title="Eraser"
                        >
                            <Eraser size={20} />
                        </button>
                        <input
                            type="color"
                            value={color}
                            onChange={(e) => { setColor(e.target.value); setTool('pen'); }}
                            className={styles.colorPicker}
                            title="Color"
                        />
                        <input
                            type="range"
                            min="1"
                            max="20"
                            value={brushSize}
                            onChange={(e) => setBrushSize(parseInt(e.target.value))}
                            style={{ width: '80px' }}
                            title="Brush Size"
                        />
                        <button className={styles.toolBtn} onClick={handleUndo} title="Undo">
                            <Undo size={20} />
                        </button>
                        <button className={styles.toolBtn} onClick={handleClear} title="Clear All">
                            <Trash2 size={20} />
                        </button>
                    </div>
                    <div className={styles.actions}>
                        <button className={styles.secondaryBtn} onClick={onClose}>Cancel</button>
                        <button className={styles.primaryBtn} onClick={handleSave}>
                            Save Drawing
                        </button>
                    </div>
                </div>

                <div className={styles.canvasContainer}>
                    <canvas
                        ref={canvasRef}
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={startDrawing}
                        onTouchMove={draw}
                        onTouchEnd={stopDrawing}
                        style={{ width: '800px', height: '500px' }}
                    />
                </div>
            </div>
        </div>
    );
}
