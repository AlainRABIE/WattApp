import axios, { AxiosInstance } from 'axios';

export interface AICompletionOptions {
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  model?: 'llama-3.1-8b' | 'llama-3.1-70b';
  context?: string;
}

export interface AIResponse {
  text: string;
  finishReason: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface WritingSuggestion {
  type: 'completion' | 'improvement' | 'dialogue' | 'description' | 'plot';
  original?: string;
  suggestion: string;
  explanation?: string;
}

export class LLamaAIService {
  private static apiClient: AxiosInstance;
  private static apiKey: string = '';
  private static baseURL: string = 'https://router.huggingface.co';
  private static provider: 'HUGGINGFACE' | 'OPENROUTER' | 'OLLAMA' = 'HUGGINGFACE';
  
  private static MODELS = {
    'llama-3.1-8b': 'meta-llama/Llama-3.2-3B-Instruct',
    'llama-3.1-70b': 'meta-llama/Llama-3.2-3B-Instruct',
    'mistral-7b': 'mistralai/mistral-7b-instruct:free',
    'llama-3-8b': 'meta-llama/llama-3-8b-instruct:free',
  };

  static initialize(apiKey: string, provider: 'HUGGINGFACE' | 'OPENROUTER' | 'OLLAMA' = 'HUGGINGFACE') {
    this.apiKey = apiKey;
    this.provider = provider;
    
    switch (provider) {
      case 'HUGGINGFACE':
        this.baseURL = 'https://router.huggingface.co';
        break;
      case 'OPENROUTER':
        this.baseURL = 'https://openrouter.ai/api/v1';
        break;
      case 'OLLAMA':
        this.baseURL = 'http://localhost:11434/v1';
        break;
    }
    
    this.apiClient = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 60000,
    });

