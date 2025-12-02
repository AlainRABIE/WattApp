import { collectionGroup, getDocs, where, query as fsQuery } from 'firebase/firestore';
export const unstable_settings = { layout: null };
import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, setDoc, doc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import app, { db } from '../../constants/firebaseConfig';
import { useTheme } from '../../hooks/useTheme';

const CATEGORY_LABELS: Record<string, string> = {
  "Roman d'amour": "Roman d'amour",
  Fanfiction: 'Fanfiction',
  'Fiction générale': 'Fiction générale',
  'Roman pour adolescents': 'Roman pour adolescents',
  'Aléatoire': 'Aléatoire',
  Action: 'Action',
  Aventure: 'Aventure',
  Nouvelles: 'Nouvelles',
  Fantasy: 'Fantasy',
  'Non-Fiction': 'Non-Fiction',
  Fantastique: 'Fantastique',
  Mystère: 'Mystère',
};

export default function CommunityChat() {
  const { theme } = useTheme();
  const [showMembersSidebar, setShowMembersSidebar] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const [isMember, setIsMember] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);

  const { category } = useLocalSearchParams();
  const router = useRouter();

  // Filtrage des messages pour ne pas afficher le message système de join à l'utilisateur qui vient de rejoindre
  const filteredMessages = messages.filter((item: any) => {
    if (item.system && item.text && item.text.endsWith('a rejoint le groupe')) {
      const auth = getAuth(app);
      const user = auth.currentUser;
      if (user && item.uid === user.uid) return false;
    }
    return true;
  });

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const snap = await getDocs(collection(db, 'communityChats', String(category), 'members'));
        const list = snap.docs.map(doc => doc.data());
        setMembers(list);
      } catch (e) {
        // Optionnel : log erreur
      }
    };
    fetchMembers();
  }, [category]);

  useEffect(() => {
    if (!category) return;
    const q = query(collection(db, 'communityChats', String(category), 'messages'), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, snap => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    });
    return () => unsub();
  }, [category]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const auth = getAuth(app);
    const user = auth.currentUser;
    if (!user) return;
    await addDoc(collection(db, 'communityChats', String(category), 'messages'), {
      text: input.trim(),
      user: user.displayName || user.email || 'Utilisateur',
      photoURL: user.photoURL || '',
      createdAt: serverTimestamp(),
      uid: user.uid,
    });
    setInput('');
  };

  const styles = getStyles(theme);

  return (
    <>
      <View style={styles.bg}>
        {/* Nom du groupe toujours visible en haut */}
        <View style={styles.groupHeaderBar}>
          {isMember ? (
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtnRound}>
              <Ionicons name="arrow-back" size={22} color={theme.colors.primary} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtnPreview}>
              <Ionicons name="arrow-back" size={22} color={theme.colors.primary} />
            </TouchableOpacity>
          )}
          <View style={styles.bubbleHeaderWrap}>
            <Text style={styles.groupHeaderTitle}>{CATEGORY_LABELS[String(category)] || category}</Text>
          </View>
          {isMember && (
            <TouchableOpacity style={styles.membersBtn} onPress={() => setShowMembersSidebar(true)}>
              <Ionicons name="people-outline" size={22} color="#FFA94D" />
            </TouchableOpacity>
          )}
        </View>

        {members.length > 0 && (
          <View style={styles.membersBar}>
            <FlatList
              data={members}
              keyExtractor={(item, idx) => item.user + idx}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ alignItems: 'center', paddingHorizontal: 8 }}
              renderItem={({ item }) => (
                <View style={styles.memberAvatarWrap}>
                  <Image
                    source={{ uri: item.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.user || 'U')}&background=FFA94D&color=181818&size=128` }}
                    style={styles.memberAvatar}
                  />
                </View>
              )}
              ListFooterComponent={<Text style={styles.membersCount}>+{members.length}</Text>}
            />
          </View>
        )}

        {/* Chat et input toujours visibles, mais assombris si non membre */}
        <View style={isMember ? undefined : { opacity: 0.25, pointerEvents: 'none' }}>
          <FlatList
            ref={flatListRef}
            data={filteredMessages}
            keyExtractor={item => item.id}
            renderItem={({ item, index }) => {
              const isEven = index % 2 === 0;
              return (
                <View style={styles.messageRowPremium}>
                  <Image source={{ uri: item.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.user || 'U')}&background=FFA94D&color=181818&size=128` }} style={styles.avatarPremium} />
                  <View style={styles.bubbleWrapPremium}>
                  <Text style={styles.userPremium}>{item.user}</Text>
                  <View style={[styles.bubblePremium, { backgroundColor: isEven ? '#FFA94D' : '#232323' }]}>
                    <Text style={[styles.textPremium, { color: isEven ? '#fff' : '#fff' }]}>{item.text}</Text>
                  </View>
                    {item.createdAt?.seconds ? (
                      <Text style={styles.timePremium}>{new Date(item.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                    ) : null}
                  </View>
                </View>
              );
            }}
            contentContainerStyle={{ padding: 18, paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
          />
        </View>

        {/* Barre d'écriture toujours en bas de l'écran */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 38 : 0}
          style={styles.inputBarWrapPremium}
        >
          <View style={styles.inputBarPremium}>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Écrire un message..."
              placeholderTextColor="#FFA94D"
              style={styles.inputPremium}
              onSubmitEditing={sendMessage}
              returnKeyType="send"
            />
            <TouchableOpacity onPress={sendMessage} style={styles.sendBtnPremium}>
              <Ionicons name="send" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>

        {/* Overlay d'assombrissement + bouton rejoindre en bas si non membre */}
        {!isMember && (
          <View style={styles.previewOverlay} pointerEvents="box-none">
            <FlatList
              data={members}
              keyExtractor={(item, idx) => item.user + idx}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ alignItems: 'center', paddingHorizontal: 8, marginBottom: 8 }}
              style={{ maxHeight: 54 }}
              renderItem={({ item }) => (
                <View style={styles.memberAvatarWrap}>
                  <Image
                    source={{ uri: item.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.user || 'U')}&background=FFA94D&color=181818&size=128` }}
                    style={styles.memberAvatar}
                  />
                </View>
              )}
            />
            <Text style={styles.memberCountText}>{members.length} membre{members.length > 1 ? 's' : ''} dans ce groupe</Text>
            <TouchableOpacity
              style={styles.joinBtn}
              onPress={async () => {
                const auth = getAuth(app);
                const user = auth.currentUser;
                if (!user) return;
                try {
                  await setDoc(
                    doc(db, 'communityChats', String(category), 'members', user.uid),
                    {
                      uid: user.uid,
                      user: user.displayName || user.email || 'Utilisateur',
                      photoURL: user.photoURL || '',
                      joinedAt: serverTimestamp(),
                    },
                    { merge: true }
                  );
                  setMembers(prev => [
                    ...prev.filter(m => m.uid !== user.uid),
                    {
                      uid: user.uid,
                      user: user.displayName || user.email || 'Utilisateur',
                      photoURL: user.photoURL || '',
                      joinedAt: new Date(),
                    }
                  ]);
                  // Envoie un message système dans le chat
                  await addDoc(
                    collection(db, 'communityChats', String(category), 'messages'),
                    {
                      text: `${user.displayName || user.email || 'Utilisateur'} a rejoint le groupe`,
                      uid: user.uid,
                      user: user.displayName || user.email || 'Utilisateur',
                      photoURL: user.photoURL || '',
                      createdAt: serverTimestamp(),
                      system: true,
                    }
                  );
                  setIsMember(true);
                } catch (e) {
                  alert('Erreur lors de la tentative de rejoindre le groupe.');
                }
              }}
            >
              <Text style={styles.joinBtnText}>Rejoindre</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
      {/* Sidebar membres */}
      {showMembersSidebar && (
        <View style={styles.sidebarOverlay}>
          <View style={styles.sidebarContainer}>
            <View style={styles.sidebarHeader}>
              <Text style={styles.sidebarTitle}>Membres du groupe</Text>
              <TouchableOpacity onPress={() => setShowMembersSidebar(false)} style={styles.sidebarCloseBtn}>
                <Ionicons name="close" size={26} color="#FFA94D" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={members}
              keyExtractor={(item, idx) => (item.user || 'U') + idx}
              renderItem={({ item }) => (
                <View style={styles.sidebarMemberRow}>
                  <Image
                    source={{ uri: item.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.user || 'U')}&background=FFA94D&color=181818&size=128` }}
                    style={styles.sidebarMemberAvatar}
                  />
                  <Text style={styles.sidebarMemberName}>{item.user}</Text>
                </View>
              )}
              contentContainerStyle={{ paddingVertical: 16 }}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      )}
    </>
  );
}

