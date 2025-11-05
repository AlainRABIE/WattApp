import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  FlatList,
  Alert,
  StatusBar,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');

interface Collaborator {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'editor' | 'reviewer' | 'viewer';
  avatar?: string;
  isOnline: boolean;
  lastSeen: Date;
  permissions: CollaboratorPermissions;
}

interface CollaboratorPermissions {
  canEdit: boolean;
  canComment: boolean;
  canShare: boolean;
  canManageCollaborators: boolean;
  canPublish: boolean;
}

interface Comment {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  selection?: TextSelection;
  timestamp: Date;
  isResolved: boolean;
  replies: CommentReply[];
  type: 'general' | 'suggestion' | 'correction' | 'question';
}

interface CommentReply {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  timestamp: Date;
}

interface TextSelection {
  start: number;
  end: number;
  text: string;
  chapter?: string;
}

interface LiveCursor {
  userId: string;
  userName: string;
  position: number;
  color: string;
}

interface Revision {
  id: string;
  authorId: string;
  authorName: string;
  timestamp: Date;
  changes: TextChange[];
  description: string;
  isAccepted?: boolean;
}

interface TextChange {
  type: 'insert' | 'delete' | 'replace';
  position: number;
  oldText?: string;
  newText?: string;
  reason?: string;
}

