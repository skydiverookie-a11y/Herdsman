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
