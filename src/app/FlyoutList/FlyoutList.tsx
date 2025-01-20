import * as React from 'react';

import { Label, Menu, MenuContent, MenuItem, MenuList, SearchInput } from '@patternfly/react-core';
import { useLocation, useNavigate } from 'react-router-dom';

import { CannedChatbot } from '@app/types/CannedChatbot';
import { ERROR_TITLE } from '@app/utils/utils';
import { ErrorObject } from '@app/types/ErrorObject';
import { FlyoutError } from '@app/FlyoutError/FlyoutError';
import { FlyoutFooter } from '@app/FlyoutFooter/FlyoutFooter';
import { FlyoutHeader } from '@app/FlyoutHeader/FlyoutHeader';
import { FlyoutLoading } from '@app/FlyoutLoading/FlyoutLoading';
import { useAppData } from '@app/AppData/AppDataContext';
import { useConfig } from '../../ConfigContext';
import { useFlyoutWizard } from '@app/FlyoutWizard/FlyoutWizardContext';

interface FlyoutListProps {
  typeWordPlural: string;
  buttonText: string;
  hideFlyout: () => void;
  onFooterButtonClick?: () => void;
  title: string;
}
export const FlyoutList: React.FunctionComponent<FlyoutListProps> = ({
  typeWordPlural,
  buttonText,
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
  const { flyoutMenuSelectedChatbot, updateFlyoutMenuSelectedChatbot, chatbots, setChatbots } = useAppData();
  const globalConfig = useConfig();
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

  const getAssistants = async () => {
    const url = globalConfig?.REACT_APP_BASE_URL + '/admin/assistant' || '';

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`${response.status}`);
      }
      const data = await response.json();
      setItems(data);
      setFilteredItems(data);
      setIsLoading(false);
      setReloadList(false);
      setChatbots(data);
    } catch (error) {
      console.error('Error loading assistants', error);
      handleError(error);
      setIsLoading(false);
    }
  };

  const loadAssistants = async () => {
    if (reloadList) {
      await getAssistants();
      return;
    }
    if (chatbots.length > 0) {
      setItems(chatbots);
      setFilteredItems(chatbots);
      setIsLoading(false);
      return;
    }
    await getAssistants();
  };

  React.useEffect(() => {
    loadAssistants();
  }, []);

  const buildMenu = () => {
    return (
      <MenuList>
        {filteredItems.map((item) => (
          <MenuItem
            className="pf-chatbot__menu-item"
            itemId={item.name}
            key={item.name}
            isSelected={item.name === flyoutMenuSelectedChatbot?.name}
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
      const newChatbot = items.filter((item) => item.name === value)[0];
      updateFlyoutMenuSelectedChatbot(newChatbot);
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
    loadAssistants();
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
      <FlyoutFooter primaryButton={buttonText} onPrimaryButtonClick={onFooterButtonClick ?? nextStep} />
    </>
  );
};
