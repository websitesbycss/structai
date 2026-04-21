"""
Train a GradientBoostingRegressor on dataset.csv and save model.joblib.
To retrain on a new dataset (e.g. Option B hand-labeled data), just replace
dataset.csv with your new file and re-run this script.
"""

import pandas as pd
import joblib
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score
from features import FEATURE_COLUMNS


def train():
    print("Loading dataset.csv...")
    df = pd.read_csv('dataset.csv')
    print(f"  {len(df)} rows, score range: {df['score'].min():.3f} – {df['score'].max():.3f}")

    X = df[FEATURE_COLUMNS]
    y = df['score']

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    print("Training GradientBoostingRegressor...")
    model = GradientBoostingRegressor(
        n_estimators=300,
        learning_rate=0.05,
        max_depth=4,
        min_samples_leaf=3,
        subsample=0.8,
        random_state=42,
    )
    model.fit(X_train, y_train)

    preds = model.predict(X_test)
    mae = mean_absolute_error(y_test, preds)
    r2  = r2_score(y_test, preds)
    print(f"  Test MAE: {mae:.4f}   R²: {r2:.4f}")

    joblib.dump(model, 'model.joblib')
    print("Saved model.joblib")

    # Feature importance
    print("\nTop feature importances:")
    importances = sorted(
        zip(FEATURE_COLUMNS, model.feature_importances_),
        key=lambda x: x[1], reverse=True
    )
    for name, imp in importances:
        bar = '#' * int(imp * 40)
        print(f"  {name:<25} {bar} {imp:.4f}")


if __name__ == '__main__':
    train()
