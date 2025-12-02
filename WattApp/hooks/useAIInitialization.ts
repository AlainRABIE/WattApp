import { useEffect } from 'react';
import LLamaAIService from '../services/LLamaAIService';
import { LLAMA_AI_CONFIG } from '../constants/llamaConfig';

/**
 * Hook personnalisé pour initialiser l'assistant IA GRATUIT
 * Utiliser dans le composant racine de l'application
 * 
 * Supporte les fournisseurs GRATUITS:
 * - GROQ (Recommandé - Ultra rapide)
 * - HUGGINGFACE (100% gratuit illimité)
 * - OLLAMA (Local et privé)
 */
export const useAIInitialization = () => {
  useEffect(() => {
    const initializeAI = async () => {
      try {
        const provider = LLAMA_AI_CONFIG.PROVIDER || 'GROQ';
        let apiKey = '';
        
        // Récupérer la bonne clé selon le fournisseur
        switch (provider) {
          case 'GROQ':
            apiKey = LLAMA_AI_CONFIG.GROQ_API_KEY || '';
            if (!apiKey || apiKey === 'YOUR_GROQ_API_KEY_HERE') {
              console.warn('⚠️ Clé API Groq non configurée.');
              console.warn('🆓 Obtenez-en une GRATUITEMENT sur https://console.groq.com/');
              console.warn('📖 Consultez GUIDE_IA_GRATUITE.md pour les instructions.');
              return;
            }
            break;
            
          case 'HUGGINGFACE':
            apiKey = LLAMA_AI_CONFIG.HUGGINGFACE_API_KEY || '';
            if (!apiKey || apiKey === 'YOUR_HF_TOKEN_HERE') {
              console.warn('⚠️ Token HuggingFace non configuré.');
              console.warn('🆓 Obtenez-en un GRATUITEMENT sur https://huggingface.co/settings/tokens');
              console.warn('📖 Consultez GUIDE_IA_GRATUITE.md pour les instructions.');
              return;
            }
            break;
            
          case 'OLLAMA':
            // Ollama local n'a pas besoin de clé
            apiKey = '';
            console.log('🏠 Utilisation d\'Ollama local (assurez-vous qu\'Ollama est en cours d\'exécution)');
            break;
            
          case 'TOGETHER':
            apiKey = LLAMA_AI_CONFIG.TOGETHER_API_KEY || '';
            if (!apiKey || apiKey === 'YOUR_TOGETHER_API_KEY_HERE') {
              console.warn('⚠️ Clé API Together non configurée.');
              console.warn('💡 Together AI offre des crédits gratuits mais devient payant.');
              console.warn('🆓 Pour une solution 100% gratuite, utilisez GROQ ou HUGGINGFACE.');
              console.warn('📖 Consultez GUIDE_IA_GRATUITE.md pour les alternatives.');
              return;
            }
            break;
        }

        // Initialiser le service avec le fournisseur choisi
        LLamaAIService.initialize(apiKey, provider);
        
        // Vérifier la disponibilité (optionnel)
        const isAvailable = await LLamaAIService.healthCheck();
        
        if (isAvailable) {
          console.log(`✅ Assistant IA ${provider} initialisé avec succès (100% GRATUIT)`);
          console.log(`🚀 Modèles disponibles: LLama 3.1, Mixtral, Mistral`);
        } else {
          console.warn(`⚠️ Service IA ${provider} non disponible.`);
          if (provider === 'OLLAMA') {
            console.warn('💡 Démarrez Ollama avec: ollama serve');
          } else {
            console.warn('💡 Vérifiez votre clé API et votre connexion internet.');
          }
        }
      } catch (error: any) {
        console.error('❌ Erreur lors de l\'initialisation de l\'IA:', error.message);
        console.log('📖 Consultez GUIDE_IA_GRATUITE.md pour obtenir une clé API gratuite');
      }
    };

    initializeAI();
  }, []);
};

export default useAIInitialization;
