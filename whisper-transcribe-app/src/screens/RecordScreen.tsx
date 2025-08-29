import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AudioRecorderService from '../services/AudioRecorderService';
import WhisperService from '../services/WhisperService';
import StorageService from '../services/StorageService';
import { Transcription } from '../models/Transcription';

const RecordScreen: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcriptionText, setTranscriptionText] = useState('');

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isRecording && !isPaused) {
      interval = setInterval(() => {
        setRecordingTime(prev => prev + 100);
      }, 100);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording, isPaused]);

  const formatTime = (milliseconds: number): string => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const ms = Math.floor((milliseconds % 1000) / 10);
    return `${minutes.toString().padStart(2, '0')}:${seconds
      .toString()
      .padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    try {
      setTranscriptionText('');
      await AudioRecorderService.startRecording((currentTime) => {
        setRecordingTime(currentTime);
      });
      setIsRecording(true);
      setIsPaused(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to start recording. Please check permissions.');
      console.error('Recording error:', error);
    }
  };

  const stopRecording = async () => {
    if (!isRecording) return;

    try {
      setIsProcessing(true);
      const recordingResult = await AudioRecorderService.stopRecording();
      setIsRecording(false);
      setIsPaused(false);
      setRecordingTime(0);

      const transcriptionResult = await WhisperService.transcribeAudio(
        recordingResult.path
      );

      const audioPath = await StorageService.saveAudioFile(recordingResult.path);

      const transcription: Transcription = {
        id: Date.now().toString(),
        audioFilePath: audioPath,
        text: transcriptionResult.text,
        duration: recordingResult.duration,
        createdAt: new Date(),
        language: 'auto',
        modelSize: WhisperService.getConfig().modelSize,
        processingTime: transcriptionResult.processingTime,
        fileSize: recordingResult.fileSize,
      };

      await StorageService.saveTranscription(transcription);
      setTranscriptionText(transcriptionResult.text);
      
      Alert.alert('Success', 'Recording saved and transcribed successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to process recording.');
      console.error('Processing error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const pauseResumeRecording = async () => {
    try {
      if (isPaused) {
        await AudioRecorderService.resumeRecording();
        setIsPaused(false);
      } else {
        await AudioRecorderService.pauseRecording();
        setIsPaused(true);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pause/resume recording.');
      console.error('Pause/Resume error:', error);
    }
  };

  const cancelRecording = async () => {
    if (!isRecording) return;

    Alert.alert(
      'Cancel Recording',
      'Are you sure you want to cancel this recording?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await AudioRecorderService.stopRecording();
              await AudioRecorderService.deleteRecording(result.path);
              setIsRecording(false);
              setIsPaused(false);
              setRecordingTime(0);
              setTranscriptionText('');
            } catch (error) {
              console.error('Cancel error:', error);
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.timerContainer}>
        <Text style={styles.timerText}>{formatTime(recordingTime)}</Text>
        {isRecording && (
          <View style={styles.recordingIndicator}>
            <View style={[styles.recordingDot, !isPaused && styles.recordingDotActive]} />
            <Text style={styles.recordingText}>
              {isPaused ? 'PAUSED' : 'RECORDING'}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.controlsContainer}>
        {!isRecording ? (
          <TouchableOpacity
            style={[styles.mainButton, styles.recordButton]}
            onPress={startRecording}
            disabled={isProcessing}
          >
            <Icon name="mic" size={48} color="#FFF" />
          </TouchableOpacity>
        ) : (
          <View style={styles.recordingControls}>
            <TouchableOpacity
              style={[styles.secondaryButton, styles.cancelButton]}
              onPress={cancelRecording}
            >
              <Icon name="close" size={32} color="#FFF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.mainButton, styles.pauseButton]}
              onPress={pauseResumeRecording}
            >
              <Icon name={isPaused ? 'play-arrow' : 'pause'} size={48} color="#FFF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryButton, styles.stopButton]}
              onPress={stopRecording}
            >
              <Icon name="stop" size={32} color="#FFF" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {isProcessing && (
        <View style={styles.processingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.processingText}>Processing audio...</Text>
        </View>
      )}

      {transcriptionText !== '' && !isProcessing && (
        <View style={styles.transcriptionContainer}>
          <Text style={styles.transcriptionTitle}>Transcription:</Text>
          <Text style={styles.transcriptionText}>{transcriptionText}</Text>
        </View>
      )}

      <View style={styles.tipsContainer}>
        <Text style={styles.tipsTitle}>Recording Tips:</Text>
        <Text style={styles.tipText}>• Speak clearly and at a normal pace</Text>
        <Text style={styles.tipText}>• Minimize background noise</Text>
        <Text style={styles.tipText}>• Keep device close to audio source</Text>
        <Text style={styles.tipText}>• Maximum recording: 5 minutes</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  contentContainer: {
    paddingVertical: 20,
  },
  timerContainer: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 20,
  },
  timerText: {
    fontSize: 48,
    fontWeight: '200',
    color: '#333',
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#999',
    marginRight: 8,
  },
  recordingDotActive: {
    backgroundColor: '#FF3B30',
  },
  recordingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  controlsContainer: {
    alignItems: 'center',
    marginVertical: 40,
  },
  recordingControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 20,
  },
  secondaryButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordButton: {
    backgroundColor: '#FF3B30',
  },
  pauseButton: {
    backgroundColor: '#007AFF',
  },
  stopButton: {
    backgroundColor: '#FF3B30',
  },
  cancelButton: {
    backgroundColor: '#999',
  },
  processingContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  processingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  transcriptionContainer: {
    backgroundColor: '#FFF',
    margin: 20,
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  transcriptionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  transcriptionText: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  tipsContainer: {
    backgroundColor: '#FFF',
    margin: 20,
    padding: 15,
    borderRadius: 10,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  tipText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
});

export default RecordScreen;