    console.log(`✅ Assistant IA initialisé avec succès: ${provider}`);
  }

  private static checkInitialized() {
    if (!this.apiKey || !this.apiClient) {
      throw new Error('LLamaAIService non initialisé');
    }
  }

  static async generateCompletion(options: AICompletionOptions): Promise<AIResponse> {
    this.checkInitialized();

    const {
      prompt,
      maxTokens = 500,
      temperature = 0.7,
      topP = 0.9,
      model = 'llama-3.1-8b',
      context = '',
    } = options;

    const systemPrompt = `Tu es un assistant d'écriture créatif et expert. Aide les auteurs à améliorer leur écriture.`;
    const userPrompt = context ? `Contexte: ${context}\n\nTexte: ${prompt}` : prompt;

    try {
      const modelName = this.MODELS[model] || 'meta-llama/Llama-3.2-3B-Instruct';
      
      const response = await this.apiClient.post('/v1/chat/completions', {
        model: modelName,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: maxTokens,
        temperature,
        top_p: topP,
      });
      
      const choice = response.data.choices[0];
      return {
        text: choice.message.content.trim(),
        finishReason: choice.finish_reason,
        usage: {
          promptTokens: response.data.usage?.prompt_tokens || 0,
          completionTokens: response.data.usage?.completion_tokens || 0,
          totalTokens: response.data.usage?.total_tokens || 0,
        },
      };
    } catch (error: any) {
      console.error('❌ Erreur LLama AI:', error.response?.data || error.message);
      throw new Error(`Erreur AI: ${error.response?.data?.error || error.message}`);
    }
  }

  static async completeText(currentText: string, contextBefore: string = '', model: 'llama-3.1-8b' | 'llama-3.1-70b' = 'llama-3.1-8b'): Promise<string> {
    const prompt = contextBefore 
      ? `Contexte précédent: "${contextBefore}"\n\nTexte actuel: "${currentText}"\n\nComplète naturellement ce texte:`
      : `Complète ce texte de manière créative et cohérente:\n\n"${currentText}"`;

    const response = await this.generateCompletion({
      prompt,
      maxTokens: 300,
      model,
    });

    return response.text;
  }

  static async improveText(text: string, improvementType: 'grammar' | 'style' | 'clarity' = 'grammar', model: 'llama-3.1-8b' | 'llama-3.1-70b' = 'llama-3.1-8b'): Promise<WritingSuggestion> {
    const prompts = {
      grammar: `Corrige la grammaire et l'orthographe de ce texte en français:\n\n"${text}"`,
      style: `Améliore le style littéraire de ce texte:\n\n"${text}"`,
      clarity: `Rends ce texte plus clair et fluide:\n\n"${text}"`,
    };

    const prompt = prompts[improvementType];
    const response = await this.generateCompletion({
      prompt,
      maxTokens: 400,
      model,
    });

    return {
      type: 'improvement',
      original: text,
      suggestion: response.text,
      explanation: `Amélioration de ${improvementType}`,
    };
  }

  static async generateDialogue(character1: string, character2: string, context: string, emotion: string = 'neutre', model: 'llama-3.1-8b' | 'llama-3.1-70b' = 'llama-3.1-8b'): Promise<string> {
    const prompt = `Écris un dialogue réaliste entre ${character1} et ${character2}.
    
Contexte: ${context}
Émotion: ${emotion}

Format:
- ${character1}: [réplique]
- ${character2}: [réplique]
...`;

    const response = await this.generateCompletion({
      prompt,
      maxTokens: 500,
      model,
    });

    return response.text;
  }

  static async generateDescription(subject: string, tone: 'poétique' | 'réaliste' | 'sombre' = 'réaliste', length: 'court' | 'moyen' | 'long' = 'moyen', model: 'llama-3.1-8b' | 'llama-3.1-70b' = 'llama-3.1-8b'): Promise<string> {
    const lengthGuide = {
      court: '2-3 phrases courtes',
      moyen: '1 paragraphe',
      long: '2-3 paragraphes',
    };

    const prompt = `Écris une description ${tone} de: ${subject}
    
Longueur: ${lengthGuide[length]}
Ton: ${tone}`;

    const response = await this.generateCompletion({
      prompt,
      maxTokens: length === 'court' ? 150 : length === 'moyen' ? 300 : 500,
      model,
    });

    return response.text;
  }

  static async summarizeText(text: string, targetLength: 'court' | 'moyen' | 'long' = 'moyen', model: 'llama-3.1-8b' | 'llama-3.1-70b' = 'llama-3.1-8b'): Promise<string> {
    const lengthGuide = {
      court: '1-2 phrases',
      moyen: '1 paragraphe',
      long: '2-3 paragraphes',
    };

    const prompt = `Résume ce texte en ${lengthGuide[targetLength]}:\n\n${text}`;

    const response = await this.generateCompletion({
      prompt,
      maxTokens: targetLength === 'court' ? 100 : targetLength === 'moyen' ? 200 : 400,
      model,
    });

    return response.text;
  }

  static async analyzeWritingStyle(text: string, model: 'llama-3.1-8b' | 'llama-3.1-70b' = 'llama-3.1-8b'): Promise<{
    analysis: string;
    strengths: string[];
    improvements: string[];
  }> {
    const prompt = `Analyse le style d'écriture de ce texte:

${text}

Fournis:
1. ANALYSE: [ton analyse générale]
2. POINTS FORTS: [liste des forces]
3. AMÉLIORATIONS: [suggestions d'amélioration]`;

    const response = await this.generateCompletion({
      prompt,
      maxTokens: 500,
      model,
    });

    const responseText = response.text;
    const analysisMatch = responseText.match(/ANALYSE:([\s\S]+?)(?:POINTS FORTS:|$)/);
    const analysisPart = analysisMatch ? analysisMatch[1].trim() : responseText;

    const strengthsMatch = responseText.match(/POINTS FORTS:([\s\S]+?)(?:AMÉLIORATIONS:|$)/);
    const strengthsPart = strengthsMatch ? strengthsMatch[1].trim() : '';

    const improvementsMatch = responseText.match(/AMÉLIORATIONS:([\s\S]+)$/);
    const improvementsPart = improvementsMatch ? improvementsMatch[1].trim() : '';

    return {
      analysis: analysisPart,
      strengths: strengthsPart.split('\n').filter(s => s.trim()),
      improvements: improvementsPart.split('\n').filter(s => s.trim()),
    };
  }

  static async generateTitles(content: string, type: 'chapter' | 'book' = 'chapter', count: number = 5, model: 'llama-3.1-8b' | 'llama-3.1-70b' = 'llama-3.1-8b'): Promise<string[]> {
    const prompt = `Génère ${count} titres créatifs pour ce ${type}:\n\n${content}`;

    const response = await this.generateCompletion({
      prompt,
      maxTokens: 300,
      model,
    });

    const titles = response.text
      .split('\n')
      .filter(line => line.trim())
      .slice(0, count);

    return titles;
  }

  static async brainstorm(topic: string, genre: string = 'général', count: number = 5, model: 'llama-3.1-8b' | 'llama-3.1-70b' = 'llama-3.1-8b'): Promise<string[]> {
    const prompt = `Génère ${count} idées créatives pour un ${genre} sur le thème: ${topic}

Liste ${count} idées numérotées:`;

    const response = await this.generateCompletion({
      prompt,
      maxTokens: 400,
      model,
    });

    const ideas = response.text
      .split('\n')
      .filter(line => line.trim())
      .slice(0, count);

    return ideas;
  }

  static async suggestPlotDevelopment(currentPlot: string, genre: string, model: 'llama-3.1-8b' | 'llama-3.1-70b' = 'llama-3.1-8b'): Promise<string> {
    const prompt = `Intrigue actuelle d'un ${genre}:\n\n${currentPlot}\n\nSuggère 3 directions possibles pour développer cette intrigue:`;

    const response = await this.generateCompletion({
      prompt,
      maxTokens: 500,
      model,
    });

    return response.text;
  }

  static async translateText(text: string, targetLanguage: string, model: 'llama-3.1-8b' | 'llama-3.1-70b' = 'llama-3.1-8b'): Promise<string> {
    const prompt = `Traduis ce texte en ${targetLanguage}:\n\n${text}`;

    const response = await this.generateCompletion({
      prompt,
      maxTokens: text.length * 2,
      model,
    });

    return response.text;
  }

  static async healthCheck(): Promise<boolean> {
    try {
      this.checkInitialized();
      const response = await this.apiClient.post('/v1/chat/completions', {
        model: 'meta-llama/Llama-3.2-3B-Instruct',
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 10,
      });
      return response.status === 200;
    } catch {
      return false;
    }
  }
}