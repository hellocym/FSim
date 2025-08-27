from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel

from database import get_db
from models import Machine, Connection, ItemType

router = APIRouter()

class MachineCreate(BaseModel):
    name: str
    type: str
    x: float
    y: float
    input_capacity: int
    output_capacity: int
    processing_time: float
    input_items: List[str]
    output_items: List[str]

class MachineUpdate(BaseModel):
    name: str = None
    x: float = None
    y: float = None
    input_capacity: int = None
    output_capacity: int = None
    processing_time: float = None
    input_items: List[str] = None
    output_items: List[str] = None
    is_active: bool = None

class MachineResponse(BaseModel):
    id: int
    name: str
    type: str
    x: float
    y: float
    input_capacity: int
    output_capacity: int
    processing_time: float
    input_items: List[str]
    output_items: List[str]
    is_active: bool

    class Config:
        from_attributes = True

class ConnectionCreate(BaseModel):
    source_machine_id: int
    target_machine_id: int
    source_output_index: int = 0
    target_input_index: int = 0

class ConnectionResponse(BaseModel):
    id: int
    source_machine_id: int
    target_machine_id: int
    source_output_index: int
    target_input_index: int

    class Config:
        from_attributes = True

class ItemTypeCreate(BaseModel):
    name: str
    color: str
    description: str = None

class ItemTypeResponse(BaseModel):
    id: int
    name: str
    color: str
    description: str

    class Config:
        from_attributes = True

# 机器相关API
@router.post("/machines", response_model=MachineResponse)
def create_machine(machine: MachineCreate, db: Session = Depends(get_db)):
    try:
        print(f"接收到的机器数据: {machine.dict()}")
        db_machine = Machine(**machine.dict())
        db.add(db_machine)
        db.commit()
        db.refresh(db_machine)
        print(f"机器创建成功: {db_machine.id}")
        return db_machine
    except Exception as e:
        print(f"创建机器失败: {str(e)}")
        print(f"错误类型: {type(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"创建机器失败: {str(e)}")

@router.get("/machines", response_model=List[MachineResponse])
def get_machines(db: Session = Depends(get_db)):
    machines = db.query(Machine).all()
    return machines

@router.get("/machines/{machine_id}", response_model=MachineResponse)
def get_machine(machine_id: int, db: Session = Depends(get_db)):
    machine = db.query(Machine).filter(Machine.id == machine_id).first()
    if not machine:
        raise HTTPException(status_code=404, detail="Machine not found")
    return machine

@router.put("/machines/{machine_id}", response_model=MachineResponse)
def update_machine(machine_id: int, machine: MachineUpdate, db: Session = Depends(get_db)):
    print(f"更新机器 {machine_id} 的请求数据: {machine.dict()}")
    
    db_machine = db.query(Machine).filter(Machine.id == machine_id).first()
    if not db_machine:
        print(f"机器 {machine_id} 未找到")
        raise HTTPException(status_code=404, detail="Machine not found")
    
    print(f"更新前机器位置: x={db_machine.x}, y={db_machine.y}")
    
    update_data = machine.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_machine, field, value)
    
    db.commit()
    db.refresh(db_machine)
    
    print(f"更新后机器位置: x={db_machine.x}, y={db_machine.y}")
    return db_machine

@router.delete("/machines/{machine_id}")
def delete_machine(machine_id: int, db: Session = Depends(get_db)):
    machine = db.query(Machine).filter(Machine.id == machine_id).first()
    if not machine:
        raise HTTPException(status_code=404, detail="Machine not found")
    
    # 删除相关连接
    db.query(Connection).filter(
        (Connection.source_machine_id == machine_id) | 
        (Connection.target_machine_id == machine_id)
    ).delete()
    
    db.delete(machine)
    db.commit()
    return {"message": "Machine deleted successfully"}

@router.delete("/machines")
def delete_all_machines(db: Session = Depends(get_db)):
    # 删除所有连接
    db.query(Connection).delete()
    
    # 删除所有机器
    deleted_count = db.query(Machine).count()
    db.query(Machine).delete()
    
    db.commit()
    return {"message": f"All {deleted_count} machines deleted successfully"}

# 连接相关API
@router.post("/connections", response_model=ConnectionResponse)
def create_connection(connection: ConnectionCreate, db: Session = Depends(get_db)):
    # 检查机器是否存在
    source = db.query(Machine).filter(Machine.id == connection.source_machine_id).first()
    target = db.query(Machine).filter(Machine.id == connection.target_machine_id).first()
    
    if not source or not target:
        raise HTTPException(status_code=404, detail="Source or target machine not found")
    
    # 检查是否已存在相同连接
    existing = db.query(Connection).filter(
        Connection.source_machine_id == connection.source_machine_id,
        Connection.target_machine_id == connection.target_machine_id
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Connection already exists")
    
    db_connection = Connection(**connection.dict())
    db.add(db_connection)
    db.commit()
    db.refresh(db_connection)
    return db_connection

@router.get("/connections", response_model=List[ConnectionResponse])
def get_connections(db: Session = Depends(get_db)):
    connections = db.query(Connection).all()
    return connections

@router.delete("/connections/{connection_id}")
def delete_connection(connection_id: int, db: Session = Depends(get_db)):
    connection = db.query(Connection).filter(Connection.id == connection_id).first()
    if not connection:
        raise HTTPException(status_code=404, detail="Connection not found")
    
    db.delete(connection)
    db.commit()
    return {"message": "Connection deleted successfully"}

# 物品类型相关API
@router.post("/item-types", response_model=ItemTypeResponse)
def create_item_type(item_type: ItemTypeCreate, db: Session = Depends(get_db)):
    db_item_type = ItemType(**item_type.dict())
    db.add(db_item_type)
    db.commit()
    db.refresh(db_item_type)
    return db_item_type

@router.get("/item-types", response_model=List[ItemTypeResponse])
def get_item_types(db: Session = Depends(get_db)):
    item_types = db.query(ItemType).all()
    return item_types