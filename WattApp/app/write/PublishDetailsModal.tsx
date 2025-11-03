import React, { useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, Image, StyleSheet, Pressable, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { POPULAR_CATEGORIES } from '../../constants/bookCategories';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSubmit: (cover: string, title: string, synopsis: string, price: string, tags: string[], termsAcceptance: TermsAcceptance) => void;
}

interface TermsAcceptance {
  accepted: boolean;
  acceptedAt: Date;
  termsVersion: string;
  userAgent: string;
}

export default function PublishDetailsModal({ visible, onClose, onSubmit }: Props) {
  const [cover, setCover] = useState<string>('');
  const [title, setTitle] = useState('');
  const [synopsis, setSynopsis] = useState('');
  const [price, setPrice] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isFree, setIsFree] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const pickImage = async () => {
    setLoading(true);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });
    setLoading(false);
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setCover(result.assets[0].uri);
    }
  };

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim();
    if (trimmedTag && !tags.includes(trimmedTag) && tags.length < 5) {
      setTags([...tags, trimmedTag]);
    }
    setTagInput('');
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const showFeesInfo = () => {
    Alert.alert(
      'Conditions générales',
      'En publiant votre livre, vous acceptez :\n\n• Commission WattApp : 10% sur chaque vente\n• Respect des droits d\'auteur\n• Contenu conforme aux règles de la plateforme\n\nPour plus de détails, consultez nos CGU complètes.',
      [{ text: 'J\'ai compris', style: 'default' }]
    );
  };

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.overlayDark}>
        <View style={styles.containerDark}>
          <TouchableOpacity style={styles.closeBtnDark} onPress={onClose} hitSlop={16}>
            <Text style={styles.closeIconDark}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.headerDark}>Publier un livre</Text>
          
          <ScrollView style={{ maxHeight: 450 }} showsVerticalScrollIndicator={false}>
            <Pressable style={styles.coverDark} onPress={pickImage} android_ripple={{color:'#222'}}>
              {cover ? (
                <Image source={{ uri: cover }} style={styles.coverImageDark} />
              ) : (
                <Text style={styles.coverPlaceholderDark}>Ajouter une couverture</Text>
              )}
            </Pressable>
            
            <TextInput
              style={styles.inputDark}
              placeholder="Titre du livre"
              placeholderTextColor="#888"
              value={title}
              onChangeText={setTitle}
            />
            
            <TextInput
              style={[styles.inputDark, { height: 70 }]}
              placeholder="Synopsis *"
              placeholderTextColor="#888"
              value={synopsis}
              onChangeText={setSynopsis}
              multiline
            />
            
            {/* Section Tags */}
            <View style={styles.tagsSection}>
              <Text style={styles.tagsSectionTitle}>Tags ({tags.length}/5)</Text>
              
              {/* Tags sélectionnés */}
              {tags.length > 0 && (
                <View style={styles.selectedTagsContainer}>
                  {tags.map((tag, idx) => (
                    <View key={idx} style={styles.selectedTag}>
                      <Text style={styles.selectedTagText}>{tag}</Text>
                      <TouchableOpacity onPress={() => removeTag(tag)} style={styles.removeTagButton}>
                        <Ionicons name="close-circle" size={16} color="#FFA94D" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
              
              {/* Input pour nouveau tag */}
              {tags.length < 5 && (
                <View style={styles.tagInputContainer}>
                  <TextInput
                    style={styles.tagInput}
                    placeholder="Ajouter un tag..."
                    placeholderTextColor="#888"
                    value={tagInput}
                    onChangeText={setTagInput}
                    onSubmitEditing={() => addTag(tagInput)}
                    returnKeyType="done"
                    maxLength={25}
                  />
                  <TouchableOpacity
                    onPress={() => addTag(tagInput)}
                    style={[styles.addTagButton, { opacity: tagInput.trim() ? 1 : 0.5 }]}
                    disabled={!tagInput.trim()}
                  >
                    <Text style={styles.addTagButtonText}>+</Text>
                  </TouchableOpacity>
                </View>
              )}
              
              {/* Catégories suggérées */}
              {tags.length < 5 && (
                <View style={styles.suggestedTagsContainer}>
                  <Text style={styles.suggestedTagsTitle}>Catégories populaires :</Text>
                  <View style={styles.suggestedTagsGrid}>
                    {POPULAR_CATEGORIES
                      .filter(category => !tags.includes(category))
                      .slice(0, 12)
                      .map((category) => (
                        <TouchableOpacity
                          key={category}
                          onPress={() => addTag(category)}
                          style={styles.suggestedTag}
                        >
                          <Text style={styles.suggestedTagText}>{category}</Text>
                        </TouchableOpacity>
                      ))}
                  </View>
                </View>
              )}
            </View>
            
            {/* Section Prix */}
            <View style={styles.priceFintechRow}>
              <View style={styles.priceFintechInputWrapper}>
                <TextInput
                  style={[styles.priceFintechInput, isFree && styles.priceFintechInputDisabled]}
                  placeholder="2.99"
                  placeholderTextColor="#888"
                  value={isFree ? '0' : price}
                  onChangeText={t => { 
                    const numValue = parseFloat(t.replace(',', '.'));
                    if (!isNaN(numValue) && numValue > 40) {
                      setPrice('40');
                    } else {
                      setPrice(t);
                    }
                    setIsFree(false); 
                  }}
                  keyboardType="decimal-pad"
                  maxLength={5}
                  textAlign="center"
                  editable={!isFree}
                />
                <View style={styles.priceFintechEuroBadge}>
                  <Text style={styles.priceFintechEuro}>€</Text>
                </View>
                <TouchableOpacity
                  style={[styles.freeBtn, isFree && styles.freeBtnActive]}
                  onPress={() => { setIsFree(true); setPrice('0'); }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.freeBtnText, isFree && styles.freeBtnTextActive]}>Gratuit</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.priceFintechUnderline} />
              <Text style={styles.priceFintechHelper}>{isFree ? 'Ce livre sera gratuit' : 'Entre 0,50€ et 40,00€'}</Text>
            </View>
            
            {/* Conditions générales */}
            <TouchableOpacity 
              style={styles.termsContainer} 
              onPress={() => setAcceptedTerms(!acceptedTerms)}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, acceptedTerms && styles.checkboxChecked]}>
                {acceptedTerms && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.termsText}>
                En publiant, j'accepte les conditions générales
              </Text>
              <TouchableOpacity style={styles.termsInfoIcon} onPress={showFeesInfo}>
                <Text style={styles.infoIconText}>ⓘ</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </ScrollView>
          
          {/* Boutons d'action */}
          <View style={styles.rowDark}>
            <TouchableOpacity style={styles.cancelBtnDark} onPress={onClose}>
              <Text style={styles.cancelTextDark}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.submitBtnDark}
              onPress={() => {
                if (!acceptedTerms) {
                  alert('Vous devez accepter les conditions générales pour publier');
                  return;
                }
                
                if (!synopsis.trim()) {
                  alert('Le synopsis est obligatoire pour publier votre livre');
                  return;
                }
                
                const priceNum = parseFloat(price.replace(',', '.'));
                if (!isFree && (isNaN(priceNum) || priceNum < 0.5)) {
                  alert('Le prix doit être d\'au moins 0,50€');
                  return;
                }
                
                if (!tags.length) {
                  alert('Veuillez ajouter au moins un tag');
                  return;
                }
                
                const termsAcceptance: TermsAcceptance = {
                  accepted: true,
                  acceptedAt: new Date(),
                  termsVersion: "1.0",
                  userAgent: navigator.userAgent || 'Mobile App'
                };
                
                onSubmit(cover, title, synopsis, price, tags, termsAcceptance);
              }}
              disabled={loading || !title.trim()}
            >
              <Text style={styles.submitTextDark}>Valider</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlayDark: {
    flex: 1,
    backgroundColor: 'rgba(17,17,17,0.96)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  containerDark: {
    width: '92%',
    backgroundColor: '#181818',
    borderRadius: 20,
    padding: 22,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 8,
    position: 'relative',
    maxHeight: '90%',
  },
  closeBtnDark: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 10,
    backgroundColor: '#232323',
    borderRadius: 16,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIconDark: {
    color: '#4FC3F7',
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerDark: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 18,
    marginTop: 6,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  coverDark: {
    width: 120,
    height: 160,
    backgroundColor: '#222',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#4FC3F7',
  },
  coverImageDark: {
    width: 120,
    height: 160,
    resizeMode: 'cover',
    borderRadius: 12,
  },
  coverPlaceholderDark: {
    color: '#4FC3F7',
    fontSize: 14,
    fontStyle: 'italic',
  },
  inputDark: {
    width: '100%',
    backgroundColor: '#232323',
    color: '#fff',
    borderRadius: 12,
    padding: 13,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 12,
  },
  
  // Nouveaux styles pour les tags
  tagsSection: {
    width: '100%',
    marginBottom: 16,
  },
  tagsSectionTitle: {
    color: '#FFA94D',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  selectedTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  selectedTag: {
    backgroundColor: '#18191c',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginRight: 6,
    marginBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFA94D',
  },
  selectedTagText: {
    color: '#FFA94D',
    fontSize: 12,
    fontWeight: '500',
  },
  removeTagButton: {
    marginLeft: 6,
  },
  tagInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  tagInput: {
    flex: 1,
    backgroundColor: '#232323',
    color: '#fff',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#333',
    marginRight: 8,
  },
  addTagButton: {
    backgroundColor: '#FFA94D',
    borderRadius: 8,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTagButtonText: {
    color: '#181818',
    fontSize: 18,
    fontWeight: 'bold',
  },
  suggestedTagsContainer: {
    marginBottom: 8,
  },
  suggestedTagsTitle: {
    color: '#888',
    fontSize: 13,
    marginBottom: 8,
  },
  suggestedTagsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  suggestedTag: {
    backgroundColor: '#333',
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 6,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#555',
  },
  suggestedTagText: {
    color: '#FFA94D',
    fontSize: 11,
    fontWeight: '500',
  },
  
  // Styles existants pour le prix
  rowDark: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 10,
  },
  priceFintechRow: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  priceFintechInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#232323',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#4FC3F7',
    paddingHorizontal: 12,
    width: '100%',
    height: 46,
  },
  priceFintechInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    padding: 0,
  },
  priceFintechInputDisabled: {
    opacity: 0.6,
  },
  priceFintechEuroBadge: {
    backgroundColor: '#4FC3F7',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 8,
  },
  priceFintechEuro: {
    color: '#181818',
    fontSize: 12,
    fontWeight: '700',
  },
  freeBtn: {
    backgroundColor: '#333',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  freeBtnActive: {
    backgroundColor: '#FFA94D',
  },
  freeBtnText: {
    color: '#888',
    fontSize: 12,
    fontWeight: '600',
  },
  freeBtnTextActive: {
    color: '#181818',
  },
  priceFintechUnderline: {
    height: 1,
    backgroundColor: '#333',
    width: '60%',
    marginTop: 8,
    marginBottom: 4,
  },
  priceFintechHelper: {
    color: '#888',
    fontSize: 11,
    fontStyle: 'italic',
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 12,
    marginBottom: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#4FC3F7',
    borderRadius: 4,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#4FC3F7',
  },
  checkmark: {
    color: '#181818',
    fontSize: 12,
    fontWeight: 'bold',
  },
  termsText: {
    flex: 1,
    color: '#ccc',
    fontSize: 12,
    lineHeight: 16,
  },
  termsInfoIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#4FC3F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  infoIconText: {
    color: '#181818',
    fontSize: 12,
    fontWeight: 'bold',
  },
  cancelBtnDark: {
    backgroundColor: '#333',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginRight: 8,
    flex: 1,
    alignItems: 'center',
  },
  cancelTextDark: {
    color: '#ccc',
    fontSize: 16,
    fontWeight: '600',
  },
  submitBtnDark: {
    backgroundColor: '#FFA94D',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginLeft: 8,
    flex: 1,
    alignItems: 'center',
  },
  submitTextDark: {
    color: '#181818',
    fontSize: 16,
    fontWeight: '600',
  },
});