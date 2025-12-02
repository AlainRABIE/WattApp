import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { MonthlyRankingService, MonthlyBook } from '../../services/MonthlyRankingService';
import { useTheme } from '../../hooks/useTheme';

interface BookOfTheMonthProps {
  style?: any;
}

export const BookOfTheMonth: React.FC<BookOfTheMonthProps> = ({ style }) => {
  const { theme } = useTheme();
  const router = useRouter();
  const [topBook, setTopBook] = useState<MonthlyBook | null>(null);
  const [loading, setLoading] = useState(true);
  const [monthName, setMonthName] = useState('');

  useEffect(() => {
    loadBookOfTheMonth();
  }, []);

  const loadBookOfTheMonth = async () => {
    try {
      setLoading(true);
      const ranking = await MonthlyRankingService.getMonthlyRanking();
      
      if (ranking) {
        setTopBook(ranking.topBook);
        setMonthName(MonthlyRankingService.getMonthName(ranking.monthNumber));
      }
    } catch (error) {
      console.error('Erreur chargement livre du mois:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.surface }, style]}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
      </View>
    );
  }

  if (!topBook) {
    return null;
  }

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: theme.colors.surface }, style]}
      onPress={() => router.push(`/book/${topBook.bookId}`)}
      activeOpacity={0.8}
    >
      {/* Badge "Livre du mois" */}
      <View style={[styles.badge, { backgroundColor: theme.colors.primary }]}>
        <Ionicons name="trophy" size={14} color="#fff" />
        <Text style={styles.badgeText}>Livre du mois · {monthName}</Text>
      </View>

      <View style={styles.content}>
        {/* Couverture */}
        <View style={styles.coverContainer}>
          <Image
            source={{ 
              uri: topBook.coverImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(topBook.title)}&background=23232a&color=FFA94D&size=128` 
            }}
            style={styles.cover}
            resizeMode="cover"
          />
          {/* Crown icon */}
          <View style={[styles.crown, { backgroundColor: theme.colors.primary }]}>
            <Text style={styles.crownIcon}>👑</Text>
          </View>
        </View>

        {/* Infos */}
        <View style={styles.info}>
          <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={2}>
            {topBook.title}
          </Text>
          <Text style={[styles.author, { color: theme.colors.textSecondary }]} numberOfLines={1}>
            par {topBook.author}
          </Text>

          {/* Stats */}
          <View style={styles.stats}>
            <View style={styles.statItem}>
              <Ionicons name="eye" size={14} color={theme.colors.primary} />
              <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>
                {topBook.reads.toLocaleString()} lectures
              </Text>
            </View>
            
            {topBook.avgRating > 0 && (
              <View style={styles.statItem}>
                <Ionicons name="star" size={14} color={theme.colors.primary} />
                <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>
                  {topBook.avgRating.toFixed(1)}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Chevron */}
        <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
    marginVertical: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 6,
  },
  badgeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 16,
  },
  coverContainer: {
    position: 'relative',
  },
  cover: {
    width: 80,
    height: 120,
    borderRadius: 12,
    backgroundColor: '#333',
  },
  crown: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  crownIcon: {
    fontSize: 18,
  },
  info: {
    flex: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
    lineHeight: 22,
  },
  author: {
    fontSize: 14,
    marginBottom: 12,
  },
  stats: {
    flexDirection: 'row',
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
