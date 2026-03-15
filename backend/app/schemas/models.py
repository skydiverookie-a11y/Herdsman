from pydantic import BaseModel


class LocalModel(BaseModel):
    name: str
    model: str
    modified_at: str
    size: int
    digest: str
    details: dict | None = None


class RunningModel(BaseModel):
    name: str
    model: str
    size: int
    size_vram: int
    digest: str
    expires_at: str | None = None
    details: dict | None = None


class ModelDetails(BaseModel):
    modelfile: str | None = None
    parameters: str | None = None
    template: str | None = None
    details: dict | None = None
    model_info: dict | None = None


class PullProgress(BaseModel):
    status: str
    digest: str | None = None
    total: int | None = None
    completed: int | None = None


class VRAMEstimate(BaseModel):
    model_name: str
    quantization: str
    parameter_size: float  # in billions
    estimated_vram_gb: float
    total_vram_gb: float
    available_vram_gb: float
    fits: bool
