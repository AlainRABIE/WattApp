# 📄 Guide d'Export PDF

## Vue d'ensemble

Le système d'export PDF permet aux utilisateurs de télécharger les livres en format PDF pour une lecture hors ligne. Ce système inclut un **quota mensuel** pour les utilisateurs gratuits et des exports **illimités** pour les membres Premium.

---

## 🎯 Fonctionnalités

### 1. **Quota d'Export**

#### Utilisateurs Gratuits
- ✅ **2 exports PDF par mois**
- 📊 Compteur réinitialisé automatiquement chaque mois
- 🔔 Alertes de quota restant après chaque export
- 💎 Suggestion d'upgrade Premium quand limite atteinte

#### Utilisateurs Premium
- ✨ **Exports illimités**
- 📈 Statistiques d'utilisation disponibles
- 🎁 Accès prioritaire aux nouvelles fonctionnalités d'export

### 2. **Format PDF**

Le PDF généré contient :
- 📚 Titre du livre
- ✍️ Nom de l'auteur
- 📖 Contenu complet (tous les chapitres)
- 📅 Date d'export
- 🎨 Formatage professionnel (police Georgia, marges optimisées)
- 🖼️ Option d'inclure les images (bientôt)

---

## 🛠️ Architecture Technique

### Service Principal : `PDFExportService.ts`

```typescript
// Vérifier le quota de l'utilisateur
await PDFExportService.checkExportQuota(userId);

// Exporter un livre
await PDFExportService.exportBookToPDF({
  bookId: 'book123',
  bookTitle: 'Mon Livre',
  bookContent: 'Contenu complet...',
  author: 'Auteur',
  coverImage: 'url',
  includeImages: true,
});

// Afficher les quotas
await PDFExportService.showQuotaInfo(userId);
```

### Stockage Firestore

#### Structure dans `users/{userId}` :

```javascript
{
  pdfExportsThisMonth: 2,          // Nombre d'exports ce mois
  pdfExportLastReset: "2025-12",   // Mois de dernière réinitialisation
  lastPdfExportAt: Timestamp,      // Date du dernier export
  isPremium: false                 // Statut Premium
}
```

---

## 📱 Interface Utilisateur

### 1. **Bouton d'Export sur Page Livre**

Le bouton d'export apparaît dans 3 contextes :

#### Pour les Auteurs
```tsx
<TouchableOpacity onPress={handleExportPDF}>
  <Ionicons name="download-outline" />
</TouchableOpacity>
```
- Toujours disponible
- Exporte leur propre livre

#### Pour les Acheteurs
```tsx
{hasPurchased && (
  <TouchableOpacity onPress={handleExportPDF}>
    <Ionicons name="download-outline" />
  </TouchableOpacity>
)}
```
- Visible après achat du livre
- Soumis au quota mensuel

#### Pour Livres Gratuits
```tsx
<TouchableOpacity onPress={handleExportPDF}>
  <Ionicons name="download-outline" />
</TouchableOpacity>
```
- Disponible pour tous
- Soumis au quota mensuel

### 2. **Section Quota dans Paramètres**

Affichage du quota actuel :

```tsx
<View>
  <Text>Quota d'exports</Text>
  <Text>
    {isPremium 
      ? `Illimité (${used} ce mois)`
      : `${used}/${limit} utilisés ce mois`
    }
  </Text>
</View>
```

---

## 🔄 Flux d'Export

### Étape 1 : Vérification du Quota

```typescript
const quota = await PDFExportService.checkExportQuota(userId);

if (!quota.canExport) {
  // Afficher alerte de limite atteinte
  // Proposer upgrade Premium
  return;
}
```

### Étape 2 : Confirmation Utilisateur

```typescript
Alert.alert(
  '📄 Export PDF',
  `Quota ce mois : ${quota.used}/${quota.limit}\n` +
  `Il vous reste ${remaining} export(s)`,
  [
    { text: 'Annuler' },
    { text: 'Exporter', onPress: () => generatePDF() }
  ]
);
```

### Étape 3 : Génération du PDF

```typescript
const { uri } = await printToFileAsync({
  html: htmlContent,
  base64: false,
});
```

### Étape 4 : Partage du PDF

```typescript
await Sharing.shareAsync(uri, {
  mimeType: 'application/pdf',
  dialogTitle: `Exporter ${bookTitle}`,
});
```

### Étape 5 : Incrémentation du Compteur

```typescript
await updateDoc(userRef, {
  pdfExportsThisMonth: increment(1),
  pdfExportLastReset: currentMonth,
  lastPdfExportAt: new Date(),
});
```

---

## 🎨 Alertes et Messages

### Message de Confirmation (Gratuit)

