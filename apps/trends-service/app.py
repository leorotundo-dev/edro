from fastapi import FastAPI
from pydantic import BaseModel
from pytrends.request import TrendReq
from datetime import datetime

app = FastAPI()


class Req(BaseModel):
    topics: list[str]
    geo: str = "BR"
    timeframe: str = "today 1-m"


@app.post("/google_trends/query")
def query(req: Req):
    pytrends = TrendReq(hl="pt-BR", tz=180)
    kw_list = req.topics[:5]
    pytrends.build_payload(kw_list, cat=0, timeframe=req.timeframe, geo=req.geo, gprop="")
    df = pytrends.interest_over_time()

    out = []
    now = datetime.utcnow().isoformat()

    if df is None or df.empty:
        return {"signals": [], "observed_at": now}

    for kw in kw_list:
        series = df[kw]
        score = int(series.tail(7).mean())
        out.append({"topic": kw.lower(), "score": score})

    return {"signals": out, "observed_at": now}


@app.get("/health")
def health():
    return {"status": "ok"}
