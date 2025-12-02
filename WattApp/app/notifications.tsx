import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StatusBar,
  Platform,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getAuth } from 'firebase/auth';
import app from '../constants/firebaseConfig';
import { NotificationService, AppNotification, NotificationType } from '../services/NotificationService';
import { useTheme } from '../hooks/useTheme';

export default function NotificationsScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const auth = getAuth(app);
    const user = auth.currentUser;
    if (!user) return;

    // Charger les notifications initiales
    loadNotifications();

    // S'abonner aux mises à jour en temps réel
    const unsubscribe = NotificationService.subscribeToNotifications(user.uid, (newNotifications) => {
      setNotifications(newNotifications);
      const unread = newNotifications.filter(n => !n.read).length;
      setUnreadCount(unread);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loadNotifications = async () => {
    const auth = getAuth(app);
    const user = auth.currentUser;
    if (!user) return;

    try {
      setLoading(true);
      const notifs = await NotificationService.getNotifications(user.uid);
      setNotifications(notifs);
      const unread = notifs.filter(n => !n.read).length;
      setUnreadCount(unread);
    } catch (error) {
      console.error('Erreur chargement notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  };

  const handleNotificationPress = async (notification: AppNotification) => {
    // Marquer comme lue
    if (!notification.read && notification.id) {
      await NotificationService.markAsRead(notification.id);
    }

    // Naviguer vers l'URL d'action si disponible
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

  const handleDeleteAll = () => {
    Alert.alert(
      'Supprimer toutes les notifications',
      'Êtes-vous sûr de vouloir supprimer toutes vos notifications ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            const auth = getAuth(app);
            const user = auth.currentUser;
            if (!user) return;
            await NotificationService.deleteAllNotifications(user.uid);
          },
        },
      ]
    );
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
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays < 7) return `Il y a ${diffDays}j`;
    
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  const renderNotification = ({ item }: { item: AppNotification }) => {
    const iconColor = getNotificationColor(item.type);
    
    return (
      <TouchableOpacity
        style={[
          styles.notificationCard,
          { backgroundColor: theme.colors.surface },
          !item.read && { backgroundColor: theme.colors.primary + '08' }
        ]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.iconContainer, { backgroundColor: iconColor + '20' }]}>
          <Ionicons name={getNotificationIcon(item.type) as any} size={22} color={iconColor} />
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

          {item.imageUrl && (
            <Image source={{ uri: item.imageUrl }} style={styles.notificationImage} />
          )}
        </View>

        {!item.read && <View style={[styles.unreadDot, { backgroundColor: theme.colors.primary }]} />}
      </TouchableOpacity>
    );
  };

  const dynamicStyles = getStyles(theme);

  return (
    <View style={dynamicStyles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={dynamicStyles.header}>
        <View>
          <Text style={[dynamicStyles.headerTitle, { color: theme.colors.text }]}>Notifications</Text>
          {unreadCount > 0 && (
            <Text style={[dynamicStyles.headerSubtitle, { color: theme.colors.textSecondary }]}>
              {unreadCount} non {unreadCount === 1 ? 'lue' : 'lues'}
            </Text>
          )}
        </View>

        <View style={dynamicStyles.headerActions}>
          {unreadCount > 0 && (
            <TouchableOpacity
              onPress={handleMarkAllAsRead}
              style={[dynamicStyles.headerButton, { backgroundColor: theme.colors.surface }]}
            >
              <Ionicons name="checkmark-done" size={20} color={theme.colors.primary} />
            </TouchableOpacity>
          )}
          
          {notifications.length > 0 && (
            <TouchableOpacity
              onPress={handleDeleteAll}
              style={[dynamicStyles.headerButton, { backgroundColor: theme.colors.surface }]}
            >
              <Ionicons name="trash-outline" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <View style={dynamicStyles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : notifications.length === 0 ? (
        <View style={dynamicStyles.centerContainer}>
          <Ionicons name="notifications-off-outline" size={80} color={theme.colors.textSecondary} />
          <Text style={[dynamicStyles.emptyTitle, { color: theme.colors.text }]}>
            Aucune notification
          </Text>
          <Text style={[dynamicStyles.emptySubtitle, { color: theme.colors.textSecondary }]}>
            Vos notifications apparaîtront ici
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotification}
          keyExtractor={(item) => item.id || ''}
          contentContainerStyle={dynamicStyles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.primary}
              colors={[theme.colors.primary]}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const getStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 60 : (StatusBar.currentHeight || 0) + 20,
    paddingBottom: 16,
    paddingHorizontal: 24,
    borderBottomWidth: 0.5,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 10,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: 'center',
  },
  listContent: {
    paddingVertical: 8,
  },
  notificationCard: {
    flexDirection: 'row',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    position: 'relative',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  notificationTime: {
    fontSize: 12,
  },
  notificationMessage: {
    fontSize: 14,
    lineHeight: 20,
  },
  notificationImage: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    marginTop: 12,
    backgroundColor: theme.colors.background,
  },
  unreadDot: {
    position: 'absolute',
    top: 20,
    right: 16,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});

const styles = StyleSheet.create({
  // Styles de base pour la compatibilité
  notificationCard: {},
  iconContainer: {},
  notificationContent: {},
  notificationHeader: {},
  notificationTitle: {},
  notificationTime: {},
  notificationMessage: {},
  notificationImage: {},
  unreadDot: {},
});
