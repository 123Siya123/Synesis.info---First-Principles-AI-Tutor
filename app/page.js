'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import styles from './page.module.css';
import MindMap from './components/MindMap';
import * as pdfjs from 'pdfjs-dist';
import mammoth from 'mammoth';
import { supabase } from './lib/supabaseClient';
import Sidebar from './components/Sidebar';
import AuthModal from './components/AuthModal';
import AccountView from './components/AccountView';
import SubscriptionModal from './components/SubscriptionModal';
import { Menu, User as UserIcon, PenTool } from 'lucide-react';


pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

const GROQ_API_KEY = process.env.NEXT_PUBLIC_GROQ_API_KEY;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Exact prompt as specified
const ARTICLE_GENERATION_PROMPT = `when i ask you something ie. "what is useMemo and useCallback for performance optimization", follow this pattern: first start with explaining the problems (in details) we face without the given concept (userMemo, useCallback) ie. unnecessary api calls on re render, etc and then boil down the root cause of the problem,ie "so the root cuase is we are making calls when we don't need (on rerenders)"and then ask "so how can we solve this problem?" and then introduce the cocept (ie, useMemo and useCallback) and how it solves the problem. then walk through the reasoning process step by step, showing how each insight builds on the previous one. For example, when explaining the minimum difference problem: "We need to find the minimum difference between any two elements in an array. When is this difference smallest? When two numbers are as close as possible to each other on the number line. How can we easily identify adjacent numbers? By arranging all elements in order. What's the most efficient way to arrange elements? By sorting the array. Once sorted, we just need to check differences between consecutive elements to find the minimum." Please apply this cause-and-effect reasoning to any problem I ask about. Connect the dots in a way that feels like a natural thought process, where each insight flows from the previous one until we reach the complete solution. and emphasize more on "why" aspect keep the format of whole chat based on first priciple thinking: where we ask the natural, human like question that leads to the other piece and so on. this we we reach the truth why following the human curiosity. ie. so what we used to use before these hooks? okay, so what were the problems in those methods? what is the root cause/s of the problem/s? how does [hooks (or the given)] concept fix it?. ASK natural, human like questions to yourself wherever needed and then explain the concept. ANSWER LIKE A WIKIPEDIA ARTICLE. FACTUAL AND EASY TO UNDERSTAND WHILE INTRODUCING DIFFERENT SUB TOPICS OR VOCUABULARY (Dont simplify the vocabulary, it is useful for the user to read learn more about the vocabulary or concepts. AT THE TOP ALWAYS HAVE A SHORT DEFINITION OF THE TOPIC MAPPING THE TERRAIN IT IS ABOUT JUST LIKE IN WIKIPEDIA AND THEN BELOW THE ARTICLE IN THE WAY OUTLINED IN THE PROMPT (explaining with fun examples or analogies would be awesome).

IMPORTANT FORMATTING RULES:
1. Use **bold** for emphasis or titles.
2. IDENTIFY KEY CONCEPTS: Wrap 5-10 key phrases, difficult terms, or sub-topics that are worth studying deeper in double brackets, like [[Quantum Entanglement]] or [[Memoization]]. These will become clickable links for the user. Ensure these are actual distinct topics, not just random words.
3. TITLE: Start the response with a title that is ONLY 1-3 words long, wrapped in # or **.

(don't create response for any example given in this prompt, it's only for your understanding) At the very end of your answer. DONT SUGGEST A NEW QUESTION OR ASK IF THE USER WANTS TO USE THIS.

VISUALS & DRAWINGS:
The AI should make visualizations, drawings, and bullet points to show things in a more visual way.
Since you are a text-only AI, you must create "drawings" and "visualizations" using text-based methods:
- Use ASCII art or text-based diagrams to illustrate structures, flows, or relationships.
- Use bullet points and lists to visually break down information.
- Provide vivid examples that create a strong visual mental image.
- Use emojis or spatial formatting to enhance the visual appeal.
- If a complex diagram is needed, describe it clearly or use a text-based representation (e.g., A -> B -> C).

BE CLEAR, CONCRETE, REAL AND DONT USE JARGON. WRITE SO THE USER UNDERSTANDS, SO IF YOU USE A JARGON WORD, EXPLAIN IT IN A CLEAR UNDERSTANDABLE WAY.

When intruducing a new concept, or word shortly explain it but also relate it to the rest or the text or context somthing like this: It is like x previous concept but only looks at y. Or say xyz is the new word, it is this and this. While the previous word looked at this, this new word looks at this property of the same thing .... That way the user can connect and understand the relationship between concepts and words of a topic.`;

const CHAT_QUESTION_PROMPT = `You are a helpful AI tutor.
Check if the user's question specifies a particular way of answering (e.g., "explain like I'm 12", "simple english", "break it down").
- IF YES: Follow the user's specific instruction for the format/style, but keep the content factual and educational.
- IF NO (standard question): Follow the structure below exactly:

${ARTICLE_GENERATION_PROMPT}`;

// Helper to find the Root of the branch (Level 1) for a given node
// If node is Level 0 or 1, it is its own root.
// If node is Level > 1, traverse up to find Level 1 ancestor.
const getBranchRootNode = (startNodeId, nodes, edges) => {
    let currentId = startNodeId;
    let currentNode = nodes.find(n => n.id === currentId);

    // Safety break
    let attempts = 0;
    while (currentNode && currentNode.level > 1 && attempts < 100) {
        attempts++;
        const edge = edges.find(e => e.target === currentId);
        if (!edge) break;
        currentId = edge.source;
        currentNode = nodes.find(n => n.id === currentId);
    }
    return currentNode;
};

