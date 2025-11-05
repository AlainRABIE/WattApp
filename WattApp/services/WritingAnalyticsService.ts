import { getAuth } from 'firebase/auth';
import app, { db } from '../constants/firebaseConfig';
import { 
  collection, 
  doc, 
  addDoc,
  getDocs, 
  getDoc,
  updateDoc, 
  serverTimestamp, 
  query, 
  where,
  orderBy,
  limit,
  Timestamp 
} from 'firebase/firestore';

export interface WritingStats {
  // Statistiques de base
  totalWords: number;
  totalCharacters: number;
  totalSentences: number;
  totalParagraphs: number;
  
  // Statistiques temporelles
  writingTime: number; // en minutes
  wordsPerMinute: number;
  dailyWordCount: number;
  weeklyWordCount: number;
  monthlyWordCount: number;
  
  // Analyse de contenu
  readabilityScore: number;
  vocabularyRichness: number;
  averageSentenceLength: number;
  averageWordLength: number;
  
  // Analyse de style
  dialoguePercentage: number;
  narrativePercentage: number;
  descriptionPercentage: number;
  
  // Tendances
  writingConsistency: number;
  progressTrend: 'increasing' | 'decreasing' | 'stable';
  bestWritingTime: string;
  productiveDays: string[];
  
  // Objectifs
  dailyGoal: number;
  goalProgress: number;
  streakDays: number;
  longestStreak: number;
  
  // Métadonnées
  lastUpdated: Timestamp;
  totalSessions: number;
  averageSessionLength: number;
}

export interface DetailedAnalysis {
  // Analyse lexicale
  wordFrequency: Record<string, number>;
  uniqueWords: number;
  repeatedWords: string[];
  complexWords: string[];
  
  // Analyse structurelle
  sentenceTypes: {
    simple: number;
    compound: number;
    complex: number;
  };
  
  // Analyse de tonalité
  sentiment: {
    positive: number;
    negative: number;
    neutral: number;
  };
  
  // Suggestions d'amélioration
  suggestions: WritingSuggestion[];
  
  // Comparaison avec d'autres œuvres
  genreComparison: {
    averageLength: number;
    readabilityComparison: string;
    styleComparison: string;
  };
}

export interface WritingSuggestion {
  type: 'grammar' | 'style' | 'vocabulary' | 'structure' | 'pacing';
  severity: 'low' | 'medium' | 'high';
  message: string;
  suggestion: string;
  position?: {
    start: number;
    end: number;
  };
}

export interface WritingSession {
  id: string;
  bookId: string;
  chapterId?: string;
  startTime: Timestamp;
  endTime?: Timestamp;
  wordsWritten: number;
  charactersWritten: number;
  timeSpent: number; // en minutes
  averageWPM: number;
  breaks: number;
  quality: 'poor' | 'average' | 'good' | 'excellent';
}

export interface WritingGoal {
  id: string;
  userId: string;
  type: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'project';
  targetWords: number;
  currentWords: number;
  deadline?: Timestamp;
  bookId?: string;
  isActive: boolean;
  createdAt: Timestamp;
  completedAt?: Timestamp;
}

export class WritingAnalyticsService {
  
  /**
   * Analyser le contenu d'écriture
   */
  static analyzeContent(content: string): DetailedAnalysis {
    const words = this.extractWords(content);
    const sentences = this.extractSentences(content);
    const paragraphs = content.split('\n\n').filter(p => p.trim().length > 0);
    
    // Analyse lexicale
    const wordFrequency = this.calculateWordFrequency(words);
    const uniqueWords = Object.keys(wordFrequency).length;
    const repeatedWords = Object.entries(wordFrequency)
      .filter(([word, count]) => count > 5 && word.length > 4)
      .map(([word]) => word)
      .slice(0, 10);
    
    const complexWords = words.filter(word => word.length > 7).slice(0, 20);
    
    // Analyse structurelle
    const sentenceTypes = this.analyzeSentenceTypes(sentences);
    
    // Analyse de sentiment (basique)
    const sentiment = this.analyzeSentiment(content);
    
    // Génération de suggestions
    const suggestions = this.generateSuggestions(content, {
      wordFrequency,
      sentenceTypes,
      averageSentenceLength: sentences.reduce((sum, s) => sum + s.split(' ').length, 0) / sentences.length
    });
    
    // Comparaison avec le genre (données statiques pour l'exemple)
    const genreComparison = {
      averageLength: 80000, // Moyenne pour un roman
      readabilityComparison: 'Similaire à la moyenne du genre',
      styleComparison: 'Style descriptif équilibré'
    };
    
    return {
      wordFrequency,
      uniqueWords,
      repeatedWords,
      complexWords,
      sentenceTypes,
      sentiment,
      suggestions,
      genreComparison
    };
  }
  
