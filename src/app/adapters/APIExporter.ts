import {
  AssistantAdminApi,
  AssistantApi,
  AssistantMultipartApi,
  Configuration,
  ContentRetrieverConnectionAdminApi,
  LLMConnectionAdminApi,
} from 'src/sdk';

import { Properties } from '@app/Properties';

const apiConfig: Configuration = new Configuration({ basePath: Properties.backendUrl });
const authenticateUrl = Properties.authUrl;

const redirectWrapper = (apiClass) => {
  const prototype = Object.getPrototypeOf(apiClass);
  Object.getOwnPropertyNames(prototype).forEach((key) => {
    if (typeof apiClass[key] === 'function') {
      const originalFunction = apiClass[key];
      apiClass[key] = function () {
        return originalFunction.apply(this, arguments).catch((err) => {
          if (err.response && err.response.status === 499) {
            document.cookie = 'nav=' + window.location.pathname;
            window.location.assign(authenticateUrl);
          }
          throw err;
        });
      };
    }
  });
  return apiClass;
};

export const chatbotAPI = redirectWrapper(new AssistantApi(apiConfig));
export const assistantMultiPartAPI = redirectWrapper(new AssistantMultipartApi(apiConfig));
export const assistantAdminAPI = redirectWrapper(new AssistantAdminApi(apiConfig));
export const knowledgeSourceAPI = redirectWrapper(new ContentRetrieverConnectionAdminApi(apiConfig));
export const llmConnectionAPI = redirectWrapper(new LLMConnectionAdminApi(apiConfig));
