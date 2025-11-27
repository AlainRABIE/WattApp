# Guide de déploiement du bot de modération

## 1. Choisir une solution d'hébergement

- **Recommandé** : VPS (OVH, Scaleway, DigitalOcean, etc.) ou service cloud Python (Heroku, Render, Railway, Google Cloud Run, Azure App Service...)
- **Déconseillé** : NAS (possible mais moins sécurisé et moins fiable)

## 2. Préparer le serveur

- Installer Python 3.x
- Installer git
- (Optionnel) Ouvrir le port 5000 (ou celui de ton API Flask) dans le firewall

## 3. Déployer le code

```bash
git clone <URL_DU_REPO_GIT>
cd WattApp/WattApp/apui-bot-modo
python -m venv .venv
.venv/bin/activate  # (Linux/Mac) ou .venv\Scripts\activate (Windows)
pip install --upgrade pip wheel setuptools
pip install -r requirements.txt
```

## 4. Installer les outils de compilation (si besoin)
- Sur Windows : installer les Build Tools for Visual Studio (voir INSTALL_ALL.md)
- Sur Linux :
```bash
sudo apt update
sudo apt install build-essential
```

## 5. Lancer le bot Flask en mode production

```bash
# Pour un test simple :
python main.py

# Pour la production, utiliser gunicorn (à installer) :
pip install gunicorn
# Puis lancer :
gunicorn -w 4 -b 0.0.0.0:5000 main:app
```

## 6. Rendre l'API accessible
- Ouvre le port 5000 sur le firewall du serveur
- Utilise un reverse proxy (Nginx, Apache) pour sécuriser et ajouter HTTPS si besoin

## 7. Mettre à jour l'URL de l'API dans ton app mobile
- Remplace `http://localhost:5000` par l'URL publique de ton serveur

## 8. Conseils
- Surveille les logs du serveur
- Mets à jour régulièrement les dépendances et le code
- Sécurise l'accès à ton serveur (firewall, mises à jour, HTTPS)

---

**Ce guide te permet de déployer ton bot de modération sur un vrai serveur pour la production !**