const CollaborationHub: React.FC = () => {
  const router = useRouter();
  const { projectId } = useLocalSearchParams();
  
  // États principaux
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [liveCursors, setLiveCursors] = useState<LiveCursor[]>([]);
  
  // États de l'interface
  const [activeTab, setActiveTab] = useState<'collaborators' | 'comments' | 'revisions' | 'live'>('collaborators');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [selectedComment, setSelectedComment] = useState<Comment | null>(null);
  const [newCommentText, setNewCommentText] = useState('');
  const [commentType, setCommentType] = useState<Comment['type']>('general');
  
  // États d'invitation
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<Collaborator['role']>('viewer');
  const [inviteMessage, setInviteMessage] = useState('');
  
  // États de filtrage
  const [filterCommentsBy, setFilterCommentsBy] = useState<'all' | 'unresolved' | 'suggestions'>('all');
  const [sortCommentsBy, setSortCommentsBy] = useState<'recent' | 'oldest' | 'author'>('recent');

  // Rôles et permissions
  const roleConfig = {
    owner: {
      label: 'Propriétaire',
      color: '#FF6B6B',
      permissions: {
        canEdit: true,
        canComment: true,
        canShare: true,
        canManageCollaborators: true,
        canPublish: true,
      }
    },
    editor: {
      label: 'Éditeur',
      color: '#4ECDC4',
      permissions: {
        canEdit: true,
        canComment: true,
        canShare: false,
        canManageCollaborators: false,
        canPublish: false,
      }
    },
    reviewer: {
      label: 'Réviseur',
      color: '#45B7D1',
      permissions: {
        canEdit: false,
        canComment: true,
        canShare: false,
        canManageCollaborators: false,
        canPublish: false,
      }
    },
    viewer: {
      label: 'Lecteur',
      color: '#96CEB4',
      permissions: {
        canEdit: false,
        canComment: false,
        canShare: false,
        canManageCollaborators: false,
        canPublish: false,
      }
    }
  };

  // Types de commentaires
  const commentTypeConfig = {
    general: { label: 'Général', icon: 'chatbubble-outline', color: '#4ECDC4' },
    suggestion: { label: 'Suggestion', icon: 'bulb-outline', color: '#FFD93D' },
    correction: { label: 'Correction', icon: 'create-outline', color: '#FF6B6B' },
    question: { label: 'Question', icon: 'help-circle-outline', color: '#A8E6CF' },
  };

  // Données mockées
  const mockCollaborators: Collaborator[] = [
    {
      id: '1',
      name: 'Marie Dubois',
      email: 'marie.dubois@email.com',
      role: 'owner',
      isOnline: true,
      lastSeen: new Date(),
      permissions: roleConfig.owner.permissions,
    },
    {
      id: '2',
      name: 'Alex Chen',
      email: 'alex.chen@email.com',
      role: 'editor',
      isOnline: true,
      lastSeen: new Date(Date.now() - 10 * 60 * 1000),
      permissions: roleConfig.editor.permissions,
    },
    {
      id: '3',
      name: 'Sophie Laurent',
      email: 'sophie.laurent@email.com',
      role: 'reviewer',
      isOnline: false,
      lastSeen: new Date(Date.now() - 2 * 60 * 60 * 1000),
      permissions: roleConfig.reviewer.permissions,
    },
  ];

  const mockComments: Comment[] = [
    {
      id: '1',
      authorId: '2',
      authorName: 'Alex Chen',
      content: 'Cette phrase pourrait être plus claire. Que pensez-vous de "Elle sentit son cœur s\'emballer" au lieu de "Son cœur battait très fort"?',
      selection: {
        start: 245,
        end: 267,
        text: 'Son cœur battait très fort',
        chapter: 'Chapitre 3'
      },
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      isResolved: false,
      type: 'suggestion',
      replies: [
        {
          id: '1',
          authorId: '1',
          authorName: 'Marie Dubois',
          content: 'Excellente suggestion ! Je vais modifier ça.',
          timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000),
        }
      ]
    },
    {
      id: '2',
      authorId: '3',
      authorName: 'Sophie Laurent',
      content: 'Attention à l\'accord : "Les aventures qu\'elle a vécues" (accord du participe passé avec l\'objet direct antéposé).',
      selection: {
        start: 156,
        end: 180,
        text: 'Les aventures qu\'elle a vécu',
        chapter: 'Chapitre 1'
      },
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
      isResolved: false,
      type: 'correction',
      replies: []
    },
    {
      id: '3',
      authorId: '3',
      authorName: 'Sophie Laurent',
      content: 'J\'adore cette métaphore ! Elle renforce vraiment l\'atmosphère mystique du chapitre.',
      timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
      isResolved: true,
      type: 'general',
      replies: []
    }
  ];

  // Chargement des données
  useEffect(() => {
    loadCollaborationData();
  }, []);

  const loadCollaborationData = async () => {
    try {
      // Simuler le chargement
      setCollaborators(mockCollaborators);
      setComments(mockComments);
      
      // Simuler les curseurs en temps réel
      setLiveCursors([
        {
          userId: '2',
          userName: 'Alex',
          position: 1245,
          color: '#4ECDC4'
        }
      ]);
    } catch (error) {
      console.error('Erreur lors du chargement des données de collaboration:', error);
    }
  };

  // Invitation de collaborateur
  const handleInviteCollaborator = async () => {
    if (!inviteEmail.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir une adresse email');
      return;
    }

    try {
      // Simuler l'invitation
      const newCollaborator: Collaborator = {
        id: Date.now().toString(),
        name: inviteEmail.split('@')[0],
        email: inviteEmail,
        role: inviteRole,
        isOnline: false,
        lastSeen: new Date(),
        permissions: roleConfig[inviteRole].permissions,
      };

      setCollaborators(prev => [...prev, newCollaborator]);
      setInviteEmail('');
      setInviteMessage('');
      setShowInviteModal(false);
      
      Alert.alert('Succès', 'Invitation envoyée avec succès !');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'envoyer l\'invitation');
    }
  };

  // Ajout de commentaire
  const handleAddComment = async () => {
    if (!newCommentText.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir un commentaire');
      return;
    }

    try {
      const newComment: Comment = {
        id: Date.now().toString(),
        authorId: '1', // Utilisateur actuel
        authorName: 'Marie Dubois',
        content: newCommentText,
        timestamp: new Date(),
        isResolved: false,
        type: commentType,
        replies: []
      };

      setComments(prev => [newComment, ...prev]);
      setNewCommentText('');
      setShowCommentModal(false);
      
      Alert.alert('Succès', 'Commentaire ajouté avec succès !');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'ajouter le commentaire');
    }
  };

  // Résolution de commentaire
  const handleResolveComment = (commentId: string) => {
    setComments(prev => prev.map(comment => 
      comment.id === commentId 
        ? { ...comment, isResolved: !comment.isResolved }
        : comment
    ));
  };

  // Changement de rôle
  const handleChangeRole = (collaboratorId: string, newRole: Collaborator['role']) => {
    setCollaborators(prev => prev.map(collab => 
      collab.id === collaboratorId 
        ? { ...collab, role: newRole, permissions: roleConfig[newRole].permissions }
        : collab
    ));
  };

  // Filtrage des commentaires
  const filteredComments = comments.filter(comment => {
    switch (filterCommentsBy) {
      case 'unresolved':
        return !comment.isResolved;
      case 'suggestions':
        return comment.type === 'suggestion';
      default:
        return true;
    }
  }).sort((a, b) => {
    switch (sortCommentsBy) {
      case 'oldest':
        return a.timestamp.getTime() - b.timestamp.getTime();
      case 'author':
        return a.authorName.localeCompare(b.authorName);
      case 'recent':
      default:
        return b.timestamp.getTime() - a.timestamp.getTime();
    }
  });

  // Rendu de la liste des collaborateurs
  const renderCollaboratorsList = () => (
    <View style={styles.tabContent}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Collaborateurs ({collaborators.length})</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => setShowInviteModal(true)}
        >
          <Ionicons name="person-add" size={20} color="#FFA94D" />
        </TouchableOpacity>
      </View>

      {collaborators.map((collaborator) => (
        <View key={collaborator.id} style={styles.collaboratorCard}>
          <View style={styles.collaboratorInfo}>
            <View style={styles.collaboratorAvatar}>
              <Text style={styles.collaboratorInitial}>
                {collaborator.name.charAt(0).toUpperCase()}
              </Text>
              {collaborator.isOnline && <View style={styles.onlineIndicator} />}
            </View>
            
            <View style={styles.collaboratorDetails}>
              <Text style={styles.collaboratorName}>{collaborator.name}</Text>
              <Text style={styles.collaboratorEmail}>{collaborator.email}</Text>
              <Text style={styles.collaboratorStatus}>
                {collaborator.isOnline 
                  ? 'En ligne' 
                  : `Vu ${collaborator.lastSeen.toLocaleString()}`
                }
              </Text>
            </View>
          </View>

          <View style={styles.collaboratorActions}>
            <View style={[
              styles.roleBadge, 
              { backgroundColor: roleConfig[collaborator.role].color }
            ]}>
              <Text style={styles.roleText}>
                {roleConfig[collaborator.role].label}
              </Text>
            </View>
            
            {collaborator.role !== 'owner' && (
              <TouchableOpacity style={styles.moreButton}>
                <Ionicons name="ellipsis-vertical" size={16} color="#666" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      ))}
    </View>
  );

  // Rendu de la liste des commentaires
  const renderCommentsList = () => (
    <View style={styles.tabContent}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          Commentaires ({filteredComments.length})
        </Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => setShowCommentModal(true)}
        >
          <Ionicons name="add" size={20} color="#FFA94D" />
        </TouchableOpacity>
      </View>

      {/* Filtres */}
      <View style={styles.filtersRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {[
            { key: 'all', label: 'Tous' },
            { key: 'unresolved', label: 'Non résolus' },
            { key: 'suggestions', label: 'Suggestions' },
          ].map((filter) => (
            <TouchableOpacity
              key={filter.key}
              style={[
                styles.filterChip,
                filterCommentsBy === filter.key && styles.filterChipActive
              ]}
              onPress={() => setFilterCommentsBy(filter.key as any)}
            >
              <Text style={[
                styles.filterChipText,
                filterCommentsBy === filter.key && styles.filterChipTextActive
              ]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Liste des commentaires */}
      <FlatList
        data={filteredComments}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.commentCard}>
            <View style={styles.commentHeader}>
              <View style={styles.commentAuthor}>
                <View style={styles.commentAvatar}>
                  <Text style={styles.commentInitial}>
                    {item.authorName.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View>
                  <Text style={styles.commentAuthorName}>{item.authorName}</Text>
                  <Text style={styles.commentTimestamp}>
                    {item.timestamp.toLocaleString()}
                  </Text>
                </View>
              </View>

              <View style={styles.commentMeta}>
                <View style={[
                  styles.commentTypeBadge,
                  { backgroundColor: commentTypeConfig[item.type].color + '20' }
                ]}>
                  <Ionicons 
                    name={commentTypeConfig[item.type].icon as any} 
                    size={12} 
                    color={commentTypeConfig[item.type].color} 
                  />
                  <Text style={[
                    styles.commentTypeText,
                    { color: commentTypeConfig[item.type].color }
                  ]}>
                    {commentTypeConfig[item.type].label}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.resolveButton,
                    item.isResolved && styles.resolveButtonResolved
                  ]}
                  onPress={() => handleResolveComment(item.id)}
                >
                  <Ionicons 
                    name={item.isResolved ? "checkmark-circle" : "checkmark-circle-outline"} 
                    size={16} 
                    color={item.isResolved ? "#4CAF50" : "#666"} 
                  />
                </TouchableOpacity>
              </View>
            </View>

            {item.selection && (
              <View style={styles.commentSelection}>
                <Text style={styles.selectionChapter}>{item.selection.chapter}</Text>
                <Text style={styles.selectionText}>"{item.selection.text}"</Text>
              </View>
            )}

            <Text style={styles.commentContent}>{item.content}</Text>

            {item.replies.length > 0 && (
              <View style={styles.commentReplies}>
                {item.replies.map((reply) => (
                  <View key={reply.id} style={styles.commentReply}>
                    <Text style={styles.replyAuthor}>{reply.authorName}</Text>
                    <Text style={styles.replyContent}>{reply.content}</Text>
                    <Text style={styles.replyTimestamp}>
                      {reply.timestamp.toLocaleString()}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            <TouchableOpacity style={styles.replyButton}>
              <Text style={styles.replyButtonText}>Répondre</Text>
            </TouchableOpacity>
          </View>
        )}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );

  // Rendu de la vue temps réel
  const renderLiveView = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Activité en Temps Réel</Text>
      
      {/* Utilisateurs actifs */}
      <View style={styles.liveSection}>
        <Text style={styles.liveSectionTitle}>Utilisateurs actifs</Text>
        <View style={styles.activeUsers}>
          {collaborators.filter(c => c.isOnline).map((user) => (
            <View key={user.id} style={styles.activeUser}>
              <View style={[styles.activeUserAvatar, { borderColor: roleConfig[user.role].color }]}>
                <Text style={styles.activeUserInitial}>
                  {user.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <Text style={styles.activeUserName}>{user.name}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Curseurs live */}
      <View style={styles.liveSection}>
        <Text style={styles.liveSectionTitle}>Curseurs en temps réel</Text>
        {liveCursors.map((cursor) => (
          <View key={cursor.userId} style={styles.liveCursor}>
            <View style={[styles.cursorIndicator, { backgroundColor: cursor.color }]} />
            <Text style={styles.cursorUser}>{cursor.userName}</Text>
            <Text style={styles.cursorPosition}>Position: {cursor.position}</Text>
          </View>
        ))}
      </View>

      {/* Activité récente */}
      <View style={styles.liveSection}>
        <Text style={styles.liveSectionTitle}>Activité récente</Text>
        <View style={styles.activityFeed}>
          <View style={styles.activityItem}>
            <Ionicons name="create-outline" size={16} color="#4ECDC4" />
            <Text style={styles.activityText}>
              <Text style={styles.activityUser}>Alex Chen</Text> a modifié le Chapitre 3
            </Text>
            <Text style={styles.activityTime}>Il y a 5 min</Text>
          </View>
          
          <View style={styles.activityItem}>
            <Ionicons name="chatbubble-outline" size={16} color="#FFD93D" />
            <Text style={styles.activityText}>
              <Text style={styles.activityUser}>Sophie Laurent</Text> a ajouté un commentaire
            </Text>
            <Text style={styles.activityTime}>Il y a 12 min</Text>
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#181818" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFA94D" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Collaboration</Text>
        <TouchableOpacity>
          <Ionicons name="settings-outline" size={24} color="#FFA94D" />
        </TouchableOpacity>
      </View>

      {/* Onglets */}
      <View style={styles.tabsContainer}>
        {[
          { key: 'collaborators', label: 'Équipe', icon: 'people-outline' },
          { key: 'comments', label: 'Commentaires', icon: 'chatbubble-outline' },
          { key: 'live', label: 'Temps Réel', icon: 'radio-outline' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key as any)}
          >
            <Ionicons 
              name={tab.icon as any} 
              size={20} 
              color={activeTab === tab.key ? '#FFA94D' : '#666'} 
            />
            <Text style={[
              styles.tabText,
              activeTab === tab.key && styles.tabTextActive
            ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Contenu des onglets */}
      <ScrollView style={styles.content}>
        {activeTab === 'collaborators' && renderCollaboratorsList()}
        {activeTab === 'comments' && renderCommentsList()}
        {activeTab === 'live' && renderLiveView()}
      </ScrollView>

      {/* Modal d'invitation */}
      <Modal visible={showInviteModal} animationType="slide" transparent statusBarTranslucent>
        <BlurView intensity={50} style={styles.modalOverlay}>
          <View style={styles.inviteModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Inviter un Collaborateur</Text>
              <TouchableOpacity onPress={() => setShowInviteModal(false)}>
                <Ionicons name="close" size={24} color="#FFA94D" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalContent}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Adresse Email</Text>
                <TextInput
                  style={styles.textInput}
                  value={inviteEmail}
                  onChangeText={setInviteEmail}
                  placeholder="email@exemple.com"
                  placeholderTextColor="#666"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Rôle</Text>
                <View style={styles.roleSelector}>
                  {Object.entries(roleConfig).filter(([key]) => key !== 'owner').map(([key, config]) => (
                    <TouchableOpacity
                      key={key}
                      style={[
                        styles.roleOption,
                        { borderColor: config.color },
                        inviteRole === key && { backgroundColor: config.color }
                      ]}
                      onPress={() => setInviteRole(key as Collaborator['role'])}
                    >
                      <Text style={[
                        styles.roleOptionText,
                        { color: inviteRole === key ? '#fff' : config.color }
                      ]}>
                        {config.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Message (optionnel)</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={inviteMessage}
                  onChangeText={setInviteMessage}
                  placeholder="Message d'invitation personnalisé..."
                  placeholderTextColor="#666"
                  multiline
                  numberOfLines={3}
                />
              </View>
            </View>
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowInviteModal(false)}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.inviteButton}
                onPress={handleInviteCollaborator}
              >
                <Text style={styles.inviteButtonText}>Envoyer l'invitation</Text>
              </TouchableOpacity>
            </View>
          </View>
        </BlurView>
      </Modal>

      {/* Modal de commentaire */}
      <Modal visible={showCommentModal} animationType="slide" transparent statusBarTranslucent>
        <BlurView intensity={50} style={styles.modalOverlay}>
          <View style={styles.commentModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ajouter un Commentaire</Text>
              <TouchableOpacity onPress={() => setShowCommentModal(false)}>
                <Ionicons name="close" size={24} color="#FFA94D" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalContent}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Type de commentaire</Text>
                <View style={styles.commentTypeSelector}>
                  {Object.entries(commentTypeConfig).map(([key, config]) => (
                    <TouchableOpacity
                      key={key}
                      style={[
                        styles.commentTypeOption,
                        { borderColor: config.color },
                        commentType === key && { backgroundColor: config.color + '20' }
                      ]}
                      onPress={() => setCommentType(key as Comment['type'])}
                    >
                      <Ionicons name={config.icon as any} size={16} color={config.color} />
                      <Text style={[
                        styles.commentTypeOptionText,
                        { color: config.color }
                      ]}>
                        {config.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Commentaire</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={newCommentText}
                  onChangeText={setNewCommentText}
                  placeholder="Votre commentaire..."
                  placeholderTextColor="#666"
                  multiline
                  numberOfLines={4}
                />
              </View>
            </View>
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowCommentModal(false)}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.addCommentButton}
                onPress={handleAddComment}
              >
                <Text style={styles.addCommentButtonText}>Ajouter</Text>
              </TouchableOpacity>
            </View>
          </View>
        </BlurView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#181818',
  },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  
  // Onglets
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#23232a',
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  tabActive: {
    backgroundColor: '#181818',
  },
  tabText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#FFA94D',
  },
  
  // Contenu
  content: {
    flex: 1,
  },
  tabContent: {
    paddingHorizontal: 20,
  },
  
  // Section
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 169, 77, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Collaborateurs
  collaboratorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#23232a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  collaboratorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  collaboratorAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    position: 'relative',
  },
  collaboratorInitial: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#23232a',
  },
  collaboratorDetails: {
    flex: 1,
  },
  collaboratorName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  collaboratorEmail: {
    color: '#888',
    fontSize: 14,
    marginBottom: 2,
  },
  collaboratorStatus: {
    color: '#666',
    fontSize: 12,
  },
  collaboratorActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  roleText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  moreButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Commentaires
  filtersRow: {
    marginBottom: 16,
  },
  filterChip: {
    backgroundColor: '#23232a',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  filterChipActive: {
    backgroundColor: '#FFA94D',
    borderColor: '#FFA94D',
  },
  filterChipText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#181818',
  },
  commentCard: {
    backgroundColor: '#23232a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  commentAuthor: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  commentInitial: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  commentAuthorName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  commentTimestamp: {
    color: '#666',
    fontSize: 12,
  },
  commentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  commentTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  commentTypeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  resolveButton: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resolveButtonResolved: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    borderRadius: 12,
  },
  commentSelection: {
    backgroundColor: '#333',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#FFA94D',
  },
  selectionChapter: {
    color: '#FFA94D',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  selectionText: {
    color: '#ccc',
    fontSize: 14,
    fontStyle: 'italic',
  },
  commentContent: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  commentReplies: {
    marginLeft: 16,
    borderLeftWidth: 2,
    borderLeftColor: '#333',
    paddingLeft: 12,
    marginBottom: 12,
  },
  commentReply: {
    marginBottom: 8,
  },
  replyAuthor: {
    color: '#FFA94D',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  replyContent: {
    color: '#ccc',
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 2,
  },
  replyTimestamp: {
    color: '#666',
    fontSize: 10,
  },
  replyButton: {
    alignSelf: 'flex-start',
  },
  replyButtonText: {
    color: '#FFA94D',
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Temps réel
  liveSection: {
    marginBottom: 24,
  },
  liveSectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  activeUsers: {
    flexDirection: 'row',
    gap: 16,
  },
  activeUser: {
    alignItems: 'center',
  },
  activeUserAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    marginBottom: 6,
  },
  activeUserInitial: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  activeUserName: {
    color: '#ccc',
    fontSize: 12,
  },
  liveCursor: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#23232a',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    gap: 12,
  },
  cursorIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  cursorUser: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  cursorPosition: {
    color: '#666',
    fontSize: 12,
    marginLeft: 'auto',
  },
  activityFeed: {
    gap: 12,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#23232a',
    padding: 12,
    borderRadius: 8,
    gap: 12,
  },
  activityText: {
    color: '#ccc',
    fontSize: 14,
    flex: 1,
  },
  activityUser: {
    color: '#FFA94D',
    fontWeight: '600',
  },
  activityTime: {
    color: '#666',
    fontSize: 12,
  },
  
  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  inviteModal: {
    backgroundColor: '#181818',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  commentModal: {
    backgroundColor: '#181818',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalContent: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#23232a',
    color: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  roleSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  roleOption: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  roleOptionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  commentTypeSelector: {
    gap: 8,
  },
  commentTypeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  commentTypeOptionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#333',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  inviteButton: {
    flex: 2,
    backgroundColor: '#FFA94D',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  inviteButtonText: {
    color: '#181818',
    fontSize: 16,
    fontWeight: 'bold',
  },
  addCommentButton: {
    flex: 2,
    backgroundColor: '#4ECDC4',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  addCommentButtonText: {
    color: '#181818',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default CollaborationHub;