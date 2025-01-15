import { UserFacingFile } from '@app/types/UserFacingFile';

const url = process.env.REACT_APP_ROUTER_URL ?? '';
const urlMultipart = process.env.REACT_APP_ROUTER_MULTIPART_URL ?? '';

// TODO: When backend supports persistent files (ie, with a separate file-upload endpoint),
//  this message interface can be changed to use file references in the message. Alternatively,
//  the chat request can be made part of a "chat session" which would inherently include uploaded files.
//  In the case of "chat session", the assistant name could also be managed by the chat session
export interface OutgoingChatMessage {
  assistantName: string;
  message: string;
  files: UserFacingFile[];
}

/**
 * Support function to build a {@link RequestInit} object for use with {@link fetch()}. This function constructs
 * a request that will send a multipart request, including both chat message JSON and document parts.
 *
 * @param chatJson the chat message JSON string
 * @param files an array of files to send
 */
function buildMultipartRequestInit(chatJson: string, files: UserFacingFile[]): RequestInit {
  const formData = new FormData();

  // Include JSON chat request as first multipart part, named "jsonRequest" and of type "application/json"
  formData.append('jsonRequest', new Blob(
    [
      chatJson
    ], {
      type: 'application/json',
    }
  ));

  // Include each attached file as subsequent multipart parts, all having part name "document".
  // Mimetype will be set automatically from the Blob (which is likely all File types, a subclass of Blob)
  files.forEach((file: UserFacingFile) => formData.append('document', file.blob))

  return {
    method: 'POST',
    headers: {
      // Do not include Content-Type; fetch will handle multipart content-type automatically
    },
    body: formData
  };
}

/**
 * Support function to build a {@link RequestInit} object for use with {@link fetch()}. This function constructs
 * a request that only includes a JSON chat request and doesn't use multipart.
 *
 * @param chatJson the JSON chat request in string form
 */
function buildStandardRequestInit(chatJson: string): RequestInit {
  return {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: chatJson
  };
}

export async function sendChatMessage(
  message: OutgoingChatMessage,
  signal?: AbortSignal
): Promise<ReadableStream<Uint8Array>> {
  const useMultipart: boolean = message.files.length > 0;

  const networkChatRequest = JSON.stringify({
    message: message.message,
    assistantName: message.assistantName
  });

  // Call a different API endpoint depending upon whether there are files to upload or not.
  // NOTE: We could just make all calls go to the multipart endpoint, but I expect that endpoint will be removed
  //  once persistent files are an option on the backend. As such, it seems better to keep the more straightforward
  //  simple POST request here for use in the future.
  let fetchRequest: RequestInit;
  if (useMultipart) {
    fetchRequest = buildMultipartRequestInit(networkChatRequest, message.files)
  } else {
    fetchRequest = buildStandardRequestInit(networkChatRequest);
  }

  fetchRequest.signal = signal;

  const response = await fetch(
    useMultipart? urlMultipart : url,
    fetchRequest
  );

  if (!response.ok || !response.body) {
    switch (response.status) {
      case 500:
        throw new Error('500');
      case 404:
        throw new Error('404');
      default:
        throw new Error('Other');
    }
  }

  // TODO: Move the response parsing here, and offer callbacks or other mechanism for signalling new sources and new
  //  chat message text.
  return response.body;
}

