export const getUrl = async () => {
  let configUrl = './public/config.json';
  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
    configUrl = './public/config-local.json';
  }
  try {
    const response = await fetch(configUrl); // Load from public/config.json
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

const backendUrl = (await getUrl()) || 'http://localhost:8080';

export const Properties = {
  backendUrl: backendUrl,

  chatStreamingUrl: backendUrl + '/assistant/chat/streaming',
  chatStreamingMultipartUrl: backendUrl + '/assistant/chat/streamingWithFileUpload',
  adminAssistantUrl: backendUrl + '/admin/assistant',
  knowledgeSourceUrl: backendUrl + '/admin/assistant/retrieverConnection',
  llmUrl: backendUrl + '/admin/assistant/llm',

  // TODO: Create a real auth URL that points to info on the user
  authUrl: backendUrl + '/admin/assistant',
};
