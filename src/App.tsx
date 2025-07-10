import { useEffect } from 'react';
import { AppProvider, useApp } from './contexts/AppContext';
import { ThemeProvider } from './components/ThemeProvider';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { RecordButton } from './components/RecordButton';
import { TranscriptView } from './components/TranscriptView';
import { SummariesView } from './components/SummariesView';
import { QAView } from './components/QAView';
import { SettingsDialog } from './components/SettingsDialog';
import { Toaster } from '@/components/ui/sonner';

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
    activeView,
    setActiveView,
    sttStatus,
    openaiStatus
  } = useApp();
  
  // Handle theme changes
  useEffect(() => {
    const root = window.document.documentElement;
    if (settings.darkMode) {
      root.classList.remove('light');
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }
  }, [settings.darkMode]);
  
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
  
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold">AI Conversation Assistant</h1>
          <SettingsDialog 
            settings={settings}
            onUpdateSettings={updateSettings}
            sttStatus={sttStatus}
            openaiStatus={openaiStatus}
          />
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex flex-col md:flex-row items-center gap-4 justify-center md:justify-between">
          <div className="flex items-center gap-4">
            <RecordButton 
              isRecording={recordingState.isRecording} 
              onToggle={toggleRecording}
              disabled={sttStatus !== 'connected' || openaiStatus !== 'connected'}
            />
            <div className="space-y-1">
              <h2 className="text-lg font-medium">
                {recordingState.isRecording ? 'Recording...' : 'Ready to Record'}
              </h2>
              {recordingState.isRecording && (
                <div className="text-sm text-muted-foreground">{formatRecordingTime()}</div>
              )}
            </div>
          </div>
          
          <div className="text-sm text-muted-foreground">
            {(sttStatus !== 'connected' || openaiStatus !== 'connected') && (
              <div className="text-amber-500">
                Configure Azure services in settings to enable recording.
              </div>
            )}
          </div>
        </div>
        
        <Tabs value={activeView} onValueChange={(value: any) => setActiveView(value)} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="transcript">Live Transcript</TabsTrigger>
            <TabsTrigger value="summaries">Summaries</TabsTrigger>
            <TabsTrigger value="qa">Q&A</TabsTrigger>
          </TabsList>
          
          <TabsContent value="transcript" className="h-full">
            <TranscriptView segments={transcript} />
          </TabsContent>
          
          <TabsContent value="summaries" className="h-full">
            <SummariesView summaries={summaries} />
          </TabsContent>
          
          <TabsContent value="qa" className="h-full">
            <QAView qaList={qaList} onAskQuestion={askQuestion} />
          </TabsContent>
        </Tabs>
      </main>
      
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