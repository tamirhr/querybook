import React from 'react';
import { useSelector } from 'react-redux';
import classNames from 'classnames';

import history from 'lib/router-history';
import {
    currentEnvironmentSelector,
    userEnvironmentNamesSelector,
    orderedEnvironmentsSelector,
} from 'redux/environment/selector';
import { titleize } from 'lib/utils';

import './EnvironmentTopbar.scss';
import { Level } from 'ui/Level/Level';
import { EnvironmentDropdownButton } from './EnvironmentDropdownButton';
import { Link } from 'ui/Link/Link';

const NUMBER_OF_ICONS_TO_SHOW = 5;

export const EnvironmentTopbar: React.FunctionComponent = () => {
    const environments = useSelector(orderedEnvironmentsSelector);
    const currentEnvironment = useSelector(currentEnvironmentSelector);
    const userEnvironmentNames = useSelector(userEnvironmentNamesSelector);

    if (!environments || environments.length < 2) {
        return null;
    }

    const environmentIcons = environments
        .slice(0, NUMBER_OF_ICONS_TO_SHOW)
        .map((environment) => {
            const selected = currentEnvironment
                ? currentEnvironment.id === environment.id
                : false;
            const accessible = userEnvironmentNames.has(environment.name);
            return (
                <Link
                    key={environment.id}
                    className="env-icon-wrapper"
                    aria-label={[
                        titleize(environment.name),
                        environment.description,
                    ]
                        .filter((s) => s)
                        .join('. ')}
                    data-balloon-pos={'down-left'}
                    data-balloon-length="medium"
                    to={`/${environment.name}/`}
                >
                    <span
                        className={classNames({
                            'env-icon': true,
                            disabled: !accessible,
                            selected,
                        })}
                    >
                        {environment.name[0].toLocaleUpperCase()}
                    </span>
                </Link>
            );
        });

    return (
        <Level className="EnvironmentTopbar ">
            <div>{environmentIcons}</div>
            <div>
                <EnvironmentDropdownButton skip={NUMBER_OF_ICONS_TO_SHOW} />
            </div>
        </Level>
    );
};