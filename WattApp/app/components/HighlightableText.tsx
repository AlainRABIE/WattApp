import React, { useState } from 'react';
import { View, Text, Modal, TextInput, Button } from 'react-native';
import SelectableText from 'react-native-selectable-text';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../constants/firebaseConfig';
import { getAuth } from 'firebase/auth';

// Props: projectId, page, text
export default function HighlightableText({ projectId, page, text }) {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [note, setNote] = useState('');

  const handleSelection = ({ content }) => {
    setSelectedText(content);
    setModalVisible(true);
  };

  const saveHighlight = async () => {
    const user = getAuth().currentUser;
    if (!user || !selectedText) return;
    await addDoc(collection(db, 'projects', projectId, 'highlights'), {
      page,
      text: selectedText,
      note,
      authorId: user.uid,
      createdAt: new Date(),
      color: '#FFFF00',
    });
    setModalVisible(false);
    setNote('');
    setSelectedText('');
  };

  return (
    <View>
      <SelectableText
        value={text}
        onSelection={handleSelection}
        menuItems={['Surligner']}
        highlightColor="#FFFF00"
      />
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={{ flex: 1, justifyContent: 'center', backgroundColor: '#00000099' }}>
          <View style={{ backgroundColor: '#fff', margin: 20, borderRadius: 8, padding: 16 }}>
            <Text style={{ marginBottom: 8 }}>Ajouter une note à ce surlignement :</Text>
            <Text style={{ fontStyle: 'italic', marginBottom: 8 }}>{selectedText}</Text>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="Note (optionnel)"
              style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 6, marginBottom: 12, padding: 8 }}
            />
            <Button title="Enregistrer" onPress={saveHighlight} />
            <Button title="Annuler" onPress={() => setModalVisible(false)} color="#FF5555" />
          </View>
        </View>
      </Modal>
    </View>
  );
}
