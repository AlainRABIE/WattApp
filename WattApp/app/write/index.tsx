import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const WritingDashboard: React.FC = () => {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <LinearGradient
        colors={['#1a1a2e', '#16213e', '#0f3460']}
        style={styles.background}
      >
        {/* En-tête simple */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Création</Text>
          <Text style={styles.headerSubtitle}>Choisissez votre mode de création</Text>
        </View>

        {/* Cartes principales - Livre ou Manga */}
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ÉCRIRE UN LIVRE */}
          <TouchableOpacity
            style={styles.mainCard}
            activeOpacity={0.9}
            onPress={() => router.push('/write/book-setup?projectId=new')}
          >
            <LinearGradient
              colors={['#667eea', '#764ba2']}
              style={styles.cardGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.cardContent}>
                <View style={styles.cardIcon}>
                  <Ionicons name="book" size={48} color="#FFFFFF" />
                </View>
                <Text style={styles.cardTitle}>Écrire un Livre</Text>
                <Text style={styles.cardDescription}>
                  Romans, nouvelles, essais
                </Text>
                <View style={styles.cardFeatures}>
                  <Text style={styles.featureText}>✦ Éditeur de texte simple</Text>
                  <Text style={styles.featureText}>✦ Gestion des chapitres</Text>
                  <Text style={styles.featureText}>✦ Publication facile</Text>
                </View>
              </View>
              <View style={styles.arrowContainer}>
                <Ionicons name="arrow-forward" size={24} color="rgba(255,255,255,0.8)" />
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {/* CRÉER UN MANGA */}
          <TouchableOpacity
            style={styles.mainCard}
            activeOpacity={0.9}
            onPress={() => router.push('/write/manga-editor/simple-fixed?projectId=new')}
          >
            <LinearGradient
              colors={['#f093fb', '#f5576c']}
              style={styles.cardGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.cardContent}>
                <View style={styles.cardIcon}>
                  <Ionicons name="brush" size={48} color="#FFFFFF" />
                </View>
                <Text style={styles.cardTitle}>Créer un Manga</Text>
                <Text style={styles.cardDescription}>
                  Mangas, webtoons, BD
                </Text>
                <View style={styles.cardFeatures}>
                  <Text style={styles.featureText}>✦ Outils de dessin</Text>
                  <Text style={styles.featureText}>✦ Layouts manga</Text>
                  <Text style={styles.featureText}>✦ Bulles de dialogue</Text>
                </View>
              </View>
              <View style={styles.arrowContainer}>
                <Ionicons name="arrow-forward" size={24} color="rgba(255,255,255,0.8)" />
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {/* Actions rapides en bas */}
          <View style={styles.quickActionsSection}>
            <Text style={styles.sectionTitle}>Actions Rapides</Text>
            
            <View style={styles.quickActionsGrid}>
              {/* Templates Livre */}
              <TouchableOpacity
                style={styles.quickActionCard}
                onPress={() => router.push('/write/my-stories')}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: '#667eea' }]}>
                  <Ionicons name="document-text" size={24} color="#FFF" />
                </View>
                <Text style={styles.quickActionText}>Mes{'\n'}Histoires</Text>
              </TouchableOpacity>

              {/* Templates Manga */}
              <TouchableOpacity
                style={styles.quickActionCard}
                onPress={() => router.push('/write/manga-templates')}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: '#f5576c' }]}>
                  <Ionicons name="apps" size={24} color="#FFF" />
                </View>
                <Text style={styles.quickActionText}>Templates{'\n'}Manga</Text>
              </TouchableOpacity>

              {/* Mes Histoires */}
              <TouchableOpacity
                style={styles.quickActionCard}
                onPress={() => router.push('/write/my-stories')}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: '#4CAF50' }]}>
                  <Ionicons name="folder-open" size={24} color="#FFF" />
                </View>
                <Text style={styles.quickActionText}>Mes{'\n'}Histoires</Text>
              </TouchableOpacity>

              {/* Publier */}
              <TouchableOpacity
                style={styles.quickActionCard}
                onPress={() => router.push('/write/publish-manga')}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: '#FF9800' }]}>
                  <Ionicons name="rocket" size={24} color="#FFF" />
                </View>
                <Text style={styles.quickActionText}>Publier</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  background: {
    flex: 1,
  },
  header: {
    paddingTop: StatusBar.currentHeight ? StatusBar.currentHeight + 20 : 60,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  headerTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  mainCard: {
    width: '100%',
    height: 240,
    marginBottom: 20,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  cardGradient: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
  },
  cardContent: {
    flex: 1,
  },
  cardIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 16,
  },
  cardFeatures: {
    marginTop: 8,
  },
  featureText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 6,
  },
  arrowContainer: {
    alignSelf: 'flex-end',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionsSection: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionCard: {
    width: (width - 60) / 2,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  quickActionText: {
    fontSize: 13,
    color: '#FFFFFF',
    textAlign: 'center',
    fontWeight: '600',
  },
});

export default WritingDashboard;
