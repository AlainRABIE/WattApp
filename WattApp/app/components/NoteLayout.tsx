import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

type Props = {
  title?: string;
  right?: React.ReactNode;
  children?: React.ReactNode;
};

const NoteLayout: React.FC<Props> = ({ title, right, children }) => {
  const router = useRouter();
  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.cancel}>Annuler</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title || 'Sélectionner un modèle'}</Text>
        <View style={styles.headerRight}>{right}</View>
      </View>

      <View style={styles.body}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#111' },
  header: { width: '100%', paddingHorizontal: 12, paddingTop: 12, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cancel: { color: '#4FC3F7' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  body: { flex: 1 },
});

export default NoteLayout;