const getStyles = (theme: any) => StyleSheet.create({
  // Ajout des styles manquants utilisés dans le composant
  bg: { 
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  groupHeaderBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 200,
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  groupHeaderTitle: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  backBtnRound: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  backBtnPreview: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  bubbleHeaderWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginLeft: -38,
  },
  membersBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  membersBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 100,
    minHeight: 54,
    paddingHorizontal: 20,
  },
  memberAvatarWrap: {
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.surface,
  },
  membersCount: {
    color: theme.colors.textSecondary,
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 6,
  },
  previewOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.85)',
    zIndex: 99,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 32,
  },
  joinBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: 24,
    paddingVertical: 16,
    paddingHorizontal: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  joinBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.3,
  },
  memberCountText: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  sidebarOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0,0,0,0.18)',
    zIndex: 100,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
  },
  sidebarContainer: {
    width: 300,
    height: '100%',
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 20,
    shadowOffset: { width: -4, height: 0 },
    elevation: 10,
  },
  sidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  sidebarTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
  },
  sidebarCloseBtn: {
    padding: 4,
  },
  sidebarMemberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  sidebarMemberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: theme.colors.background,
  },
  sidebarMemberName: {
    fontSize: 15,
    color: theme.colors.text,
    fontWeight: '500',
  },
  bubbleWrapPremium: {
    flex: 1,
    marginLeft: 12,
    backgroundColor: 'transparent',
  },
  userPremium: {
    fontWeight: '600',
    color: theme.colors.primary,
    marginBottom: 4,
    fontSize: 13,
  },
  bubblePremium: {
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 4,
    minWidth: 60,
    alignSelf: 'flex-start',
  },
  textPremium: {
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 21,
  },
  timePremium: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
    alignSelf: 'flex-end',
    marginRight: 2,
  },
  inputBarWrapPremium: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
  inputBarPremium: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    margin: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  inputPremium: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 15,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  sendBtnPremium: {
    marginLeft: 8,
    padding: 10,
    backgroundColor: theme.colors.primary,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
    messageRowPremium: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  avatarPremium: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
});
