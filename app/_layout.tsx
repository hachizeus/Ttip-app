import { Stack } from 'expo-router';

export default function RootLayout() {

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'fade_from_bottom',
        animationDuration: 150,
        gestureEnabled: true,
        presentation: 'transparentModal',
      }}
    />
  );
}