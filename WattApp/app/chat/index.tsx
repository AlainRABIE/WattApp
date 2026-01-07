import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator, StatusBar, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import app, { db } from '../../constants/firebaseConfig';
import { collection, query as firestoreQuery, where, getDocs, onSnapshot, orderBy } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';

export default function ChatsList() {
  const [loading, setLoading] = useState(false);
  const [chats, setChats] = useState<any[]>([]);
  const router = useRouter();
  const { theme } = useTheme();

  useEffect(() => {
    let unsub: any;
    async function load() {
      setLoading(true);
      try {
        const auth = getAuth(app);
        const current = auth.currentUser;
        if (!current) return;
        // listen to chats where current is a participant
        const q = firestoreQuery(collection(db, 'chats'));
        // simple approach: subscribe to all chats and filter client-side
        unsub = onSnapshot(q, snap => {
          const items = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
          const mine = items.filter(i => Array.isArray(i.participants) && i.participants.includes(current.uid));
          // sort by lastMessageAt desc
          mine.sort((a, b) => (b.lastMessageAt?.toMillis ? b.lastMessageAt.toMillis() : 0) - (a.lastMessageAt?.toMillis ? a.lastMessageAt.toMillis() : 0));
          setChats(mine);
        });
      } catch (e) {
        console.warn('load chats failed', e);
      } finally {
        setLoading(false);
      }
    }
    load();
    return () => { if (unsub) unsub(); };
  }, []);

  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = new Date(timestamp.toMillis());
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'À l\'instant';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}j`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <LinearGradient
        colors={[`${theme.colors.primary}20`, `${theme.colors.primary}05`]}
        style={styles.emptyIconContainer}
      >
        <Ionicons name="chatbubbles-outline" size={64} color={theme.colors.primary} />
      </LinearGradient>
      <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>Aucun message</Text>
      <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
        Commencez une conversation avec vos amis
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle="light-content" />
      
      {/* Header moderne */}
      <View style={[styles.header, { backgroundColor: theme.colors.background }]}>
        <View style={styles.headerContent}>
          <Text style={[styles.title, { color: theme.colors.text }]}>Messages</Text>
          <View style={[styles.badge, { backgroundColor: `${theme.colors.primary}20` }]}>
            <Text style={[styles.badgeText, { color: theme.colors.primary }]}>{chats.length}</Text>
          </View>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Chargement des conversations...</Text>
        </View>
      ) : chats.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={chats}
          keyExtractor={(i) => i.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => {
            const otherId = (item.participants || []).find((p: string) => p !== getAuth(app).currentUser?.uid);
            const other = item.participantsMeta?.[otherId] || { displayName: 'Utilisateur', photoURL: null };
            const hasUnread = item.unreadCount && item.unreadCount > 0;
            
            return (
              <TouchableOpacity 
                style={[
                  styles.chatCard, 
                  { backgroundColor: theme.colors.surface },
                  hasUnread && { borderLeftWidth: 3, borderLeftColor: theme.colors.primary }
                ]}
                onPress={() => (router as any).push(`/chat/${item.id}`)}
                activeOpacity={0.7}
              >
                <View style={styles.avatarContainer}>
                  <Image 
                    source={{ 
                      uri: other.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(other.displayName || 'User')}&length=${((other.displayName || 'User') as string).trim().includes(' ') ? 2 : 1}&background=random&size=128` 
                    }} 
                    style={[styles.avatar, hasUnread && { borderWidth: 2, borderColor: theme.colors.primary }]} 
                  />
                  {hasUnread && (
                    <View style={[styles.onlineDot, { backgroundColor: theme.colors.primary }]} />
                  )}
                </View>
                
                <View style={styles.chatContent}>
                  <View style={styles.chatHeader}>
                    <Text style={[styles.name, { color: theme.colors.text }]} numberOfLines={1}>
                      {other.displayName || 'Utilisateur'}
                    </Text>
                    <Text style={[styles.time, { color: theme.colors.textSecondary }]}>
                      {formatTime(item.lastMessageAt)}
                    </Text>
                  </View>
                  
                  <View style={styles.messageRow}>
                    <Text 
                      style={[
                        styles.lastMessage, 
                        { color: hasUnread ? theme.colors.text : theme.colors.textSecondary },
                        hasUnread && { fontWeight: '600' }
                      ]} 
                      numberOfLines={1}
                    >
                      {item.lastMessageText || 'Aucun message'}
                    </Text>
                    {hasUnread && (
                      <View style={[styles.unreadBadge, { backgroundColor: theme.colors.primary }]}>
                        <Text style={[styles.unreadText, { color: theme.colors.background }]}>
                          {item.unreadCount > 9 ? '9+' : item.unreadCount}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} style={styles.chevron} />
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 60 : (StatusBar.currentHeight || 0) + 20,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { 
    fontSize: 32, 
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    marginTop: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  chatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 14,
  },
  avatar: { 
    width: 56, 
    height: 56, 
    borderRadius: 28,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#fff',
  },
  chatContent: {
    flex: 1,
    marginRight: 8,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: { 
    fontSize: 17, 
    fontWeight: '700',
    flex: 1,
  },
  time: {
    fontSize: 12,
    marginLeft: 8,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lastMessage: { 
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  unreadBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginLeft: 8,
  },
  unreadText: {
    fontSize: 11,
    fontWeight: '700',
  },
  chevron: {
    opacity: 0.5,
  },
});
