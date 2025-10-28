import React, { useEffect } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text as RNText } from 'react-native';

export default function WishlistBasketAnimation({ trigger, onEnd, count }: { trigger: boolean; onEnd?: () => void; count?: number }) {
  const anim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (trigger) {
      anim.setValue(0);
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: 500,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        })
      ]).start(() => onEnd && onEnd());
    }
  }, [trigger]);

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -40] });
  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.3] });

  return (
    <Animated.View style={[styles.basket, { transform: [{ translateY }, { scale }] }]}> 
      <Ionicons name="cart" size={40} color="#FFA94D" />
      {typeof count === 'number' && (
        <View style={styles.badge}>
          <RNText style={styles.badgeText}>{count}</RNText>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  basket: {
    position: 'absolute',
    top: 40,
    right: 40,
    zIndex: 100,
    backgroundColor: 'transparent',
    borderRadius: 32,
    padding: 0,
  },
  badge: {
    position: 'absolute',
    top: -10,
    right: -10,
    backgroundColor: '#FFA94D',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#fff',
  },
  badgeText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
