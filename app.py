from flask import Flask, jsonify
import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import GradientBoostingRegressor
from prophet import Prophet
import warnings

warnings.filterwarnings("ignore")

app = Flask(__name__)

# ------------ Load & Preprocess Data -----------------
data = pd.read_csv("Telemetry_data.csv")
data["date"] = pd.to_datetime(data["date"], format="%d-%m-%Y")
data = data.sort_values("date").reset_index(drop=True)


def calculate_evaporation(temp, humidity):
    """Simple evaporation model"""
    return 0.0023 * (temp + 17.8) * np.sqrt(np.clip(100 - humidity, 0, 100))


data["evaporation_mm"] = calculate_evaporation(
    data["temperature_c"], data["humidity_pct"]
)


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

selected_features = [
    "gw_rolling_mean_7",
    "gw_rolling_mean_14",
    "gw_rolling_mean_30",
    "rainfall_sum_7",
    "rainfall_sum_14",
    "rainfall_sum_30",
    "gw_lag_1",
    "gw_lag_7",
    "gw_lag_14",
    "rain_lag_1",
    "rain_lag_7",
    "rain_lag_14",
    "rainfall_mm",
    "temperature_c",
    "humidity_pct",
    "evaporation_mm",
    "day_of_year",
    "month_sin",
    "month_cos",
]

X = data_clean[selected_features]
y = data_clean["Groundwatelevel_m"]

# Train/test split
split_idx = int(0.8 * len(X))
X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
y_train, y_test = y.iloc[:split_idx], y.iloc[split_idx:]

scaler_X, scaler_y = StandardScaler(), StandardScaler()
X_train_scaled = scaler_X.fit_transform(X_train)
y_train_scaled = scaler_y.fit_transform(y_train.values.reshape(-1, 1))

model = GradientBoostingRegressor(
    n_estimators=200,
    learning_rate=0.1,
    max_depth=5,
    min_samples_split=10,
    random_state=42,
)
model.fit(X_train_scaled, y_train_scaled.ravel())

# ---------------- Utils ----------------
def get_station_status(pulse_score):
    if pulse_score >= 80:
        return "green", "NORMAL", "Groundwater levels are healthy"
    elif pulse_score >= 60:
        return "yellow", "WATCH", "Groundwater levels are moderate - monitor closely"
    elif pulse_score >= 40:
        return "orange", "ADVISORY", "Groundwater levels are below normal - conservation advised"
    elif pulse_score >= 20:
        return "red", "WARNING", "Groundwater levels are critically low - immediate action needed"
    else:
        return "darkred", "EMERGENCY", "Groundwater emergency - implement emergency measures"


# ---------------- API ROUTES ----------------

# 🌍 Dashboard Page API
@app.route("/api/dashboard", methods=["GET"])
def dashboard():
    today = data_clean.iloc[-1:].copy()
    X_today_scaled = scaler_X.transform(today[selected_features])
    y_pred_today = scaler_y.inverse_transform(
        model.predict(X_today_scaled).reshape(-1, 1)
    )[0][0]

    rainfall_7d = data_clean.tail(7)[["date", "rainfall_mm"]].to_dict(orient="records")
    groundwater_7d = data_clean.tail(7)[["date", "Groundwatelevel_m"]].to_dict(orient="records")

    return jsonify({
        "predicted_groundwater": round(y_pred_today, 3),
        "rainfall_forecast": rainfall_7d,
        "groundwater_forecast": groundwater_7d,
        "station_pulse_score": 92.5
    })


# 📊 Charts Page API
@app.route("/api/charts", methods=["GET"])
def charts():
    evaporation_series = data_clean[["date", "evaporation_mm"]].tail(100).to_dict(orient="records")
    water_level_series = data_clean[["date", "Groundwatelevel_m"]].tail(100).to_dict(orient="records")

    return jsonify({
        "evaporation": evaporation_series,
        "water_levels": water_level_series
    })


# 🛰️ Stations Page API
@app.route("/api/stations", methods=["GET"])
def stations():
    stations = [
        {"id": "GW-001", "name": "Station A", "status": "Active", "last_update": str(data_clean['date'].max())},
        {"id": "GW-002", "name": "Station B", "status": "Inactive", "last_update": str(data_clean['date'].max())}
    ]
    return jsonify(stations)


# 🚨 Alerts Page API
@app.route("/api/alerts", methods=["GET"])
def alerts():
    today = data_clean.iloc[-1:].copy()
    X_today_scaled = scaler_X.transform(today[selected_features])
    y_pred_today = scaler_y.inverse_transform(
        model.predict(X_today_scaled).reshape(-1, 1)
    )[0][0]

    gw_mean, gw_std = data_clean["Groundwatelevel_m"].mean(), data_clean["Groundwatelevel_m"].std()
    z_score = (y_pred_today - gw_mean) / gw_std
    pulse_score = max(0, min(100, 100 - abs(z_score) * 20))

    station_color, alert_level, message = get_station_status(pulse_score)

    return jsonify([
        {
            "station_id": "GW-001",
            "alert_level": alert_level,
            "pulse_score": round(pulse_score, 2),
            "message": message,
            "color": station_color,
        }
    ])


# ------------- Run ----------------
if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
