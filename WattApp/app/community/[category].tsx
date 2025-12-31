import { collectionGroup, getDocs, where, query as fsQuery } from 'firebase/firestore';
export const unstable_settings = { layout: null };
import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, KeyboardAvoidingView, Platform, Image, Animated, StatusBar, Pressable, Vibration, Modal, Alert, Linking, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, setDoc, doc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import app, { db } from '../../constants/firebaseConfig';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const CATEGORY_LABELS: Record<string, string> = {
  "Roman d'amour": "Roman d'amour",
  Fanfiction: 'Fanfiction',
  'Fiction générale': 'Fiction générale',
  'Roman pour adolescents': 'Roman pour adolescents',
  'Aléatoire': 'Aléatoire',
  Action: 'Action',
  Aventure: 'Aventure',
  Nouvelles: 'Nouvelles',
  Fantasy: 'Fantasy',
  'Non-Fiction': 'Non-Fiction',
  Fantastique: 'Fantastique',
  Mystère: 'Mystère',
};

// Composant pour un message individuel
interface MessageItemProps {
  item: any;
  isMe: boolean;
  onReply: (item: any) => void;
  playingMessageId: string | null;
  isPlaying: boolean;
  audioPosition: number;
  audioProgress: Animated.Value;
  listenedAudios: Set<string>;
  toggleAudioPlayback: (id: string, url: string, duration: number) => void;
  formatDuration: (seconds: number) => string;
}

