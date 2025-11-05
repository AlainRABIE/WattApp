import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Modal,
  Dimensions,
  StatusBar,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

const { width, height } = Dimensions.get('window');

interface MangaTemplate {
  id: string;
  name: string;
  type: 'page' | 'strip' | '4koma' | 'webtoon';
  description: string;
  layout: PanelLayout[];
  aspectRatio: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
  thumbnail: string;
  color: string;
}

interface PanelLayout {
  id: string;
  x: number; // Position X en pourcentage
  y: number; // Position Y en pourcentage  
  width: number; // Largeur en pourcentage
  height: number; // Hauteur en pourcentage
  shape: 'rectangle' | 'circle' | 'custom';
  borderRadius?: number;
  rotation?: number;
  zIndex: number;
}

const MangaTemplatesGallery: React.FC = () => {
  const router = useRouter();
  
  const [selectedTemplate, setSelectedTemplate] = useState<MangaTemplate | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Templates manga prédéfinis
  const mangaTemplates: MangaTemplate[] = [
    {
      id: 'classic-page',
      name: 'Page Classique',
      type: 'page',
      description: 'Layout traditionnel 6 cases pour manga japonais',
      aspectRatio: 0.71, // Format B5 japonais
      difficulty: 'beginner',
      tags: ['classique', 'traditionnel', '6-cases'],
      thumbnail: 'https://picsum.photos/300/400?random=1',
      color: '#667eea',
      layout: [
        { id: '1', x: 5, y: 5, width: 90, height: 25, shape: 'rectangle', zIndex: 1 },
        { id: '2', x: 5, y: 32, width: 43, height: 30, shape: 'rectangle', zIndex: 1 },
        { id: '3', x: 52, y: 32, width: 43, height: 30, shape: 'rectangle', zIndex: 1 },
        { id: '4', x: 5, y: 65, width: 28, height: 30, shape: 'rectangle', zIndex: 1 },
        { id: '5', x: 36, y: 65, width: 28, height: 30, shape: 'rectangle', zIndex: 1 },
        { id: '6', x: 67, y: 65, width: 28, height: 30, shape: 'rectangle', zIndex: 1 },
      ]
    },
    {
      id: 'action-spread',
      name: 'Double Page Action',
      type: 'page',
      description: 'Layout pour scènes d\'action avec grande case centrale',
      aspectRatio: 1.42, // Double page
      difficulty: 'intermediate',
      tags: ['action', 'double-page', 'dynamique'],
      thumbnail: 'https://picsum.photos/600/400?random=2',
      color: '#f093fb',
      layout: [
        { id: '1', x: 5, y: 5, width: 25, height: 20, shape: 'rectangle', zIndex: 1 },
        { id: '2', x: 70, y: 5, width: 25, height: 20, shape: 'rectangle', zIndex: 1 },
        { id: '3', x: 15, y: 30, width: 70, height: 45, shape: 'rectangle', zIndex: 2 }, // Grande case centrale
        { id: '4', x: 5, y: 80, width: 20, height: 15, shape: 'rectangle', zIndex: 1 },
        { id: '5', x: 30, y: 80, width: 40, height: 15, shape: 'rectangle', zIndex: 1 },
        { id: '6', x: 75, y: 80, width: 20, height: 15, shape: 'rectangle', zIndex: 1 },
      ]
    },
    {
      id: 'yonkoma',
      name: '4-Koma',
      type: '4koma',
      description: 'Format traditionnel japonais 4 cases verticales',
      aspectRatio: 0.4, // Format vertical étroit
      difficulty: 'beginner',
      tags: ['4koma', 'humour', 'vertical'],
      thumbnail: 'https://picsum.photos/200/500?random=3',
      color: '#4facfe',
      layout: [
        { id: '1', x: 10, y: 5, width: 80, height: 20, shape: 'rectangle', zIndex: 1 },
        { id: '2', x: 10, y: 27, width: 80, height: 20, shape: 'rectangle', zIndex: 1 },
        { id: '3', x: 10, y: 49, width: 80, height: 20, shape: 'rectangle', zIndex: 1 },
        { id: '4', x: 10, y: 71, width: 80, height: 20, shape: 'rectangle', zIndex: 1 },
      ]
    },
    {
      id: 'webtoon-vertical',
      name: 'Webtoon Vertical',
      type: 'webtoon',
      description: 'Format scroll vertical pour webtoons coréens',
      aspectRatio: 0.35, // Très vertical pour scroll
      difficulty: 'intermediate',
      tags: ['webtoon', 'scroll', 'moderne'],
      thumbnail: 'https://picsum.photos/200/600?random=4',
      color: '#fa709a',
      layout: [
        { id: '1', x: 5, y: 2, width: 90, height: 15, shape: 'rectangle', zIndex: 1 },
        { id: '2', x: 5, y: 19, width: 43, height: 12, shape: 'rectangle', zIndex: 1 },
        { id: '3', x: 52, y: 19, width: 43, height: 12, shape: 'rectangle', zIndex: 1 },
        { id: '4', x: 5, y: 33, width: 90, height: 18, shape: 'rectangle', zIndex: 1 },
        { id: '5', x: 5, y: 53, width: 40, height: 15, shape: 'rectangle', zIndex: 1 },
        { id: '6', x: 48, y: 53, width: 47, height: 15, shape: 'rectangle', zIndex: 1 },
        { id: '7', x: 5, y: 70, width: 90, height: 25, shape: 'rectangle', zIndex: 1 },
      ]
    },
    {
      id: 'minimal-3panel',
      name: '3 Cases Minimaliste',
      type: 'strip',
      description: 'Layout simple 3 cases horizontales pour webcomics',
      aspectRatio: 3, // Format très horizontal
      difficulty: 'beginner',
      tags: ['minimaliste', 'webcomic', 'horizontal'],
      thumbnail: 'https://picsum.photos/600/200?random=5',
      color: '#95e1d3',
      layout: [
        { id: '1', x: 2, y: 20, width: 30, height: 60, shape: 'rectangle', zIndex: 1 },
        { id: '2', x: 35, y: 20, width: 30, height: 60, shape: 'rectangle', zIndex: 1 },
        { id: '3', x: 68, y: 20, width: 30, height: 60, shape: 'rectangle', zIndex: 1 },
      ]
    },
    {
      id: 'creative-circles',
      name: 'Cases Circulaires',
      type: 'page',
      description: 'Layout créatif avec cases rondes et formes organiques',
      aspectRatio: 0.71,
      difficulty: 'advanced',
      tags: ['créatif', 'circulaire', 'artistique'],
      thumbnail: 'https://picsum.photos/300/400?random=6',
      color: '#fbc7d4',
      layout: [
        { id: '1', x: 15, y: 10, width: 25, height: 25, shape: 'circle', zIndex: 1 },
        { id: '2', x: 60, y: 5, width: 30, height: 30, shape: 'circle', zIndex: 1 },
        { id: '3', x: 5, y: 40, width: 40, height: 25, shape: 'rectangle', borderRadius: 15, zIndex: 1 },
        { id: '4', x: 50, y: 45, width: 20, height: 20, shape: 'circle', zIndex: 1 },
        { id: '5', x: 75, y: 40, width: 20, height: 35, shape: 'rectangle', borderRadius: 10, zIndex: 1 },
        { id: '6', x: 20, y: 70, width: 60, height: 25, shape: 'rectangle', borderRadius: 20, zIndex: 1 },
      ]
    }
  ];

  const categories = [
    { id: 'all', name: 'Tous', icon: 'library-outline', color: '#FFA94D' },
    { id: 'page', name: 'Pages', icon: 'document-outline', color: '#667eea' },
    { id: 'strip', name: 'Strips', icon: 'remove-outline', color: '#95e1d3' },
    { id: '4koma', name: '4-Koma', icon: 'grid-outline', color: '#4facfe' },
    { id: 'webtoon', name: 'Webtoon', icon: 'phone-portrait-outline', color: '#fa709a' },
  ];

  const filteredTemplates = selectedCategory === 'all' 
    ? mangaTemplates 
    : mangaTemplates.filter(t => t.type === selectedCategory);

  const handleUseTemplate = (template: MangaTemplate) => {
    setShowPreview(false);
    router.push(`/write/manga-editor/simple?projectId=new&templateId=${template.id}`);
  };

  const renderTemplateCard = (template: MangaTemplate) => (
    <TouchableOpacity
      style={[styles.templateCard, { borderColor: template.color }]}
      onPress={() => {
        setSelectedTemplate(template);
        setShowPreview(true);
      }}
    >
      <LinearGradient
        colors={[template.color + '20', template.color + '05']}
        style={styles.templateGradient}
      >
        <View style={styles.templateHeader}>
          <View style={[styles.typeTag, { backgroundColor: template.color }]}>
            <Text style={styles.typeTagText}>{template.type.toUpperCase()}</Text>
          </View>
          <View style={[styles.difficultyBadge, getDifficultyColor(template.difficulty)]}>
            <Text style={styles.difficultyText}>
              {template.difficulty === 'beginner' ? 'Débutant' : 
               template.difficulty === 'intermediate' ? 'Inter.' : 'Avancé'}
            </Text>
          </View>
        </View>

        <View style={styles.templatePreview}>
          <View style={[styles.layoutPreview, { aspectRatio: template.aspectRatio }]}>
            {template.layout.map((panel) => (
              <View
                key={panel.id}
                style={[
                  styles.panelPreview,
                  {
                    left: `${panel.x}%`,
                    top: `${panel.y}%`,
                    width: `${panel.width}%`,
                    height: `${panel.height}%`,
                    borderRadius: panel.shape === 'circle' ? 999 : (panel.borderRadius || 4),
                    backgroundColor: template.color + '30',
                    borderColor: template.color,
                  }
                ]}
              />
            ))}
          </View>
        </View>

        <View style={styles.templateInfo}>
          <Text style={styles.templateName}>{template.name}</Text>
          <Text style={styles.templateDescription}>{template.description}</Text>
          <View style={styles.tagsContainer}>
            {template.tags.slice(0, 3).map((tag, index) => (
              <View key={index} style={[styles.tag, { backgroundColor: template.color + '20' }]}>
                <Text style={[styles.tagText, { color: template.color }]}>{tag}</Text>
              </View>
            ))}
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return { backgroundColor: '#4CAF50' };
      case 'intermediate': return { backgroundColor: '#FF9800' };
      case 'advanced': return { backgroundColor: '#F44336' };
      default: return { backgroundColor: '#666' };
    }
  };

  const renderPreview = () => (
    <Modal visible={showPreview} animationType="slide" statusBarTranslucent>
      <View style={styles.previewContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#181818" />
        
        <View style={styles.previewHeader}>
          <TouchableOpacity onPress={() => setShowPreview(false)}>
            <Ionicons name="close" size={24} color="#FFA94D" />
          </TouchableOpacity>
          <Text style={styles.previewTitle}>Aperçu Template</Text>
          <TouchableOpacity 
            onPress={() => selectedTemplate && handleUseTemplate(selectedTemplate)}
            style={styles.useButton}
          >
            <Text style={styles.useButtonText}>Utiliser</Text>
          </TouchableOpacity>
        </View>

        {selectedTemplate && (
          <ScrollView style={styles.previewContent}>
            <View style={styles.previewTemplateInfo}>
              <Text style={styles.previewTemplateName}>{selectedTemplate.name}</Text>
              <Text style={styles.previewTemplateType}>{selectedTemplate.type.toUpperCase()}</Text>
              <Text style={styles.previewTemplateDescription}>{selectedTemplate.description}</Text>
            </View>

            <View style={styles.previewLayoutSection}>
              <Text style={styles.sectionTitle}>Layout ({selectedTemplate.layout.length} cases)</Text>
              <View style={[styles.fullLayoutPreview, { aspectRatio: selectedTemplate.aspectRatio }]}>
                {selectedTemplate.layout.map((panel) => (
                  <View
                    key={panel.id}
                    style={[
                      styles.fullPanelPreview,
                      {
                        left: `${panel.x}%`,
                        top: `${panel.y}%`,
                        width: `${panel.width}%`,
                        height: `${panel.height}%`,
                        borderRadius: panel.shape === 'circle' ? 999 : (panel.borderRadius || 8),
                        backgroundColor: selectedTemplate.color + '20',
                        borderColor: selectedTemplate.color,
                      }
                    ]}
                  >
                    <Text style={[styles.panelNumber, { color: selectedTemplate.color }]}>
                      {panel.id}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.previewTagsSection}>
              <Text style={styles.sectionTitle}>Tags</Text>
              <View style={styles.previewTags}>
                {selectedTemplate.tags.map((tag, index) => (
                  <View key={index} style={[styles.previewTag, { backgroundColor: selectedTemplate.color + '20' }]}>
                    <Text style={[styles.previewTagText, { color: selectedTemplate.color }]}>{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          </ScrollView>
        )}
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#181818" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFA94D" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Templates Manga</Text>
        <TouchableOpacity onPress={() => router.push('/write/manga-editor/simple?projectId=new')}>
          <Ionicons name="add-circle-outline" size={24} color="#FFA94D" />
        </TouchableOpacity>
      </View>

      {/* Categories */}
      <View style={styles.categoriesSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
          {categories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryButton,
                { borderColor: category.color },
                selectedCategory === category.id && { backgroundColor: category.color + '20' }
              ]}
              onPress={() => setSelectedCategory(category.id)}
            >
              <Ionicons name={category.icon as any} size={20} color={category.color} />
              <Text style={[styles.categoryText, { color: category.color }]}>{category.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Templates Grid */}
      <FlatList
        data={filteredTemplates}
        renderItem={({ item }) => renderTemplateCard(item)}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.templatesGrid}
        showsVerticalScrollIndicator={false}
      />

      {/* Preview Modal */}
      {renderPreview()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#181818',
  },
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
  categoriesSection: {
    paddingBottom: 16,
  },
  categoriesScroll: {
    paddingHorizontal: 20,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 12,
    gap: 8,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
  },
  templatesGrid: {
    paddingHorizontal: 16,
  },
  row: {
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  templateCard: {
    width: (width - 48) / 2,
    marginBottom: 16,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  templateGradient: {
    padding: 12,
  },
  templateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  typeTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typeTagText: {
    color: '#181818',
    fontSize: 10,
    fontWeight: 'bold',
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  difficultyText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  templatePreview: {
    alignItems: 'center',
    marginBottom: 12,
  },
  layoutPreview: {
    position: 'relative',
    width: '100%',
    maxWidth: 120,
    backgroundColor: '#23232a',
    borderRadius: 8,
  },
  panelPreview: {
    position: 'absolute',
    borderWidth: 1,
  },
  templateInfo: {
    gap: 6,
  },
  templateName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  templateDescription: {
    color: '#888',
    fontSize: 12,
    lineHeight: 16,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  tag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '500',
  },
  
  // Preview Modal
  previewContainer: {
    flex: 1,
    backgroundColor: '#181818',
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  previewTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  useButton: {
    backgroundColor: '#FFA94D',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  useButtonText: {
    color: '#181818',
    fontSize: 14,
    fontWeight: 'bold',
  },
  previewContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  previewTemplateInfo: {
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  previewTemplateName: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  previewTemplateType: {
    color: '#FFA94D',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  previewTemplateDescription: {
    color: '#888',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  previewLayoutSection: {
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  fullLayoutPreview: {
    position: 'relative',
    width: '100%',
    maxWidth: 300,
    alignSelf: 'center',
    backgroundColor: '#23232a',
    borderRadius: 12,
  },
  fullPanelPreview: {
    position: 'absolute',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  panelNumber: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  previewTagsSection: {
    paddingVertical: 20,
  },
  previewTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  previewTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  previewTagText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default MangaTemplatesGallery;