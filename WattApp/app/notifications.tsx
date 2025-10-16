import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function NotificationsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Notifications</Text>
      <Text style={styles.subtitle}>Tes notifications apparaitront ici.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#181818', alignItems: 'center', justifyContent: 'center' },
  title: { color: '#FFA94D', fontSize: 28, fontWeight: '700' },
  subtitle: { color: '#fff', marginTop: 12 },
});
