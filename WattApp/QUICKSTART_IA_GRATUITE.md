# 🆓 IA GRATUITE - Démarrage Rapide (2 minutes)

## 🎯 La Solution la Plus Simple: GROQ

**GROQ est 100% GRATUIT et ne demande PAS de carte bancaire !**

### 3 Étapes Simples:

#### 1️⃣ Obtenez une clé gratuite (30 secondes)

Allez sur: **https://console.groq.com/**

- Cliquez sur "Sign Up"
- Entrez votre email
- Validez votre email
- Cliquez sur "API Keys" → "Create API Key"
- Copiez votre clé (commence par `gsk_...`)

#### 2️⃣ Configurez WattApp (30 secondes)

Ouvrez `constants/llamaConfig.ts` et modifiez:

```typescript
export const LLAMA_AI_CONFIG = {
  PROVIDER: 'GROQ',  // ← Vérifiez que c'est bien GROQ
  
  // Collez votre clé ici:
  GROQ_API_KEY: 'gsk_votre_cle_ici',  // ← Remplacez ici !
  
  BASE_URL: 'https://api.groq.com/openai/v1',
  // ... reste du fichier
};
```

#### 3️⃣ C'est tout ! ✅

Lancez votre app et l'IA fonctionne gratuitement !

---

## 📊 Ce que vous obtenez GRATUITEMENT:

✅ **14,400 requêtes par jour** (largement suffisant !)  
✅ **Ultra rapide** (le plus rapide du marché)  
✅ **LLama 3.1** (8B et 70B)  
✅ **Pas de carte bancaire**  
✅ **Pour toujours gratuit**

---

## 🚀 Utilisation

Une fois configuré:

1. Ouvrez l'éditeur d'écriture dans WattApp
2. Cliquez sur le bouton **✨ IA**
3. Choisissez une fonctionnalité (complétion, dialogue, etc.)
4. Profitez de l'IA gratuitement !

---

## 💡 Autres Options Gratuites

Si vous ne voulez pas utiliser Groq, vous avez aussi:

### Option 2: HuggingFace (100% gratuit, illimité)
- Inscrivez-vous sur https://huggingface.co/
- Obtenez un token: https://huggingface.co/settings/tokens
- Configurez dans `llamaConfig.ts`:
  ```typescript
  PROVIDER: 'HUGGINGFACE',
  HUGGINGFACE_API_KEY: 'hf_votre_token',
  ```

### Option 3: Ollama (Local, privé, gratuit)
- Téléchargez: https://ollama.ai/
- Installez et lancez: `ollama serve`
- Configurez:
  ```typescript
  PROVIDER: 'OLLAMA',
  BASE_URL: 'http://localhost:11434/v1',
  ```

---

## ❓ Besoin d'aide ?

Consultez **GUIDE_IA_GRATUITE.md** pour le guide complet avec captures d'écran.

---

**🎉 Profitez de l'IA gratuitement dans WattApp !**

Aucune carte bancaire requise • Aucun paiement • 100% Gratuit
