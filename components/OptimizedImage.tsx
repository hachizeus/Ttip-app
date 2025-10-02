import React, { useState, useCallback, memo } from 'react';
import { Image, ImageProps, View, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface OptimizedImageProps extends Omit<ImageProps, 'source'> {
  source: { uri: string } | number;
  placeholder?: React.ReactNode;
  errorComponent?: React.ReactNode;
  lazy?: boolean;
}

const OptimizedImage: React.FC<OptimizedImageProps> = memo(({
  source,
  placeholder,
  errorComponent,
  lazy = false,
  style,
  ...props
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [shouldLoad, setShouldLoad] = useState(!lazy);

  const handleLoadStart = useCallback(() => {
    setLoading(true);
    setError(false);
  }, []);

  const handleLoadEnd = useCallback(() => {
    setLoading(false);
  }, []);

  const handleError = useCallback(() => {
    setLoading(false);
    setError(true);
  }, []);

  const handleLayout = useCallback(() => {
    if (lazy && !shouldLoad) {
      setShouldLoad(true);
    }
  }, [lazy, shouldLoad]);

  if (!shouldLoad) {
    return (
      <View style={style} onLayout={handleLayout}>
        {placeholder || <ActivityIndicator size="small" color="#007AFF" />}
      </View>
    );
  }

  if (error) {
    return (
      <View style={[style, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f0f0' }]}>
        {errorComponent || <MaterialIcons name="broken-image" size={24} color="#999" />}
      </View>
    );
  }

  return (
    <View style={style}>
      <Image
        {...props}
        source={source}
        style={style}
        onLoadStart={handleLoadStart}
        onLoadEnd={handleLoadEnd}
        onError={handleError}
      />
      {loading && (
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'rgba(255,255,255,0.8)'
        }}>
          {placeholder || <ActivityIndicator size="small" color="#007AFF" />}
        </View>
      )}
    </View>
  );
});

export default OptimizedImage;