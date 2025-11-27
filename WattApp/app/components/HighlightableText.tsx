
import React, { useState } from 'react';
import { View, Text, Modal, TextInput, Button, ActivityIndicator } from 'react-native';
import SelectableText from 'react-native-selectable-text';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../constants/firebaseConfig';
import { getAuth } from 'firebase/auth';

// Utilise LibreTranslate (open source, gratuit)
async function translateText(text, source = 'fr', target = 'en') {
  try {
    const res = await fetch('https://libretranslate.com/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: text, source, target, format: 'text' })
    });
    const data = await res.json();
    return data.translatedText;
  } catch {
    return null;
  }
}

// Utilise l'API Wiktionary (open source, gratuite)
async function getDefinition(word, lang = 'en') {
  try {
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/${lang}/${encodeURIComponent(word)}`);
    const data = await res.json();
    if (Array.isArray(data) && data[0]?.meanings?.length > 0) {
      const meaning = data[0].meanings[0];
      const def = meaning.definitions[0]?.definition;
      return def || 'Définition non trouvée';
    }
    return 'Définition non trouvée';
  } catch {
    return 'Erreur lors de la récupération de la définition';
  }
}

// Props: projectId, page, text
export default function HighlightableText({ projectId, page, text }) {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [note, setNote] = useState('');
  const [showTranslation, setShowTranslation] = useState(false);
  const [translation, setTranslation] = useState('');
  const [loadingTranslation, setLoadingTranslation] = useState(false);
  const [showDefinition, setShowDefinition] = useState(false);
  const [definition, setDefinition] = useState('');
  const [loadingDefinition, setLoadingDefinition] = useState(false);

  const handleSelection = ({ content, menuItem }) => {
    setSelectedText(content);
    setModalVisible(true);
    setShowTranslation(false);
    setTranslation('');
    setShowDefinition(false);
    setDefinition('');
    if (menuItem === 'Traduire') {
      handleTranslate(content);
    }
    if (menuItem === 'Définir') {
      handleDefinition(content);
    }
  };
  const handleDefinition = async (word) => {
    setLoadingDefinition(true);
    const def = await getDefinition(word, 'en'); // adapte la langue si besoin
    setDefinition(def);
    setShowDefinition(true);
    setLoadingDefinition(false);
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

  const handleTranslate = async (textToTranslate) => {
    setLoadingTranslation(true);
    const result = await translateText(textToTranslate, 'fr', 'en'); // adapte les langues si besoin
    setTranslation(result || 'Erreur de traduction');
    setShowTranslation(true);
    setLoadingTranslation(false);
  };

  return (
    <View>
      <SelectableText
        value={text}
        onSelection={handleSelection}
        menuItems={['Surligner', 'Traduire', 'Définir']}
        highlightColor="#FFFF00"
      />
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={{ flex: 1, justifyContent: 'center', backgroundColor: '#00000099' }}>
          <View style={{ backgroundColor: '#fff', margin: 20, borderRadius: 8, padding: 16 }}>
            <Text style={{ marginBottom: 8 }}>Sélectionné : <Text style={{ fontStyle: 'italic' }}>{selectedText}</Text></Text>
            <Button title="Traduire en anglais" onPress={() => handleTranslate(selectedText)} />
            {loadingTranslation && <ActivityIndicator style={{ marginVertical: 8 }} />}
            {showTranslation && (
              <Text style={{ marginVertical: 8, color: '#0070BA' }}>Traduction : {translation}</Text>
            )}
            <Button title="Définir (dictionnaire)" onPress={() => handleDefinition(selectedText)} />
            {loadingDefinition && <ActivityIndicator style={{ marginVertical: 8 }} />}
            {showDefinition && (
              <Text style={{ marginVertical: 8, color: '#FFA94D' }}>Définition : {definition}</Text>
            )}
            <Text style={{ marginBottom: 8, marginTop: 12 }}>Ajouter une note à ce surlignement :</Text>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="Note (optionnel)"
              style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 6, marginBottom: 12, padding: 8 }}
            />
            <Button title="Enregistrer le surlignement" onPress={saveHighlight} />
            <Button title="Annuler" onPress={() => setModalVisible(false)} color="#FF5555" />
          </View>
        </View>
      </Modal>
    </View>
  );
}
