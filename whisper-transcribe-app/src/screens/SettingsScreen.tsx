import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Switch,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import StorageService from '../services/StorageService';
import WhisperService from '../services/WhisperService';
import { WhisperConfig } from '../models/Transcription';

interface Settings {
  modelSize: 'tiny' | 'base' | 'small';
  language: string;
  enableTimestamps: boolean;
  autoSave: boolean;
  maxRecordingLength: number;
}

const SettingsScreen: React.FC = () => {
  const [settings, setSettings] = useState<Settings>({
    modelSize: 'tiny',
    language: 'auto',
    enableTimestamps: true,
    autoSave: true,
    maxRecordingLength: 300,
  });
  const [storageInfo, setStorageInfo] = useState({
    totalTranscriptions: 0,
    totalAudioSize: 0,
    totalExportSize: 0,
  });
  const [modelSize, setModelSize] = useState(0);
  const [isLoadingModel, setIsLoadingModel] = useState(false);

  useEffect(() => {
    loadSettings();
    loadStorageInfo();
    loadModelSize();
  }, []);

  const loadSettings = async () => {
    const savedSettings = await StorageService.getSettings();
    if (savedSettings) {
      setSettings(savedSettings);
      WhisperService.updateConfig({
        modelSize: savedSettings.modelSize,
        language: savedSettings.language,
        enableTimestamps: savedSettings.enableTimestamps,
      });
    }
  };

  const loadStorageInfo = async () => {
    const info = await StorageService.getStorageInfo();
    setStorageInfo(info);
  };

  const loadModelSize = async () => {
    const size = await WhisperService.getModelSizeOnDisk();
    setModelSize(size);
  };

  const saveSettings = async (newSettings: Settings) => {
    await StorageService.saveSettings(newSettings);
    WhisperService.updateConfig({
      modelSize: newSettings.modelSize,
      language: newSettings.language,
      enableTimestamps: newSettings.enableTimestamps,
    });
  };

  const handleModelChange = async (newModel: 'tiny' | 'base' | 'small') => {
    Alert.alert(
      'Change Model',
      `Switch to ${newModel} model? This may require downloading new model files.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Change',
          onPress: async () => {
            setIsLoadingModel(true);
            try {
              await WhisperService.initializeModel(newModel);
              const updatedSettings = { ...settings, modelSize: newModel };
              setSettings(updatedSettings);
              await saveSettings(updatedSettings);
              await loadModelSize();
              Alert.alert('Success', 'Model changed successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to change model');
            } finally {
              setIsLoadingModel(false);
            }
          },
        },
      ]
    );
  };

  const handleClearData = () => {
    Alert.alert(
      'Clear All Data',
      'This will delete all transcriptions and recordings. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await StorageService.clearAllData();
              await loadStorageInfo();
              Alert.alert('Success', 'All data cleared successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear data');
            }
          },
        },
      ]
    );
  };

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const modelInfo = {
    tiny: { size: '39 MB', accuracy: 'Good', speed: 'Fast', ram: '~500 MB' },
    base: { size: '74 MB', accuracy: 'Better', speed: 'Medium', ram: '~1 GB' },
    small: { size: '244 MB', accuracy: 'Best', speed: 'Slower', ram: '~2 GB' },
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Model Settings</Text>
        
        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Whisper Model</Text>
          <Text style={styles.settingDescription}>
            Current: {settings.modelSize.toUpperCase()} ({modelInfo[settings.modelSize].ram} RAM)
          </Text>
        </View>

        <View style={styles.modelOptions}>
          {(['tiny', 'base', 'small'] as const).map((model) => (
            <TouchableOpacity
              key={model}
              style={[
                styles.modelOption,
                settings.modelSize === model && styles.modelOptionSelected,
              ]}
              onPress={() => handleModelChange(model)}
              disabled={isLoadingModel}
            >
              <Text style={styles.modelName}>{model.toUpperCase()}</Text>
              <Text style={styles.modelDetail}>Size: {modelInfo[model].size}</Text>
              <Text style={styles.modelDetail}>RAM: {modelInfo[model].ram}</Text>
              <Text style={styles.modelDetail}>{modelInfo[model].accuracy}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {isLoadingModel && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#007AFF" />
            <Text style={styles.loadingText}>Downloading model...</Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recording Settings</Text>
        
        <View style={styles.settingItem}>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Enable Timestamps</Text>
            <Switch
              value={settings.enableTimestamps}
              onValueChange={async (value) => {
                const updated = { ...settings, enableTimestamps: value };
                setSettings(updated);
                await saveSettings(updated);
              }}
              trackColor={{ false: '#767577', true: '#007AFF' }}
            />
          </View>
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Auto-save Recordings</Text>
            <Switch
              value={settings.autoSave}
              onValueChange={async (value) => {
                const updated = { ...settings, autoSave: value };
                setSettings(updated);
                await saveSettings(updated);
              }}
              trackColor={{ false: '#767577', true: '#007AFF' }}
            />
          </View>
        </View>

        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Max Recording Length</Text>
          <Text style={styles.settingValue}>
            {Math.floor(settings.maxRecordingLength / 60)} minutes
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Storage</Text>
        
        <View style={styles.storageItem}>
          <Icon name="description" size={24} color="#666" />
          <View style={styles.storageInfo}>
            <Text style={styles.storageLabel}>Transcriptions</Text>
            <Text style={styles.storageValue}>{storageInfo.totalTranscriptions}</Text>
          </View>
        </View>

        <View style={styles.storageItem}>
          <Icon name="audiotrack" size={24} color="#666" />
          <View style={styles.storageInfo}>
            <Text style={styles.storageLabel}>Audio Files</Text>
            <Text style={styles.storageValue}>{formatSize(storageInfo.totalAudioSize)}</Text>
          </View>
        </View>

        <View style={styles.storageItem}>
          <Icon name="file-download" size={24} color="#666" />
          <View style={styles.storageInfo}>
            <Text style={styles.storageLabel}>Exports</Text>
            <Text style={styles.storageValue}>{formatSize(storageInfo.totalExportSize)}</Text>
          </View>
        </View>

        <View style={styles.storageItem}>
          <Icon name="memory" size={24} color="#666" />
          <View style={styles.storageInfo}>
            <Text style={styles.storageLabel}>Model Size</Text>
            <Text style={styles.storageValue}>{formatSize(modelSize)}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.clearButton} onPress={handleClearData}>
          <Icon name="delete-forever" size={20} color="#FFF" />
          <Text style={styles.clearButtonText}>Clear All Data</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        
        <View style={styles.aboutItem}>
          <Text style={styles.aboutLabel}>Version</Text>
          <Text style={styles.aboutValue}>0.1.0 (MVP)</Text>
        </View>

        <View style={styles.aboutItem}>
          <Text style={styles.aboutLabel}>Whisper Model</Text>
          <Text style={styles.aboutValue}>OpenAI Whisper (Local)</Text>
        </View>

        <View style={styles.aboutItem}>
          <Text style={styles.aboutLabel}>Privacy</Text>
          <Text style={styles.aboutValue}>All processing done locally</Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  section: {
    backgroundColor: '#FFF',
    marginVertical: 10,
    paddingVertical: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
    paddingHorizontal: 15,
  },
  settingItem: {
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingLabel: {
    fontSize: 16,
    color: '#333',
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  settingValue: {
    fontSize: 14,
    color: '#007AFF',
    marginTop: 4,
  },
  modelOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 15,
    marginTop: 10,
  },
  modelOption: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    padding: 12,
    marginHorizontal: 5,
    borderRadius: 8,
    alignItems: 'center',
  },
  modelOptionSelected: {
    backgroundColor: '#007AFF',
  },
  modelName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  modelDetail: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  loadingText: {
    marginLeft: 10,
    color: '#007AFF',
  },
  storageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  storageInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginLeft: 15,
  },
  storageLabel: {
    fontSize: 16,
    color: '#333',
  },
  storageValue: {
    fontSize: 14,
    color: '#666',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF3B30',
    marginHorizontal: 15,
    marginTop: 15,
    padding: 12,
    borderRadius: 8,
  },
  clearButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  aboutItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  aboutLabel: {
    fontSize: 14,
    color: '#666',
  },
  aboutValue: {
    fontSize: 14,
    color: '#333',
  },
});

export default SettingsScreen;