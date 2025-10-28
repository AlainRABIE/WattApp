import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface StarRatingProps {
  rating: number;
  maxStars?: number;
  onRate?: (rating: number) => void;
  size?: number;
  disabled?: boolean;
}

const StarRating: React.FC<StarRatingProps> = ({ rating, maxStars = 5, onRate, size = 28, disabled = false }) => {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {Array.from({ length: maxStars }).map((_, i) => {
        const filled = i < rating;
        return (
          <TouchableOpacity
            key={i}
            onPress={() => !disabled && onRate && onRate(i + 1)}
            activeOpacity={disabled ? 1 : 0.7}
            disabled={disabled}
          >
            <Ionicons
              name={filled ? 'star' : 'star-outline'}
              size={size}
              color={filled ? '#FFA94D' : '#888'}
              style={{ marginHorizontal: 2 }}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

export default StarRating;
