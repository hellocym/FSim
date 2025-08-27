from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import List, Dict
import asyncio
import json
from datetime import datetime
from sqlalchemy.orm import Session
from database import SessionLocal
from models import ProductionRecord, ProductionRate, Machine

router = APIRouter()

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def send_personal_message(self, message: str, websocket: WebSocket):
        try:
            await websocket.send_text(message)
        except:
            pass

    async def broadcast(self, message: str):
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except:
                disconnected.append(connection)
        
        # 清理断开的连接
        for conn in disconnected:
            if conn in self.active_connections:
                self.active_connections.remove(conn)

manager = ConnectionManager()

@router.websocket("/ws/production")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # 每2秒推送一次实时数据
            await asyncio.sleep(2)
            
            # 获取实时生产数据
            data = await get_realtime_production_data()
            await manager.send_personal_message(json.dumps(data), websocket)
            
    except WebSocketDisconnect:
        manager.disconnect(websocket)

@router.websocket("/ws/rates")
async def rates_websocket(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # 每5秒推送一次生产速率数据
            await asyncio.sleep(5)
            
            data = await get_production_rates_data()
            await manager.send_personal_message(json.dumps(data), websocket)
            
    except WebSocketDisconnect:
        manager.disconnect(websocket)

async def get_realtime_production_data():
    db = SessionLocal()
    try:
        # 获取最近的生产记录
        recent_records = db.query(ProductionRecord).order_by(
            ProductionRecord.timestamp.desc()
        ).limit(50).all()
        
        production_data = []
        for record in recent_records:
            machine = db.query(Machine).filter(Machine.id == record.machine_id).first()
            production_data.append({
                "machine_id": record.machine_id,
                "machine_name": machine.name if machine else "Unknown",
                "item_type": record.item_type,
                "quantity": record.quantity,
                "timestamp": record.timestamp.isoformat()
            })
        
        # 获取机器状态
        machines = db.query(Machine).filter(Machine.is_active == True).all()
        machine_status = []
        for machine in machines:
            machine_status.append({
                "id": machine.id,
                "name": machine.name,
                "x": machine.x,
                "y": machine.y,
                "is_active": machine.is_active
            })
        
        return {
            "type": "production_update",
            "production_data": production_data,
            "machine_status": machine_status,
            "timestamp": datetime.utcnow().isoformat()
        }
    finally:
        db.close()

async def get_production_rates_data():
    db = SessionLocal()
    try:
        rates = db.query(ProductionRate).all()
        rates_data = []
        
        for rate in rates:
            machine = db.query(Machine).filter(Machine.id == rate.machine_id).first()
            if machine:
                rates_data.append({
                    "machine_id": rate.machine_id,
                    "machine_name": machine.name,
                    "item_type": rate.item_type,
                    "rate_per_minute": rate.rate_per_minute,
                    "calculated_at": rate.calculated_at.isoformat()
                })
        
        return {
            "type": "rates_update",
            "rates": rates_data,
            "timestamp": datetime.utcnow().isoformat()
        }
    finally:
        db.close()

# 用于主动推送数据的函数
async def broadcast_production_update():
    data = await get_realtime_production_data()
    await manager.broadcast(json.dumps(data))

async def broadcast_rates_update():
    data = await get_production_rates_data()
    await manager.broadcast(json.dumps(data))