import { createRoot } from 'react-dom/client';
import App from './app';
import './style/fonts.css';
import './style/tailwind.css';
import './style/global.css';
import './style/scrollbar.css';
import * as envs from '~/env';

if (envs.NODE_ENV === 'development') {
  console.log('Development env vars:', JSON.stringify(envs, null, 2));
}

const root = createRoot(document.getElementById('container')!);
root.render(<App />);
