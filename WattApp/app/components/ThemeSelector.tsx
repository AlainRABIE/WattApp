import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { AppTheme } from '../../services/ThemeService';

const { width } = Dimensions.get('window');

interface ThemeSelectorProps {
  visible: boolean;
  onClose: () => void;
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({ visible, onClose }) => {
  const { theme, changeTheme, currentThemeKey, allThemes } = useTheme();

  const handleThemeSelect = async (themeKey: string) => {
    await changeTheme(themeKey);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContainer, { backgroundColor: theme.colors.surface }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.colors.text }]}>
              Choisir un thème
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          {/* Thèmes */}
          <ScrollView style={styles.themesContainer} showsVerticalScrollIndicator={false}>
            <View style={styles.themesGrid}>
              {Object.entries(allThemes).map(([key, themeData]: [string, AppTheme]) => (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.themeCard,
                    { backgroundColor: themeData.colors.background },
                    currentThemeKey === key && {
                      borderColor: theme.colors.primary,
                      borderWidth: 3
                    }
                  ]}
                  onPress={() => handleThemeSelect(key)}
                >
                  {/* Preview */}
                  <View style={[styles.themePreview, { backgroundColor: themeData.colors.surface }]}>
                    <View style={[styles.previewHeader, { backgroundColor: themeData.colors.primary }]}>
                      <View style={styles.previewDots}>
                        <View style={[styles.dot, { backgroundColor: themeData.colors.text }]} />
                        <View style={[styles.dot, { backgroundColor: themeData.colors.text }]} />
                        <View style={[styles.dot, { backgroundColor: themeData.colors.text }]} />
                      </View>
                    </View>
                    <View style={styles.previewContent}>
                      <View style={[styles.previewLine, { backgroundColor: themeData.colors.text }]} />
                      <View style={[styles.previewLine, { backgroundColor: themeData.colors.textSecondary, width: '70%' }]} />
                      <View style={[styles.previewLine, { backgroundColor: themeData.colors.accent, width: '50%' }]} />
                    </View>
                  </View>

                  {/* Info */}
                  <View style={styles.themeInfo}>
                    <Text style={styles.themeIcon}>{themeData.icon}</Text>
                    <Text style={[styles.themeName, { color: themeData.colors.text }]} numberOfLines={1}>
                      {themeData.name}
                    </Text>
                    {currentThemeKey === key && (
                      <View style={styles.selectedBadge}>
                        <Ionicons name="checkmark-circle" size={16} color={theme.colors.primary} />
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: theme.colors.primary }]}
              onPress={onClose}
            >
              <Text style={[styles.actionButtonText, { color: theme.colors.background }]}>
                Terminer
              </Text>
            </TouchableOpacity>
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
    maxHeight: '80%',
    minHeight: '60%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 5,
  },
  themesContainer: {
    flex: 1,
    padding: 20,
  },
  themesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  themeCard: {
    width: (width - 60) / 2,
    marginBottom: 20,
    borderRadius: 15,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  themePreview: {
    height: 100,
    margin: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },
  previewHeader: {
    height: 25,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  previewDots: {
    flexDirection: 'row',
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  previewContent: {
    flex: 1,
    padding: 8,
    gap: 6,
  },
  previewLine: {
    height: 8,
    borderRadius: 4,
  },
  themeInfo: {
    padding: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    position: 'relative',
  },
  themeIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  themeName: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  selectedBadge: {
    position: 'absolute',
    right: 8,
    top: 12,
  },
  actions: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  actionButton: {
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});