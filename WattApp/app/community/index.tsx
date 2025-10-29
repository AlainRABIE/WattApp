import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const CATEGORIES = [
  { name: "Roman d'amour", color: ["#FFB347", "#FFCC80"] },
  { name: "Fanfiction", color: ["#6DD5FA", "#2980B9"] },
  { name: "Fiction générale", color: ["#F7971E", "#FFD200"] },
  { name: "Roman pour adolescents", color: ["#F857A6", "#FF5858"] },
  { name: "Aléatoire", color: ["#43CEA2", "#185A9D"] },
  { name: "Action", color: ["#FF5858", "#FBCA1F"] },
  { name: "Aventure", color: ["#36D1C4", "#1E5799"] },
  { name: "Nouvelles", color: ["#B06AB3", "#4568DC"] },
  { name: "Fantasy", color: ["#F7971E", "#FFD200"] },
  { name: "Non-Fiction", color: ["#43CEA2", "#185A9D"] },
  { name: "Fantastique", color: ["#F857A6", "#FF5858"] },
  { name: "Mystère", color: ["#6DD5FA", "#2980B9"] },
];

export default function CommunityIndex() {
  const router = useRouter();
  return (
    <View style={styles.container}>
      <Text style={styles.header}>Communauté</Text>
      <Text style={styles.subtitle}>Choisis une rubrique pour discuter avec la communauté :</Text>
      <ScrollView contentContainerStyle={styles.cardsContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.gridPremium}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.name}
              style={styles.cardPremiumWrapper}
              onPress={() => router.push({ pathname: `/community/[category]`, params: { category: cat.name } })}
              activeOpacity={0.93}
            >
              <LinearGradient
                colors={cat.color as [string, string]}
                start={{ x: 0.1, y: 0.1 }}
                end={{ x: 1, y: 1 }}
                style={styles.cardPremium}
              >
                <View style={styles.iconCirclePremium}>
                  <Ionicons name="chatbubbles-outline" size={22} color="#23232a" />
                </View>
                <Text style={styles.cardTitlePremium}>{cat.name}</Text>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#181818',
    paddingHorizontal: 0,
    paddingTop: 0,
  },
  header: {
    color: '#FFA94D',
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 48,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  subtitle: {
    color: '#aaa',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 18,
    letterSpacing: 0.1,
  },
  cardsContainer: {
    paddingVertical: 18,
    paddingHorizontal: 8,
  },
  gridPremium: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 0,
  },
  cardPremiumWrapper: {
    width: '100%',
    maxWidth: 340,
    minWidth: 170,
    aspectRatio: 2.7,
    marginBottom: 18,
    borderRadius: 32,
    overflow: 'hidden',
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.13,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  cardPremium: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    borderRadius: 32,
    paddingVertical: 0,
    paddingHorizontal: 22,
    height: '100%',
  },
  iconCirclePremium: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.82)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 18,
    shadowColor: '#000',
    shadowOpacity: 0.10,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  cardTitlePremium: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'left',
    letterSpacing: 0.2,
    flexShrink: 1,
    textShadowColor: '#0006',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