  /**
   * Calculer les statistiques d'écriture
   */
  static async calculateWritingStats(userId: string, bookId?: string): Promise<WritingStats> {
    try {
      // Récupérer les sessions d'écriture
      const sessions = await this.getWritingSessions(userId, bookId);
      
      // Récupérer le contenu des livres/chapitres
      const content = await this.getUserContent(userId, bookId);
      
      // Calculer les statistiques de base
      const words = this.extractWords(content);
      const sentences = this.extractSentences(content);
      const paragraphs = content.split('\n\n').filter(p => p.trim().length > 0);
      
      // Statistiques temporelles
      const totalWritingTime = sessions.reduce((sum, session) => sum + session.timeSpent, 0);
      const totalWordsWritten = sessions.reduce((sum, session) => sum + session.wordsWritten, 0);
      const averageWPM = totalWritingTime > 0 ? totalWordsWritten / totalWritingTime : 0;
      
      // Statistiques par période
      const now = new Date();
      const dailyStats = this.calculatePeriodStats(sessions, 1);
      const weeklyStats = this.calculatePeriodStats(sessions, 7);
      const monthlyStats = this.calculatePeriodStats(sessions, 30);
      
      // Analyse de lisibilité
      const readabilityScore = this.calculateReadabilityScore(content);
      const vocabularyRichness = this.calculateVocabularyRichness(words);
      
      // Analyse de style
      const styleAnalysis = this.analyzeWritingStyle(content);
      
      // Tendances et consistance
      const consistency = this.calculateWritingConsistency(sessions);
      const trend = this.calculateProgressTrend(sessions);
      const bestWritingTime = this.findBestWritingTime(sessions);
      const productiveDays = this.findProductiveDays(sessions);
      
      // Objectifs et streaks
      const goals = await this.getUserGoals(userId);
      const currentGoal = goals.find(g => g.isActive && g.type === 'daily');
      const streakData = this.calculateWritingStreak(sessions);
      
      return {
        // Statistiques de base
        totalWords: words.length,
        totalCharacters: content.length,
        totalSentences: sentences.length,
        totalParagraphs: paragraphs.length,
        
        // Statistiques temporelles
        writingTime: totalWritingTime,
        wordsPerMinute: averageWPM,
        dailyWordCount: dailyStats.words,
        weeklyWordCount: weeklyStats.words,
        monthlyWordCount: monthlyStats.words,
        
        // Analyse de contenu
        readabilityScore,
        vocabularyRichness,
        averageSentenceLength: sentences.length > 0 ? words.length / sentences.length : 0,
        averageWordLength: words.length > 0 ? content.replace(/\s/g, '').length / words.length : 0,
        
        // Analyse de style
        dialoguePercentage: styleAnalysis.dialogue,
        narrativePercentage: styleAnalysis.narrative,
        descriptionPercentage: styleAnalysis.description,
        
        // Tendances
        writingConsistency: consistency,
        progressTrend: trend,
        bestWritingTime,
        productiveDays,
        
        // Objectifs
        dailyGoal: currentGoal?.targetWords || 500,
        goalProgress: currentGoal ? (dailyStats.words / currentGoal.targetWords) * 100 : 0,
        streakDays: streakData.current,
        longestStreak: streakData.longest,
        
        // Métadonnées
        lastUpdated: serverTimestamp() as Timestamp,
        totalSessions: sessions.length,
        averageSessionLength: sessions.length > 0 ? totalWritingTime / sessions.length : 0,
      };
    } catch (error) {
      console.error('Erreur lors du calcul des statistiques:', error);
      throw error;
    }
  }
  
