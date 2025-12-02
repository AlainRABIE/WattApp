# 🆓 Guide: Obtenir une Clé API Gratuite pour l'IA

## ⭐ OPTION 1: GROQ (RECOMMANDÉ - Ultra Rapide et Gratuit)

### Pourquoi Groq ?
- ✅ **100% GRATUIT** - Pas de carte bancaire requise
- ✅ **Ultra rapide** - Le plus rapide du marché
- ✅ **Généreux** - 14,400 requêtes/jour gratuites
- ✅ **Simple** - Compatible avec OpenAI API

### Étapes pour obtenir votre clé Groq:

1. **Créer un compte**
   - Allez sur https://console.groq.com/
   - Cliquez sur "Sign Up"
   - Inscrivez-vous avec votre email (Gmail fonctionne)
   - Aucune carte bancaire demandée ✅

2. **Générer une clé API**
   - Une fois connecté, allez dans "API Keys"
   - Cliquez sur "Create API Key"
   - Donnez un nom (ex: "WattApp")
   - Copiez la clé (commence par `gsk_...`)

3. **Configurer dans WattApp**
   ```typescript
   // Dans constants/llamaConfig.ts
   GROQ_API_KEY: 'gsk_votre_cle_ici'
   PROVIDER: 'GROQ'
   ```

4. **Initialiser dans l'app**
   ```typescript
   // Dans hooks/useAIInitialization.ts
   LLamaAIService.initialize(LLAMA_AI_CONFIG.GROQ_API_KEY, 'GROQ');
   ```

### Limites Gratuites Groq:
- **14,400 requêtes/jour** (largement suffisant !)
- Modèles disponibles:
  - `llama-3.1-8b-instant` (recommandé - très rapide)
  - `llama-3.1-70b-versatile` (qualité supérieure)
  - `mixtral-8x7b-32768` (alternative)

---

## 🤗 OPTION 2: HUGGING FACE (100% Gratuit, Illimité)

### Pourquoi Hugging Face ?
- ✅ **100% GRATUIT** - Toujours gratuit
- ✅ **Illimité** - Pas de limite de requêtes
- ✅ **Open Source** - Communauté active
- ⚠️ Peut être lent aux heures de pointe

### Étapes pour obtenir votre token HuggingFace:

1. **Créer un compte**
   - Allez sur https://huggingface.co/join
   - Inscrivez-vous avec email ou GitHub
   - Gratuit, pas de CB

2. **Générer un token**
   - Allez dans Settings: https://huggingface.co/settings/tokens
   - Cliquez sur "New token"
   - Type: "Read" (suffisant)
   - Copiez le token (commence par `hf_...`)

3. **Configurer dans WattApp**
   ```typescript
   // Dans constants/llamaConfig.ts
   HUGGINGFACE_API_KEY: 'hf_votre_token_ici'
   PROVIDER: 'HUGGINGFACE'
   ```

4. **Initialiser**
   ```typescript
   LLamaAIService.initialize(LLAMA_AI_CONFIG.HUGGINGFACE_API_KEY, 'HUGGINGFACE');
   ```

### Modèles gratuits disponibles:
- `meta-llama/Meta-Llama-3-8B-Instruct`
- `mistralai/Mistral-7B-Instruct-v0.2`
- `google/gemma-7b-it`

---

## 🏠 OPTION 3: OLLAMA (Local - 100% Gratuit et Privé)

### Pourquoi Ollama ?
- ✅ **Totalement gratuit** - Fonctionne sur votre PC
- ✅ **Privé** - Vos données restent locales
- ✅ **Pas de limites** - Utilisez autant que vous voulez
- ⚠️ Nécessite un PC avec bon GPU (recommandé)

### Installation Ollama:

1. **Télécharger Ollama**
   - Windows: https://ollama.ai/download/windows
   - Mac: https://ollama.ai/download/mac
   - Linux: `curl https://ollama.ai/install.sh | sh`

2. **Installer un modèle**
   ```powershell
   # Dans PowerShell
   ollama pull llama3.1:8b
   ```

3. **Démarrer le serveur**
   ```powershell
   ollama serve
   ```
   Le serveur démarre sur http://localhost:11434

4. **Configurer WattApp**
   ```typescript
   // Dans constants/llamaConfig.ts
   PROVIDER: 'OLLAMA'
   BASE_URL: 'http://localhost:11434/v1'
   ```

5. **Initialiser (pas de clé nécessaire)**
   ```typescript
   LLamaAIService.initialize('', 'OLLAMA');
   ```

