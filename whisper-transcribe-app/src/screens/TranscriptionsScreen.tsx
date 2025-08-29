import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
  TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Share from 'react-native-share';
import StorageService from '../services/StorageService';
import { Transcription } from '../models/Transcription';

const TranscriptionsScreen: React.FC = () => {
  const [transcriptions, setTranscriptions] = useState<Transcription[]>([]);
  const [filteredTranscriptions, setFilteredTranscriptions] = useState<Transcription[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const loadTranscriptions = useCallback(async () => {
    try {
      const data = await StorageService.getTranscriptions();
      setTranscriptions(data);
      setFilteredTranscriptions(data);
    } catch (error) {
      console.error('Failed to load transcriptions:', error);
    }
  }, []);

  useEffect(() => {
    loadTranscriptions();
  }, [loadTranscriptions]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredTranscriptions(transcriptions);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = transcriptions.filter(
        t =>
          t.text.toLowerCase().includes(query) ||
          t.title?.toLowerCase().includes(query) ||
          t.tags?.some(tag => tag.toLowerCase().includes(query))
      );
      setFilteredTranscriptions(filtered);
    }
  }, [searchQuery, transcriptions]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadTranscriptions();
    setIsRefreshing(false);
  }, [loadTranscriptions]);

  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (milliseconds: number): string => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      'Delete Transcription',
      'Are you sure you want to delete this transcription?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await StorageService.deleteTranscription(id);
              await loadTranscriptions();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete transcription');
            }
          },
        },
      ]
    );
  };

  const handleExport = async (transcription: Transcription) => {
    try {
      const filePath = await StorageService.exportTranscriptionAsText(transcription);
      
      await Share.open({
        url: `file://${filePath}`,
        type: 'text/plain',
        title: 'Export Transcription',
      });
    } catch (error) {
      if ((error as any).message !== 'User did not share') {
        Alert.alert('Error', 'Failed to export transcription');
      }
    }
  };

  const renderTranscriptionItem = ({ item }: { item: Transcription }) => {
    const isSelected = selectedId === item.id;

    return (
      <TouchableOpacity
        style={[styles.transcriptionItem, isSelected && styles.selectedItem]}
        onPress={() => setSelectedId(isSelected ? null : item.id)}
      >
        <View style={styles.itemHeader}>
          <Text style={styles.itemTitle}>
            {item.title || `Recording ${item.id.slice(-6)}`}
          </Text>
          <Text style={styles.itemDate}>{formatDate(item.createdAt)}</Text>
        </View>

        <Text style={styles.itemText} numberOfLines={isSelected ? undefined : 2}>
          {item.text}
        </Text>

        <View style={styles.itemMetadata}>
          <View style={styles.metadataItem}>
            <Icon name="timer" size={14} color="#999" />
            <Text style={styles.metadataText}>{formatDuration(item.duration)}</Text>
          </View>
          <View style={styles.metadataItem}>
            <Icon name="storage" size={14} color="#999" />
            <Text style={styles.metadataText}>{formatFileSize(item.fileSize)}</Text>
          </View>
          <View style={styles.metadataItem}>
            <Icon name="language" size={14} color="#999" />
            <Text style={styles.metadataText}>{item.language}</Text>
          </View>
        </View>

        {isSelected && (
          <View style={styles.itemActions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.exportButton]}
              onPress={() => handleExport(item)}
            >
              <Icon name="share" size={20} color="#FFF" />
              <Text style={styles.actionButtonText}>Export</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={() => handleDelete(item.id)}
            >
              <Icon name="delete" size={20} color="#FFF" />
              <Text style={styles.actionButtonText}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Icon name="search" size={24} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search transcriptions..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
        />
        {searchQuery !== '' && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Icon name="clear" size={24} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {filteredTranscriptions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="mic-off" size={64} color="#CCC" />
          <Text style={styles.emptyText}>
            {searchQuery ? 'No transcriptions found' : 'No transcriptions yet'}
          </Text>
          <Text style={styles.emptySubtext}>
            {searchQuery
              ? 'Try a different search term'
              : 'Start recording to see your transcriptions here'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredTranscriptions}
          keyExtractor={(item) => item.id}
          renderItem={renderTranscriptionItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    margin: 10,
    paddingHorizontal: 15,
    borderRadius: 10,
    height: 50,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  listContent: {
    paddingBottom: 20,
  },
  transcriptionItem: {
    backgroundColor: '#FFF',
    marginHorizontal: 10,
    marginVertical: 5,
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  selectedItem: {
    borderColor: '#007AFF',
    borderWidth: 2,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  itemDate: {
    fontSize: 12,
    color: '#999',
  },
  itemText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 10,
  },
  itemMetadata: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metadataText: {
    fontSize: 12,
    color: '#999',
    marginLeft: 4,
  },
  itemActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  exportButton: {
    backgroundColor: '#007AFF',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
  },
  actionButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 5,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
    marginTop: 20,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#BBB',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default TranscriptionsScreen;