import { ActionGroup, Button } from '@patternfly/react-core';
import { css } from '@patternfly/react-styles';
import * as React from 'react';

interface FlyoutFooterProps {
  primaryButton: string;
  onPrimaryButtonClick: () => void;
  secondaryButton?: string;
  onSecondaryButtonClick?: () => void;
  dangerSecondaryButton?: string;
  onDangerSecondaryButtonClick?: () => void;
  isPrimaryButtonDisabled?: boolean;
}
export const FlyoutFooter: React.FunctionComponent<FlyoutFooterProps> = ({
  primaryButton,
  onPrimaryButtonClick,
  secondaryButton,
  onSecondaryButtonClick,
  dangerSecondaryButton,
  onDangerSecondaryButtonClick,
  isPrimaryButtonDisabled,
}: FlyoutFooterProps) => {
  return (
    <div className="flyout-footer">
      <ActionGroup className={css('flyout-footer-action-group', secondaryButton && 'space-between')}>
        {secondaryButton && onSecondaryButtonClick && (
          <Button variant="secondary" onClick={onSecondaryButtonClick}>
            {secondaryButton}
          </Button>
        )}
        {dangerSecondaryButton && onDangerSecondaryButtonClick && (
          <Button variant="secondary" isDanger onClick={onDangerSecondaryButtonClick}>
            {dangerSecondaryButton}
          </Button>
        )}
        <Button isDisabled={isPrimaryButtonDisabled} onClick={onPrimaryButtonClick}>
          {primaryButton}
        </Button>
      </ActionGroup>
    </div>
  );
};
