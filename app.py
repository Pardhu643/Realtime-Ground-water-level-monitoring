from flask import Flask, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import GradientBoostingRegressor
import warnings

warnings.filterwarnings("ignore")

# =====================================================
# Flask App
# =====================================================
app = Flask(__name__)
CORS(app)

# =====================================================
# Load & Preprocess Data
# =====================================================
data = pd.read_csv("Telemetry_data.csv")

required_cols = ["date", "Groundwatelevel_m", "rainfall_mm", "temperature_c", "humidity_pct"]
for col in required_cols:
    if col not in data.columns:
        raise ValueError(f"Missing column: {col}")

data["date"] = pd.to_datetime(data["date"], errors="coerce")
data = data.dropna(subset=["date"]).sort_values("date").reset_index(drop=True)

# =====================================================
# Evaporation Calculation
# =====================================================
def calculate_evaporation(temp, humidity):
    humidity = np.clip(humidity, 0, 100)
    return 0.0023 * (temp + 17.8) * np.sqrt(100 - humidity)

data["evaporation_mm"] = calculate_evaporation(data["temperature_c"], data["humidity_pct"])

# =====================================================
# Feature Engineering
# =====================================================
def create_features(df):
    df = df.copy()
    for window in [7, 14, 30]:
        df[f"gw_rolling_mean_{window}"] = df["Groundwatelevel_m"].rolling(window).mean()
        df[f"rainfall_sum_{window}"] = df["rainfall_mm"].rolling(window).sum()

    for lag in [1, 7, 14]:
        df[f"gw_lag_{lag}"] = df["Groundwatelevel_m"].shift(lag)
        df[f"rain_lag_{lag}"] = df["rainfall_mm"].shift(lag)

    df["day_of_year"] = df["date"].dt.dayofyear
    df["month_sin"] = np.sin(2 * np.pi * df["date"].dt.month / 12)
    df["month_cos"] = np.cos(2 * np.pi * df["date"].dt.month / 12)
    return df

data_clean = create_features(data).dropna().reset_index(drop=True)

# =====================================================
# ML MODEL FOR GROUNDWATER
# =====================================================
FEATURES = [
    "gw_rolling_mean_7", "gw_rolling_mean_14", "gw_rolling_mean_30",
    "rainfall_sum_7", "rainfall_sum_14", "rainfall_sum_30",
    "gw_lag_1", "gw_lag_7", "gw_lag_14",
    "rain_lag_1", "rain_lag_7", "rain_lag_14",
    "rainfall_mm", "temperature_c", "humidity_pct",
    "evaporation_mm", "day_of_year", "month_sin", "month_cos"
]

X = data_clean[FEATURES]
y = data_clean["Groundwatelevel_m"]
split = int(len(X) * 0.8)

X_train, y_train = X.iloc[:split], y.iloc[:split]
scaler_X = StandardScaler()
scaler_y = StandardScaler()
X_train_scaled = scaler_X.fit_transform(X_train)
y_train_scaled = scaler_y.fit_transform(y_train.values.reshape(-1,1)).ravel()

model = GradientBoostingRegressor(n_estimators=200, learning_rate=0.1, max_depth=5, random_state=42)
model.fit(X_train_scaled, y_train_scaled)

# =====================================================
# ML MODEL FOR RAINFALL
# =====================================================
y_rain = data_clean["rainfall_mm"]
X_train_r, y_train_r = X.iloc[:split], y_rain.iloc[:split]
scaler_X_r = StandardScaler()
scaler_y_r = StandardScaler()
X_train_r_scaled = scaler_X_r.fit_transform(X_train_r)
y_train_r_scaled = scaler_y_r.fit_transform(y_train_r.values.reshape(-1,1)).ravel()

rain_model = GradientBoostingRegressor(n_estimators=200, learning_rate=0.1, max_depth=5, random_state=42)
rain_model.fit(X_train_r_scaled, y_train_r_scaled)

# =====================================================
# Utilities
# =====================================================
def get_station_status(score):
    if score >= 80:
        return "green", "NORMAL"
    elif score >= 60:
        return "yellow", "WATCH"
    elif score >= 40:
        return "orange", "ADVISORY"
    else:
        return "red", "CRITICAL"

# =====================================================
# API ROUTES
# =====================================================

