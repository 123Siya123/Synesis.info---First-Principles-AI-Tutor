
import { useState, useEffect, useRef } from 'react';
import styles from './PomodoroTimer.module.css';
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Music, Loader2 } from 'lucide-react';
import { lofiTracks, SIGNAL_SOUND } from '../lib/lofiTracks';

export default function PomodoroTimer({ settings, isVisible, onSettingsClick, isActive, setIsActive }) {
    const [phase, setPhase] = useState('focus'); // 'focus' | 'break'
    const [timeLeft, setTimeLeft] = useState(settings.focusDuration * 60);
    const [repsDone, setRepsDone] = useState(0);
    const [showOverlay, setShowOverlay] = useState(false);
    const [overlayText, setOverlayText] = useState('');
    const [countdownSeconds, setCountdownSeconds] = useState(0);

    // Audio state
    const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
    const [volume, setVolume] = useState(0.5);
    const [isMuted, setIsMuted] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [hasError, setHasError] = useState(false);

    const audioRef = useRef(null);
    const timerRef = useRef(null);

    // Sync with settings
    useEffect(() => {
        if (!isActive) {
            setTimeLeft(phase === 'focus' ? settings.focusDuration * 60 : settings.breakDuration * 60);
        } else if (phase === 'focus' && timeLeft === settings.focusDuration * 60) {
            // If just started externally
            startFocusSequence();
        }
    }, [settings, phase, isActive]);

    // Timer Logic
    useEffect(() => {
        if (isActive && timeLeft > 0) {
            timerRef.current = setInterval(() => {
                setTimeLeft(prev => prev - 1);
            }, 1000);
        } else if (timeLeft === 0 && isActive) {
            handlePhaseComplete();
        }
        return () => clearInterval(timerRef.current);
    }, [isActive, timeLeft]);

    const handlePhaseComplete = () => {
        clearInterval(timerRef.current);
        const signal = new Audio(SIGNAL_SOUND);
        signal.play().catch(e => console.log("Audio play failed", e));

        if (phase === 'focus') {
            const nextReps = repsDone + 1;
            setRepsDone(nextReps);
            if (nextReps >= settings.repetitions) {
                // All cycles done
                setIsActive(false);
                setOverlayText('Study Session Complete!');
                setShowOverlay(true);
                setTimeout(() => setShowOverlay(false), 3000);
                setIsPlaying(false);
            } else {
                setPhase('break');
                setTimeLeft(settings.breakDuration * 60);
                setOverlayText('Break Time');
                setShowOverlay(true);
                setIsPlaying(false); // Stop music during break
                setTimeout(() => setShowOverlay(false), 2000);
            }
        } else {
            setPhase('focus');
            setTimeLeft(settings.focusDuration * 60);
            startFocusSequence();
        }
    };

    const startFocusSequence = () => {
        setOverlayText('Focus Phase Started');
        setCountdownSeconds(2);
        setShowOverlay(true);
        setIsPlaying(true);

        const ct = setInterval(() => {
            setCountdownSeconds(prev => {
                if (prev <= 1) {
                    clearInterval(ct);
                    setShowOverlay(false);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const toggleTimer = () => {
        if (!isActive) {
            startFocusSequence();
            setIsActive(true);
        } else {
            setIsActive(false);
        }
    };

    // Audio Controls
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        if (isPlaying && phase === 'focus' && isActive) {
            // Load the new track first, then play
            setIsLoading(true);
            setHasError(false);
            audio.load();
        } else {
            audio.pause();
        }
    }, [isPlaying, currentTrackIndex, phase, isActive]);

    // Handle audio events
    const handleCanPlay = () => {
        setIsLoading(false);
        setHasError(false);
        if (isPlaying && phase === 'focus' && isActive) {
            const playPromise = audioRef.current?.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.log("Playback prevented:", error);
                    setHasError(true);
                });
            }
        }
    };

    const handleLoadStart = () => {
        setIsLoading(true);
    };

    const handleError = (e) => {
        console.log("Audio error:", e);
        setIsLoading(false);
        setHasError(true);
        // Auto-skip to next track on error
        setTimeout(() => {
            handleNextTrack();
        }, 1000);
    };

    useEffect(() => {
        if (!audioRef.current) return;
        audioRef.current.volume = isMuted ? 0 : volume;
    }, [volume, isMuted]);

    const handleNextTrack = () => {
        setCurrentTrackIndex(prev => (prev + 1) % lofiTracks.length);
    };

    const handlePrevTrack = () => {
        setCurrentTrackIndex(prev => (prev - 1 + lofiTracks.length) % lofiTracks.length);
    };

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    if (!settings.enabled) return null;

    return (
        <>
            {/* Full Screen Overlay */}
            {showOverlay && (
                <div className={styles.overlay}>
                    <div className={styles.overlayContent}>
                        <h1>{overlayText}</h1>
                        {countdownSeconds > 0 && (
                            <div className={styles.countdownContainer}>
                                <p>We will notify you when to take a break.</p>
                                <div className={styles.hugeCountdown}>{countdownSeconds}</div>
                            </div>
                        )}
                        {!countdownSeconds && overlayText.includes('Break') && (
                            <p>Relax, you've earned it!</p>
                        )}
                    </div>
                </div>
            )}

            {/* Top Bar Countdown during Break */}
            {phase === 'break' && isActive && !showOverlay && (
                <div className={styles.topBarCountdown}>
                    ☕ Break: {formatTime(timeLeft)}
                </div>
            )}

            {/* Floating Timer (Visible only if isVisible/profile clicked) */}
            {isVisible && (
                <div className={styles.floatingTimer}>
                    <div className={styles.timerHeader}>
                        <h3>Pomodoro {repsDone}/{settings.repetitions}</h3>
                        <span className={phase === 'focus' ? styles.tagFocus : styles.tagBreak}>
                            {phase === 'focus' ? 'Focus' : 'Break'}
                        </span>
                    </div>
                    <div className={styles.timerDisplay}>
                        {formatTime(timeLeft)}
                    </div>
                    <div className={styles.timerControls}>
                        <button onClick={toggleTimer} className={styles.mainBtn}>
                            {isActive ? <Pause /> : <Play />}
                            {isActive ? 'Pause' : 'Start Focus'}
                        </button>
                    </div>
                    <button className={styles.settingsLink} onClick={onSettingsClick}>
                        Timer Settings
                    </button>
                </div>
            )}

            {/* Music Controls (Bottom corner, hover to reveal) */}
            <div className={styles.musicContainer}>
                <div className={styles.musicIcon}>
                    {isLoading ? <Loader2 size={20} className={styles.spinningLoader} /> : <Music size={20} />}
                    <div className={styles.musicControls}>
                        <div className={styles.trackInfo}>
                            <p>
                                {isLoading ? 'Loading...' : hasError ? 'Error - skipping...' : lofiTracks[currentTrackIndex].title}
                            </p>
                            <span>{lofiTracks[currentTrackIndex].artist}</span>
                        </div>
                        <div className={styles.controlButtons}>
                            <button onClick={handlePrevTrack}><SkipBack size={16} /></button>
                            <button onClick={() => setIsPlaying(!isPlaying)} disabled={isLoading}>
                                {isLoading ? <Loader2 size={16} className={styles.spinningLoader} /> : isPlaying ? <Pause size={16} /> : <Play size={16} />}
                            </button>
                            <button onClick={handleNextTrack}><SkipForward size={16} /></button>
                        </div>
                        <div className={styles.volumeControl}>
                            <button onClick={() => setIsMuted(!isMuted)}>
                                {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                            </button>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.01"
                                value={volume}
                                onChange={(e) => setVolume(parseFloat(e.target.value))}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <audio
                ref={audioRef}
                src={lofiTracks[currentTrackIndex].url}
                onEnded={handleNextTrack}
                onCanPlay={handleCanPlay}
                onLoadStart={handleLoadStart}
                onError={handleError}
                loop={false}
                preload="auto"
            />
        </>
    );
}
