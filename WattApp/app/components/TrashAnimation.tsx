import React, { useEffect } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function TrashAnimation({ trigger, onEnd }: { trigger: boolean; onEnd?: () => void }) {
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
    <Animated.View style={[styles.trash, { transform: [{ translateY }, { scale }] }]}> 
      <Ionicons name="trash" size={40} color="#FF4D4D" />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  trash: {
    position: 'absolute',
    top: 40,
    left: 40,
    zIndex: 100,
    backgroundColor: 'transparent',
    borderRadius: 32,
    padding: 0,
  },
});
