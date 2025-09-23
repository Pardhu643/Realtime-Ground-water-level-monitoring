import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import plotly.express as px
import seaborn as sns
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import r2_score, mean_squared_error, mean_absolute_error
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.model_selection import GridSearchCV, TimeSeriesSplit
from sklearn.inspection import permutation_importance
from prophet import Prophet
import warnings
warnings.filterwarnings('ignore')

# Load and preprocess the data
data = pd.read_csv('Telemetry_data.csv')
data['date'] = pd.to_datetime(data['date'], format='%d-%m-%Y')
data = data.sort_values('date').reset_index(drop=True)

# Simplified evaporation calculation
def calculate_evaporation(temp, humidity):
    """Simplified but effective evaporation calculation"""
    return 0.0023 * (temp + 17.8) * np.sqrt(np.clip(100 - humidity, 0, 100))

data['evaporation_mm'] = calculate_evaporation(data['temperature_c'], data['humidity_pct'])

# Focus on the most important features
def create_optimized_features(df):
    df = df.copy()

    # Most important features from previous analysis
    for window in [7, 14, 30]:
        df[f'gw_rolling_mean_{window}'] = df['Groundwatelevel_m'].rolling(window=window).mean()

    # Rainfall accumulation features
    for window in [7, 14, 30]:
        df[f'rainfall_sum_{window}'] = df['rainfall_mm'].rolling(window=window).sum()

    # Key lag features
    for lag in [1, 7, 14]:
        df[f'gw_lag_{lag}'] = df['Groundwatelevel_m'].shift(lag)
        df[f'rain_lag_{lag}'] = df['rainfall_mm'].shift(lag)

    # Simple time features
    df['day_of_year'] = df['date'].dt.dayofyear
    df['month_sin'] = np.sin(2 * np.pi * df['date'].dt.month / 12)
    df['month_cos'] = np.cos(2 * np.pi * df['date'].dt.month / 12)

    return df

# Create optimized features
data_optimized = create_optimized_features(data)
data_clean = data_optimized.dropna().reset_index(drop=True)

# Select only the most relevant features
selected_features = [
    'gw_rolling_mean_7', 'gw_rolling_mean_14', 'gw_rolling_mean_30',
    'rainfall_sum_7', 'rainfall_sum_14', 'rainfall_sum_30',
    'gw_lag_1', 'gw_lag_7', 'gw_lag_14',
    'rain_lag_1', 'rain_lag_7', 'rain_lag_14',
    'rainfall_mm', 'temperature_c', 'humidity_pct', 'evaporation_mm',
    'day_of_year', 'month_sin', 'month_cos'
]

target = 'Groundwatelevel_m'

X = data_clean[selected_features]
y = data_clean[target]

# Split data chronologically
split_idx = int(0.8 * len(X))
X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
y_train, y_test = y.iloc[:split_idx], y.iloc[split_idx:]

# Scale features
scaler_X = StandardScaler()
scaler_y = StandardScaler()

X_train_scaled = scaler_X.fit_transform(X_train)
X_test_scaled = scaler_X.transform(X_test)
y_train_scaled = scaler_y.fit_transform(y_train.values.reshape(-1, 1))
y_test_scaled = scaler_y.transform(y_test.values.reshape(-1, 1))

# Train final model
final_model = GradientBoostingRegressor(
    n_estimators=200,
    learning_rate=0.1,
    max_depth=5,
    min_samples_split=10,
    random_state=42
)
final_model.fit(X_train_scaled, y_train_scaled.ravel())

# Predictions
y_pred_scaled = final_model.predict(X_test_scaled)
y_pred = scaler_y.inverse_transform(y_pred_scaled.reshape(-1, 1))

# Calculate metrics
r2_final = r2_score(y_test, y_pred)
mse_final = mean_squared_error(y_test, y_pred)
mae_final = mean_absolute_error(y_test, y_pred)
rmse_final = np.sqrt(mse_final)

# Get today's data (last row of test data)
today_data = data_clean.iloc[-1:].copy()
today_features = today_data[selected_features]
today_features_scaled = scaler_X.transform(today_features)

