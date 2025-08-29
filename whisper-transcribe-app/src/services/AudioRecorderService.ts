import AudioRecorderPlayer, {
  AVEncoderAudioQualityIOSType,
  AVEncodingOption,
  AudioEncoderAndroidType,
  AudioSourceAndroidType,
  OutputFormatAndroidType,
} from 'react-native-audio-recorder-player';
import RNFS from 'react-native-fs';
import { Platform, PermissionsAndroid } from 'react-native';

class AudioRecorderService {
  private audioRecorderPlayer: AudioRecorderPlayer;
  private currentRecordingPath: string | null = null;
  private isRecording: boolean = false;
  private recordingStartTime: number = 0;
  private onRecordingProgress?: (currentTime: number) => void;

  constructor() {
    this.audioRecorderPlayer = new AudioRecorderPlayer();
  }

  async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'android') {
      try {
        const grants = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        ]);

        if (
          grants['android.permission.WRITE_EXTERNAL_STORAGE'] ===
            PermissionsAndroid.RESULTS.GRANTED &&
          grants['android.permission.READ_EXTERNAL_STORAGE'] ===
            PermissionsAndroid.RESULTS.GRANTED &&
          grants['android.permission.RECORD_AUDIO'] ===
            PermissionsAndroid.RESULTS.GRANTED
        ) {
          return true;
        } else {
          console.log('All required permissions not granted');
          return false;
        }
      } catch (err) {
        console.warn(err);
        return false;
      }
    } else {
      return true;
    }
  }

  async startRecording(onProgress?: (currentTime: number) => void): Promise<string> {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      throw new Error('Recording permissions not granted');
    }

    const timestamp = new Date().getTime();
    const fileName = `recording_${timestamp}.m4a`;
    const path = Platform.select({
      ios: `${RNFS.DocumentDirectoryPath}/${fileName}`,
      android: `${RNFS.ExternalDirectoryPath}/${fileName}`,
    });

    if (!path) {
      throw new Error('Could not determine recording path');
    }

    this.currentRecordingPath = path;
    this.onRecordingProgress = onProgress;
    this.recordingStartTime = Date.now();

    const audioSet = {
      AudioEncoderAndroid: AudioEncoderAndroidType.AAC,
      AudioSourceAndroid: AudioSourceAndroidType.MIC,
      AVEncoderAudioQualityKeyIOS: AVEncoderAudioQualityIOSType.high,
      AVNumberOfChannelsKeyIOS: 1,
      AVFormatIDKeyIOS: AVEncodingOption.aac,
      OutputFormatAndroid: OutputFormatAndroidType.MPEG_4,
      AudioSamplingRateAndroid: 16000,
      AudioChannelsAndroid: 1,
    };

    await this.audioRecorderPlayer.startRecorder(path, audioSet);
    
    this.audioRecorderPlayer.addRecordBackListener((e) => {
      if (this.onRecordingProgress) {
        this.onRecordingProgress(e.currentPosition);
      }
    });

    this.isRecording = true;
    return path;
  }

  async stopRecording(): Promise<{
    path: string;
    duration: number;
    fileSize: number;
  }> {
    if (!this.isRecording || !this.currentRecordingPath) {
      throw new Error('No recording in progress');
    }

    const result = await this.audioRecorderPlayer.stopRecorder();
    this.audioRecorderPlayer.removeRecordBackListener();
    
    const duration = Date.now() - this.recordingStartTime;
    
    const fileInfo = await RNFS.stat(this.currentRecordingPath);
    const fileSize = parseInt(fileInfo.size);

    this.isRecording = false;
    const recordingPath = this.currentRecordingPath;
    this.currentRecordingPath = null;
    this.onRecordingProgress = undefined;

    return {
      path: recordingPath,
      duration,
      fileSize,
    };
  }

  async pauseRecording(): Promise<void> {
    if (!this.isRecording) {
      throw new Error('No recording in progress');
    }
    await this.audioRecorderPlayer.pauseRecorder();
  }

  async resumeRecording(): Promise<void> {
    if (!this.isRecording) {
      throw new Error('No recording to resume');
    }
    await this.audioRecorderPlayer.resumeRecorder();
  }

  getIsRecording(): boolean {
    return this.isRecording;
  }

  getCurrentRecordingPath(): string | null {
    return this.currentRecordingPath;
  }

  async deleteRecording(path: string): Promise<void> {
    try {
      if (await RNFS.exists(path)) {
        await RNFS.unlink(path);
      }
    } catch (error) {
      console.error('Failed to delete recording:', error);
    }
  }

  formatTime(milliseconds: number): string {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds
      .toString()
      .padStart(2, '0')}`;
  }

  async getRecordingSize(path: string): Promise<number> {
    try {
      const fileInfo = await RNFS.stat(path);
      return parseInt(fileInfo.size);
    } catch {
      return 0;
    }
  }
}

export default new AudioRecorderService();