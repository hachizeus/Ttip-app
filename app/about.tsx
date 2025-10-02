import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme-context';

export default function AboutScreen() {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>About TTip</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.logoSection}>
          <Image source={require('../assets/images/mylogo.png')} style={styles.appLogo} />
          <Text style={[styles.appName, { color: colors.text }]}>TTip</Text>
          <Text style={[styles.tagline, { color: colors.textSecondary }]}>Digital Tipping Made Easy</Text>
          <Text style={[styles.version, { color: colors.textSecondary }]}>Version 1.0.0</Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>What is TTip?</Text>
          <Text style={[styles.text, { color: colors.text }]}>
            TTip is Kenya's leading digital tipping platform that enables customers to send tips directly to service workers through M-Pesa. Our mission is to make tipping convenient, secure, and instant.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Key Features</Text>
          <View style={styles.featureList}>
            <View style={styles.feature}>
              <MaterialIcons name="qr-code" size={20} color={colors.primary} />
              <Text style={[styles.featureText, { color: colors.text }]}>QR Code Tipping</Text>
            </View>
            <View style={styles.feature}>
              <MaterialIcons name="security" size={20} color={colors.primary} />
              <Text style={[styles.featureText, { color: colors.text }]}>Secure M-Pesa Integration</Text>
            </View>
            <View style={styles.feature}>
              <MaterialIcons name="analytics" size={20} color={colors.primary} />
              <Text style={[styles.featureText, { color: colors.text }]}>Real-time Analytics</Text>
            </View>
            <View style={styles.feature}>
              <MaterialIcons name="offline-bolt" size={20} color={colors.primary} />
              <Text style={[styles.featureText, { color: colors.text }]}>Offline Support</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Contact Us</Text>
          <Text style={[styles.text, { color: colors.text }]}>
            Email: support@ttip.app{'\n'}
            Phone: +254 700 000 000{'\n'}
            Website: www.ttip.app
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Developed by</Text>
          <View style={styles.developerSection}>
            <Image source={require('../assets/images/mylogo.png')} style={styles.developerLogo} />
            <Text style={[styles.text, { color: colors.text }]}>ElitJohns Digital Services</Text>
          </View>
          <Text style={[styles.copyrightText, { color: colors.textSecondary }]}>Nairobi, Kenya{'\n'}© 2024 All rights reserved</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  appLogo: {
    width: 120,
    height: 40,
    resizeMode: 'contain',
    marginBottom: 15,
  },
  logoText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  tagline: {
    fontSize: 16,
    marginBottom: 10,
  },
  version: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  text: {
    fontSize: 16,
    lineHeight: 24,
  },
  featureList: {
    gap: 12,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    fontSize: 16,
  },
  developerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    gap: 12,
  },
  developerLogo: {
    width: 40,
    height: 13,
    resizeMode: 'contain',
  },
  elitLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  elitLogoText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  copyrightText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
  },
});