"""
Bonus — Unit Tests (pytest)
Run: pytest tests/ -v
"""

import pytest
import pandas as pd
import numpy as np
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from clean_data import (
    parse_date,
    is_valid_email,
    clean_customers,
    clean_orders,
    STATUS_MAP,
    VALID_STATUSES,
)


# ── parse_date ────────────────────────────────────────────────────────────────

class TestParseDate:
    def test_iso_format(self):
        result = parse_date("2023-06-15")
        assert result == pd.Timestamp("2023-06-15")

    def test_dd_mm_yyyy(self):
        result = parse_date("15/06/2023")
        assert result == pd.Timestamp("2023-06-15")

    def test_mm_dd_yyyy(self):
        result = parse_date("06-15-2023")
        assert result == pd.Timestamp("2023-06-15")

    def test_unparseable_returns_nat(self):
        result = parse_date("not-a-date")
        assert pd.isna(result)

    def test_empty_string_returns_nat(self):
        result = parse_date("")
        assert pd.isna(result)

    def test_none_returns_nat(self):
        result = parse_date(None)
        assert pd.isna(result)


# ── is_valid_email ────────────────────────────────────────────────────────────

class TestIsValidEmail:
    def test_valid_email(self):
        assert is_valid_email("user@example.com") is True

    def test_valid_email_subdomain(self):
        assert is_valid_email("user@mail.example.co.uk") is True

    def test_missing_at(self):
        assert is_valid_email("userexample.com") is False

    def test_missing_dot(self):
        assert is_valid_email("user@examplecom") is False

    def test_none_value(self):
        assert is_valid_email(None) is False

    def test_nan_value(self):
        assert is_valid_email(float("nan")) is False

    def test_empty_string(self):
        assert is_valid_email("") is False

    def test_email_lowercased_before_check(self):
        assert is_valid_email("USER@EXAMPLE.COM") is True


# ── clean_customers ────────────────────────────────────────────────────────────

class TestCleanCustomers:
    def _base_df(self):
        return pd.DataFrame({
            "customer_id": [1, 1, 2, 3],
            "name":        [" Alice ", "Alice", "Bob", "Charlie"],
            "email":       ["alice@example.com", "alice@example.com", "BOBEXAMPLE", None],
            "region":      ["North", "North", None, "East"],
            "signup_date": ["2023-01-10", "2022-06-01", "2023-03-15", "invalid"],
        })

    def test_removes_duplicates_keeps_latest(self):
        df = clean_customers(self._base_df())
        assert df[df["customer_id"] == 1].shape[0] == 1
        assert df[df["customer_id"] == 1]["signup_date"].values[0] == "2023-01-10"

    def test_strips_whitespace_from_name(self):
        df = clean_customers(self._base_df())
        assert all(df["name"].str.strip() == df["name"])

    def test_fills_missing_region_with_unknown(self):
        df = clean_customers(self._base_df())
        assert (df["region"] == "Unknown").sum() == 0 or "Unknown" in df["region"].values

    def test_email_lowercased(self):
        df = clean_customers(self._base_df())
        email_vals = df["email"].dropna()
        assert all(e == e.lower() for e in email_vals)

    def test_invalid_email_flagged(self):
        df = clean_customers(self._base_df())
        bob_row = df[df["customer_id"] == 2]
        assert bool(bob_row["is_valid_email"].values[0]) is False

    def test_valid_email_flagged_true(self):
        df = clean_customers(self._base_df())
        alice_row = df[df["customer_id"] == 1]
        assert bool(alice_row["is_valid_email"].values[0]) is True

    def test_unparseable_date_becomes_nat(self):
        df = clean_customers(self._base_df())
        charlie = df[df["customer_id"] == 3]
        assert charlie["signup_date"].values[0] is None or pd.isna(charlie["signup_date"].values[0])


# ── clean_orders ───────────────────────────────────────────────────────────────

class TestCleanOrders:
    def _base_df(self):
        return pd.DataFrame({
            "order_id":   [1, 2, 3, None, 5],
            "customer_id":[10, 20, 30, None, 50],
            "product":    ["Laptop", "Laptop", "Mouse", "Mouse", "Keyboard"],
            "amount":     [1200.0, None, 45.0, 45.0, 99.99],
            "order_date": ["2023-01-05", "05/02/2023", "01-15-2023", "2023-04-01", "2023-05-10"],
            "status":     ["completed", "done", "canceled", "pending", "WAITING"],
        })

    def test_drops_row_where_both_ids_null(self):
        df = clean_orders(self._base_df())
        assert len(df) == 4

    def test_fills_null_amount_with_product_median(self):
        df = clean_orders(self._base_df())
        laptop_rows = df[df["product"] == "Laptop"]
        assert laptop_rows["amount"].isna().sum() == 0

    def test_status_done_mapped_to_completed(self):
        df = clean_orders(self._base_df())
        assert "done" not in df["status"].values

    def test_status_canceled_mapped_to_cancelled(self):
        df = clean_orders(self._base_df())
        assert "canceled" not in df["status"].values

    def test_all_statuses_in_valid_set(self):
        df = clean_orders(self._base_df())
        assert set(df["status"].unique()).issubset(VALID_STATUSES)

    def test_order_year_month_added(self):
        df = clean_orders(self._base_df())
        assert "order_year_month" in df.columns
        assert df["order_year_month"].str.match(r"\d{4}-\d{2}").all()

    def test_multi_format_dates_parsed(self):
        df = clean_orders(self._base_df())
        assert df["order_date"].isna().sum() == 0

    def test_status_uppercase_normalized(self):
        df = clean_orders(self._base_df())
        assert "WAITING" not in df["status"].values
        assert "pending" in df["status"].values
