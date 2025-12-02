import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getAuth } from 'firebase/auth';
import app from '../../constants/firebaseConfig';
import { NotificationService, AppNotification, NotificationType } from '../../services/NotificationService';
import { useTheme } from '../../hooks/useTheme';

interface NotificationModalProps {
  visible: boolean;
  onClose: () => void;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({ visible, onClose }) => {
  const { theme } = useTheme();
  const router = useRouter();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!visible) return;

    const auth = getAuth(app);
    const user = auth.currentUser;
    if (!user) return;

    // S'abonner aux notifications en temps réel
    const unsubscribe = NotificationService.subscribeToNotifications(user.uid, (newNotifications) => {
      setNotifications(newNotifications.slice(0, 10)); // Limiter à 10 pour le modal
      setLoading(false);
    });

    return () => unsubscribe();
  }, [visible]);

  const handleNotificationPress = async (notification: AppNotification) => {
    // Marquer comme lue
    if (!notification.read && notification.id) {
      await NotificationService.markAsRead(notification.id);
    }

    // Fermer le modal
    onClose();

    // Naviguer vers l'URL d'action
    if (notification.actionUrl) {
      router.push(notification.actionUrl as any);
    }
  };

  const handleMarkAllAsRead = async () => {
    const auth = getAuth(app);
    const user = auth.currentUser;
    if (!user) return;

    await NotificationService.markAllAsRead(user.uid);
  };

  const handleViewAll = () => {
    onClose();
    router.push('/notifications');
  };

  const getNotificationIcon = (type: NotificationType): string => {
    const icons: Record<NotificationType, string> = {
      new_follower: 'person-add',
      new_comment: 'chatbubble',
      new_rating: 'star',
      new_purchase: 'cash',
      book_published: 'book',
      chapter_added: 'document-text',
      book_of_month: 'trophy',
      achievement: 'medal',
      message: 'mail',
      system: 'information-circle',
    };
    return icons[type] || 'notifications';
  };

  const getNotificationColor = (type: NotificationType): string => {
    const colors: Record<NotificationType, string> = {
      new_follower: '#4FC3F7',
      new_comment: '#9C27B0',
      new_rating: '#FFD700',
      new_purchase: '#4CAF50',
      book_published: '#FF9800',
      chapter_added: '#3F51B5',
      book_of_month: '#FFD700',
      achievement: '#FF6B35',
      message: '#2196F3',
      system: '#607D8B',
    };
    return colors[type] || theme.colors.primary;
  };

  const formatDate = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return 'Maintenant';
    if (diffMins < 60) return `${diffMins} min`;
    if (diffHours < 24) return `${diffHours}h`;
    
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  const renderNotification = ({ item }: { item: AppNotification }) => {
    const iconColor = getNotificationColor(item.type);
    
    return (
      <TouchableOpacity
        style={[
          styles.notificationItem,
          { backgroundColor: theme.colors.surface },
          !item.read && { backgroundColor: theme.colors.primary + '08' }
        ]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.iconContainer, { backgroundColor: iconColor + '20' }]}>
          <Ionicons name={getNotificationIcon(item.type) as any} size={20} color={iconColor} />
        </View>

        <View style={styles.notificationContent}>
          <View style={styles.notificationHeader}>
            <Text style={[styles.notificationTitle, { color: theme.colors.text }]} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={[styles.notificationTime, { color: theme.colors.textSecondary }]}>
              {formatDate(item.createdAt as Date)}
            </Text>
          </View>

          <Text style={[styles.notificationMessage, { color: theme.colors.textSecondary }]} numberOfLines={2}>
            {item.message}
          </Text>
        </View>

        {!item.read && <View style={[styles.unreadDot, { backgroundColor: theme.colors.primary }]} />}
      </TouchableOpacity>
    );
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={styles.overlay} 
        activeOpacity={1} 
        onPress={onClose}
      >
        <TouchableOpacity 
          activeOpacity={1}
          style={[styles.modalContent, { backgroundColor: theme.colors.background }]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
            <View>
              <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Notifications</Text>
              {unreadCount > 0 && (
                <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
                  {unreadCount} non {unreadCount === 1 ? 'lue' : 'lues'}
                </Text>
              )}
            </View>

            <View style={styles.headerActions}>
              {unreadCount > 0 && (
                <TouchableOpacity
                  onPress={handleMarkAllAsRead}
                  style={[styles.headerButton, { backgroundColor: theme.colors.surface }]}
                >
                  <Ionicons name="checkmark-done" size={18} color={theme.colors.primary} />
                </TouchableOpacity>
              )}
              
              <TouchableOpacity
                onPress={onClose}
                style={[styles.headerButton, { backgroundColor: theme.colors.surface }]}
              >
                <Ionicons name="close" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Content */}
          {loading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
          ) : notifications.length === 0 ? (
            <View style={styles.centerContainer}>
              <Ionicons name="notifications-off-outline" size={60} color={theme.colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
                Aucune notification
              </Text>
              <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
                Vos notifications apparaîtront ici
              </Text>
            </View>
          ) : (
            <>
              <FlatList
                data={notifications}
                renderItem={renderNotification}
                keyExtractor={(item) => item.id || ''}
                showsVerticalScrollIndicator={false}
                style={styles.list}
              />

              {/* Bouton Voir tout */}
              <TouchableOpacity
                style={[styles.viewAllButton, { backgroundColor: theme.colors.primary }]}
                onPress={handleViewAll}
              >
                <Text style={styles.viewAllButtonText}>Voir toutes les notifications</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </TouchableOpacity>
            </>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    paddingTop: 60,
  },
  modalContent: {
    marginHorizontal: 16,
    marginTop: 20,
    borderRadius: 20,
    maxHeight: '75%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  list: {
    maxHeight: 400,
  },
  notificationItem: {
    flexDirection: 'row',
    padding: 16,
    marginHorizontal: 12,
    marginVertical: 4,
    borderRadius: 12,
    position: 'relative',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  notificationTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    marginRight: 8,
  },
  notificationTime: {
    fontSize: 11,
  },
  notificationMessage: {
    fontSize: 13,
    lineHeight: 18,
  },
  unreadDot: {
    position: 'absolute',
    top: 20,
    right: 16,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 12,
  },
  viewAllButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
