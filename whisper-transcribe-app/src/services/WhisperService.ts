import RNFS from 'react-native-fs';
import { WhisperConfig, TranscriptionSegment } from '../models/Transcription';

class WhisperService {
  private config: WhisperConfig;
  private modelPath: string;
  private isModelLoaded: boolean = false;

  constructor() {
    this.config = {
      modelSize: 'tiny',
      language: 'auto',
      maxAudioLength: 300,
      sampleRate: 16000,
      channels: 1,
      enableTimestamps: true,
      maxMemoryUsage: 2048,
    };
    this.modelPath = `${RNFS.DocumentDirectoryPath}/whisper-models`;
  }

  async initializeModel(modelSize: 'tiny' | 'base' | 'small' = 'tiny'): Promise<void> {
    try {
      const modelFile = await this.getModelFile(modelSize);
      
      if (!await RNFS.exists(modelFile)) {
        await this.downloadModel(modelSize);
      }

      this.config.modelSize = modelSize;
      this.isModelLoaded = true;
    } catch (error) {
      console.error('Failed to initialize Whisper model:', error);
      throw error;
    }
  }

  private async downloadModel(modelSize: string): Promise<void> {
    const modelUrls: Record<string, string> = {
      tiny: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin',
      base: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin',
      small: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin',
    };

    const url = modelUrls[modelSize];
    const destPath = await this.getModelFile(modelSize);

    await RNFS.mkdir(this.modelPath);

    const download = RNFS.downloadFile({
      fromUrl: url,
      toFile: destPath,
      background: true,
      discretionary: true,
      progressDivider: 10,
    });

    const result = await download.promise;
    
    if (result.statusCode !== 200) {
      throw new Error(`Failed to download model: ${result.statusCode}`);
    }
  }

  private async getModelFile(modelSize: string): Promise<string> {
    return `${this.modelPath}/ggml-${modelSize}.bin`;
  }

  async transcribeAudio(audioPath: string): Promise<{
    text: string;
    segments: TranscriptionSegment[];
    processingTime: number;
  }> {
    if (!this.isModelLoaded) {
      await this.initializeModel();
    }

    const startTime = Date.now();

    try {
      const audioData = await this.preprocessAudio(audioPath);
      
      const result = await this.runInference(audioData);
      
      const processingTime = Date.now() - startTime;

      return {
        text: result.text,
        segments: result.segments,
        processingTime,
      };
    } catch (error) {
      console.error('Transcription failed:', error);
      throw error;
    }
  }

  private async preprocessAudio(audioPath: string): Promise<Float32Array> {
    const audioBuffer = await RNFS.readFile(audioPath, 'base64');
    const binaryString = atob(audioBuffer);
    const bytes = new Uint8Array(binaryString.length);
    
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    return new Float32Array(bytes.buffer);
  }

  private async runInference(audioData: Float32Array): Promise<{
    text: string;
    segments: TranscriptionSegment[];
  }> {
    const segments: TranscriptionSegment[] = [];
    let fullText = '';

    const chunkSize = this.config.sampleRate * 30;
    const numChunks = Math.ceil(audioData.length / chunkSize);

    for (let i = 0; i < numChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, audioData.length);
      const chunk = audioData.slice(start, end);

      const chunkText = await this.processChunk(chunk);
      
      segments.push({
        start: start / this.config.sampleRate,
        end: end / this.config.sampleRate,
        text: chunkText,
      });

      fullText += chunkText + ' ';
    }

    return {
      text: fullText.trim(),
      segments,
    };
  }

  private async processChunk(chunk: Float32Array): Promise<string> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve('Sample transcription text for MVP demo');
      }, 100);
    });
  }

  updateConfig(config: Partial<WhisperConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): WhisperConfig {
    return { ...this.config };
  }

  async getModelSizeOnDisk(): Promise<number> {
    try {
      const modelFile = await this.getModelFile(this.config.modelSize);
      if (await RNFS.exists(modelFile)) {
        const stat = await RNFS.stat(modelFile);
        return parseInt(stat.size);
      }
      return 0;
    } catch {
      return 0;
    }
  }
}

export default new WhisperService();