# Predict today's groundwater level
today_gw_pred_scaled = final_model.predict(today_features_scaled)
today_gw_pred = scaler_y.inverse_transform(today_gw_pred_scaled.reshape(-1, 1))[0][0]

# Get today's actual rainfall
today_rainfall = today_data['rainfall_mm'].values[0]

# Calculate z-score for today's water level
gw_mean = data_clean['Groundwatelevel_m'].mean()
gw_std = data_clean['Groundwatelevel_m'].std()
z_score = (today_gw_pred - gw_mean) / gw_std

# Calculate pulse score (health score 0-100)
# Higher is better (closer to mean water level)
pulse_score = max(0, min(100, 100 - abs(z_score) * 20))

print("\n-----Current Station Status-----")
print(f"Predicted Groundwater Level: {today_gw_pred:.3f} m")
print(f"Today's Rainfall: {today_rainfall:.3f} mm")
print(f"Pulse Score: {pulse_score:.1f}/100")

# Prepare data for Prophet
rainfall_data = data[['date', 'rainfall_mm']].copy()
rainfall_data.columns = ['ds', 'y']

# Create and fit Prophet model
prophet_model = Prophet(
    yearly_seasonality=True,
    weekly_seasonality=True,
    daily_seasonality=False,
    changepoint_prior_scale=0.05
)
prophet_model.fit(rainfall_data)

# Create future dataframe for next 7 days
future = prophet_model.make_future_dataframe(periods=7)
forecast = prophet_model.predict(future)

# Get the forecast for next 7 days
last_date = data['date'].max()
forecast_next_week = forecast[forecast['ds'] > last_date][['ds', 'yhat', 'yhat_lower', 'yhat_upper']]
forecast_next_week.columns = ['date', 'predicted_rainfall', 'rainfall_lower', 'rainfall_upper']

# Predict groundwater levels for next week based on rainfall forecast
# We'll use the average relationship between rainfall and groundwater change
avg_rainfall_effect = np.polyfit(data_clean['rainfall_mm'],
                                 data_clean['Groundwatelevel_m'].diff().fillna(0), 1)[0]

# Initialize next week predictions
next_week_predictions = []
current_gw = today_gw_pred

for _, row in forecast_next_week.iterrows():
    # Calculate groundwater change based on predicted rainfall
    gw_change = avg_rainfall_effect * row['predicted_rainfall']
    current_gw += gw_change
    next_week_predictions.append({
        'date': row['date'],
        'predicted_rainfall': row['predicted_rainfall'],
        'predicted_gw_level': current_gw
    })

next_week_df = pd.DataFrame(next_week_predictions)

# Create data for evaporation vs groundwater change plot
data_clean['gw_change'] = data_clean['Groundwatelevel_m'].diff()
correlation_data = data_clean[['evaporation_mm', 'gw_change']].dropna()
z = np.polyfit(correlation_data['evaporation_mm'], correlation_data['gw_change'], 1)
p = np.poly1d(z)

# Create data for pie chart (7-day water balance)
gw_7day_avg = today_data['gw_rolling_mean_7'].values[0]
rain_7day_total = today_data['rainfall_sum_7'].values[0]
evap_7day_avg = data_clean['evaporation_mm'].tail(7).mean()

labels = ['7-day GW Avg', '7-day Rainfall', '7-day Evaporation']
sizes = [abs(gw_7day_avg), rain_7day_total, evap_7day_avg]
colors = ['#1f77b4', '#2ca02c', '#d62728']

# Create a subplot with 2 rows and 3 columns
fig = make_subplots(
    rows=2, cols=3,
    subplot_titles=(
        "Evaporation Over Time",
        "Effect of Evaporation on Water Level Change",
        "7-day Water Balance Components",
        "Rainfall Forecast for Next Week",
        "Groundwater Forecast for Next Week",
        "Station Status Indicator"
    ),
    specs=[
        [{"type": "scatter"}, {"type": "scatter"}, {"type": "pie"}],
        [{"type": "scatter"}, {"type": "scatter"}, {"type": "indicator"}]
    ]
)

