import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SQLiteProvider } from 'expo-sqlite';

import { initDb } from './db';
import HomeScreen from './HomeScreen';
import EditNoteScreen from './EditNoteScreen';
import NoteDetailScreen from './NoteDetailScreen';
import SettingsScreen from './SettingsScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    // SQLiteProvider opens the database and runs initDb once.
    <SQLiteProvider databaseName="journal.db" onInit={initDb}>
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'My Journal' }} />
          <Stack.Screen name="EditNote" component={EditNoteScreen} />
          <Stack.Screen name="NoteDetail" component={NoteDetailScreen} options={{ title: 'Note' }} />
          <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
        </Stack.Navigator>
      </NavigationContainer>
    </SQLiteProvider>
  );
}