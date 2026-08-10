"""Mock IoT devices for demos.

These endpoints simulate the hardware APIs that IoT engineers register, so the
gateway can fan out and return real data in a demo/trial environment without
needing actual devices on the network. The demo seed points its hardware
endpoints at these URLs.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import random
import time

router = APIRouter(prefix="/mock-devices", tags=["mock-devices"])


class _Sensor(BaseModel):
    temperature: float
    humidity: float
    battery: int


class _Rpi(BaseModel):
    cpu_load: str
    mem_used: str
    status: str
    uptime_days: int


class _Camera(BaseModel):
    stream: str
    resolution: str
    fps: int


@router.get("/esp32/sensors", response_model=_Sensor)
def esp32_sensors() -> _Sensor:
    return _Sensor(
        temperature=round(20 + random.random() * 10, 1),
        humidity=round(40 + random.random() * 30, 1),
        battery=random.randint(70, 100),
    )


@router.get("/rpi/stats", response_model=_Rpi)
def rpi_stats() -> _Rpi:
    return _Rpi(
        cpu_load=f"{random.randint(15, 70)}%",
        mem_used=f"{round(0.5 + random.random() * 2, 1)}GB",
        status="online",
        uptime_days=random.randint(3, 30),
    )


@router.get("/camera/status", response_model=_Camera)
def camera_status() -> _Camera:
    return _Camera(stream="active", resolution="1080p", fps=30)


@router.get("/camera/snapshot")
def camera_snapshot() -> dict:
    return {"captured_at": time.time(), "frame_id": random.randint(1000, 9999), "size_kb": random.randint(80, 240)}


@router.get("/{device}/{path:path}")
def unknown_device(device: str, path: str) -> dict:
    raise HTTPException(status_code=404, detail=f"No mock endpoint for /{device}/{path}")