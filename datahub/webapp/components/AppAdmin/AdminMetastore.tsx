import React from 'react';
import moment from 'moment';
import { clone } from 'lodash';
import { useParams } from 'react-router-dom';
import * as Yup from 'yup';

import ds from 'lib/datasource';
import history from 'lib/router-history';
import { generateFormattedDate } from 'lib/utils/datetime';
import { useDataFetch } from 'hooks/useDataFetch';

import { AdminDeletedList } from './AdminDeletedList';

import { ScheduledTaskEditor } from 'components/ScheduledTaskEditor/ScheduledTaskEditor';
import { AdminAuditLogButton } from 'components/AdminAuditLog/AdminAuditLogButton';

import { Button } from 'ui/Button/Button';
import { Card } from 'ui/Card/Card';

import { Icon } from 'ui/Icon/Icon';
import { Loading } from 'ui/Loading/Loading';
import { SingleCRUD } from 'ui/GenericCRUD/SingleCRUD';
import {
    TemplatedForm,
    getDefaultFormValue,
    SmartForm,
    validateForm,
    updateValue,
} from 'ui/SmartForm/SmartForm';
import { Tabs } from 'ui/Tabs/Tabs';
import { SimpleField } from 'ui/FormikField/SimpleField';
import { Level } from 'ui/Level/Level';

import './AdminMetastore.scss';

const metastoreSchema = Yup.object().shape({
    name: Yup.string().min(1).max(255),
    loader: Yup.string().required(),
});

interface IAdminACLControl {
    type?: 'blacklist' | 'whitelist';
    tables?: string[];
}

export interface IAdminMetastore {
    id: number;
    created_at: number;
    updated_at: number;
    deleted_at: number;
    name: string;
    metastore_params: {};
    loader: string;
    acl_control: IAdminACLControl;
}

interface IMetastoreLoader {
    name: string;
    template: TemplatedForm;
}

interface IProps {
    metastores: IAdminMetastore[];
    loadMetastores: () => Promise<any>;
}

