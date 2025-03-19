import * as React from 'react';

import {
  Chatbot,
  ChatbotAlert,
  ChatbotContent,
  ChatbotDisplayMode,
  ChatbotHeader,
  ChatbotHeaderMain,
  ChatbotWelcomePrompt,
  Message,
  MessageBox,
  MessageProps,
} from '@patternfly/chatbot';
import { ERROR_TITLE, getId } from '@app/utils/utils';

import { CannedChatbot } from '../types/CannedChatbot';
import { ErrorObject } from '@app/types/ErrorObject';
import { HeaderDropdown } from '@app/HeaderDropdown/HeaderDropdown';
import { Source } from '@app/types/Source';
import { SourceResponse } from '@app/types/SourceResponse';
import { UserFacingFile } from '@app/types/UserFacingFile';
import botAvatar from '@app/bgimages/RHCAI-studio-avatar.svg';
import { sendChatMessage } from '@app/utils/send-chat-message';
import { useChildStatus } from './ChildStatusProvider';
import userAvatar from '@app/bgimages/avatarImg.svg';

interface CompareChildProps {
  chatbot: CannedChatbot;
  allChatbots: CannedChatbot[];
  controller?: AbortController;
  setController: (controller: AbortController | undefined) => void;
  input?: string;
  hasNewInput: boolean;
  setChatbot: (value: CannedChatbot) => void;
  setSearchParams: (_event, value: string, order: string) => void;
  order: string;
  error?: ErrorObject;
  setError: (error?: ErrorObject) => void;
  files?: UserFacingFile[];
  setFiles: (file: UserFacingFile[]) => void;
}