# Plot 1: Evaporation over time (including today)
fig.add_trace(
    go.Scatter(
        x=data_clean['date'],
        y=data_clean['evaporation_mm'],
        mode='lines',
        name='Historical Evaporation',
        hovertemplate='Date: %{x|%Y-%m-%d}<br>Evaporation: %{y:.3f} mm<extra></extra>',
        line=dict(color='blue', width=2)
    ),
    row=1, col=1
)

fig.add_trace(
    go.Scatter(
        x=[data_clean['date'].iloc[-1]],
        y=[today_data['evaporation_mm'].values[0]],
        mode='markers',
        name="Today's Evaporation",
        hovertemplate=f"Today's Evaporation: {today_data['evaporation_mm'].values[0]:.3f} mm<extra></extra>",
        marker=dict(color='red', size=10)
    ),
    row=1, col=1
)

# Plot 2: Effect of evaporation on water level change
fig.add_trace(
    go.Scatter(
        x=correlation_data['evaporation_mm'],
        y=correlation_data['gw_change'],
        mode='markers',
        name='Data Points',
        hovertemplate='Evaporation: %{x:.2f} mm<br>GW Change: %{y:.3f} m<extra></extra>',
        marker=dict(size=6, opacity=0.6)
    ),
    row=1, col=2
)

# Add trend line
fig.add_trace(
    go.Scatter(
        x=correlation_data['evaporation_mm'],
        y=p(correlation_data['evaporation_mm']),
        mode='lines',
        name='Trend Line',
        hovertemplate='Trend: GW Change = %{y:.3f} m<extra></extra>',
        line=dict(color='red', width=2, dash='dash')
    ),
    row=1, col=2
)

# Plot 3: Pie chart of gw_rolling_mean_7 vs rainfall_sum_7
fig.add_trace(
    go.Pie(
        labels=labels,
        values=sizes,
        name="7-day Balance",
        hovertemplate='%{label}: %{value:.2f}<br>Percentage: %{percent}<extra></extra>',
        marker=dict(colors=colors)
    ),
    row=1, col=3
)

# Plot 4: Rainfall forecast for next week
fig.add_trace(
    go.Scatter(
        x=forecast_next_week['date'],
        y=forecast_next_week['predicted_rainfall'],
        mode='lines+markers',
        name='Predicted Rainfall',
        hovertemplate='Date: %{x|%Y-%m-%d}<br>Predicted Rainfall: %{y:.2f} mm<extra></extra>',
        line=dict(color='blue', width=3)
    ),
    row=2, col=1
)

# Add uncertainty interval
fig.add_trace(
    go.Scatter(
        x=forecast_next_week['date'],
        y=forecast_next_week['rainfall_upper'],
        mode='lines',
        name='Upper Bound',
        line=dict(width=0),
        showlegend=False,
        hovertemplate='Upper Bound: %{y:.2f} mm<extra></extra>'
    ),
    row=2, col=1
)

fig.add_trace(
    go.Scatter(
        x=forecast_next_week['date'],
        y=forecast_next_week['rainfall_lower'],
        mode='lines',
        name='Lower Bound',
        fill='tonexty',
        line=dict(width=0),
        showlegend=False,
        hovertemplate='Lower Bound: %{y:.2f} mm<extra></extra>'
    ),
    row=2, col=1
)

# Plot 5: Groundwater level forecast for next week
fig.add_trace(
    go.Scatter(
        x=next_week_df['date'],
        y=next_week_df['predicted_gw_level'],
        mode='lines+markers',
        name='Predicted Groundwater',
        hovertemplate='Date: %{x|%Y-%m-%d}<br>Predicted GW: %{y:.3f} m<extra></extra>',
        line=dict(color='purple', width=3)
    ),
    row=2, col=2
)

