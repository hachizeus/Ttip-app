import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import OfflineTipManager from '../lib/offline-tip-manager';
import { useTheme } from '../lib/theme-context';

interface OfflineTipModalProps {
  visible: boolean;
  onClose: () => void;
  workerId: string;
  workerName: string;
  isOnline: boolean;
}

export default function OfflineTipModal({ 
  visible, 
  onClose, 
  workerId, 
  workerName, 
  isOnline 
}: OfflineTipModalProps) {
  const { colors } = useTheme();
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleTip = async () => {
    console.log('🔥 handleTip called', { amount, phone, isOnline });
    
    if (!amount || !phone) {
      console.log('❌ Missing amount or phone');
      Alert.alert('Error', 'Please enter amount and phone number');
      return;
    }

    if (parseInt(amount) < 1 || parseInt(amount) > 10000) {
      console.log('❌ Invalid amount:', amount);
      Alert.alert('Error', 'Amount must be between 1 and 10,000 KSh');
      return;
    }

    console.log('⏳ Setting loading to true');
    setLoading(true);
    
    try {
      if (isOnline) {
        console.log('🌐 Processing online payment');
        const response = await fetch('https://ttip-app.onrender.com/api/stk-push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workerId,
            amount: parseInt(amount),
            customerPhone: phone
          })
        });
        
        const result = await response.json();
        console.log('💰 Payment result:', result);
        
        if (result.success) {
          console.log('✅ Payment successful');
          Alert.alert('Success', 'Payment request sent!', [
            { text: 'OK', onPress: () => {
              setAmount('');
              setPhone('');
              onClose();
            }}
          ]);
        } else {
          throw new Error(result.error || 'Payment failed');
        }
      } else {
        console.log('📱 Processing offline tip');
        const tipManager = OfflineTipManager.getInstance();
        
        await tipManager.queueTip({
          workerId,
          workerName,
          amount: parseInt(amount),
          customerPhone: phone
        });
        
        console.log('✅ Tip queued successfully');
        Alert.alert('Offline Mode', 'Tip queued successfully! \n\nWill process automatically when you\'re back online.', [
          { text: 'OK', onPress: () => {
            setAmount('');
            setPhone('');
            onClose();
          }}
        ]);
      }
    } catch (error) {
      console.log('❌ Error processing tip:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to process tip';
      Alert.alert('Error', errorMsg);
    } finally {
      console.log('✅ Setting loading to false');
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <TouchableOpacity 
        style={styles.overlay} 
        activeOpacity={1} 
        onPress={onClose}
      >
        <KeyboardAvoidingView 
          style={[styles.modal, { backgroundColor: colors.card }]}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>
              {isOnline ? '💰' : '📱'} Tip {workerName}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {!isOnline && (
            <View style={styles.offlineNotice}>
              <MaterialIcons name="wifi-off" size={20} color="#ff9800" />
              <Text style={styles.offlineText}>
                Offline mode - tip will process when online
              </Text>
            </View>
          )}

          <View style={styles.form}>
            <Text style={[styles.label, { color: colors.text }]}>Amount (KSh)</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.text }]}
              value={amount}
              onChangeText={setAmount}
              placeholder="Enter tip amount"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
            />

            <Text style={[styles.label, { color: colors.text }]}>Phone Number</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.text }]}
              value={phone}
              onChangeText={setPhone}
              placeholder="0712345678"
              placeholderTextColor={colors.textSecondary}
              keyboardType="phone-pad"
            />

            <TouchableOpacity
              style={[styles.tipButton, { backgroundColor: colors.primary }]}
              onPress={handleTip}
              disabled={loading}
            >
              <Text style={styles.tipButtonText}>
                {loading ? 'Processing...' : isOnline ? 'Send Tip' : 'Queue Tip'}
              </Text>
            </TouchableOpacity>
          </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    width: '100%',
    minHeight: '50%',
    maxHeight: '80%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  offlineNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3cd',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  offlineText: {
    marginLeft: 8,
    color: '#856404',
    fontSize: 14,
  },
  form: {
    gap: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  tipButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  tipButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});