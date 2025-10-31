// import React, { useState } from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   TouchableOpacity,
//   ScrollView,
//   Image,
//   Alert,
//   Modal,
// } from 'react-native';
// import * as ImagePicker from 'expo-image-picker';
// import * as DocumentPicker from 'expo-document-picker';
// import { TEMPLATES } from '../write';

// interface TemplateManagerProps {
//   visible: boolean;
//   onClose: () => void;
//   onSelectTemplate: (template: any) => void;
//   recentTemplates?: any[];
//   onUpdateRecentTemplates?: (templates: any[]) => void;
// }

// const TemplateManager: React.FC<TemplateManagerProps> = ({
//   visible,
//   onClose,
//   onSelectTemplate,
//   recentTemplates = [],
//   onUpdateRecentTemplates,
// }) => {
//   const [customTemplates, setCustomTemplates] = useState<any[]>([]);

//   const importTemplateImage = async () => {
//     try {
//       // Demander la permission d'accès à la galerie
//       const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
//       if (!permission.granted) {
//         Alert.alert('Permission requise', 'Autorisez l\'accès à la galerie pour importer un template.');
//         return;
//       }

//       // Lancer le sélecteur d'images
//       const result = await ImagePicker.launchImageLibraryAsync({
//         mediaTypes: ImagePicker.MediaTypeOptions.Images,
//         allowsEditing: true,
//         aspect: [3, 4], // Format A4 approximatif
//         quality: 0.8,
//       });

//       if (!result.canceled && result.assets && result.assets[0]) {
//         const newTemplate = {
//           id: `custom-${Date.now()}`,
//           title: 'Template Personnalisé',
//           subtitle: 'Importé depuis la galerie',
//           starter: '',
//           color: '#FFFFFF',
//           backgroundImage: result.assets[0].uri,
//           isCustom: true,
//         };

//         setCustomTemplates(prev => [...prev, newTemplate]);
        
//         // Ajouter aux templates récents
//         if (onUpdateRecentTemplates) {
//           const updatedRecents = [newTemplate, ...recentTemplates.filter(t => t.id !== newTemplate.id)].slice(0, 6);
//           onUpdateRecentTemplates(updatedRecents);
//         }
        
//         Alert.alert('Succès', 'Template importé avec succès !');
//       }
//     } catch (error: any) {
//       console.warn('Erreur lors de l\'import du template:', error);
//       Alert.alert('Erreur', 'Impossible d\'importer le template');
//     }
//   };

//   const importTemplatePDF = async () => {
//     try {
//       const result = await DocumentPicker.getDocumentAsync({
//         type: 'application/pdf',
//         copyToCacheDirectory: true,
//       });

//       if (!result.canceled && result.assets && result.assets[0]) {
//         const newTemplate = {
//           id: `custom-pdf-${Date.now()}`,
//           title: 'Template PDF',
//           subtitle: 'Importé depuis un PDF',
//           starter: '',
//           color: '#FFFFFF',
//           backgroundImage: result.assets[0].uri,
//           isCustom: true,
//           isPDF: true,
//         };

//         setCustomTemplates(prev => [...prev, newTemplate]);
        
//         // Ajouter aux templates récents
//         if (onUpdateRecentTemplates) {
//           const updatedRecents = [newTemplate, ...recentTemplates.filter(t => t.id !== newTemplate.id)].slice(0, 6);
//           onUpdateRecentTemplates(updatedRecents);
//         }
        
//         Alert.alert('Succès', 'Template PDF importé avec succès !');
//       }
//     } catch (error: any) {
//       console.warn('Erreur lors de l\'import du PDF:', error);
//       Alert.alert('Erreur', 'Impossible d\'importer le template PDF');
//     }
//   };

//   const removeCustomTemplate = (templateId: string) => {
//     Alert.alert(
//       'Supprimer le template',
//       'Êtes-vous sûr de vouloir supprimer ce template personnalisé ?',
//       [
//         { text: 'Annuler', style: 'cancel' },
//         {
//           text: 'Supprimer',
//           style: 'destructive',
//           onPress: () => {
//             setCustomTemplates(prev => prev.filter(t => t.id !== templateId));
//           }
//         }
//       ]
//     );
//   };

//   const renderTemplateCard = (template: any, isCustom = false) => (
//     <TouchableOpacity
//       key={template.id}
//       style={styles.templateCard}
//       onPress={() => {
//         onSelectTemplate(template);
        
//         // Ajouter aux templates récents si ce n'est pas déjà un template récent affiché
//         if (onUpdateRecentTemplates && !isCustom) {
//           const updatedRecents = [template, ...recentTemplates.filter(t => t.id !== template.id)].slice(0, 6);
//           onUpdateRecentTemplates(updatedRecents);
//         }
        
//         onClose();
//       }}
//     >
//       <View style={[styles.templatePreview, { backgroundColor: template.color }]}>
//         {template.backgroundImage ? (
//           <Image 
//             source={{ uri: template.backgroundImage }} 
//             style={styles.templateBackgroundImage}
//             resizeMode="cover"
//           />
//         ) : (
//           <>
//             <Text style={styles.templateTitle}>{template.title}</Text>
//             {template.starter ? (
//               <Text style={styles.templateStarter} numberOfLines={3}>
//                 {template.starter}
//               </Text>
//             ) : null}
//           </>
//         )}
//       </View>
      
