import { useAppData } from '@app/AppData/AppDataContext';
import { FlyoutError } from '@app/FlyoutError/FlyoutError';
import { FlyoutFooter } from '@app/FlyoutFooter/FlyoutFooter';
import { FlyoutHeader } from '@app/FlyoutHeader/FlyoutHeader';
import { FlyoutLoading } from '@app/FlyoutLoading/FlyoutLoading';
import { useFlyoutWizard } from '@app/FlyoutWizard/FlyoutWizardContext';
import { assistantAdminAPI, knowledgeSourceAPI, llmConnectionAPI } from '@app/adapters/APIExporter';
import { CannedChatbot } from '@app/types/CannedChatbot';
import { ErrorObject } from '@app/types/ErrorObject';
import { ComponentType } from '@app/types/enum/ComponentType';
import { ERROR_TITLE } from '@app/utils/utils';
import { Label, Menu, MenuContent, MenuItem, MenuList, SearchInput } from '@patternfly/react-core';
import * as React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

interface FlyoutListProps {
  typeWordPlural: string;
  buttonText: string;
  componentType: ComponentType;
  hideFlyout: () => void;
  onFooterButtonClick?: () => void;
  title: string;
}
export const FlyoutList: React.FunctionComponent<FlyoutListProps> = ({
  typeWordPlural,
  buttonText,
  componentType,
  hideFlyout,
  onFooterButtonClick,
  title,
}: FlyoutListProps) => {
  const [error, setError] = React.useState<ErrorObject>();
  const [items, setItems] = React.useState<CannedChatbot[]>([]);
  const [filteredItems, setFilteredItems] = React.useState<CannedChatbot[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const { nextStep, reloadList, setReloadList } = useFlyoutWizard();
  const location = useLocation();
  const navigate = useNavigate();

  const [selectedItem, setSelectedItem] = React.useState<unknown>([]);

  const { updateFlyoutMenuSelectedChatbot, setChatbots } = useAppData();

  const header = (
    <div className="title-with-label">
      {title} <Label variant="outline">{items.length}</Label>
    </div>
  );

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
    } else {
      if ('message' in e) {
        newError = { title: 'Error', body: e.message };
      } else {
        newError = { title: 'Error', body: e };
      }
    }
    setError(newError);
  };

  const getItems = async () => {
    try {
      let data;
      if(componentType == ComponentType.ASSISTANT) {
        await assistantAdminAPI.listAssistants().then((response) => data = response.data);
      } else if(componentType == ComponentType.KNOWLEDGE_SOURCE) {
        await knowledgeSourceAPI.listRetrieverConnections().then((response) => data = response.data);
      } else if(componentType == ComponentType.LLM_CONNECTION) {
        await llmConnectionAPI.listLlmConnections().then((response) => data = response.data);
      } else {
        console.error('Invalid component type');
        throw new Error('Invalid component type');
      }
      setItems(data);
      setFilteredItems(data);
      setIsLoading(false);
      setReloadList(false);
      if(componentType == ComponentType.ASSISTANT) {
        setChatbots(data);
      }
    } catch (error) {
      console.error('Error loading assistants', error);
      handleError(error);
      setIsLoading(false);
    }
  };

  const deleteSelectedItem = async () => {
    if(selectedItem == null) {
      console.error('No item selected');
      return;
    }
    if(componentType == ComponentType.ASSISTANT) {
      await assistantAdminAPI.deleteAssistant(selectedItem['id']);
    } else if(componentType == ComponentType.KNOWLEDGE_SOURCE) {
      await knowledgeSourceAPI.deleteRetrieverConnection(selectedItem['id']);
    } else if(componentType == ComponentType.LLM_CONNECTION) {
      await llmConnectionAPI.deleteLlmConnection(selectedItem['id']);
    } else {
      console.error('Invalid component type');
      throw new Error('Invalid component type');
    }
    loadItems();
  }

  const loadItems = async () => {
    if (reloadList) {
      await getItems();
      return;
    }
    await getItems();
  };

  React.useEffect(() => {
    setReloadList(true);
    loadItems();
  }, [componentType]);

  const buildMenu = () => {
    return (
      <MenuList>
        {filteredItems.map((item) => (
          <MenuItem
            className="pf-chatbot__menu-item"
            itemId={item.id}
            key={item.name}
            isSelected={item.id === (selectedItem as { id: string })?.id}
            description={item.description}
          >
            {item.displayName ?? item.name}
          </MenuItem>
        ))}
      </MenuList>
    );
  };

  const onSelect = (_event: React.MouseEvent<Element, MouseEvent> | undefined, value) => {
    if (filteredItems.length > 0) {
      const selectedItem = items.filter((item) => item.id === value)[0];

      setSelectedItem(selectedItem);

      if(componentType == ComponentType.ASSISTANT) {
        updateFlyoutMenuSelectedChatbot(selectedItem);
      }
      if (location.pathname !== '/') {
        navigate('/');
      }
    }
  };

  const findMatchingItems = (targetValue: string) => {
    const matchingElements = items.filter((item) => {
      const name = item.displayName ?? item.name;
      return name.toLowerCase().includes(targetValue.toLowerCase());
    });
    return matchingElements;
  };

  const handleTextInputChange = (value: string) => {
    if (value === '') {
      setFilteredItems(items);
      return;
    }
    const newItems = findMatchingItems(value);
    setFilteredItems(newItems);
  };

  const onClick = () => {
    setError(undefined);
    loadItems();
  };

  return error ? (
    <FlyoutError title={error.title} subtitle={error.body} onClick={onClick} />
  ) : (
    <>
      <FlyoutHeader title={header} hideFlyout={hideFlyout} />
      {isLoading ? (
        <FlyoutLoading />
      ) : (
        <section className="flyout-list" aria-label={title} tabIndex={-1}>
          <SearchInput
            onChange={(_event, value) => handleTextInputChange(value)}
            placeholder={`Search ${typeWordPlural}...`}
          />
          <Menu className="flyout-list-menu" isPlain onSelect={onSelect}>
            <MenuContent>
              {filteredItems.length > 0 ? (
                buildMenu()
              ) : (
                <MenuList>
                  <MenuItem key="no-items">No results found</MenuItem>
                </MenuList>
              )}
            </MenuContent>
          </Menu>
        </section>
      )}
      <FlyoutFooter primaryButton={buttonText} onPrimaryButtonClick={onFooterButtonClick ?? nextStep} 
                dangerSecondaryButton='Delete' onDangerSecondaryButtonClick={deleteSelectedItem}/>
    </>
  );
};
