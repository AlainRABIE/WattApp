import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import MangaCoverCreator from '../components/MangaCoverCreator';

const MangaCoverCreatorPage: React.FC = () => {
  const router = useRouter();
  const [showCreator, setShowCreator] = useState(true);

  const handleSaveCover = async (coverData: { type: 'drawn' | 'imported'; uri: string; title?: string }) => {
    try {
      // Ici on pourrait sauvegarder la couverture dans AsyncStorage ou Firebase
      Alert.alert(
        '✅ Couverture sauvegardée !',
        'Votre couverture a été créée avec succès. Vous pouvez maintenant l\'associer à un manga.',
        [
          {
            text: 'Créer un manga',
            onPress: () => router.push('/write/manga-editor/simple?projectId=new')
          },
          {
            text: 'Retour au menu',
            onPress: () => router.back()
          }
        ]
      );
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de sauvegarder la couverture');
    }
  };

  const handleClose = () => {
    router.back();
  };

  return (
    <View style={styles.container}>
      <MangaCoverCreator
        visible={showCreator}
        onClose={handleClose}
        onSaveCover={handleSaveCover}
        initialTitle="Mon Nouveau Manga"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default MangaCoverCreatorPage;