@app.route("/api/dashboard", methods=["GET"])
def dashboard():
    latest = data_clean.iloc[-1:]
    X_latest = scaler_X.transform(latest[FEATURES])
    today_gw_pred = scaler_y.inverse_transform(model.predict(X_latest).reshape(-1, 1))[0][0]

    # 7-day forecast
    forecast_days = 7
    rainfall_dates, predicted_rainfall, rainfall_upper, rainfall_lower = [], [], [], []
    gw_dates, predicted_gw = [], []

    last_row = latest.copy()
    for i in range(forecast_days):
        next_date = last_row["date"].values[0] + np.timedelta64(1, 'D')
        last_row["date"] = pd.to_datetime(next_date)
        features_row = create_features(pd.concat([data_clean, last_row], ignore_index=True)).iloc[-1:]

        X_next = scaler_X.transform(features_row[FEATURES])
        gw_pred = scaler_y.inverse_transform(model.predict(X_next).reshape(-1,1))[0][0]

        rainfall_pred = scaler_y_r.inverse_transform(rain_model.predict(scaler_X_r.transform(features_row[FEATURES])).reshape(-1,1))[0][0]

        rainfall_upper_val = rainfall_pred * 1.1
        rainfall_lower_val = max(0, rainfall_pred * 0.9)

        rainfall_dates.append(str(next_date)[:10])
        predicted_rainfall.append(round(float(rainfall_pred),2))
        rainfall_upper.append(round(float(rainfall_upper_val),2))
        rainfall_lower.append(round(float(rainfall_lower_val),2))
        gw_dates.append(str(next_date)[:10])
        predicted_gw.append(round(float(gw_pred),3))

        last_row["Groundwatelevel_m"] = gw_pred
        last_row["rainfall_mm"] = rainfall_pred

    return jsonify({
        "predicted_groundwater": round(float(today_gw_pred),2),
        "station_pulse_score": 90,
        "rainfall_dates": rainfall_dates,
        "predicted_rainfall": predicted_rainfall,
        "rainfall_upper": rainfall_upper,
        "rainfall_lower": rainfall_lower,
        "gw_dates": gw_dates,
        "predicted_gw": predicted_gw,
        "today_gw_level": round(float(today_gw_pred),3)
    })

@app.route("/api/alerts", methods=["GET"])
def alerts():
    # Latest feature row
    latest = data_clean.iloc[-1:]
    X_latest = scaler_X.transform(latest[FEATURES])

    # Predict groundwater
    gw_pred = scaler_y.inverse_transform(
        model.predict(X_latest).reshape(-1, 1)
    )[0][0]

    # ---- Pulse Score (dynamic) ----
    mean = data_clean["Groundwatelevel_m"].mean()
    std = data_clean["Groundwatelevel_m"].std()

    if std == 0:
        pulse_score = 100
    else:
        z = (gw_pred - mean) / std
        pulse_score = max(0, min(100, 100 - abs(z) * 20))

    pulse_score = round(float(pulse_score), 1)

    # ---- Alert Mapping ----
    if pulse_score >= 80:
        color = "green"
        alert_level = "NORMAL"
        message = "Groundwater levels are healthy"
    elif pulse_score >= 60:
        color = "yellow"
        alert_level = "WATCH"
        message = "Groundwater levels are moderate - monitor closely"
    elif pulse_score >= 40:
        color = "orange"
        alert_level = "ADVISORY"
        message = "Groundwater levels are below normal - conservation advised"
    elif pulse_score >= 20:
        color = "red"
        alert_level = "WARNING"
        message = "Groundwater levels are critically low - immediate action needed"
    else:
        color = "darkred"
        alert_level = "EMERGENCY"
        message = "Groundwater emergency - implement emergency measures"

    return jsonify([{
        "station_id": "TGPH2SW0203",
        "pulse_score": pulse_score,
        "alert_level": alert_level,
        "color": color,
        "message": message
    }])


@app.route("/api/stations", methods=["GET"])
def stations():
    return jsonify([{
        "id": "GW-001",
        "name": "Station A",
        "status": "Active",
        "last_update": data_clean["date"].max().strftime("%Y-%m-%d")
    }])

@app.route("/api/charts", methods=["GET"])
def charts():
    evaporation = data_clean[["date", "evaporation_mm"]].tail(100).assign(date=lambda x: x["date"].dt.strftime("%Y-%m-%d")).to_dict(orient="records")
    water_levels = data_clean[["date", "Groundwatelevel_m"]].tail(100).assign(date=lambda x: x["date"].dt.strftime("%Y-%m-%d")).to_dict(orient="records")
    last_7_days = data_clean.tail(7)
    pie = [
        {"name": "Evaporation", "value": round(float(last_7_days["evaporation_mm"].sum()),2)},
        {"name": "Water Level", "value": round(float(last_7_days["Groundwatelevel_m"].sum()),2)}
    ] if last_7_days.shape[0]>0 else []

    return jsonify({
        "evaporation": evaporation,
        "water_levels": water_levels,
        "water_balance_pie": pie
    })

# =====================================================
# Run Server
# =====================================================
if __name__ == "__main__":
    app.run()

