import '@app/app.css';
import '@patternfly/react-core/dist/styles/base.css';
import '@patternfly/chatbot/dist/css/main.css';

import * as React from 'react';

import { RouterProvider } from 'react-router-dom';
import { router } from '@app/routes';

const App: React.FunctionComponent = () => {
  const [config, setConfig] = React.useState(null);

  React.useEffect(() => {
    fetch('/public/config.json')
      .then((response) => {
        console.log(response);
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        console.log(response);
        return response.json();
      })
      .then((data) => setConfig(data))
      .catch((error) => console.error('Error loading config:', error));
  }, []);

  return (
    <div>
      <RouterProvider router={router} />
    </div>
  );
};

export default App;
