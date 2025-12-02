import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getAuth } from 'firebase/auth';
import app from '../../constants/firebaseConfig';
import { NotificationService } from '../../services/NotificationService';

interface NotificationBellProps {
  size?: number;
  color?: string;
  style?: any;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ 
  size = 24, 
  color = '#FFA94D',
  style 
}) => {
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const auth = getAuth(app);
    const user = auth.currentUser;
    if (!user) return;

    // S'abonner aux changements de notifications
    const unsubscribe = NotificationService.subscribeToNotifications(user.uid, (notifications) => {
      const unread = notifications.filter(n => !n.read).length;
      setUnreadCount(unread);
    });

    return () => unsubscribe();
  }, []);

  return (
    <TouchableOpacity 
      onPress={() => router.push('/notifications')}
      style={[styles.container, style]}
      activeOpacity={0.7}
    >
      <Ionicons name={unreadCount > 0 ? 'notifications' : 'notifications-outline'} size={size} color={color} />
      {unreadCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#181818',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
});
