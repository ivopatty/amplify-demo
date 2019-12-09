import { dark as lightTheme, mapping } from '@eva-design/eva';
import Amplify from 'aws-amplify';
import React from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import { ApplicationProvider, Layout } from 'react-native-ui-kitten';
import awsconfig from './aws-exports';
import ToDoList from './src/ToDoList';

Amplify.configure(awsconfig);

export default function App() {
  return (
    <ApplicationProvider mapping={mapping} theme={lightTheme}>
      <Layout style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <SafeAreaView>
          <ToDoList/>
        </SafeAreaView>
      </Layout>
    </ApplicationProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
