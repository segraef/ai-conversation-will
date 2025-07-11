import { useEffect, useState } from 'react';
import { AppProvider, useApp } from './contexts/AppContext';
import { ThemeProvider, useTheme } from './components/ThemeProvider';
import { RecordButton } from './components/RecordButton';
import { TranscriptView } from './components/TranscriptView';
import { SummariesView } from './components/SummariesView';
import { QAView } from './components/QAView';
import { SettingsDialog } from './components/SettingsDialog';
import { DarkModeToggle } from './components/DarkModeToggle';
import { SoundVisualizer } from './components/SoundVisualizer';
import { Toaster } from '@/components/ui/sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  ChatText,
  ListBullets,
  Question,
  PaperPlaneRight
} from '@phosphor-icons/react';

type PanelType = 'transcript' | 'summaries' | 'qa' | null;

function AppContent() {
  const {
    settings,
    updateSettings,
    recordingState,
    toggleRecording,
    transcript,
    summaries,
    qaList,
    askQuestion,
    sttStatus,
    openaiStatus,
    updateSTTStatus,
    updateOpenAIStatus
  } = useApp();

  const { theme, setTheme } = useTheme();
  const [activePanel, setActivePanel] = useState<PanelType>(null);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      // Optionally open QA panel to show the result
      setActivePanel('qa');
    } catch (error) {
      console.error('Error asking question:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const togglePanel = (panel: PanelType) => {
    setActivePanel(activePanel === panel ? null : panel);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Main content area */}
      <div className="flex-1 flex flex-col">
        {/* Main content - take up most of the space */}
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="text-center space-y-4 max-w-md">
            {(sttStatus !== 'connected' || openaiStatus !== 'connected') && (
              <div className="text-amber-500 text-sm">
                Configure Azure services in settings to enable recording.
              </div>
            )}
          </div>
        </main>

        {/* Centered control bar */}
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-background/80 backdrop-blur-lg border border-border/50 rounded-2xl shadow-2xl p-4 md:p-6 max-w-4xl w-screen mx-4 md:mx-0 md:w-auto">
            <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6">
              {/* Record button - always centered on mobile */}
              <div className="flex-shrink-0 order-1 md:order-none">
                <RecordButton
                  isRecording={recordingState.isRecording}
                  onToggle={toggleRecording}
                  disabled={sttStatus !== 'connected' || openaiStatus !== 'connected'}
                />
              </div>

              {/* Recording status and visualizer - stack on mobile */}
              <div className="flex-1 min-w-0 max-w-xs order-2 md:order-none">
                {recordingState.isRecording && (
                  <div className="flex items-center justify-center gap-2 mb-2 md:mb-1">
                    <div className="text-xs text-muted-foreground bg-primary/10 px-2 py-1 rounded">
                      {formatRecordingTime()}
                    </div>
                  </div>
                )}

                {/* Sound visualizer */}
                <SoundVisualizer isRecording={recordingState.isRecording} />
              </div>

              {/* Message input field - full width on mobile */}
              <div className="flex-1 w-full md:max-w-sm order-3 md:order-none">
                <form onSubmit={handleMessageSubmit} className="flex gap-2">
                  <Input
                    placeholder="Ask..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    disabled={isSubmitting || (sttStatus !== 'connected' || openaiStatus !== 'connected')}
                    className="flex-1 h-9 bg-background/50 border-border/30"
                  />
                  <Button
                    type="submit"
                    disabled={!message.trim() || isSubmitting || (sttStatus !== 'connected' || openaiStatus !== 'connected')}
                    size="sm"
                    className="px-3"
                  >
                    <PaperPlaneRight size={14} />
                  </Button>
                </form>
              </div>

              {/* Control buttons - spread on mobile */}
              <div className="flex items-center gap-1 flex-shrink-0 order-4 md:order-none">
                <Button
                  variant={activePanel === 'transcript' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => togglePanel('transcript')}
                  className="h-9 w-9 p-0"
                >
                  <ChatText size={16} />
                </Button>

                <Button
                  variant={activePanel === 'summaries' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => togglePanel('summaries')}
                  className="h-9 w-9 p-0"
                >
                  <ListBullets size={16} />
                </Button>

                <Button
                  variant={activePanel === 'qa' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => togglePanel('qa')}
                  className="h-9 w-9 p-0"
                >
                  <Question size={16} />
                </Button>

                <div className="w-px h-6 bg-border mx-1" />

                <SettingsDialog
                  settings={settings}
                  onUpdateSettings={updateSettings}
                  sttStatus={sttStatus}
                  openaiStatus={openaiStatus}
                  updateSTTStatus={updateSTTStatus}
                  updateOpenAIStatus={updateOpenAIStatus}
                />

                <DarkModeToggle />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Side panels - slide in from the right, adjust for mobile */}
      {activePanel && (
        <div className="fixed inset-0 md:inset-y-0 md:right-0 md:left-auto z-40">
          {/* Mobile backdrop */}
          <div
            className="md:hidden absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setActivePanel(null)}
          />

          {/* Panel content */}
          <div className="absolute right-0 top-0 h-full w-full max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl md:min-w-[320px] lg:min-w-[400px] md:border-l bg-background shadow-xl animate-in slide-in-from-right duration-300">
            <div className="h-full flex flex-col">
              <div className="p-4 border-b flex items-center justify-between bg-muted/30">
                <h3 className="font-semibold text-sm">
                  {activePanel === 'transcript' && 'Live Transcript'}
                  {activePanel === 'summaries' && 'Summaries'}
                  {activePanel === 'qa' && 'Questions & Answers'}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActivePanel(null)}
                  className="h-6 w-6 p-0 hover:bg-background"
                >
                  <span className="text-lg">×</span>
                </Button>
              </div>

              <div className="flex-1 overflow-hidden">
                {activePanel === 'transcript' && <TranscriptView segments={transcript} />}
                {activePanel === 'summaries' && <SummariesView summaries={summaries} />}
                {activePanel === 'qa' && <QAView qaList={qaList} />}
              </div>
            </div>
          </div>
        </div>
      )}

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
