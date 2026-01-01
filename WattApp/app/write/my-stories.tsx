import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Image,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getAuth } from 'firebase/auth';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../../constants/firebaseConfig';

interface Story {
  id: string;
  title: string;
  content: string;
  wordCount: number;
  updatedAt: any;
  createdAt: any;
}

const MyStories: React.FC = () => {
  const router = useRouter();
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadStories();
  }, []);

  const loadStories = async () => {
    setLoading(true);
    try {
      const auth = getAuth();
      if (!auth.currentUser) return;

      const storiesRef = collection(db, 'users', auth.currentUser.uid, 'books');
      const q = query(storiesRef, orderBy('updatedAt', 'desc'));
      const snapshot = await getDocs(q);

      const loadedStories: Story[] = [];
      snapshot.forEach((doc) => {
        loadedStories.push({
          id: doc.id,
          ...doc.data()
        } as Story);
      });

      setStories(loadedStories);
    } catch (error) {
      console.error('Erreur chargement:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: any) => {
    if (!date) return '';
    const d = date.toDate ? date.toDate() : new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return "Aujourd'hui";
    if (days === 1) return "Hier";
    if (days < 7) return `Il y a ${days} jours`;
    return d.toLocaleDateString('fr-FR');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#FF6800" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mes Histoires</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => router.push('/write/wattpad-editor?projectId=new')}
        >
          <Ionicons name="add" size={28} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Liste des histoires */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadStories} />
        }
      >
        {stories.length === 0 && !loading ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="book-outline" size={80} color="#DDD" />
            <Text style={styles.emptyTitle}>Aucune histoire</Text>
            <Text style={styles.emptyText}>
              Commencez à écrire votre première histoire !
            </Text>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => router.push('/write/wattpad-editor?projectId=new')}
            >
              <Text style={styles.createButtonText}>Créer une histoire</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.storiesContainer}>
            {stories.map((story) => (
              <TouchableOpacity
                key={story.id}
                style={styles.storyCard}
                onPress={() => router.push(`/write/wattpad-editor?projectId=${story.id}`)}
                activeOpacity={0.7}
              >
                <View style={styles.storyContent}>
                  <Text style={styles.storyTitle} numberOfLines={2}>
                    {story.title || 'Sans titre'}
                  </Text>
                  <Text style={styles.storyPreview} numberOfLines={2}>
                    {story.content || 'Commencez à écrire...'}
                  </Text>
                  <View style={styles.storyFooter}>
                    <Text style={styles.storyMeta}>
                      {story.wordCount || 0} mots
                    </Text>
                    <Text style={styles.storyDate}>
                      {formatDate(story.updatedAt)}
                    </Text>
                  </View>
                </View>
                <View style={styles.storyArrow}>
                  <Ionicons name="chevron-forward" size={20} color="#999" />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Bouton flottant */}
      {stories.length > 0 && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push('/write/wattpad-editor?projectId=new')}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={28} color="#FFF" />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    height: 60,
    backgroundColor: '#FF6800',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: StatusBar.currentHeight || 0,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    textAlign: 'center',
  },
  addButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  createButton: {
    backgroundColor: '#FF6800',
    paddingHorizontal: 30,
    paddingVertical: 14,
    borderRadius: 25,
  },
  createButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  storiesContainer: {
    padding: 16,
  },
  storyCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  storyContent: {
    flex: 1,
  },
  storyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  storyPreview: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  storyFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  storyMeta: {
    fontSize: 13,
    color: '#999',
    fontWeight: '500',
  },
  storyDate: {
    fontSize: 13,
    color: '#999',
  },
  storyArrow: {
    marginLeft: 12,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FF6800',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});

export default MyStories;