const CompareChild: React.FunctionComponent<CompareChildProps> = ({
  chatbot,
  allChatbots,
  controller,
  setController,
  input,
  hasNewInput,
  setChatbot,
  setSearchParams,
  order,
  error,
  setError,
  files,
  setFiles,
}: CompareChildProps) => {
  const [messages, setMessages] = React.useState<MessageProps[]>([]);
  const [currentChatbot, setCurrentChatbot] = React.useState<CannedChatbot>(chatbot);
  const [currentDate, setCurrentDate] = React.useState<Date>();
  const [currentMessage, setCurrentMessage] = React.useState<string[]>([]);
  const [currentSources, setCurrentSources] = React.useState<Source[]>();
  const [announcement, setAnnouncement] = React.useState<string>();
  const scrollToBottomRef = React.useRef<HTMLDivElement>(null);
  const { updateStatus } = useChildStatus();

  const displayMode = ChatbotDisplayMode.embedded;

  const handleSend = async (input: string) => {
    const date = new Date();
    const newMessages = structuredClone(messages);
    // when a new message comes in, we add the last streaming message to the array and reset it
    if (currentMessage.length > 0) {
      newMessages.push({
        avatar: botAvatar,
        id: getId(),
        name: currentChatbot?.displayName ?? currentChatbot?.name,
        role: 'bot',
        content: currentMessage.join(''),
        ...(currentSources && { sources: { sources: currentSources } }),
        timestamp: currentDate
          ? `${currentDate.toLocaleDateString()} ${currentDate.toLocaleTimeString()}`
          : `${date?.toLocaleDateString()} ${date?.toLocaleTimeString()}`,
      });
      setCurrentMessage([]);
      setCurrentSources(undefined);
    }
    newMessages.push({
      avatar: userAvatar,
      id: getId(),
      name: 'You',
      role: 'user',
      content: input,
      timestamp: `${date?.toLocaleDateString()} ${date?.toLocaleTimeString()}`,
      ...(files && { attachments: files }),
    });
    setMessages(newMessages);
    setCurrentDate(date);
    // make announcement to assistive devices that new messages have been added
    setAnnouncement(`Message from You: ${input}. Message from Chatbot is loading.`);

    // sources come in last; we display them once they come in
    const sources = await fetchData(input);
    if (sources) {
      setCurrentSources(sources);
    }
    // make announcement to assistive devices that new message has been added
    currentMessage.length > 0 && setAnnouncement(`Message from Chatbot: ${currentMessage.join('')}`);
    // this is used to control state of stop button
    updateStatus(order === 'first' ? 'child1' : 'child2', { isMessageStreaming: false });
  };

  React.useEffect(() => {
    if (input) {
      handleSend(input);
    }
  }, [hasNewInput]);

  // Auto-scrolls to the latest message
  React.useEffect(() => {
    // don't scroll the first load, but scroll if there's a current stream or a new source has popped up
    if (messages.length > 0 || currentMessage || currentSources) {
      scrollToBottomRef.current?.scrollIntoView();
    }
  }, [messages, currentMessage, currentSources]);

  const ERROR_BODY = {
    'Error: 404': `${currentChatbot?.displayName ?? currentChatbot?.name} is currently unavailable. Use a different assistant or try again later.`,
    'Error: 500': `${currentChatbot?.displayName ?? currentChatbot?.name} has encountered an error and is unable to answer your question. Use a different assistant or try again later.`,
    'Error: Other': `${currentChatbot?.displayName ?? currentChatbot?.name} has encountered an error and is unable to answer your question. Use a different assistant or try again later.`,
  };

  const handleError = (e) => {
    console.error(e);
    const title = ERROR_TITLE[e];
    const body = ERROR_BODY[e];
    let newError;
    if (title && body) {
      newError = { title: ERROR_TITLE[e], body: ERROR_BODY[e] };
    } else {
      if ('message' in e) {
        newError = { title: 'Error', body: e.message };
      } else {
        newError = { title: 'Error', body: e };
      }
    }
    setError(newError);
    // make announcement to assistive devices that there was an error
    setAnnouncement(`Error: ${newError.title} ${newError.body}`);
  };

  // fixme this is getting too large; we should refactor
  async function fetchData(userMessage: string) {
    updateStatus(order === 'first' ? 'child1' : 'child2', { isMessageStreaming: true });
    if (controller) {
      controller.abort();
    }

    const newController = new AbortController();
    setController(newController);

    try {
      let isSource = false;

      const response = await sendChatMessage(
        {
          message: userMessage,
          assistantName: currentChatbot?.name,
          files: files ?? [],
        },
        newController?.signal,
      );

      setFiles([]);

      // start reading the streaming message
      const reader = response.getReader();
      const decoder = new TextDecoder('utf-8');
      let done;
      const sources: string[] = [];

      while (!done) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        const chunk = decoder.decode(value, { stream: true });

        // We've seen a START_SOURCES_STRING in a previous chunk, so switch to source mode
        if (isSource) {
          const endIdx = chunk.indexOf('END_SOURCES_STRING');
          if (endIdx !== -1) {
            // Extract source data, excluding the END_SOURCES_STRING marker
            const sourceData = chunk.slice(0, endIdx);

            if (sourceData) {
              sources.push(sourceData);
            }

            // Process any remaining non-source content after the source block
            const remainingText = chunk.slice(endIdx + 'END_SOURCES_STRING'.length);
            if (remainingText) {
              setCurrentMessage((prevData) => [...prevData, remainingText]);
            }
            // Switch to non-source mode
            isSource = false;
          }
        } else {
          const startIdx = chunk.indexOf('START_SOURCES_STRING');
          if (startIdx !== -1) {
            // Switch to source mode and remove the START_SOURCES_STRING marker
            isSource = true;
            let sourceData = chunk.slice(startIdx + 'START_SOURCES_STRING'.length);
            // The end marker may be present in the chunk as well if it's short; check for it
            const endIdx = chunk.indexOf('END_SOURCES_STRING');
            if (endIdx !== -1) {
              sourceData = chunk.slice(startIdx + 'START_SOURCES_STRING'.length, endIdx);
              isSource = false;
              // Check for any remaining text in chunk and render it as well
              const remainingText = chunk.slice(endIdx + 'END_SOURCES_STRING'.length);
              if (remainingText) {
                setCurrentMessage((prevData) => [...prevData, remainingText]);
              }
            }
            sources.push(sourceData);
          } else {
            // Render the non-source data
            setCurrentMessage((prevData) => [...prevData, chunk]);
          }
        }
      }

      if (sources && sources.length > 0) {
        const sourcesString = sources.join('');
        const parsedSources: SourceResponse = JSON.parse(sourcesString);
        const formattedSources: Source[] = [];
        parsedSources.content.forEach((source) => {
          formattedSources.push({ link: source.metadata.source, body: source.text });
        });
        setController(newController);
        return formattedSources;
      }

      return undefined;
    } catch (error) {
      if (error instanceof Error) {
        if (error.name !== 'AbortError') {
          handleError(error);
          updateStatus(order === 'first' ? 'child1' : 'child2', { isMessageStreaming: false });
        }
      }
      return undefined;
    } finally {
      setController(undefined);
    }
  }

  // for chatbot selector dropdown
  const onSelect = (_event: React.MouseEvent<Element, MouseEvent> | undefined, value: CannedChatbot) => {
    if (controller) {
      controller.abort();
    }
    setController(undefined);
    setCurrentChatbot(value);
    setMessages([]);
    setCurrentMessage([]);
    setCurrentSources(undefined);
    setError(undefined);
    setAnnouncement(undefined);
    setChatbot(value);
    setSearchParams(_event, value.name, order);
    updateStatus(order === 'first' ? 'child1' : 'child2', {
      isMessageStreaming: false,
    });
  };

  return (
    <Chatbot displayMode={displayMode}>
      <ChatbotHeader className="compare-header">
        <ChatbotHeaderMain>
          <HeaderDropdown selectedChatbot={chatbot} chatbots={allChatbots} onSelect={onSelect} />
        </ChatbotHeaderMain>
      </ChatbotHeader>
      <ChatbotContent>
        <MessageBox
          ariaLabel={`Scrollable message log for ${chatbot.displayName ?? chatbot?.name}`}
          announcement={announcement}
        >
          {error && (
            <ChatbotAlert
              variant="danger"
              // eslint-disable-next-line no-console
              onClose={() => {
                setError(undefined);
              }}
              title={error?.title}
            >
              {error?.body}
            </ChatbotAlert>
          )}
          <ChatbotWelcomePrompt title="Hello," description="How may I help you today?" />
          {messages.map((message) => (
            <Message key={message.id} {...message} />
          ))}
          {currentMessage.length > 0 && (
            <Message
              avatar={botAvatar}
              name={currentChatbot?.displayName ?? currentChatbot?.name}
              key="currentMessage"
              role="bot"
              content={currentMessage.join('')}
              {...(currentSources && { sources: { sources: currentSources } })}
              timestamp={`${currentDate?.toLocaleDateString()} ${currentDate?.toLocaleTimeString()}`}
            />
          )}
          <div ref={scrollToBottomRef}></div>
        </MessageBox>
      </ChatbotContent>
    </Chatbot>
  );
};

export { CompareChild };
