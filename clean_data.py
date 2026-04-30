"""
Part 1 — Data Cleaning
clean_data.py

Usage:
    python clean_data.py
    python clean_data.py --customers data/raw/customers.csv --orders data/raw/orders.csv
"""

import pandas as pd
import numpy as np
import logging
import re
import argparse
from pathlib import Path

logging.basicConfig(level=logging.WARNING, format="%(levelname)s: %(message)s")
log = logging.getLogger(__name__)

BASE = Path(__file__).parent

CONFIG = {
    "customers_raw": BASE / "data/raw/customers.csv",
    "orders_raw":    BASE / "data/raw/orders.csv",
    "customers_out": BASE / "data/processed/customers_clean.csv",
    "orders_out":    BASE / "data/processed/orders_clean.csv",
}

STATUS_MAP = {
    "done":        "completed",
    "complete":    "completed",
    "finished":    "completed",
    "canceled":    "cancelled",
    "cancel":      "cancelled",
    "return":      "refunded",
    "returned":    "refunded",
    "hold":        "pending",
    "waiting":     "pending",
    "in progress": "pending",
    "processing":  "pending",
}
VALID_STATUSES = {"completed", "pending", "cancelled", "refunded"}


def load_csv(path: Path) -> pd.DataFrame:
    try:
        df = pd.read_csv(path)
        if df.empty:
            raise pd.errors.EmptyDataError(f"{path} is empty")
        return df
    except FileNotFoundError:
        log.error(f"File not found: {path}")
        raise
    except pd.errors.EmptyDataError as e:
        log.error(str(e))
        raise


def parse_date(val):
    """Custom date parser supporting YYYY-MM-DD, DD/MM/YYYY, MM-DD-YYYY."""
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%m-%d-%Y", "%m/%d/%Y", "%Y/%m/%d"):
        try:
            return pd.to_datetime(str(val).strip(), format=fmt)
        except (ValueError, TypeError):
            pass
    log.warning(f"Unparseable date value: {val!r} — replaced with NaT")
    return pd.NaT


def is_valid_email(email) -> bool:
    if pd.isna(email) or not isinstance(email, str) or not email.strip():
        return False
    return bool(re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email.strip()))


def _null_counts(df: pd.DataFrame) -> dict:
    return df.isna().sum().to_dict()


def clean_customers(df: pd.DataFrame) -> pd.DataFrame:
    before_rows = len(df)
    null_before = _null_counts(df)

    # Strip whitespace from string columns
    df["name"]   = df["name"].astype(str).str.strip()
    df["region"] = df["region"].astype(str).str.strip()

    # Fill missing region
    df["region"] = df["region"].replace({"nan": "Unknown", "": "Unknown", "NaN": "Unknown"})
    df["region"] = df["region"].fillna("Unknown")

    # Parse signup_date; unparseable → NaT
    df["signup_date"] = df["signup_date"].apply(parse_date)

    # Remove duplicates on customer_id, keep most recent signup_date
    df = df.sort_values("signup_date", ascending=False, na_position="last")
    df = df.drop_duplicates(subset="customer_id", keep="first")

    # Standardize email to lowercase, validate
    df["email"] = df["email"].astype(str).str.strip().str.lower()
    df.loc[df["email"].isin(["nan", "none", ""]), "email"] = np.nan
    df["is_valid_email"] = df["email"].apply(is_valid_email)

    # Format date as YYYY-MM-DD string
    df["signup_date"] = df["signup_date"].dt.strftime("%Y-%m-%d")

    after_rows = len(df)
    null_after = _null_counts(df)

    print("\n" + "=" * 50)
    print("CLEANING REPORT — customers.csv")
    print("=" * 50)
    print(f"  Rows before           : {before_rows}")
    print(f"  Rows after            : {after_rows}")
    print(f"  Duplicates removed    : {before_rows - after_rows}")
    print(f"  Invalid/missing email : {(~df['is_valid_email']).sum()}")
    print(f"  NaT signup_date       : {df['signup_date'].isna().sum()}")
    print(f"  Null counts before    : { {k: v for k, v in null_before.items() if v > 0} }")
    print(f"  Null counts after     : { {k: v for k, v in null_after.items() if v > 0} }")

    return df.reset_index(drop=True)


def clean_orders(df: pd.DataFrame) -> pd.DataFrame:
    before_rows = len(df)
    null_before = _null_counts(df)
    null_amount_before = df["amount"].isna().sum()

    # Drop rows where BOTH customer_id AND order_id are null
    df = df.dropna(subset=["customer_id", "order_id"], how="all")

    # Parse order_date with custom multi-format parser
    df["order_date"] = df["order_date"].apply(parse_date)

    # Fill missing amount with median grouped by product
    median_by_product = df.groupby("product")["amount"].transform("median")
    df["amount"] = df["amount"].fillna(median_by_product)
    # Fallback: global median for products with all-null amounts
    df["amount"] = df["amount"].fillna(df["amount"].median())

    # Normalize status to controlled vocabulary
    df["status"] = df["status"].astype(str).str.strip().str.lower()
    df["status"] = df["status"].replace(STATUS_MAP)
    df.loc[~df["status"].isin(VALID_STATUSES), "status"] = "pending"

    # Derived column: order_year_month
    df["order_year_month"] = df["order_date"].dt.to_period("M").astype(str)

    after_rows = len(df)
    null_after = _null_counts(df)

    print("\n" + "=" * 50)
    print("CLEANING REPORT — orders.csv")
    print("=" * 50)
    print(f"  Rows before              : {before_rows}")
    print(f"  Rows after               : {after_rows}")
    print(f"  Unrecoverable rows dropped: {before_rows - after_rows}")
    print(f"  Null amounts filled      : {null_amount_before}")
    print(f"  NaT order_date           : {df['order_date'].isna().sum()}")
    print(f"  Status values normalized : {df['status'].value_counts().to_dict()}")
    print(f"  Null counts before       : { {k: v for k, v in null_before.items() if v > 0} }")
    print(f"  Null counts after        : { {k: v for k, v in null_after.items() if v > 0} }")

    return df.reset_index(drop=True)


def main(cfg: dict = None):
    if cfg is None:
        cfg = CONFIG

    Path(cfg["customers_out"]).parent.mkdir(parents=True, exist_ok=True)

    print("Loading raw data...")
    customers = load_csv(Path(cfg["customers_raw"]))
    orders    = load_csv(Path(cfg["orders_raw"]))

    print("\nCleaning customers.csv...")
    customers_clean = clean_customers(customers)
    customers_clean.to_csv(cfg["customers_out"], index=False)
    print(f"\n  Saved → {cfg['customers_out']}")

    print("\nCleaning orders.csv...")
    orders_clean = clean_orders(orders)
    orders_clean.to_csv(cfg["orders_out"], index=False)
    print(f"\n  Saved → {cfg['orders_out']}")

    print("\n✓ Part 1 complete.\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Clean raw customer and order CSVs")
    parser.add_argument("--customers", default=str(CONFIG["customers_raw"]), help="Path to customers.csv")
    parser.add_argument("--orders",    default=str(CONFIG["orders_raw"]),    help="Path to orders.csv")
    args = parser.parse_args()

    cfg = {
        **CONFIG,
        "customers_raw": Path(args.customers),
        "orders_raw":    Path(args.orders),
    }
    main(cfg)
