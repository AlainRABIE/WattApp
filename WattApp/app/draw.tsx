
import React, { useEffect, useRef } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Dimensions, Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import DrawingCanvas from './components/DrawingCanvas';

// Firebase imports
import app, { db } from '../constants/firebaseConfig';
import { getAuth } from 'firebase/auth';
import { doc, getDoc, addDoc, collection, serverTimestamp, updateDoc } from 'firebase/firestore';

export default function DrawCollabScreen() {
  // Récupère le roomId depuis l'URL (ex: /draw?roomId=xxxx)
  const params = useLocalSearchParams();
  const roomId = params.roomId as string | undefined;

  // Pour éviter d'envoyer plusieurs fois le message d'acceptation
  const hasSentAcceptRef = useRef(false);

  useEffect(() => {
    if (!roomId) return;
    if (hasSentAcceptRef.current) return;

    // Récupère la room pour trouver l'expéditeur
    const sendAcceptMessage = async () => {
      try {
        const auth = getAuth(app);
        const current = auth.currentUser;
        if (!current) return;

        // On suppose que le document Firestore de la room contient l'info sur l'expéditeur
        const roomDocRef = doc(db, 'drawingRooms', roomId);
        const roomSnap = await getDoc(roomDocRef);
        if (!roomSnap.exists()) return;
        const roomData = roomSnap.data();
        const inviterUid = roomData?.inviterUid;
        const chatId = roomData?.chatId;

        // Si pas d'inviterUid ou pas de chatId, on ne peut pas notifier
        if (!inviterUid || !chatId) return;

        // Si l'utilisateur courant est l'inviteur, ne rien faire
        if (current.uid === inviterUid) return;

        // Envoie le message d'acceptation dans le chat
        const userDisplayName = current.displayName || current.email || 'Un utilisateur';
        await addDoc(collection(db, 'chats', chatId, 'messages'), {
          sender: current.uid,
          text: `${userDisplayName} a accepté la demande de collaboration !`,
          createdAt: serverTimestamp(),
          type: 'draw-accept',
          roomId,
        });
        // Met à jour le chat principal
        const chatDocRef = doc(db, 'chats', chatId);
        await updateDoc(chatDocRef, {
          lastMessageText: `[${userDisplayName} a accepté la collaboration]`,
          lastMessageAt: serverTimestamp(),
        });
        hasSentAcceptRef.current = true;
      } catch (e) {
        // Optionnel : afficher une alerte ou log
        console.warn('Erreur envoi message acceptation collaboration:', e);
      }
    };
    sendAcceptMessage();
  }, [roomId]);

  if (!roomId) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: '#fff' }}>Aucune session collaborative trouvée.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Session collaborative</Text>
      <DrawingCanvas collaborative={true} roomId={roomId} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#181818',
    justifyContent: 'flex-start',
    alignItems: 'stretch',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#181818',
  },
  title: {
    color: '#FFA94D',
    fontWeight: 'bold',
    fontSize: 20,
    textAlign: 'center',
    marginVertical: 16,
  },
});
