import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image } from 'react-native';
import { getAuth } from 'firebase/auth';
import { db } from '../../constants/firebaseConfig';
import { collectionGroup, onSnapshot, query, where } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const CATEGORY_EMOJIS: Record<string, string> = {
  "Roman d'amour": "💕",
  "Fanfiction": "✨",
  "Fiction générale": "📚",
  "Roman pour adolescents": "🎓",
  "Aléatoire": "🎲",
  "Action": "⚡",
  "Aventure": "🧭",
  "Nouvelles": "📰",
  "Fantasy": "🔮",
  "Non-Fiction": "📖",
  "Fantastique": "🚀",
  "Mystère": "🕵️",
};

export default function MyGroupsAndDMs() {
  const [myGroups, setMyGroups] = useState<any[]>([]);
  const [myDMs, setMyDMs] = useState<any[]>([]); // à brancher plus tard
  const router = useRouter();

  useEffect(() => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return;
    // Groupes
    const q = collectionGroup(db, 'members');
    const unsubscribe = onSnapshot(query(q, where('uid', '==', user.uid)), snap => {
      const groups = snap.docs.map(doc => {
        const parent = doc.ref.parent.parent;
        return {
          ...doc.data(),
          groupId: parent?.id,
        };
      });
      // Filtrer les doublons basés sur groupId
      const uniqueGroups = groups.filter((group, index, self) => 
        index === self.findIndex((g) => g.groupId === group.groupId)
      );
      setMyGroups(uniqueGroups);
    });
    // DMs (à brancher sur ta structure Firestore plus tard)
    // setMyDMs(...)
    return () => unsubscribe();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Mes groupes</Text>
      <FlatList
        data={myGroups}
        keyExtractor={(item, idx) => item.groupId + '-' + (item.uid || '') + '-' + idx}
        ListEmptyComponent={<Text style={styles.empty}>Aucun groupe rejoint.</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.chatRow}
            activeOpacity={0.85}
            onPress={() => router.push({ pathname: `/community/[category]`, params: { category: item.groupId } })}
          >
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1519125323398-675f0ddb6308?auto=format&fit=crop&w=400&q=80' }}
              style={styles.avatar}
            />
            <View style={styles.chatContent}>
              <View style={styles.chatHeaderRow}>
                <Text style={styles.chatName}>
                  {CATEGORY_EMOJIS[item.groupId] ? `${CATEGORY_EMOJIS[item.groupId]} ` : ''}{item.groupId}
                </Text>
                <Text style={styles.chatTime}>14:32</Text>
              </View>
              <View style={styles.chatFooterRow}>
                <Text style={styles.chatLastMsg} numberOfLines={1}>Dernier message du groupe...</Text>
                <View style={styles.badgeUnread}><Text style={styles.badgeUnreadText}>2</Text></View>
              </View>
            </View>
          </TouchableOpacity>
        )}
        style={{ flexGrow: 0 }}
      />

      <Text style={styles.header}>Messages privés</Text>
      <FlatList
        data={myDMs}
        keyExtractor={(dm, idx) => dm.id + '-' + idx}
        ListEmptyComponent={<Text style={styles.empty}>Aucune conversation privée.</Text>}
        renderItem={({ item: dm }) => (
          <TouchableOpacity
            style={styles.chatRow}
            activeOpacity={0.85}
            onPress={() => router.push({ pathname: `/chat/[chatId]`, params: { chatId: dm.id } })}
          >
            <Image
              source={{ uri: dm.avatar || 'https://ui-avatars.com/api/?name=DM&background=FFA94D&color=181818&size=128' }}
              style={styles.avatar}
            />
            <View style={styles.chatContent}>
              <View style={styles.chatHeaderRow}>
                <Text style={styles.chatName}>{dm.name || 'Utilisateur'}</Text>
                <Text style={styles.chatTime}>13:10</Text>
              </View>
              <View style={styles.chatFooterRow}>
                <Text style={styles.chatLastMsg} numberOfLines={1}>Dernier message privé...</Text>
                <View style={styles.badgeUnread}><Text style={styles.badgeUnreadText}>1</Text></View>
              </View>
            </View>
          </TouchableOpacity>
        )}
        style={{ flexGrow: 0 }}
      />

      <TouchableOpacity style={styles.fab} onPress={() => {/* Action pour démarrer un nouveau DM */}}>
        <Ionicons name="chatbubble-ellipses" size={30} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#181818',
    paddingTop: 24,
  },
  header: {
    color: '#FFA94D',
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 18,
    marginBottom: 10,
    marginLeft: 18,
  },
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#232323',
    borderRadius: 16,
    marginHorizontal: 14,
    marginBottom: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    marginRight: 14,
    backgroundColor: '#FFA94D33',
  },
  chatContent: {
    flex: 1,
    justifyContent: 'center',
  },
  chatHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  chatName: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    flex: 1,
  },
  chatTime: {
    color: '#aaa',
    fontSize: 12,
    marginLeft: 8,
  },
  chatFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chatLastMsg: {
    color: '#aaa',
    fontSize: 14,
    flex: 1,
    marginRight: 8,
  },
  badgeUnread: {
    backgroundColor: '#FFA94D',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    marginLeft: 4,
  },
  badgeUnreadText: {
    color: '#181818',
    fontWeight: 'bold',
    fontSize: 12,
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 32,
    backgroundColor: '#FFA94D',
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  empty: {
    color: '#888',
    fontStyle: 'italic',
    marginLeft: 18,
    marginBottom: 10,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: 30,
    backgroundColor: '#232323',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  addBtnText: {
    color: '#FFA94D',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
});
