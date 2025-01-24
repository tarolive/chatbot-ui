import * as React from 'react';

import {
  Dropdown,
  DropdownItem,
  DropdownList,
  Form,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  MenuToggle,
  MenuToggleElement,
  TextArea,
  TextInput,
} from '@patternfly/react-core';

import { ERROR_TITLE } from '@app/utils/utils';
import { ErrorObject } from '@app/types/ErrorObject';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import { ExpandingTextInputs } from './ExpandingTextInputs';
import { FlyoutError } from '@app/FlyoutError/FlyoutError';
import { FlyoutFooter } from '@app/FlyoutFooter/FlyoutFooter';
import { FlyoutHeader } from '@app/FlyoutHeader/FlyoutHeader';
import { FlyoutLoading } from '@app/FlyoutLoading/FlyoutLoading';
import { useAppData } from '@app/AppData/AppDataContext';
import { useConfig } from '../../ConfigContext';
import { useFlyoutWizard } from '@app/FlyoutWizard/FlyoutWizardContext';

interface RetrieverAPIResponse {
  id: string;
  description: string;
  name: string;
  connectionEntity: { contentRetrieverType: string; metadataFields: string[] };
}

interface LLMAPIResponse {
  id: string;
  description: string;
  name: string;
}
interface AssistantFlyoutFormProps {
  header: string;
  hideFlyout: () => void;
}

type validate = 'success' | 'error' | 'default';
type questionsValidate = 'error' | 'default';

