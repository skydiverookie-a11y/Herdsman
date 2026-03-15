import re

from app.config import settings
from app.services.ollama import ollama_service

# Bytes per parameter for each quantization level
QUANTIZATION_BPP: dict[str, float] = {
    "FP16": 2.0,
    "Q8_0": 1.0,
    "Q6_K": 0.75,
    "Q5_K_M": 0.625,
    "Q4_K_M": 0.5,
    "Q4_0": 0.5,
    "Q3_K_M": 0.375,
    "Q2_K": 0.25,
}

OVERHEAD_GB = 1.0


def estimate_vram(
    parameter_size_b: float,
    quantization: str,
) -> float:
    """Estimate VRAM in GB for a model.

    Args:
        parameter_size_b: Number of parameters in billions.
        quantization: Quantization level (e.g. Q4_K_M).

    Returns:
        Estimated VRAM usage in GB.
    """
    bpp = QUANTIZATION_BPP.get(quantization, 0.5)
    return parameter_size_b * bpp + OVERHEAD_GB


async def get_available_vram() -> float:
    """Calculate available VRAM based on total VRAM and currently loaded models."""
    total = settings.TOTAL_VRAM_GB
    if total <= 0:
        return 0.0

    try:
        running = await ollama_service.list_running_models()
        used = sum(m.get("size_vram", 0) for m in running) / (1024 ** 3)
        return max(0.0, total - used)
    except Exception:
        return total


def parse_quantization(quant_str: str) -> str:
    """Normalize quantization string to a known key."""
    upper = quant_str.upper().replace("-", "_")
    for key in QUANTIZATION_BPP:
        if key in upper:
            return key
    return "Q4_K_M"  # default fallback


def estimate_vram_from_size(size_str: str) -> float | None:
    """Estimate VRAM from a human-readable size string like '4.4 GB'.

    For quantized models the file size closely matches the weight memory,
    so VRAM ≈ file_size + overhead (KV cache, CUDA context).
    """
    match = re.match(r"([\d.]+)\s*(TB|GB|MB|KB)", size_str, re.IGNORECASE)
    if not match:
        return None
    value = float(match.group(1))
    unit = match.group(2).upper()
    if unit == "TB":
        gb = value * 1024
    elif unit == "GB":
        gb = value
    elif unit == "MB":
        gb = value / 1024
    else:
        return None
    if gb < 0.1:
        return None
    return round(gb + OVERHEAD_GB, 1)
