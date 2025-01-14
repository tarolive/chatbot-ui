import React, { useEffect, useRef, useState } from 'react';
import { Brand, Nav, NavItem, NavList, PageSidebar } from '@patternfly/react-core';
import logo from '@app/bgimages/Logo-Red_Hat-Composer_AI_Studio-A-Standard-RGB.svg';
import logoDark from '@app/bgimages/Logo-Red_Hat-Composer_AI_Studio-A-Reverse.svg';
import { FlyoutMenu } from './FlyoutMenu';
import { NavLink } from 'react-router-dom';
import { FlyoutWizardProvider } from '@app/FlyoutWizard/FlyoutWizardContext';
import { FlyoutList } from '@app/FlyoutList/FlyoutList';
import { FlyoutWizard } from '@app/FlyoutWizard/FlyoutWizard';
import { AssistantFlyoutForm } from '@app/FlyoutForm/AssistantFlyoutForm';
import { ComponentType } from '@app/types/enum/ComponentType';
import { KnowledgeSourceFlyoutForm } from '@app/FlyoutForm/KnowledgeSourceFlyoutForm';
import { LLMConnectionFlyoutForm } from '@app/FlyoutForm/LLMConnectionFlyoutForm';
import { FlyoutError } from '@app/FlyoutError/FlyoutError';

export const SidebarWithFlyout: React.FunctionComponent = () => {
  const [sidebarHeight, setSidebarHeight] = useState(0);
  const [visibleFlyout, setVisibleFlyout] = useState(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const flyoutMenuRef = useRef<HTMLDivElement>(null);

  // Capture sidebar height initially and whenever it changes.
  // We use this to control the flyout height.
  useEffect(() => {
    const updateHeight = () => {
      if (sidebarRef.current) {
        setSidebarHeight(sidebarRef.current.offsetHeight);
      }
    };

    // Set initial height and add event listeners for window resize
    updateHeight();
    window.addEventListener('resize', updateHeight);

    return () => {
      window.removeEventListener('resize', updateHeight);
    };
  }, []);

  // Adjust flyout height to match the sidebar height when flyout is visible
  useEffect(() => {
    if (visibleFlyout && sidebarRef.current && flyoutMenuRef.current) {
      const sidebarHeight = sidebarRef.current.offsetHeight;
      flyoutMenuRef.current.style.height = `${sidebarHeight}px`;
    }
  }, [visibleFlyout]);

  const toggleFlyout = (e) => {
    if (visibleFlyout === e.target.innerText) {
      setVisibleFlyout(null);
    } else {
      setVisibleFlyout(e.target.innerText);
    }
  };

  /*const FLYOUT_CONTENT = {
    Assistants: {
      title: 'Create your first assistant',
      subtitle: 'Work smarter and faster with tailored assistance',
      primaryButtonText: 'Create assistant',
    },
  };*/

  const renderContent = (visibleFlyout) => {
    if (visibleFlyout === 'Assistants') {
      return (
        <FlyoutWizardProvider>
          <FlyoutWizard
            steps={[
              <FlyoutList
                key="assistant-list"
                hideFlyout={() => setVisibleFlyout(null)}
                buttonText="New Assistant"
                componentType={ComponentType.ASSISTANT}
                typeWordPlural="assistants"
                title={visibleFlyout}
              />,
              <AssistantFlyoutForm key="assistant-form" header="New assistant" hideFlyout={() => setVisibleFlyout(null)} />,
            ]}
          />
        </FlyoutWizardProvider>
      );
    }
    if (visibleFlyout === 'Knowledge Sources') {
      return (
        <FlyoutWizardProvider>
          <FlyoutWizard
            steps={[
              <FlyoutList
                key="knowledge-source-list"
                hideFlyout={() => setVisibleFlyout(null)}
                buttonText="New Knowledge Source"
                componentType={ComponentType.KNOWLEDGE_SOURCE}
                typeWordPlural="knowledge sources"
                title={visibleFlyout}
              />,
              <KnowledgeSourceFlyoutForm key="knowledge-source-form" header="New Knowledge Source" hideFlyout={() => setVisibleFlyout(null)} />,
            ]}
          />
        </FlyoutWizardProvider>
      );
    }
    if (visibleFlyout === 'LLM Connections') {
      return (
        <FlyoutWizardProvider>
          <FlyoutWizard
            steps={[
              <FlyoutList
                key="llm-connection-list"
                hideFlyout={() => setVisibleFlyout(null)}
                buttonText="New LLM Connection"
                componentType={ComponentType.LLM_CONNECTION}
                typeWordPlural="llm connections"
                title={visibleFlyout}
              />,
              <LLMConnectionFlyoutForm key="llm-connection-form" header="New LLM Connection" hideFlyout={() => setVisibleFlyout(null)} />,
            ]}
          />
        </FlyoutWizardProvider>
      );
    }
    return <FlyoutError title={'Exception'} />;
  };

  return (
    <PageSidebar>
      <div id="page-sidebar" ref={sidebarRef} className="pf-c-page__sidebar" style={{ height: '100%' }}>
        <div className="sidebar-masthead">
          <div className="show-light">
            <Brand src={logo} alt="Red Hat Composer AI Studio" heights={{ default: '36px' }} />
          </div>
          <div className="show-dark">
            <Brand src={logoDark} alt="Red Hat Composer AI Studio" heights={{ default: '36px' }} />
          </div>
        </div>

        <Nav id="nav-primary-simple" className="pf-c-nav sidebar-nav" aria-label="Global">
          <NavList>
            <NavItem onClick={() => setVisibleFlyout(null)}>
              <NavLink to="/">Home</NavLink>
            </NavItem>
            <NavItem
              component="button"
              onClick={toggleFlyout}
              aria-haspopup="dialog"
              aria-expanded={visibleFlyout === 'Assistants'}
            >
              Assistants
            </NavItem>
            <NavItem
              component="button"
              onClick={toggleFlyout}
              aria-haspopup="dialog"
              aria-expanded={visibleFlyout === 'Knowledge Sources'}
            >
              Knowledge Sources
            </NavItem>
            <NavItem
              component="button"
              onClick={toggleFlyout}
              aria-haspopup="dialog"
              aria-expanded={visibleFlyout === 'LLM Connections'}
            >
              LLM Connections
            </NavItem>
          </NavList>
        </Nav>
        {/* Flyout menu */}
        {visibleFlyout && (
          <FlyoutMenu key={visibleFlyout} id={visibleFlyout} height={sidebarHeight}>
            {renderContent(visibleFlyout)}
          </FlyoutMenu>
        )}
      </div>
    </PageSidebar>
  );
};
