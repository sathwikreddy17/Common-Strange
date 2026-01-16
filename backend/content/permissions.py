from typing import Optional

from rest_framework.permissions import BasePermission


class IsInGroup(BasePermission):
    group_name: Optional[str] = None

    def has_permission(self, request, view):
        if request.user and request.user.is_authenticated:
            if request.user.is_superuser:
                return True
            if self.group_name is None:
                return False
            return request.user.groups.filter(name=self.group_name).exists()
        return False


class IsWriter(IsInGroup):
    group_name = "Writer"


class IsEditor(IsInGroup):
    group_name = "Editor"


class IsPublisher(IsInGroup):
    group_name = "Publisher"
