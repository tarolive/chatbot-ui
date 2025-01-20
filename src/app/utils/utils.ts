import { CannedChatbot } from '@app/types/CannedChatbot';
import { json } from 'react-router-dom';

/** Used in chatbots */
export const ERROR_TITLE = {
  'Error: 404': '404: Network error',
  'Error: 500': 'Server error',
  'Error: Other': 'Error',
};

export const getId = () => {
  const date = Date.now() + Math.random();
  return date.toString();
};

export const getUrl = async () => {
  try {
    const response = await fetch('./public/config.json'); // Load from public/config.json
    if (!response.ok) {
      throw new Error('Failed to load config');
    }
    const config = await response.json();
    const url = config.REACT_APP_BASE_URL;

    if (!url) {
      throw new Error('API URL is not configured.');
    }

    return url;
  } catch (error) {
    console.error('Error fetching chatbots:', error);
    throw error;
  }
};

export const getChatbots = async () => {
  const url = (await getUrl()) + '/admin/assistant' || '';
  if (url === '') {
    throw json({ status: 'Misconfigured' });
  }
  return fetch(url)
    .then((res) => {
      if (res.ok) {
        return res.json();
      }
      switch (res.status) {
        case 401:
          throw json({ status: 401 });
        case 403:
          throw json({ status: 403 });
        case 503:
          throw json({ status: 503 });
        default:
          throw json({ status: 500 });
      }
    })
    .then((data: CannedChatbot[]) => {
      return data;
    });
};

export async function chatbotLoader() {
  const chatbots = await getChatbots();
  return { chatbots };
}
