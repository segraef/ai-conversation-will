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
import { SoundVisualizer } from './components/SoundVisualizer';
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

type PanelType = 'transcript' | 'summaries' | 'qa' | 'translation' | 'analysis' | null;

function AppContent() {
  const {
    settings,
    updateSettings,
    recordingState,
    toggleRecording,
    transcript,
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
    <div className="min-h-screen min-h-[100dvh] bg-background text-foreground flex flex-col">
      {/* Control bar at the top */}
      <div className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-lg border-b border-border/50 safe-area-inset-top">
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
                />
              </div>

              {/* Recording status and visualizer */}
              <div className="min-w-0 w-full sm:w-40 md:w-48 order-2 sm:order-none">
                {recordingState.isRecording && (
                  <div className="flex items-center justify-center gap-2 mb-0.5 sm:mb-1">
                    <div className="text-xs text-muted-foreground bg-primary/10 px-1.5 py-0.5 rounded">
                      {formatRecordingTime()}
                    </div>
                  </div>
                )}

                {/* Sound visualizer */}
                <SoundVisualizer isRecording={recordingState.isRecording} audioLevel={audioLevel} />
              </div>

              {/* Control buttons - responsive sizing */}
              <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0 order-3 sm:order-none overflow-x-auto">
                <Button
                  variant={activePanel === 'transcript' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => togglePanel('transcript')}
                  className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 p-0 flex-shrink-0"
                  title="Transcript"
                >
                  <ChatText size={10} className="sm:w-3 sm:h-3 md:w-3.5 md:h-3.5" />
                </Button>

                <Button
                  variant={activePanel === 'summaries' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => togglePanel('summaries')}
                  className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 p-0 flex-shrink-0"
                  title="Summaries"
                >
                  <ListBullets size={10} className="sm:w-3 sm:h-3 md:w-3.5 md:h-3.5" />
                </Button>

                <Button
                  variant={activePanel === 'qa' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => togglePanel('qa')}
                  className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 p-0 flex-shrink-0"
                  title="Q&A"
                >
                  <Question size={10} className="sm:w-3 sm:h-3 md:w-3.5 md:h-3.5" />
                </Button>

                <Button
                  variant={activePanel === 'translation' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => togglePanel('translation')}
                  className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 p-0 flex-shrink-0"
                  title="Translation"
                >
                  <Translate size={10} className="sm:w-3 sm:h-3 md:w-3.5 md:h-3.5" />
                </Button>

                <Button
                  variant={activePanel === 'analysis' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => togglePanel('analysis')}
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

      {/* Main content area with views */}
      <div className="flex-1 flex">
        {/* Center content when no panel is active */}
        <div className={`flex-1 ${activePanel ? 'hidden sm:flex' : 'flex'} flex-col`}>
          <main className="flex-1 flex items-center justify-center p-4">
            <div className="text-center space-y-4 max-w-md">
              {(sttStatus !== 'connected' || openaiStatus !== 'connected') && (
                <div className="text-amber-500 text-sm">
                  Configure Azure services in settings to enable recording.
                </div>
              )}
            </div>
          </main>
        </div>

        {/* Views panel - now positioned below control bar */}
        {activePanel && (
          <div className="fixed inset-0 sm:relative sm:inset-auto z-40 flex flex-col sm:w-80 md:w-96 lg:w-[28rem] xl:w-[32rem]">
            {/* Mobile overlay */}
            <div
              className="sm:hidden absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setActivePanel(null)}
            />

            {/* Panel content - positioned below control bar on mobile */}
            <div className="absolute inset-x-2 top-2 bottom-2 sm:relative sm:inset-0 sm:top-0 sm:bottom-0 sm:h-full bg-background border border-border/50 sm:border-l rounded-lg sm:rounded-none sm:rounded-l-lg shadow-xl overflow-hidden">
              <div className="h-full flex flex-col">
                <div className="p-2 sm:p-3 border-b flex items-center justify-between bg-muted/30">
                  <h3 className="font-medium text-xs">
                    {activePanel === 'transcript' && 'Live Transcript'}
                    {activePanel === 'summaries' && 'Summaries'}
                    {activePanel === 'qa' && 'Questions & Answers'}
                    {activePanel === 'translation' && 'Translation'}
                    {activePanel === 'analysis' && 'Analysis'}
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActivePanel(null)}
                    className="h-5 w-5 p-0 hover:bg-background"
                  >
                    <span className="text-sm">×</span>
                  </Button>
                </div>

                <div className="flex-1 overflow-hidden">
                  {activePanel === 'transcript' && <TranscriptView segments={transcript} />}
                  {activePanel === 'summaries' && <SummariesView summaries={summaries} />}
                  {activePanel === 'qa' && <QAView qaList={qaList} />}
                  {activePanel === 'translation' && (
                    <TranslationView
                      translations={translations}
                      showOriginal={settings.translation.showOriginal}
                    />
                  )}
                  {activePanel === 'analysis' && <AnalysisView analyses={analyses} />}
                </div>
              </div>
            </div>
          </div>
        )}
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
