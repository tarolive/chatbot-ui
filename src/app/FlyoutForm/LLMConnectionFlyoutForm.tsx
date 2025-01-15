import { FlyoutError } from '@app/FlyoutError/FlyoutError';
import { FlyoutFooter } from '@app/FlyoutFooter/FlyoutFooter';
import { FlyoutHeader } from '@app/FlyoutHeader/FlyoutHeader';
import { FlyoutLoading } from '@app/FlyoutLoading/FlyoutLoading';
import { useFlyoutWizard } from '@app/FlyoutWizard/FlyoutWizardContext';
import { llmConnectionAPI } from '@app/adapters/APIExporter';
import { ErrorObject, Violation } from '@app/types/ErrorObject';
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
  TextInput
} from '@patternfly/react-core';
import { LLMConnection } from '@sdk/model';
import { AxiosError } from 'axios';
import * as React from 'react';
import { validate } from 'webpack';

interface LLMConnectionFlyoutFormProps {
  header: string;
  hideFlyout: () => void;
}

type validate = 'success' | 'error' | 'default';

// TODO: These should be data driven
const MODEL_TYPE = ['mistral', 'granite'];
const SERVING_RUNTIME_TYPE = ['openai'];


export const LLMConnectionFlyoutForm: React.FunctionComponent<LLMConnectionFlyoutFormProps> = ({ header, hideFlyout }: LLMConnectionFlyoutFormProps) => {
  const [isLoading, setIsLoading] = React.useState(true);
  
  const [validated, setValidated] = React.useState<validate>('default');
  const [error, setError] = React.useState<ErrorObject>();
  const { nextStep, prevStep } = useFlyoutWizard();

  // UI State
  const [isModelTypeOpen, setIsModelTypeOpen] = React.useState(false);
  const [isServingRuntimeTypeOpen, setIsServingRuntimeTypeOpen] = React.useState(false);
  
  // Form Fields
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [modelType, setModelType] = React.useState('');
  const [servingRuntimeType, setServingRuntimeType] = React.useState('');
  const [modelName, setModelName] = React.useState('');
  const [url, setUrl] = React.useState('');
  const [apiKey, setApiKey] = React.useState('');
  const [temperatureString, setTemperatureString] = React.useState('0.5');
  const [temperature, setTemperature] = React.useState(0.5);
  const [maxTokens, setMaxTokens] = React.useState(500);

  React.useEffect(() => {
    validateForm();
  }, [name, description, modelType, servingRuntimeType, modelName, url, apiKey]);

  const validateForm = () => {

    if (name.trim() === '') {
      setValidated('default');
    } else if (description.trim() === '') {
      setValidated('default');
    } else if (modelType.trim() === '') {
      setValidated('default');
    } else if (servingRuntimeType.trim() === '') {
      setValidated('default');
    } else if (modelName.trim() === '') {
      setValidated('default');
    } else if (url.trim() === '') {
      setValidated('default');
    } else {
      setValidated('success');
    }
  }
  
  const handleNameChange = (_event, name: string) => {
    setName(name);
  };

  const handleDescriptionChange = (_event, description: string) => {
    setDescription(description);
  };

  const handleModelNameChange = (_event, modelName: string) => {
    setModelName(modelName);
  };

  const handleUrlChange = (_event, url: string) => {
    setUrl(url);
  };

  const handleApiKeyChange = (_event, apiKey: string) => {
    setApiKey(apiKey);
  };

  const handleTemperatureChange = (_event, temperature: string) => {
    setTemperatureString(temperature);
    const parsedTemperature = parseFloat(temperature);
    if (!isNaN(parsedTemperature) && parsedTemperature >= 0 && parsedTemperature <= 1) {
      setTemperature(parsedTemperature);
      validateForm();
    } else {
      setValidated('error');
    }
  };

  const handleMaxTokensChange = (_event, maxTokens: string) => {
    const parsedMaxTokens = parseFloat(maxTokens);
    if (!isNaN(parsedMaxTokens)) {
      setMaxTokens(parsedMaxTokens);
      validateForm();
    } else {
      setValidated('error');
    }
  };

  const createLLMConnection = async () => {

    const payload : LLMConnection = 
    {
      name: name,
      description: description,
      modelType: modelType,
      servingRuntimeType: servingRuntimeType,
      modelName: modelName,
      url: url,
      apiKey: apiKey,
      temperature: temperature,
      maxTokens: maxTokens
    }

    try {
      return await llmConnectionAPI.createOrUpdateLlmConnection(payload);
    } catch (error) {
      console.error('Error creating retriever:', error);  
      const axiosError: AxiosError = error as AxiosError;
      const response = axiosError.response;

      if(response?.status === 400) {
        const data: ErrorObject = response?.data as ErrorObject;
        if ('violations' in data) {
          const violations: Violation[] = data?.violations ?? [];
          setError({ title: 'Error creating retriever', violations: violations});
        } else {
          setError({ title: 'Error creating retriever', body: axiosError?.message });
        }
      } else {
        setError({ title: 'Error creating retriever', body: axiosError?.message });
      }
      
      console.error('Error creating retriever:', error);
    }
  };

  const onClick = async () => {
    setError(undefined);
    const data = await createLLMConnection();
    if (data) {
      nextStep();
    }
  };

  const onModelTypeClick = () => {
    setIsModelTypeOpen(!isModelTypeOpen);
  };

  const onServingRuntimeTypeClick = () => {
    setIsServingRuntimeTypeOpen(!isServingRuntimeTypeOpen);
  };

  const onModelTypeSelect = (_event: React.MouseEvent<Element, MouseEvent> | undefined, value: string | number | undefined ) => {
    setModelType(value as string);
    setIsModelTypeOpen(false);
  };

  const onServingRuntimeTypeSelect = (_event: React.MouseEvent<Element, MouseEvent> | undefined, value: string | number | undefined) => {
    setServingRuntimeType(value as string);
    setIsServingRuntimeTypeOpen(false);
  };


  React.useEffect(() => {
    // For now we don't need to do anything on
    setIsLoading(false);
  }, []);

  return isLoading ? (
    <FlyoutLoading />
  ) : (
    <>
      <FlyoutHeader title={header} hideFlyout={hideFlyout} />
      <section className="flyout-form-container" aria-label={name} tabIndex={-1}>
        {error ? (
          <FlyoutError title={error.title} subtitle={error.body} violations={error.violations} onClick={onClick} />
        ) : (
          <Form className="flyout-form">
            <FormGroup label="Name" fieldId="flyout-form-name">
              <TextInput
                type="text"
                id="flyout-form-name"
                name="flyout-form-name"
                value={name}
                onChange={handleNameChange}
              />
              <FormHelperText>
                <HelperText>
                  <HelperTextItem>Give the Knowledge Source a recognizable name</HelperTextItem>
                </HelperText>
              </FormHelperText>
            </FormGroup>

            <FormGroup label="Description" fieldId="flyout-form-description">
              <TextInput
                type="text"
                id="flyout-form-description"
                name="flyout-form-description"
                value={description}
                onChange={handleDescriptionChange}
              />
              <FormHelperText>
                <HelperText>
                  <HelperTextItem>A Description of your Knowledge Source</HelperTextItem>
                </HelperText>
              </FormHelperText>
            </FormGroup>

            <FormGroup label="Model Type" fieldId="flyout-form-model-type">
              <Dropdown
                isOpen={isModelTypeOpen}
                onSelect={onModelTypeSelect}
                onOpenChange={(isOpen: boolean) => setIsModelTypeOpen(isOpen)}
                toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
                  <MenuToggle ref={toggleRef} onClick={onModelTypeClick} isExpanded={isModelTypeOpen}>
                    {modelType}
                  </MenuToggle>
                )}
                ouiaId="BasicDropdown"
                shouldFocusToggleOnSelect
                  >
                <DropdownList>
                  {MODEL_TYPE.map((item) => (
                    <DropdownItem key={item} value={item}>
                      {item}
                    </DropdownItem>
                  ))}
                </DropdownList>
              </Dropdown>
            <FormHelperText>
                <HelperText>
                  <HelperTextItem>Model Type you are connecting to, this will effect how prompts are interpreted</HelperTextItem>
                </HelperText>
              </FormHelperText>
            </FormGroup>


            <FormGroup label="ServingRuntimeType" fieldId="flyout-form-serving-runtime">
              <Dropdown
                isOpen={isServingRuntimeTypeOpen}
                onSelect={onServingRuntimeTypeSelect}
                onOpenChange={(isOpen: boolean) => setIsServingRuntimeTypeOpen(isOpen)}
                toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
                  <MenuToggle ref={toggleRef} onClick={onServingRuntimeTypeClick} isExpanded={isServingRuntimeTypeOpen}>
                    {servingRuntimeType}
                  </MenuToggle>
                )}
                ouiaId="BasicDropdown"
                shouldFocusToggleOnSelect
                  >
                <DropdownList>
                  {SERVING_RUNTIME_TYPE.map((item) => (
                    <DropdownItem key={item} value={item}>
                      {item}
                    </DropdownItem>
                  ))}
                </DropdownList>
              </Dropdown>
            <FormHelperText>
                <HelperText>
                  <HelperTextItem>Serving Runtime you are using, OpenAI is currently all that is supported (vLLM works with the OpenAI Serving runtime)</HelperTextItem>
                </HelperText>
              </FormHelperText>
            </FormGroup>

            <FormGroup label="Model Name" fieldId="flyout-form-model-name">
              <TextInput
                type="text"
                id="flyout-form-model-name"
                name="flyout-form-model-name"
                value={modelName}
                onChange={handleModelNameChange}
              />
              <FormHelperText>
                <HelperText>
                  <HelperTextItem>Name of the Model on the Serving Runtime</HelperTextItem>
                </HelperText>
              </FormHelperText>
            </FormGroup>

            <FormGroup label="URL" fieldId="flyout-form-url">
              <TextInput
                type="text"
                id="flyout-form-url"
                name="flyout-form-url"
                value={url}
                onChange={handleUrlChange}
              />
              <FormHelperText>
                <HelperText>
                  <HelperTextItem>URL of the Serving Runtime</HelperTextItem>
                </HelperText>
              </FormHelperText>
            </FormGroup>

            <FormGroup label="API Key" fieldId="flyout-form-api-key">
              <TextInput
                type="text"
                id="flyout-form-api-key"
                name="flyout-form-api-key"
                value={apiKey}
                onChange={handleApiKeyChange}
              />
              <FormHelperText>
                <HelperText>
                  <HelperTextItem>API Key for the Serving Runtime</HelperTextItem>
                </HelperText>
              </FormHelperText>
            </FormGroup>

            <FormGroup label="Temperature" fieldId="flyout-form-temperature">
              <TextInput
                type="text"
                id="flyout-form-temperature"
                name="flyout-form-temperature"
                value={temperatureString}
                onChange={handleTemperatureChange}
              />
              <FormHelperText>
                <HelperText>
                  <HelperTextItem>
                    Temperature for the LLM (must be between 0 and 1). <br/>
                    <a href="https://www.promptingguide.ai/introduction/settings" target="_blank" rel="noopener noreferrer">Learn more</a></HelperTextItem>
                </HelperText>
              </FormHelperText>
            </FormGroup>

            <FormGroup label="Max Tokens" fieldId="flyout-form-max-tokens">
              <TextInput
                type="number"
                id="flyout-form-max-tokens"
                name="flyout-form-max-tokens"
                value={maxTokens}
                onChange={handleMaxTokensChange}
              />
              <FormHelperText>
                <HelperText>
                  <HelperTextItem>Max Tokens for the LLM&apos;s Response (Keep in mind this counts toward the max tokens both input and output allowed by the LLM)</HelperTextItem>
                </HelperText>
              </FormHelperText>
            </FormGroup>
          </Form>
        )}
      </section>
      {!error && (
        <FlyoutFooter
          isPrimaryButtonDisabled={validated !== 'success'}
          primaryButton="Create LLM Connection"
          onPrimaryButtonClick={onClick}
          secondaryButton="Cancel"
          onSecondaryButtonClick={prevStep}
        />
      )}
    </>
  );
};
