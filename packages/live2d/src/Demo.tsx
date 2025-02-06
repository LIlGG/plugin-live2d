import React from 'react';
import ReactDOM from 'react-dom/client';
import { Live2dToggleComponent } from './components/Live2dToggle';

const rootEl = document.getElementById('root');
if (rootEl) {
  const root = ReactDOM.createRoot(rootEl);
  root.render(
    <React.StrictMode>
      <Live2dToggleComponent />
    </React.StrictMode>,
  );
}
