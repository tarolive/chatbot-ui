import * as React from 'react';

import {
  Chatbot,
  ChatbotAlert,
  ChatbotContent,
  ChatbotDisplayMode,
  ChatbotFooter,
  ChatbotFootnote,
  ChatbotHeader,
  ChatbotHeaderActions,
  ChatbotHeaderMain,
  ChatbotWelcomePrompt,
  FileDetailsLabel,
  Message,
  MessageBar,
  MessageBox,
  MessageProps,
} from '@patternfly/chatbot';
import { ERROR_TITLE, getId } from '@app/utils/utils';

import { Button } from '@patternfly/react-core';
import { ToggleGroup } from '@patternfly/react-core';
import { ToggleGroupItem } from '@patternfly/react-core';
import Sun from '@patternfly/react-icons/dist/esm/icons/sun-icon';
import Moon from '@patternfly/react-icons/dist/esm/icons/moon-icon';
import { CannedChatbot } from '../types/CannedChatbot';
import { HeaderDropdown } from '@app/HeaderDropdown/HeaderDropdown';
import { Source } from '@app/types/Source';
import { SourceResponse } from '@app/types/SourceResponse';
import { UserFacingFile } from '@app/types/UserFacingFile';
import botAvatar from '@app/bgimages/RHCAI-studio-avatar.svg';
import { sendChatMessage } from '@app/utils/send-chat-message';
import { useAppData } from '@app/AppData/AppDataContext';
import { useLoaderData } from 'react-router-dom';
import userAvatar from '@app/bgimages/avatarImg.svg';

