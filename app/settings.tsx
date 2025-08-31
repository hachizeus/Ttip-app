import React, { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, TextInput, Image } from 'react-native'
import { router } from 'expo-router'
import { getCurrentUser } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { MaterialIcons } from '@expo/vector-icons'
import { useTheme, ThemeProvider } from '../lib/theme-context'
import * as ImagePicker from 'expo-image-picker'
import * as FileSystem from 'expo-file-system'

function SettingsContent() {
  const { colors } = useTheme()
  const [userPhone, setUserPhone] = useState('')
  const [name, setName] = useState('')
  const [occupation, setOccupation] = useState('')
  const [bio, setBio] = useState('')
  const [profileImage, setProfileImage] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadUserData()
  }, [])

  const loadUserData = async () => {
    try {
      const phone = await getCurrentUser()
      if (!phone) return
      
      setUserPhone(phone)

      const { data: worker, error } = await supabase
        .from('workers')
        .select('name, occupation, bio, profile_image_url')
        .eq('phone', phone)
        .maybeSingle()

      if (error) {
        console.error('Database error:', error)
        return
      }

      if (worker) {
        setName(worker.name || '')
        setOccupation(worker.occupation || '')
        setBio(worker.bio || '')
        setProfileImage(worker.profile_image_url || '')
      }
    } catch (error) {
      console.error('Error loading user data:', error)
    }
  }

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant permission to access photos')
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaType.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    })

    if (!result.canceled) {
      uploadImage(result.assets[0].uri)
    }
  }

  const uploadImage = async (uri: string) => {
    try {
      setLoading(true)
      
      const fileExt = uri.split('.').pop()
      const fileName = `${userPhone}/${Date.now()}.${fileExt}`
      
      const fileInfo = await FileSystem.getInfoAsync(uri)
      const formData = new FormData()
      
      formData.append('file', {
        uri,
        type: `image/${fileExt}`,
        name: fileName,
      } as any)

      const { data, error } = await supabase.storage
        .from('profile-images')
        .upload(fileName, formData, {
          contentType: `image/${fileExt}`,
          upsert: true
        })

      if (error) throw error

      const { data: { publicUrl } } = supabase.storage
        .from('profile-images')
        .getPublicUrl(fileName)

      setProfileImage(publicUrl)
      
      await supabase
        .from('workers')
        .update({ profile_image_url: publicUrl })
        .eq('phone', userPhone)

      Alert.alert('Success', 'Profile picture updated!')
    } catch (error) {
      console.error('Upload error:', error)
      Alert.alert('Error', 'Failed to upload image')
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    try {
      setLoading(true)
      
      const { error } = await supabase
        .from('workers')
        .update({
          name: name.trim(),
          occupation: occupation.trim(),
          bio: bio.trim(),
        })
        .eq('phone', userPhone)

      if (error) throw error
      
      Alert.alert('Success', 'Settings saved!')
      router.back()
    } catch (error) {
      Alert.alert('Error', 'Failed to save settings')
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Settings</Text>
        <TouchableOpacity onPress={saveSettings} style={styles.saveButton} disabled={loading}>
          <Text style={[styles.saveText, { color: colors.primary }]}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Profile Picture */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Profile Picture</Text>
          <TouchableOpacity onPress={pickImage} style={styles.imageContainer}>
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.profileImage} />
            ) : (
              <View style={[styles.placeholderImage, { backgroundColor: colors.border }]}>
                <MaterialIcons name="person" size={40} color={colors.textSecondary} />
              </View>
            )}
            <View style={[styles.editIcon, { backgroundColor: colors.primary }]}>
              <MaterialIcons name="edit" size={16} color="#fff" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Personal Info */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Personal Information</Text>
          
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Name</Text>
            <TextInput
              style={[styles.input, styles.readOnlyInput, { backgroundColor: colors.border, color: colors.textSecondary, borderColor: colors.border }]}
              value={name}
              placeholder="Name from signup"
              placeholderTextColor={colors.textSecondary}
              editable={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Occupation</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              value={occupation}
              onChangeText={setOccupation}
              placeholder="Enter your occupation"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Bio</Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              value={bio}
              onChangeText={setBio}
              placeholder="Tell us about yourself..."
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={4}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

export default function SettingsScreen() {
  return (
    <ThemeProvider>
      <SettingsContent />
    </ThemeProvider>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  saveButton: {
    padding: 4,
  },
  saveText: {
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  imageContainer: {
    alignSelf: 'center',
    position: 'relative',
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  placeholderImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    height: 100,
    textAlignVertical: 'top',
  },
  readOnlyInput: {
    opacity: 0.7,
  },
})