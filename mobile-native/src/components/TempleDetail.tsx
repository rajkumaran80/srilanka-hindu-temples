import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
  TextInput,
  Dimensions,
  FlatList,
} from 'react-native';
import { API_BASE_URL } from '../constants/index';
// import * as ImagePicker from 'react-native-image-picker';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';


const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Temple {
  id: number;
  name: string;
  location: string;
  latitude: number;
  longitude: number;
  level?: number;
  temple_level?: number;
  deity?: string;
  description?: string;
  temple_type?: string;
  district?: string;
  rating?: number;
  photos?: string[];
}

interface TempleDetailProps {
  temple: Temple;
  visible: boolean;
  onClose: () => void;
}

const TempleDetail: React.FC<TempleDetailProps> = ({ temple, visible, onClose }) => {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<'photos' | 'details' | 'history' | 'actions'>('photos');

  const [showCommentForm, setShowCommentForm] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commentMessage, setCommentMessage] = useState('');
  const [commentMessageType, setCommentMessageType] = useState(''); // 'success' or 'error'
  const [submittingComment, setSubmittingComment] = useState(false);

  const [showSuggestNameForm, setShowSuggestNameForm] = useState(false);
  const [suggestedNameText, setSuggestedNameText] = useState('');
  const [suggestedNameMessage, setSuggestedNameMessage] = useState('');
  const [suggestedNameMessageType, setSuggestedNameMessageType] = useState(''); // 'success' or 'error'
  const [submittingSuggestedName, setSubmittingSuggestedName] = useState(false);

  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [ratingMessage, setRatingMessage] = useState('');
  const [ratingMessageType, setRatingMessageType] = useState(''); // 'success' or 'error'
  const [submittingRating, setSubmittingRating] = useState(false);

  const [selectedFiles, setSelectedFiles] = useState<any[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');
  const [uploadMessageType, setUploadMessageType] = useState(''); // 'success' or 'error'

  const isSubmitting = submittingComment || submittingSuggestedName || submittingRating || uploadingPhotos;

  const photos = temple.photos || [];

  const nextPhoto = () => setCurrentPhotoIndex((prev) => (prev + 1) % photos.length);
  const prevPhoto = () => setCurrentPhotoIndex((prev) => (prev - 1 + photos.length) % photos.length);
  const goToPhoto = (index: number) => setCurrentPhotoIndex(index);



  // Auto-hide messages
  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];
    if (commentMessage) {
      const timer = setTimeout(() => { setCommentMessage(''); setCommentMessageType(''); }, 3000);
      timers.push(timer);
    }
    if (suggestedNameMessage) {
      const timer = setTimeout(() => { setSuggestedNameMessage(''); setSuggestedNameMessageType(''); }, 3000);
      timers.push(timer);
    }
    if (ratingMessage) {
      const timer = setTimeout(() => { setRatingMessage(''); setRatingMessageType(''); }, 3000);
      timers.push(timer);
    }
    if (uploadMessage) {
      const timer = setTimeout(() => { setUploadMessage(''); setUploadMessageType(''); }, 3000);
      timers.push(timer);
    }
    return () => timers.forEach((t) => clearTimeout(t));
  }, [commentMessage, suggestedNameMessage, ratingMessage, uploadMessage]);

  const submitComment = async () => {
    if (!commentText.trim()) return;
    setSubmittingComment(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/update_temple.ts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operation: 'comment', templeId: temple.id, comment: commentText.trim() }),
      });
      if (res.ok) {
        setCommentMessage('Comment added successfully!');
        setCommentMessageType('success');
        setCommentText('');
        setShowCommentForm(false);
      } else {
        setCommentMessage('Failed to add comment. Try again.');
        setCommentMessageType('error');
      }
    } catch (err) {
      console.error(err);
      setCommentMessage('Error submitting comment. Try again.');
      setCommentMessageType('error');
    } finally {
      setSubmittingComment(false);
    }
  };

  const submitSuggestedName = async () => {
    if (!suggestedNameText.trim()) return;

    setSubmittingSuggestedName(true);
    setSuggestedNameMessage('');
    setSuggestedNameMessageType('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/update_temple.ts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operation: 'suggest_name',
          templeId: temple.id,
          suggestedName: suggestedNameText.trim(),
        }),
      });

      if (response.ok) {
        setSuggestedNameMessage('Suggested name submitted successfully!');
        setSuggestedNameMessageType('success');
        setSuggestedNameText('');
        setShowSuggestNameForm(false);
      } else {
        setSuggestedNameMessage('Failed to submit suggested name. Please try again.');
        setSuggestedNameMessageType('error');
      }
    } catch (error) {
      console.error('Error submitting suggested name:', error);
      setSuggestedNameMessage('Error submitting suggested name. Please try again.');
      setSuggestedNameMessageType('error');
    } finally {
      setSubmittingSuggestedName(false);
    }
  };

  const submitRating = async () => {
    if (rating === 0) {
      setRatingMessage('Please select at least one star.');
      setRatingMessageType('error');
      return;
    }
    setSubmittingRating(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/update_temple.ts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operation: 'rating', templeId: temple.id, rating }),
      });
      if (res.ok) {
        setRatingMessage(`Rating of ${rating} star${rating > 1 ? 's' : ''} submitted!`);
        setRatingMessageType('success');
        setRating(0);
      } else {
        setRatingMessage('Failed to submit rating.');
        setRatingMessageType('error');
      }
    } catch (err) {
      console.error(err);
      setRatingMessage('Error submitting rating.');
      setRatingMessageType('error');
    } finally {
      setSubmittingRating(false);
    }
  };

  const handleFileSelect = async () => {
    // Ask permission first
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      setUploadMessage('Permission to access media library is required!');
      setUploadMessageType('error');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setSelectedFiles([result.assets[0]]);
    }
  };

  const compressImage = async (uri: string, maxSizeKB = 20) => {
    try {
      const manipulatedImage = await manipulateAsync(
        uri,
        [{ resize: { width: 800, height: 800 } }],
        { compress: 0.8, format: SaveFormat.JPEG }
      );
      return manipulatedImage.uri;
    } catch (error) {
      console.error('Image compression failed:', error);
      return uri;
    }
  };

  const retryWithBackoff = async (fn: () => Promise<any>, maxRetries = 3, baseDelay = 1000, onRetry?: (attempt: number) => void) => {
    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        return await fn();
      } catch (error) {
        if (attempt > maxRetries) throw error;
        if (onRetry) onRetry(attempt + 1);
        const delay = baseDelay * Math.pow(2, attempt - 1);
        console.log(`Upload attempt ${attempt} failed, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  };

  const uploadPhotos = async () => {
    if (selectedFiles.length === 0) return;

    setUploadingPhotos(true);
    setUploadMessage('');
    setUploadMessageType('');

    try {
      const file = selectedFiles[0];

      setUploadMessage('Compressing image...');
      const compressedUri = await compressImage(file.uri);

      setUploadMessage('Getting upload URL...');
      console.log('Requesting presigned URL for templeId:', temple.id, 'fileType:', file.type || 'image/jpeg');
      const presignedResponse = await fetch(`${API_BASE_URL}/api/presigned_upload_photo.ts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templeId: temple.id, fileType: 'image/jpeg' }),
      });
      console.log('Presigned response status:', presignedResponse.status);

      if (!presignedResponse.ok) {
        setUploadMessage('Failed to get upload URL.');
        setUploadMessageType('error');
        return;
      }

      const presignedData = await presignedResponse.json();
      const { presignedUrl } = presignedData;

      console.log('Presigned URL obtained:', presignedUrl);

      setUploadMessage('Uploading photo...');
      // Read file as base64
      const base64Data = await FileSystem.readAsStringAsync(compressedUri, { encoding: 'base64' });
      const arrayBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

      const uploadResponse = await retryWithBackoff(
        async () => {
          const response = await fetch(presignedUrl, {
            method: 'PUT',
            headers: {
              'Content-Type': 'image/jpeg',
              'x-ms-blob-type': 'BlockBlob',
            },
            body: arrayBuffer,
          });
          if (!response.ok) throw new Error('Upload failed');
          return response;
        },
        3,
        1000,
        (attempt) => setUploadMessage(`Retrying upload (attempt ${attempt}/4)...`)
      );

      setUploadMessage('Adding to review queue...');
      const blobUrl = presignedUrl.split('?')[0];

      const unapprovedResponse = await fetch(`${API_BASE_URL}/api/add_unapproved_photo.ts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templeId: temple.id, photoName: blobUrl }),
      });

      if (unapprovedResponse.ok) {
        setUploadMessage('Photo uploaded and added to review queue successfully!');
        setUploadMessageType('success');
      } else {
        setUploadMessage('Photo uploaded but failed to add to review queue.');
        setUploadMessageType('error');
      }

      setSelectedFiles([]);
    } catch (error: any) {
      console.error('Complete upload error details:', {
        message: error.message,
        name: error.name,
        stack: error.stack,
        error
      });
      setUploadMessage(`Error uploading photo: ${error.message || 'Network request failed'}`);
      setUploadMessageType('error');
    } finally {
      setUploadingPhotos(false);
    }
  };

  const renderPhotoItem = ({ item, index }: { item: string; index: number }) => (
    <TouchableOpacity onPress={() => goToPhoto(index)}>
      <Image source={{ uri: item }} style={{ width: 60, height: 60, margin: 5, borderRadius: 5 }} />
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#fff' }} pointerEvents={isSubmitting ? 'none' : 'auto'}>
        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 10, borderBottomWidth: 1, borderBottomColor: '#ccc' }}>
          <View>
            <Text style={{ fontSize: 20, fontWeight: 'bold' }}>{temple.name}</Text>
            <Text style={{ fontSize: 16 }}>Rating: {temple.rating ? `${temple.rating} stars` : 'Not rated'}</Text>
          </View>
          <TouchableOpacity onPress={onClose} disabled={isSubmitting}><Text style={{ fontSize: 24 }}>×</Text></TouchableOpacity>
        </View>

        <Text style={{ padding: 10, fontSize: 16 }}>{temple.location}</Text>

        {/* Tabs */}
        <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#ccc' }}>
          {['photos', 'details', 'history', 'actions'].map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab as any)}
              style={{ flex: 1, padding: 10, backgroundColor: activeTab === tab ? '#eee' : '#fff' }}
            >
              <Text style={{ textAlign: 'center', textTransform: 'capitalize' }}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView style={{ flex: 1 }}>
          {/* Photos */}
          {activeTab === 'photos' && (
            <View style={{ padding: 10 }}>
              {photos.length > 0 ? (
                <>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                    <TouchableOpacity onPress={prevPhoto} style={{ padding: 10 }}><Text style={{ fontSize: 24 }}>‹</Text></TouchableOpacity>
                    <Image
                      source={{ uri: photos[currentPhotoIndex] }}
                      style={{ width: SCREEN_WIDTH - 80, height: 300, marginHorizontal: 10 }}
                      resizeMode="cover"
                    />
                    <TouchableOpacity onPress={nextPhoto} style={{ padding: 10 }}><Text style={{ fontSize: 24 }}>›</Text></TouchableOpacity>
                  </View>
                  {photos.length > 1 && (
                    <FlatList
                      data={photos}
                      renderItem={renderPhotoItem}
                      keyExtractor={(_, i) => i.toString()}
                      horizontal
                      style={{ marginTop: 10 }}
                    />
                  )}
                </>
              ) : <Text style={{ textAlign: 'center', padding: 20 }}>No photos available.</Text>}
            </View>
          )}

          {/* Details */}
          {activeTab === 'details' && (
            <View style={{ padding: 10 }}>
              <Text><Text style={{ fontWeight: 'bold' }}>Deity:</Text> {temple.deity || 'Not specified'}</Text>
              <Text><Text style={{ fontWeight: 'bold' }}>Temple Type:</Text> {temple.temple_type || 'Not specified'}</Text>
              <Text><Text style={{ fontWeight: 'bold' }}>District:</Text> {temple.district || 'Not specified'}</Text>
              <Text><Text style={{ fontWeight: 'bold' }}>Description:</Text> {temple.description || 'No description'}</Text>
              <Text><Text style={{ fontWeight: 'bold' }}>Coordinates:</Text> {temple.latitude.toFixed(6)}, {temple.longitude.toFixed(6)}</Text>
              <Text><Text style={{ fontWeight: 'bold' }}>Level:</Text> {temple.level || temple.temple_level || 3}</Text>
            </View>
          )}

          {/* History */}
          {activeTab === 'history' && (
            <View style={{ padding: 10 }}>
              <Text>History information will be displayed here when available.</Text>
            </View>
          )}

          {/* Actions */}
          {activeTab === 'actions' && (
            <View style={{ padding: 10 }}>
              {/* Upload */}
              <View style={{ marginBottom: 20 }}>
                <Text style={{ fontWeight: 'bold', marginBottom: 5 }}>Upload Photo</Text>
                <TouchableOpacity onPress={handleFileSelect} style={{ backgroundColor: '#17a2b8', padding: 10, borderRadius: 5, marginBottom: 10 }}>
                  <Text style={{ color: '#fff', textAlign: 'center' }}>Select Photo</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={uploadPhotos} disabled={selectedFiles.length === 0 || uploadingPhotos} style={{ backgroundColor: '#28a745', padding: 10, borderRadius: 5 }}>
                  <Text style={{ color: '#fff', textAlign: 'center' }}>{uploadingPhotos ? 'Uploading...' : 'Upload Photo'}</Text>
                </TouchableOpacity>
              </View>

              {/* Rating */}
              <View style={{ marginBottom: 20 }}>
                <Text style={{ fontWeight: 'bold', marginBottom: 5 }}>Rate Temple</Text>
                <View style={{ flexDirection: 'row', marginBottom: 10 }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity key={star} onPress={() => setRating(star)} style={{ padding: 5 }}>
                      <Text style={{ fontSize: 24, color: star <= rating ? '#ffd700' : '#ccc' }}>★</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity onPress={submitRating} disabled={submittingRating} style={{ backgroundColor: submittingRating ? '#ccc' : '#ffc107', padding: 10, borderRadius: 5 }}>
                  <Text style={{ textAlign: 'center' }}>{submittingRating ? 'Submitting...' : 'Submit Rating'}</Text>
                </TouchableOpacity>
              </View>

              {/* Suggest Name */}
              <View style={{ marginBottom: 20 }}>
                <Text style={{ fontWeight: 'bold', marginBottom: 5 }}>Suggest Name</Text>
                {!showSuggestNameForm ? (
                  <TouchableOpacity onPress={() => setShowSuggestNameForm(true)} style={{ backgroundColor: '#6f42c1', padding: 10, borderRadius: 5 }}>
                    <Text style={{ color: '#fff', textAlign: 'center' }}>Suggest Name</Text>
                  </TouchableOpacity>
                ) : (
                  <View>
                    <TextInput
                      value={suggestedNameText}
                      onChangeText={setSuggestedNameText}
                      placeholder="Enter suggested name..."
                      style={{ borderWidth: 1, borderColor: '#ccc', padding: 10, marginBottom: 10 }}
                    />
                    <View style={{ flexDirection: 'row' }}>
                      <TouchableOpacity onPress={submitSuggestedName} disabled={submittingSuggestedName} style={{ backgroundColor: submittingSuggestedName ? '#ccc' : '#28a745', padding: 10, borderRadius: 5, flex: 1, marginRight: 5 }}>
                        <Text style={{ color: '#fff', textAlign: 'center' }}>{submittingSuggestedName ? 'Submitting...' : 'Submit'}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => { setShowSuggestNameForm(false); setSuggestedNameText(''); }} style={{ backgroundColor: '#6c757d', padding: 10, borderRadius: 5, flex: 1, marginLeft: 5 }}>
                        <Text style={{ color: '#fff', textAlign: 'center' }}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>

              {/* Comment */}
              <View style={{ marginBottom: 20 }}>
                <Text style={{ fontWeight: 'bold', marginBottom: 5 }}>Add Comment</Text>
                {!showCommentForm ? (
                  <TouchableOpacity onPress={() => setShowCommentForm(true)} style={{ backgroundColor: '#6f42c1', padding: 10, borderRadius: 5 }}>
                    <Text style={{ color: '#fff', textAlign: 'center' }}>Add Comment</Text>
                  </TouchableOpacity>
                ) : (
                  <View>
                    <TextInput
                      value={commentText}
                      onChangeText={setCommentText}
                      placeholder="Enter your comment..."
                      multiline
                      numberOfLines={3}
                      style={{ borderWidth: 1, borderColor: '#ccc', padding: 10, marginBottom: 10 }}
                    />
                    <View style={{ flexDirection: 'row' }}>
                      <TouchableOpacity onPress={submitComment} disabled={submittingComment} style={{ backgroundColor: submittingComment ? '#ccc' : '#28a745', padding: 10, borderRadius: 5, flex: 1, marginRight: 5 }}>
                        <Text style={{ color: '#fff', textAlign: 'center' }}>{submittingComment ? 'Submitting...' : 'Submit'}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => { setShowCommentForm(false); setCommentText(''); }} style={{ backgroundColor: '#6c757d', padding: 10, borderRadius: 5, flex: 1, marginLeft: 5 }}>
                        <Text style={{ color: '#fff', textAlign: 'center' }}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>

              {/* Messages */}
              {(commentMessage || suggestedNameMessage || ratingMessage || uploadMessage) && (
                <View>
                  {commentMessage && <Text style={{ color: commentMessageType === 'success' ? 'green' : 'red' }}>{commentMessage}</Text>}
                  {suggestedNameMessage && <Text style={{ color: suggestedNameMessageType === 'success' ? 'green' : 'red' }}>{suggestedNameMessage}</Text>}
                  {ratingMessage && <Text style={{ color: ratingMessageType === 'success' ? 'green' : 'red' }}>{ratingMessage}</Text>}
                  {uploadMessage && <Text style={{ color: uploadMessageType === 'success' ? 'green' : 'red' }}>{uploadMessage}</Text>}
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

export default TempleDetail;