  /**
   * Créer ou mettre à jour un objectif d'écriture
   */
  static async setWritingGoal(
    userId: string,
    type: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'project',
    targetWords: number,
    bookId?: string,
    deadline?: Date
  ): Promise<string> {
    try {
      // Désactiver les anciens objectifs du même type
      const existingGoals = await this.getUserGoals(userId);
      const oldGoalsOfType = existingGoals.filter(g => g.type === type && g.isActive);
      
      for (const goal of oldGoalsOfType) {
        await updateDoc(doc(db, 'writingGoals', goal.id), {
          isActive: false,
          updatedAt: serverTimestamp()
        });
      }
      
      // Créer le nouveau objectif
      const goalData: Omit<WritingGoal, 'id'> = {
        userId,
        type,
        targetWords,
        currentWords: 0,
        deadline: deadline ? Timestamp.fromDate(deadline) : undefined,
        bookId,
        isActive: true,
        createdAt: serverTimestamp() as Timestamp
      };
      
      const goalsRef = collection(db, 'writingGoals');
      const goalDoc = await addDoc(goalsRef, goalData);
      
      return goalDoc.id;
    } catch (error) {
      console.error('Erreur lors de la création de l\'objectif:', error);
      throw error;
    }
  }
  
  /**
   * Enregistrer une session d'écriture
   */
  static async recordWritingSession(
    bookId: string,
    chapterId: string | undefined,
    startTime: Date,
    endTime: Date,
    wordsWritten: number,
    charactersWritten: number
  ): Promise<string> {
    try {
      const auth = getAuth(app);
      const user = auth.currentUser;
      if (!user) throw new Error('Utilisateur non authentifié');
      
      const timeSpent = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));
      const averageWPM = timeSpent > 0 ? wordsWritten / timeSpent : 0;
      
      // Déterminer la qualité de la session
      let quality: 'poor' | 'average' | 'good' | 'excellent' = 'average';
      if (averageWPM > 50) quality = 'excellent';
      else if (averageWPM > 30) quality = 'good';
      else if (averageWPM < 10) quality = 'poor';
      
      const sessionData: Omit<WritingSession, 'id'> = {
        bookId,
        chapterId,
        startTime: Timestamp.fromDate(startTime),
        endTime: Timestamp.fromDate(endTime),
        wordsWritten,
        charactersWritten,
        timeSpent,
        averageWPM,
        breaks: 0, // À implémenter selon les besoins
        quality
      };
      
      const sessionsRef = collection(db, 'writingSessions');
      const sessionDoc = await addDoc(sessionsRef, {
        ...sessionData,
        userId: user.uid
      });
      
      // Mettre à jour les objectifs
      await this.updateGoalsProgress(user.uid, wordsWritten);
      