export const AdminMetastore: React.FunctionComponent<IProps> = ({
    metastores,
    loadMetastores,
}) => {
    const { id: metastoreId } = useParams();

    const {
        data: metastoreLoaders,
    }: { data: IMetastoreLoader[] } = useDataFetch({
        url: '/admin/query_metastore_loader/',
    });

    const createMetastore = React.useCallback(
        async (metastore: IAdminMetastore) => {
            const { data } = await ds.save(`/admin/query_metastore/`, {
                name: metastore.name,
                metastore_params: metastore.metastore_params,
                loader: metastore.loader,
                acl_control: metastore.acl_control,
            });

            await loadMetastores();
            history.push(`/admin/metastore/${data.id}/`);

            return data as IAdminMetastore;
        },
        []
    );

    const saveMetastore = React.useCallback(
        async (metastore: Partial<IAdminMetastore>) => {
            const { data } = await ds.update(
                `/admin/query_metastore/${metastoreId}/`,
                metastore
            );

            return data as IAdminMetastore;
        },
        [metastoreId]
    );

    const deleteMetastore = React.useCallback(
        async (metastore: IAdminMetastore) => {
            return ds.delete(`/admin/query_metastore/${metastore.id}/`);
        },
        []
    );

    const recoverMetastore = React.useCallback(async (mId: number) => {
        const { data } = await ds.update(
            `/admin/query_metastore/${mId}/recover/`
        );

        await loadMetastores();
        history.push(`/admin/metastore/${mId}/`);

        return data as IAdminMetastore;
    }, []);

    const itemValidator = React.useCallback(
        (metastore: IAdminMetastore) => {
            const errors: Partial<Record<keyof IAdminMetastore, string>> = {};

            if ((metastore.name || '').length === 0) {
                errors.name = 'Name cannot be empty';
            } else if ((metastore.name || '').length > 255) {
                errors.name = 'Name is too long';
            }

            const loader = (metastoreLoaders || []).find(
                (l) => l.name === metastore.loader
            );
            if (!loader) {
                errors.loader = 'Invalid loader';
            }
            const formValid = validateForm(
                metastore.metastore_params,
                loader.template
            );
            if (!formValid[0]) {
                errors.metastore_params = `Error found in loader params ${formValid[2]}: ${formValid[1]}`;
            }

            if (metastore.acl_control.type) {
                for (const [
                    index,
                    table,
                ] of metastore.acl_control.tables.entries()) {
                    errors.acl_control = `Table at index ${index} is empty`;
                }
            }

            return errors;
        },
        [metastoreLoaders]
    );

    const getMetastoreACLControlDOM = (
        aclControl: IAdminACLControl,
        onChange: (fieldName: string, fieldValue: any) => void
    ) => {
        if (aclControl.type == null) {
            return (
                <div className="AdminMetastore-acl-button">
                    <Button
                        onClick={() =>
                            onChange('acl_control', {
                                type: 'blacklist',
                                tables: [],
                            })
                        }
                        title="Create Whitelist/Blacklist"
                        type="inlineText"
                        borderless
                    />
                </div>
            );
        }

        const tablesDOM = (
            <SmartForm
                formField={{
                    field_type: 'list',
                    of: {
                        description:
                            aclControl.type === 'blacklist'
                                ? 'Table to Blacklist'
                                : 'Table to Whitelist',
                        field_type: 'string',
                        helper: '',
                        hidden: false,
                        required: true,
                    },
                    max: null,
                    min: 1,
                }}
                value={aclControl.tables}
                onChange={(path, value) =>
                    onChange(
                        `acl_control.tables`,
                        updateValue(aclControl.tables, path, value)
                    )
                }
            />
        );
        return (
            <>
                <div className="AdminMetastore-acl-warning flex-row">
                    <Icon name="alert-octagon" />
                    {aclControl.type === 'blacklist'
                        ? 'All tables will be whitelisted unless specified.'
                        : 'All tables will be blacklisted unless specified.'}
                </div>
                <div className="AdminMetastore-acl-top horizontal-space-between">
                    <Tabs
                        selectedTabKey={aclControl.type}
                        items={[
                            { name: 'Blacklist', key: 'blacklist' },
                            { name: 'Whitelist', key: 'whitelist' },
                        ]}
                        onSelect={(key) => {
                            onChange('acl_control', { type: key, tables: [] });
                        }}
                    />
                    <Button
                        title={
                            aclControl.type === 'blacklist'
                                ? 'Remove Blacklist'
                                : 'Remove Whitelist'
                        }
                        onClick={() => onChange('acl_control', {})}
                        type="inlineText"
                        borderless
                    />
                </div>
                {tablesDOM}
            </>
        );
    };

    const renderMetastoreItem = (
        item: IAdminMetastore,
        onChange: (
            fieldName: string,
            fieldValue: any,
            item?: IAdminMetastore
        ) => IAdminMetastore
    ) => {
        const loader = (metastoreLoaders || []).find(
            (l) => l.name === item.loader
        );

        const updateLoader = (loaderName: string) => {
            const newLoader = (metastoreLoaders || []).find(
                (l) => l.name === loaderName
            );
            if (newLoader) {
                onChange(
                    'metastore_params',
                    getDefaultFormValue(newLoader.template)
                );
                onChange('loader', newLoader.name);
            }
        };

        const logDOM = item.id != null && (
            <div className="right-align">
                <AdminAuditLogButton
                    itemType="query_metastore"
                    itemId={item.id}
                />
            </div>
        );
        return (
            <>
                <div className="AdminForm-top">
                    {logDOM}
                    <SimpleField stacked name="name" type="input" />
                </div>
                <div className="AdminForm-main">
                    <div className="AdminForm-left">
                        <SimpleField
                            stacked
                            name="loader"
                            type="select"
                            options={Object.values(metastoreLoaders).map(
                                (l) => ({
                                    key: l.name,
                                    value: l.name,
                                })
                            )}
                            onChange={updateLoader}
                        />

                        {loader && (
                            <div className="AdminForm-section">
                                <div className="AdminForm-section-top flex-row">
                                    <div className="AdminForm-section-title">
                                        Loader Params
                                    </div>
                                    <div className="dh-hr" />
                                </div>
                                <div className="AdminForm-section-content">
                                    <SmartForm
                                        formField={loader.template}
                                        value={item.metastore_params}
                                        onChange={(path, value) =>
                                            onChange(
                                                'metastore_params',
                                                updateValue(
                                                    item.metastore_params,
                                                    path,
                                                    value
                                                )
                                            )
                                        }
                                    />
                                </div>
                            </div>
                        )}
                        <div className="AdminForm-section">
                            <div className="AdminForm-section-top flex-row">
                                <div className="AdminForm-section-title">
                                    ACL Control
                                </div>
                                <div className="dh-hr" />
                            </div>
                            <div className="AdminForm-section-content">
                                {getMetastoreACLControlDOM(
                                    item.acl_control,
                                    onChange
                                )}
                            </div>
                        </div>
                        {metastoreId !== 'new' && (
                            <div className="AdminForm-section">
                                <div className="AdminForm-section-top flex-row">
                                    <div className="AdminForm-section-title">
                                        Update Schedule
                                    </div>
                                    <div className="dh-hr" />
                                </div>
                                <div className="AdminForm-section-content">
                                    <ScheduledTaskEditor
                                        scheduleName={`update_metastore_${metastoreId}`}
                                        taskName="tasks.update_metastore.update_metastore"
                                        taskType="prod"
                                        args={[metastoreId]}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </>
        );
    };

    if (metastoreId === 'new') {
        if (metastoreLoaders) {
            const defaultLoader = metastoreLoaders[0];

            const newMetastore: IAdminMetastore = {
                id: null,
                created_at: moment().unix(),
                updated_at: moment().unix(),
                deleted_at: null,
                name: '',
                loader: defaultLoader.name,
                metastore_params: getDefaultFormValue(defaultLoader.template),
                acl_control: {},
            };
            return (
                <div className="AdminMetastore">
                    <div className="AdminForm">
                        <SingleCRUD
                            item={newMetastore}
                            createItem={createMetastore}
                            renderItem={renderMetastoreItem}
                            validate={itemValidator}
                        />
                    </div>
                </div>
            );
        } else {
            return <Loading />;
        }
    }

    const metastoreItem = metastores?.find(
        (metastore) => Number(metastoreId) === metastore.id
    );

    if (
        metastoreId === 'deleted' ||
        (metastoreItem && metastoreItem.deleted_at !== null)
    ) {
        const deletedMetastores = metastoreItem?.deleted_at
            ? [metastoreItem]
            : metastores?.filter((ms) => ms.deleted_at);
        return (
            <div className="AdminMetastore">
                <div className="AdminLanding-top">
                    <div className="AdminLanding-desc">
                        Deleted metastores can be recovered.
                    </div>
                </div>
                <div className="AdminLanding-content">
                    <AdminDeletedList
                        items={deletedMetastores}
                        onRecover={recoverMetastore}
                        keysToShow={[
                            'created_at',
                            'deleted_at',
                            'loader',
                            'metastore_params',
                        ]}
                    />
                </div>
            </div>
        );
    }

    if (metastoreItem) {
        if (metastoreLoaders) {
            return (
                <div className="AdminMetastore">
                    <div className="AdminForm">
                        <SingleCRUD
                            item={metastoreItem}
                            deleteItem={deleteMetastore}
                            onDelete={() => history.push('/admin/metastore/')}
                            updateItem={saveMetastore}
                            validate={itemValidator}
                            renderItem={renderMetastoreItem}
                            onItemCUD={loadMetastores}
                        />
                    </div>
                </div>
            );
        } else {
            return <Loading />;
        }
    } else {
        const getCardDOM = () => {
            return clone(metastores)
                .filter((ms) => ms.deleted_at == null)
                .sort((m1, m2) => m2.updated_at - m1.updated_at)
                .slice(0, 5)
                .map((m) => {
                    return (
                        <Card
                            key={m.id}
                            title={m.name}
                            children={
                                <div className="AdminLanding-card-content">
                                    <div className="AdminLanding-card-content-top">
                                        Last Updated
                                    </div>
                                    <div className="AdminLanding-card-content-date">
                                        {generateFormattedDate(m.updated_at)}
                                    </div>
                                </div>
                            }
                            onClick={() =>
                                history.push(`/admin/metastore/${m.id}/`)
                            }
                            height="160px"
                            width="240px"
                        />
                    );
                });
        };
        return (
            <div className="AdminMetastore">
                <div className="AdminLanding">
                    <div className="AdminLanding-top">
                        <Level>
                            <div className="AdminLanding-title">Metastore</div>
                            <AdminAuditLogButton itemType="query_metastore" />
                        </Level>
                        <div className="AdminLanding-desc">
                            Metastores hold metadata for the tables, such as
                            schemas and black/whitelists.
                        </div>
                    </div>
                    <div className="AdminLanding-content">
                        <div className="AdminLanding-cards flex-row">
                            {metastores && getCardDOM()}
                            <Card
                                title="+"
                                children="create a new metastore"
                                onClick={() =>
                                    history.push('/admin/metastore/new/')
                                }
                                height="160px"
                                width="240px"
                            />
                        </div>
                    </div>
                </div>
            </div>
        );
    }
};