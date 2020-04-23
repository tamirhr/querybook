import classNames from 'classnames';
import React from 'react';

import { TooltipDirection } from 'const/tooltip';
import * as Utils from 'lib/utils';
import { Button, IButtonProps } from 'ui/Button/Button';

const DEFAULT_TOOL_TIP = 'Click To Copy.';
const DEFAULT_COPIED_TOOL_TIP = 'Copied!';

interface ICopyButtonProps extends IButtonProps {
    copyText: string;
    icon?: string;
    title?: string;
    className?: string;

    tooltip?: string;
    copiedTooltip?: string;
    tooltipDirection?: TooltipDirection;
}

interface IState {
    tooltip: string;
}

export const CopyButton: React.FunctionComponent<ICopyButtonProps> = ({
    copyText,
    className = '',
    tooltip = DEFAULT_TOOL_TIP,
    copiedTooltip = DEFAULT_COPIED_TOOL_TIP,
    tooltipDirection = 'up',
    ...propsForButton
}) => {
    const [tooltipToShow, setTooltipToShow] = React.useState(tooltip);

    return (
        <Button
            className={classNames({
                CopyButton: true,
                [className]: className,
            })}
            aria-label={tooltipToShow}
            data-balloon-pos={tooltipDirection}
            onClick={() => {
                Utils.copy(copyText);
                setTooltipToShow(copiedTooltip);
            }}
            onMouseLeave={() => setTooltipToShow(tooltip)}
            icon="copy"
            {...propsForButton}
        />
    );
};