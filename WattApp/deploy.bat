@echo off
REM Script de déploiement pour WattApp (Windows)
REM Usage: deploy.bat

echo ========================================
echo 🚀 Déploiement WattApp
echo ========================================
echo.

REM Vérifier si Firebase CLI est installé
where firebase >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Firebase CLI n'est pas installé
    echo    Installer avec: npm install -g firebase-tools
    pause
    exit /b 1
)

echo ✅ Firebase CLI détecté
echo.

REM Demander confirmation
set /p CONFIRM="Voulez-vous déployer les Functions? (y/n): "
if /i not "%CONFIRM%"=="y" (
    echo ❌ Déploiement annulé
    pause
    exit /b 0
)

REM Aller dans le dossier functions
cd functions
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Dossier functions introuvable
    pause
    exit /b 1
)

echo.
echo 📦 Installation des dépendances...
call npm install

echo.
echo 🔨 Compilation TypeScript...
call npm run build

if %ERRORLEVEL% NEQ 0 (
    echo ❌ Erreur de compilation
    cd ..
    pause
    exit /b 1
)

echo.
echo ✅ Compilation réussie
echo.

REM Retour au dossier racine
cd ..

REM Vérifier la configuration Firebase
echo 🔍 Vérification de la configuration...
firebase functions:config:get

echo.
set /p CONFIGOK="La configuration est-elle correcte? (y/n): "
if /i not "%CONFIGOK%"=="y" (
    echo ❌ Déploiement annulé
    echo.
    echo Configurer avec:
    echo   firebase functions:config:set stripe.secret="sk_test_..."
    echo   firebase functions:config:set paypal.client_id="..."
    pause
    exit /b 0
)

echo.
echo 🚀 Déploiement des Functions...
firebase deploy --only functions

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo ✅ Déploiement réussi!
    echo ========================================
    echo.
    echo 📝 Prochaines étapes:
    echo 1. Configurer le webhook Stripe:
    echo    URL: https://VOTRE-REGION-VOTRE-PROJECT.cloudfunctions.net/stripeWebhook
    echo.
    echo 2. Tester avec une carte de test Stripe:
    echo    4242 4242 4242 4242
    echo.
    echo 3. Vérifier les logs:
    echo    firebase functions:log
    echo.
) else (
    echo.
    echo ❌ Échec du déploiement
    pause
    exit /b 1
)

pause
