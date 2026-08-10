from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.hardware import HardwareEndpoint
from app.models.route import Route, RouteMapping


def list_for_user(db: Session, user_id) -> list[Route]:
    return list(
        db.scalars(
            select(Route).where(Route.user_id == user_id).order_by(Route.created_at.desc())
        )
    )


def get_for_user(db: Session, user_id, route_id) -> Route | None:
    return db.scalar(
        select(Route).where(Route.id == route_id, Route.user_id == user_id)
    )


def get_by_path(db: Session, route_path: str) -> Route | None:
    return db.scalar(select(Route).where(Route.route_path == route_path))


def create(db: Session, user_id, route_path: str, description: str | None) -> Route:
    route = Route(user_id=user_id, route_path=route_path, description=description)
    db.add(route)
    db.commit()
    db.refresh(route)
    return route


def update(db: Session, route: Route, updates: dict) -> Route:
    for key, value in updates.items():
        if value is not None:
            setattr(route, key, value)
    db.commit()
    db.refresh(route)
    return route


def delete(db: Session, route: Route) -> None:
    db.delete(route)
    db.commit()


def upsert_mappings(db: Session, route: Route, mappings: list[dict]) -> list[RouteMapping]:
    """Replace all mappings of a route with the given ones (hardware ownership checked by caller)."""
    for mapping in list(route.mappings):
        db.delete(mapping)
    db.flush()

    created: list[RouteMapping] = []
    for item in mappings:
        mapping = RouteMapping(
            route_id=route.id,
            hardware_id=item["hardware_id"],
            target_path=item["target_path"],
            method=item.get("method", "GET"),
        )
        db.add(mapping)
        created.append(mapping)
    db.commit()
    db.refresh(route)
    return created


def get_mapping(db: Session, route_id, mapping_id) -> RouteMapping | None:
    return db.scalar(
        select(RouteMapping).where(
            RouteMapping.id == mapping_id, RouteMapping.route_id == route_id
        )
    )


def ensure_hardware_owned(db: Session, user_id, hardware_id) -> HardwareEndpoint | None:
    return db.scalar(
        select(HardwareEndpoint).where(
            HardwareEndpoint.id == hardware_id, HardwareEndpoint.user_id == user_id
        )
    )