//       <View style={styles.templateInfo}>
//         <Text style={styles.templateLabel}>{template.title}</Text>
//         <Text style={styles.templateSubtitle}>{template.subtitle}</Text>
        
//         {isCustom && (
//           <TouchableOpacity
//             style={styles.removeButton}
//             onPress={() => removeCustomTemplate(template.id)}
//           >
//             <Text style={styles.removeButtonText}>🗑️</Text>
//           </TouchableOpacity>
//         )}
//       </View>
//     </TouchableOpacity>
//   );

//   return (
//     <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
//       <View style={styles.container}>
//         <View style={styles.header}>
//           <Text style={styles.headerTitle}>Choisir un Template</Text>
//           <TouchableOpacity onPress={onClose}>
//             <Text style={styles.closeButton}>✕</Text>
//           </TouchableOpacity>
//         </View>

//         <ScrollView contentContainerStyle={styles.content}>
//           {/* Import Buttons */}
//           <View style={styles.importSection}>
//             <Text style={styles.sectionTitle}>📥 Importer un Template</Text>
//             <View style={styles.importButtons}>
//               <TouchableOpacity style={styles.importButton} onPress={importTemplateImage}>
//                 <Text style={styles.importButtonIcon}>🖼️</Text>
//                 <Text style={styles.importButtonText}>Image</Text>
//               </TouchableOpacity>
              
//               <TouchableOpacity style={styles.importButton} onPress={importTemplatePDF}>
//                 <Text style={styles.importButtonIcon}>📄</Text>
//                 <Text style={styles.importButtonText}>PDF</Text>
//               </TouchableOpacity>
//             </View>
//           </View>

//           {/* Recent Templates */}
//           {recentTemplates.length > 0 && (
//             <View style={styles.section}>
//               <Text style={styles.sectionTitle}>🕒 Récemment utilisés</Text>
//               <View style={styles.templatesGrid}>
//                 {recentTemplates.map(template => renderTemplateCard(template))}
//               </View>
//             </View>
//           )}

//           {/* Custom Templates */}
//           {customTemplates.length > 0 && (
//             <View style={styles.section}>
//               <Text style={styles.sectionTitle}>🎨 Mes Templates</Text>
//               <View style={styles.templatesGrid}>
//                 {customTemplates.map(template => renderTemplateCard(template, true))}
//               </View>
//             </View>
//           )}

//           {/* Predefined Templates */}
//           <View style={styles.section}>
//             <Text style={styles.sectionTitle}>📋 Templates Prédéfinis</Text>
//             <View style={styles.templatesGrid}>
//               {TEMPLATES.map(template => renderTemplateCard(template))}
//             </View>
//           </View>
//         </ScrollView>
//       </View>
//     </Modal>
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#181818',
//   },
//   header: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     paddingHorizontal: 20,
//     paddingTop: 60,
//     paddingBottom: 20,
//     backgroundColor: '#232323',
//   },
//   headerTitle: {
//     color: '#FFA94D',
//     fontSize: 20,
//     fontWeight: 'bold',
//   },
//   closeButton: {
//     color: '#FFA94D',
//     fontSize: 24,
//     fontWeight: 'bold',
//   },
//   content: {
//     padding: 20,
//   },
//   importSection: {
//     marginBottom: 30,
//   },
//   sectionTitle: {
//     color: '#FFA94D',
//     fontSize: 18,
//     fontWeight: 'bold',
//     marginBottom: 16,
//   },
//   importButtons: {
//     flexDirection: 'row',
//     gap: 16,
//   },
//   importButton: {
//     flex: 1,
//     backgroundColor: '#232323',
//     borderRadius: 12,
//     padding: 20,
//     alignItems: 'center',
//     borderWidth: 2,
//     borderColor: '#FFA94D',
//     borderStyle: 'dashed',
//   },
//   importButtonIcon: {
//     fontSize: 32,
//     marginBottom: 8,
//   },
//   importButtonText: {
//     color: '#FFA94D',
//     fontWeight: '600',
//   },
//   section: {
//     marginBottom: 30,
//   },
//   templatesGrid: {
//     flexDirection: 'row',
//     flexWrap: 'wrap',
//     gap: 16,
//   },
//   templateCard: {
//     width: '45%',
//     backgroundColor: '#232323',
//     borderRadius: 12,
//     overflow: 'hidden',
//   },
//   templatePreview: {
//     height: 120,
//     padding: 12,
//     justifyContent: 'center',
//     position: 'relative',
//   },
//   templateBackgroundImage: {
//     position: 'absolute',
//     top: 0,
//     left: 0,
//     right: 0,
//     bottom: 0,
//     width: '100%',
//     height: '100%',
//   },
//   templateTitle: {
//     fontSize: 14,
//     fontWeight: 'bold',
//     color: '#333',
//     marginBottom: 4,
//   },
//   templateStarter: {
//     fontSize: 10,
//     color: '#666',
//     lineHeight: 14,
//   },
//   templateInfo: {
//     padding: 12,
//     position: 'relative',
//   },
//   templateLabel: {
//     color: '#FFA94D',
//     fontWeight: '600',
//     marginBottom: 4,
//   },
//   templateSubtitle: {
//     color: '#ccc',
//     fontSize: 12,
//   },
//   removeButton: {
//     position: 'absolute',
//     top: 8,
//     right: 8,
//     padding: 4,
//   },
//   removeButtonText: {
//     fontSize: 16,
//   },
// });

// export default TemplateManager;