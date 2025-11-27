# Guide complet d'installation et d'utilisation du bot de modération

## 1. Cloner le projet

```powershell
git clone <URL_DU_REPO_GIT>
cd WattApp/WattApp/apui-bot-modo
```

## 2. (Optionnel) Créer un environnement virtuel Python

```powershell
python -m venv .venv
.venv\Scripts\activate
```

## 3. Mettre à jour pip et outils

```powershell
python -m pip install --upgrade pip wheel setuptools
```

## 4. Installer les dépendances Python

```powershell
python -m pip install -r requirements.txt
```

### Si tu as une erreur sur `scikit-image` ou `nudenet` :
- Installe les Build Tools for Visual Studio : https://visualstudio.microsoft.com/visual-cpp-build-tools/
- Coche "Développement Desktop avec C++" pendant l'installation.
- Redémarre le PC puis relance l'installation des dépendances.

## 5. Lancer le bot Flask

```powershell
python main.py
```

Le bot sera accessible sur http://localhost:5000

## 6. Tester l'API de modération

### Exemple requête texte (avec curl) :
```powershell
curl -X POST http://localhost:5000/moderate-text -H "Content-Type: application/json" -d "{\"text\": \"votre texte à tester\"}"
```

### Exemple requête image (avec curl) :
```powershell
curl -X POST http://localhost:5000/moderate-image -F image=@chemin/vers/image.jpg
```

## 7. Conseils
- Mets à jour `requirements.txt` si tu ajoutes de nouvelles dépendances.
- Pour toute nouvelle machine ou après un `git clone`, recommence à l'étape 1.
- Si tu as une erreur, copie-la ici ou cherche le message exact pour trouver la solution.
- Utilise un environnement virtuel pour éviter les conflits de dépendances.

---

**Ce guide te permet de tout refaire de zéro sur n'importe quel ordinateur !**
