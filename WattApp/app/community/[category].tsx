import { collectionGroup, getDocs, where, query as fsQuery } from 'firebase/firestore';
export const unstable_settings = { layout: null };
import React, { useEffect, useState, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, setDoc, doc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import app, { db } from '../../constants/firebaseConfig';

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
  const [myGroups, setMyGroups] = useState<any[]>([]);
  const [showMembersSidebar, setShowMembersSidebar] = useState(false);
  useEffect(() => {
    const fetchMyGroups = async () => {
      const auth = getAuth(app);
      const user = auth.currentUser;
      if (!user) return;
      // Recherche tous les groupes où l'utilisateur est membre
      const q = collectionGroup(db, 'members');
      const snap = await getDocs(fsQuery(q, where('uid', '==', user.uid)));
      const groups = snap.docs.map(doc => {
        const parent = doc.ref.parent.parent;
        return {
          ...doc.data(),
          groupId: parent?.id,
        };
      });
      setMyGroups(groups);
    };
    fetchMyGroups();
  }, []);
  const { category } = useLocalSearchParams();
  const router = useRouter();
  const [messages, setMessages] = useState<any[]>([]);
  const members = useMemo(() => {
    const map = new Map();
    messages.forEach(m => {
      if (m.uid) map.set(m.uid, { user: m.user, photoURL: m.photoURL });
    });
    return Array.from(map.values());
  }, [messages]);
  const [input, setInput] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const [isMember, setIsMember] = useState(false);

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

  return (
    <>
      <LinearGradient
        colors={["#fff7ef", "#ffe0c2"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.bg}
      >
      {/* Nom du groupe toujours visible en haut */}
      <View style={styles.groupHeaderBar}>
        {/* Bouton retour à gauche */}
        {isMember ? (
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtnRound}>
            <Ionicons name="arrow-back" size={22} color="#FFA94D" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtnPreview}>
            <Ionicons name="arrow-back" size={22} color="#FFD600" />
          </TouchableOpacity>
        )}
        {/* Nom du groupe dans la bulle au centre */}
        <View style={styles.bubbleHeaderWrap}>
          <Text style={styles.groupHeaderTitle}>{CATEGORY_LABELS[String(category)] || category}</Text>
        </View>
        {/* Bouton membres à droite, affiché seulement si membre */}
        {isMember && (
          <TouchableOpacity style={styles.membersBtn} onPress={() => setShowMembersSidebar(true)}>
            <Ionicons name="people-outline" size={22} color="#FFA94D" />
          </TouchableOpacity>
        )}
      </View>

      {/* Section Mes groupes */}
      {myGroups.length > 0 && (
        <View style={styles.myGroupsSection}>
          <Text style={styles.myGroupsTitle}>Mes groupes</Text>
          <FlatList
            data={myGroups}
            keyExtractor={(item, idx) => `${item.groupId}-${item.uid || ''}-${idx}`}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ alignItems: 'center', paddingHorizontal: 8 }}
            renderItem={({ item }) => (
              <View style={styles.myGroupBubble}>
                <Text style={styles.myGroupText}>{item.groupId}</Text>
              </View>
            )}
          />
        </View>
      )}
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
          data={messages}
          keyExtractor={item => item.id}
          renderItem={({ item, index }) => {
            const isEven = index % 2 === 0;
            return (
              <View style={styles.messageRowPremium}>
                <Image source={{ uri: item.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.user || 'U')}&background=FFA94D&color=181818&size=128` }} style={styles.avatarPremium} />
                <View style={styles.bubbleWrapPremium}>
                  <Text style={styles.userPremium}>{item.user}</Text>
                  <LinearGradient
                    colors={isEven ? ["#FFA94D", "#FFCC80"] : ["#fff", "#ffe0c2"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.bubblePremium}
                  >
                    <Text style={[styles.textPremium, { color: isEven ? '#23232a' : '#FFA94D' }]}>{item.text}</Text>
                  </LinearGradient>
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
          {/* Avatars des membres en ligne */}
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
              // Ajoute l'utilisateur à la collection des membres du groupe
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
                setIsMember(true);
              } catch (e) {
                // Optionnel : afficher une erreur
              }
            }}
          >
            <Text style={styles.joinBtnText}>Rejoindre</Text>
          </TouchableOpacity>
        </View>
      )}
      </LinearGradient>
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

const styles = StyleSheet.create({
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
    backgroundColor: '#fff',
    borderTopLeftRadius: 18,
    borderBottomLeftRadius: 18,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: -2, height: 0 },
    elevation: 8,
    paddingHorizontal: 0,
    paddingTop: 0,
  },
  sidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 24,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#FFA94D22',
  },
  sidebarTitle: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#FFA94D',
  },
  sidebarCloseBtn: {
    padding: 4,
  },
  sidebarMemberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#FFA94D11',
  },
  sidebarMemberAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    marginRight: 12,
    backgroundColor: '#FFA94D33',
  },
  sidebarMemberName: {
    fontSize: 15,
    color: '#23232a',
    fontWeight: '600',
  },
  myGroupsSection: {
    marginTop: 70,
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  myGroupsTitle: {
    color: '#FFA94D',
    fontWeight: 'bold',
    fontSize: 17,
    marginBottom: 6,
    marginLeft: 8,
  },
  myGroupBubble: {
    backgroundColor: '#FFA94D',
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 8,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  myGroupText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  backBtnPreview: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(24,24,24,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    shadowColor: '#FFA94D',
    shadowOpacity: 0.10,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  circleBg: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#FFA94D',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  circleBubble: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#FFA94D',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  circleBubbleText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  membersBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#fff7ef',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 14,
    shadowColor: '#FFA94D',
    shadowOpacity: 0.10,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  bubbleHeaderWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginLeft: -38, // pour compenser le bouton retour
  },
  activeBubble: {
    backgroundColor: '#FFA94D',
    width: 54,
    height: 54,
    borderRadius: 999,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubbleContent: {
    width: 48,
    height: 48,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  bubbleHeaderText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  bg: { flex: 1 },
  groupHeaderBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 200,
    // backgroundColor supprimé pour enlever le fond blanc
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 38,
    paddingBottom: 10,
    paddingHorizontal: 18,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    shadowColor: '#FFA94D',
    shadowOpacity: 0.13,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },
  groupHeaderTitle: {
    color: '#FFA94D',
    fontSize: 22,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    textShadowColor: '#fff7',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  backBtnRound: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#fff7ef',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    shadowColor: '#FFA94D',
    shadowOpacity: 0.10,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  membersBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 70, // pour laisser la place au header
    minHeight: 54,
    paddingBottom: 2,
  },
  memberAvatarWrap: {
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    borderColor: '#FFA94D',
    backgroundColor: '#fff',
  },
  membersCount: {
    color: '#FFA94D',
    fontWeight: 'bold',
    fontSize: 15,
    marginLeft: 6,
    marginRight: 2,
  },
  messageRowPremium: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 26,
  },
  avatarPremium: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 14,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#FFA94D',
    shadowColor: '#FFA94D',
    shadowOpacity: 0.10,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  bubbleWrapPremium: {
    flex: 1,
    minWidth: 0,
  },
  userPremium: {
    color: '#FFA94D',
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 2,
    marginLeft: 2,
  },
  bubblePremium: {
    borderRadius: 22,
    paddingVertical: 14,
    paddingHorizontal: 18,
    maxWidth: '100%',
    alignSelf: 'flex-start',
    shadowColor: '#FFA94D',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    marginBottom: 2,
  },
  textPremium: {
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 20,
  },
  timePremium: {
    color: '#FFA94D',
    fontSize: 11,
    marginTop: 2,
    alignSelf: 'flex-end',
    marginRight: 2,
    opacity: 0.7,
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
    backgroundColor: '#fff',
    borderRadius: 28,
    margin: 18,
    paddingHorizontal: 18,
    paddingVertical: 10,
    shadowColor: '#FFA94D',
    shadowOpacity: 0.13,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  inputPremium: {
    flex: 1,
    color: '#FFA94D',
    fontSize: 16,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  sendBtnPremium: {
    marginLeft: 8,
    padding: 10,
    backgroundColor: '#FFA94D',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FFA94D',
    shadowOpacity: 0.13,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  previewOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(24,24,24,0.72)',
    zIndex: 99,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 24,
  },
  joinBtn: {
    backgroundColor: '#FFA94D',
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#FFA94D',
    shadowOpacity: 0.13,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  joinBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  memberCountText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 18,
    textAlign: 'center',
    textShadowColor: '#0008',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});