export const AssistantFlyoutForm: React.FunctionComponent<AssistantFlyoutFormProps> = ({
  header,
  hideFlyout,
}: AssistantFlyoutFormProps) => {
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadedFormFields, setLoadedFormFields] = React.useState(false);
  const [title, setTitle] = React.useState('');
  const [displayName, setDisplayName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [error, setError] = React.useState<ErrorObject>();
  const [retrieverConnections, setRetrieverConnections] = React.useState<RetrieverAPIResponse[]>([]);
  const [selectedRetriever, setSelectedRetriever] = React.useState<RetrieverAPIResponse>();
  const [llms, setLLMs] = React.useState<LLMAPIResponse[]>([]);
  const [isRetrieverDropdownOpen, setIsRetrieverDropdownOpen] = React.useState(false);
  const [isLLMDropdownOpen, setIsLLMDropdownOpen] = React.useState(false);
  const [validated, setValidated] = React.useState<validate>('default');
  const [selectedLLM, setSelectedLLM] = React.useState<LLMAPIResponse>();
  const [prompt, setPrompt] = React.useState<string>();
  const [questions, setQuestions] = React.useState<string[]>([]);
  const [questionsValidated, setQuestionsValidated] = React.useState<questionsValidate>('default');
  const { nextStep, prevStep, setReloadList } = useFlyoutWizard();
  const { chatbots } = useAppData();
  const globalConfig = useConfig();

  const ERROR_BODY = {
    'Error: 404': `Service is currently unavailable. Click retry or try again later.`,
    'Error: 500': `Service has encountered an error. Click retry or try again later.`,
    'Error: Other': `Service has encountered an error. Click retry or try again later.`,
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
  };

  const getRetrieverConnections = async () => {
    const url = globalConfig?.REACT_APP_BASE_URL + '/admin/assistant/retrieverConnection' || '';
    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`${response.status}`);
      }

      const data = await response.json();
      setRetrieverConnections(data);
      setIsLoading(false);
      setLoadedFormFields(true);
    } catch (error) {
      console.error('Error loading data', error);
      handleError(error);
      setIsLoading(false);
    }
  };

  const getLLMs = async () => {
    const url = globalConfig?.REACT_APP_BASE_URL + '/admin/assistant/llm' || '';
    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`${response.status}`);
      }

      const data = await response.json();
      setLLMs(data);
      setIsLoading(false);
      setLoadedFormFields(true);
    } catch (error) {
      console.error('Error loading data', error);
      handleError(error);
      setIsLoading(false);
    }
  };

  const loadData = async () => {
    await getRetrieverConnections();
    await getLLMs();
  };

  React.useEffect(() => {
    loadData();
  }, []);

  const chatbotExists = (title: string) => {
    return chatbots.filter((chatbot) => chatbot.name === title).length >= 1;
  };

  const handleTitleChange = (_event, title: string) => {
    setTitle(title);
    if (title.trim() === '') {
      setValidated('default');
    } else if (!chatbotExists(title)) {
      setValidated('success');
    } else {
      setValidated('error');
    }
  };

  const handleDisplayNameChange = (_event, name: string) => {
    setDisplayName(name);
  };

  const handleRetrieverChange = (_event, value) => {
    setSelectedRetriever(value);
    setIsRetrieverDropdownOpen(false);
  };

  const handleLLMChange = (_event, value) => {
    setSelectedLLM(value);
    setIsLLMDropdownOpen(false);
  };

  const handleDescriptionChange = (_event, newDescription: string) => {
    setDescription(newDescription);
  };

  const handlePromptChange = (_event, newPrompt: string) => {
    setPrompt(newPrompt);
  };

  const handleQuestionsChange = (newQuestion: string, index?: number) => {
    const newQuestions = [...questions];
    if (index !== undefined && index !== null) {
      newQuestions[index] = newQuestion;
      setQuestions(newQuestions);
    } else {
      newQuestions.push(newQuestion);
      if (newQuestions.length > 3) {
        setQuestionsValidated('error');
        return;
      }
      setQuestions(newQuestions);
      if (newQuestions.length === 3) {
        setQuestionsValidated('error');
      } else {
        setQuestionsValidated('default');
      }
    }
  };

  const onDeleteQuestion = (index: number) => {
    const newQuestions = [...questions];
    newQuestions.splice(index, 1);
    if (newQuestions.length < 3) {
      setQuestionsValidated('default');
    }
    setQuestions(newQuestions);
  };

  const onRetrieverToggleClick = () => {
    setIsRetrieverDropdownOpen(!isRetrieverDropdownOpen);
  };

  const onLLMToggleClick = () => {
    setIsLLMDropdownOpen(!isLLMDropdownOpen);
  };

  const createAssistant = async () => {
    const url = globalConfig?.REACT_APP_BASE_URL + '/admin/assistant/' || '';
    const payload = {
      name: title,
      displayName: displayName ?? title,
      description: description,
      llmConnectionId: selectedLLM?.id,
      retrieverConnectionId: selectedRetriever?.id,
      userPrompt: prompt,
      exampleQuestions: questions,
    };

    try {
      // handle if no llms
      const hasLLM = llms.length > 0 ? selectedLLM : true;
      if (title === '' && hasLLM && validated !== 'success') {
        throw new Error('Missing form fields');
      }
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`${response.status}`);
      }

      const data = await response.json();
      setReloadList(true);
      return data;
    } catch (error) {
      if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
        setError({ title: 'Error creating assistant', body: error.message });
      } else {
        setError({ title: 'Error creating assistant', body: error as string });
      }
      console.error('Error creating assistant:', error);
    }
  };

  const onClick = async () => {
    setError(undefined);
    // handle if no llms
    const hasLLM = llms.length > 0 ? selectedLLM : true;
    if (loadedFormFields && title !== '' && hasLLM && validated === 'success') {
      const data = await createAssistant();
      if (data) {
        nextStep();
      }
    } else {
      loadData();
    }
  };

  return isLoading ? (
    <FlyoutLoading />
  ) : (
    <>
      <FlyoutHeader title={header} hideFlyout={hideFlyout} />
      <section className="flyout-form-container" aria-label={title} tabIndex={-1}>
        {error ? (
          <FlyoutError title={error.title} subtitle={error.body} onClick={onClick} />
        ) : (
          <Form className="flyout-form">
            <FormGroup label="Name" isRequired fieldId="flyout-form-title">
              <TextInput
                type="text"
                id="flyout-form-title"
                name="flyout-form-title"
                value={title}
                onChange={handleTitleChange}
              />
              <FormHelperText>
                <HelperText>
                  <HelperTextItem
                    icon={validated === 'error' ? <ExclamationCircleIcon /> : undefined}
                    variant={validated}
                  >
                    {validated === 'error' ? 'Must be unique' : 'Unique name for your assistant'}
                  </HelperTextItem>
                </HelperText>
              </FormHelperText>
            </FormGroup>
            <FormGroup label="Display name" fieldId="flyout-form-display-name">
              <TextInput
                type="text"
                id="flyout-form-display-name"
                name="flyout-form-dusplay-name"
                value={displayName}
                onChange={handleDisplayNameChange}
              />
              <FormHelperText>
                <HelperText>
                  <HelperTextItem>Different name for the assistant, if desired, to display in the UI</HelperTextItem>
                </HelperText>
              </FormHelperText>
            </FormGroup>
            {retrieverConnections && retrieverConnections.length > 0 && (
              <FormGroup label="Knowledge source" fieldId="flyout-form-knowledge-source">
                <Dropdown
                  id="flyout-form-knowledge-source"
                  isOpen={isRetrieverDropdownOpen}
                  onSelect={handleRetrieverChange}
                  onOpenChange={(isOpen: boolean) => setIsRetrieverDropdownOpen(isOpen)}
                  ouiaId="KnowledgeSourceDropdown"
                  shouldFocusToggleOnSelect
                  onOpenChangeKeys={['Escape']}
                  toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
                    <MenuToggle ref={toggleRef} onClick={onRetrieverToggleClick} isExpanded={isRetrieverDropdownOpen}>
                      {selectedRetriever ? selectedRetriever.description : 'Choose a knowledge source'}
                    </MenuToggle>
                  )}
                  popperProps={{ appendTo: 'inline' }}
                >
                  <DropdownList>
                    {retrieverConnections.map((connection) => (
                      <DropdownItem
                        key={connection.id}
                        value={connection}
                        isSelected={connection.id === selectedRetriever?.id}
                      >
                        {connection.description}
                      </DropdownItem>
                    ))}
                  </DropdownList>
                </Dropdown>
                <FormHelperText>
                  <HelperText>
                    <HelperTextItem>
                      Used for{' '}
                      <a href="https://www.redhat.com/en/topics/ai/what-is-retrieval-augmented-generation">
                        Retrieval Augmented Generation (RAG)
                      </a>
                    </HelperTextItem>
                  </HelperText>
                </FormHelperText>
              </FormGroup>
            )}
            {llms && llms.length > 0 && (
              <FormGroup isRequired label="Model" fieldId="flyout-form-model">
                <Dropdown
                  id="flyout-form-model"
                  isOpen={isLLMDropdownOpen}
                  onSelect={handleLLMChange}
                  onOpenChange={(isOpen: boolean) => setIsLLMDropdownOpen(isOpen)}
                  ouiaId="ModelDropdown"
                  shouldFocusToggleOnSelect
                  onOpenChangeKeys={['Escape']}
                  toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
                    <MenuToggle ref={toggleRef} onClick={onLLMToggleClick} isExpanded={isLLMDropdownOpen}>
                      {selectedLLM ? selectedLLM.description : 'Choose a model'}
                    </MenuToggle>
                  )}
                  popperProps={{ appendTo: 'inline' }}
                >
                  <DropdownList>
                    {llms.map((connection) => (
                      <DropdownItem
                        key={connection.id}
                        value={connection}
                        isSelected={connection.id === selectedLLM?.id}
                      >
                        {connection.description}
                      </DropdownItem>
                    ))}
                  </DropdownList>
                </Dropdown>
              </FormGroup>
            )}
            <FormGroup fieldId="flyout-form-description" label="Description">
              <TextArea
                id="flyout-form-description"
                value={description}
                onChange={handleDescriptionChange}
                aria-label="Text area for assistant description"
                resizeOrientation="vertical"
              />
              <FormHelperText>
                <HelperText>
                  <HelperTextItem>Describe what a user can do with your assistant</HelperTextItem>
                </HelperText>
              </FormHelperText>
            </FormGroup>
            <FormGroup fieldId="flyout-form-prompts" label="Prompt">
              <TextArea
                id="flyout-form-prompts"
                value={prompt}
                onChange={handlePromptChange}
                aria-label="Text area for sample prompt"
                resizeOrientation="vertical"
              />
              <FormHelperText>
                <HelperText>
                  <HelperTextItem>
                    A set of instructions that will lead a model to generate accurate, relevant, and contextually
                    appropriate responses.
                  </HelperTextItem>
                </HelperText>
              </FormHelperText>
            </FormGroup>
            <FormGroup fieldId="flyout-form-questions" label="Example questions (Limit 3)">
              <ExpandingTextInputs
                fieldId="flyout-form-questions"
                handleInputChange={handleQuestionsChange}
                values={questions}
                onDeleteValue={onDeleteQuestion}
                isDisabled={questions.length === 3}
              />
              <FormHelperText>
                <HelperText>
                  <HelperTextItem
                    icon={questionsValidated === 'error' ? <ExclamationCircleIcon /> : undefined}
                    variant={questionsValidated}
                  >
                    {questionsValidated === 'error'
                      ? 'There is a three question limit. Try deleting a question to add more.'
                      : 'A set of up to three example questions that a model could be asked. This will help the model generate accurate, relevant, and contextually appropriate responses.'}
                  </HelperTextItem>
                </HelperText>
              </FormHelperText>
            </FormGroup>
          </Form>
        )}
      </section>
      {!error && (
        <FlyoutFooter
          isPrimaryButtonDisabled={title === '' || (llms.length > 0 && !selectedLLM) || validated !== 'success'}
          primaryButton="Create assistant"
          onPrimaryButtonClick={onClick}
          secondaryButton="Cancel"
          onSecondaryButtonClick={prevStep}
        />
      )}
    </>
  );
};
