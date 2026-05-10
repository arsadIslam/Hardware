/**
 * @format
 */

import { NavigationContainer, DefaultTheme, type Theme } from '@react-navigation/native';
import React from 'react';
import { StatusBar, StyleSheet, useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from './src/context/AuthContext';
import { AppNavigator } from './src/navigation/AppNavigator';

const navTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#f5f5f7',
  },
};

function App(): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider style={styles.root}>
        <AuthProvider>
          <NavigationContainer theme={navTheme}>
            <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
            <AppNavigator />
          </NavigationContainer>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f5f5f7',
  },
});

export default App;