const MessageItem: React.FC<MessageItemProps> = ({
  item,
  isMe,
  onReply,
  playingMessageId,
  isPlaying,
  audioPosition,
  audioProgress,
  listenedAudios,
  toggleAudioPlayback,
  formatDuration,
}) => {
  const translateX = useRef(new Animated.Value(0)).current;
  
  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: translateX } }],
    { 
      useNativeDriver: true,
      listener: (event: any) => {
        const translationX = event.nativeEvent.translationX;
        if (translationX > 0) {
          translateX.setValue(0);
        } else if (translationX < -80) {
          translateX.setValue(-80);
        }
      }
    }
  );
  
  const onHandlerStateChange = (event: any) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      const translationX = event.nativeEvent.translationX;
      
      if (translationX < -60) {
        Vibration.vibrate(50);
        onReply(item);
      }
      
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 10,
      }).start();
    }
  };
  
  return (
    <View style={{ position: 'relative' }}>
      <Animated.View 
        style={[
          styles.swipeReplyIcon,
          {
            opacity: translateX.interpolate({
              inputRange: [-80, -40, 0],
              outputRange: [1, 0.5, 0],
            }),
            transform: [{
              scale: translateX.interpolate({
                inputRange: [-80, -40, 0],
                outputRange: [1, 0.75, 0.5],
              })
            }]
          }
        ]}
      >
        <Ionicons name="arrow-redo" size={24} color="#FFA94D" />
      </Animated.View>
      
      <PanGestureHandler
        onGestureEvent={onGestureEvent}
        onHandlerStateChange={onHandlerStateChange}
        activeOffsetX={[-10, 10]}
      >
        <Animated.View style={{ transform: [{ translateX }] }}>
          <Pressable
            style={[
              styles.messageRowModern,
              isMe ? styles.messageRowMe : styles.messageRowOther
            ]}
            onLongPress={() => {
              Vibration.vibrate(50);
              onReply(item);
            }}
          >
            <View style={styles.messageBubbleContainer}>
              {!isMe && <Text style={styles.messageUserName}>{item.user}</Text>}
              
              <View
                style={[
                  styles.messageBubbleModern,
                  isMe ? styles.messageBubbleMe : styles.messageBubbleOther,
                  (item.type === 'image' || item.type === 'audio') && styles.mediaBubble,
                ]}
              >
                {item.replyTo && (
                  <View style={styles.replyPreview}>
                    <View style={[styles.replyBar, isMe && styles.replyBarMe]} />
                    <View style={styles.replyContent}>
                      <Text style={[styles.replyUser, isMe && styles.replyUserMe]}>
                        {item.replyTo.user}
                      </Text>
                      <Text style={[styles.replyText, isMe && styles.replyTextMe]} numberOfLines={1}>
                        {item.replyTo.type === 'audio' ? '🎤 Message vocal' : 
                         item.replyTo.type === 'image' ? '📷 Photo' : 
                         item.replyTo.text}
                      </Text>
                    </View>
                  </View>
                )}
                
                {item.type === 'image' && item.imageUrl && (
                  <TouchableOpacity onPress={() => Linking.openURL(item.imageUrl)}>
                    <Image 
                      source={{ uri: item.imageUrl }} 
                      style={styles.messageImage}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                )}
                
                {item.type === 'audio' && item.audioUrl && (
                  <TouchableOpacity 
                    style={styles.audioMessageContainer}
                    onPress={() => toggleAudioPlayback(item.id, item.audioUrl, item.audioDuration || 0)}
                    activeOpacity={0.7}
                  >
                    <Animated.View style={[
                      styles.audioPlayButton,
                      playingMessageId === item.id && isPlaying && !listenedAudios.has(item.id) && styles.audioPlayButtonActive,
                      listenedAudios.has(item.id) && styles.audioPlayButtonListened,
                      playingMessageId === item.id && isPlaying && {
                        transform: [{
                          scale: audioProgress.interpolate({
                            inputRange: [0, 0.5, 1],
                            outputRange: [1, 1.05, 1],
                          })
                        }]
                      }
                    ]}>
                      <Ionicons 
                        name={playingMessageId === item.id && isPlaying ? "pause" : "play"} 
                        size={24} 
                        color={
                          listenedAudios.has(item.id) 
                            ? "#666" 
                            : (isMe ? "#181818" : "#FFA94D")
                        } 
                      />
                    </Animated.View>
                    
                    <View style={styles.audioWaveformContainer}>
                      <View style={styles.audioWaveform}>
                        {(() => {
                          const isCurrentlyPlaying = playingMessageId === item.id;
                          const isListened = listenedAudios.has(item.id);
                          
                          const waveformData = item.waveformData && Array.isArray(item.waveformData) 
                            ? item.waveformData 
                            : [14, 22, 18, 26, 16, 24, 20, 28, 18, 22, 16, 24, 20, 26, 18, 22, 16, 20, 24, 18, 26, 20, 22, 18, 16].map(h => h / 32);
                          
                          const displayData = waveformData.length >= 25 
                            ? waveformData.slice(0, 25)
                            : [...waveformData, ...Array(25 - waveformData.length).fill(0.3)];
                          
                          return displayData.map((level, i) => {
                            const barProgress = i / 25;
                            const minHeight = 8;
                            const maxHeight = 28;
                            const barHeight = minHeight + (level * (maxHeight - minHeight));
                            
                            return (
                              <Animated.View 
                                key={i} 
                                style={[
                                  styles.audioBar,
                                  { 
                                    height: barHeight,
                                    backgroundColor: isListened ? "#555" : (isMe ? "#181818" : "#FFA94D"),
                                    opacity: isCurrentlyPlaying 
                                      ? audioProgress.interpolate({
                                          inputRange: [barProgress - 0.04, barProgress, barProgress + 0.04],
                                          outputRange: [0.3 + level * 0.3, 1, 0.3 + level * 0.3],
                                          extrapolate: 'clamp',
                                        })
                                      : (isListened ? 0.4 : 0.3 + level * 0.4),
                                  }
                                ]} 
                              />
                            );
                          });
                        })()}
                      </View>
                      
                      <Text style={[
                        styles.audioTime, 
                        isMe && styles.audioTimeMe,
                        listenedAudios.has(item.id) && styles.audioTimeListened
                      ]}>
                        {playingMessageId === item.id && audioPosition > 0
                          ? `${formatDuration(audioPosition)} / ${formatDuration(item.audioDuration || 0)}`
                          : formatDuration(item.audioDuration || 0)
                        }
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
                
                {(item.type === 'text' || !item.type) && item.text && (
                  <>
                    <Text style={[styles.messageTextModern, isMe && styles.messageTextMe]}>
                      {item.text}
                    </Text>
                    
                    {item.links && item.links.length > 0 && (
                      <View style={styles.linkPreviewContainer}>
                        {item.links.slice(0, 1).map((link: string, idx: number) => (
                          <TouchableOpacity 
                            key={idx}
                            style={styles.linkPreview}
                            onPress={() => Linking.openURL(link)}
                          >
                            <Ionicons name="link" size={16} color={isMe ? "#181818" : "#FFA94D"} />
                            <Text 
                              style={[styles.linkText, isMe && styles.linkTextMe]}
                              numberOfLines={1}
                            >
                              {link}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </>
                )}
              </View>
              
              {item.createdAt?.seconds && (
                <Text style={[styles.messageTimeModern, isMe && styles.messageTimeMeModern]}>
                  {new Date(item.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              )}
              
              <View style={[styles.messageAvatarContainer, isMe && styles.messageAvatarContainerMe]}>
                <Image 
                  source={{ uri: item.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.user || 'U')}&background=FFA94D&color=181818&size=128` }} 
                  style={styles.messageAvatarBottom} 
                />
              </View>
            </View>
          </Pressable>
        </Animated.View>
      </PanGestureHandler>
    </View>
  );
};

export default function CommunityChat() {
  const [myGroups, setMyGroups] = useState<any[]>([]);
  const [showMembersSidebar, setShowMembersSidebar] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const [isMember, setIsMember] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const scrollY = useRef(new Animated.Value(0)).current;
  const [composerFocused, setComposerFocused] = useState(false);
  const [showMediaOptions, setShowMediaOptions] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const recordingInterval = useRef<any>(null);
  const recordingAnimation = useRef(new Animated.Value(0)).current;
  const [audioMetering, setAudioMetering] = useState<number[]>(Array(35).fill(0));
  const meteringHistory = useRef<number[]>(Array(35).fill(0));
  const fullMeteringData = useRef<number[]>([]);
  
  // États pour la lecture audio avec Animated
  const [currentSound, setCurrentSound] = useState<Audio.Sound | null>(null);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [audioPosition, setAudioPosition] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioProgress = useRef(new Animated.Value(0)).current;
  const [listenedAudios, setListenedAudios] = useState<Set<string>>(new Set());
  const [replyingTo, setReplyingTo] = useState<any | null>(null);

  const { category } = useLocalSearchParams();
  const router = useRouter();

  // Filtrage des messages pour ne pas afficher les messages système de join
  const filteredMessages = messages.filter((item: any) => {
    // Filtrer tous les messages système de join
    if (item.system && item.text && item.text.endsWith('a rejoint le groupe')) {
      return false;
    }
    return true;
  });

  useEffect(() => {
    const fetchMyGroups = async () => {
      const auth = getAuth(app);
      const user = auth.currentUser;
      if (!user) return;
      const q = collectionGroup(db, 'members');
      const snap = await getDocs(fsQuery(q, where('uid', '==', user.uid)));
      const groups = snap.docs.map(doc => {
        const parent = doc.ref.parent.parent;
        return {
          ...doc.data(),
          groupId: parent?.id,
        };
      });
      setMyGroups(groups);
    };
    fetchMyGroups();
  }, []);

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const snap = await getDocs(collection(db, 'communityChats', String(category), 'members'));
        const list = snap.docs.map(doc => doc.data());
        setMembers(list);
      } catch (e) {
        // Optionnel : log erreur
      }
    };
    fetchMembers();
  }, [category]);

  useEffect(() => {
    if (!category) return;
    const q = query(collection(db, 'communityChats', String(category), 'messages'), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, snap => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    });
    return () => unsub();
  }, [category]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const auth = getAuth(app);
    const user = auth.currentUser;
    if (!user) return;
    
    Vibration.vibrate(10);
    
    // Détecter les liens dans le message
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = input.match(urlRegex);
    
    await addDoc(collection(db, 'communityChats', String(category), 'messages'), {
      text: input.trim(),
      user: user.displayName || user.email || 'Utilisateur',
      photoURL: user.photoURL || '',
      createdAt: serverTimestamp(),
      uid: user.uid,
      type: 'text',
      links: urls || [],
      ...(replyingTo && {
        replyTo: {
          id: replyingTo.id,
          text: replyingTo.text || 'Média',
          user: replyingTo.user,
          type: replyingTo.type,
        }
      }),
    });
    setInput('');
    setReplyingTo(null);
  };
  
  // Sélectionner une image depuis la galerie
  const pickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('Permission requise', 'Vous devez autoriser l\'accès à vos photos');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
        setShowMediaOptions(false);
        await uploadAndSendImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Erreur sélection image:', error);
      Alert.alert('Erreur', 'Impossible de sélectionner l\'image');
    }
  };
  
  // Prendre une photo
  const takePhoto = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('Permission requise', 'Vous devez autoriser l\'accès à la caméra');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
        setShowMediaOptions(false);
        await uploadAndSendImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Erreur prise photo:', error);
      Alert.alert('Erreur', 'Impossible de prendre la photo');
    }
  };
  
  // Upload et envoi d'image
  const uploadAndSendImage = async (uri: string) => {
    const auth = getAuth(app);
    const user = auth.currentUser;
    if (!user) return;
    
    setUploading(true);
    Vibration.vibrate(10);
    
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      
      const storage = getStorage(app);
      const filename = `chat-images/${category}/${Date.now()}-${user.uid}.jpg`;
      const storageRef = ref(storage, filename);
      
      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);
      
      await addDoc(collection(db, 'communityChats', String(category), 'messages'), {
        text: '',
        user: user.displayName || user.email || 'Utilisateur',
        photoURL: user.photoURL || '',
        createdAt: serverTimestamp(),
        uid: user.uid,
        type: 'image',
        imageUrl: downloadURL,
      });
      
      setSelectedImage(null);
    } catch (error) {
      console.error('Erreur upload image:', error);
      Alert.alert('Erreur', 'Impossible d\'envoyer l\'image');
    } finally {
      setUploading(false);
    }
  };
  
  // Démarrer l'enregistrement audio
  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      
      if (permission.status !== 'granted') {
        Alert.alert('Permission requise', 'Vous devez autoriser l\'accès au microphone');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: newRecording } = await Audio.Recording.createAsync(
        {
          ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
          android: {
            ...Audio.RecordingOptionsPresets.HIGH_QUALITY.android,
            extension: '.m4a',
            outputFormat: Audio.AndroidOutputFormat.MPEG_4,
            audioEncoder: Audio.AndroidAudioEncoder.AAC,
          },
          ios: {
            ...Audio.RecordingOptionsPresets.HIGH_QUALITY.ios,
            extension: '.m4a',
            outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
            audioQuality: Audio.IOSAudioQuality.HIGH,
          },
          web: {
            mimeType: 'audio/webm',
            bitsPerSecond: 128000,
          },
        },
        undefined,
        100 // Intervalle de mise à jour en ms
      );
      
      // Capturer les niveaux audio en temps réel
      newRecording.setOnRecordingStatusUpdate((status) => {
        if (status.isRecording && status.metering !== undefined) {
          // Normaliser le niveau de metering (généralement entre -160 et 0)
          // On convertit en valeur entre 0 et 1
          const normalizedLevel = Math.max(0, Math.min(1, (status.metering + 60) / 60));
          
          // Sauvegarder toutes les données pour l'envoi
          fullMeteringData.current.push(normalizedLevel);
          
          // Décaler l'historique et ajouter la nouvelle valeur (pour affichage)
          meteringHistory.current = [...meteringHistory.current.slice(1), normalizedLevel];
          setAudioMetering([...meteringHistory.current]);
        }
      });
      
      setRecording(newRecording);
      setIsRecording(true);
      setRecordingDuration(0);
      setShowMediaOptions(false);
      meteringHistory.current = Array(35).fill(0);
      setAudioMetering(Array(35).fill(0));
      fullMeteringData.current = [];
      Vibration.vibrate(20);
      
      // Démarrer le compteur
      recordingInterval.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Erreur démarrage enregistrement:', error);
      Alert.alert('Erreur', 'Impossible de démarrer l\'enregistrement');
    }
  };
  
  // Arrêter et envoyer l'enregistrement
  const stopRecording = async () => {
    if (!recording) return;
    
    try {
      setIsRecording(false);
      clearInterval(recordingInterval.current);
      meteringHistory.current = Array(35).fill(0);
      setAudioMetering(Array(35).fill(0));
      Vibration.vibrate(20);
      
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      
      if (uri && recordingDuration > 1) {
        await uploadAndSendAudio(uri);
      }
      
      setRecording(null);
      setRecordingDuration(0);
    } catch (error) {
      console.error('Erreur arrêt enregistrement:', error);
      Alert.alert('Erreur', 'Impossible d\'arrêter l\'enregistrement');
    }
  };
  
  // Annuler l'enregistrement
  const cancelRecording = async () => {
    if (!recording) return;
    
    try {
      setIsRecording(false);
      clearInterval(recordingInterval.current);
      meteringHistory.current = Array(35).fill(0);
      setAudioMetering(Array(35).fill(0));
      await recording.stopAndUnloadAsync();
      setRecording(null);
      setRecordingDuration(0);
      Vibration.vibrate(10);
    } catch (error) {
      console.error('Erreur annulation:', error);
    }
  };
  
  // Upload et envoi d'audio
  const uploadAndSendAudio = async (uri: string) => {
    const auth = getAuth(app);
    const user = auth.currentUser;
    if (!user) return;
    
    setUploading(true);
    
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      
      const storage = getStorage(app);
      const filename = `chat-audio/${category}/${Date.now()}-${user.uid}.m4a`;
      const storageRef = ref(storage, filename);
      
      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);
      
      // Réduire les données de metering pour le stockage (prendre 1 point tous les 5)
      const sampledMetering = fullMeteringData.current.filter((_, i) => i % 5 === 0).slice(0, 25);
      
      await addDoc(collection(db, 'communityChats', String(category), 'messages'), {
        text: '',
        user: user.displayName || user.email || 'Utilisateur',
        photoURL: user.photoURL || '',
        createdAt: serverTimestamp(),
        uid: user.uid,
        type: 'audio',
        audioUrl: downloadURL,
        audioDuration: recordingDuration,
        waveformData: sampledMetering, // Données de visualisation
      });
      
      // Réinitialiser les données
      fullMeteringData.current = [];
    } catch (error) {
      console.error('Erreur upload audio:', error);
      Alert.alert('Erreur', 'Impossible d\'envoyer le message vocal');
    } finally {
      setUploading(false);
    }
  };
  
  // Formater la durée
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Fonction pour jouer/mettre en pause un audio
  const toggleAudioPlayback = async (messageId: string, audioUrl: string, duration: number) => {
    try {
      // Si c'est le même message et qu'il est en train de jouer, pause
      if (playingMessageId === messageId && isPlaying && currentSound) {
        const status = await currentSound.getStatusAsync();
        if (status.isLoaded) {
          await currentSound.pauseAsync();
          setIsPlaying(false);
        }
        return;
      }
      
      // Si c'est le même message mais en pause, reprendre
      if (playingMessageId === messageId && !isPlaying && currentSound) {
        const status = await currentSound.getStatusAsync();
        if (status.isLoaded) {
          await currentSound.playAsync();
          setIsPlaying(true);
        }
        return;
      }
      
      // Arrêter l'audio précédent s'il existe
      if (currentSound) {
        try {
          const status = await currentSound.getStatusAsync();
          if (status.isLoaded) {
            await currentSound.stopAsync();
            await currentSound.unloadAsync();
          }
        } catch (err) {
          console.log('Erreur nettoyage son précédent:', err);
        }
        setCurrentSound(null);
        audioProgress.setValue(0);
      }
      
      // Configurer le mode audio
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });
      
      // Créer et jouer le nouveau son
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: true, progressUpdateIntervalMillis: 50 },
        (status) => {
          if (status.isLoaded) {
            if (status.isPlaying) {
              const position = Math.floor((status.positionMillis || 0) / 1000);
              const progress = (status.positionMillis || 0) / ((status.durationMillis || duration * 1000));
              
              setAudioPosition(position);
              
              // Animation fluide de la progression
              Animated.timing(audioProgress, {
                toValue: progress,
                duration: 50,
                useNativeDriver: false,
              }).start();
            }
            if (status.didJustFinish) {
              setIsPlaying(false);
              setPlayingMessageId(null);
              setAudioPosition(0);
              audioProgress.setValue(0);
              
              // Marquer comme écouté
              setListenedAudios(prev => new Set(prev).add(messageId));
            }
          }
        }
      );
      
      setCurrentSound(sound);
      setPlayingMessageId(messageId);
      setAudioDuration(duration);
      setAudioPosition(0);
      setIsPlaying(true);
      audioProgress.setValue(0);
    } catch (error) {
      console.error('Erreur lecture audio:', error);
      Alert.alert('Erreur', 'Impossible de lire le message vocal');
      
      // Réinitialiser l'état en cas d'erreur
      setIsPlaying(false);
      setPlayingMessageId(null);
      setCurrentSound(null);
    }
  };
  
  // Nettoyer l'audio quand on quitte la page
  useEffect(() => {
    return () => {
      if (currentSound) {
        currentSound.getStatusAsync().then(status => {
          if (status.isLoaded) {
            currentSound.unloadAsync().catch(err => console.log('Erreur cleanup:', err));
          }
        }).catch(err => console.log('Erreur status:', err));
      }
    };
  }, [currentSound]);

  return (
    <View style={{ flex: 1, backgroundColor: '#181818' }}>
      <StatusBar barStyle="light-content" />
      
      {/* Header moderne avec glassmorphism */}
      <LinearGradient
        colors={['#232323', '#1a1a1a']}
        style={styles.headerModern}
      >
        <BlurView intensity={20} tint="dark" style={styles.headerBlur}>
        <View style={styles.groupHeaderBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtnModern}>
            <Ionicons name="chevron-back" size={28} color="#FFA94D" />
          </TouchableOpacity>
          
          <View style={styles.headerCenterContent}>
            <MaterialCommunityIcons name="shield-account" size={20} color="#FFA94D" style={{ marginRight: 8 }} />
            <Text style={styles.groupTitleModern}>{CATEGORY_LABELS[String(category)] || category}</Text>
          </View>
          
          <View style={styles.headerActionsRow}>
            {isMember && (
              <TouchableOpacity style={styles.headerActionBtn} onPress={() => setShowMembersSidebar(true)}>
                <Ionicons name="people" size={22} color="#FFA94D" />
                <View style={styles.membersBadge}>
                  <Text style={styles.membersBadgeText}>{members.length}</Text>
                </View>
              </TouchableOpacity>
            )}
          </View>
        </View>
        </BlurView>
      </LinearGradient>

      {/* Liste des messages avec design moderne */}
      <View 
        style={[styles.chatContainer, !isMember && styles.chatDisabled]}
        pointerEvents={!isMember ? 'none' : 'auto'}
      >
        <Animated.FlatList
          ref={flatListRef}
          data={filteredMessages}
          keyExtractor={item => item.id}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: false }
          )}
          scrollEventThrottle={16}
          renderItem={({ item, index }) => {
            const auth = getAuth(app);
            const isMe = item.uid === auth.currentUser?.uid;
            
            return (
              <MessageItem
                item={item}
                isMe={isMe}
                onReply={setReplyingTo}
                playingMessageId={playingMessageId}
                isPlaying={isPlaying}
                audioPosition={audioPosition}
                audioProgress={audioProgress}
                listenedAudios={listenedAudios}
                toggleAudioPlayback={toggleAudioPlayback}
                formatDuration={formatDuration}
              />
            );
          }}
          contentContainerStyle={{ paddingTop: 16, paddingHorizontal: 16, paddingBottom: 150 }}
          showsVerticalScrollIndicator={false}
        />
      </View>

      {/* Indicateur d'upload */}
      {uploading && (
        <View style={styles.uploadingOverlay}>
          <BlurView intensity={80} tint="dark" style={styles.uploadingBlur}>
            <ActivityIndicator size="large" color="#FFA94D" />
            <Text style={styles.uploadingText}>Envoi en cours...</Text>
          </BlurView>
        </View>
      )}

      {/* Composer moderne avec BlurView */}
      <BlurView intensity={95} tint="dark" style={styles.composerBlur}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          {/* UI d'enregistrement audio */}
          {isRecording ? (
            <View style={styles.recordingContainer}>
              <TouchableOpacity onPress={cancelRecording} style={styles.cancelRecordButton}>
                <Ionicons name="close-circle" size={32} color="#FF4444" />
              </TouchableOpacity>
              
              <View style={styles.recordingWaveform}>
                {audioMetering.map((level, i) => {
                  // Calculer la hauteur basée sur le niveau audio réel
                  const minHeight = 4;
                  const maxHeight = 32;
                  const barHeight = minHeight + (level * (maxHeight - minHeight));
                  
                  return (
                    <View 
                      key={i} 
                      style={[
                        styles.recordingBar,
                        { 
                          height: barHeight,
                          backgroundColor: "#FFA94D",
                          opacity: 0.4 + (level * 0.6), // Opacité variable selon le niveau
                        }
                      ]} 
                    />
                  );
                })}
              </View>
              
              <Text style={styles.recordingTimer}>{formatDuration(recordingDuration)}</Text>
              
              <TouchableOpacity onPress={stopRecording} style={styles.sendRecordButton}>
                <LinearGradient
                  colors={['#FFA94D', '#FF8C42']}
                  style={styles.sendButton}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="send" size={20} color="#181818" style={{ marginLeft: 2 }} />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ width: '100%' }}>
              {/* Barre de réponse */}
              {replyingTo && (
                <BlurView intensity={80} tint="dark" style={styles.replyBarComposer}>
                  <View style={styles.replyBarContent}>
                    <View style={styles.replyBarLeft}>
                      <View style={styles.replyBarIndicator} />
                      <View style={styles.replyBarTextContainer}>
                        <Text style={styles.replyBarUser}>{replyingTo.user}</Text>
                        <Text style={styles.replyBarMessage} numberOfLines={1}>
                          {replyingTo.type === 'audio' ? '🎤 Message vocal' : 
                           replyingTo.type === 'image' ? '📷 Photo' : 
                           replyingTo.text}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity onPress={() => setReplyingTo(null)}>
                      <Ionicons name="close-circle" size={24} color="#FFA94D" />
                    </TouchableOpacity>
                  </View>
                </BlurView>
              )}
              
              <View style={[styles.composerModern, composerFocused && styles.composerFocused]}>
                <TouchableOpacity 
                  style={styles.attachButton}
                  onPress={() => setShowMediaOptions(true)}
                >
                  <Ionicons name="add-circle" size={28} color="#FFA94D" />
                </TouchableOpacity>
                
                <View style={styles.inputWrapper}>
                  <TextInput
                    value={input}
                    onChangeText={setInput}
                    placeholder="Écris ton message..."
                    placeholderTextColor="#666"
                    style={styles.inputModern}
                    onSubmitEditing={sendMessage}
                    onFocus={() => setComposerFocused(true)}
                    onBlur={() => setComposerFocused(false)}
                    returnKeyType="send"
                    multiline
                    maxLength={1000}
                  />
                </View>
                
                {input.trim() ? (
                  <TouchableOpacity onPress={sendMessage} style={styles.sendButtonContainer}>
                    <LinearGradient
                      colors={['#FFA94D', '#FF8C42']}
                      style={styles.sendButton}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Ionicons name="send" size={20} color="#181818" style={{ marginLeft: 2 }} />
                    </LinearGradient>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity 
                    style={styles.voiceButton}
                    onPress={startRecording}
                  >
                    <Ionicons name="mic" size={24} color="#FFA94D" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        </KeyboardAvoidingView>
      </BlurView>

      {/* Modal des options média */}
      <Modal
        visible={showMediaOptions}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMediaOptions(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowMediaOptions(false)}
        >
          <BlurView intensity={80} tint="dark" style={styles.modalBlur}>
            <View style={styles.mediaOptionsContainer}>
              <View style={styles.mediaOptionsHeader}>
                <Text style={styles.mediaOptionsTitle}>Envoyer un média</Text>
                <TouchableOpacity onPress={() => setShowMediaOptions(false)}>
                  <Ionicons name="close" size={24} color="#FFA94D" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.mediaOptionsGrid}>
                <TouchableOpacity 
                  style={styles.mediaOption}
                  onPress={() => {
                    setShowMediaOptions(false);
                    pickImage();
                  }}
                >
                  <LinearGradient
                    colors={['rgba(255, 169, 77, 0.2)', 'rgba(255, 140, 66, 0.1)']}
                    style={styles.mediaOptionGradient}
                  >
                    <Ionicons name="images" size={32} color="#FFA94D" />
                  </LinearGradient>
                  <Text style={styles.mediaOptionText}>Galerie</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.mediaOption}
                  onPress={() => {
                    setShowMediaOptions(false);
                    takePhoto();
                  }}
                >
                  <LinearGradient
                    colors={['rgba(255, 169, 77, 0.2)', 'rgba(255, 140, 66, 0.1)']}
                    style={styles.mediaOptionGradient}
                  >
                    <Ionicons name="camera" size={32} color="#FFA94D" />
                  </LinearGradient>
                  <Text style={styles.mediaOptionText}>Appareil photo</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.mediaOption}
                  onPress={() => {
                    setShowMediaOptions(false);
                    startRecording();
                  }}
                >
                  <LinearGradient
                    colors={['rgba(255, 169, 77, 0.2)', 'rgba(255, 140, 66, 0.1)']}
                    style={styles.mediaOptionGradient}
                  >
                    <Ionicons name="mic" size={32} color="#FFA94D" />
                  </LinearGradient>
                  <Text style={styles.mediaOptionText}>Message vocal</Text>
                </TouchableOpacity>
              </View>
            </View>
          </BlurView>
        </TouchableOpacity>
      </Modal>

      {/* Overlay moderne pour non-membres */}
      {!isMember && (
        <View style={styles.joinOverlayModern} pointerEvents="box-none">
          <BlurView intensity={80} tint="dark" style={styles.joinOverlayBlur}>
            <View style={styles.joinContent}>
              <LinearGradient
                colors={['rgba(255, 169, 77, 0.2)', 'rgba(255, 140, 66, 0.1)']}
                style={styles.joinCard}
              >
                <MaterialCommunityIcons name="shield-account" size={48} color="#FFA94D" style={{ marginBottom: 16 }} />
                <Text style={styles.joinTitle}>Rejoindre le groupe</Text>
                <Text style={styles.joinSubtitle}>{members.length} membre{members.length > 1 ? 's' : ''} actif{members.length > 1 ? 's' : ''}</Text>
                
                {/* Mini preview des membres */}
                <View style={styles.membersMiniPreview}>
                  {members.slice(0, 5).map((item, idx) => (
                    <Image
                      key={idx}
                      source={{ uri: item.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.user || 'U')}&background=FFA94D&color=181818&size=128` }}
                      style={[styles.miniMemberAvatar, { marginLeft: idx > 0 ? -12 : 0 }]}
                    />
                  ))}
                  {members.length > 5 && (
                    <View style={[styles.miniMemberAvatar, styles.miniMemberMore, { marginLeft: -12 }]}>
                      <Text style={styles.miniMemberMoreText}>+{members.length - 5}</Text>
                    </View>
                  )}
                </View>
                
                <TouchableOpacity
                  style={styles.joinBtnModern}
                  activeOpacity={0.9}
                  onPress={async () => {
                    const auth = getAuth(app);
                    const user = auth.currentUser;
                    if (!user) return;
                    
                    Vibration.vibrate(30);
                    
                    try {
                      await setDoc(
                        doc(db, 'communityChats', String(category), 'members', user.uid),
                        {
                          uid: user.uid,
                          user: user.displayName || user.email || 'Utilisateur',
                          photoURL: user.photoURL || '',
                          joinedAt: serverTimestamp(),
                        },
                        { merge: true }
                      );
                      setMembers(prev => [
                        ...prev.filter(m => m.uid !== user.uid),
                        {
                          uid: user.uid,
                          user: user.displayName || user.email || 'Utilisateur',
                          photoURL: user.photoURL || '',
                          joinedAt: new Date(),
                        }
                      ]);
                      await addDoc(
                        collection(db, 'communityChats', String(category), 'messages'),
                        {
                          text: `${user.displayName || user.email || 'Utilisateur'} a rejoint le groupe`,
                          uid: user.uid,
                          user: user.displayName || user.email || 'Utilisateur',
                          photoURL: user.photoURL || '',
                          createdAt: serverTimestamp(),
                          system: true,
                        }
                      );
                      setIsMember(true);
                    } catch (e) {
                      alert('Erreur lors de la tentative de rejoindre le groupe.');
                    }
                  }}
                >
                  <LinearGradient
                    colors={['#FFA94D', '#FF8C42']}
                    style={styles.joinBtnGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Ionicons name="enter" size={22} color="#181818" style={{ marginRight: 8 }} />
                    <Text style={styles.joinBtnTextModern}>Rejoindre</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </LinearGradient>
            </View>
          </BlurView>
        </View>
      )}

      {/* Sidebar moderne pour les membres */}
      {/* Sidebar moderne pour les membres */}
      {showMembersSidebar && (
        <Pressable style={styles.sidebarOverlayModern} onPress={() => setShowMembersSidebar(false)}>
          <Pressable style={styles.sidebarContainerModern} onPress={(e) => e.stopPropagation()}>
            <LinearGradient
              colors={['#232323', '#1a1a1a']}
              style={styles.sidebarGradient}
            >
              <BlurView intensity={30} tint="dark" style={styles.sidebarBlur}>
                <View style={styles.sidebarHeaderModern}>
                  <View style={styles.sidebarHeaderContent}>
                    <Ionicons name="people" size={24} color="#FFA94D" />
                    <Text style={styles.sidebarTitleModern}>Membres ({members.length})</Text>
                  </View>
                  <TouchableOpacity onPress={() => setShowMembersSidebar(false)} style={styles.sidebarCloseBtnModern}>
                    <Ionicons name="close" size={28} color="#FFA94D" />
                  </TouchableOpacity>
                </View>
                
                <FlatList
                  data={members}
                  keyExtractor={(item, idx) => (item.user || 'U') + idx}
                  renderItem={({ item }) => (
                    <View style={styles.sidebarMemberRowModern}>
                      <Image
                        source={{ uri: item.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.user || 'U')}&background=FFA94D&color=181818&size=128` }}
                        style={styles.sidebarMemberAvatarModern}
                      />
                      <View style={styles.sidebarMemberInfo}>
                        <Text style={styles.sidebarMemberNameModern}>{item.user}</Text>
                        <Text style={styles.sidebarMemberStatusModern}>En ligne</Text>
                      </View>
                      <View style={styles.onlineIndicatorSmall} />
                    </View>
                  )}
                  contentContainerStyle={{ paddingVertical: 16 }}
                  showsVerticalScrollIndicator={false}
                />
              </BlurView>
            </LinearGradient>
          </Pressable>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Header moderne
  headerModern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 200,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerBlur: {
    paddingTop: 50,
    paddingBottom: 12,
  },
  groupHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  backBtnModern: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 169, 77, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenterContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 12,
  },
  groupTitleModern: {
    color: '#FFA94D',
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  headerActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerActionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 169, 77, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  membersBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FFA94D',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  membersBadgeText: {
    color: '#181818',
    fontSize: 11,
    fontWeight: 'bold',
  },
  
  // Section membres
  membersSection: {
    marginTop: 110,
    marginBottom: 8,
  },
  membersGradient: {
    paddingVertical: 0,
  },
  memberCard: {
    alignItems: 'center',
    marginRight: 12,
    position: 'relative',
  },
  memberAvatarModern: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#FFA94D',
    backgroundColor: '#232323',
  },
  onlineIndicatorSmall: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#181818',
  },
  membersCountBubble: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 169, 77, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 169, 77, 0.4)',
  },
  membersCountText: {
    color: '#FFA94D',
    fontSize: 13,
    fontWeight: 'bold',
  },
  
  // Chat container
  chatContainer: {
    flex: 1,
    backgroundColor: '#181818',
    marginTop: 80,
  },
  chatDisabled: {
    opacity: 0.3,
  },
  
  // Messages
  messageRowModern: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginVertical: 6,
    paddingHorizontal: 4,
  },
  messageRowMe: {
    justifyContent: 'flex-end',
  },
  messageRowOther: {
    justifyContent: 'flex-start',
  },
  messageAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginHorizontal: 6,
    backgroundColor: '#232323',
    borderWidth: 2,
    borderColor: '#FFA94D',
  },
  messageAvatarContainer: {
    alignItems: 'flex-start',
    marginTop: 8,
    marginLeft: 12,
  },
  messageAvatarContainerMe: {
    alignItems: 'flex-end',
    marginLeft: 0,
    marginRight: 12,
  },
  messageAvatarBottom: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#232323',
    borderWidth: 2,
    borderColor: '#FFA94D',
  },
  messageBubbleContainer: {
    maxWidth: '80%',
  },
  messageUserName: {
    color: '#FFA94D',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
    marginLeft: 12,
  },
  messageBubbleModern: {
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  messageBubbleMe: {
    backgroundColor: '#FFA94D',
    borderBottomRightRadius: 4,
  },
  messageBubbleOther: {
    backgroundColor: '#2a2a2a',
    borderBottomLeftRadius: 4,
  },
  messageTextModern: {
    color: '#fff',
    fontSize: 15,
    lineHeight: 20,
  },
  messageTextMe: {
    color: '#181818',
  },
  messageTimeModern: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
    marginLeft: 12,
  },
  messageTimeMeModern: {
    textAlign: 'right',
    marginRight: 12,
    marginLeft: 0,
  },
  
  // Composer
  composerBlur: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  composerModern: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  composerFocused: {
    paddingBottom: 16,
  },
  attachButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#333',
  },
  inputModern: {
    minHeight: 44,
    maxHeight: 120,
    color: '#fff',
    fontSize: 15,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  sendButtonContainer: {
    borderRadius: 22,
    overflow: 'hidden',
  },
  sendButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 169, 77, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Media message styles
  mediaBubble: {
    padding: 4,
    maxWidth: 280,
  },
  messageImage: {
    width: 240,
    height: 180,
    borderRadius: 12,
    backgroundColor: '#2a2a2a',
  },
  audioMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 220,
    gap: 12,
  },
  audioPlayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 169, 77, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  audioPlayButtonActive: {
    backgroundColor: 'rgba(255, 169, 77, 0.3)',
    borderColor: 'rgba(255, 169, 77, 0.5)',
  },
  audioPlayButtonListened: {
    backgroundColor: 'rgba(85, 85, 85, 0.2)',
    borderColor: 'transparent',
  },
  audioWaveformContainer: {
    flex: 1,
    gap: 6,
  },
  audioWaveform: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 32,
    gap: 2,
  },
  audioBar: {
    width: 3,
    borderRadius: 2,
  },
  audioTime: {
    color: '#999',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  audioTimeMe: {
    color: '#666',
  },
  audioTimeListened: {
    color: '#555',
  },
  audioDuration: {
    color: '#999',
    fontSize: 12,
    fontWeight: '600',
  },
  audioDurationMe: {
    color: '#666',
  },
  linkPreviewContainer: {
    marginTop: 8,
    gap: 8,
  },
  linkPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 8,
    backgroundColor: 'rgba(255, 169, 77, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 169, 77, 0.2)',
  },
  linkText: {
    flex: 1,
    color: '#FFA94D',
    fontSize: 12,
    fontWeight: '500',
  },
  linkTextMe: {
    color: '#181818',
  },
  
  // Recording UI
  recordingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#232323',
    borderTopWidth: 1,
    borderColor: 'rgba(255, 169, 77, 0.2)',
    gap: 12,
  },
  cancelRecordButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordingWaveform: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 44,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(255, 169, 77, 0.1)',
    borderRadius: 22,
    gap: 2,
  },
  recordingBar: {
    width: 3,
    borderRadius: 2,
  },
  recordingTimer: {
    color: '#FFA94D',
    fontSize: 14,
    fontWeight: 'bold',
    minWidth: 50,
    textAlign: 'center',
  },
  sendRecordButton: {
    borderRadius: 22,
    overflow: 'hidden',
  },
  
  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBlur: {
    paddingBottom: 40,
  },
  mediaOptionsContainer: {
    backgroundColor: '#232323',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(255, 169, 77, 0.2)',
  },
  mediaOptionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  mediaOptionsTitle: {
    color: '#FFA94D',
    fontSize: 20,
    fontWeight: 'bold',
  },
  mediaOptionsGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  mediaOption: {
    flex: 1,
    alignItems: 'center',
    gap: 12,
  },
  mediaOptionGradient: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 169, 77, 0.3)',
  },
  mediaOptionText: {
    color: '#999',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  
  // Upload overlay
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadingBlur: {
    padding: 32,
    borderRadius: 20,
    alignItems: 'center',
    gap: 16,
  },
  uploadingText: {
    color: '#FFA94D',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Join overlay
  joinOverlayModern: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 99,
  },
  joinOverlayBlur: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  joinContent: {
    width: '100%',
    maxWidth: 360,
  },
  joinCard: {
    backgroundColor: '#232323',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 169, 77, 0.3)',
  },
  joinTitle: {
    color: '#FFA94D',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  joinSubtitle: {
    color: '#999',
    fontSize: 15,
    marginBottom: 24,
    textAlign: 'center',
  },
  membersMiniPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  miniMemberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#232323',
    backgroundColor: '#2a2a2a',
  },
  miniMemberMore: {
    backgroundColor: 'rgba(255, 169, 77, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniMemberMoreText: {
    color: '#FFA94D',
    fontSize: 12,
    fontWeight: 'bold',
  },
  joinBtnModern: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#FFA94D',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  joinBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  joinBtnTextModern: {
    color: '#181818',
    fontSize: 17,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  
  // Sidebar
  sidebarOverlayModern: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    zIndex: 300,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
  },
  sidebarContainerModern: {
    width: 320,
    height: '100%',
  },
  sidebarGradient: {
    flex: 1,
    borderTopLeftRadius: 24,
    borderBottomLeftRadius: 24,
  },
  sidebarBlur: {
    flex: 1,
  },
  sidebarHeaderModern: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  sidebarHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sidebarTitleModern: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFA94D',
  },
  sidebarCloseBtnModern: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 169, 77, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sidebarMemberRowModern: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  sidebarMemberAvatarModern: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#232323',
    borderWidth: 2,
    borderColor: '#FFA94D',
    marginRight: 12,
  },
  sidebarMemberInfo: {
    flex: 1,
  },
  sidebarMemberNameModern: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '600',
    marginBottom: 2,
  },
  sidebarMemberStatusModern: {
    fontSize: 13,
    color: '#4CAF50',
  },
  // Styles pour les réponses
  replyPreview: {
    marginBottom: 8,
    paddingLeft: 12,
    paddingRight: 12,
    paddingTop: 8,
    paddingBottom: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    flexDirection: 'row',
  },
  replyBar: {
    width: 3,
    borderRadius: 2,
    backgroundColor: '#FFA94D',
    marginRight: 8,
  },
  replyBarMe: {
    backgroundColor: '#181818',
  },
  replyContent: {
    flex: 1,
  },
  replyUser: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFA94D',
    marginBottom: 2,
  },
  replyUserMe: {
    color: '#181818',
  },
  replyText: {
    fontSize: 12,
    color: '#999',
  },
  replyTextMe: {
    color: 'rgba(24, 24, 24, 0.6)',
  },
  replyBarContainer: {
    position: 'absolute',
    bottom: 70,
    left: 0,
    right: 0,
  },
  replyBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginHorizontal: 12,
    backgroundColor: 'rgba(35, 35, 35, 0.95)',
  },
  replyBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  replyBarIndicator: {
    width: 3,
    height: 36,
    borderRadius: 2,
    backgroundColor: '#FFA94D',
    marginRight: 12,
  },
  replyBarTextContainer: {
    flex: 1,
  },
  replyBarUser: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFA94D',
    marginBottom: 3,
  },
  replyBarMessage: {
    fontSize: 13,
    color: '#ccc',
  },
  replyBarComposer: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 169, 77, 0.2)',
  },
  swipeReplyIcon: {
    position: 'absolute',
    right: 16,
    top: '50%',
    marginTop: -12,
    zIndex: -1,
  },
});