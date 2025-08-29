import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';
import { Transcription } from '../models/Transcription';

class StorageService {
  private readonly TRANSCRIPTIONS_KEY = '@transcriptions';
  private readonly SETTINGS_KEY = '@settings';
  private readonly AUDIO_DIR = `${RNFS.DocumentDirectoryPath}/audio`;
  private readonly EXPORT_DIR = `${RNFS.DocumentDirectoryPath}/exports`;

  constructor() {
    this.initializeDirectories();
  }

  private async initializeDirectories(): Promise<void> {
    try {
      if (!(await RNFS.exists(this.AUDIO_DIR))) {
        await RNFS.mkdir(this.AUDIO_DIR);
      }
      if (!(await RNFS.exists(this.EXPORT_DIR))) {
        await RNFS.mkdir(this.EXPORT_DIR);
      }
    } catch (error) {
      console.error('Failed to create directories:', error);
    }
  }

  async saveTranscription(transcription: Transcription): Promise<void> {
    try {
      const transcriptions = await this.getTranscriptions();
      transcriptions.unshift(transcription);
      
      const maxTranscriptions = 100;
      if (transcriptions.length > maxTranscriptions) {
        const toDelete = transcriptions.splice(maxTranscriptions);
        for (const t of toDelete) {
          await this.deleteAudioFile(t.audioFilePath);
        }
      }

      await AsyncStorage.setItem(
        this.TRANSCRIPTIONS_KEY,
        JSON.stringify(transcriptions)
      );
    } catch (error) {
      console.error('Failed to save transcription:', error);
      throw error;
    }
  }

  async getTranscriptions(): Promise<Transcription[]> {
    try {
      const data = await AsyncStorage.getItem(this.TRANSCRIPTIONS_KEY);
      if (data) {
        const transcriptions = JSON.parse(data);
        return transcriptions.map((t: any) => ({
          ...t,
          createdAt: new Date(t.createdAt),
        }));
      }
      return [];
    } catch (error) {
      console.error('Failed to get transcriptions:', error);
      return [];
    }
  }

  async getTranscription(id: string): Promise<Transcription | null> {
    try {
      const transcriptions = await this.getTranscriptions();
      return transcriptions.find(t => t.id === id) || null;
    } catch (error) {
      console.error('Failed to get transcription:', error);
      return null;
    }
  }

  async updateTranscription(
    id: string,
    updates: Partial<Transcription>
  ): Promise<void> {
    try {
      const transcriptions = await this.getTranscriptions();
      const index = transcriptions.findIndex(t => t.id === id);
      
      if (index !== -1) {
        transcriptions[index] = {
          ...transcriptions[index],
          ...updates,
        };
        
        await AsyncStorage.setItem(
          this.TRANSCRIPTIONS_KEY,
          JSON.stringify(transcriptions)
        );
      }
    } catch (error) {
      console.error('Failed to update transcription:', error);
      throw error;
    }
  }

  async deleteTranscription(id: string): Promise<void> {
    try {
      const transcriptions = await this.getTranscriptions();
      const transcription = transcriptions.find(t => t.id === id);
      
      if (transcription) {
        await this.deleteAudioFile(transcription.audioFilePath);
        
        const filtered = transcriptions.filter(t => t.id !== id);
        await AsyncStorage.setItem(
          this.TRANSCRIPTIONS_KEY,
          JSON.stringify(filtered)
        );
      }
    } catch (error) {
      console.error('Failed to delete transcription:', error);
      throw error;
    }
  }

  private async deleteAudioFile(path: string): Promise<void> {
    try {
      if (await RNFS.exists(path)) {
        await RNFS.unlink(path);
      }
    } catch (error) {
      console.error('Failed to delete audio file:', error);
    }
  }

  async saveAudioFile(sourcePath: string): Promise<string> {
    try {
      const fileName = sourcePath.split('/').pop() || 'audio.m4a';
      const destPath = `${this.AUDIO_DIR}/${fileName}`;
      
      if (sourcePath !== destPath) {
        await RNFS.moveFile(sourcePath, destPath);
      }
      
      return destPath;
    } catch (error) {
      console.error('Failed to save audio file:', error);
      throw error;
    }
  }

  async exportTranscriptionAsText(
    transcription: Transcription
  ): Promise<string> {
    try {
      const fileName = `transcription_${transcription.id}.txt`;
      const filePath = `${this.EXPORT_DIR}/${fileName}`;
      
      const content = `Title: ${transcription.title || 'Untitled'}
Date: ${transcription.createdAt.toLocaleString()}
Duration: ${Math.round(transcription.duration / 1000)}s
Language: ${transcription.language}
Model: ${transcription.modelSize}

Transcription:
${transcription.text}

Tags: ${transcription.tags?.join(', ') || 'None'}`;
      
      await RNFS.writeFile(filePath, content, 'utf8');
      return filePath;
    } catch (error) {
      console.error('Failed to export transcription:', error);
      throw error;
    }
  }

  async exportTranscriptionAsJSON(
    transcription: Transcription
  ): Promise<string> {
    try {
      const fileName = `transcription_${transcription.id}.json`;
      const filePath = `${this.EXPORT_DIR}/${fileName}`;
      
      await RNFS.writeFile(filePath, JSON.stringify(transcription, null, 2), 'utf8');
      return filePath;
    } catch (error) {
      console.error('Failed to export transcription as JSON:', error);
      throw error;
    }
  }

  async saveSettings(settings: any): Promise<void> {
    try {
      await AsyncStorage.setItem(this.SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save settings:', error);
      throw error;
    }
  }

  async getSettings(): Promise<any> {
    try {
      const data = await AsyncStorage.getItem(this.SETTINGS_KEY);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Failed to get settings:', error);
      return null;
    }
  }

  async clearAllData(): Promise<void> {
    try {
      const transcriptions = await this.getTranscriptions();
      for (const t of transcriptions) {
        await this.deleteAudioFile(t.audioFilePath);
      }
      
      await AsyncStorage.multiRemove([
        this.TRANSCRIPTIONS_KEY,
        this.SETTINGS_KEY,
      ]);
      
      if (await RNFS.exists(this.EXPORT_DIR)) {
        await RNFS.unlink(this.EXPORT_DIR);
        await RNFS.mkdir(this.EXPORT_DIR);
      }
    } catch (error) {
      console.error('Failed to clear all data:', error);
      throw error;
    }
  }

  async getStorageInfo(): Promise<{
    totalTranscriptions: number;
    totalAudioSize: number;
    totalExportSize: number;
  }> {
    try {
      const transcriptions = await this.getTranscriptions();
      let totalAudioSize = 0;
      let totalExportSize = 0;

      for (const t of transcriptions) {
        if (await RNFS.exists(t.audioFilePath)) {
          const stat = await RNFS.stat(t.audioFilePath);
          totalAudioSize += parseInt(stat.size);
        }
      }

      if (await RNFS.exists(this.EXPORT_DIR)) {
        const exports = await RNFS.readDir(this.EXPORT_DIR);
        for (const file of exports) {
          totalExportSize += parseInt(file.size);
        }
      }

      return {
        totalTranscriptions: transcriptions.length,
        totalAudioSize,
        totalExportSize,
      };
    } catch (error) {
      console.error('Failed to get storage info:', error);
      return {
        totalTranscriptions: 0,
        totalAudioSize: 0,
        totalExportSize: 0,
      };
    }
  }
}

export default new StorageService();