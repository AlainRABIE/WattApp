import React, { useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, Image, StyleSheet } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSubmit: (cover: string, title: string, synopsis: string) => void;
}

export default function PublishDetailsModal({ visible, onClose, onSubmit }: Props) {
  const [cover, setCover] = useState<string>('');
  const [title, setTitle] = useState('');
  const [synopsis, setSynopsis] = useState('');
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    setLoading(true);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });
    setLoading(false);
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setCover(result.assets[0].uri);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>Publier le livre</Text>
          <TouchableOpacity style={styles.coverPicker} onPress={pickImage}>
            {cover ? (
              <Image source={{ uri: cover }} style={styles.coverImage} />
            ) : (
              <Text style={styles.coverPlaceholder}>Choisir une couverture</Text>
            )}
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            placeholder="Titre du livre"
            value={title}
            onChangeText={setTitle}
          />
          <TextInput
            style={[styles.input, { height: 80 }]}
            placeholder="Synopsis"
            value={synopsis}
            onChangeText={setSynopsis}
            multiline
          />
          <View style={styles.row}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.submitBtn}
              onPress={() => onSubmit(cover, title, synopsis)}
              disabled={loading || !title.trim() || !synopsis.trim()}
            >
              <Text style={styles.submitText}>Valider</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '90%',
    backgroundColor: '#232323',
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 18,
  },
  coverPicker: {
    width: 120,
    height: 160,
    backgroundColor: '#444',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
    overflow: 'hidden',
  },
  coverImage: {
    width: 120,
    height: 160,
    resizeMode: 'cover',
  },
  coverPlaceholder: {
    color: '#bbb',
    fontSize: 14,
  },
  input: {
    width: '100%',
    backgroundColor: '#333',
    color: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 10,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#444',
    borderRadius: 8,
    padding: 12,
    marginRight: 8,
    alignItems: 'center',
  },
  cancelText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  submitBtn: {
    flex: 1,
    backgroundColor: '#34C759',
    borderRadius: 8,
    padding: 12,
    marginLeft: 8,
    alignItems: 'center',
  },
  submitText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
