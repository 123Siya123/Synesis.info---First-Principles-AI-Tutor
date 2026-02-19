import { useState, useEffect, useRef } from 'react';
import styles from './PracticeHub.module.css';
import { BookOpen, PenTool, MessageSquare, Mic, Send, RefreshCw, X, Check, AlertTriangle, ChevronRight, GraduationCap } from 'lucide-react';
import DrawingCanvas from './DrawingCanvas';

/**
 * PracticeHub Component
 * 
 * A central hub for reinforcing knowledge through active practice.
 * Modes:
 * 1. Core Exercises: Deep reasoning scenarios to apply concepts.
 * 2. SAT Prep: Standardized test-style questions for the topic.
 * 3. Custom: Free-form conversation with the AI for specific practice.
 */
export default function PracticeHub({ user, studyId, nodeId, topic, context, onClose, onLearnMore }) {
    const [activeTab, setActiveTab] = useState('core'); // core, sat, custom
    const [isLoading, setIsLoading] = useState(false);
    const [sessionData, setSessionData] = useState({
        core: { exercises: [], currentStep: 0, answers: {}, feedback: {} },
        sat: { questions: [], answers: {}, score: null, feedback: {} },
        custom: { messages: [] }
    });
    const [input, setInput] = useState('');

    // Helper to handle drawing save
    const handleDrawingSave = (dataUrl) => {
        // In a real app, upload this to blob storage and get a URL.
        // For now, we'll append a marker or the data URL if small enough (but it's huge).
        // Let's just say "[Drawing Attached]" and maybe preview it?
        // Actually, let's just create a markdown image syntax with data URL (Not recommended for large images but okay for prototype)
        // Or better, just alert user it's attached.

        const imageMarkdown = `\n\n![My Drawing](${dataUrl})`;
        setInput(prev => prev + imageMarkdown);
        setShowDrawingCanvas(false);
    };
    const [isListening, setIsListening] = useState(false);
    const [showDrawingCanvas, setShowDrawingCanvas] = useState(false);
    const recognitionRef = useRef(null);

    // Load session on mount
    useEffect(() => {
        const loadSession = async () => {
            if (!user) return;
            try {
                const res = await fetch(`/api/practice/session?userId=${user.id}&studyId=${studyId}&nodeId=${encodeURIComponent(nodeId)}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data && data.tab_state) {
                        setSessionData(data.tab_state);
                        if (data.tab_state.lastActiveTab) setActiveTab(data.tab_state.lastActiveTab);
                    }
                }
            } catch (err) {
                console.error("Failed to load practice session", err);
            }
        };
        loadSession();
    }, [user, studyId, nodeId]);

    // Save session on change (debounced ideal, but simple here)
    const saveSession = async (newData) => {
        if (!user) return;
        const dataToSave = { ...newData, lastActiveTab: activeTab };
        try {
            await fetch('/api/practice/session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.id,
                    studyId,
                    nodeId,
                    tabState: dataToSave
                })
            });
        } catch (err) {
            console.error("Failed to save session", err);
        }
    };

    const handleGenerate = async (type) => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/practice/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type,
                    topic,
                    context,
                    currentData: sessionData[type]
                })
            });
            const data = await res.json();

            setSessionData(prev => {
                const next = { ...prev, [type]: { ...prev[type], ...data.result } };
                saveSession(next);
                return next;
            });
        } catch (err) {
            alert("Failed to generate content: " + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmitAnswer = async (type, questionId = null) => {
        if (!input.trim() && type !== 'sat') return;

        // SAT: Local Evaluation (since we have the answer key + explanation)
        if (type === 'sat' && questionId) {
            const questions = sessionData.sat.questions || [];
            const question = questions.find(q => q.id === questionId);
            const userAnswer = sessionData.sat.answers[questionId];

            if (!question || !userAnswer) return;

            setSessionData(prev => {
                const next = {
                    ...prev,
                    sat: {
                        ...prev.sat,
                        feedback: {
                            ...prev.sat.feedback,
                            [questionId]: {
                                isCorrect: userAnswer === question.correctKey,
                                explanation: question.explanation,
                                relatedTopic: question.relatedTopic
                            }
                        }
                    }
                };
                saveSession(next);
                return next;
            });
            return;
        }

        setIsLoading(true);
        try {
            const payload = {
                type,
                topic,
                context,
                input: input,
                questionId,
                currentData: sessionData[type]
            };

            const res = await fetch('/api/practice/evaluate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();

            setSessionData(prev => {
                let next;
                if (type === 'core') {
                    next = {
                        ...prev,
                        core: {
                            ...prev.core,
                            answers: { ...prev.core.answers, [prev.core.currentStep]: input },
                            feedback: { ...prev.core.feedback, [prev.core.currentStep]: data.feedback }
                        }
                    };
                } else {
                    // Custom
                    next = {
                        ...prev,
                        custom: {
                            ...prev.custom,
                            messages: [...prev.custom.messages, { role: 'user', content: input }, { role: 'assistant', content: data.reply }]
                        }
                    };
                }
                saveSession(next);
                return next;
            });
            setInput('');
        } catch (err) {
            alert("Evaluation failed: " + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    // Voice
    const toggleVoice = () => {
        if (isListening) {
            recognitionRef.current?.stop();
            setIsListening(false);
        } else {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (!SpeechRecognition) return alert("Browser does not support speech recognition.");
            const recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'en-US';

            recognition.onresult = (event) => {
                const transcript = Array.from(event.results)
                    .map(result => result[0].transcript)
                    .join('');
                setInput(transcript);
            };

            recognition.start();
            recognitionRef.current = recognition;
            setIsListening(true);
        }
    };

    // Render Helpers
    const renderCore = () => {
        const { exercises, currentStep, feedback } = sessionData.core;

        if (!exercises || exercises.length === 0) {
            return (
                <div className={styles.emptyState}>
                    <p>Apply your knowledge deeply. Generate scenarios to design, troubleshoot, and innovate.</p>
                    <button onClick={() => handleGenerate('core')} className={styles.actionBtn} disabled={isLoading}>
                        {isLoading ? <RefreshCw className={styles.spin} /> : 'Start Exercise Series'}
                    </button>
                </div>
            );
        }

        const currentExercise = exercises[currentStep];
        const currentFeedback = feedback[currentStep];

        return (
            <>
                {/* Scenario/Question Header */}
                <div className={styles.scenarioHeader}>
                    <div className={styles.scenarioTitle}>
                        Exercise {currentStep + 1} of {exercises.length} • {currentExercise.type}
                    </div>
                    <div className={styles.scenarioText}>
                        <p><strong>Scenario:</strong> {currentExercise.scenario}</p>
                        <p><strong>Your Task:</strong> {currentExercise.task}</p>
                    </div>
                </div>

                {/* Full-Width Input Section */}
                {!currentFeedback ? (
                    <div className={styles.inputSection}>
                        <textarea
                            className={styles.inputArea}
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            placeholder="Think deeply and explain your reasoning step-by-step. Use this space to brainstorm, sketch ideas with text, and develop your solution..."
                            autoFocus
                        />
                        <div className={styles.controls}>
                            <div className={styles.toolbar}>
                                <button onClick={toggleVoice} className={styles.toolBtn} title="Voice Input">
                                    <Mic size={18} color={isListening ? '#ef4444' : 'currentColor'} />
                                </button>
                                <button onClick={() => setShowDrawingCanvas(true)} className={styles.toolBtn} title="Open Drawing Canvas">
                                    <PenTool size={18} />
                                </button>
                            </div>
                            <button onClick={() => handleSubmitAnswer('core')} className={styles.actionBtn} disabled={isLoading || !input.trim()}>
                                {isLoading ? 'Evaluating...' : 'Submit Answer'}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className={styles.inputSection}>
                        <div className={styles.feedbackSection}>
                            <h4 className={styles.feedbackTitle}>
                                {currentFeedback.isCorrect ? <Check size={20} /> : <AlertTriangle size={20} />}
                                Analysis
                            </h4>
                            <div className={styles.feedbackContent}>
                                <p>{currentFeedback.text}</p>
                                {currentFeedback.principles && (
                                    <div className={styles.principles}>
                                        <strong>First Principles:</strong> {currentFeedback.principles}
                                    </div>
                                )}
                            </div>
                            <div className={styles.controls}>
                                {currentFeedback.learnMoreQuery && (
                                    <button onClick={() => onLearnMore(currentFeedback.learnMoreQuery)} className={styles.learnMoreBtn}>
                                        Learn More: {currentFeedback.learnMoreQuery}
                                    </button>
                                )}
                                {currentStep < exercises.length - 1 ? (
                                    <button
                                        onClick={() => {
                                            setSessionData(prev => ({ ...prev, core: { ...prev.core, currentStep: prev.core.currentStep + 1 } }));
                                            setInput('');
                                        }}
                                        className={styles.actionBtn}
                                    >
                                        Next Exercise <ChevronRight size={16} />
                                    </button>
                                ) : (
                                    <div style={{ textAlign: 'center', padding: '2rem', color: '#10b981', fontWeight: 600, fontSize: '1.125rem' }}>
                                        🎉 Series Complete! Excellent work.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )
                }
            </>
        );
    };

    const renderSAT = () => {
        const { questions, answers, feedback } = sessionData.sat;
        if (!questions || questions.length === 0) {
            return (
                <div className={styles.emptyState}>
                    <p>Prep for standardized tests with {topic}-specific questions.</p>
                    <button onClick={() => handleGenerate('sat')} className={styles.actionBtn} disabled={isLoading}>
                        {isLoading ? <RefreshCw className={styles.spin} /> : 'Generate SAT Questions'}
                    </button>
                </div>
            );
        }

        return (
            <div className={styles.satList}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
                    <button
                        onClick={() => {
                            if (confirm('Are you sure you want to regenerate questions? This will clear current progress.')) {
                                setSessionData(prev => ({
                                    ...prev,
                                    sat: { questions: [], answers: {}, score: null, feedback: {} }
                                }));
                                handleGenerate('sat');
                            }
                        }}
                        className={styles.secondaryBtn}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                    >
                        <RefreshCw size={16} /> Regenerate Questions
                    </button>
                </div>
                {questions.map((q, idx) => {
                    const userAnswer = answers[q.id];
                    const qFeedback = feedback[q.id];

                    return (
                        <div key={q.id} className={styles.exerciseCard}>
                            <h4>Question {idx + 1}</h4>
                            <p className={styles.questionText}>{q.text}</p>
                            <div className={styles.options}>
                                {q.options.map(opt => (
                                    <div
                                        key={opt.key}
                                        className={`
                                            ${styles.satOption} 
                                            ${userAnswer === opt.key ? styles.selected : ''}
                                            ${qFeedback && opt.key === q.correctKey ? styles.correct : ''}
                                            ${qFeedback && userAnswer === opt.key && userAnswer !== q.correctKey ? styles.incorrect : ''}
                                        `}
                                        onClick={() => {
                                            if (qFeedback) return; // Locked after feedback
                                            setSessionData(prev => ({
                                                ...prev,
                                                sat: {
                                                    ...prev.sat,
                                                    answers: { ...prev.sat.answers, [q.id]: opt.key }
                                                }
                                            }));
                                        }}
                                    >
                                        <strong>{opt.key})</strong> {opt.text}
                                    </div>
                                ))}
                            </div>
                            {!qFeedback && userAnswer && (
                                <button
                                    onClick={() => {
                                        // Evaluate this single question locally or via API? 
                                        // API is better for "Explain misses" logic requesting
                                        // For now, let's assume we fetch evaluation for this Q
                                        handleSubmitAnswer('sat', q.id); // Placeholder for eval logic
                                    }}
                                    className={styles.actionBtn}
                                >
                                    Check Answer
                                </button>
                            )}
                            {qFeedback && (
                                <div className={styles.feedbackContent}>
                                    <p>{qFeedback.explanation}</p>
                                    <button onClick={() => onLearnMore(qFeedback.relatedTopic)} className={styles.learnMoreBtn}>
                                        Review Topic
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    };

    const renderCustom = () => {
        const { messages } = sessionData.custom;
        return (
            <div className={styles.chatContainer}>
                {messages.length === 0 && (
                    <div className={styles.emptyState}>
                        <p>Ask for specific practice tasks (e.g., "Give me 2 PhD level questions").</p>
                    </div>
                )}
                {messages.map((m, i) => (
                    <div key={i} className={`${styles.chatMessage} ${m.role === 'user' ? styles.userMessage : ''}`}>
                        <div className={`${styles.messageBubble} ${m.role === 'user' ? styles.userBubble : styles.aiBubble}`}>
                            {m.content}
                        </div>
                    </div>
                ))}
                <div className={styles.inputWrapper}>
                    <textarea
                        className={styles.inputArea}
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder="Describe what you want to practice..."
                        style={{ minHeight: '80px' }}
                    />
                    <button onClick={() => handleSubmitAnswer('custom')} className={styles.actionBtn} disabled={isLoading || !input.trim()}>
                        <Send size={18} />
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div className={styles.title}>
                    <GraduationCap /> Practice Hub: {topic}
                </div>
                <button onClick={onClose} className={styles.closeBtn} title="Close Practice Hub"><X /></button>
            </div>
            <div className={styles.tabs}>
                <button
                    className={`${styles.tab} ${activeTab === 'core' ? styles.activeTab : ''}`}
                    onClick={() => setActiveTab('core')}
                >
                    Core Exercises
                </button>
                <button
                    className={`${styles.tab} ${activeTab === 'sat' ? styles.activeTab : ''}`}
                    onClick={() => setActiveTab('sat')}
                >
                    SAT Prep
                </button>
                <button
                    className={`${styles.tab} ${activeTab === 'custom' ? styles.activeTab : ''}`}
                    onClick={() => setActiveTab('custom')}
                >
                    Custom
                </button>
            </div>
            <div className={styles.content}>
                {activeTab === 'core' && renderCore()}
                {activeTab === 'sat' && renderSAT()}
                {activeTab === 'custom' && renderCustom()}
            </div>
            {showDrawingCanvas && (
                <DrawingCanvas
                    onClose={() => setShowDrawingCanvas(false)}
                    onSave={handleDrawingSave}
                />
            )}
        </div>
    );
}
