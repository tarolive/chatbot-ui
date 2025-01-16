
const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:8080"

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
