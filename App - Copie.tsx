// App.tsx
import 'react-native-gesture-handler'; // DOIT ÊTRE EN PREMIER
import React from 'react';
import AppNavigator from './src/navigation/AppNavigator';

function App(): React.JSX.Element {
  return <AppNavigator />;
}

export default App;