import { MaterialIcons } from '@expo/vector-icons'
import { router } from 'expo-router'
import React, { useEffect, useRef, useState } from 'react'
import { Dimensions, Image, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import AsyncStorage from '@react-native-async-storage/async-storage'

const { width, height } = Dimensions.get('screen')

const images = [
  require('../assets/images/woman-service.jpg'),
  require('../assets/images/bartender-working-club.jpg'),
  require('../assets/images/man-truck.jpg'),
  require('../assets/images/harvest.jpg'),
  require('../assets/images/woman-service.jpg'), // Duplicate for seamless loop
]

function WelcomeContent() {
  const scrollRef = useRef<ScrollView>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [imagesLoaded, setImagesLoaded] = useState(false)
  const insets = useSafeAreaInsets()

  useEffect(() => {
    const cacheImages = async () => {
      try {
        // Check if images are already cached
        const cached = await AsyncStorage.getItem('welcomeImagesCached')
        if (cached === 'true') {
          setImagesLoaded(true)
          return
        }
        
        // Preload and cache all images
        const prefetchPromises = images.map(image => 
          Image.prefetch(Image.resolveAssetSource(image).uri)
        )
        
        await Promise.all(prefetchPromises)
        await AsyncStorage.setItem('welcomeImagesCached', 'true')
        setImagesLoaded(true)
      } catch (error) {
        // Fallback: just load first image
        Image.prefetch(Image.resolveAssetSource(images[0]).uri).then(() => {
          setImagesLoaded(true)
        })
      }
    }
    
    cacheImages()
  }, [])

  // Removed image preloading effect

  useEffect(() => {
    // Delay auto-scroll to allow images to load
    const timeout = setTimeout(() => {
      const interval = setInterval(() => {
        setCurrentIndex(prev => {
          const nextIndex = prev + 1
          if (nextIndex >= images.length - 1) {
            scrollRef.current?.scrollTo({ x: nextIndex * width, animated: true })
            setTimeout(() => {
              scrollRef.current?.scrollTo({ x: 0, animated: false })
            }, 500)
            return 0
          } else {
            scrollRef.current?.scrollTo({ x: nextIndex * width, animated: true })
            return nextIndex
          }
        })
      }, 5000) // Reduced from 7000 to 5000
      return () => clearInterval(interval)
    }, 2000) // Wait 2 seconds before starting auto-scroll
    
    return () => clearTimeout(timeout)
  }, [])

  // Removed loading placeholder

  return (
    <View style={styles.container}>
      <StatusBar hidden={true} />
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        style={styles.carousel}
        contentContainerStyle={{ flexGrow: 1 }}
        decelerationRate="fast"
        snapToInterval={width}
        snapToAlignment="start"
        scrollEventThrottle={16}
      >
        {images.map((image, index) => (
          <View key={index} style={{ width: width, height: height, backgroundColor: '#667eea' }}>
            <Image
              source={image}
              style={styles.carouselImage}
              resizeMode="cover"
              defaultSource={require('../assets/images/mylogo.png')}
              cache="force-cache"
            />
          </View>
        ))}
      </ScrollView>
      <View style={styles.overlay}>
        <View style={styles.topSection}>
          <Image source={require('../assets/images/mylogo.png')} style={styles.logo} />
        </View>
        <View style={styles.bottomSection}>
          <Text style={styles.tagline}>RECEIVE TIPS INSTANTLY</Text>
          <Text style={styles.subtitle}>DIGITALLY WITH SECURE MOBILE PAYMENTS</Text>
          <View style={styles.dotsContainer}>
            {images.slice(0, -1).map((_, index) => (
              <View 
                key={index} 
                style={[
                  styles.dot, 
                  { backgroundColor: currentIndex === index ? '#fff' : 'rgba(255,255,255,0.4)' }
                ]} 
              />
            ))}
          </View>
          <TouchableOpacity
            style={styles.signInButton}
            onPress={() => router.push('/signup')}
          >
            <Text style={styles.signInText}>SIGN UP</Text>
            <MaterialIcons name="arrow-forward" size={20} color="#fff" style={styles.arrow} />
          </TouchableOpacity>
          <Text style={styles.signUpText}>
            ALREADY HAVE AN ACCOUNT? 
            <Text style={styles.signUpLink} onPress={() => router.push('/signin')}>SIGN IN</Text>
          </Text>
          <View style={styles.developerCredit}>
            <Image source={require('../assets/images/mylogo.png')} style={styles.creditLogo} />
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