import React, { useState, useEffect, useRef } from 'react';
import { View, Text } from 'react-native';

const TestHooks: React.FC = () => {
  const [a, setA] = useState(0);
  const [b, setB] = useState(0);
  const [c, setC] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    setA(1);
    setB(2);
    setC(3);
  }, []);

  useEffect(() => {
    // Just a dummy effect
  }, [a, b, c]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Test Hooks: {a}, {b}, {c}</Text>
    </View>
  );
};

export default TestHooks;
