import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  TextInput,
  Image,
  Alert,
  FlatList,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { getAuth } from 'firebase/auth';
import { collection, query, where, getDocs, doc, addDoc, getDoc } from 'firebase/firestore';
import { db } from '../../constants/firebaseConfig';

interface ShareModalProps {
  visible: boolean;
  onClose: () => void;
  bookId: string;
  bookTitle: string;
  bookCover?: string;
  bookAuthor?: string;
}

interface Group {
  id: string;
  name: string;
  description?: string;
  memberCount: number;
  avatar?: string;
}

interface Friend {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  visible,
  onClose,
  bookId,
  bookTitle,
  bookCover,
  bookAuthor
}) => {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<'groups' | 'friends'>('groups');
  const [groups, setGroups] = useState<Group[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [shareMessage, setShareMessage] = useState('');

  // Charger les groupes et amis de l'utilisateur
  useEffect(() => {
    if (visible) {
      loadUserGroupsAndFriends();
      setShareMessage(`Je recommande ce livre : "${bookTitle}" ${bookAuthor ? `par ${bookAuthor}` : ''}`);
    }
  }, [visible, bookTitle, bookAuthor]);

  const loadUserGroupsAndFriends = async () => {
    setLoading(true);
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      // Charger les groupes
      const groupsQuery = query(
        collection(db, 'groups'),
        where('members', 'array-contains', user.uid)
      );
      const groupsSnap = await getDocs(groupsQuery);
      const groupsData = groupsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Group[];
      setGroups(groupsData);

      // Charger les amis
      const friendsQuery = query(
        collection(db, 'friends'),
        where('uids', 'array-contains', user.uid)
      );
      const friendsSnap = await getDocs(friendsQuery);
      const friendsData: Friend[] = [];
      
      for (const friendDoc of friendsSnap.docs) {
        const friendData = friendDoc.data();
        const otherUid = friendData.uids.find((uid: string) => uid !== user.uid);
        if (otherUid) {
          const userDoc = await getDoc(doc(db, 'users', otherUid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            friendsData.push({
              id: otherUid,
              name: userData.displayName || userData.email || 'Utilisateur',
              email: userData.email || '',
              avatar: userData.photoURL
            });
          }
        }
      }
      setFriends(friendsData);
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
      Alert.alert('Erreur', 'Impossible de charger vos groupes et amis.');
    } finally {
      setLoading(false);
    }
  };

  const shareToGroup = async (groupId: string, groupName: string) => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      const messageData = {
        type: 'book_share',
        content: shareMessage,
        bookId,
        bookTitle,
        bookCover,
        bookAuthor,
        senderId: user.uid,
        senderName: user.displayName || user.email || 'Utilisateur',
        timestamp: new Date(),
        groupId
      };

      await addDoc(collection(db, 'groups', groupId, 'messages'), messageData);
      
      Alert.alert(
        'Partagé !',
        `Le livre a été partagé dans le groupe "${groupName}"`,
        [{ text: 'OK', onPress: onClose }]
      );
    } catch (error) {
      console.error('Erreur lors du partage:', error);
      Alert.alert('Erreur', 'Impossible de partager le livre.');
    }
  };

  const shareToFriend = async (friendId: string, friendName: string) => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      // Créer ou trouver la conversation DM
      const chatId = [user.uid, friendId].sort().join('_');
      
      const messageData = {
        type: 'book_share',
        content: shareMessage,
        bookId,
        bookTitle,
        bookCover,
        bookAuthor,
        senderId: user.uid,
        senderName: user.displayName || user.email || 'Utilisateur',
        timestamp: new Date(),
        chatId
      };

      await addDoc(collection(db, 'chats', chatId, 'messages'), messageData);
      
      Alert.alert(
        'Partagé !',
        `Le livre a été partagé avec ${friendName}`,
        [{ text: 'OK', onPress: onClose }]
      );
    } catch (error) {
      console.error('Erreur lors du partage:', error);
      Alert.alert('Erreur', 'Impossible de partager le livre.');
    }
  };

  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredFriends = friends.filter(friend =>
    friend.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderGroupItem = ({ item }: { item: Group }) => (
    <TouchableOpacity
      style={[styles.shareItem, { backgroundColor: theme.colors.surface }]}
      onPress={() => shareToGroup(item.id, item.name)}
    >
      <View style={styles.shareItemLeft}>
        <View style={[styles.groupAvatar, { backgroundColor: theme.colors.primary }]}>
          {item.avatar ? (
            <Image source={{ uri: item.avatar }} style={styles.avatarImage} />
          ) : (
            <Ionicons name="people" size={20} color="#fff" />
          )}
        </View>
        <View style={styles.shareItemInfo}>
          <Text style={[styles.shareItemName, { color: theme.colors.text }]} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={[styles.shareItemDesc, { color: theme.colors.textSecondary }]} numberOfLines={1}>
            {item.memberCount} membres
          </Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
    </TouchableOpacity>
  );

  const renderFriendItem = ({ item }: { item: Friend }) => (
    <TouchableOpacity
      style={[styles.shareItem, { backgroundColor: theme.colors.surface }]}
      onPress={() => shareToFriend(item.id, item.name)}
    >
      <View style={styles.shareItemLeft}>
        <View style={styles.friendAvatar}>
          {item.avatar ? (
            <Image source={{ uri: item.avatar }} style={styles.avatarImage} />
          ) : (
            <View style={[styles.defaultAvatar, { backgroundColor: theme.colors.primary }]}>
              <Text style={styles.avatarText}>
                {item.name.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.shareItemInfo}>
          <Text style={[styles.shareItemName, { color: theme.colors.text }]} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={[styles.shareItemDesc, { color: theme.colors.textSecondary }]} numberOfLines={1}>
            {item.email}
          </Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: theme.colors.text }]}>
              Partager le livre
            </Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Book Preview */}
          <View style={[styles.bookPreview, { backgroundColor: theme.colors.surface }]}>
            <Image 
              source={{ uri: bookCover || 'https://via.placeholder.com/60x80' }}
              style={styles.bookCover}
            />
            <View style={styles.bookInfo}>
              <Text style={[styles.bookTitle, { color: theme.colors.text }]} numberOfLines={2}>
                {bookTitle}
              </Text>
              {bookAuthor && (
                <Text style={[styles.bookAuthor, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                  par {bookAuthor}
                </Text>
              )}
            </View>
          </View>

          {/* Message Input */}
          <View style={styles.messageSection}>
            <Text style={[styles.messageLabel, { color: theme.colors.text }]}>
              Message (optionnel)
            </Text>
            <TextInput
              style={[styles.messageInput, { 
                backgroundColor: theme.colors.surface,
                color: theme.colors.text,
                borderColor: theme.colors.border
              }]}
              placeholder="Ajouter un message..."
              placeholderTextColor={theme.colors.textSecondary}
              value={shareMessage}
              onChangeText={setShareMessage}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Tabs */}
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === 'groups' && { borderBottomColor: theme.colors.primary }
              ]}
              onPress={() => setActiveTab('groups')}
            >
              <Ionicons 
                name="people" 
                size={20} 
                color={activeTab === 'groups' ? theme.colors.primary : theme.colors.textSecondary} 
              />
              <Text style={[
                styles.tabText,
                { color: activeTab === 'groups' ? theme.colors.primary : theme.colors.textSecondary }
              ]}>
                Groupes ({groups.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === 'friends' && { borderBottomColor: theme.colors.primary }
              ]}
              onPress={() => setActiveTab('friends')}
            >
              <Ionicons 
                name="person" 
                size={20} 
                color={activeTab === 'friends' ? theme.colors.primary : theme.colors.textSecondary} 
              />
              <Text style={[
                styles.tabText,
                { color: activeTab === 'friends' ? theme.colors.primary : theme.colors.textSecondary }
              ]}>
                Amis ({friends.length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color={theme.colors.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: theme.colors.text }]}
              placeholder={`Rechercher ${activeTab === 'groups' ? 'un groupe' : 'un ami'}...`}
              placeholderTextColor={theme.colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Content */}
          <View style={styles.content}>
            {loading ? (
              <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 50 }} />
            ) : activeTab === 'groups' ? (
              <FlatList
                data={filteredGroups}
                renderItem={renderGroupItem}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <Ionicons 
                      name="people-outline" 
                      size={48} 
                      color={theme.colors.textSecondary} 
                    />
                    <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                      Aucun groupe trouvé
                    </Text>
                  </View>
                }
              />
            ) : (
              <FlatList
                data={filteredFriends}
                renderItem={renderFriendItem}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <Ionicons 
                      name="person-outline" 
                      size={48} 
                      color={theme.colors.textSecondary} 
                    />
                    <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                      Aucun ami trouvé
                    </Text>
                  </View>
                }
              />
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    minHeight: '70%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  closeButton: {
    padding: 5,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  bookPreview: {
    flexDirection: 'row',
    margin: 20,
    padding: 15,
    borderRadius: 12,
  },
  bookCover: {
    width: 50,
    height: 70,
    borderRadius: 8,
    backgroundColor: '#333',
  },
  bookInfo: {
    flex: 1,
    marginLeft: 15,
    justifyContent: 'center',
  },
  bookTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  bookAuthor: {
    fontSize: 14,
  },
  messageSection: {
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  messageLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  messageInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    gap: 8,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    margin: 20,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  shareItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderRadius: 12,
    marginBottom: 8,
  },
  shareItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  groupAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  defaultAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  shareItemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  shareItemName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  shareItemDesc: {
    fontSize: 14,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 10,
  },
});