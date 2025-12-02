/**
 * Configuration pour le service LLama AI - VERSION GRATUITE
 * 
 * OPTIONS GRATUITES DISPONIBLES:
 * 
 * 1. HUGGING FACE (100% GRATUIT - RECOMMANDÉ)
 *    - Pas de carte bancaire requise
 *    - Créez un compte sur https://huggingface.co/
 *    - Générez un token (gratuit): https://huggingface.co/settings/tokens
 *    - Modèles: Flan-T5, GPT-2, etc.
 * 
 * 2. OPENROUTER (Crédits gratuits)
 *    - $1 de crédits gratuits au démarrage
 *    - Accès à plusieurs modèles gratuits
 *    - https://openrouter.ai/
 * 
 * 3. OLLAMA (100% GRATUIT & LOCAL)
 *    - Fonctionne sur votre PC
 *    - Aucune limite, totalement privé
 *    - https://ollama.ai/
 */

export const LLAMA_AI_CONFIG = {
  // CHOISISSEZ VOTRE FOURNISSEUR GRATUIT:
  PROVIDER: 'HUGGINGFACE', // Options: 'HUGGINGFACE', 'OPENROUTER', 'OLLAMA'
  
  // Clés API (Configurées via fichier .env pour la sécurité)
  HUGGINGFACE_API_KEY: process.env.HUGGINGFACE_API_KEY || '',
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || '',
  OLLAMA_API_KEY: '', // Pas besoin de clé pour Ollama
  
  // URL de base selon le fournisseur
  BASE_URL: 'https://api-inference.huggingface.co/models', // HuggingFace (100% GRATUIT)
  
  // Modèles GRATUITS par fournisseur
  MODELS: {
    // HUGGING FACE (100% GRATUIT)
    HF_FLAN_T5: 'google/flan-t5-base',
    HF_GPT2: 'gpt2',
    HF_BLOOM: 'bigscience/bloom-560m',
    
    // OPENROUTER (Modèles gratuits)
    OR_MISTRAL: 'mistralai/mistral-7b-instruct:free',
    OR_LLAMA: 'meta-llama/llama-3-8b-instruct:free',
    
    // OLLAMA (Local)
    OLLAMA_LLAMA: 'llama3.1:8b',
    OLLAMA_MISTRAL: 'mistral:7b',
  },
  
  // Modèle par défaut GRATUIT (Groq est le plus rapide)
  DEFAULT_MODEL: 'llama-3.1-8b' as const,
  
  // Modèle premium GRATUIT (Groq 70B)
  PREMIUM_MODEL: 'llama-3.1-70b' as const,
  
  // Paramètres par défaut
  DEFAULT_PARAMS: {
    temperature: 0.7,
    maxTokens: 500,
    topP: 0.9,
  },
  
  // Paramètres pour la créativité (brainstorming, dialogue)
  CREATIVE_PARAMS: {
    temperature: 0.9,
    maxTokens: 600,
    topP: 0.95,
  },
  
  // Paramètres pour la précision (résumé, analyse)
  PRECISE_PARAMS: {
    temperature: 0.5,
    maxTokens: 500,
    topP: 0.8,
  },
};

/**
/**
 * 🆓 FOURNISSEURS GRATUITS COMPARAISON:
 * 
 * 1. HUGGING FACE (MEILLEUR CHOIX - 100% GRATUIT) ⭐⭐⭐⭐⭐
 *    - URL: https://huggingface.co/
 *    - Vitesse: Modérée
 *    - Limite: Illimitée avec votre token
 *    - Modèles: Flan-T5, GPT-2, Bloom
 *    - Parfait pour: Usage illimité sans frais
 *    - Inscription: Email seulement, AUCUNE carte bancaire
 * 
 * 2. OPENROUTER (Crédits gratuits) ⭐⭐⭐⭐
 *    - URL: https://openrouter.ai/
 *    - Vitesse: Rapide
 *    - Limite: $1 gratuit + modèles free
 *    - Modèles: Mistral-7B, Llama-3-8B (gratuits)
 *    - Parfait pour: Tester plusieurs modèles
 *    - Inscription: Email uniquement
 * 
 * 3. OLLAMA LOCAL (100% GRATUIT & PRIVÉ) ⭐⭐⭐⭐⭐
 *    - URL: https://ollama.ai/
 *    - Vitesse: Dépend de votre PC
 *    - Limite: Aucune
 *    - Modèles: Tous open-source
 *    - Parfait pour: Confidentialité totale
 *    - Installation: Télécharger et installer
 */
export const FREE_PROVIDERS = {
  // HUGGING FACE - RECOMMANDÉ (100% gratuit illimité)
  HUGGINGFACE: {
    BASE_URL: 'https://router.huggingface.co',
    API_KEY_ENV: 'HUGGINGFACE_API_KEY',
    MODELS: {
      LLAMA_3_2: 'meta-llama/Llama-3.2-3B-Instruct',
      MISTRAL: 'mistralai/Mistral-7B-Instruct-v0.3',
      QWEN: 'Qwen/Qwen2.5-3B-Instruct',
    },
    LIMITS: 'Illimité',
    SIGNUP: 'https://huggingface.co/join',
  },
  
  // OPENROUTER - Alternative avec crédits gratuits
  OPENROUTER: {
    BASE_URL: 'https://openrouter.ai/api/v1',
    API_KEY_ENV: 'OPENROUTER_API_KEY',
    MODELS: {
      MISTRAL: 'mistralai/mistral-7b-instruct:free',
      LLAMA: 'meta-llama/llama-3-8b-instruct:free',
    },
    LIMITS: '$1 gratuit + modèles free',
    SIGNUP: 'https://openrouter.ai/keys',
  },
  // OLLAMA - Solution locale 100% gratuite et privée
  OLLAMA: {
    BASE_URL: 'http://localhost:11434/v1',
    API_KEY_ENV: null, // Pas besoin de clé
    MODELS: {
      LLAMA_8B: 'llama3.1:8b',
      LLAMA_70B: 'llama3.1:70b',
      MISTRAL: 'mistral:7b',
    },
    LIMITS: 'Aucune (local)',
    SIGNUP: 'https://ollama.ai/download',
  },
};

export default LLAMA_AI_CONFIG;
