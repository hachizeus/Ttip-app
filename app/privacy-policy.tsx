import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme-context';

export default function PrivacyPolicyScreen() {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Privacy Policy</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.lastUpdated, { color: colors.textSecondary }]}>
          Last updated: {new Date().toLocaleDateString()}
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Information We Collect</Text>
        <Text style={[styles.text, { color: colors.text }]}>
          • Phone number for account creation and M-Pesa transactions{'\n'}
          • Name and occupation for profile display{'\n'}
          • Transaction data for tip processing{'\n'}
          • Device information for security purposes
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>How We Use Your Information</Text>
        <Text style={[styles.text, { color: colors.text }]}>
          • Process digital tip transactions{'\n'}
          • Maintain your account and provide customer support{'\n'}
          • Send transaction notifications{'\n'}
          • Improve our services and user experience
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Data Security</Text>
        <Text style={[styles.text, { color: colors.text }]}>
          We implement industry-standard security measures including:{'\n'}
          • Data encryption in transit and at rest{'\n'}
          • Biometric authentication options{'\n'}
          • Secure token-based authentication{'\n'}
          • Regular security audits
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Data Sharing</Text>
        <Text style={[styles.text, { color: colors.text }]}>
          We do not sell or share your personal information with third parties except:{'\n'}
          • With M-Pesa for payment processing{'\n'}
          • When required by law{'\n'}
          • With your explicit consent
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Rights</Text>
        <Text style={[styles.text, { color: colors.text }]}>
          You have the right to:{'\n'}
          • Access your personal data{'\n'}
          • Correct inaccurate information{'\n'}
          • Delete your account and data{'\n'}
          • Withdraw consent at any time
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Contact Us</Text>
        <Text style={[styles.text, { color: colors.text }]}>
          If you have questions about this Privacy Policy, contact us at:{'\n'}
          Email: privacy@ttip.app{'\n'}
          Phone: +254 700 000 000
        </Text>
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
  lastUpdated: {
    fontSize: 14,
    marginBottom: 20,
    fontStyle: 'italic',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
  },
  text: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 15,
  },
});