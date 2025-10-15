import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useRouter } from 'expo-router';

const LoginScreen: React.FC = () => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <View style={styles.container}>
      <Image source={require('../../assets/images/favicon.png')} style={styles.logo} />
      <Text style={styles.title}>Connexion</Text>
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
      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>Se connecter</Text>
      </TouchableOpacity>
  <TouchableOpacity onPress={() => router.push('../register')}>
        <Text style={styles.link}>Pas de compte ? Inscris-toi !</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  backgroundColor: '#181818', // noir profond
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
  color: '#FFA94D', // orange doux
  },
  input: {
    width: '100%',
    height: 50,
  borderColor: '#FFA94D', // orange doux
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
    fontSize: 16,
    color: '#F5E9DA', // texte sable
    backgroundColor: '#232323', // gris très foncé
  },
  button: {
  backgroundColor: '#FFA94D', // orange doux
    paddingVertical: 15,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonText: {
  color: '#fff', // texte blanc sur bouton orange
    fontSize: 18,
    fontWeight: 'bold',
  },
  link: {
  color: '#FFA94D', // orange doux
    fontSize: 16,
    marginTop: 10,
  },
});

export default LoginScreen;
