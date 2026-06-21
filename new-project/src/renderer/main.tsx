// রেন্ডারার এন্ট্রি পয়েন্ট — Chrome-অভিন্ন UI শেল (React) DOM-এ মাউন্ট করে।
import { createRoot } from 'react-dom/client';
import { App } from './App';

const container = document.getElementById('root');
if (container === null) {
  throw new Error('Root element (#root) পাওয়া যায়নি।');
}
createRoot(container).render(<App />);
