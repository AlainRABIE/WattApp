import { collection, getDocs, query, where } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../../constants/firebaseConfig';

export async function getWishlistBooks() {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) return [];
  // Récupérer les entrées wishlist de l'utilisateur
  const q = query(collection(db, 'wishlist'), where('uid', '==', user.uid));
  const snap = await getDocs(q);
  const wishlist = snap.docs.map(doc => doc.data().bookId);
  if (!wishlist.length) return [];
  // Récupérer les livres correspondants
  const booksSnap = await getDocs(collection(db, 'books'));
  return booksSnap.docs
    .filter(doc => wishlist.includes(doc.id))
    .map(doc => ({ id: doc.id, ...doc.data() }));
}

// Export par défaut pour éviter les warnings de routing
export default { getWishlistBooks };
