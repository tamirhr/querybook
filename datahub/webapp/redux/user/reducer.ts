import { produce } from 'immer';

import localStore from 'lib/local-store';
import { USER_SETTINGS_KEY } from 'lib/local-store/const';
import { IUserState, UserAction } from './types';
import { EnvironmentAction } from 'redux/environment/types';

const userSettingsConfig: Record<
    string,
    {
        default: string;
        helper: string;
        options: Array<string | { value: string; key: string }>;
        per_env?: boolean;
    }
> = require('config/user_setting.yaml');

function computeUserSettings(
    customSetting: Record<string, string>,
    currentEnvId?: number
) {
    const computedUserSettings = Object.entries(userSettingsConfig).reduce(
        (userSettings, [configName, configVal]) => {
            if (configVal.per_env && currentEnvId) {
                const perEnvConfigName = `${configName}|${currentEnvId}`;
                userSettings[configName] =
                    perEnvConfigName in customSetting
                        ? customSetting[perEnvConfigName]
                        : configVal.default;
            } else {
                userSettings[configName] =
                    configName in customSetting
                        ? customSetting[configName]
                        : configVal.default;
            }

            return userSettings;
        },
        {}
    );

    return computedUserSettings;
}

function applyUserSettings(
    oldUserSettings: Record<string, string>,
    userSettings: Record<string, string>
) {
    for (const [key, value] of Object.entries(userSettings)) {
        const oldValue = oldUserSettings[key];
        if (value === oldValue) {
            continue;
        }

        // Apply each settings individually
        if (key === 'theme') {
            switch (value) {
                case 'dark':
                    document.body.className = 'dark-theme';
                    break;
                case 'night':
                    document.body.className = 'night-theme';
                    break;
                case 'dawn':
                    document.body.className = 'dawn-theme';
                    break;
                case 'lush':
                    document.body.className = 'lush-theme';
                    break;
                default:
                    document.body.className = '';
            }
        }
    }
}

function storeUserSettingsToLocal(userSettings: Record<string, string>) {
    localStore.set(USER_SETTINGS_KEY, userSettings);
}

const initialState: Readonly<IUserState> = {
    rawSettings: {},
    computedSettings: computeUserSettings({}),
    fromWeb: false,

    userInfoById: {},
};

export default function userReducer(
    state = initialState,
    action: UserAction | EnvironmentAction
): IUserState {
    return produce(state, (draft) => {
        switch (action.type) {
            case '@@user/RECEIVE_USER': {
                const userInfo = action.payload;
                draft.userInfoById[userInfo.id] = userInfo;
                return;
            }
            case '@@user/LOGIN_USER': {
                const { userInfo, myUserInfo } = action.payload;
                draft.userInfoById[userInfo.id] = userInfo;
                draft.myUserInfo = myUserInfo;
                return;
            }
            case '@@user/RECEIVE_USER_SETTING': {
                if (state.fromWeb && action.payload.fromLocal) {
                    // If already received web settings, then skip local settings
                    return;
                }

                const {
                    fromLocal,
                    userSetting,
                    environmentId,
                } = action.payload;

                draft.fromWeb = !fromLocal;
                draft.rawSettings = userSetting;
                draft.computedSettings = computeUserSettings(
                    userSetting,
                    environmentId
                );

                applyUserSettings(
                    state.computedSettings,
                    draft.computedSettings
                );
                storeUserSettingsToLocal(draft.rawSettings);
                return;
            }
            case '@@user/RECEIVE_USER_KEY_SETTING': {
                const { key, value, environmentId } = action.payload;
                draft.rawSettings[key] = value;
                draft.computedSettings = computeUserSettings(
                    draft.rawSettings,
                    environmentId
                );
                applyUserSettings(
                    state.computedSettings,
                    draft.computedSettings
                );
                storeUserSettingsToLocal(draft.rawSettings);
                return;
            }

            case '@@environment/SET_ENVIRONMENT_BY_ID': {
                const { id: envId } = action.payload;
                draft.computedSettings = computeUserSettings(
                    draft.rawSettings,
                    envId
                );
                return;
            }
        }
    });
}