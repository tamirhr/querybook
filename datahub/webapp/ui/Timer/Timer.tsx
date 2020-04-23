import { bind } from 'lodash-decorators';
import React from 'react';
import classNames from 'classnames';

export interface ITimerProps<T> {
    formatter?: (ts: T) => React.ReactChild;
    updater?: (ts: T) => T;

    updateFrequency?: number;
    initialValue?: T;
    className?: string;
}

interface ITimerState<T> {
    value: T;
}

export class Timer<T = number> extends React.PureComponent<
    ITimerProps<T>,
    ITimerState<T>
> {
    public static defaultProps = {
        formatter: (timestamp) => timestamp,
        updater: (timestamp) => timestamp + 1,

        updateFrequency: 1000, // 1 second
        className: '',
        initialValue: 0,
    };

    private updateInterval: number = null;

    constructor(props) {
        super(props);

        this.state = {
            value: this.props.initialValue,
        };
    }

    public componentDidMount() {
        this.updateInterval = setInterval(
            this.updateTimer,
            this.props.updateFrequency
        );
    }

    public componentWillUnmount() {
        clearInterval(this.updateInterval);
    }

    @bind
    public updateTimer(overrideValue = null) {
        this.setState(({ value }) => {
            return {
                value:
                    overrideValue != null
                        ? this.props.updater(overrideValue)
                        : this.props.updater(value),
            };
        });
    }

    public render() {
        const { formatter, className } = this.props;

        const { value } = this.state;

        const spanClassNames = classNames({
            Timer: true,
            [className]: Boolean(className),
        });
        return <span className={spanClassNames}>{formatter(value)}</span>;
    }
}