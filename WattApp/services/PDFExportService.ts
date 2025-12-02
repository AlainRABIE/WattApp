import { Alert } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { getAuth } from 'firebase/auth';
import app, { db } from '../constants/firebaseConfig';
import { doc, getDoc, updateDoc, increment } from 'firebase/firestore';

export interface PDFExportOptions {
  bookId: string;
  bookTitle: string;
  bookContent: string;
  author?: string;
  coverImage?: string;
  includeImages?: boolean;
}

export interface ExportQuota {
  used: number;
  limit: number;
  isPremium: boolean;
  canExport: boolean;
}

export class PDFExportService {
  // Limites d'export
  private static readonly FREE_EXPORT_LIMIT = 2; // 2 exports par mois pour utilisateurs gratuits
  private static readonly PREMIUM_EXPORT_LIMIT = -1; // Illimité pour Premium
  
  /**
   * Vérifier si l'utilisateur peut exporter un PDF
   */
  static async checkExportQuota(userId: string): Promise<ExportQuota> {
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        return {
          used: 0,
          limit: this.FREE_EXPORT_LIMIT,
          isPremium: false,
          canExport: true,
        };
      }
      
      const userData = userSnap.data();
      const isPremium = userData.isPremium || false;
      
      // Premium = illimité
      if (isPremium) {
        return {
          used: userData.pdfExportsThisMonth || 0,
          limit: this.PREMIUM_EXPORT_LIMIT,
          isPremium: true,
          canExport: true,
        };
      }
      
      // Utilisateur gratuit : vérifier la limite
      const currentMonth = new Date().toISOString().slice(0, 7); // "2025-12"
      const lastResetMonth = userData.pdfExportLastReset || '';
      
      let exportsThisMonth = userData.pdfExportsThisMonth || 0;
      
      // Réinitialiser le compteur si c'est un nouveau mois
      if (lastResetMonth !== currentMonth) {
        exportsThisMonth = 0;
        await updateDoc(userRef, {
          pdfExportsThisMonth: 0,
          pdfExportLastReset: currentMonth,
        });
      }
      
      const canExport = exportsThisMonth < this.FREE_EXPORT_LIMIT;
      
