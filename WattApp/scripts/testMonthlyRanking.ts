/**
 * Script de test pour générer le classement mensuel manuellement
 * Utile pour tester sans attendre le 1er du mois
 * 
 * Usage:
 * 1. Via l'app React Native:
 *    import './scripts/testMonthlyRanking';
 * 
 * 2. Via un bouton de debug dans l'app
 */

import { MonthlyRankingService } from '../services/MonthlyRankingService';

export const testMonthlyRanking = async () => {
  console.log('🏆 === TEST CLASSEMENT MENSUEL ===');
  console.log('📅 Génération du classement...');
  
  try {
    // Générer le classement
    const ranking = await MonthlyRankingService.calculateMonthlyRanking();
    
    console.log('✅ Classement généré avec succès !');
    console.log('📊 Détails:');
    console.log(`   Mois: ${ranking.month}`);
    console.log(`   Année: ${ranking.year}`);
    console.log(`   ${ranking.monthNumber} (${MonthlyRankingService.getMonthName(ranking.monthNumber)})`);
    console.log('');
    
    if (ranking.topBook) {
      console.log('🥇 LIVRE DU MOIS:');
      console.log(`   📚 ${ranking.topBook.title}`);
      console.log(`   ✍️  par ${ranking.topBook.author}`);
      console.log(`   👁️  ${ranking.topBook.reads.toLocaleString()} lectures`);
      console.log(`   ⭐ ${ranking.topBook.avgRating.toFixed(1)} / 5`);
      console.log('');
    }
    
    console.log('🎖️ TOP 10:');
    ranking.topBooks.forEach((book, index) => {
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`;
      console.log(`   ${medal} ${book.title} - ${book.reads} lectures`);
    });
    
    console.log('');
    console.log('🎉 Test terminé avec succès !');
    console.log('💾 Données sauvegardées dans Firestore: monthlyRankings/' + ranking.month);
    
    return ranking;
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
    throw error;
  }
};

// Auto-exécution si importé directement
if (require.main === module) {
  testMonthlyRanking()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
