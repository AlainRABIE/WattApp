
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getAuth } from 'firebase/auth';
import app from '../../constants/firebaseConfig';

const Home: React.FC = () => {
	const [email, setEmail] = useState('');
	const [displayName, setDisplayName] = useState('');

	useEffect(() => {
		const auth = getAuth(app);
		const user = auth.currentUser;
		if (user) {
			setEmail(user.email || '');
			setDisplayName(user.displayName || '');
		}
	}, []);

	return (
		<View style={styles.container}>
			<Text style={styles.text}>Email : {email}</Text>
			<Text style={styles.text}>Pseudo : {displayName}</Text>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#fff',
		alignItems: 'center',
		justifyContent: 'center',
	},
	text: {
		fontSize: 20,
		color: '#181818',
		marginBottom: 20,
	},
});

export default Home;