      return sessionDoc.id;
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement de la session:', error);
      throw error;
    }
  }
  
  // ========== MÉTHODES PRIVÉES ==========
  
  private static extractWords(content: string): string[] {
    return content
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 0);
  }
  
  private static extractSentences(content: string): string[] {
    return content
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }
  
  private static calculateWordFrequency(words: string[]): Record<string, number> {
    const frequency: Record<string, number> = {};
    words.forEach(word => {
      frequency[word] = (frequency[word] || 0) + 1;
    });
    return frequency;
  }
  
  private static analyzeSentenceTypes(sentences: string[]): { simple: number; compound: number; complex: number; } {
    let simple = 0, compound = 0, complex = 0;
    
    sentences.forEach(sentence => {
      const words = sentence.split(/\s+/).length;
      const hasConjunctions = /\b(and|but|or|so|yet|for|nor)\b/i.test(sentence);
      const hasSubordinates = /\b(because|since|although|while|if|when|where|who|which|that)\b/i.test(sentence);
      
      if (hasSubordinates) {
        complex++;
      } else if (hasConjunctions || words > 15) {
        compound++;
      } else {
        simple++;
      }
    });
    
    return { simple, compound, complex };
  }
  
  private static analyzeSentiment(content: string): { positive: number; negative: number; neutral: number; } {
    // Analyse de sentiment basique avec des mots-clés
    const positiveWords = ['bon', 'bien', 'excellent', 'merveilleux', 'fantastique', 'joie', 'heureux', 'amour'];
    const negativeWords = ['mauvais', 'mal', 'terrible', 'horrible', 'triste', 'colère', 'haine', 'peur'];
    
    const words = content.toLowerCase().split(/\s+/);
    let positive = 0, negative = 0, neutral = 0;
    
    words.forEach(word => {
      if (positiveWords.some(pw => word.includes(pw))) {
        positive++;
      } else if (negativeWords.some(nw => word.includes(nw))) {
        negative++;
      } else {
        neutral++;
      }
    });
    
    const total = positive + negative + neutral;
    return {
      positive: total > 0 ? (positive / total) * 100 : 0,
      negative: total > 0 ? (negative / total) * 100 : 0,
      neutral: total > 0 ? (neutral / total) * 100 : 0
    };
  }
  
  private static generateSuggestions(content: string, analysis: any): WritingSuggestion[] {
    const suggestions: WritingSuggestion[] = [];
    
    // Vérifier la répétition de mots
    if (analysis.wordFrequency) {
      const overusedWords = Object.entries(analysis.wordFrequency)
        .filter(([word, count]: [string, any]) => count > 10 && word.length > 4)
        .slice(0, 3);
      
      overusedWords.forEach(([word]) => {
        suggestions.push({
          type: 'vocabulary',
          severity: 'medium',
          message: `Le mot "${word}" est utilisé très fréquemment`,
          suggestion: `Considérez utiliser des synonymes pour varier votre vocabulaire`
        });
      });
    }
    
    // Vérifier la longueur des phrases
    if (analysis.averageSentenceLength > 25) {
      suggestions.push({
        type: 'structure',
        severity: 'medium',
        message: 'Vos phrases sont généralement longues',
        suggestion: 'Essayez de diviser certaines phrases longues pour améliorer la lisibilité'
      });
    }
    
    // Vérifier la variété des structures
    if (analysis.sentenceTypes.simple / (analysis.sentenceTypes.compound + analysis.sentenceTypes.complex) > 3) {
      suggestions.push({
        type: 'style',
        severity: 'low',
        message: 'Votre écriture utilise principalement des phrases simples',
        suggestion: 'Ajoutez quelques phrases composées ou complexes pour enrichir votre style'
      });
    }
    
    return suggestions;
  }
  
  private static calculateReadabilityScore(content: string): number {
    // Formule de Flesch simplifiée adaptée au français
    const words = this.extractWords(content);
    const sentences = this.extractSentences(content);
    const syllables = words.reduce((sum, word) => sum + this.countSyllables(word), 0);
    
    if (sentences.length === 0 || words.length === 0) return 0;
    
    const avgWordsPerSentence = words.length / sentences.length;
    const avgSyllablesPerWord = syllables / words.length;
    
    // Score adapté (0-100, plus élevé = plus facile à lire)
    return Math.max(0, Math.min(100, 120 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord)));
  }
  
  private static countSyllables(word: string): number {
    // Comptage approximatif des syllabes en français
    return Math.max(1, word.toLowerCase().replace(/[^aeiouy]/g, '').length);
  }
  
  private static calculateVocabularyRichness(words: string[]): number {
    if (words.length === 0) return 0;
    const uniqueWords = new Set(words).size;
    return (uniqueWords / words.length) * 100;
  }
  
  private static analyzeWritingStyle(content: string): { dialogue: number; narrative: number; description: number; } {
    const lines = content.split('\n');
    let dialogue = 0, narrative = 0, description = 0;
    
    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed.includes('"') || trimmed.includes('«') || trimmed.includes('—')) {
        dialogue++;
      } else if (trimmed.includes('était') || trimmed.includes('avait') || /\b(il|elle|ils|elles)\b/.test(trimmed)) {
        narrative++;
      } else {
        description++;
      }
    });
    
    const total = dialogue + narrative + description;
    return {
      dialogue: total > 0 ? (dialogue / total) * 100 : 0,
      narrative: total > 0 ? (narrative / total) * 100 : 0,
      description: total > 0 ? (description / total) * 100 : 0
    };
  }
  
  private static async getWritingSessions(userId: string, bookId?: string): Promise<WritingSession[]> {
    try {
      const sessionsRef = collection(db, 'writingSessions');
      let q = query(
        sessionsRef,
        where('userId', '==', userId),
        orderBy('startTime', 'desc'),
        limit(100)
      );
      
      if (bookId) {
        q = query(
          sessionsRef,
          where('userId', '==', userId),
          where('bookId', '==', bookId),
          orderBy('startTime', 'desc'),
          limit(100)
        );
      }
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as WritingSession[];
    } catch (error) {
      console.error('Erreur lors de la récupération des sessions:', error);
      return [];
    }
  }
  
  private static async getUserContent(userId: string, bookId?: string): Promise<string> {
    try {
      let content = '';
      
      if (bookId) {
        // Récupérer le contenu d'un livre spécifique
        const bookDoc = await getDoc(doc(db, 'books', bookId));
        if (bookDoc.exists()) {
          content += bookDoc.data()?.body || '';
          
          // Récupérer les chapitres
          const chaptersQuery = query(
            collection(db, 'books', bookId, 'chapters'),
            orderBy('chapterNumber', 'asc')
          );
          const chaptersSnapshot = await getDocs(chaptersQuery);
          chaptersSnapshot.docs.forEach(chapterDoc => {
            content += '\n\n' + (chapterDoc.data()?.content || '');
          });
        }
      } else {
        // Récupérer tout le contenu de l'utilisateur
        const booksQuery = query(
          collection(db, 'books'),
          where('authorUid', '==', userId),
          limit(50)
        );
        const booksSnapshot = await getDocs(booksQuery);
        
        for (const bookDoc of booksSnapshot.docs) {
          content += bookDoc.data()?.body || '';
          
          // Récupérer les chapitres de chaque livre
          const chaptersQuery = query(
            collection(db, 'books', bookDoc.id, 'chapters'),
            orderBy('chapterNumber', 'asc')
          );
          const chaptersSnapshot = await getDocs(chaptersQuery);
          chaptersSnapshot.docs.forEach(chapterDoc => {
            content += '\n\n' + (chapterDoc.data()?.content || '');
          });
        }
      }
      
      return content;
    } catch (error) {
      console.error('Erreur lors de la récupération du contenu:', error);
      return '';
    }
  }
  
  private static calculatePeriodStats(sessions: WritingSession[], days: number): { words: number; time: number; } {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const periodSessions = sessions.filter(session => 
      session.startTime.toDate() >= cutoffDate
    );
    
    return {
      words: periodSessions.reduce((sum, session) => sum + session.wordsWritten, 0),
      time: periodSessions.reduce((sum, session) => sum + session.timeSpent, 0)
    };
  }
  
  private static calculateWritingConsistency(sessions: WritingSession[]): number {
    // Calculer la consistance basée sur la régularité des sessions
    if (sessions.length < 2) return 0;
    
    const dates = sessions.map(s => s.startTime.toDate().toDateString());
    const uniqueDates = new Set(dates);
    const totalDays = Math.max(1, (sessions[0].startTime.toDate().getTime() - sessions[sessions.length - 1].startTime.toDate().getTime()) / (1000 * 60 * 60 * 24));
    
    return Math.min(100, (uniqueDates.size / totalDays) * 100);
  }
  
  private static calculateProgressTrend(sessions: WritingSession[]): 'increasing' | 'decreasing' | 'stable' {
    if (sessions.length < 4) return 'stable';
    
    const recentSessions = sessions.slice(0, Math.floor(sessions.length / 2));
    const olderSessions = sessions.slice(Math.floor(sessions.length / 2));
    
    const recentAvg = recentSessions.reduce((sum, s) => sum + s.wordsWritten, 0) / recentSessions.length;
    const olderAvg = olderSessions.reduce((sum, s) => sum + s.wordsWritten, 0) / olderSessions.length;
    
    if (recentAvg > olderAvg * 1.1) return 'increasing';
    if (recentAvg < olderAvg * 0.9) return 'decreasing';
    return 'stable';
  }
  
  private static findBestWritingTime(sessions: WritingSession[]): string {
    const hourCounts: Record<string, number> = {};
    
    sessions.forEach(session => {
      const hour = session.startTime.toDate().getHours();
      const timeSlot = 
        hour < 6 ? 'Tôt le matin' :
        hour < 12 ? 'Matinée' :
        hour < 18 ? 'Après-midi' : 'Soirée';
      
      hourCounts[timeSlot] = (hourCounts[timeSlot] || 0) + session.wordsWritten;
    });
    
    return Object.entries(hourCounts).sort(([,a], [,b]) => b - a)[0]?.[0] || 'Indéterminé';
  }
  
  private static findProductiveDays(sessions: WritingSession[]): string[] {
    const dayWords: Record<string, number> = {};
    
    sessions.forEach(session => {
      const day = session.startTime.toDate().toLocaleDateString('fr-FR', { weekday: 'long' });
      dayWords[day] = (dayWords[day] || 0) + session.wordsWritten;
    });
    
    return Object.entries(dayWords)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([day]) => day);
  }
  
  private static calculateWritingStreak(sessions: WritingSession[]): { current: number; longest: number; } {
    if (sessions.length === 0) return { current: 0, longest: 0 };
    
    const sortedSessions = sessions.sort((a, b) => b.startTime.toDate().getTime() - a.startTime.toDate().getTime());
    const dates = [...new Set(sortedSessions.map(s => s.startTime.toDate().toDateString()))];
    
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 1;
    
    // Vérifier si aujourd'hui fait partie du streak actuel
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    
    if (dates[0] === today || dates[0] === yesterday) {
      currentStreak = 1;
      
      // Calculer le streak actuel
      for (let i = 1; i < dates.length; i++) {
        const currentDate = new Date(dates[i - 1]);
        const nextDate = new Date(dates[i]);
        const dayDiff = (currentDate.getTime() - nextDate.getTime()) / (1000 * 60 * 60 * 24);
        
        if (dayDiff === 1) {
          currentStreak++;
        } else {
          break;
        }
      }
    }
    
    // Calculer le plus long streak
    tempStreak = 1;
    for (let i = 1; i < dates.length; i++) {
      const currentDate = new Date(dates[i - 1]);
      const nextDate = new Date(dates[i]);
      const dayDiff = (currentDate.getTime() - nextDate.getTime()) / (1000 * 60 * 60 * 24);
      
      if (dayDiff === 1) {
        tempStreak++;
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak);
    
    return { current: currentStreak, longest: longestStreak };
  }
  
  private static async getUserGoals(userId: string): Promise<WritingGoal[]> {
    try {
      const goalsQuery = query(
        collection(db, 'writingGoals'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(goalsQuery);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as WritingGoal[];
    } catch (error) {
      console.error('Erreur lors de la récupération des objectifs:', error);
      return [];
    }
  }
  
  private static async updateGoalsProgress(userId: string, wordsWritten: number): Promise<void> {
    try {
      const goals = await this.getUserGoals(userId);
      const activeGoals = goals.filter(g => g.isActive);
      
      for (const goal of activeGoals) {
        const newWordCount = goal.currentWords + wordsWritten;
        await updateDoc(doc(db, 'writingGoals', goal.id), {
          currentWords: newWordCount,
          updatedAt: serverTimestamp(),
          ...(newWordCount >= goal.targetWords && { 
            completedAt: serverTimestamp(),
            isActive: false 
          })
        });
      }
    } catch (error) {
      console.warn('Erreur lors de la mise à jour des objectifs:', error);
    }
  }
}

export default WritingAnalyticsService;