      return {
        used: exportsThisMonth,
        limit: this.FREE_EXPORT_LIMIT,
        isPremium: false,
        canExport,
      };
    } catch (error) {
      console.error('Erreur vérification quota export:', error);
      // En cas d'erreur, on autorise par défaut
      return {
        used: 0,
        limit: this.FREE_EXPORT_LIMIT,
        isPremium: false,
        canExport: true,
      };
    }
  }
  
  /**
   * Incrémenter le compteur d'exports
   */
  private static async incrementExportCount(userId: string): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      const currentMonth = new Date().toISOString().slice(0, 7);
      
      await updateDoc(userRef, {
        pdfExportsThisMonth: increment(1),
        pdfExportLastReset: currentMonth,
        lastPdfExportAt: new Date(),
      });
    } catch (error) {
      console.error('Erreur incrémentation export:', error);
    }
  }
  
  /**
   * Exporter un livre en PDF
   */
  static async exportBookToPDF(options: PDFExportOptions): Promise<void> {
    const auth = getAuth(app);
    const user = auth.currentUser;
    
    if (!user) {
      Alert.alert('Erreur', 'Vous devez être connecté pour exporter un livre');
      return;
    }
    
    try {
      // Vérifier le quota
      const quota = await this.checkExportQuota(user.uid);
      
      if (!quota.canExport) {
        this.showQuotaExceededAlert(quota);
        return;
      }
      
      // Afficher confirmation
      const shouldProceed = await this.showExportConfirmation(quota);
      if (!shouldProceed) return;
      
      // Créer le PDF
      await this.generatePDF(options);
      
      // Incrémenter le compteur
      await this.incrementExportCount(user.uid);
      
      // Message de succès avec quota restant
      this.showSuccessMessage(quota);
      
    } catch (error) {
      console.error('Erreur export PDF:', error);
      Alert.alert('Erreur', 'Impossible d\'exporter le livre en PDF');
    }
  }
  
  /**
   * Générer le PDF (version simple avec HTML)
   */
  private static async generatePDF(options: PDFExportOptions): Promise<void> {
    const {
      bookTitle,
      bookContent,
      author = 'Auteur inconnu',
      includeImages = true,
    } = options;
    
    // HTML pour le PDF
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body {
              font-family: 'Georgia', serif;
              line-height: 1.6;
              padding: 40px;
              max-width: 800px;
              margin: 0 auto;
            }
            h1 {
              text-align: center;
              margin-bottom: 10px;
              font-size: 28px;
              color: #1a1a1a;
            }
            .author {
              text-align: center;
              margin-bottom: 40px;
              font-style: italic;
              color: #666;
            }
            .content {
              text-align: justify;
              white-space: pre-wrap;
              font-size: 14px;
              color: #333;
            }
            .footer {
              margin-top: 60px;
              text-align: center;
              font-size: 12px;
              color: #999;
              border-top: 1px solid #ddd;
              padding-top: 20px;
            }
          </style>
        </head>
        <body>
          <h1>${bookTitle}</h1>
          <p class="author">par ${author}</p>
          <div class="content">${bookContent}</div>
          <div class="footer">
            Exporté depuis WattApp - ${new Date().toLocaleDateString('fr-FR')}
          </div>
        </body>
      </html>
    `;
    
    // Pour React Native, on utilise expo-print
    const { printToFileAsync } = await import('expo-print');
    
    const { uri } = await printToFileAsync({
      html: htmlContent,
      base64: false,
    });
    
    // Partager le PDF
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Exporter ${bookTitle}`,
        UTI: 'com.adobe.pdf',
      });
    } else {
      Alert.alert('Succès', `PDF généré : ${uri}`);
    }
  }
  
  /**
   * Afficher l'alerte de confirmation avec quota
   */
  private static showExportConfirmation(quota: ExportQuota): Promise<boolean> {
    return new Promise((resolve) => {
      const remaining = quota.isPremium 
        ? 'illimité' 
        : `${quota.limit - quota.used} export${quota.limit - quota.used > 1 ? 's' : ''}`;
      
      Alert.alert(
        '📄 Export PDF',
        quota.isPremium
          ? `Vous allez exporter ce livre en PDF.\n\n✨ Membre Premium : Exports illimités`
          : `Vous allez exporter ce livre en PDF.\n\n📊 Quota ce mois : ${quota.used}/${quota.limit}\n✅ Il vous reste ${remaining} restant${quota.limit - quota.used > 1 ? 's' : ''}`,
        [
          {
            text: 'Annuler',
            style: 'cancel',
            onPress: () => resolve(false),
          },
          {
            text: 'Exporter',
            onPress: () => resolve(true),
          },
        ]
      );
    });
  }
  
  /**
   * Afficher l'alerte de quota dépassé
   */
  private static showQuotaExceededAlert(quota: ExportQuota): void {
    Alert.alert(
      '❌ Limite d\'export atteinte',
      `Vous avez atteint votre limite de ${quota.limit} exports PDF ce mois.\n\n` +
      `💎 Passez à Premium pour des exports illimités !\n\n` +
      `Avantages Premium :\n` +
      `• Exports PDF illimités\n` +
      `• Téléchargements illimités\n` +
      `• Accès prioritaire aux nouvelles fonctionnalités\n` +
      `• Pas de publicité`,
      [
        {
          text: 'Plus tard',
          style: 'cancel',
        },
        {
          text: 'Devenir Premium',
          onPress: () => {
            // Navigation vers la page premium
            const router = require('expo-router').useRouter;
            router?.push('/wallet');
          },
        },
      ]
    );
  }
  
  /**
   * Afficher le message de succès
   */
  private static showSuccessMessage(quota: ExportQuota): void {
    if (quota.isPremium) {
      Alert.alert('✅ Export réussi', 'Votre livre a été exporté en PDF !');
    } else {
      const remaining = quota.limit - quota.used - 1;
      Alert.alert(
        '✅ Export réussi',
        `Votre livre a été exporté en PDF !\n\n` +
        `📊 Il vous reste ${remaining} export${remaining > 1 ? 's' : ''} ce mois.`
      );
    }
  }
  
  /**
   * Afficher le quota actuel de l'utilisateur
   */
  static async showQuotaInfo(userId: string): Promise<void> {
    const quota = await this.checkExportQuota(userId);
    
    if (quota.isPremium) {
      Alert.alert(
        '✨ Membre Premium',
        `Exports PDF : Illimités\n` +
        `Exports ce mois : ${quota.used}\n\n` +
        `Profitez de vos exports sans limite !`
      );
    } else {
      const remaining = quota.limit - quota.used;
      Alert.alert(
        '📊 Quota d\'export',
        `Exports ce mois : ${quota.used}/${quota.limit}\n` +
        `Exports restants : ${remaining}\n\n` +
        `💡 Astuce : Passez à Premium pour des exports illimités !`,
        [
          { text: 'OK', style: 'cancel' },
          { text: 'Devenir Premium', onPress: () => {} },
        ]
      );
    }
  }
}

export default PDFExportService;