const BaseChatbot: React.FunctionComponent = () => {
  const { chatbots } = useLoaderData() as { chatbots: CannedChatbot[] };
  const { flyoutMenuSelectedChatbot, updateFlyoutMenuSelectedChatbot, chatbots: appDataChatbots } = useAppData();
  const [isSendButtonDisabled, setIsSendButtonDisabled] = React.useState(true);
  const [messages, setMessages] = React.useState<MessageProps[]>([]);
  const [currentMessage, setCurrentMessage] = React.useState<string[]>([]);
  const [currentSources, setCurrentSources] = React.useState<Source[]>();
  const scrollToBottomRef = React.useRef<HTMLDivElement>(null);
  const [error, setError] = React.useState<{ title: string; body: string }>();
  const [announcement, setAnnouncement] = React.useState<string>();
  const [currentChatbot, setCurrentChatbot] = React.useState<CannedChatbot>(flyoutMenuSelectedChatbot ?? chatbots[0]);
  const [controller, setController] = React.useState<AbortController>();
  const [currentDate, setCurrentDate] = React.useState<Date>();
  const [hasStopButton, setHasStopButton] = React.useState(false);
  const [files, setFiles] = React.useState<UserFacingFile[]>([]);
  const [isLoadingFile, setIsLoadingFile] = React.useState<boolean>(false);
  const [allChatbots, setAllChatbots] = React.useState<CannedChatbot[]>(chatbots);
  const [isDarkTheme, setIsDarkTheme] = React.useState(false);

  React.useEffect(() => {
    document.title = `Red Hat Composer AI Studio | ${currentChatbot?.name}`;
  }, [currentChatbot?.name]);

  React.useEffect(() => {
    if (appDataChatbots.length > 0) {
      setAllChatbots(appDataChatbots);
    }
  }, [appDataChatbots]);

  React.useEffect(() => {
    document.title = `Red Hat Composer AI Studio | ${currentChatbot?.name}`;
  }, [currentChatbot]);

  React.useEffect(() => {
    if (flyoutMenuSelectedChatbot) {
      setCurrentChatbot(flyoutMenuSelectedChatbot);
    }
  }, [flyoutMenuSelectedChatbot]);

  React.useEffect(() => {
    document.title = `Red Hat Composer AI Studio | ${currentChatbot?.name}${announcement ? ` - ${announcement}` : ''}`;
  }, [announcement, currentChatbot?.name]);

  // Auto-scrolls to the latest message
  React.useEffect(() => {
    if (scrollToBottomRef.current) {
      // don't scroll the first load, but scroll if there's a current stream or a new source has popped up
      if (messages.length > 0 || currentMessage || currentSources) {
        scrollToBottomRef.current.scrollIntoView();
      }
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
    } else if ('message' in e) {
      newError = { title: 'Error', body: e.message };
    } else {
      newError = { title: 'Error', body: e };
    }
    setError(newError);
    // make announcement to assistive devices that there was an error
    setAnnouncement(`Error: ${newError.title} ${newError.body}`);
  };

  function handleToggleTheme(dark: boolean) {
    setIsDarkTheme(dark);
    if (dark) {
      // For PatternFly 6:
      document.documentElement.classList.add('pf-v6-theme-dark');
    } else {
      document.documentElement.classList.remove('pf-v6-theme-dark');
    }
  }

  // fixme this is getting too large; we should refactor
  async function fetchData(userMessage: string) {
    if (controller) {
      controller.abort();
      setHasStopButton(false);
    }

    const newController = new AbortController();
    setController(newController);
    setFiles([]);
    setHasStopButton(true);
    try {
      let isSource = false;

      const response = await sendChatMessage(
        {
          message: userMessage,
          assistantName: currentChatbot?.name,
          files: files,
        },
        newController?.signal,
      );

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
        }
      }
      return undefined;
    } finally {
      setController(undefined);
    }
  }

  const handleSend = async (input: string) => {
    setIsSendButtonDisabled(true);
    const date = new Date();
    const newMessages = structuredClone(messages);
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
          : `${date?.toLocaleDateString} ${date?.toLocaleTimeString}`,
      });
      setCurrentMessage([]);
      setCurrentSources(undefined);
      setCurrentDate(undefined);
    }
    newMessages.push({
      avatar: userAvatar,
      id: getId(),
      name: 'You',
      role: 'user',
      content: input,
      timestamp: `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`,
      ...(files && { attachments: files }),
    });
    setMessages(newMessages);
    setCurrentDate(date);
    // make announcement to assistive devices that new messages have been added
    setAnnouncement(`Message from You: ${input}. Message from Chatbot is loading.`);

    const sources = await fetchData(input);
    if (sources) {
      setCurrentSources(sources);
    }
    // make announcement to assistive devices that new message has been added
    currentMessage.length > 0 && setAnnouncement(`Message from Chatbot: ${currentMessage.join('')}`);
    setHasStopButton(false);
  };

  const displayMode = ChatbotDisplayMode.embedded;

  const onSelect = (_event: React.MouseEvent<Element, MouseEvent> | undefined, value: CannedChatbot) => {
    if (controller) {
      controller.abort();
    }
    setController(undefined);
    setCurrentChatbot(value);
    updateFlyoutMenuSelectedChatbot(value);
    setMessages([]);
    setCurrentMessage([]);
    setCurrentSources(undefined);
    setError(undefined);
    setAnnouncement(undefined);
  };

  const handleStopButton = () => {
    if (controller) {
      controller.abort();
    }
    setHasStopButton(false);
  };

  const handleChange = (event: React.ChangeEvent<HTMLDivElement>, value: string) => {
    if (value !== '') {
      setIsSendButtonDisabled(false);
      return;
    }
    setIsSendButtonDisabled(true);
  };

  // Example Prompts
  // --------------------------------------------------------------------------
  // Loads and preps the example prompts from current chatbot
  const mappedPrompts = (currentChatbot.exampleQuestions ?? []).map((question) => ({
    title: question,
    message: '',
    onClick: () => handleSend(question),
  }));

  // Attachments
  // --------------------------------------------------------------------------
  // example of how you can read a text file
  const readFile = (file: File) =>
    new Promise((resolve, reject) => {
      // TODO: Files don't actually need to be read within the script, but perhaps this adds a believable delay
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });

  // handle file drop/selection
  const handleFile = (fileArr: File[]) => {
    setIsLoadingFile(true);
    // any custom validation you may want
    if (fileArr.length > 2) {
      setFiles([]);
      setError({ title: 'Uploaded more than two files', body: 'Upload fewer files' });
      return;
    }
    // this is 200MB in bytes; size is in bytes
    const anyFileTooBig = fileArr.every((file) => file.size > 200000000);
    if (anyFileTooBig) {
      setFiles([]);
      setError({ title: 'Uploaded a file larger than 200MB.', body: 'Try a uploading a smaller file' });
      return;
    }

    const newFiles = fileArr.map((file) => {
      return {
        name: file.name,
        id: getId(),
        blob: file,
      };
    });
    setFiles(newFiles);

    fileArr.forEach((file) => {
      // TODO: When backend supports persistent files, this is where files would be uploaded and exchanged for
      //  file references. Depending upon upload mechanism, reading the file directly may not be necessary; instead,
      //  it may be passed to fetch() as a File or Blob object.
      readFile(file)
        .then((data) => {
          // eslint-disable-next-line no-console
          console.log(data);
          setError(undefined);
          // this is just for demo purposes, to make the loading state really obvious
          setTimeout(() => {
            setIsLoadingFile(false);
          }, 1000);
        })
        .catch((error: DOMException) => {
          setError({ title: 'Failed to read file', body: error.message });
        });
    });
  };

  const handleAttach = (data: File[]) => {
    handleFile(data);
  };

  const onClose = (event: React.MouseEvent, name: string) => {
    const newFiles = files.filter((file) => file.name !== name);
    setFiles(newFiles);
  };

  return (
    <Chatbot displayMode={displayMode}>
      <ChatbotHeader>
        <ChatbotHeaderMain>
          <HeaderDropdown selectedChatbot={currentChatbot} chatbots={allChatbots} onSelect={onSelect} />
        </ChatbotHeaderMain>
        <ChatbotHeaderActions>
          <ToggleGroup aria-label="Dark theme toggle group">
            <ToggleGroupItem
              isSelected={!isDarkTheme}
              aria-pressed={!isDarkTheme}
              icon={<Sun />}
              aria-label="light theme toggle"
              onClick={() => handleToggleTheme(false)}
            >
            </ToggleGroupItem>
            <ToggleGroupItem
              isSelected={isDarkTheme}
              aria-pressed={isDarkTheme}
              icon={<Moon />}
              aria-label="dark theme toggle"
              onClick={() => handleToggleTheme(true)}
            >
            </ToggleGroupItem>
          </ToggleGroup>
          {allChatbots.length >= 2 && (
            <Button
              component="a"
              href={`/compare?assistants=${allChatbots[0].name}%2C${allChatbots[1].name}`}
            >
              Compare
            </Button>
          )}
        </ChatbotHeaderActions>
      </ChatbotHeader>
      <ChatbotContent>
        <MessageBox announcement={announcement}>
          {error && (
            <ChatbotAlert
              variant="danger"
              // eslint-disable-next-line no-console
              onClose={() => {
                setError(undefined);
              }}
              title={error.title}
            >
              {error.body}
            </ChatbotAlert>
          )}
          <ChatbotWelcomePrompt title="Hello, Chatbot User" description="How may I help you today?" prompts={mappedPrompts} />
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
      <ChatbotFooter>
        {files && (
          <div className="file-container">
            {files.map((file) => (
              <FileDetailsLabel key={file.name} fileName={file.name} isLoading={isLoadingFile} onClose={onClose} />
            ))}
          </div>
        )}
        <MessageBar
          onSendMessage={handleSend}
          hasMicrophoneButton
          hasStopButton={hasStopButton}
          handleStopButton={handleStopButton}
          alwayShowSendButton
          onChange={handleChange}
          isSendButtonDisabled={isSendButtonDisabled}
          handleAttach={handleAttach}
          hasAttachButton={true}
        />
        <ChatbotFootnote label="Verify all information from this tool. LLMs make mistakes." />
      </ChatbotFooter>
    </Chatbot>
  );
};

export { BaseChatbot };