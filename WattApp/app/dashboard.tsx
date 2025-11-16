import { PieChart } from 'react-native-svg-charts';

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getAuth } from 'firebase/auth';
import app, { db } from '../constants/firebaseConfig';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { useRouter, useLocalSearchParams } from 'expo-router';

const COLORS = ['#FFA94D', '#4FC3F7', '#FF5A5F', '#7C3AED', '#43D9AD'];

const DashboardScreen = () => {
  const [stats, setStats] = useState({ likes: 0, views: 0, comments: 0, purchases: 0 });
  const [loading, setLoading] = useState(true);
  const [book, setBook] = useState<any>(null);
  const router = useRouter();
  const { bookId } = useLocalSearchParams();

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        if (!bookId) return;
        const bookRef = doc(db, 'books', String(bookId));
        const bookSnap = await getDoc(bookRef);
        if (!bookSnap.exists()) return;
        const data = bookSnap.data();
        setBook(data);
        setStats({
          likes: data.likes || 0,
          views: data.reads || 0,
          comments: data.commentsCount || 0,
          purchases: data.purchases || 0, // ou adapte selon ton schéma Firestore
        });
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [bookId]);

  // Préparation des données pour le camembert (PieChart)
  // IMPORTANT : PieChart n'accepte pas la propriété 'label' dans les data
  // Correction : s'assurer qu'aucune propriété booléenne ne se glisse dans les data du PieChart
  // Correction stricte : PieChart attend un tableau d'objets { key: string, value: number, svg: { fill: string } }
  // Correction ultime : log des données envoyées à PieChart pour debug
  const pieData = [
    { key: 'views', value: Number(stats.views) || 0, svg: { fill: COLORS[0] } },
    { key: 'likes', value: Number(stats.likes) || 0, svg: { fill: COLORS[1] } },
    { key: 'comments', value: Number(stats.comments) || 0, svg: { fill: COLORS[2] } },
    { key: 'purchases', value: Number(stats.purchases) || 0, svg: { fill: COLORS[3] } },
  ]
    .filter(d => typeof d.value === 'number' && !isNaN(d.value) && d.value > 0 && typeof d.key === 'string' && typeof d.svg?.fill === 'string')
    .map(d => ({ key: String(d.key), value: Number(d.value), svg: { fill: String(d.svg.fill) } }));
  console.log('[PieChart DATA]', pieData);
  // Pour la légende, on garde un tableau séparé
  const legendLabels = [
    { color: COLORS[0], label: 'Vues' },
    { color: COLORS[1], label: 'Likes' },
    { color: COLORS[2], label: 'Commentaires' },
    { color: COLORS[3], label: 'Achats' },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ alignItems: 'center', paddingBottom: 40 }}>
      <Text style={styles.title}>Statistiques du livre</Text>
      <View style={styles.pieContainer}>
        {pieData.length > 1 ? (
          <>
            <PieChart
              style={{ height: 180, width: 180 }}
              data={pieData}
              innerRadius={55}
              outerRadius={90}
            />
            <View style={styles.pieCenter}>
              <Ionicons name="stats-chart-outline" size={38} color="#FFA94D" />
            </View>
          </>
        ) : (
          <Text style={{ color: '#fff', textAlign: 'center', marginVertical: 40 }}>
            Pas assez de données pour afficher le camembert
          </Text>
        )}
      </View>
      <View style={styles.legendRow}>
        {legendLabels.map((d, i) => (
          <View key={d.label} style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: d.color }]} />
            <Text style={styles.legendLabel}>{d.label}</Text>
          </View>
        ))}
      </View>
      <View style={styles.cardsRow}>
        <View style={[styles.card, { backgroundColor: COLORS[0] }]}> 
          <Ionicons name="eye-outline" size={28} color="#181818" />
            <Text style={styles.cardValue}>{String(stats.views ?? 0)}</Text>
          <Text style={styles.cardLabel}>Vues</Text>
        </View>
        <View style={[styles.card, { backgroundColor: COLORS[1] }]}> 
          <Ionicons name="heart-outline" size={28} color="#181818" />
            <Text style={styles.cardValue}>{String(stats.likes ?? 0)}</Text>
          <Text style={styles.cardLabel}>Likes</Text>
        </View>
        <View style={[styles.card, { backgroundColor: COLORS[2] }]}> 
          <Ionicons name="chatbubble-ellipses-outline" size={28} color="#181818" />
            <Text style={styles.cardValue}>{String(stats.comments ?? 0)}</Text>
          <Text style={styles.cardLabel}>Commentaires</Text>
        </View>
        <View style={[styles.card, { backgroundColor: COLORS[3] }]}> 
          <Ionicons name="cart-outline" size={28} color="#181818" />
            <Text style={styles.cardValue}>{String(stats.purchases ?? 0)}</Text>
          <Text style={styles.cardLabel}>Achats</Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#181818' },
  title: { color: '#FFA94D', fontSize: 24, fontWeight: 'bold', marginTop: 32, marginBottom: 18 },
  pieContainer: { alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  pieCenter: { position: 'absolute', top: 90, left: 90, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  legendRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 18 },
  legendItem: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 8 },
  legendColor: { width: 16, height: 16, borderRadius: 8, marginRight: 6 },
  legendLabel: { color: '#fff', fontSize: 13 },
  cardsRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 10 },
  card: { alignItems: 'center', borderRadius: 16, padding: 18, marginHorizontal: 8, minWidth: 90, elevation: 2 },
  cardValue: { color: '#181818', fontWeight: 'bold', fontSize: 22, marginTop: 6 },
  cardLabel: { color: '#181818', fontSize: 13, marginTop: 2 },
});

export default DashboardScreen;
