"""F-04: Route Builder endpoints."""
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.v1.deps import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.route import MappingIn, RouteCreate, RouteOut, RouteUpdate
from app.services import route_service


def _to_out(route) -> RouteOut:
    return RouteOut(
        id=str(route.id),
        route_path=route.route_path,
        description=route.description,
        mappings=[
            {
                "id": str(m.id),
                "hardware": {"id": str(m.hardware.id), "name": m.hardware.name, "base_url": m.hardware.base_url},
                "target_path": m.target_path,
                "method": m.method,
            }
            for m in route.mappings
        ],
        created_at=route.created_at,
    )


router = APIRouter(prefix="/routes", tags=["routes"])


@router.get("", response_model=list[RouteOut])
def list_routes(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> list[RouteOut]:
    return [_to_out(r) for r in route_service.list_routes(db, current_user.id)]


@router.post("", response_model=RouteOut, status_code=status.HTTP_201_CREATED)
def create_route(
    payload: RouteCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> RouteOut:
    return _to_out(route_service.create_route(db, current_user.id, payload))


@router.get("/{route_id}", response_model=RouteOut)
def get_route(
    route_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> RouteOut:
    return _to_out(route_service.get_route(db, current_user.id, route_id))


@router.patch("/{route_id}", response_model=RouteOut)
def update_route(
    route_id: str,
    payload: RouteUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> RouteOut:
    return _to_out(route_service.update_route(db, current_user.id, route_id, payload))


@router.delete("/{route_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_route(
    route_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    route_service.delete_route(db, current_user.id, route_id)


@router.put("/{route_id}/mappings", response_model=RouteOut)
def set_mappings(
    route_id: str,
    payload: list[MappingIn],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> RouteOut:
    return _to_out(route_service.set_mappings(db, current_user.id, route_id, payload))