```
📄 Export PDF

Vous allez exporter ce livre en PDF.

📊 Quota ce mois : 1/2
✅ Il vous reste 1 export restant

[Annuler]  [Exporter]
```

### Message de Confirmation (Premium)

```
📄 Export PDF

Vous allez exporter ce livre en PDF.

✨ Membre Premium : Exports illimités

[Annuler]  [Exporter]
```

### Message de Limite Atteinte

```
❌ Limite d'export atteinte

Vous avez atteint votre limite de 2 exports PDF ce mois.

💎 Passez à Premium pour des exports illimités !

Avantages Premium :
• Exports PDF illimités
• Téléchargements illimités
• Accès prioritaire aux nouvelles fonctionnalités
• Pas de publicité

[Plus tard]  [Devenir Premium]
```

### Message de Succès (Gratuit)

```
✅ Export réussi

Votre livre a été exporté en PDF !

📊 Il vous reste 1 export ce mois.
```

### Message de Succès (Premium)

```
✅ Export réussi

Votre livre a été exporté en PDF !
```

---

## 🔒 Sécurité et Limitations

### Protections Implémentées

1. **Vérification côté client** :
   - Quota vérifié avant chaque export
   - État Premium validé depuis Firestore

2. **Réinitialisation automatique** :
   - Le compteur se réinitialise chaque nouveau mois
   - Format : "YYYY-MM" (ex: "2025-12")

3. **Gestion des erreurs** :
   ```typescript
   try {
     await exportBookToPDF(...);
   } catch (error) {
     Alert.alert('Erreur', 'Impossible d\'exporter le livre');
     // Pas d'incrémentation en cas d'échec
   }
   ```

### Limitations Connues

⚠️ **Important** : Le système actuel utilise une vérification **côté client uniquement**.

**Recommandations futures** :
- Implémenter vérification côté serveur (Firebase Functions)
- Ajouter logs d'exports dans Firestore
- Créer collection `exports` pour analytics
- Rate limiting serveur (éviter abus)

---

## 📊 Analytics et Tracking

### Données Collectées

Pour chaque utilisateur :
- Nombre d'exports ce mois
- Date du dernier export
- Mois de dernière réinitialisation

### Future Collection `exports` (Recommandé)

```javascript
exports/{exportId} {
  userId: "user123",
  bookId: "book456",
  bookTitle: "Mon Livre",
  exportedAt: Timestamp,
  fileSize: 1024000,  // bytes
  isPremium: false
}
```

Avantages :
- Historique complet des exports
- Analytics détaillées
- Détection d'abus
- Statistiques par livre

---

## 🚀 Déploiement

### Dépendances Requises

```bash
npm install expo-print expo-sharing --legacy-peer-deps
```

#### `expo-print`
- Génération de PDF depuis HTML
- API : `printToFileAsync()`

#### `expo-sharing`
- Partage de fichiers sur mobile
- API : `shareAsync()`

### Configuration Firestore

Aucune règle spéciale requise. Les champs sont ajoutés automatiquement dans `users/{userId}`.

**Structure minimale** :
```javascript
{
  pdfExportsThisMonth: 0,
  pdfExportLastReset: "2025-12",
  isPremium: false
}
```

---

## 🧪 Tests

### Test 1 : Export Gratuit (1er export)

1. Se connecter en tant qu'utilisateur gratuit
2. Ouvrir un livre
3. Cliquer sur l'icône de téléchargement
4. ✅ Voir : "Quota ce mois : 0/2 | Il vous reste 2 exports"
5. Confirmer l'export
6. ✅ PDF généré et partagé
7. ✅ Message : "Il vous reste 1 export ce mois"

### Test 2 : Limite Atteinte

1. Exporter 2 livres (utiliser le quota complet)
2. Tenter d'exporter un 3ème livre
3. ✅ Voir alerte : "Limite d'export atteinte"
4. ✅ Bouton "Devenir Premium" affiché

### Test 3 : Export Premium

1. Se connecter en tant qu'utilisateur Premium
2. Ouvrir un livre
3. Cliquer sur l'icône de téléchargement
4. ✅ Voir : "Membre Premium : Exports illimités"
5. Exporter plusieurs livres
6. ✅ Aucune limite appliquée

### Test 4 : Réinitialisation Mensuelle

1. Définir manuellement dans Firestore :
   ```javascript
   {
     pdfExportsThisMonth: 2,
     pdfExportLastReset: "2025-11"  // Mois précédent
   }
   ```
2. Tenter un export
3. ✅ Compteur réinitialisé à 0
4. ✅ Export autorisé

### Test 5 : Quota dans Paramètres

1. Aller dans Paramètres
2. Section "Exports PDF"
3. ✅ Voir quota actuel (ex: "1/2 utilisés ce mois")
4. Cliquer sur la ligne
5. ✅ Modal avec détails du quota

---

