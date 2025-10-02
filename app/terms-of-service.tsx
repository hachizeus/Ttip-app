import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme-context';

export default function TermsOfServiceScreen() {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Terms of Service</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.lastUpdated, { color: colors.textSecondary }]}>
          Last updated: {new Date().toLocaleDateString()}
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Acceptance of Terms</Text>
        <Text style={[styles.text, { color: colors.text }]}>
          By using TTip, you agree to these Terms of Service. If you do not agree, please do not use our service.
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Service Description</Text>
        <Text style={[styles.text, { color: colors.text }]}>
          TTip is a digital tipping platform that enables customers to send tips to service workers via M-Pesa mobile payments.
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>User Responsibilities</Text>
        <Text style={[styles.text, { color: colors.text }]}>
          • Provide accurate account information{'\n'}
          • Use the service lawfully and respectfully{'\n'}
          • Protect your account credentials{'\n'}
          • Report suspicious activity immediately
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Payment Terms</Text>
        <Text style={[styles.text, { color: colors.text }]}>
          • All payments are processed through M-Pesa{'\n'}
          • Transaction fees may apply{'\n'}
          • Tips are final and non-refundable{'\n'}
          • Subscription fees are charged monthly
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Prohibited Activities</Text>
        <Text style={[styles.text, { color: colors.text }]}>
          • Fraudulent transactions{'\n'}
          • Harassment or abuse of other users{'\n'}
          • Violation of applicable laws{'\n'}
          • Unauthorized access to accounts
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Limitation of Liability</Text>
        <Text style={[styles.text, { color: colors.text }]}>
          TTip is not liable for indirect, incidental, or consequential damages arising from use of our service.
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Termination</Text>
        <Text style={[styles.text, { color: colors.text }]}>
          We may terminate accounts that violate these terms. Users may delete their accounts at any time.
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Contact Information</Text>
        <Text style={[styles.text, { color: colors.text }]}>
          For questions about these Terms:{'\n'}
          Email: legal@ttip.app{'\n'}
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