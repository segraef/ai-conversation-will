import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AppSettings } from '@/contexts/types';
import { Gear, Check, X, CloudCheck, Play } from '@phosphor-icons/react';
import { useState, useEffect } from 'react';
import { ConnectionStatus } from '@/contexts/types';
import { toast } from 'sonner';

interface SettingsDialogProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  sttStatus: ConnectionStatus;
  openaiStatus: ConnectionStatus;
  updateSTTStatus: (status: ConnectionStatus) => void;
  updateOpenAIStatus: (status: ConnectionStatus) => void;
}

export function SettingsDialog({
  settings,
  onUpdateSettings,
  sttStatus,
  openaiStatus,
  updateSTTStatus,
  updateOpenAIStatus
}: SettingsDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
  const [testingSTT, setTestingSTT] = useState(false);
  const [testingOpenAI, setTestingOpenAI] = useState(false);

  // Update local settings when props change
  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  // Extract region from endpoint URL
  useEffect(() => {
    if (localSettings.stt.endpoint) {
      try {
        const url = new URL(localSettings.stt.endpoint);
        const hostnameParts = url.hostname.split('.');
        if (hostnameParts.length > 0) {
          const possibleRegion = hostnameParts[0];
          setLocalSettings(prev => ({
            ...prev,
            stt: {
              ...prev.stt,
              region: possibleRegion
            }
          }));
        }
      } catch (error) {
        // Invalid URL, don't update region
      }
    }
  }, [localSettings.stt.endpoint]);

  // Apply settings changes
  const applySettings = () => {
    onUpdateSettings(localSettings);
    setIsOpen(false);
  };

  // Test STT connection
  const testSTTConnection = async () => {
    if (!localSettings.stt.endpoint || !localSettings.stt.subscriptionKey || !localSettings.stt.region) {
      toast.error('Please enter endpoint URL, subscription key, and region');
      return;
    }

    setTestingSTT(true);
    updateSTTStatus('connecting');

    try {
      // Test the Speech-to-Text connection using the correct token endpoint format
      // Use the region to construct the correct token endpoint: https://<region>.api.cognitive.microsoft.com/sts/v1.0/issuetoken
      const tokenUrl = `https://${localSettings.stt.region}.api.cognitive.microsoft.com/sts/v1.0/issuetoken`;
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': localSettings.stt.subscriptionKey,
        },
      });

      if (response.ok) {
        toast.success('STT connection successful!');
        updateSTTStatus('connected');
        // Apply settings immediately to ensure they're saved
        onUpdateSettings(localSettings);
      } else {
        toast.error(`STT connection failed: ${response.status} ${response.statusText}`);
        updateSTTStatus('error');
      }
    } catch (error) {
      console.error('STT connection test failed:', error);
      toast.error('STT connection failed. Please check your settings.');
      updateSTTStatus('error');
    } finally {
      setTestingSTT(false);
    }
  };

  // Test OpenAI connection
  const testOpenAIConnection = async () => {
    if (!localSettings.openai.endpoint || !localSettings.openai.subscriptionKey) {
      toast.error('Please enter both endpoint URL and subscription key');
      return;
    }

    setTestingOpenAI(true);
    updateOpenAIStatus('connecting');

    try {
      // Test the OpenAI connection with a simple request
      const response = await fetch(`${localSettings.openai.endpoint}/openai/deployments/${localSettings.openai.deploymentName}/chat/completions?api-version=2024-02-15-preview`, {
        method: 'POST',
        headers: {
          'api-key': localSettings.openai.subscriptionKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 5,
        }),
      });

      if (response.ok) {
        toast.success('OpenAI connection successful!');
        updateOpenAIStatus('connected');
        // Apply settings immediately to ensure they're saved
        onUpdateSettings(localSettings);
      } else {
        toast.error(`OpenAI connection failed: ${response.status} ${response.statusText}`);
        updateOpenAIStatus('error');
      }
    } catch (error) {
      console.error('OpenAI connection test failed:', error);
      toast.error('OpenAI connection failed. Please check your settings.');
      updateOpenAIStatus('error');
    } finally {
      setTestingOpenAI(false);
    }
  };

  // Reset local settings when dialog is opened
  useEffect(() => {
    if (isOpen) {
      setLocalSettings(settings);
    }
  }, [isOpen, settings]);

  // Render connection status icon
  const renderStatusIcon = (status: ConnectionStatus) => {
    switch (status) {
      case 'connected':
        return <Check className="h-5 w-5 text-green-500" />;
      case 'connecting':
        return <CloudCheck className="h-5 w-5 text-amber-500 animate-pulse" />;
      case 'error':
        return <X className="h-5 w-5 text-red-500" />;
      default:
        return <div className="h-5 w-5 rounded-full bg-muted" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon">
          <Gear className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Configure your Azure Speech-to-Text and OpenAI services for the AI Conversation Assistant.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="general" className="mt-4">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="stt">Speech to Text</TabsTrigger>
            <TabsTrigger value="openai">OpenAI</TabsTrigger>
          </TabsList>

          {/* General Settings */}
          <TabsContent value="general" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="audio-source">Audio Source</Label>
              <Select
                value={localSettings.audio.source}
                onValueChange={(value: 'microphone' | 'system') => {
                  setLocalSettings({
                    ...localSettings,
                    audio: {
                      ...localSettings.audio,
                      source: value
                    }
                  });
                }}
              >
                <SelectTrigger id="audio-source">
                  <SelectValue placeholder="Select audio source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="microphone">Microphone</SelectItem>
                  <SelectItem value="system">System Audio (if supported)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Note: System audio capture may be limited by browser capabilities.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="chunk-interval">Chunk Interval (minutes)</Label>
              <Input
                id="chunk-interval"
                type="number"
                min="1"
                max="60"
                value={localSettings.audio.chunkIntervalMinutes}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  if (!isNaN(value) && value > 0) {
                    setLocalSettings({
                      ...localSettings,
                      audio: {
                        ...localSettings.audio,
                        chunkIntervalMinutes: value
                      }
                    });
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">
                Interval for generating summary chunks from the transcript.
              </p>
            </div>
          </TabsContent>

          {/* Speech to Text Settings */}
          <TabsContent value="stt" className="space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium">Connection Status:</h3>
              {renderStatusIcon(sttStatus)}
              <span className="text-sm capitalize">{sttStatus}</span>
            </div>

            <div className="space-y-2">
              <Label htmlFor="stt-endpoint">Endpoint URL</Label>
              <Input
                id="stt-endpoint"
                placeholder="https://[region].stt.speech.microsoft.com"
                value={localSettings.stt.endpoint}
                onChange={(e) => {
                  setLocalSettings({
                    ...localSettings,
                    stt: {
                      ...localSettings.stt,
                      endpoint: e.target.value
                    }
                  });
                }}
              />
              <p className="text-xs text-muted-foreground">
                The region will be auto-detected from the endpoint URL.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="stt-key">Subscription Key</Label>
              <Input
                id="stt-key"
                type="password"
                placeholder="Enter your Azure Speech subscription key"
                value={localSettings.stt.subscriptionKey}
                onChange={(e) => {
                  setLocalSettings({
                    ...localSettings,
                    stt: {
                      ...localSettings.stt,
                      subscriptionKey: e.target.value
                    }
                  });
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="region">Region</Label>
              <Input
                id="region"
                placeholder="e.g., eastus, westus"
                value={localSettings.stt.region}
                disabled
              />
            </div>

            {/* Language Detection Settings */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Switch
                  id="enable-language-detection"
                  checked={localSettings.stt.enableLanguageDetection || false}
                  onCheckedChange={(checked) => {
                    setLocalSettings({
                      ...localSettings,
                      stt: {
                        ...localSettings.stt,
                        enableLanguageDetection: checked,
                        candidateLanguages: checked ? ['en-US', 'es-ES', 'fr-FR', 'de-DE'] : undefined
                      }
                    });
                  }}
                />
                <Label htmlFor="enable-language-detection">Enable Language Auto-Detection</Label>
              </div>
              <p className="text-xs text-muted-foreground">
                Automatically detect spoken language from a list of candidates
              </p>
            </div>

            {localSettings.stt.enableLanguageDetection && (
              <div className="space-y-2">
                <Label>Candidate Languages</Label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { code: 'en-US', name: 'English (US)' },
                    { code: 'es-ES', name: 'Spanish (Spain)' },
                    { code: 'fr-FR', name: 'French (France)' },
                    { code: 'de-DE', name: 'German' },
                    { code: 'it-IT', name: 'Italian' },
                    { code: 'pt-BR', name: 'Portuguese (Brazil)' },
                    { code: 'ja-JP', name: 'Japanese' },
                    { code: 'ko-KR', name: 'Korean' },
                    { code: 'zh-CN', name: 'Chinese (Simplified)' },
                    { code: 'nl-NL', name: 'Dutch' },
                    { code: 'ru-RU', name: 'Russian' },
                    { code: 'ar-SA', name: 'Arabic' }
                  ].map((lang) => (
                    <div key={lang.code} className="flex items-center space-x-2">
                      <Switch
                        id={`lang-${lang.code}`}
                        checked={localSettings.stt.candidateLanguages?.includes(lang.code) || false}
                        onCheckedChange={(checked) => {
                          const currentLanguages = localSettings.stt.candidateLanguages || [];
                          const newLanguages = checked
                            ? [...currentLanguages, lang.code]
                            : currentLanguages.filter(l => l !== lang.code);
                          setLocalSettings({
                            ...localSettings,
                            stt: {
                              ...localSettings.stt,
                              candidateLanguages: newLanguages
                            }
                          });
                        }}
                      />
                      <Label htmlFor={`lang-${lang.code}`} className="text-xs">
                        {lang.name}
                      </Label>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Select which languages to detect. More languages may reduce accuracy.
                </p>
              </div>
            )}

            <div className="flex justify-end">
              <Button
                onClick={testSTTConnection}
                disabled={testingSTT || !localSettings.stt.endpoint || !localSettings.stt.subscriptionKey}
                variant="outline"
                size="sm"
              >
                {testingSTT ? (
                  <>
                    <CloudCheck className="h-4 w-4 mr-2 animate-pulse" />
                    Testing...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Test Connection
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          {/* OpenAI Settings */}
          <TabsContent value="openai" className="space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium">Connection Status:</h3>
              {renderStatusIcon(openaiStatus)}
              <span className="text-sm capitalize">{openaiStatus}</span>
            </div>

            <div className="space-y-2">
              <Label htmlFor="openai-endpoint">Endpoint URL</Label>
              <Input
                id="openai-endpoint"
                placeholder="https://[resource-name].openai.azure.com"
                value={localSettings.openai.endpoint}
                onChange={(e) => {
                  setLocalSettings({
                    ...localSettings,
                    openai: {
                      ...localSettings.openai,
                      endpoint: e.target.value
                    }
                  });
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="openai-key">Subscription Key</Label>
              <Input
                id="openai-key"
                type="password"
                placeholder="Enter your Azure OpenAI subscription key"
                value={localSettings.openai.subscriptionKey}
                onChange={(e) => {
                  setLocalSettings({
                    ...localSettings,
                    openai: {
                      ...localSettings.openai,
                      subscriptionKey: e.target.value
                    }
                  });
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="openai-deployment">Deployment Name</Label>
              <Input
                id="openai-deployment"
                placeholder="e.g., gpt-4"
                value={localSettings.openai.deploymentName}
                onChange={(e) => {
                  setLocalSettings({
                    ...localSettings,
                    openai: {
                      ...localSettings.openai,
                      deploymentName: e.target.value
                    }
                  });
                }}
              />
            </div>

            <div className="flex justify-end">
              <Button
                onClick={testOpenAIConnection}
                disabled={testingOpenAI || !localSettings.openai.endpoint || !localSettings.openai.subscriptionKey || !localSettings.openai.deploymentName}
                variant="outline"
                size="sm"
              >
                {testingOpenAI ? (
                  <>
                    <CloudCheck className="h-4 w-4 mr-2 animate-pulse" />
                    Testing...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Test Connection
                  </>
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end mt-4">
          <Button onClick={applySettings}>Save Changes</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
