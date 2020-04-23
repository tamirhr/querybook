# Copyright 2019 Pinterest, Inc
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

import flask
from flask_login import UserMixin, LoginManager
from flask import abort

from app.db import with_session
from const.datasources import ACCESS_RESTRICTED_STATUS_CODE, UNAUTHORIZED_STATUS_CODE
from const.user_roles import UserRoleType

# from lib.utils.decorators import in_mem_memoized
from models.user import User
from app.db import DBSession, get_session
from logic.admin import get_api_access_token
from logic.environment import get_all_accessible_environment_ids_by_uid
from logic.user import get_user_by_id


class AuthenticationError(Exception):
    pass


class AuthUser(UserMixin):
    def __init__(self, user: User):
        self._user_dict = user.to_dict(with_roles=True)

    @property
    def id(self):
        return self._user_dict["id"]

    def get_id(self):
        return str(self.id)

    @property
    def is_admin(self):
        return UserRoleType.ADMIN.value in self._user_dict["roles"]

    @property
    # @in_mem_memoized(300)
    def environment_ids(self):
        return list(
            map(
                lambda e: e[0],
                get_all_accessible_environment_ids_by_uid(
                    self.id, session=get_session()
                ),
            )
        )


class DataHubLoginManager(LoginManager):
    def __init__(self, *args, **kwargs):
        super(DataHubLoginManager, self).__init__(*args, **kwargs)

        # Note: This code only applies to the current version of Flask-Login(0.4.1)
        # When upgrade, please use _request_callback and _user_callback
        self.request_callback = load_user_with_api_access_token
        self.user_callback = load_user


@with_session
def load_user(uid, session=None):
    if not uid or uid == "None":
        return None
    user = get_user_by_id(uid, session=session)
    return AuthUser(user)


def load_user_with_api_access_token(request):
    token_string = request.headers.get("api-access-token")
    if token_string:
        with DBSession() as session:
            token_validation = get_api_access_token(token_string)
            if token_validation:
                if token_validation.enabled:
                    user = get_user_by_id(token_validation.creator_uid, session=session)
                    return AuthUser(user)
                else:
                    flask.abort(401, description="Token is disabled.")
            else:
                flask.abort(401, description="Token is invalid.")
    return None


def abort_unauthorized():
    """
    Indicate that authorization is required
    :return:
    """
    abort(UNAUTHORIZED_STATUS_CODE)


def abort_forbidden():
    abort(ACCESS_RESTRICTED_STATUS_CODE)