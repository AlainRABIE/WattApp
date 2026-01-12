#!/bin/bash

# Script de déploiement pour WattApp
# Usage: ./deploy.sh

echo "🚀 Déploiement WattApp"
echo "====================="
echo ""

# Vérifier si Firebase CLI est installé
if ! command -v firebase &> /dev/null
then
    echo "❌ Firebase CLI n'est pas installé"
    echo "   Installer avec: npm install -g firebase-tools"
    exit 1
fi

echo "✅ Firebase CLI détecté"
echo ""

# Demander confirmation
read -p "Voulez-vous déployer les Functions? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo "❌ Déploiement annulé"
    exit 0
fi

# Aller dans le dossier functions
cd functions || exit

echo "📦 Installation des dépendances..."
npm install

echo ""
echo "🔨 Compilation TypeScript..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Erreur de compilation"
    exit 1
fi

echo ""
echo "✅ Compilation réussie"
echo ""

# Retour au dossier racine
cd ..

# Vérifier la configuration Firebase
echo "🔍 Vérification de la configuration..."
firebase functions:config:get

echo ""
read -p "La configuration est-elle correcte? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo "❌ Déploiement annulé"
    echo ""
    echo "Configurer avec:"
    echo "  firebase functions:config:set stripe.secret=\"sk_test_...\""
    echo "  firebase functions:config:set paypal.client_id=\"...\""
    exit 0
fi

echo ""
echo "🚀 Déploiement des Functions..."
firebase deploy --only functions

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Déploiement réussi!"
    echo ""
    echo "📝 Prochaines étapes:"
    echo "1. Configurer le webhook Stripe:"
    echo "   URL: https://VOTRE-REGION-VOTRE-PROJECT.cloudfunctions.net/stripeWebhook"
    echo ""
    echo "2. Tester avec une carte de test Stripe:"
    echo "   4242 4242 4242 4242"
    echo ""
    echo "3. Vérifier les logs:"
    echo "   firebase functions:log"
else
    echo ""
    echo "❌ Échec du déploiement"
    exit 1
fi
