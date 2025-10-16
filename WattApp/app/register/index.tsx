import React, { useState } from 'react';
import { getAuth, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import app, { db } from '../../constants/firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { useRouter } from 'expo-router';

const RegisterScreen: React.FC = () => {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [age, setAge] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [photoURL, setPhotoURL] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const auth = getAuth(app);

  const handleRegister = async () => {
    Keyboard.dismiss();
    setLoading(true);
    setError('');
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      // Ajoute l'utilisateur dans Firestore
      await addDoc(collection(db, 'users'), {
        mail: email,
        nom,
        prenom,
        age,
        pseudo: username,
        photoURL: photoURL || '',
        CreateAt: serverTimestamp(),
        LoginAt: serverTimestamp(),
        uid: user.uid,
      });
      // Mets à jour le profil Firebase Auth (displayName + photoURL)
      try {
        if (photoURL || username) {
          await updateProfile(user, {
            displayName: username || undefined,
            photoURL: photoURL || undefined,
          });
        }
      } catch (err) {
        // non-blocking: log
        console.warn('updateProfile error', err);
      }
      router.replace('../(tabs)'); // Redirige vers login après inscription
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Image source={require('../../assets/images/favicon.png')} style={styles.logo} />
      <Text style={styles.title}>Inscription</Text>
      <TextInput
        style={styles.input}
        placeholder="Nom d'utilisateur (pseudo)"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Nom"
        value={nom}
        onChangeText={setNom}
        autoCapitalize="words"
      />
      <TextInput
        style={styles.input}
        placeholder="Prénom"
        value={prenom}
        onChangeText={setPrenom}
        autoCapitalize="words"
      />
      <TextInput
        style={styles.input}
        placeholder="Âge"
        value={age}
        onChangeText={setAge}
        keyboardType="numeric"
      />
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Mot de passe"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <TextInput
        style={styles.input}
        placeholder="URL de la photo de profil (optionnel)"
        value={photoURL}
        onChangeText={setPhotoURL}
        autoCapitalize="none"
      />
      {error ? <Text style={{ color: 'red', marginBottom: 10 }}>{error}</Text> : null}
      <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? "Chargement..." : "S'inscrire"}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => router.back()}>
        <Text style={styles.link}>Déjà un compte ? Connecte-toi !</Text>
      </TouchableOpacity>
  </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#181818',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#FFA94D',
  },
  input: {
    width: '100%',
    height: 50,
    borderColor: '#FFA94D',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
    fontSize: 16,
    color: '#F5E9DA',
    backgroundColor: '#232323',
  },
  button: {
    backgroundColor: '#FFA94D',
    paddingVertical: 15,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  link: {
    color: '#FFA94D',
    fontSize: 16,
    marginTop: 10,
  },
});

export default RegisterScreen;
