# ========================================
# GUIDE DE SÉCURITÉ - CLÉS API
# ========================================

## ⚠️ IMPORTANT: NE JAMAIS COMMITER VOS CLÉS API

Ce fichier explique comment gérer vos clés API en toute sécurité.

## 1. Configuration locale

1. Copiez `.env.example` vers `.env`:
   ```bash
   cp .env.example .env
   ```

2. Remplissez `.env` avec vos vraies clés API
   - Le fichier `.env` est dans `.gitignore` et ne sera jamais commité

## 2. Configuration Firebase Functions

Pour déployer vos functions Firebase avec les clés API:

```bash
# Stripe
firebase functions:config:set stripe.secret="VOTRE_CLE_SECRETE_STRIPE"
firebase functions:config:set stripe.webhook_secret="VOTRE_WEBHOOK_SECRET"

# PayPal
firebase functions:config:set paypal.client_id="VOTRE_CLIENT_ID"
firebase functions:config:set paypal.client_secret="VOTRE_CLIENT_SECRET"
firebase functions:config:set paypal.mode="sandbox"
```

## 3. Vérifier la configuration

```bash
firebase functions:config:get
```

## 4. Fichiers à NE JAMAIS commiter

- `.env` - Variables d'environnement locales
- Fichiers contenant des clés API en dur
- `firebaseConfig.ts` avec vraies clés
- `stripeConfig.ts` avec vraies clés

## 5. Si vous avez déjà commité des secrets

1. Supprimez les secrets des fichiers
2. Ajoutez les fichiers à `.gitignore`
3. Nettoyez l'historique Git:
   ```bash
   git filter-branch --force --index-filter \
   "git rm --cached --ignore-unmatch FICHIER_AVEC_SECRET" \
   --prune-empty --tag-name-filter cat -- --all
   ```
4. Force push:
   ```bash
   git push origin --force --all
   ```

## 6. Régénérer les clés compromises

Si vous avez accidentellement exposé vos clés:
- **Stripe**: https://dashboard.stripe.com/apikeys → Régénérer
- **PayPal**: https://developer.paypal.com/dashboard/applications
- **Firebase**: https://console.firebase.google.com/
