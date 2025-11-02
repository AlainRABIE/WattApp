import React, { useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, Image, StyleSheet, Pressable, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSubmit: (cover: string, title: string, synopsis: string, price: string, termsAcceptance: TermsAcceptance) => void;
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
            placeholder="Synopsis (optionnel)"
            placeholderTextColor="#888"
            value={synopsis}
            onChangeText={setSynopsis}
            multiline
          />
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
                const priceNum = parseFloat(price.replace(',', '.'));
                if (!isFree && (isNaN(priceNum) || priceNum < 0.5)) {
                  alert('Le prix doit être d\'au moins 0,50€');
                  return;
                }
                
                const termsAcceptance: TermsAcceptance = {
                  accepted: true,
                  acceptedAt: new Date(),
                  termsVersion: "1.0",
                  userAgent: navigator.userAgent || 'Mobile App'
                };
                
                onSubmit(cover, title, synopsis, price, termsAcceptance);
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
    justifyContent: 'center',
    backgroundColor: 'transparent',
    marginBottom: 2,
  },
  priceFintechInput: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
    backgroundColor: 'transparent',
    borderWidth: 0,
    width: 90,
    paddingVertical: 6,
    paddingHorizontal: 0,
    marginRight: 6,
    letterSpacing: 1,
  },
  priceFintechEuroBadge: {
    backgroundColor: '#4FC3F7',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
  },
  priceFintechEuro: {
    color: '#181818',
    fontWeight: '700',
    fontSize: 18,
  },
  priceFintechUnderline: {
    width: 100,
    height: 2,
    backgroundColor: '#4FC3F7',
    borderRadius: 1,
    marginTop: -2,
    marginBottom: 2,
  },
  priceFintechHelper: {
    color: '#888',
    fontSize: 12,
    marginTop: 2,
    textAlign: 'center',
  },
  cancelBtnDark: {
    flex: 1,
    backgroundColor: '#232323',
    borderRadius: 12,
    padding: 13,
    marginRight: 8,
    alignItems: 'center',
  },
  cancelTextDark: {
    color: '#4FC3F7',
    fontWeight: '600',
    fontSize: 15,
  },
  submitBtnDark: {
    flex: 1,
    backgroundColor: '#4FC3F7',
    borderRadius: 12,
    padding: 13,
    marginLeft: 8,
    alignItems: 'center',
  },
  submitTextDark: {
    color: '#181818',
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: 0.2,
  },
  freeBtn: {
    marginLeft: 10,
    backgroundColor: 'transparent',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#4FC3F7',
    paddingHorizontal: 12,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
  },
  freeBtnActive: {
    backgroundColor: '#4FC3F7',
    borderColor: '#4FC3F7',
  },
  freeBtnText: {
    color: '#4FC3F7',
    fontWeight: '700',
    fontSize: 15,
  },
  freeBtnTextActive: {
    color: '#181818',
  },
  priceFintechInputDisabled: {
    color: '#888',
  },
  infoIcon: {
    marginLeft: 8,
    backgroundColor: '#4FC3F7',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoIconText: {
    color: '#181818',
    fontSize: 14,
    fontWeight: 'bold',
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 16,
    paddingHorizontal: 8,
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
    backgroundColor: 'transparent',
  },
  checkboxChecked: {
    backgroundColor: '#4FC3F7',
  },
  checkmark: {
    color: '#181818',
    fontSize: 14,
    fontWeight: 'bold',
  },
  termsText: {
    color: '#fff',
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  termsInfoIcon: {
    marginLeft: 8,
    backgroundColor: '#4FC3F7',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});