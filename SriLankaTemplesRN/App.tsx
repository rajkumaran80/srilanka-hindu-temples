import React from 'react';
import { Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import MapScreen from './src/screens/MapScreen';
import TourPlannerScreen from './src/screens/TourPlannerScreen';

const Stack = createNativeStackNavigator();

const App = () => {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Map"
          screenOptions={{
            headerStyle: {
              backgroundColor: '#2c3e50',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
              fontSize: Platform.OS === 'web' ? 18 : 16,
            },
          }}
        >
          <Stack.Screen
            name="Map"
            component={MapScreen}
            options={{
              title: 'Sri Lanka Hindu Temples',
              headerRight: () => null,
            }}
          />
          <Stack.Screen
            name="TourPlanner"
            component={TourPlannerScreen}
            options={{
              title: 'Temple Tour Planner',
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
};

export default App;
