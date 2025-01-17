import { CompareChild } from '@app/Compare/CompareChild';
import { CannedChatbot } from '@app/types/CannedChatbot';
import { ToggleGroup, ToggleGroupItem } from '@patternfly/react-core';
import { css } from '@patternfly/react-styles';
import { ChatbotFooter, ChatbotFootnote, FileDetailsLabel, MessageBar } from '@patternfly/chatbot';
import * as React from 'react';
import { useLoaderData, useNavigate, useSearchParams } from 'react-router-dom';
import { useChildStatus } from './ChildStatusProvider';
import { ErrorObject } from '@app/types/ErrorObject';
import { UserFacingFile } from '@app/types/UserFacingFile';
import { getId } from '@app/utils/utils';
import { useAppData } from '@app/AppData/AppDataContext';

export const CompareLayout: React.FunctionComponent = () => {
  // information from api
  const { chatbots: initialChatbots } = useLoaderData() as { chatbots: CannedChatbot[] };

  // state
  const [isSendButtonDisabled, setIsSendButtonDisabled] = React.useState(true);
  const [input, setInput] = React.useState<string>();
  const [hasNewInput, setHasNewInput] = React.useState(false);
  const [firstController, setFirstController] = React.useState<AbortController>();
  const [secondController, setSecondController] = React.useState<AbortController>();
  const [firstChatbot, setFirstChatbot] = React.useState<CannedChatbot>();
  const [secondChatbot, setSecondChatbot] = React.useState<CannedChatbot>();
  const [isSelected, setIsSelected] = React.useState('toggle-group-assistant-1');
  const [showFirstChatbot, setShowFirstChatbot] = React.useState(true);
  const [showSecondChatbot, setShowSecondChatbot] = React.useState(false);
  const [hasStopButton, setHasStopButton] = React.useState(false);
  const [files, setFiles] = React.useState<UserFacingFile[]>([]);
  const [isLoadingFile, setIsLoadingFile] = React.useState<boolean>(false);
  const [error, setError] = React.useState<ErrorObject>();
  const [allChatbots, setAllChatbots] = React.useState<CannedChatbot[]>(initialChatbots);

  // constants for search params
  const [searchParams, setSearchParams] = useSearchParams();
  const assistants = searchParams.get('assistants')?.split(',');
  const navigate = useNavigate();

  // context, used for stop buttons
  const { status } = useChildStatus();

  // context, used for panels
  const { chatbots: appDataChatbots } = useAppData();

  React.useEffect(() => {
    if (appDataChatbots.length > 0) {
      setAllChatbots(appDataChatbots);
    }
  }, [appDataChatbots]);

  React.useEffect(() => {
    document.title = `Red Hat Composer AI Studio | Compare`;
    if (assistants && assistants.length === 2) {
      const actualChatbots = allChatbots.filter(
        (chatbot) => chatbot.name === assistants[0] || chatbot.name === assistants[1],
      );
      if (actualChatbots.length === 2) {
        setFirstChatbot(actualChatbots[0]);
        setSecondChatbot(actualChatbots[1]);
      } else {
        // assistants are not real
        navigate('/');
      }
    } else {
      // not enough assistants, or duplicate assistants
      navigate('/');
    }

    // we want to show the first if we switch to the mobile toggle view
    // and reset/switch back to normal otherwise
    const updateChatbotVisibility = () => {
      if (window.innerWidth >= 901) {
        setShowFirstChatbot(true);
        setShowSecondChatbot(true);
      } else {
        setShowFirstChatbot(true);
        setShowSecondChatbot(false);
        setIsSelected('toggle-group-assistant-1');
      }
    };
    window.addEventListener('resize', updateChatbotVisibility);

    return () => {
      window.removeEventListener('resize', updateChatbotVisibility);
    };
  }, []);

  React.useEffect(() => {
    if (status) {
      const childIsStreaming = status.child1.isMessageStreaming || status.child2.isMessageStreaming;
      const childrenHaveStopped =
        status.child1.isMessageStreaming === false && status.child2.isMessageStreaming === false;
      if (childIsStreaming) {
        setHasStopButton(true);
        return;
      }
      if (childrenHaveStopped) {
        setHasStopButton(false);
        return;
      }
    }
    return;
  }, [status]);

  // this only happens on mobile
  const handleChildToggleClick = (event) => {
    const id = event.currentTarget.id;
    setIsSelected(id);
    setShowSecondChatbot(!showSecondChatbot);
    setShowFirstChatbot(!showFirstChatbot);
  };

  const handleSend = (value: string) => {
    setInput(value);
    setHasNewInput(!hasNewInput);
    setIsSendButtonDisabled(true);
  };

  const changeSearchParams = (_event, value: string, order: string) => {
    if (order === 'first' && secondChatbot) {
      setSearchParams(`assistants=${value},${secondChatbot.name}`);
    }
    if (order === 'second' && firstChatbot) {
      setSearchParams(`assistants=${firstChatbot.name},${value}`);
    }
  };

  const handleStopButton = () => {
    if (firstController) {
      firstController.abort();
    }
    if (secondController) {
      secondController.abort();
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

  // Attachments
  // --------------------------------------------------------------------------
  // example of how you can read a text file
  const readFile = (file: File) =>
    new Promise((resolve, reject) => {
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
        blob: file
      };
    });
    setFiles(newFiles);

    // TODO: When backend supports persistent files, this is where files would be uploaded and exchanged for
    //  file references. Depending upon upload mechanism, reading the file directly may not be necessary; instead,
    //  it may be passed to fetch() as a File or Blob object.
    // TODO: This should likely be deduplicated between here and BaseChatbot.tsx
    fileArr.forEach((file) => {
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
    firstChatbot &&
    secondChatbot && (
      <div className="compare-container">
        <div className="compare-mobile-controls">
          <ToggleGroup aria-label="Select which assistant to display">
            <ToggleGroupItem
              className="compare-toggle"
              text="Assistant 1"
              buttonId="toggle-group-assistant-1"
              isSelected={isSelected === 'toggle-group-assistant-1'}
              onChange={handleChildToggleClick}
            />
            <ToggleGroupItem
              className="compare-toggle"
              text="Assistant 2"
              buttonId="toggle-group-assistant-2"
              isSelected={isSelected === 'toggle-group-assistant-2'}
              onChange={handleChildToggleClick}
            />
          </ToggleGroup>
        </div>
        <div className="compare">
          <div className={css('compare-item', !showFirstChatbot ? 'compare-item-hidden' : undefined)}>
            <CompareChild
              chatbot={firstChatbot}
              allChatbots={allChatbots}
              controller={firstController}
              setController={setFirstController}
              input={input}
              setChatbot={setFirstChatbot}
              hasNewInput={hasNewInput}
              setSearchParams={changeSearchParams}
              order="first"
              error={error}
              setError={setError}
              files={files}
              setFiles={setFiles}
            />
          </div>
          <div className={css('compare-item', !showSecondChatbot ? 'compare-item-hidden' : undefined)}>
            <CompareChild
              chatbot={secondChatbot}
              allChatbots={allChatbots}
              controller={secondController}
              setController={setSecondController}
              input={input}
              setChatbot={setSecondChatbot}
              hasNewInput={hasNewInput}
              setSearchParams={changeSearchParams}
              order="second"
              error={error}
              setError={setError}
              files={files}
              setFiles={setFiles}
            />
          </div>
        </div>
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
      </div>
    )
  );
};
