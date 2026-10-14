"""Shared PostgreSQL-oriented database types and constraints."""

from sqlalchemy import JSON, CheckConstraint, Numeric, String
from sqlalchemy.dialects.postgresql import INET, JSONB

MONEY = Numeric(precision=14, scale=2, asdecimal=True)
JSON_DOCUMENT = JSON().with_variant(JSONB(), "postgresql")
IP_ADDRESS = String(45).with_variant(INET(), "postgresql")


def currency_check(
    column: str = "currency", table_name: str | None = None
) -> CheckConstraint:
    """Require a three-letter uppercase currency code; API validates supported ISO codes."""
    name = (
        f"ck_{table_name}_{column}_iso_currency"
        if table_name
        else f"ck_{column}_iso_currency"
    )
    return CheckConstraint(
        f"length({column}) = 3 AND {column} = upper({column})",
        name=name,
    )


def money_check(
    column: str, *, allow_zero: bool = True, table_name: str | None = None
) -> CheckConstraint:
    """Constrain stored monetary values to nonnegative amounts by default."""
    operator = ">=" if allow_zero else ">"
    name = (
        f"ck_{table_name}_{column}_nonnegative"
        if table_name
        else f"ck_{column}_nonnegative"
    )
    return CheckConstraint(f"{column} {operator} 0", name=name)
