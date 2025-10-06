import { MaterialIcons } from '@expo/vector-icons'
import { Image } from 'expo-image'
import { router } from 'expo-router'
import React, { useEffect, useRef, useState } from 'react'
import { Dimensions, StatusBar, StyleSheet, Text, TouchableOpacity, View, Animated, PanResponder } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { BannerImage, fetchBannerImages } from '../services/bannerService'

const { width, height } = Dimensions.get('screen')

function WelcomeContent() {
  const scrollX = useRef(new Animated.Value(0)).current
  const [currentIndex, setCurrentIndex] = useState(0)
  const [images, setImages] = useState<BannerImage[]>([])
  const [imagesLoaded, setImagesLoaded] = useState(false)
  const [autoScrollStopped, setAutoScrollStopped] = useState(false)
  const [autoScrollCompleted, setAutoScrollCompleted] = useState(false)

  const insets = useSafeAreaInsets()

  useEffect(() => {
    const loadBanners = async () => {
      const banners = await fetchBannerImages()
      console.log('Loaded banners:', banners)
      setImages(banners) // Use original banners without duplication
      setImagesLoaded(true)
    }
    loadBanners()
  }, [])

  useEffect(() => {
    if (!imagesLoaded || images.length === 0 || autoScrollCompleted) return
    
    const interval = setInterval(() => {
      setCurrentIndex(prev => {
        const nextIndex = prev + 1
        if (nextIndex >= images.length) {
          Animated.timing(scrollX, {
            toValue: -(images.length - 1) * width,
            duration: 300,
            useNativeDriver: true
          }).start()
          setAutoScrollStopped(true)
          setAutoScrollCompleted(true)
          return images.length - 1
        } else {
          Animated.timing(scrollX, {
            toValue: -nextIndex * width,
            duration: 300,
            useNativeDriver: true
          }).start()
          return nextIndex
        }
      })
    }, 3000)

    return () => clearInterval(interval)
  }, [imagesLoaded, images.length, autoScrollCompleted])

  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, gestureState) => {
      return Math.abs(gestureState.dx) > 10
    },
    onPanResponderMove: (_, gestureState) => {
      const newValue = -currentIndex * width + gestureState.dx
      const maxValue = 0
      const minValue = -(images.length - 1) * width
      
      if (newValue <= maxValue && newValue >= minValue) {
        scrollX.setValue(newValue)
      }
    },
    onPanResponderRelease: (_, gestureState) => {
      const threshold = width * 0.3
      let targetIndex = currentIndex
      
      if (gestureState.dx > threshold && currentIndex > 0) {
        targetIndex = currentIndex - 1
      } else if (gestureState.dx < -threshold && currentIndex < images.length - 1) {
        targetIndex = currentIndex + 1
      }
      
      Animated.timing(scrollX, {
        toValue: -targetIndex * width,
        duration: 300,
        useNativeDriver: true
      }).start()
      
      setCurrentIndex(targetIndex)
    }
  })

  return (
    <View style={styles.container}>
      <StatusBar hidden={true} />
      <View style={styles.carousel} {...panResponder.panHandlers}>
        <Animated.View 
          style={[
            styles.carouselContainer,
            {
              transform: [{ translateX: scrollX }],
              width: width * images.length
            }
          ]}
        >
          {images.length > 0 ? images.map((banner, index) => (
            <Image 
              key={`${banner.id}-${index}`}
              source={{ uri: banner.url }}
              style={styles.carouselImage} 
              contentFit="cover"
              transition={200}
              cachePolicy="memory-disk"
            />
          )) : (
            <View style={[{ width: width, height: height }, styles.imagePlaceholder]} />
          )}
        </Animated.View>
      </View>
      
      <View style={styles.overlay} pointerEvents="box-none">
        <View style={styles.topSection}>
          <Image 
            source={{ uri: 'https://cpbonffjhrckiiqbsopt.supabase.co/storage/v1/object/public/banners/mylogo.png' }}
            style={styles.logo}
            contentFit="contain"
            cachePolicy="memory-disk"
          />
        </View>
        
        <View style={styles.bottomSection} pointerEvents="box-none">
          <Text style={styles.tagline}>RECEIVE TIPS INSTANTLY</Text>
          <Text style={styles.subtitle}>DIGITALLY WITH SECURE MOBILE PAYMENTS</Text>
          
          <View style={styles.dotsContainer}>
            {images.map((_, index) => (
              <View 
                key={index} 
                style={[
                  styles.dot, 
                  { backgroundColor: currentIndex === index ? '#fff' : 'rgba(255,255,255,0.4)' }
                ]} 
              />
            ))}
          </View>
          
          <View pointerEvents="auto">
            <TouchableOpacity
              style={styles.signInButton}
              onPress={() => router.push('/signup')}
            >
              <Text style={styles.signInText}>SIGN UP</Text>
              <MaterialIcons name="arrow-forward" size={20} color="#fff" style={styles.arrow} />
            </TouchableOpacity>
          </View>
          
          <View pointerEvents="auto">
            <Text style={styles.signUpText}>
              ALREADY HAVE AN ACCOUNT? 
              <Text style={styles.signUpLink} onPress={() => router.push('/signin')}>SIGN IN</Text>
            </Text>
          </View>
          
          <View style={styles.developerCredit}>
            <Image 
              source={{ uri: 'https://cpbonffjhrckiiqbsopt.supabase.co/storage/v1/object/public/banners/mylogo.png' }}
              style={styles.creditLogo}
              contentFit="contain"
              cachePolicy="memory-disk"
            />
            <Text style={styles.creditText}>Developed by ElitJohns Digital Services</Text>
          </View>
        </View>
      </View>
    </View>
  )
}

export default function WelcomeScreen() {
  return <WelcomeContent />
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  carousel: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    margin: 0,
    padding: 0,
    overflow: 'hidden',
  },
  carouselContainer: {
    flexDirection: 'row',
    height: height,
  },
  carouselImage: {
    width: width,
    height: height,
    resizeMode: 'cover',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  topSection: {
    alignItems: 'center',
    paddingTop: 60,
  },
  logo: {
    width: 120,
    height: 40,
    resizeMode: 'contain',
  },
  bottomSection: {
    paddingHorizontal: 24,
    paddingBottom: 60,
    alignItems: 'center',
  },
  tagline: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 1,
  },
  subtitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 30,
    letterSpacing: 1,
  },
  dotsContainer: {
    flexDirection: 'row',
    marginBottom: 40,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  signInButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 80,
    borderRadius: 25,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  signInText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
  signUpText: {
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
  signUpLink: {
    textDecorationLine: 'underline',
    fontWeight: '700',
    color: '#FF6B00',
  },
  arrow: {
    position: 'absolute',
    right: 20,
  },
  developerCredit: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 30,
    gap: 8,
  },
  creditLogo: {
    width: 30,
    height: 10,
    resizeMode: 'contain',
  },
  creditText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
  },
  imagePlaceholder: {
    backgroundColor: '#1a1a1a',
  },
})