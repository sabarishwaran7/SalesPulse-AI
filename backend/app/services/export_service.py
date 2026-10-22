import io
from typing import List, Dict, Any
from datetime import datetime
import pandas as pd


class ExportService:

    @staticmethod
    def generate_csv(data: List[Dict[str, Any]]) -> bytes:
        if not data:
            df = pd.DataFrame([{"Message": "No data available for export."}])
        else:
            df = pd.DataFrame(data)
        
        output = io.StringIO()
        df.to_csv(output, index=False, encoding="utf-8")
        return output.getvalue().encode("utf-8")

    @staticmethod
    def generate_excel(data: List[Dict[str, Any]], sheet_name: str = "SalesPulse Report") -> bytes:
        if not data:
            df = pd.DataFrame([{"Message": "No data available for export."}])
        else:
            df = pd.DataFrame(data)
            
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine="openpyxl") as writer:
            df.to_excel(writer, index=False, sheet_name=sheet_name[:31])
        return output.getvalue()
