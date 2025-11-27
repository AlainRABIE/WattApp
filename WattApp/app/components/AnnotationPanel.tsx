import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { collection, addDoc, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../../constants/firebaseConfig';
import { getAuth } from 'firebase/auth';

// Props: projectId, page (ou imageId), type ('image' ou 'texte')
export default function AnnotationPanel({ projectId, page, type }) {
  const [annotations, setAnnotations] = useState([]);
  const [newAnnotation, setNewAnnotation] = useState('');
  const user = getAuth().currentUser;

  useEffect(() => {
    if (!projectId) return;
    const q = query(
      collection(db, 'projects', projectId, 'annotations'),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAnnotations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return unsubscribe;
  }, [projectId]);

  const addAnnotation = async () => {
    if (!newAnnotation.trim() || !user) return;
    await addDoc(collection(db, 'projects', projectId, 'annotations'), {
      type,
      content: newAnnotation,
      page,
      authorId: user.uid,
      authorName: user.displayName || user.email,
      createdAt: new Date(),
      visibility: 'collaborative',
    });
    setNewAnnotation('');
  };

  return (
    <View style={styles.panel}>
      <Text style={styles.title}>Annotations collaboratives</Text>
      {annotations.filter(a => a.page === page && a.type === type).map(a => (
        <View key={a.id} style={styles.annotation}>
          <Text style={styles.author}>{a.authorName} :</Text>
          <Text style={styles.content}>{a.content}</Text>
        </View>
      ))}
      <View style={styles.inputRow}>
        <TextInput
          value={newAnnotation}
          onChangeText={setNewAnnotation}
          placeholder="Ajouter une annotation..."
          placeholderTextColor="#888"
          style={styles.input}
        />
        <TouchableOpacity onPress={addAnnotation} style={styles.addBtn}>
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: '#232323',
    borderRadius: 12,
    padding: 12,
    margin: 10,
  },
  title: {
    color: '#FFA94D',
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 8,
  },
  annotation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  author: {
    color: '#FFA94D',
    marginRight: 6,
    fontWeight: 'bold',
  },
  content: {
    color: '#fff',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#181818',
    color: '#fff',
    borderRadius: 6,
    padding: 8,
    marginRight: 6,
  },
  addBtn: {
    backgroundColor: '#FFA94D',
    borderRadius: 6,
    padding: 10,
  },
});
