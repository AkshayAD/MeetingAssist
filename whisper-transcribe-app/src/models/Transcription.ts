export interface Transcription {
  id: string;
  audioFilePath: string;
  text: string;
  duration: number;
  createdAt: Date;
  language: string;
  modelSize: 'tiny' | 'base' | 'small';
  processingTime: number;
  fileSize: number;
  title?: string;
  tags?: string[];
}

export interface TranscriptionSegment {
  start: number;
  end: number;
  text: string;
  confidence?: number;
}

export interface WhisperConfig {
  modelSize: 'tiny' | 'base' | 'small';
  language: 'auto' | string;
  maxAudioLength: number;
  sampleRate: number;
  channels: number;
  enableTimestamps: boolean;
  maxMemoryUsage: number;
}