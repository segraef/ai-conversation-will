import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AppSettings } from '@/types';
import { Gear, Check, X, CloudCheck } from '@phosphor-icons/react';
import { useState, useEffect } from 'react';
import { ConnectionStatus } from '@/types';

interface SettingsDialogProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  sttStatus: ConnectionStatus;
  openaiStatus: ConnectionStatus;
}

export function SettingsDialog({ 
  settings, 
  onUpdateSettings,
  sttStatus,
  openaiStatus
}: SettingsDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
  
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
              <div className="flex items-center justify-between">
                <Label htmlFor="dark-mode">Dark Mode</Label>
                <Switch 
                  id="dark-mode" 
                  checked={localSettings.darkMode}
                  onCheckedChange={(checked) => {
                    setLocalSettings({
                      ...localSettings,
                      darkMode: checked
                    });
                  }}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="audio-source">Audio Source</Label>
              <Select 
                value={localSettings.audioSource}
                onValueChange={(value: 'microphone' | 'system') => {
                  setLocalSettings({
                    ...localSettings,
                    audioSource: value
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
                value={localSettings.chunkInterval}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  if (!isNaN(value) && value > 0) {
                    setLocalSettings({
                      ...localSettings,
                      chunkInterval: value
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
              <Label htmlFor="stt-region">Region</Label>
              <Input 
                id="stt-region"
                placeholder="Auto-detected from endpoint URL"
                value={localSettings.stt.region}
                disabled
              />
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
          </TabsContent>
        </Tabs>
        
        <div className="flex justify-end mt-4">
          <Button onClick={applySettings}>Save Changes</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}