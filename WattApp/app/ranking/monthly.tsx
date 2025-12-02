import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StatusBar,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { MonthlyRankingService, MonthlyRanking, MonthlyBook } from '../../services/MonthlyRankingService';
import { useTheme } from '../../hooks/useTheme';

const MonthlyRankingScreen: React.FC = () => {
  const { theme } = useTheme();
  const router = useRouter();
  const [currentRanking, setCurrentRanking] = useState<MonthlyRanking | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRanking();
  }, []);

  const loadRanking = async () => {
    try {
      setLoading(true);
      const ranking = await MonthlyRankingService.getMonthlyRanking();
      setCurrentRanking(ranking);
    } catch (error) {
      console.error('Erreur chargement classement:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankMedal = (rank: number) => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return `#${rank}`;
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1: return '#FFD700';
      case 2: return '#C0C0C0';
      case 3: return '#CD7F32';
      default: return theme.colors.textSecondary;
    }
  };

  const dynamicStyles = getStyles(theme);

  if (loading) {
    return (
      <View style={[dynamicStyles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[dynamicStyles.loadingText, { color: theme.colors.primary }]}>
          Chargement du classement...
        </Text>
      </View>
    );
  }

  return (
    <View style={dynamicStyles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={dynamicStyles.header}>
        <TouchableOpacity onPress={() => router.back()} style={dynamicStyles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[dynamicStyles.headerTitle, { color: theme.colors.text }]}>
          Classement mensuel
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        {currentRanking?.topBook && (
          <View style={dynamicStyles.heroSection}>
            <View style={[dynamicStyles.heroBadge, { backgroundColor: theme.colors.primary }]}>
              <Ionicons name="trophy" size={20} color="#fff" />
              <Text style={dynamicStyles.heroBadgeText}>
                Livre du mois · {MonthlyRankingService.getMonthName(currentRanking.monthNumber)} {currentRanking.year}
              </Text>
            </View>

            <TouchableOpacity
              style={dynamicStyles.heroCard}
              onPress={() => router.push(`/book/${currentRanking.topBook?.bookId}`)}
              activeOpacity={0.8}
            >
              <View style={dynamicStyles.crownContainer}>
                <Text style={dynamicStyles.crownIcon}>👑</Text>
              </View>

              <Image
                source={{
                  uri: currentRanking.topBook.coverImage || 
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(currentRanking.topBook.title)}&background=23232a&color=FFA94D&size=256`
                }}
                style={dynamicStyles.heroCover}
                resizeMode="cover"
              />

              <Text style={[dynamicStyles.heroTitle, { color: theme.colors.text }]} numberOfLines={2}>
                {currentRanking.topBook.title}
              </Text>
              
              <Text style={[dynamicStyles.heroAuthor, { color: theme.colors.textSecondary }]}>
                par {currentRanking.topBook.author}
              </Text>

              <View style={dynamicStyles.heroStats}>
                <View style={dynamicStyles.heroStat}>
                  <Ionicons name="eye" size={18} color={theme.colors.primary} />
                  <Text style={[dynamicStyles.heroStatText, { color: theme.colors.text }]}>
                    {currentRanking.topBook.reads.toLocaleString()}
                  </Text>
                </View>
                
                {currentRanking.topBook.avgRating > 0 && (
                  <View style={dynamicStyles.heroStat}>
                    <Ionicons name="star" size={18} color={theme.colors.primary} />
                    <Text style={[dynamicStyles.heroStatText, { color: theme.colors.text }]}>
                      {currentRanking.topBook.avgRating.toFixed(1)}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Top 10 */}
        <View style={dynamicStyles.rankingSection}>
          <Text style={[dynamicStyles.sectionTitle, { color: theme.colors.text }]}>
            Top 10 du mois
          </Text>

          {currentRanking?.topBooks.map((book, index) => (
            <TouchableOpacity
              key={book.bookId}
              style={[
                dynamicStyles.rankItem,
                { backgroundColor: theme.colors.surface },
                index < currentRanking.topBooks.length - 1 && {
                  borderBottomWidth: 0.5,
                  borderBottomColor: theme.colors.border,
                }
              ]}
              onPress={() => router.push(`/book/${book.bookId}`)}
              activeOpacity={0.8}
            >
              {/* Rank */}
              <View style={[
                dynamicStyles.rankBadge,
                book.rank <= 3 && { backgroundColor: getRankColor(book.rank) + '20' }
              ]}>
                <Text style={[
                  dynamicStyles.rankText,
                  { color: getRankColor(book.rank) }
                ]}>
                  {getRankMedal(book.rank)}
                </Text>
              </View>

              {/* Cover */}
              <Image
                source={{
                  uri: book.coverImage || 
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(book.title)}&background=23232a&color=FFA94D&size=128`
                }}
                style={dynamicStyles.rankCover}
                resizeMode="cover"
              />

              {/* Info */}
              <View style={dynamicStyles.rankInfo}>
                <Text style={[dynamicStyles.rankTitle, { color: theme.colors.text }]} numberOfLines={1}>
                  {book.title}
                </Text>
                <Text style={[dynamicStyles.rankAuthor, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                  {book.author}
                </Text>
                
                <View style={dynamicStyles.rankStats}>
                  <View style={dynamicStyles.rankStat}>
                    <Ionicons name="eye" size={12} color={theme.colors.textSecondary} />
                    <Text style={[dynamicStyles.rankStatText, { color: theme.colors.textSecondary }]}>
                      {book.reads.toLocaleString()}
                    </Text>
                  </View>
                  
                  {book.avgRating > 0 && (
                    <View style={dynamicStyles.rankStat}>
                      <Ionicons name="star" size={12} color={theme.colors.primary} />
                      <Text style={[dynamicStyles.rankStatText, { color: theme.colors.textSecondary }]}>
                        {book.avgRating.toFixed(1)}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const getStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    fontWeight: '600',
  },

  // Header
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
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },

  // Hero Section
  heroSection: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginBottom: 24,
  },
  heroBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  heroCard: {
    alignItems: 'center',
    position: 'relative',
  },
  crownContainer: {
    position: 'absolute',
    top: -20,
    zIndex: 10,
  },
  crownIcon: {
    fontSize: 48,
  },
  heroCover: {
    width: 160,
    height: 240,
    borderRadius: 16,
    marginBottom: 20,
    backgroundColor: theme.colors.surface,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  heroAuthor: {
    fontSize: 16,
    marginBottom: 16,
  },
  heroStats: {
    flexDirection: 'row',
    gap: 24,
  },
  heroStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroStatText: {
    fontSize: 16,
    fontWeight: '600',
  },

  // Ranking Section
  rankingSection: {
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 16,
  },
  rankItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 2,
    gap: 12,
  },
  rankBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    fontSize: 18,
    fontWeight: '700',
  },
  rankCover: {
    width: 50,
    height: 75,
    borderRadius: 8,
    backgroundColor: theme.colors.background,
  },
  rankInfo: {
    flex: 1,
  },
  rankTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  rankAuthor: {
    fontSize: 13,
    marginBottom: 6,
  },
  rankStats: {
    flexDirection: 'row',
    gap: 12,
  },
  rankStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rankStatText: {
    fontSize: 12,
    fontWeight: '500',
  },
});

export default MonthlyRankingScreen;
