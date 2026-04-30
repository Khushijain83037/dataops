"""
Part 3.1 — Backend API (FastAPI)
Run: uvicorn main:app --reload --port 8000
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import pathlib

app = FastAPI(title="DataOps Analytics API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "OPTIONS"],
    allow_headers=["*"],
)

DATA = pathlib.Path(__file__).parent.parent / "data" / "processed"


def read_csv_or_404(filename: str) -> pd.DataFrame:
    path = DATA / filename
    if not path.exists():
        raise HTTPException(
            status_code=404,
            detail=f"'{filename}' not found. Run: python analyze.py first."
        )
    try:
        df = pd.read_csv(path)
        if df.empty:
            raise HTTPException(status_code=404, detail=f"'{filename}' is empty.")
        return df
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/api/revenue")
def get_revenue():
    df = read_csv_or_404("monthly_revenue.csv")
    df["revenue"] = df["revenue"].round(2)
    return df.to_dict(orient="records")


@app.get("/api/top-customers")
def get_top_customers():
    df = read_csv_or_404("top_customers.csv")
    df["total_spend"] = df["total_spend"].round(2)
    df["churned"] = df["churned"].astype(bool)
    return df.to_dict(orient="records")


@app.get("/api/categories")
def get_categories():
    df = read_csv_or_404("category_performance.csv")
    df["total_revenue"]   = df["total_revenue"].round(2)
    df["avg_order_value"] = df["avg_order_value"].round(2)
    return df.to_dict(orient="records")


@app.get("/api/regions")
def get_regions():
    df = read_csv_or_404("regional_analysis.csv")
    df["total_revenue"]            = df["total_revenue"].round(2)
    df["avg_revenue_per_customer"] = df["avg_revenue_per_customer"].round(2)
    return df.to_dict(orient="records")