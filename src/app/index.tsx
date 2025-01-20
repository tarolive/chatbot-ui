import '@app/app.css';
import '@patternfly/react-core/dist/styles/base.css';
import '@patternfly/chatbot/dist/css/main.css';

import * as React from 'react';

import { RouterProvider } from 'react-router-dom';
import { router } from '@app/routes';
import { useConfig } from '../ConfigContext';

const App: React.FunctionComponent = () => {
  const globalConfig = useConfig();

  if (!globalConfig) {
    return (
      <div style={{ textAlign: 'center', marginTop: '20px' }}>
        <p>Loading configuration...</p>
      </div>
    );
  }

  return (
    <div>
      <div>
        <RouterProvider router={router} />
      </div>
    </div>
  );
};

export default App;
