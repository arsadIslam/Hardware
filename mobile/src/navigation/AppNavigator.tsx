import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useAuth } from '../context/AuthContext';
import { AddProductScreen } from '../screens/AddProductScreen';
import { DashboardScreen } from '../screens/DashboardScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { ProductsScreen } from '../screens/ProductsScreen';
import type { RootStackParamList } from './types';

export type { RootStackParamList } from './types';

const Stack = createStackNavigator<RootStackParamList>();

export function AppNavigator(): React.JSX.Element {
  const { token, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator size="large" color="#6B5CE6" />
      </View>
    );
  }

  return (
    <Stack.Navigator
      key={token ? 'app' : 'auth'}
      screenOptions={{ headerShown: false }}>
      {token ? (
        <>
          <Stack.Screen name="Dashboard" component={DashboardScreen} />
          <Stack.Screen name="Products" component={ProductsScreen} />
          <Stack.Screen name="AddProduct" component={AddProductScreen} />
        </>
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} />
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f7',
  },
});
