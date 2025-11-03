import React, { useEffect, useState } from 'react';
import { View, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getAuth } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../constants/firebaseConfig';
import PDFReader from '../../components/PDFReader';
import { NativePDFService, PDFBookData } from '../../services/NativePDFService';

type BookType = {
  id: string;
  type?: string;
  ownerUid?: string;
  authorUid?: string;
  filePath?: string;
  titre?: string;
  title?: string;
  [key: string]: any;
};

export default function PDFReadPage() {
  const router = useRouter();
  const { bookId, localPath } = useLocalSearchParams();
  const [bookData, setBookData] = useState<BookType | null>(null);
  const [localBookData, setLocalBookData] = useState<PDFBookData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadBook = async () => {
      try {
        // Si un chemin local est fourni, c'est un livre local
        if (localPath && typeof localPath === 'string') {
          const decodedPath = decodeURIComponent(localPath);
          const localBook = await NativePDFService.getLocalBook(bookId as string);
          
          if (localBook) {
            setLocalBookData(localBook);
            setBookData({
              id: localBook.id,
              type: 'pdf',
              filePath: localBook.filePath,
              titre: localBook.title,
              title: localBook.title,
            });
          } else {
            Alert.alert('Erreur', 'Ce livre local est introuvable');
            router.back();
            return;
          }
        } else {
          // Livre Firebase classique
          const auth = getAuth();
          const user = auth.currentUser;
        
          if (!user) {
            Alert.alert('Erreur', 'Vous devez être connecté pour lire ce livre');
            router.back();
            return;
          }

          if (!bookId || typeof bookId !== 'string') {
            Alert.alert('Erreur', 'Livre introuvable');
            router.back();
            return;
          }

          // Charger les données du livre depuis Firebase
          const bookRef = doc(db, 'books', bookId);
          const bookSnap = await getDoc(bookRef);

          if (!bookSnap.exists()) {
            Alert.alert('Erreur', 'Ce livre n\'existe plus');
            router.back();
            return;
          }

          const book: BookType = { id: bookSnap.id, ...bookSnap.data() };

          // Vérifier que c'est bien un PDF et que l'utilisateur peut y accéder
          if (book.type !== 'pdf') {
            Alert.alert('Erreur', 'Ce n\'est pas un fichier PDF');
            router.back();
            return;
          }

          if (book.ownerUid !== user.uid && book.authorUid !== user.uid) {
            Alert.alert('Erreur', 'Vous n\'avez pas accès à ce livre');
            router.back();
            return;
          }

          if (!book.filePath) {
            Alert.alert('Erreur', 'Le fichier PDF est introuvable');
            router.back();
            return;
          }

          setBookData(book);
        }
      } catch (error) {
        console.error('Erreur lors du chargement du livre:', error);
        Alert.alert('Erreur', 'Impossible de charger le livre');
        router.back();
      } finally {
        setLoading(false);
      }
    };

    loadBook();
  }, [bookId]);

  if (loading || !bookData || !bookData.filePath) {
    return <View style={{ flex: 1, backgroundColor: '#1a1a1a' }} />;
  }

  return (
    <PDFReader
      source={{ uri: bookData.filePath }}
      title={bookData.titre || bookData.title || 'PDF'}
      pagesImagePaths={localBookData?.pagesImagePaths}
      totalPages={localBookData?.totalPages}
    />
  );
}