## 🔧 Maintenance

### Vérification Quota d'un Utilisateur

```javascript
// Dans Firebase Console
const user = await db.collection('users').doc('userId').get();
console.log(user.data().pdfExportsThisMonth);
console.log(user.data().pdfExportLastReset);
```

### Réinitialiser Quota Manuellement

```javascript
await updateDoc(doc(db, 'users', userId), {
  pdfExportsThisMonth: 0,
  pdfExportLastReset: new Date().toISOString().slice(0, 7)
});
```

### Donner Exports Bonus

```javascript
// Donner 5 exports supplémentaires
await updateDoc(doc(db, 'users', userId), {
  pdfExportsThisMonth: 0,  // Reset
  // ou
  pdfExportsBonus: 5       // Nouvelle feature à implémenter
});
```

---

## 🎁 Fonctionnalités Futures

### Court Terme
- [ ] Choix de la police (Georgia, Arial, Roboto)
- [ ] Taille de police personnalisable
- [ ] Inclusion des images de couverture
- [ ] Marges ajustables

### Moyen Terme
- [ ] Historique des exports dans l'app
- [ ] Watermark personnalisé pour auteurs
- [ ] Export en EPUB (en plus de PDF)
- [ ] Templates de mise en page (roman, manga, poésie)

### Long Terme
- [ ] Vérification serveur (Firebase Functions)
- [ ] Analytics avancées (livres les plus exportés)
- [ ] Export multi-livres (compilation)
- [ ] DRM pour livres payants
- [ ] Signature numérique de l'auteur

---

## 🆘 Dépannage

### Problème : "Erreur lors de l'export"

**Causes possibles** :
- Contenu du livre vide
- Caractères spéciaux dans le HTML
- Manque de permissions sur l'appareil

**Solution** :
```typescript
// Vérifier que le contenu existe
if (!bookContent || bookContent.trim() === '') {
  Alert.alert('Erreur', 'Le livre ne contient pas de contenu à exporter');
  return;
}
```

### Problème : Quota non mis à jour

**Causes possibles** :
- Erreur Firestore lors de l'incrémentation
- Utilisateur non connecté

**Solution** :
```typescript
// Vérifier l'authentification
const auth = getAuth();
if (!auth.currentUser) {
  Alert.alert('Erreur', 'Vous devez être connecté');
  return;
}
```

### Problème : PDF vide ou corrompu

**Causes possibles** :
- HTML mal formaté
- Caractères d'échappement

**Solution** :
```typescript
// Échapper le contenu HTML
const safeContent = bookContent
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');
```

---

## 📚 Ressources

### Documentation Expo
- [expo-print](https://docs.expo.dev/versions/latest/sdk/print/)
- [expo-sharing](https://docs.expo.dev/versions/latest/sdk/sharing/)

### Code Source
- `services/PDFExportService.ts` - Service principal
- `app/book/[bookId].tsx` - Intégration dans page livre
- `app/settings.tsx` - Affichage quota

### Guides Connexes
- `GUIDE_CONNEXION_PAIEMENTS.md` - Système de paiement
- `NOTIFICATIONS_GUIDE.md` - Système de notifications

---

## 💡 Conseils

### Pour les Utilisateurs
- Exportez vos livres préférés quand vous avez une connexion stable
- Utilisez le quota intelligemment (2/mois gratuit)
- Premium = exports illimités + téléchargements illimités

### Pour les Auteurs
- Testez l'export de vos livres avant publication
- Assurez-vous que le contenu s'affiche bien en PDF
- Les exports de vos propres livres ne comptent pas dans le quota lecteur

### Pour les Développeurs
- Toujours vérifier le quota AVANT de générer le PDF
- Ne jamais incrémenter en cas d'échec de génération
- Gérer les erreurs gracieusement (UX)

---

## ✅ Checklist Complète

### Implémentation
- [x] Service PDFExportService créé
- [x] Quota mensuel (2 exports gratuits)
- [x] Exports illimités Premium
- [x] Réinitialisation automatique mensuelle
- [x] Bouton export sur page livre
- [x] Affichage quota dans paramètres
- [x] Alertes de confirmation
- [x] Messages de succès/erreur
- [x] Incrémentation Firestore
- [x] Génération PDF avec expo-print
- [x] Partage avec expo-sharing

### Tests
- [ ] Test export utilisateur gratuit
- [ ] Test limite atteinte
- [ ] Test export Premium
- [ ] Test réinitialisation mensuelle
- [ ] Test affichage quota

### Documentation
- [x] Guide complet rédigé
- [x] Exemples de code
- [x] Flux détaillés
- [x] Messages UI documentés
- [x] FAQ dépannage

---

**Date de création** : 2 décembre 2025  
**Version** : 1.0.0  
**Auteur** : WattApp Team
