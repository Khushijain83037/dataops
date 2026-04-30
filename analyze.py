"""
Part 2 — Data Merging & Analysis
analyze.py

Usage:
    python analyze.py
    python analyze.py --customers data/processed/customers_clean.csv \
                      --orders    data/processed/orders_clean.csv    \
                      --products  data/raw/products.csv
"""

import pandas as pd
import numpy as np
import argparse
import logging
from pathlib import Path

logging.basicConfig(level=logging.WARNING, format="%(levelname)s: %(message)s")
log = logging.getLogger(__name__)

BASE = Path(__file__).parent

CONFIG = {
    "customers_clean": BASE / "data/processed/customers_clean.csv",
    "orders_clean":    BASE / "data/processed/orders_clean.csv",
    "products_raw":    BASE / "data/raw/products.csv",
    "out_dir":         BASE / "data/processed",
}


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


# ── 2.1  Merging ──────────────────────────────────────────────────────────────

def build_full_data(
    customers: pd.DataFrame,
    orders: pd.DataFrame,
    products: pd.DataFrame,
) -> pd.DataFrame:
    orders_with_customers = orders.merge(
        customers,
        on="customer_id",
        how="left",
    )

    full_data = orders_with_customers.merge(
        products,
        left_on="product",
        right_on="product_name",
        how="left",
    )

    no_customer = full_data["name"].isna().sum()
    no_product  = full_data["product_name"].isna().sum()

    print("\n" + "=" * 50)
    print("MERGE REPORT")
    print("=" * 50)
    print(f"  Total order rows                  : {len(full_data)}")
    print(f"  Orders with no matching customer  : {no_customer}")
    print(f"  Orders with no matching product   : {no_product}")

    return full_data


# ── 2.2  Analysis Tasks ───────────────────────────────────────────────────────

def monthly_revenue(full_data: pd.DataFrame, out_dir: Path) -> pd.DataFrame:
    """Total completed revenue grouped by order_year_month."""
    df = (
        full_data[full_data["status"] == "completed"]
        .groupby("order_year_month", as_index=False)["amount"]
        .sum()
        .rename(columns={"amount": "revenue"})
        .sort_values("order_year_month")
    )
    df["revenue"] = df["revenue"].round(2)

    path = out_dir / "monthly_revenue.csv"
    df.to_csv(path, index=False)
    print(f"  ✓ monthly_revenue.csv       ({len(df)} rows)")
    return df


def top_customers(full_data: pd.DataFrame, out_dir: Path) -> pd.DataFrame:
    """Top 10 customers by total spend; adds churn indicator."""
    completed = full_data[full_data["status"] == "completed"].copy()
    completed["order_date"] = pd.to_datetime(completed["order_date"], errors="coerce")

    spend = (
        completed
        .groupby(["customer_id", "name", "region"], as_index=False)["amount"]
        .sum()
        .rename(columns={"amount": "total_spend"})
        .nlargest(10, "total_spend")
    )

    latest_date = completed["order_date"].max()
    cutoff      = latest_date - pd.Timedelta(days=90)

    last_order = (
        completed.groupby("customer_id")["order_date"].max()
    )

    def is_churned(cid):
        lo = last_order.get(cid, pd.NaT)
        return bool(pd.isna(lo) or lo < cutoff)

    spend["churned"]     = spend["customer_id"].map(is_churned)
    spend["total_spend"] = spend["total_spend"].round(2)

    path = out_dir / "top_customers.csv"
    spend.to_csv(path, index=False)
    print(f"  ✓ top_customers.csv         ({len(spend)} rows)")
    return spend


def category_performance(full_data: pd.DataFrame, out_dir: Path) -> pd.DataFrame:
    """Revenue, avg order value, and order count by product category."""
    df = (
        full_data[full_data["status"] == "completed"]
        .groupby("category", as_index=False)
        .agg(
            total_revenue   = ("amount", "sum"),
            avg_order_value = ("amount", "mean"),
            num_orders      = ("order_id", "count"),
        )
        .sort_values("total_revenue", ascending=False)
    )
    df["total_revenue"]   = df["total_revenue"].round(2)
    df["avg_order_value"] = df["avg_order_value"].round(2)

    path = out_dir / "category_performance.csv"
    df.to_csv(path, index=False)
    print(f"  ✓ category_performance.csv  ({len(df)} rows)")
    return df


def regional_analysis(
    full_data: pd.DataFrame,
    customers: pd.DataFrame,
    out_dir: Path,
) -> pd.DataFrame:
    """Customers, orders, revenue, avg revenue per customer by region."""
    reg_customers = (
        customers
        .groupby("region", as_index=False)["customer_id"]
        .count()
        .rename(columns={"customer_id": "num_customers"})
    )
    reg_orders = (
        full_data
        .groupby("region", as_index=False)
        .agg(
            num_orders    = ("order_id",  "count"),
            total_revenue = ("amount",    "sum"),
        )
    )
    df = reg_customers.merge(reg_orders, on="region", how="left")
    df["avg_revenue_per_customer"] = (df["total_revenue"] / df["num_customers"]).round(2)
    df["total_revenue"]            = df["total_revenue"].round(2)

    path = out_dir / "regional_analysis.csv"
    df.to_csv(path, index=False)
    print(f"  ✓ regional_analysis.csv     ({len(df)} rows)")
    return df


# ── Main ──────────────────────────────────────────────────────────────────────

def main(cfg: dict = None):
    if cfg is None:
        cfg = CONFIG

    out = Path(cfg["out_dir"])
    out.mkdir(parents=True, exist_ok=True)

    print("Loading cleaned data...")
    customers = load_csv(Path(cfg["customers_clean"]))
    orders    = load_csv(Path(cfg["orders_clean"]))
    products  = load_csv(Path(cfg["products_raw"]))

    full_data = build_full_data(customers, orders, products)

    print("\nRunning analysis tasks...")
    monthly_revenue(full_data, out)
    top_customers(full_data, out)
    category_performance(full_data, out)
    regional_analysis(full_data, customers, out)

    print("\n✓ Part 2 complete. All outputs in data/processed/\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Merge datasets and generate analysis CSVs")
    parser.add_argument("--customers", default=str(CONFIG["customers_clean"]))
    parser.add_argument("--orders",    default=str(CONFIG["orders_clean"]))
    parser.add_argument("--products",  default=str(CONFIG["products_raw"]))
    args = parser.parse_args()

    cfg = {
        **CONFIG,
        "customers_clean": Path(args.customers),
        "orders_clean":    Path(args.orders),
        "products_raw":    Path(args.products),
    }
    main(cfg)
