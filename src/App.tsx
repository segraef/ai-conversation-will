import { useEffect, useState } from 'react';
import { AppProvider, useApp } from './contexts/AppContext';
import { ThemeProvider, useTheme } from './components/ThemeProvider';
import { RecordButton } from './components/RecordButton';
import { TranscriptView } from './components/TranscriptView';
import { SummariesView } from './components/SummariesView';
import { QAView } from './components/QAView';
import { TranslationView } from './components/TranslationView';
import { AnalysisView } from './components/AnalysisView';
import { SettingsDialog } from './components/SettingsDialog';
import { DarkModeToggle } from './components/DarkModeToggle';
import { Toaster } from '@/components/ui/sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  ChatText,
  ListBullets,
  Question,
  PaperPlaneRight,
  Translate,
  ChartBar
} from '@phosphor-icons/react';

type ViewType = 'transcript' | 'summaries' | 'qa' | 'translation' | 'analysis';

function AppContent() {
  const {
    settings,
    updateSettings,
    recordingState,
    toggleRecording,
    transcript,
    interimText,
    summaries,
    qaList,
    translations,
    analyses,
    askQuestion,
    sttStatus,
    openaiStatus,
    updateSTTStatus,
    updateOpenAIStatus,
    audioLevel,
    audioDevices,
    refreshAudioDevices
  } = useApp();

  const { theme, setTheme } = useTheme();
  const [activeView, setActiveView] = useState<ViewType>('transcript');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get control bar height for mobile positioning
  useEffect(() => {
    const updateControlBarHeight = () => {
      const controlBar = document.querySelector('[data-control-bar]');
      if (controlBar) {
        const height = controlBar.getBoundingClientRect().height;
        document.documentElement.style.setProperty('--control-bar-height', `${height}px`);
      }
    };

    // Update on load and resize
    updateControlBarHeight();
    window.addEventListener('resize', updateControlBarHeight);

    return () => window.removeEventListener('resize', updateControlBarHeight);
  }, []);

  // Sync theme with app settings (one-way sync to avoid loops)
  useEffect(() => {
    const isDark = theme === 'dark';
    if (settings.darkMode !== isDark) {
      updateSettings({ darkMode: isDark });
    }
  }, [theme]); // Only depend on theme, not settings.darkMode to avoid loop

  // Format recording time
  const formatRecordingTime = () => {
    if (!recordingState.isRecording || !recordingState.startTime) return '00:00';

    const elapsedMs = Date.now() - recordingState.startTime;
    const seconds = Math.floor((elapsedMs / 1000) % 60);
    const minutes = Math.floor((elapsedMs / (1000 * 60)) % 60);
    const hours = Math.floor(elapsedMs / (1000 * 60 * 60));

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleMessageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await askQuestion(message.trim());
      setMessage('');
      // Switch to QA view to show the result
      setActiveView('qa');
    } catch (error) {
      console.error('Error asking question:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const switchView = (view: ViewType) => {
    setActiveView(view);
  };

  return (
    <div className="min-h-screen min-h-[100dvh] bg-background text-foreground flex flex-col">
      {/* Control bar at the top */}
      <div data-control-bar className="sticky top-0 z-[60] w-full bg-background backdrop-blur-lg border-b border-border/50 safe-area-inset-top shadow-sm">
        <div className="max-w-4xl mx-auto p-2 sm:p-3 md:p-4">
          <div className="flex flex-col gap-1.5 sm:gap-2 md:gap-3">
            {/* Top row with record button, visualizer, and controls */}
            <div className="flex flex-col sm:flex-row items-center gap-1.5 sm:gap-3 md:gap-4 justify-center">
              {/* Record button - always centered */}
              <div className="flex-shrink-0 order-1 sm:order-none">
                <RecordButton
                  isRecording={recordingState.isRecording}
                  onToggle={toggleRecording}
                  disabled={sttStatus !== 'connected' || openaiStatus !== 'connected'}
                  audioLevel={audioLevel}
                />
              </div>

              {/* Recording status */}
              <div className="min-w-0 w-full sm:w-40 md:w-48 order-2 sm:order-none flex justify-center">
                {recordingState.isRecording && (
                  <div className="text-xs text-muted-foreground bg-primary/10 px-1.5 py-0.5 rounded">
                    {formatRecordingTime()}
                  </div>
                )}
              </div>

              {/* Control buttons - responsive sizing */}
              <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0 order-3 sm:order-none overflow-x-auto">
                <Button
                  variant={activeView === 'transcript' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => switchView('transcript')}
                  className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 p-0 flex-shrink-0"
                  title="Live Transcript"
                >
                  <ChatText size={10} className="sm:w-3 sm:h-3 md:w-3.5 md:h-3.5" />
                </Button>

                <Button
                  variant={activeView === 'summaries' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => switchView('summaries')}
                  className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 p-0 flex-shrink-0"
                  title="Summaries"
                >
                  <ListBullets size={10} className="sm:w-3 sm:h-3 md:w-3.5 md:h-3.5" />
                </Button>

                <Button
                  variant={activeView === 'qa' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => switchView('qa')}
                  className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 p-0 flex-shrink-0"
                  title="Questions & Answers"
                >
                  <Question size={10} className="sm:w-3 sm:h-3 md:w-3.5 md:h-3.5" />
                </Button>

                <Button
                  variant={activeView === 'translation' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => switchView('translation')}
                  className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 p-0 flex-shrink-0"
                  title="Translation"
                >
                  <Translate size={10} className="sm:w-3 sm:h-3 md:w-3.5 md:h-3.5" />
                </Button>

                <Button
                  variant={activeView === 'analysis' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => switchView('analysis')}
                  className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 p-0 flex-shrink-0"
                  title="Analysis"
                >
                  <ChartBar size={10} className="sm:w-3 sm:h-3 md:w-3.5 md:h-3.5" />
                </Button>

                <div className="w-px h-3 sm:h-4 md:h-5 bg-border mx-0.5 sm:mx-1" />

                <SettingsDialog
                  settings={settings}
                  onUpdateSettings={updateSettings}
                  sttStatus={sttStatus}
                  openaiStatus={openaiStatus}
                  updateSTTStatus={updateSTTStatus}
                  updateOpenAIStatus={updateOpenAIStatus}
                  audioDevices={audioDevices}
                  refreshAudioDevices={refreshAudioDevices}
                />

                <DarkModeToggle />
              </div>
            </div>

            {/* Bottom row with message input field - optimized for mobile */}
            <div className="w-full max-w-xs sm:max-w-sm md:max-w-md mx-auto">
              <form onSubmit={handleMessageSubmit} className="flex gap-1.5 sm:gap-2">
                <Input
                  placeholder="Ask..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  disabled={isSubmitting || (sttStatus !== 'connected' || openaiStatus !== 'connected')}
                  className="flex-1 h-6 sm:h-7 md:h-8 text-xs sm:text-sm bg-background/50 border-border/30"
                />
                <Button
                  type="submit"
                  disabled={!message.trim() || isSubmitting || (sttStatus !== 'connected' || openaiStatus !== 'connected')}
                  size="sm"
                  className="px-1.5 sm:px-2 h-6 sm:h-7 md:h-8"
                >
                  <PaperPlaneRight size={8} className="sm:w-2.5 sm:h-2.5 md:w-3 md:h-3" />
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Main content area - views directly below control bar */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full bg-background">
          {activeView === 'transcript' && (
            <TranscriptView segments={transcript} interimText={interimText} />
          )}
          {activeView === 'summaries' && (
            <SummariesView summaries={summaries} />
          )}
          {activeView === 'qa' && (
            <QAView qaList={qaList} />
          )}
          {activeView === 'translation' && (
            <TranslationView
              translations={translations}
              showOriginal={settings.translation.showOriginal}
            />
          )}
          {activeView === 'analysis' && (
            <AnalysisView analyses={analyses} />
          )}
        </div>
      </div>

      <Toaster />
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </ThemeProvider>
  );
}

export default App;