export default function Home() {
    // Phase management
    const [phase, setPhase] = useState('topic-selection');
    const [currentTopic, setCurrentTopic] = useState('');
    const [darkMode, setDarkMode] = useState(false);
    const [showGuidance, setShowGuidance] = useState(true);
    const [isPlanMode, setIsPlanMode] = useState(false);

    // Mind Map state
    const [mindMapData, setMindMapData] = useState({ nodes: [], edges: [], currentNodeId: null });
    const [fileContent, setFileContent] = useState('');
    const [isFileLoading, setIsFileLoading] = useState(false);
    const [fileError, setFileError] = useState('');
    const [planError, setPlanError] = useState('');
    const [mindMapColor, setMindMapColor] = useState('blue');
    const [isInverseGradient, setIsInverseGradient] = useState(true);

    // Study phase state
    const [currentArticle, setCurrentArticle] = useState('');
    const [currentArticleTitle, setCurrentArticleTitle] = useState('');
    const [articleHistory, setArticleHistory] = useState([]);
    const [selectedText, setSelectedText] = useState('');
    const [sourceTextForSubArticle, setSourceTextForSubArticle] = useState('');
    const [showLearnMore, setShowLearnMore] = useState(false);
    const [learnMorePosition, setLearnMorePosition] = useState({ x: 0, y: 0 });
    const [isLoading, setIsLoading] = useState(false);
    const [notesText, setNotesText] = useState('');
    const [notesOpen, setNotesOpen] = useState(false);
    const [notesWidth, setNotesWidth] = useState(400); // Default width
    const [floatingQA, setFloatingQA] = useState([]);
    const [questionInput, setQuestionInput] = useState('');
    const [studyTime, setStudyTime] = useState(0);

    // Ingrain phase state
    const [essayText, setEssayText] = useState('');
    const [teachingText, setTeachingText] = useState('');
    const [teachingStep, setTeachingStep] = useState('explaining'); // 'explaining' | 'review' | 'answering'
    const [currentAnswer, setCurrentAnswer] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [currentStudentQuestion, setCurrentStudentQuestion] = useState('');
    const [questionHistory, setQuestionHistory] = useState([]);
    const [identifiedGaps, setIdentifiedGaps] = useState('');
    const [language, setLanguage] = useState('en-US');
    const [showSaveFeedback, setShowSaveFeedback] = useState(false);

    const recognitionRef = useRef(null);
    const studyTimerRef = useRef(null);
    const selectionTimeoutRef = useRef(null);
    const notesPanelRef = useRef(null);
    const articleContainerRef = useRef(null);
    const isResizingRef = useRef(false);
    const [activeNoteTab, setActiveNoteTab] = useState(null); // node_id of the active tab (only for Level 0 view)

    // Subscription & Limits
    const [subscriptionTier, setSubscriptionTier] = useState('free'); // 'free', 'premium', 'pro'
    const [monthlyArticleCount, setMonthlyArticleCount] = useState(0);
    const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);

    // Auth & Sidebar State
    const [user, setUser] = useState(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [studies, setStudies] = useState([]);
    const saveTimeoutRef = useRef(null);

    // Auth Listener & Data Fetching
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchStudies(session.user.id);
                fetchProfile(session.user.id);
            }
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchStudies(session.user.id);
                fetchProfile(session.user.id);
            } else {
                setStudies([]);
                setSubscriptionTier('free');
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const fetchStudies = async (userId) => {
        const { data } = await supabase
            .from('studies')
            .select('id, topic, updated_at, session_data')
            .eq('user_id', userId)
            .order('updated_at', { ascending: false });
        if (data) setStudies(data);
    };

    const fetchProfile = async (userId) => {
        // Fetch all fields to be safe against schema mismatches causing 406
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (data) {
            setSubscriptionTier(data.subscription_tier || 'free');
            setMonthlyArticleCount(data.monthly_article_count || 0);
        } else if (error && error.code === 'PGRST116') {
            // Profile doesn't exist yet, usually handled by trigger but good fallback
        }
    };

    // Refresh profile on window focus to catch updates from payment success page redirect
    useEffect(() => {
        const onFocus = () => {
            if (user) fetchProfile(user.id);
        };
        window.addEventListener('focus', onFocus);
        return () => window.removeEventListener('focus', onFocus);
    }, [user]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        setIsSidebarOpen(false);
        setPhase('topic-selection');
    };

    const saveCurrentStudy = async (studyId, dataToSave) => {
        if (!user || !studyId) return;

        // Optimistically update local state so the UI reflects current reality immediately
        setStudies(prevStudies => prevStudies.map(s =>
            s.id === studyId
                ? { ...s, session_data: dataToSave, updated_at: new Date().toISOString() }
                : s
        ));

        try {
            await supabase
                .from('studies')
                .update({
                    session_data: dataToSave,
                    updated_at: new Date().toISOString()
                })
                .eq('id', studyId);
        } catch (err) {
            console.error("Error saving study:", err);
            // Optionally revert local state here if strict consistency needed, but risk is low
        }
    };

    const handleDeleteStudy = async (studyId) => {
        try {
            const { error } = await supabase
                .from('studies')
                .delete()
                .eq('id', studyId);
            if (error) throw error;
            setStudies(prev => prev.filter(s => s.id !== studyId));
        } catch (err) {
            console.error('Failed to delete study:', err);
        }
    };

    const handleSelectStudy = async (study) => {
        // Save current study before switching if active
        if (currentTopic && user) {
            const currentStudyId = studies.find(s => s.topic === currentTopic)?.id;
            if (currentStudyId) {
                // Sync current notes/state to the active node in mind map before saving
                let currentMindMap = { ...mindMapData };
                if (phase === 'study' && currentMindMap.currentNodeId !== null) {
                    const branchRoot = getBranchRootNode(currentMindMap.currentNodeId, currentMindMap.nodes, currentMindMap.edges);
                    currentMindMap.nodes = currentMindMap.nodes.map(n => {
                        let updates = {};
                        if (n.id === currentMindMap.currentNodeId) {
                            updates = { ...updates, article: currentArticle, articleTitle: currentArticleTitle };
                        }

                        // NOTE LOGIC:
                        // If we are on Level 0 (Root), we might be editing a TAB that belongs to a branch.
                        // So we save to 'activeNoteTab' if present, otherwise to branchRoot (which is Root).
                        const activeNodeForNotes = (n.level === 0 && activeNoteTab)
                            ? currentMindMap.nodes.find(node => node.id === activeNoteTab)
                            : branchRoot;

                        // If we are on Root, and editing a specific tab, currentMindMap.currentNodeId is Root.
                        // We want to save notesText to activeNoteTab.
                        // But we are iterating map 'n'.
                        if (activeNodeForNotes && n.id === activeNodeForNotes.id) {
                            updates = { ...updates, notes: notesText };
                        }
                        return Object.keys(updates).length > 0 ? { ...n, ...updates } : n;
                    });
                }

                const sessionData = {
                    currentTopic,
                    currentArticle,
                    currentArticleTitle,
                    articleHistory,
                    notesText,
                    sourceTextForSubArticle,
                    floatingQA,
                    phase,
                    studyTime,
                    notesWidth,
                    isPlanMode,
                    mindMapData: currentMindMap, // Use the synced mind map
                    mindMapColor,
                    isInverseGradient,
                    activeNoteTab
                };
                await saveCurrentStudy(currentStudyId, sessionData);
            }
        }

        try {
            const data = study.session_data;
            if (data.currentTopic) {
                setCurrentTopic(data.currentTopic);
                setCurrentArticle(data.currentArticle || '');
                setCurrentArticleTitle(data.currentArticleTitle || '');
                setArticleHistory(data.articleHistory || []);
                setNotesText(data.notesText || '');
                setSourceTextForSubArticle(data.sourceTextForSubArticle || '');
                setFloatingQA(data.floatingQA || []);
                setPhase(data.phase || 'study');
                setStudyTime(data.studyTime || 0);
                if (data.notesWidth) setNotesWidth(data.notesWidth);
                setIsPlanMode(data.isPlanMode || false);
                setMindMapData(data.mindMapData || { nodes: [], edges: [], currentNodeId: null });
                setMindMapColor(data.mindMapColor || 'blue');
                setIsInverseGradient(data.isInverseGradient || false);
                setActiveNoteTab(data.activeNoteTab || null);
                setIsSidebarOpen(false);
                setIsSidebarOpen(false);
                // Sync to localStorage
                localStorage.setItem('learningAppSession', JSON.stringify(data));
            }
        } catch (e) {
            console.error('Failed to load study:', e);
        }
    };

    // Load session from localStorage
    useEffect(() => {
        const saved = localStorage.getItem('learningAppSession');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                if (data.currentTopic) {
                    setCurrentTopic(data.currentTopic);
                    setCurrentArticle(data.currentArticle || '');
                    setCurrentArticleTitle(data.currentArticleTitle || '');
                    setArticleHistory(data.articleHistory || []);
                    setNotesText(data.notesText || '');
                    setSourceTextForSubArticle(data.sourceTextForSubArticle || '');
                    setFloatingQA(data.floatingQA || []);
                    setPhase(data.phase || 'study');
                    setStudyTime(data.studyTime || 0);
                    if (data.notesWidth) setNotesWidth(data.notesWidth);
                    setIsPlanMode(data.isPlanMode || false);
                    setMindMapData(data.mindMapData || { nodes: [], edges: [], currentNodeId: null });
                    setMindMapColor(data.mindMapColor || 'blue');
                    setIsInverseGradient(data.isInverseGradient || false);
                }
            } catch (e) {
                console.error('Failed to load session:', e);
            }
        }

        // Load dark mode preference
        const savedDarkMode = localStorage.getItem('darkMode');
        if (savedDarkMode) {
            setDarkMode(savedDarkMode === 'true');
        }
    }, []);

    // Save session to localStorage
    // Save session to localStorage and Supabase
    useEffect(() => {
        if (currentTopic) {
            const sessionData = {
                currentTopic,
                currentArticle,
                currentArticleTitle,
                articleHistory,
                notesText,
                sourceTextForSubArticle,
                floatingQA,
                phase,
                studyTime,
                notesWidth,
                isPlanMode,
                mindMapData,
                mindMapColor,
                mindMapData,
                mindMapColor,
                isInverseGradient,
                activeNoteTab
            };
            localStorage.setItem('learningAppSession', JSON.stringify(sessionData));

            // Save to Supabase if logged in and not in initial selection phase
            if (user && phase !== 'topic-selection' && !isLoading) {
                if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
                saveTimeoutRef.current = setTimeout(async () => {
                    try {
                        let studyId = studies.find(s => s.topic === currentTopic)?.id;

                        if (!studyId) {
                            // Valid new study creation logic can remain/be handled here or separate
                            const { data } = await supabase
                                .from('studies')
                                .select('id')
                                .eq('user_id', user.id)
                                .eq('topic', currentTopic)
                                .single();
                            if (data) studyId = data.id;
                        }

                        // If still no ID, create it
                        if (!studyId) {
                            const { data: newStudy } = await supabase
                                .from('studies')
                                .insert({
                                    user_id: user.id,
                                    topic: currentTopic,
                                    session_data: sessionData
                                })
                                .select()
                                .single();

                            if (newStudy) {
                                // Add new study to local list
                                setStudies(prev => [newStudy, ...prev]);
                            }
                        } else {
                            await saveCurrentStudy(studyId, sessionData);
                        }
                    } catch (err) {
                        console.error("Error saving to Supabase", err);
                    }
                }, 2000); // Debounce 2s
            }
        }
    }, [currentTopic, currentArticle, currentArticleTitle, articleHistory, notesText, sourceTextForSubArticle, floatingQA, phase, studyTime, notesWidth, isPlanMode, mindMapData, mindMapColor, isInverseGradient, activeNoteTab, user, studies, isLoading]);

    // Save dark mode preference
    useEffect(() => {
        localStorage.setItem('darkMode', darkMode.toString());
        if (darkMode) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
    }, [darkMode]);

    // Click outside notes to close
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (notesOpen && notesPanelRef.current && !notesPanelRef.current.contains(event.target)) {
                const isNotesButton = event.target.closest('button')?.textContent.includes('Notes');
                const isQA = event.target.closest(`.${styles.floatingQAContainer}`);
                if (!isNotesButton && !isQA) {
                    setNotesOpen(false);
                }
            }
        };
        if (notesOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [notesOpen]);

    // Resizing logic for notes
    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!isResizingRef.current) return;
            const newWidth = window.innerWidth - e.clientX;
            // Min/Max bounds
            if (newWidth >= 300 && newWidth <= window.innerWidth * 0.8) {
                setNotesWidth(newWidth);
            }
        };

        const handleMouseUp = () => {
            isResizingRef.current = false;
            document.body.style.cursor = 'default';
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, []);

    const startResizing = (e) => {
        e.preventDefault();
        isResizingRef.current = true;
        document.body.style.cursor = 'col-resize';
    };

    // Study time tracker
    useEffect(() => {
        if (phase === 'study') {
            studyTimerRef.current = setInterval(() => setStudyTime(prev => prev + 1), 1000);
        } else {
            if (studyTimerRef.current) clearInterval(studyTimerRef.current);
        }
        return () => { if (studyTimerRef.current) clearInterval(studyTimerRef.current); };
    }, [phase]);

    // QA Outline Logic
    useEffect(() => {
        const lines = notesText.split('\n');
        const newFloatingQA = [];
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.endsWith('?')) {
                let answer = '';
                if (i + 1 < lines.length) {
                    const nextLine = lines[i + 1].trim();
                    if (nextLine && !nextLine.endsWith('?')) answer = nextLine;
                }
                newFloatingQA.push({ question: line, answer });
            }
        }
        setFloatingQA(newFloatingQA);
    }, [notesText]);

    // Helper to get or create guest ID
    const getGuestId = () => {
        let guestId = localStorage.getItem('guestId');
        if (!guestId) {
            guestId = crypto.randomUUID();
            localStorage.setItem('guestId', guestId);
        }
        return guestId;
    };

    // Generate article
    const generateArticle = useCallback(async (topic, isSubArticle = false, systemPrompt = ARTICLE_GENERATION_PROMPT) => {
        // Sync current state to Mind Map before navigating away
        // Sync current state to Mind Map before navigating away
        let currentMindMap = { ...mindMapData };
        if (phase === 'study' && currentMindMap.currentNodeId !== null) {
            const branchRoot = getBranchRootNode(currentMindMap.currentNodeId, currentMindMap.nodes, currentMindMap.edges);
            const currentNode = currentMindMap.nodes.find(n => n.id === currentMindMap.currentNodeId);

            currentMindMap.nodes = currentMindMap.nodes.map(n => {
                let updates = {};
                if (n.id === currentMindMap.currentNodeId) {
                    updates = { ...updates, article: currentArticle, articleTitle: currentArticleTitle };
                }

                // If on Root, save to activeTab. Else save to branchRoot.
                const targetIdForNotes = (currentNode && currentNode.level === 0 && activeNoteTab)
                    ? activeNoteTab
                    : (branchRoot ? branchRoot.id : null);

                if (targetIdForNotes && n.id === targetIdForNotes) {
                    updates = { ...updates, notes: notesText };
                }
                return Object.keys(updates).length > 0 ? { ...n, ...updates } : n;
            });
            setMindMapData(currentMindMap);
        }

        // Check if Topic Already Exists in Mind Map (Avoid Re-generation)
        const normalizedTopic = topic.trim().toLowerCase();
        const existingNode = currentMindMap.nodes.find(n => n.label.toLowerCase() === normalizedTopic);

        if (existingNode && isSubArticle) {
            const parentId = currentMindMap.currentNodeId;
            let edges = [...currentMindMap.edges];
            if (parentId && existingNode.id !== parentId) {
                const edgeExists = edges.some(e =>
                    (e.source === parentId && e.target === existingNode.id) ||
                    (e.source === existingNode.id && e.target === parentId)
                );
                if (!edgeExists) {
                    edges.push({ source: parentId, target: existingNode.id });
                    setMindMapData(prev => ({ ...prev, edges }));
                }
            }
            handleNodeClick(existingNode);
            return existingNode.article;
        }

        setIsLoading(true);
        try {
            // 1. Check Cache
            if (user && !fileContent) { // Only cache non-file-context general articles
                const { data: cached } = await supabase
                    .from('generated_articles')
                    .select('content')
                    .eq('topic', topic) // Simple exact match for now, could hash prompt
                    .eq('user_id', user.id)
                    .single();

                if (cached) {
                    setIsLoading(false);
                    // Set article logic... reusing the post-generation logic below by wrapping it
                    // We'll just continue with cached.content as 'articleContent'
                    var articleContent = cached.content;
                }
            }

            if (!articleContent) {
                // CHECK LIMIT BEFORE GENERATING
                // CHECK LIMIT BEFORE GENERATING
                // Free: 20 Total (but only 5 in Mind Map mode), Premium: 100, Pro: 1000
                const LIMITS = { free: 20, premium: 100, pro: 1000 };
                const currentLimit = LIMITS[subscriptionTier] || 20;

                // Specific Check for Free Tier in Mind Map Mode
                if (user && subscriptionTier === 'free' && isPlanMode && monthlyArticleCount >= 5) {
                    alert("Free Plan Limit: You can only generate 5 articles in Mind Map mode. Upgrade for more!");
                    setIsLoading(false);
                    setIsSubscriptionModalOpen(true);
                    return "Limit reached";
                }

                if (user && monthlyArticleCount >= currentLimit) {
                    setIsLoading(false);
                    setIsSubscriptionModalOpen(true);
                    return "Limit reached";
                }

                const guestId = !user ? getGuestId() : null;

                // Call Secure Backend API
                const response = await fetch('/api/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        topic: (fileContent && isPlanMode)
                            ? (() => {
                                // (Keep existing prompt logic logic, it's just passing the 'topic' string to backend)
                                // Wait, the backend logic expects the FULL prompt in 'topic' if we are doing the "user" role content?
                                // OR we pass the raw topic and let backend handle?
                                // My API route expects 'topic' and puts it in 'user' content. 
                                // So I should generate the rich prompt HERE and pass it as 'topic' to the API.
                                const isInitialNode = currentMindMap.nodes.some(n =>
                                    n.label.toLowerCase() === topic.toLowerCase() &&
                                    n.level <= 1
                                );

                                if (isInitialNode) {
                                    return `Topic to explain: "${topic}"\n\n` +
                                        `CONTEXT FROM UPLOADED DOCUMENT: ${fileContent.slice(0, 25000)}\n\n` +
                                        `CRITICAL INSTRUCTION: You represent the specific chapter/section "${topic}" from the uploaded document. ` +
                                        `Your goal is to teach the concepts EXACTLY as they are presented in this chapter of the file. ` +
                                        `DO NOT summarize the whole book. DO NOT teach generic information about "${topic}" if it differs from the book's approach. ` +
                                        `If the book has a specific example or explanation style for this chapter, use it. ` +
                                        `If the section is short, explain it fully using the document's content.`;
                                } else {
                                    return `Topic to explain: "${topic}"\n\n` +
                                        `CONTEXT FROM UPLOADED DOCUMENT: ${fileContent.slice(0, 15000)}\n\n` +
                                        `INSTRUCTIONS: Explain "${topic}". You may use the document context if relevant, but since this is a specific exploration question, ` +
                                        `you are free to use external factual knowledge to explain the concept clearly.`;
                                }
                            })()
                            : topic,
                        systemPrompt: systemPrompt,
                        userId: user ? user.id : null,
                        guestId: guestId,
                        planMode: isPlanMode,
                        model: 'llama-3.3-70b-versatile'
                    }),
                });

                if (!response.ok) {
                    const errData = await response.json();
                    if (response.status === 403) {
                        setIsLoading(false);
                        // Handle Guest Restrictions specifically
                        if (!user && (errData.reason === 'article_limit' || errData.reason === 'mindmap_locked')) {
                            setIsAuthModalOpen(true);
                        } else {
                            alert(errData.error || "Usage limit reached.");
                            setIsSubscriptionModalOpen(true);
                        }
                        return "Limit reached";
                    }
                    throw new Error(errData.error || `API error: ${response.status}`);
                }

                const data = await response.json();
                articleContent = data.content;

                // Update local Usage Count to match server
                if (data.usage) {
                    setMonthlyArticleCount(data.usage.current);
                }

                // Cache it
                if (user && !fileContent && articleContent.length > 100) {
                    await supabase.from('generated_articles').insert({
                        user_id: user.id,
                        topic: topic,
                        content: articleContent
                    });
                }
            }

            // Extract title
            const lines = articleContent.split('\n');
            let extractedTitle = topic;
            for (let line of lines) {
                const cleaned = line.trim();
                if (cleaned.startsWith('#')) {
                    extractedTitle = cleaned.replace(/^#+\s*/, '').replace(/\*\*/g, '');
                    break;
                } else if (cleaned.startsWith('**') && cleaned.endsWith('**')) {
                    extractedTitle = cleaned.replace(/\*\*/g, '');
                    break;
                }
            }

            if (isSubArticle && currentArticle) {
                setArticleHistory(prev => [...prev, { title: currentArticleTitle, content: currentArticle, sourceTextForSubArticle, nodeId: currentMindMap.currentNodeId, notesText }]);
            }

            setCurrentArticle(articleContent);
            setCurrentArticleTitle(extractedTitle);

            // Clear notes for new topic as we act as if we switched
            // Clear notes ONLY if we are starting a completely new branch (Level 1) from Root
            // If we are deeper (Level > 1), we keep the notes (inherit/persist from parent)
            if (isSubArticle) {
                const parentId = currentMindMap.currentNodeId;
                const parentNode = currentMindMap.nodes.find(n => n.id === parentId);
                const parentLevel = parentNode ? parentNode.level : 0;

                if (parentLevel === 0) {
                    setNotesText('');
                }
            }

            // Dynamic growth for Mind Map - ONLY IF it's a sub-article (exploration)
            if (isPlanMode && isSubArticle && currentMindMap.currentNodeId !== null) {
                const parentId = currentMindMap.currentNodeId;
                const existingNode = currentMindMap.nodes.find(n => n.label.toLowerCase() === extractedTitle.toLowerCase());

                if (existingNode) {
                    // Check if edge already exists
                    const edgeExists = currentMindMap.edges.some(e => (e.source === parentId && e.target === existingNode.id) || (e.source === existingNode.id && e.target === parentId));
                    if (!edgeExists && existingNode.id !== parentId) {
                        setMindMapData(prev => ({
                            ...prev,
                            edges: [...prev.edges, { source: parentId, target: existingNode.id }]
                        }));
                    }
                } else {
                    const newNodeId = `node-${Date.now()}`;
                    const parentNode = currentMindMap.nodes.find(n => n.id === parentId);
                    const newLevel = parentNode ? parentNode.level + 1 : 1;

                    setMindMapData(prev => ({
                        // Use locally updated nodes (with synced notes) as base
                        ...currentMindMap,
                        nodes: [...currentMindMap.nodes, {
                            id: newNodeId,
                            label: extractedTitle,
                            level: newLevel,
                            description: `Exploration of ${extractedTitle}`,
                            article: articleContent,
                            articleTitle: extractedTitle,
                            notes: ''
                        }],
                        edges: [...currentMindMap.edges, { source: parentId, target: newNodeId }],
                        currentNodeId: newNodeId // Automatically switch to the new discovered node
                    }));
                }
            }

            setIsLoading(false);

            // Increment count if we successfully generated a NEW article
            if (!articleContent && user) {
                setMonthlyArticleCount(prev => prev + 1);
                // In real app, sync this counter to DB
                // supabase.from('profiles').update({ monthly_article_count: monthlyArticleCount + 1 }).eq('id', user.id);
            }

            return articleContent;
        } catch (error) {
            console.error('Error generating article:', error);
            setCurrentArticle('Failed to generate article. View logs or try again.');
            setIsLoading(false);
        }
    }, [currentArticle, currentArticleTitle, sourceTextForSubArticle, mindMapData, isPlanMode, fileContent, notesText, phase, user, subscriptionTier, monthlyArticleCount]);

    const handleTopicSubmit = async (e) => {
        e.preventDefault();
        if (!currentTopic.trim()) return;

        // Guest Check for Mind Map
        if (isPlanMode && !user) {
            // alert("Sign up required to create Study Plans.");
            setIsAuthModalOpen(true);
            return;
        }

        if (isPlanMode) {
            // Check Mind Map Limits
            // Free: 1 Map, Premium: 20 Maps, Pro: Unlimited
            const MAP_LIMITS = { free: 1, premium: 20, pro: 999999 };
            const currentMapLimit = MAP_LIMITS[subscriptionTier] || 1;

            // Count existing mind maps
            // We need to check the studies list. `studies` is available in state.
            const existingMaps = studies.filter(s => s.session_data?.isPlanMode).length;

            if (user && existingMaps >= currentMapLimit) {
                alert(`Plan Limit Reached: You can create max ${currentMapLimit} Mind Map(s) on your current plan.`);
                setIsSubscriptionModalOpen(true);
                return;
            }

            await generateStudyPlan(currentTopic);
            setPhase('study-plan');
        } else {
            await generateArticle(currentTopic, false);
            setPhase('study');
        }
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsFileLoading(true);
        setFileError('');
        setFileContent('');

        try {
            if (file.type === 'application/pdf') {
                const arrayBuffer = await file.arrayBuffer();
                const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
                let text = '';
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const content = await page.getTextContent();
                    text += content.items.map(item => item.str).join(' ') + '\n';
                }
                setFileContent(text);
                setIsFileLoading(false);
            } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.name.endsWith('.docx')) {
                const arrayBuffer = await file.arrayBuffer();
                const result = await mammoth.extractRawText({ arrayBuffer });
                setFileContent(result.value);
                setIsFileLoading(false);
            } else {
                const reader = new FileReader();
                reader.onload = (event) => {
                    setFileContent(event.target.result);
                    setIsFileLoading(false);
                };
                reader.onerror = () => {
                    setFileError('Failed to read file.');
                    setIsFileLoading(false);
                };
                reader.readAsText(file);
            }
        } catch (error) {
            console.error('File processing error:', error);
            setFileError('Error processing file. Please try a different one.');
            setIsFileLoading(false);
        }
    };

    const generateStudyPlan = async (topic) => {
        setIsLoading(true);
        setPlanError('');
        try {
            const prompt = `Generate a study plan for the topic: "${topic}". 
            ${fileContent ? `Context from uploaded file (EXACT BOOK CONTENT/NOTES): ${fileContent.slice(0, 15000)}` : ''}
            Return a JSON object with the following structure:
            {
                "nodes": [
                    { "id": "0", "label": "${topic}", "level": 0, "description": "Main topic" },
                    { "id": "1", "label": "Subtopic 1", "level": 1, "description": "Description 1" },
                    ...
                ],
                    "edges": [
                        { "source": "0", "target": "1" },
                        ...
                ]
            }
            Provide 5 - 10 sub - topics.Return ONLY the JSON.`;

            // Use Backend API to secure keys and enforce limits
            const response = await fetch('/api/generate-plan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user?.id, // Guests blocked by API
                    messages: [{ role: 'user', content: prompt }]
                }),
            });

            if (!response.ok) {
                const errData = await response.json();
                if (response.status === 403) {
                    setIsSubscriptionModalOpen(true);
                    throw new Error(errData.error || "Plan limit reached.");
                }
                if (response.status === 401) {
                    setIsAuthModalOpen(true);
                    throw new Error("Please log in to create a Study Plan.");
                }
                throw new Error(errData.error || 'Failed to reach AI');
            }

            const data = await response.json();
            const plan = JSON.parse(data.choices[0]?.message?.content);
            setMindMapData({ ...plan, currentNodeId: "0" });
            setIsLoading(false);
        } catch (error) {
            console.error('Error generating study plan:', error);
            setPlanError(error.message || 'Failed to generate study plan. Please try again.');
            setIsLoading(false);
        }
    };

    const handleNewTopic = async () => {
        // Save current before clearing
        if (currentTopic && user) {
            const currentStudyId = studies.find(s => s.topic === currentTopic)?.id;
            if (currentStudyId) {
                let currentMindMap = { ...mindMapData };
                if (phase === 'study' && currentMindMap.currentNodeId !== null) {
                    currentMindMap.nodes = currentMindMap.nodes.map(n =>
                        n.id === currentMindMap.currentNodeId
                            ? { ...n, notes: notesText, article: currentArticle, articleTitle: currentArticleTitle }
                            : n
                    );
                }

                const sessionData = {
                    currentTopic,
                    currentArticle,
                    currentArticleTitle,
                    articleHistory,
                    notesText,
                    sourceTextForSubArticle,
                    floatingQA,
                    phase,
                    studyTime,
                    notesWidth,
                    isPlanMode,
                    mindMapData: currentMindMap,
                    mindMapColor,
                    isInverseGradient
                };
                await saveCurrentStudy(currentStudyId, sessionData);
            }
        }

        setPhase('topic-selection');
        setCurrentTopic('');
        setCurrentArticle('');
        setCurrentArticleTitle('');
        setArticleHistory([]);
        setNotesText('');
        setSourceTextForSubArticle('');
        setFloatingQA([]);
        setEssayText('');
        setTeachingText('');
        setCurrentStudentQuestion('');
        setQuestionHistory([]);
        setIdentifiedGaps('');
        setStudyTime(0);
        setIsPlanMode(false);
        localStorage.removeItem('learningAppSession');
    };

    const handleBackToMain = () => {
        if (articleHistory.length > 0) {
            const previous = articleHistory[articleHistory.length - 1];
            setCurrentArticle(previous.content);
            setCurrentArticleTitle(previous.title);
            setNotesText(previous.notesText || '');
            setSourceTextForSubArticle(previous.sourceTextForSubArticle || '');
            if (previous.nodeId && isPlanMode) {
                setMindMapData(prev => ({ ...prev, currentNodeId: previous.nodeId }));
            }
            setArticleHistory(prev => prev.slice(0, -1));
        }
    };

    const handleQuestionSubmit = async (e) => {
        e.preventDefault();
        if (!questionInput.trim()) return;
        setSourceTextForSubArticle(questionInput);
        await generateArticle(questionInput, true, CHAT_QUESTION_PROMPT);
        setQuestionInput('');
    };

    // Handle text selection in article
    const handleTextSelection = () => {
        // Use a small timeout to let the browser process the selection event
        setTimeout(() => {
            const selection = window.getSelection();
            const selectedStr = selection.toString().trim();

            if (selectedStr && selectedStr.length > 2 && articleContainerRef.current) {
                const range = selection.getRangeAt(0);
                const rect = range.getBoundingClientRect();
                const containerRect = articleContainerRef.current.getBoundingClientRect();

                // Calculate position relative to the container
                // We add scrollTop to account for scrolling inside the container
                const relativeTop = rect.top - containerRect.top + articleContainerRef.current.scrollTop;
                const relativeLeft = rect.left - containerRect.left + (rect.width / 2);

                setSelectedText(selectedStr);
                setLearnMorePosition({
                    x: relativeLeft,
                    y: relativeTop - 10 // 10px spacing above selection
                });
                setShowLearnMore(true);
            } else {
                // Only hide if we really have no selection (don't flash hide on release if selected)
                if (!selectedStr) {
                    setShowLearnMore(false);
                }
            }
        }, 10);
    };

    const handleNodeClick = async (node) => {
        // Save current progress before switching
        // Save current progress before switching
        if (phase === 'study' && mindMapData.currentNodeId !== null) {
            setMindMapData(prev => {
                const branchRoot = getBranchRootNode(prev.currentNodeId, prev.nodes, prev.edges);
                const currentNode = prev.nodes.find(n => n.id === prev.currentNodeId);
                return {
                    ...prev,
                    nodes: prev.nodes.map(n => {
                        let updates = {};
                        if (n.id === prev.currentNodeId) {
                            updates = { ...updates, article: currentArticle, articleTitle: currentArticleTitle };
                        }
                        // If on Root, save to activeTab. Else save to branchRoot.
                        const targetIdForNotes = (currentNode && currentNode.level === 0 && activeNoteTab)
                            ? activeNoteTab
                            : (branchRoot ? branchRoot.id : null);

                        if (targetIdForNotes && n.id === targetIdForNotes) {
                            updates = { ...updates, notes: notesText };
                        }
                        return Object.keys(updates).length > 0 ? { ...n, ...updates } : n;
                    })
                };
            });
        }

        // --- RESTRICTION CHECK: Mind Map Expansion ---
        // If clicking a node that does NOT have an article yet (meaning it's a new exploration/expansion)
        // check if user is on FREE tier.

        // OLD RULE: Block all expansion.
        // NEW RULE: Allow up to 5 articles. (Handled in generateArticle)

        // So we remove the strict block here and rely on the count check in generateArticle.
        // However, we might want to warn them if they are close?
        // For now, let generateArticle handle the limit.

        setMindMapData(prev => ({ ...prev, currentNodeId: node.id }));

        // Load node state
        // Load node state
        const branchRoot = getBranchRootNode(node.id, mindMapData.nodes, mindMapData.edges);
        let notesToLoad = branchRoot ? (branchRoot.notes || '') : (node.notes || '');

        // If entering Root (Level 0), default to Root's own notes (tab = null or Root ID)
        if (node.level === 0) {
            setActiveNoteTab(node.id);
            notesToLoad = node.notes || '';
        } else {
            setActiveNoteTab(null);
        }

        if (node.article) {
            setCurrentArticle(node.article);
            setCurrentArticleTitle(node.articleTitle || node.label);
            setNotesText(notesToLoad);
            setPhase('study');
        } else {
            setNotesText(notesToLoad);
            await generateArticle(node.label, false);
            setPhase('study');
        }
    };

    const handleBackToPlan = () => {
        if (mindMapData.currentNodeId !== null) {
            setMindMapData(prev => {
                const branchRoot = getBranchRootNode(prev.currentNodeId, prev.nodes, prev.edges);
                const currentNode = prev.nodes.find(n => n.id === prev.currentNodeId);
                return {
                    ...prev,
                    nodes: prev.nodes.map(n => {
                        let updates = {};
                        if (n.id === prev.currentNodeId) {
                            updates = { ...updates, article: currentArticle, articleTitle: currentArticleTitle };
                        }
                        // If on Root, save to activeTab. Else save to branchRoot.
                        const targetIdForNotes = (currentNode && currentNode.level === 0 && activeNoteTab)
                            ? activeNoteTab
                            : (branchRoot ? branchRoot.id : null);

                        if (targetIdForNotes && n.id === targetIdForNotes) {
                            updates = { ...updates, notes: notesText };
                        }
                        return Object.keys(updates).length > 0 ? { ...n, ...updates } : n;
                    })
                };
            });
        }
        setPhase('study-plan');
    };

    // Handle mouse down - hide button immediately to clear old state
    const handleArticleMouseDown = (e) => {
        // Don't hide if clicking the Learn More button itself
        if (e.target.className && typeof e.target.className === 'string' && e.target.className.includes('learnMoreBtn')) return;

        setShowLearnMore(false);
    };

    const handleLearnMore = async () => {
        const textToLearn = selectedText;
        setShowLearnMore(false);
        setSourceTextForSubArticle(textToLearn);
        await generateArticle(textToLearn, true);
        window.getSelection().removeAllRanges();
    };

    // Memoized article rendering to prevent selection loss
    const renderedArticleContent = useMemo(() => {
        if (!currentArticle) return null;

        const renderWithLinks = (text) => {
            let formatted = text.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
            const parts = formatted.split(/(\[\[.*?\]\])/g);
            return parts.map((part, index) => {
                if (part.startsWith('[[') && part.endsWith(']]')) {
                    const content = part.slice(2, -2);
                    return (
                        <span key={index} className={styles.subConcept} onClick={() => generateArticle(content, true)}>
                            {content}
                        </span>
                    );
                }
                return <span key={index} dangerouslySetInnerHTML={{ __html: part }} />;
            });
        };

        return (
            <>
                {currentArticleTitle && <h1 className={styles.articleTitle}>{currentArticleTitle}</h1>}
                {currentArticle.split('\n\n').map((paragraph, index) => {
                    // Skip the title line if it was extracted and rendered as h1
                    const cleanedParagraph = paragraph.trim();
                    if (cleanedParagraph === `# ${currentArticleTitle} ` ||
                        cleanedParagraph === `** ${currentArticleTitle}** ` ||
                        cleanedParagraph === currentArticleTitle) {
                        return null;
                    }
                    return <p key={index}>{renderWithLinks(paragraph)}</p>;
                })}
            </>
        );
    }, [currentArticle, currentArticleTitle, generateArticle]);

    const startVoiceRecognition = () => {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            alert('Speech recognition is not supported in your browser. Please type instead.');
            return;
        }
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = language;

        recognitionRef.current.onresult = (event) => {
            let finalTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript + ' ';
            }
            if (phase === 'ingrain-teach') {
                setTeachingText(prev => prev + finalTranscript);
            }
        };
        recognitionRef.current.start();
        setIsListening(true);
    };

    const stopVoiceRecognition = () => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            setIsListening(false);
        }
    };

    // Generate AI question and switch to answering step
    const generateStudentQuestion = async (manualHistory = null) => {
        const historyToUse = manualHistory || questionHistory;
        setIsLoading(true);
        try {
            const context = historyToUse.length > 0
                ? `Previous questions and answers: \n${historyToUse.map(q => `Q: ${q.question}\nA: ${q.answer}`).join('\n\n')} \n\n`
                : '';

            const response = await fetch(GROQ_API_URL, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${GROQ_API_KEY} `, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'llama-3.3-70b-versatile',
                    messages: [
                        {
                            role: 'system', content: `You are a curious student. Generate ONE simple, natural question from a different angle. Do NOT repeat previous questions. Ask about unclear parts, gaps, logical fallacies. Return ONLY the question. ASK THE USER QUESTIONS SPECIFICALLY ABOUT THE TOPIC AND WHAT HE TAUGHT THROUGH THE LENSE OF A STUDENT TRYING TO LEARN THE TOPIC THE USER HAS TALKED ABOUT. YOUR QUESTIONS SHOULD ASK FOR CLARIFICATION, ASK TO EXPOSE A GAP IN THE USERS UNDERSTANDING OF THE ACTUAL SUBJECT MATTER (example, if the topic is mechatronics and the user talks about electrical engineering and software development but not about mechanical engineering, then ask questions about that). DONT ASK UNRELEVANT QUESTIONS ABOUT THE TOPIC. CHALLENGE THE USER BUT DONT DISCOURAGE HIM WITH EXTREMELY DIFFICULT QUESTIONS.

these are the subtopics the user explored whily studieng this subject: ${Array.from(new Set([...mindMapData.nodes.filter(n => n.level > 0).map(n => n.label), ...articleHistory.map(h => h.title)])).join(', ')}. 
You can ask about the exact same sub topics to test if the user understood what he studied BUT ALSO ASK QUESTIONS ABOUT THE SUBJECT MATTER IN OTHER AREAS TO TEST THE USERS KNOWLEDGE AND FIND GAPS IN HIS UNDERSTANDING. ASK 1 QUESTION` },
                        { role: 'user', content: `${context} Topic: ${currentArticleTitle || currentTopic} \nFirst sentence of article: ${currentArticle.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#')).join(' ').split(/[.!?]/)[0] || ''} \n\nTeaching explanation: ${teachingText} \n\nGenerate ONE question from a new angle: ` }
                    ],
                    temperature: 0.8,
                    max_tokens: 100,
                }),
            });
            const data = await response.json();
            const question = data.choices[0]?.message?.content.trim() || '';
            setCurrentStudentQuestion(question);
            setCurrentAnswer(''); // Clear answer input
            setTeachingStep('answering');
            setIsLoading(false);
        } catch (error) {
            console.error('Error generating student question:', error);
            setIsLoading(false);
        }
    };

    // Submit answer and generate next question
    const handleAnswerSubmit = async () => {
        if (!currentAnswer.trim()) return;

        // Save Q&A to history
        const newHistory = [...questionHistory, {
            question: currentStudentQuestion,
            answer: currentAnswer
        }];
        setQuestionHistory(newHistory);

        // Generate next question
        await generateStudentQuestion(newHistory);
    };

    // Add current question to notes and continue with next question
    const handleAddToNotesAndContinue = async () => {
        // Add question to notes as a gap
        setNotesText(prev => prev + (prev ? '\n\n' : '') + currentStudentQuestion + '\n');
        setIdentifiedGaps(prev => prev + (prev ? '\n' : '') + currentStudentQuestion);

        // Add to history so AI knows it was asked
        const newHistory = [...questionHistory, {
            question: currentStudentQuestion,
            answer: '(Added to notes)'
        }];
        setQuestionHistory(newHistory);

        // Visual feedback
        setShowSaveFeedback(true);
        setTimeout(() => setShowSaveFeedback(false), 2000);

        // Generate next question
        await generateStudentQuestion(newHistory);
    };

    // Finish teaching and go back to study
    const handleFinishTeaching = () => {
        if (identifiedGaps.trim()) {
            const gaps = identifiedGaps.split('\n').filter(g => g.trim());
            gaps.forEach(gap => setNotesText(prev => prev + (prev ? '\n\n' : '') + gap + (gap.endsWith('?') ? '' : '?') + '\n'));

            // Visual feedback
            setShowSaveFeedback(true);
            setTimeout(() => setShowSaveFeedback(false), 2000);
        }
        setPhase('study');
        setEssayText('');
        setTeachingText('');
        setTeachingStep('explaining');
        setCurrentAnswer('');
        setCurrentStudentQuestion('');
        setQuestionHistory([]);
        setIdentifiedGaps('');
    };

    const renderHeader = () => (
        <header className={styles.studyHeader}>
            <div className={styles.headerLeft}>
                <button
                    onClick={() => setIsSidebarOpen(true)}
                    className={styles.menuBtn}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', marginRight: '10px', color: darkMode ? '#fff' : '#333', display: 'flex', alignItems: 'center' }}
                    title="Open Library"
                >
                    <Menu size={24} />
                </button>
                <div className={styles.logo} onClick={handleNewTopic}>📚 Learn</div>
                {phase === 'study' && articleHistory.length > 0 && <button onClick={handleBackToMain} className="btn-secondary">← Back</button>}
                {(phase === 'study' || phase === 'ingrain-essay' || phase === 'ingrain-teach') && <h2 className={styles.headerTitle}>{currentArticleTitle || currentTopic}</h2>}
            </div>
            <div className={styles.headerRight}>
                <button
                    onClick={() => setShowGuidance(!showGuidance)}
                    className={styles.guidanceToggle}
                    title={showGuidance ? "Hide tips & explanations" : "Show tips & explanations"}
                >
                    {showGuidance ? '💡' : '💡'}
                    <span className={styles.toggleLabel}>{showGuidance ? 'Tips On' : 'Tips Off'}</span>
                </button>
                <button onClick={() => setDarkMode(!darkMode)} className={styles.darkModeToggle}>{darkMode ? '☀️' : '🌙'}</button>
                {isPlanMode && (phase === 'study' || phase === 'ingrain-essay' || phase === 'ingrain-teach' || phase === 'study-plan') && <button onClick={handleBackToPlan} className="btn-secondary">🗺️ Mind Map</button>}
                {(phase === 'study' || phase === 'account') && <button onClick={() => setNotesOpen(!notesOpen)} className="btn-secondary">{notesOpen ? 'Close Notes' : 'Open Notes'}</button>}
                {(phase === 'study' || phase === 'study-plan') && <button onClick={() => setPhase('ingrain-essay')} className="btn-primary" disabled={studyTime < 10}>Ingrain & Validate Knowledge</button>}

                {user ? (
                    <button
                        className={styles.accountHeaderBtn}
                        onClick={() => setPhase('account')}
                        title="Account Settings"
                    >
                        {user.user_metadata?.avatar_url ? (
                            <img src={user.user_metadata.avatar_url} alt="Profile" className={styles.headerAvatar} />
                        ) : (
                            <div className={styles.headerAvatarPlaceholder}>
                                {user.email[0].toUpperCase()}
                            </div>
                        )}
                    </button>
                ) : (
                    <button
                        className={styles.accountHeaderBtn}
                        onClick={() => setIsAuthModalOpen(true)}
                        title="Log In"
                    >
                        <div className={styles.headerAvatarPlaceholder}>
                            <UserIcon size={18} />
                        </div>
                    </button>
                )}
            </div>
        </header>
    );

    const renderPhase = () => {
        switch (phase) {
            case 'topic-selection':
                return (
                    <div className={styles.topicSelectionWrapper}>
                        <div className={styles.topicCard}>
                            <h1>What do you want to truly understand?</h1>

                            <form onSubmit={handleTopicSubmit}>
                                <div className={styles.inputGroup}>
                                    <input
                                        type="text"
                                        value={currentTopic}
                                        onChange={(e) => setCurrentTopic(e.target.value)}
                                        placeholder="e.g., Quantum Physics, React Hooks, Machine Learning..."
                                        autoFocus
                                    />
                                </div>

                                {/* Plan Mode Toggle - Near the button */}
                                <div className={styles.modeSelector}>
                                    <button
                                        type="button"
                                        className={`${styles.modeButton} ${!isPlanMode ? styles.activeModeBtn : ''}`}
                                        onClick={() => setIsPlanMode(false)}
                                    >
                                        📖 Quick Study
                                    </button>
                                    <button
                                        type="button"
                                        className={`${styles.modeButton} ${isPlanMode ? styles.activeModeBtn : ''}`}
                                        onClick={() => setIsPlanMode(true)}
                                    >
                                        🗺️ Study Plan
                                    </button>
                                </div>

                                {showGuidance && (
                                    <p className={styles.modeHint}>
                                        {isPlanMode
                                            ? '📚 Study Plan: Great for complex subjects (e.g. Electrical Engineering) or textbooks.'
                                            : '⚡ Quick Study: Perfect for focused concepts (e.g. Circuits) or specific questions.'}
                                    </p>
                                )}

                                {isPlanMode && (
                                    <div className={styles.fileUpload}>
                                        <label htmlFor="file-upload" className={`${styles.fileLabel} ${isFileLoading ? styles.loading : ''} ${fileError ? styles.error : ''}`}>
                                            {isFileLoading ? (
                                                <><div className="spinner-small"></div> Reading file...</>
                                            ) : fileError ? (
                                                `❌ ${fileError}`
                                            ) : fileContent ? (
                                                '✅ File Ready'
                                            ) : (
                                                '📁 Optional: Upload Book/Notes (PDF, Word, Text)'
                                            )}
                                        </label>
                                        <input id="file-upload" type="file" onChange={handleFileChange} accept=".pdf,.txt,.docx" style={{ display: 'none' }} disabled={isFileLoading} />
                                    </div>
                                )}

                                {planError && <p className={styles.planErrorMessage}>{planError}</p>}

                                <button type="submit" className="btn-primary btn-large" disabled={isFileLoading || !currentTopic.trim()}>
                                    {isLoading ? 'Generating...' : 'Start Learning →'}
                                </button>
                            </form>

                            {/* Feynman Quote with Image - Under button */}
                            {showGuidance && (
                                <div className={styles.heroQuoteWithImage}>
                                    <img src="/images/quotes/feynman.jpg" alt="Richard Feynman" className={styles.heroQuoteImage} onError={(e) => e.target.src = 'https://via.placeholder.com/60'} />
                                    <div className={styles.heroQuoteContent}>
                                        <p className={styles.heroQuoteText}>&quot;I learned very early the difference between knowing the name of something and knowing something.&quot;</p>
                                        <p className={styles.heroQuoteAuthor}>&mdash; Richard Feynman</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Detailed How It Works Section */}
                        {showGuidance && (
                            <div className={styles.howItWorks}>
                                <h2>🧠 The Science-Backed Learning Method</h2>

                                <div className={styles.detailedSteps}>

                                    {/* Step 1 */}
                                    <div className={styles.detailedStep}>
                                        <h3><span className={styles.stepNumberBadge}>1</span> Input a Topic</h3>
                                        <p>Input a topic you want to study. If it&apos;s complex (like &quot;Electrical Engineering&quot;), use <strong>Plan Mode</strong>. If it is less complex or a specific concept (like &quot;Circuit&quot;), use <strong>Normal Mode</strong>.</p>
                                    </div>

                                    {/* Step 2 */}
                                    <div className={styles.detailedStep}>
                                        <h3><span className={styles.stepNumberBadge}>2</span> Recursive Questioning Strategy</h3>
                                        <p>Study the topic by asking recursive questions. Read the article until you don&apos;t understand something or encounter an unfamiliar word or concept.</p>
                                        <ul>
                                            <li>Select/click or ask about the word/concept to generate a sub-article.</li>
                                            <li>If you encounter something in the sub-article you don&apos;t fully understand, click/ask about it again.</li>
                                            <li><strong>Do that all the way down the knowledge tree until you fully understand.</strong></li>
                                            <li>When you understand a sub-article, go back to the parent article and continue.</li>
                                        </ul>
                                        <div className={styles.motivationalNote}>
                                            <p><strong>DONT BE DISCOURAGED WHEN YOU GO DEEP.</strong> This is what actual learning entails! It&apos;s the process to deeply understand a topic, separating those who actually understand from those who just know the name of something.</p>
                                        </div>
                                    </div>

                                    {/* Step 3 */}
                                    <div className={styles.detailedStep}>
                                        <h3><span className={styles.stepNumberBadge}>3</span> Ingrain &amp; Validate (Feynman Method)</h3>
                                        <p>When you feel like you have a good understanding of all the parts of the topic, click <strong>Ingrain &amp; Validate</strong>. This uses the Feynman Method to help you find gaps in your knowledge by teaching it.</p>

                                        <h4>It works as follows:</h4>
                                        <div className={styles.feynmanSteps}>
                                            <div className={styles.feynmanStep}><span className={styles.feynmanStepNum}>1</span> <p><strong>Write everything you know:</strong> Don&apos;t worry about grammar or gaps. Just dump your brain.</p></div>
                                            <div className={styles.feynmanStep}><span className={styles.feynmanStepNum}>2</span> <p><strong>Teach an AI Student:</strong> Explain it simply and logically. Make mental notes of where you struggle.</p></div>
                                            <div className={styles.feynmanStep}><span className={styles.feynmanStepNum}>3</span> <p><strong>Identify Gaps:</strong> Once finished teaching, write all gaps, questions, and unsure areas down. These are added to your notes.</p></div>
                                            <div className={styles.feynmanStep}><span className={styles.feynmanStepNum}>4</span> <p><strong>Test Yourself:</strong> Click &quot;AI Questions&quot; to quiz your knowledge. Unsure answers go to your Notes.</p></div>
                                            <div className={styles.feynmanStep}><span className={styles.feynmanStepNum}>5</span> <p><strong>Fill the Gaps:</strong> Continue studying to fill these gaps. <strong>THIS IS WHERE YOU GAIN TRUTH UNDERSTANDING.</strong></p></div>
                                        </div>
                                    </div>

                                </div>
                            </div>
                        )}

                        {/* Legal Footer */}
                        <div className={styles.legalFooter}>
                            <a href="/blog" className={styles.blogLink} title="Synesis Blog">
                                <PenTool size={14} style={{ marginRight: '4px' }} /> Blog
                            </a>
                            <span className={styles.separator}>•</span>
                            <a href="/privacy" target="_blank" rel="noopener noreferrer">Privacy</a>
                            <span className={styles.separator}>•</span>
                            <a href="/terms" target="_blank" rel="noopener noreferrer">Terms</a>
                            <span className={styles.separator}>•</span>
                            <a href="/contact" target="_blank" rel="noopener noreferrer">Contact</a>
                        </div>

                    </div>
                );
            case 'study-plan':
                return (
                    <div className={styles.studyPlanPhase}>
                        {isLoading ? (
                            <div className={styles.loadingContainer}><div className="spinner"></div><p>Creating your study plan...</p></div>
                        ) : (
                            <>
                                <div className={styles.planInfoOverlay}>
                                    <h1>Exploring: {currentTopic}</h1>
                                    <p>Move, zoom, and organize your knowledge.</p>
                                    {showGuidance && (
                                        <div className={styles.mindMapInstructions}>
                                            <p>When you have learned all topics and want to ingrain your knowledge, click <strong>Master Topic</strong>. To create a different map, click <strong>Reset Map</strong>.</p>
                                        </div>
                                    )}

                                    <div className={styles.colorCustomizer}>
                                        <div className={styles.colorPalette}>
                                            {['red', 'orange', 'yellow', 'green', 'cyan', 'blue', 'purple', 'pink', 'white', 'black'].map(color => (
                                                <button
                                                    key={color}
                                                    className={`${styles.colorSwatch} ${mindMapColor === color ? styles.activeSwatch : ''} `}
                                                    style={{ backgroundColor: color === 'white' ? '#fff' : color === 'black' ? '#000' : color }}
                                                    onClick={() => setMindMapColor(color)}
                                                    title={`Set theme to ${color} `}
                                                />
                                            ))}
                                        </div>
                                        <button
                                            className={`${styles.inverseToggle} ${isInverseGradient ? styles.activeToggle : ''} `}
                                            onClick={() => setIsInverseGradient(!isInverseGradient)}
                                        >
                                            {isInverseGradient ? '☀️ Light Mode' : '🌑 Dark Mode'}
                                        </button>
                                    </div>
                                </div>
                                <MindMap
                                    data={mindMapData}
                                    onNodeClick={handleNodeClick}
                                    currentNodeId={mindMapData.currentNodeId}
                                    baseColor={mindMapColor}
                                    isInverse={isInverseGradient}
                                />
                                {showGuidance && (
                                    <div className={styles.mindMapGuidance}>
                                        <div className={styles.distributedQuote} style={{ maxWidth: '600px', margin: '0 auto', background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(5px)' }}>
                                            <img src="/images/quotes/musk.jpg" alt="Elon Musk" onError={(e) => e.target.src = 'https://via.placeholder.com/60'} />
                                            <div>
                                                <blockquote>&quot;View knowledge as a semantic tree &mdash; make sure you understand the fundamental principles, i.e. the trunk and big branches, before you get into the leaves/details.&quot;</blockquote>
                                                <cite>&mdash; Elon Musk</cite>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div className={styles.planActionsOverlay}>
                                    <button onClick={() => setPhase('topic-selection')} className="btn-secondary">Reset Map</button>
                                    <button onClick={() => setPhase('ingrain-essay')} className="btn-primary">Master Topic</button>
                                </div>
                            </>
                        )}
                    </div>
                );
            case 'study':
                return (
                    <div className={styles.studyPhase}>
                        <div
                            className={styles.studyContent}
                            style={{
                                paddingRight: notesOpen ? `${notesWidth}px` : '0',
                                transition: isResizingRef.current ? 'none' : 'padding-right 0.3s ease'
                            }}
                        >
                            {notesOpen && (
                                <div className={styles.floatingQAContainer}>
                                    <h4>Outline</h4>
                                    {floatingQA.length === 0 && <p className={styles.qaEmpty}>Type questions in notes to create outline</p>}
                                    {floatingQA.map((qa, index) => (
                                        <div key={index} className={styles.qaItem}>
                                            <p className={styles.qaQuestion}>{qa.question}</p>
                                            {qa.answer && <p className={styles.qaAnswer}>{qa.answer}</p>}
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div
                                className={`${styles.articleContainer} ${notesOpen ? styles.whited : ''}`}
                                ref={articleContainerRef}
                            >
                                {showGuidance && articleHistory.length === 0 && (
                                    <div className={styles.guidanceTip}>
                                        <p>
                                            <strong>💡 How to learn:</strong> Select any text you don&apos;t understand and click &quot;Learn More&quot; to explore deeper.
                                            Click [[bracketed concepts]] to jump to related topics. Ask questions at the bottom&mdash;try &quot;explain simpler&quot; or &quot;give me an example.&quot;
                                        </p>
                                    </div>
                                )}
                                {articleHistory.length > 0 && sourceTextForSubArticle && (
                                    <div className={styles.selectedTextBanner}>
                                        <em>Selected: &quot;{sourceTextForSubArticle}&quot;</em>
                                    </div>
                                )}
                                {isLoading ? <div className={styles.loadingContainer}><div className="spinner"></div><p>Generating article...</p></div> : (
                                    <article
                                        className={styles.article}
                                        onMouseUp={handleTextSelection}
                                        onMouseDown={handleArticleMouseDown}
                                    >
                                        {renderedArticleContent}
                                    </article>
                                )}
                                {showLearnMore && !notesOpen && (
                                    <button
                                        className={styles.learnMoreBtn}
                                        style={{
                                            position: 'absolute',
                                            left: `${learnMorePosition.x}px`,
                                            top: `${learnMorePosition.y}px`,
                                            transform: 'translate(-50%, -100%)'
                                        }}
                                        onClick={handleLearnMore}
                                        onMouseDown={(e) => e.stopPropagation()} // Prevent clearing selection when clicking button
                                    >
                                        Learn More
                                    </button>
                                )}
                            </div>
                            {notesOpen && (
                                <div
                                    className={styles.notesPanel}
                                    ref={notesPanelRef}
                                    style={{ width: `${notesWidth}px`, bottom: '100px' }}
                                >
                                    <div
                                        className={styles.resizeHandle}
                                        onMouseDown={startResizing}
                                    />
                                    <div className={styles.notesPanelContent}>
                                        {/* Tabs for Root Node Level 0 */}
                                        {(() => {
                                            const currentNode = mindMapData.nodes.find(n => n.id === mindMapData.currentNodeId);
                                            if (currentNode && currentNode.level === 0) {
                                                const rootTabs = [currentNode, ...mindMapData.nodes.filter(n => n.level === 1)];
                                                // Sort: Root first, then others alphabetically or by creation
                                                return (
                                                    <div className={styles.notesTabs}>
                                                        {rootTabs.map(tabNode => (
                                                            <button
                                                                key={tabNode.id}
                                                                className={`${styles.noteTab} ${activeNoteTab === tabNode.id ? styles.activeTab : ''}`}
                                                                onClick={() => {
                                                                    // Save current notes to OLD tab
                                                                    const oldTabId = activeNoteTab;
                                                                    setMindMapData(prev => ({
                                                                        ...prev,
                                                                        nodes: prev.nodes.map(n => n.id === oldTabId ? { ...n, notes: notesText } : n)
                                                                    }));

                                                                    // Switch to NEW tab
                                                                    setActiveNoteTab(tabNode.id);
                                                                    setNotesText(tabNode.notes || '');
                                                                }}
                                                            >
                                                                {tabNode.level === 0 ? 'General' : tabNode.label}
                                                            </button>
                                                        ))}
                                                        {/* Empty Tab (Concept requested) */}
                                                        <button className={styles.noteTab} disabled style={{ opacity: 0.5, cursor: 'default' }}>...</button>
                                                    </div>
                                                );
                                            }
                                        })()}

                                        <textarea
                                            className={styles.notesTextarea}
                                            value={notesText}
                                            onChange={(e) => setNotesText(e.target.value)}
                                            placeholder="Write your notes, questions, and insights here..."
                                            autoFocus
                                            style={{ paddingBottom: showGuidance ? '120px' : '20px' }}
                                        />
                                        {showGuidance && (
                                            <div className={styles.notesStickyBottom}>
                                                <div className={styles.noteBubbleBottom}>
                                                    💡 <strong>Tip:</strong> Write questions ending with &quot;?&quot; to auto-generate an outline. Add answers on the next line!
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className={styles.questionInput}>
                            <form onSubmit={handleQuestionSubmit}>
                                <input
                                    type="text"
                                    value={questionInput}
                                    onChange={(e) => setQuestionInput(e.target.value)}
                                    placeholder={showGuidance ? "Try: \"Why do we need this?\", \"What happens if...?\" or ask anything!" : "Ask a question..."}
                                />
                                <button type="submit" className="btn-primary">Ask</button>
                            </form>
                        </div>
                    </div >
                );
            case 'ingrain-essay':
                return (
                    <div className={styles.ingrainPhase}>
                        <div className={styles.ingrainCard}>
                            <h2>Step 1: Write Everything You Know</h2>
                            <p className={styles.topicLabel}>Topic: <strong>{currentArticleTitle || currentTopic}</strong></p>

                            {showGuidance && (
                                <div className={styles.phaseExplanation}>
                                    <h3>📝 What to do:</h3>
                                    <p>
                                        Dump everything you know about <strong>{currentArticleTitle || currentTopic}</strong> onto the page.
                                        Don&apos;t worry about grammar, structure, or if you have gaps&mdash;just get it all out of your head.
                                    </p>
                                    <div className={styles.distributedQuote} style={{ margin: '1rem 0' }}>
                                        <img src="/images/quotes/franklin.jpg" alt="Benjamin Franklin" onError={(e) => e.target.src = 'https://via.placeholder.com/60'} />
                                        <div>
                                            <blockquote>&quot;Tell me and I forget, teach me and I may remember, involve me and I learn.&quot;</blockquote>
                                            <cite>&mdash; Benjamin Franklin</cite>
                                        </div>
                                    </div>
                                    <p className={styles.phaseBenefit}>
                                        🧠 Why this works: Writing activates retrieval, which strengthens neural pathways.
                                        You&apos;re literally making the knowledge stick better in your brain.
                                    </p>
                                </div>
                            )}

                            <textarea value={essayText} onChange={(e) => setEssayText(e.target.value)} placeholder="Start writing everything you know... Don't hold back!" className={styles.essayTextarea} autoFocus />
                            <div className={styles.buttonGroup}>
                                <button onClick={() => setPhase('study')} className="btn-secondary">Back to Study</button>
                                <button onClick={() => setPhase('ingrain-teach')} className="btn-primary">Next: Teach to a Student</button>
                            </div>
                        </div>
                    </div>
                );
            case 'ingrain-teach':
                return (
                    <div className={styles.ingrainPhase}>
                        <div className={styles.ingrainCard}>
                            <h2>Step 2: Teach It Simply</h2>
                            <p className={styles.topicLabel}>Explain <strong>{currentArticleTitle || currentTopic}</strong> as if teaching a curious student.</p>

                            {/* STEP 1: Explaining */}
                            {teachingStep === 'explaining' && (
                                <>
                                    {showGuidance && (
                                        <div className={styles.phaseExplanation}>
                                            <h3>🎓 What to do:</h3>
                                            <p>
                                                Explain the topic in simple, logical terms. Use analogies. Avoid jargon.
                                                While teaching, notice where you hesitate, feel uncertain, or can&apos;t explain clearly&mdash;these are your knowledge gaps.
                                            </p>
                                            <div className={styles.distributedQuote} style={{ margin: '1rem 0' }}>
                                                <img src="/images/quotes/einstein.jpg" alt="Albert Einstein" onError={(e) => e.target.src = 'https://via.placeholder.com/60'} />
                                                <div>
                                                    <blockquote>&quot;If you can&apos;t explain it simply, you don&apos;t understand it well enough.&quot;</blockquote>
                                                    <cite>&mdash; Albert Einstein</cite>
                                                </div>
                                            </div>
                                            <p className={styles.phaseBenefit}>
                                                🧠 Why this works: Teaching forces you to organize and simplify. Your brain builds stronger connections when explaining to others.
                                                Gaps become painfully obvious when you can&apos;t put something into simple words.
                                            </p>
                                        </div>
                                    )}
                                    <div className={styles.controlsRow}>
                                        <select className={styles.languageSelect} value={language} onChange={(e) => setLanguage(e.target.value)}>
                                            <option value="en-US">English (US)</option>
                                            <option value="de-DE">Deutsch</option>
                                            <option value="es-ES">Español</option>
                                            <option value="fr-FR">Français</option>
                                            <option value="it-IT">Italiano</option>
                                            <option value="pt-BR">Português (Brasil)</option>
                                            <option value="hi-IN">Hindi</option>
                                        </select>
                                        <div className={styles.voiceControls}>
                                            {!isListening
                                                ? <button onClick={startVoiceRecognition} className="btn-primary">🎤 Start Speaking</button>
                                                : <button onClick={stopVoiceRecognition} className="btn-secondary">⏸ Stop Speaking</button>
                                            }
                                        </div>
                                    </div>

                                    <textarea
                                        value={teachingText}
                                        onChange={(e) => setTeachingText(e.target.value)}
                                        placeholder="Explain in simple terms..."
                                        className={styles.essayTextarea}
                                        autoFocus
                                    />

                                    {teachingText.length > 20 && (
                                        <button
                                            onClick={() => setTeachingStep('review')}
                                            className="btn-primary"
                                            style={{ marginTop: '1rem' }}
                                        >
                                            Done Teaching
                                        </button>
                                    )}
                                </>
                            )}

                            {/* STEP 2: Review - Show transcript, gaps input, and action buttons */}
                            {teachingStep === 'review' && (
                                <>
                                    <div className={styles.transcriptBox}>
                                        <h4>Your Explanation:</h4>
                                        <p className={styles.transcriptText}>{teachingText}</p>
                                    </div>

                                    <div className={styles.gapsSection}>
                                        <h4>📝 Notes &amp; Gaps to Study:</h4>
                                        {showGuidance && (
                                            <div className={styles.guidanceTip}>
                                                <p>
                                                    <strong>Why this matters:</strong> The gaps you noticed while teaching are golden!
                                                    They show exactly where your understanding breaks down. Write them here&mdash;they&apos;ll be saved to your notes so you can study them next.
                                                </p>
                                            </div>
                                        )}
                                        <textarea
                                            value={identifiedGaps}
                                            onChange={(e) => setIdentifiedGaps(e.target.value)}
                                            placeholder="Write questions, uncertainties, or topics you struggled to explain clearly..."
                                            rows="4"
                                        />
                                    </div>

                                    <div className={styles.buttonGroup}>
                                        <button onClick={() => setTeachingStep('explaining')} className="btn-secondary">
                                            ← Edit Explanation
                                        </button>
                                        <button onClick={handleFinishTeaching} className="btn-secondary">
                                            Study more →
                                        </button>
                                        <button onClick={generateStudentQuestion} className="btn-primary" disabled={isLoading}>
                                            {isLoading ? 'Generating...' : 'Get AI Questions'}
                                        </button>
                                    </div>
                                    {showSaveFeedback && <div className={styles.saveFeedback}>✓ Saved to Notes</div>}
                                </>
                            )}

                            {/* STEP 3: Answering - Show transcript, question, answer input */}
                            {teachingStep === 'answering' && (
                                <>
                                    <div className={styles.transcriptBox}>
                                        <h4>Your Explanation:</h4>
                                        <p className={styles.transcriptText}>{teachingText}</p>
                                    </div>

                                    <div className={styles.questionBox}>
                                        <h3>❓ Question:</h3>
                                        <p className={styles.studentQuestion}>{currentStudentQuestion}</p>
                                    </div>

                                    <textarea
                                        value={currentAnswer}
                                        onChange={(e) => setCurrentAnswer(e.target.value)}
                                        placeholder="Type your answer here..."
                                        className={styles.essayTextarea}
                                        style={{ minHeight: '150px' }}
                                        autoFocus
                                    />

                                    <div className={styles.buttonGroup}>
                                        <button onClick={handleAddToNotesAndContinue} className="btn-secondary" disabled={isLoading}>
                                            Add to Notes &amp; Continue
                                        </button>
                                        <button onClick={handleAnswerSubmit} className="btn-primary" disabled={isLoading || !currentAnswer.trim()}>
                                            {isLoading ? 'Generating...' : 'Submit Answer'}
                                        </button>
                                    </div>

                                    <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                                        <button onClick={handleFinishTeaching} className="btn-secondary">
                                            Study more →
                                        </button>
                                    </div>
                                    {showSaveFeedback && <div className={styles.saveFeedback}>✓ Saved to Notes</div>}

                                    {questionHistory.length > 0 && (
                                        <div className={styles.historySection}>
                                            <h4>Previous Q&amp;A ({questionHistory.length})</h4>
                                            {questionHistory.slice(-3).map((qa, index) => (
                                                <div key={index} className={styles.historyItem}>
                                                    <p><strong>Q:</strong> {qa.question}</p>
                                                    <p><strong>A:</strong> {qa.answer}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                );
            case 'account':
                return (
                    <AccountView
                        user={user}
                        studies={studies}
                        onBack={() => currentTopic ? setPhase('study') : setPhase('topic-selection')}
                        onDeleteStudy={handleDeleteStudy}
                        onLogout={handleLogout}
                        subscriptionTier={subscriptionTier}
                        monthlyArticleCount={monthlyArticleCount}
                        onOpenSubscription={() => setIsSubscriptionModalOpen(true)}
                        onRefreshProfile={() => user && fetchProfile(user.id)}
                    />
                );
            default: return null;
        }
    };

    // --- Subscription Handlers ---
    const handleUpgrade = async (tier, productId) => {
        if (!user) {
            alert("Please log in to upgrade.");
            return;
        }

        try {
            const response = await fetch('/api/create-checkout-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    plan: tier,
                    userId: user.id,
                    productId: productId
                })
            });

            const data = await response.json();

            if (data.url) {
                window.location.href = data.url;
            } else {
                console.error('Stripe error:', data.error);
                alert('Could not initiate payment: ' + (data.error || 'Unknown error'));
            }
        } catch (err) {
            console.error(err);
            alert('Network error. Please try again.');
        }
    };

    return (
        <>
            <main className={styles.main}>{renderHeader()}{renderPhase()}</main>
            <Sidebar
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
                user={user}
                studies={studies}
                onSelect={handleSelectStudy}
                onLogout={() => user ? handleLogout() : setIsAuthModalOpen(true)}
                onDelete={handleDeleteStudy}
                subscriptionTier={subscriptionTier}
                onOpenSubscription={() => {
                    setIsSidebarOpen(false);
                    setIsSubscriptionModalOpen(true);
                }}
            />
            <AuthModal
                isOpen={isAuthModalOpen}
                onClose={() => setIsAuthModalOpen(false)}
                onAuthSuccess={() => setIsAuthModalOpen(false)}
            />
            <SubscriptionModal
                isOpen={isSubscriptionModalOpen}
                onClose={() => setIsSubscriptionModalOpen(false)}
                currentTier={subscriptionTier}
                onUpgrade={handleUpgrade}
            />
        </>
    );
}
