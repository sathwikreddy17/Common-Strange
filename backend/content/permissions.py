from typing import Optional, List

from rest_framework.permissions import BasePermission


class IsInGroup(BasePermission):
    """Base permission class that checks group membership."""
    group_name: Optional[str] = None
    # Groups that also have this permission (hierarchical)
    also_allowed_groups: List[str] = []

    def has_permission(self, request, view):
        if request.user and request.user.is_authenticated:
            if request.user.is_superuser:
                return True
            if self.group_name is None:
                return False
            # Check primary group
            if request.user.groups.filter(name=self.group_name).exists():
                return True
            # Check hierarchical groups (higher roles can do what lower roles can)
            for group in self.also_allowed_groups:
                if request.user.groups.filter(name=group).exists():
                    return True
        return False


class IsWriter(IsInGroup):
    """Writers can create and edit their own drafts.
    Editors and Publishers also have Writer permissions."""
    group_name = "Writer"
    also_allowed_groups = ["Editor", "Publisher"]


class IsEditor(IsInGroup):
    """Editors can review and approve articles.
    Publishers also have Editor permissions."""
    group_name = "Editor"
    also_allowed_groups = ["Publisher"]


class IsPublisher(IsInGroup):
    """Publishers have full editorial control."""
    group_name = "Publisher"
    also_allowed_groups = []
