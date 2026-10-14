"""Pydantic schemas for administrative flexible catalog options and categories."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class CatalogCategoriesResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    destination_categories: list[str]
    destination_travel_types: list[str]
    package_categories: list[str]
    package_travel_types: list[str]
    package_difficulty_levels: list[str]
    activity_categories: list[str]


class CategoryCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    field: Literal[
        "destination_categories",
        "destination_travel_types",
        "package_categories",
        "package_travel_types",
        "package_difficulty_levels",
        "activity_categories",
    ]
    value: str = Field(min_length=2, max_length=80)

    @field_validator("value")
    @classmethod
    def clean_value(cls, v: str) -> str:
        cleaned = " ".join(v.strip().split())
        if not cleaned:
            raise ValueError("Category value cannot be empty.")
        if cleaned.lower() in ("none", "null", "not applicable", "n/a"):
            raise ValueError("Category value cannot be 'None' or 'Not applicable'.")
        return cleaned
