import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Dimensions } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import DrawingCanvas from './components/DrawingCanvas';

export default function DrawCollabScreen() {
  // Récupère le roomId depuis l'URL (ex: /draw?roomId=xxxx)
  const params = useLocalSearchParams();
  const roomId = params.roomId as string | undefined;

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
