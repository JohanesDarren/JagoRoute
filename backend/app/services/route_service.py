"""Route Builder business logic (F-04). Operates on the user's own resources only."""
import uuid

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core import redis_client
from app.models.route import Route
from app.repositories import route_repo
from app.schemas.route import MappingIn, RouteCreate, RouteUpdate


def list_routes(db: Session, user_id) -> list[Route]:
    return route_repo.list_for_user(db, user_id)


def _ensure_path_free(db: Session, route_path: str, exclude_route_id: uuid.UUID | None = None) -> None:
    existing = route_repo.get_by_path(db, route_path)
    if existing is not None and (exclude_route_id is None or existing.id != exclude_route_id):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Route path '{route_path}' is already taken.",
        )


def _verify_mappings(db: Session, user_id, mappings: list[MappingIn]) -> list[dict]:
    verified: list[dict] = []
    for item in mappings:
        if route_repo.ensure_hardware_owned(db, user_id, item.hardware_id) is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Hardware endpoint {item.hardware_id} not found or not owned by you.",
            )
        verified.append(item.model_dump())
    return verified


def _invalidate_cache(route_path: str) -> None:
    redis_client.cache_delete_pattern(f"route:*:{route_path}")


def create_route(db: Session, user_id, payload: RouteCreate) -> Route:
    _ensure_path_free(db, payload.route_path)
    mappings = _verify_mappings(db, user_id, payload.mappings)
    route = route_repo.create(db, user_id, payload.route_path, payload.description)
    if mappings:
        route_repo.upsert_mappings(db, route, mappings)
    return route


def get_route(db: Session, user_id, route_id: str) -> Route:
    route = route_repo.get_for_user(db, user_id, route_id)
    if route is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Route not found.")
    return route


def update_route(db: Session, user_id, route_id: str, payload: RouteUpdate) -> Route:
    route = get_route(db, user_id, route_id)
    updates = payload.model_dump(exclude_unset=True, exclude_none=True)
    if "route_path" in updates:
        _ensure_path_free(db, updates["route_path"], exclude_route_id=route.id)
    updated = route_repo.update(db, route, updates)
    _invalidate_cache(updated.route_path)
    return updated


def delete_route(db: Session, user_id, route_id: str) -> None:
    route = get_route(db, user_id, route_id)
    _invalidate_cache(route.route_path)
    route_repo.delete(db, route)


def set_mappings(db: Session, user_id, route_id: str, mappings: list[MappingIn]) -> Route:
    route = get_route(db, user_id, route_id)
    verified = _verify_mappings(db, user_id, mappings)
    route_repo.upsert_mappings(db, route, verified)
    _invalidate_cache(route.route_path)
    return route