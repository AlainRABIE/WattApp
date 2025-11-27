# Guide de démarrage du bot de modération

## 1. Installer les dépendances Python

Ouvre un terminal dans le dossier `apui-bot-modo` puis exécute :

```powershell
python -m pip install --upgrade pip wheel setuptools
python -m pip install -r requirements.txt
```

Si tu as une erreur liée à la compilation (Visual Studio Build Tools) :
- Télécharge et installe : https://visualstudio.microsoft.com/visual-cpp-build-tools/
- Redémarre ton PC après l'installation.
- Relance la commande d'installation.

---

## 2. Lancer le bot Flask

Toujours dans le dossier `apui-bot-modo` :

```powershell
python main.py
```

Le bot sera accessible sur `http://localhost:5000` (par défaut).

---

## 3. Conseils

- Mets à jour `requirements.txt` si tu ajoutes de nouvelles dépendances.
- Pour toute nouvelle machine ou après un `git clone`, recommence à l'étape 1.

---

## 4. Dépannage

- Si `pip` n'est pas reconnu, vérifie que Python est bien installé et ajouté au PATH.
- Si tu as une erreur de compilation, installe les Visual C++ Build Tools.
- Pour mettre à jour pip :
  ```powershell
  python -m pip install --upgrade pip
  ```
