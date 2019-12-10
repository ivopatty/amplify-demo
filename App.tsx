import { dark as lightTheme, mapping } from '@eva-design/eva';
import { EvaIconsPack } from '@ui-kitten/eva-icons';
import Amplify from 'aws-amplify';
import React from 'react';
import { SafeAreaView } from 'react-native';
import { ApplicationProvider, IconRegistry, Layout } from '@ui-kitten/components';
import awsconfig from './aws-exports';
import ToDoList from './src/ToDoList';

Amplify.configure(awsconfig);

export default function App() {
  return (
    <ApplicationProvider mapping={mapping} theme={lightTheme}>
      <IconRegistry icons={EvaIconsPack} />
      <Layout style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <SafeAreaView>
          <ToDoList/>
        </SafeAreaView>
      </Layout>
    </ApplicationProvider>
  );
}