fig.add_trace(
    go.Scatter(
        x=[next_week_df['date'].iloc[0], next_week_df['date'].iloc[-1]],
        y=[today_gw_pred, today_gw_pred],
        mode='lines',
        name='Current Level',
        hovertemplate=f'Current Level: {today_gw_pred:.3f} m<extra></extra>',
        line=dict(color='red', width=2, dash='dash')
    ),
    row=2, col=2
)

# Plot 6: Station status indicator
fig.add_trace(
    go.Indicator(
        mode="gauge+number",
        value=pulse_score,
        title={'text': "Station Pulse Score"},
        gauge={
            'axis': {'range': [0, 100]},
            'bar': {'color': "darkblue"},
            'steps': [
                {'range': [0, 20], 'color': "darkred"},
                {'range': [20, 40], 'color': "red"},
                {'range': [40, 60], 'color': "orange"},
                {'range': [60, 80], 'color': "yellow"},
                {'range': [80, 100], 'color': "green"}
            ]
        }
    ),
    row=2, col=3
)

# Update layout for better appearance
fig.update_layout(
    height=800,
    width=1200,
    title_text="Groundwater Monitoring Dashboard",
    showlegend=True,
    hovermode='closest'
)

# Update axes labels
fig.update_xaxes(title_text="Date", row=1, col=1)
fig.update_yaxes(title_text="Evaporation (mm)", row=1, col=1)
fig.update_xaxes(title_text="Evaporation (mm)", row=1, col=2)
fig.update_yaxes(title_text="Water Level Change (m)", row=1, col=2)
fig.update_xaxes(title_text="Date", row=2, col=1)
fig.update_yaxes(title_text="Rainfall (mm)", row=2, col=1)
fig.update_xaxes(title_text="Date", row=2, col=2)
fig.update_yaxes(title_text="Groundwater Level (m)", row=2, col=2)

# Show the interactive plot
fig.show()

# Print detailed summary
print("\n----Station Summary----")
print(f"Today's Date: {today_data['date'].dt.strftime('%Y-%m-%d').values[0]}")
print(f"Predicted Groundwater Level: {today_gw_pred:.3f} m below surface")
print(f"7-day Average Groundwater Level: {today_data['gw_rolling_mean_7'].values[0]:.3f} m")
print(f"Today's Rainfall: {today_rainfall:.3f} mm")
print(f"7-day Total Rainfall: {today_data['rainfall_sum_7'].values[0]:.3f} mm")
print(f"Today's Evaporation: {today_data['evaporation_mm'].values[0]:.3f} mm")
print(f"Pulse Score: {pulse_score:.1f}/100")

# Interpretation of pulse score
if pulse_score >= 80:
    health_status = "EXCELLENT"
elif pulse_score >= 60:
    health_status = "GOOD"
elif pulse_score >= 40:
    health_status = "FAIR"
elif pulse_score >= 20:
    health_status = "POOR"
else:
    health_status = "CRITICAL"

print("\n----Alert---- ")
print(f"Health Status: {health_status}")

# Add this function to determine station color and alerts
def get_station_status(pulse_score):
    """Determine station color and alert level based on pulse score"""
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

    return color, alert_level, message

# Add this function to simulate sending alerts
def send_alert(station_id, alert_level, message, pulse_score):
    """Simulate sending an alert to a station"""
    print(f"ALERT SENT to Station {station_id}:")
    print(f"Level: {alert_level}")
    print(f"Score: {pulse_score:.1f}/100")
    print(f"Message: {message}")
    print("-" * 50)

    # In a real implementation, you would:
    # 1. Send email/SMS to station operators
    # 2. Update dashboard status
    # 3. Log the alert in a database
    # 4. Trigger any automated responses

# Determine station color and alert
station_color, alert_level, alert_message = get_station_status(pulse_score)

# Print station status
print(f"Station Color: {station_color.upper()}")
print(f"Alert Level: {alert_level}")
print(f"Alert Message: {alert_message}")

# Send alert if needed (not in green/normal status)
if station_color != "green":
    # Assuming you have a station ID - you might need to add this to your data
    station_id = "GW-001"  # Replace with actual station identifier
    send_alert(station_id, alert_level, alert_message, pulse_score)