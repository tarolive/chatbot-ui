import { Violation } from '@app/types/ErrorObject';
import { Button } from '@patternfly/react-core';
import * as React from 'react';

interface FlyoutErrorProps {
  title: string;
  subtitle?: string;
  violations?: Violation[];
  onClick?: () => void;
}

export const FlyoutError: React.FunctionComponent<FlyoutErrorProps> = ({
  subtitle,
  title,
  violations,
  onClick,
}: FlyoutErrorProps) => {
  // TODO: Better styling here
  return (
    <>
      <div className="flyout-error">
        <div className="flyout-error-text">
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
          {violations && (
            <table style={{ width: '100%', tableLayout: 'fixed' }}>
              <thead>
                <tr>
                  <th style={{ width: '50% ', textAlign: 'center'}}>Field</th>
                  <th style={{ width: '50% ', textAlign: 'center'}}>Message</th>
                </tr>
              </thead>
              <tbody>
                {violations.map((violation, index) => (
                  <tr key={index}>
                    <td style={{ wordWrap: 'break-word', textAlign: 'center' }}>{violation.field.split('.').pop()}</td>
                    <td style={{ wordWrap: 'break-word', textAlign: 'center' }}>{violation.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {onClick && (
          <div className="flyout-error-action">
            <Button onClick={onClick}>Retry</Button>
          </div>
        )}
      </div>
    </>
  );
};