### Modèles recommandés:
- `llama3.1:8b` (8GB RAM minimum)
- `mistral:7b` (6GB RAM minimum)
- `gemma:7b` (Plus léger, 4GB RAM)

---

## 📊 COMPARAISON DES OPTIONS

| Critère | Groq | HuggingFace | Ollama |
|---------|------|-------------|--------|
| **Prix** | Gratuit | Gratuit | Gratuit |
| **Vitesse** | ⚡⚡⚡⚡⚡ | ⚡⚡⚡ | ⚡⚡⚡⚡ |
| **Limite** | 14,400/jour | Illimité* | Illimité |
| **Qualité** | Excellente | Très bonne | Excellente |
| **Configuration** | Facile | Facile | Moyenne |
| **Privé** | Non | Non | ✅ Oui |
| **Internet requis** | Oui | Oui | Non |
| **Carte bancaire** | ❌ Non | ❌ Non | ❌ Non |

*Rate limiting dynamique aux heures de pointe

---

## 🚀 CONFIGURATION RAPIDE (5 MINUTES)

### Avec Groq (Recommandé):

```typescript
// 1. Obtenez votre clé sur https://console.groq.com/

// 2. Dans constants/llamaConfig.ts
export const LLAMA_AI_CONFIG = {
  PROVIDER: 'GROQ',
  GROQ_API_KEY: 'gsk_votre_cle_groq_ici',
  BASE_URL: 'https://api.groq.com/openai/v1',
  // ...
};

// 3. Dans hooks/useAIInitialization.ts
import { LLAMA_AI_CONFIG } from '../constants/llamaConfig';

LLamaAIService.initialize(
  LLAMA_AI_CONFIG.GROQ_API_KEY, 
  'GROQ'
);

// 4. C'est tout ! Vous pouvez maintenant utiliser l'IA gratuitement
```

---

## 💡 CONSEILS

### Pour usage quotidien:
**Utilisez GROQ** - C'est le meilleur compromis vitesse/qualité/gratuit

### Pour développement:
**Utilisez HuggingFace** - Parfait pour tester sans limites

### Pour confidentialité:
**Utilisez Ollama** - Tout reste sur votre machine

### Pour économiser:
Toutes les options sont **100% gratuites** ! Pas besoin de carte bancaire.

---

## ❓ FAQ

### Q: Groq restera-t-il toujours gratuit ?
R: Pour l'instant oui, avec 14,400 requêtes/jour gratuites. Largement suffisant pour un usage quotidien.

### Q: HuggingFace a-t-il vraiment pas de limites ?
R: Les limites sont très souples. Vous pourriez rencontrer du rate limiting seulement si vous faites des centaines de requêtes par minute.

### Q: Ollama fonctionne-t-il sans GPU ?
R: Oui, mais c'est beaucoup plus lent. Un GPU est recommandé pour une bonne expérience.

### Q: Puis-je combiner plusieurs fournisseurs ?
R: Oui ! Vous pouvez utiliser Groq pour la vitesse, HuggingFace comme backup, et Ollama pour les données sensibles.

---

## 🎯 EXEMPLE COMPLET

```typescript
// constants/llamaConfig.ts
export const LLAMA_AI_CONFIG = {
  PROVIDER: 'GROQ', // ⭐ CHANGEZ ICI
  
  // Ajoutez votre clé
  GROQ_API_KEY: 'gsk_xxxxxxxxxxxxxxxxxxxxxxxxxx',
  HUGGINGFACE_API_KEY: 'hf_xxxxxxxxxxxxxxxxxxxxxxxxxx',
  
  // URL selon fournisseur
  BASE_URL: 'https://api.groq.com/openai/v1',
};

// hooks/useAIInitialization.ts
import LLamaAIService from '../services/LLamaAIService';
import { LLAMA_AI_CONFIG } from '../constants/llamaConfig';

export const useAIInitialization = () => {
  useEffect(() => {
    // Initialiser avec Groq (GRATUIT)
    LLamaAIService.initialize(
      LLAMA_AI_CONFIG.GROQ_API_KEY,
      'GROQ' // Fournisseur gratuit
    );
  }, []);
};
```

---

## ✅ CHECKLIST

- [ ] Compte créé sur Groq/HuggingFace/Ollama
- [ ] Clé API obtenue
- [ ] Clé configurée dans `llamaConfig.ts`
- [ ] Service initialisé dans `useAIInitialization.ts`
- [ ] Testé avec `AIDemo` component
- [ ] Ça fonctionne ! 🎉

---

**Tout est 100% GRATUIT - Pas besoin de carte bancaire ! 🎉**

Profitez de l'IA gratuitement dans WattApp !
