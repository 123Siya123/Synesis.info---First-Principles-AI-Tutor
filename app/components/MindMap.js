'use client';

import { useMemo, useState, useRef, useEffect } from 'react';
import styles from './MindMap.module.css';

export default function MindMap({ data, onNodeClick, currentNodeId, baseColor = 'blue', isInverse = false }) {
    const { nodes, edges } = data;

    // Pan & Zoom state
    const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
    const [manualOffsets, setManualOffsets] = useState({}); // { nodeId: { x, y } }
    const [isPanning, setIsPanning] = useState(false);
    const [dragNodeId, setDragNodeId] = useState(null);
    const lastMousePos = useRef({ x: 0, y: 0 });
    const hasMoved = useRef(false);
    const containerRef = useRef(null);

    // Fundamental Colors HSL Map
    const colorMap = {
        red: 0,
        blue: 220,
        yellow: 60,
        pink: 330,
        green: 120,
        cyan: 180,
        orange: 30,
        purple: 270,
        white: 'white',
        black: 'black'
    };

    const isGrayscale = baseColor === 'white' || baseColor === 'black';

    // Auto-layout logic (BFS Tree)
    const basePositions = useMemo(() => {
        const positions = {};
        if (typeof window === 'undefined' || nodes.length === 0) return positions;

        const width = window.innerWidth;
        const height = window.innerHeight - 80;
        const centerX = width / 2;
        const centerY = height / 2;

        const root = nodes.find(n => n.level === 0) || nodes[0];
        positions[root.id] = { x: centerX, y: centerY, angle: 0, wedge: 2 * Math.PI };

        const queue = [root.id];
        const visited = new Set([root.id]);

        while (queue.length > 0) {
            const parentId = queue.shift();
            const parentPos = positions[parentId];

            const children = edges
                .filter(e => e.source === parentId)
                .map(e => e.target)
                .filter(id => !visited.has(id));

            if (children.length > 0) {
                const wedgePerChild = parentPos.wedge / Math.max(children.length, 1);
                const startAngle = parentPos.angle - parentPos.wedge / 2;

                // Dynamic radius calculation to prevent overlap
                // Base radius increases with number of children and level
                const parentNode = nodes.find(n => n.id === parentId);
                const parentLevel = parentNode ? parentNode.level : 0;

                // Calculate minimum spacing needed based on node sizes
                const nodeSize = Math.max(30, 80 - (parentLevel + 1) * 15);
                const minSpacing = nodeSize * 1.8; // Tighter spacing - just enough to prevent overlap

                // Calculate required radius based on arc length needed for all children
                // Arc length = radius * angle, so radius = arc_length / angle
                const totalArcNeeded = children.length * minSpacing;
                const radiusFromSpacing = totalArcNeeded / parentPos.wedge;

                // Base radius increases with depth to spread out the tree
                const baseRadius = 160 + (parentLevel * 40);

                // Use the larger of the two, but cap maximum radius to prevent excessive sprawl
                const calculatedRadius = Math.max(baseRadius, radiusFromSpacing);
                const radius = Math.min(calculatedRadius, 350); // Cap at 350px to keep it manageable

                children.forEach((childId, index) => {
                    const angle = startAngle + (index + 0.5) * wedgePerChild;
                    positions[childId] = {
                        x: parentPos.x + radius * Math.cos(angle),
                        y: parentPos.y + radius * Math.sin(angle),
                        angle: angle,
                        wedge: wedgePerChild
                    };
                    visited.add(childId);
                    queue.push(childId);
                });
            }
        }

        nodes.forEach(node => {
            if (!positions[node.id]) positions[node.id] = { x: centerX, y: centerY };
        });

        return positions;
    }, [nodes, edges]);

    // Final positions combining auto-layout and manual drags
    const finalPositions = useMemo(() => {
        const pos = {};
        Object.keys(basePositions).forEach(id => {
            const offset = manualOffsets[id] || { x: 0, y: 0 };
            pos[id] = {
                x: basePositions[id].x + offset.x,
                y: basePositions[id].y + offset.y
            };
        });
        return pos;
    }, [basePositions, manualOffsets]);

    // Handlers for Pan & Zoom
    const handleWheel = (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        setTransform(prev => ({
            ...prev,
            scale: Math.min(Math.max(prev.scale * delta, 0.2), 3)
        }));
    };

    const handleMouseDown = (e) => {
        if (e.button === 0) { // Left click
            const target = e.target.closest(`.${styles.nodeWrapper}`);
            if (target) {
                const id = target.getAttribute('data-id');
                setDragNodeId(id);
            } else {
                setIsPanning(true);
            }
            lastMousePos.current = { x: e.clientX, y: e.clientY };
            hasMoved.current = false;
        }
    };

    const handleMouseMove = (e) => {
        const dx = (e.clientX - lastMousePos.current.x) / transform.scale;
        const dy = (e.clientY - lastMousePos.current.y) / transform.scale;

        if (isPanning) {
            setTransform(prev => ({
                ...prev,
                x: prev.x + dx * transform.scale,
                y: prev.y + dy * transform.scale
            }));
        } else if (dragNodeId) {
            setManualOffsets(prev => ({
                ...prev,
                [dragNodeId]: {
                    x: (prev[dragNodeId]?.x || 0) + dx,
                    y: (prev[dragNodeId]?.y || 0) + dy
                }
            }));
        }
        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
            hasMoved.current = true;
        }
        lastMousePos.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
        setIsPanning(false);
        setDragNodeId(null);
    };

    const handleOrganize = () => {
        setManualOffsets({});
        setTransform({ x: 0, y: 0, scale: 1 });
    };

    const getNodeStyle = (level, id) => {
        const size = Math.max(30, 80 - level * 15);
        const fontSize = Math.max(0.6, 1 - level * 0.1) + 'rem';
        const isActive = id === currentNodeId;

        const hueValue = isGrayscale ? 0 : (colorMap[baseColor] !== undefined ? colorMap[baseColor] : 220);
        let lightness, darkerLightness;

        if (baseColor === 'black') {
            // Darkest (black) to lighter shades of gray
            const baseLightness = isInverse ? 40 : 10;
            const levelStep = isInverse ? -10 : 10;
            lightness = Math.max(0, Math.min(100, baseLightness + level * levelStep));
        } else if (baseColor === 'white') {
            // Lightest (white) to darker shades of gray
            const baseLightness = isInverse ? 60 : 95;
            const levelStep = isInverse ? 10 : -10;
            lightness = Math.max(0, Math.min(100, baseLightness + level * levelStep));
        } else {
            // Normal color: Level 0 is base, Level 1+ changes lightness
            const baseLightness = isInverse ? 80 : 30;
            const levelStep = isInverse ? -15 : 15;
            lightness = Math.max(10, Math.min(95, baseLightness + level * levelStep));
        }

        const saturation = isGrayscale ? 0 : 70;
        const color = `hsl(${hueValue}, ${saturation}%, ${lightness}%)`;
        const subtleGradient = `radial-gradient(circle at 30% 30%, hsl(${hueValue}, ${saturation}%, ${lightness + 10}%) 0%, ${color} 100%)`;

        return {
            width: `${size}px`,
            height: `${size}px`,
            fontSize: fontSize,
            background: subtleGradient,
            borderRadius: '50%',
            border: isActive ? '3px solid #fff' : 'none',
            boxShadow: isActive ? '0 0 20px rgba(255,255,255,0.9)' : '0 4px 15px rgba(0,0,0,0.4)',
            cursor: dragNodeId ? 'grabbing' : 'grab',
            left: finalPositions[id].x,
            top: finalPositions[id].y,
            transform: 'translate(-50%, -50%)',
            transition: dragNodeId ? 'none' : 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
        };
    };

    return (
        <div
            className={`${styles.mindMapContainer} ${isPanning ? styles.panning : ''}`}
            ref={containerRef}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
        >
            <div className={styles.controlsLayer}>
                <button onClick={handleOrganize} className={styles.controlBtn} title="Organize Mind Map">
                    🪄 Organize
                </button>
            </div>

            <div
                className={styles.transformLayer}
                style={{
                    transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
                    transition: isPanning ? 'none' : 'transform 0.1s ease-out'
                }}
            >
                <svg className={styles.svgOverlay} width="4000" height="4000" style={{ transform: 'translate(-2000px, -2000px)' }}>
                    {edges.map((edge, index) => {
                        const start = finalPositions[edge.source];
                        const end = finalPositions[edge.target];
                        if (!start || !end) return null;
                        return (
                            <line
                                key={index}
                                x1={start.x + 2000} y1={start.y + 2000}
                                x2={end.x + 2000} y2={end.y + 2000}
                                className={styles.edge}
                            />
                        );
                    })}
                </svg>

                <div className={styles.nodesOverlay}>
                    {nodes.map(node => (
                        <div
                            key={node.id}
                            data-id={node.id}
                            style={finalPositions[node.id] ? getNodeStyle(node.level, node.id) : {}}
                            onClick={(e) => {
                                if (!hasMoved.current) {
                                    onNodeClick(node);
                                }
                            }}
                            className={styles.nodeWrapper}
                        >
                            {node.level === 0 && <span className={styles.nodeLabelInner}>{node.label}</span>}
                            {node.level > 0 && <div className={styles.nodeLabelOuter}>{node.label}</div>}
                            <div className={styles.tooltip}>{node.description}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
