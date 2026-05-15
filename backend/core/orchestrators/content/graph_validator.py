from infra.logging import get_logger

logger = get_logger(__name__)


def _is_valid_chart(slide: dict) -> bool:
    chart_type = slide.get("chart_type")
    chart_data = slide.get("chart_data")

    if not chart_type or not chart_data or not isinstance(chart_data, dict):
        return False

    if chart_type == "radar":
        labels = chart_data.get("labels", [])
        datasets = chart_data.get("datasets", [])
        if not labels or len(labels) < 2:
            return False
        if not datasets or not isinstance(datasets, list) or len(datasets) < 1:
            return False
        for ds in datasets:
            if not isinstance(ds, dict) or len(ds.get("values", [])) != len(labels):
                return False
        return True

    labels = chart_data.get("labels", [])
    values = chart_data.get("values", [])

    if not labels or not values:
        return False
    if len(labels) != len(values):
        return False
    if len(values) < 2:
        return False

    try:
        nums = [float(v) for v in values]
    except (ValueError, TypeError):
        return False

    # Flat data: all values identical — no meaningful chart
    if len(set(nums)) <= 1:
        return False

    # Year-as-value: bar/column/donut with values that look like calendar years
    # (e.g. LLM put years 1992, 2011 as data values instead of as labels)
    if chart_type in ("bar", "column", "donut"):
        if all(1800 <= n <= 2100 for n in nums):
            return False

    if chart_type == "donut":
        if any(n < 0 for n in nums):
            return False

    return True


def validate_and_fix_slides(slides: list[dict]) -> list[dict]:
    """
    Null out chart_type/chart_data on stat slides with invalid or nonsensical charts.
    The stat template already handles null chart_data gracefully (no chart rendered).
    """
    result = []
    for slide in slides:
        if slide.get("type") == "stat" and slide.get("chart_type"):
            if not _is_valid_chart(slide):
                logger.warning(
                    "chart_invalidated",
                    slide_number=slide.get("slide_number"),
                    chart_type=slide.get("chart_type"),
                    reason="failed validation",
                )
                slide = {**slide, "chart_type": None, "chart_data": None}
        result.append(slide)
    return result
