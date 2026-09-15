#!/usr/bin/env python3
"""
AeroTwin-UAV AI Fault Prediction Model Training Pipeline
=========================================================
Trains and validates a multiclass Random Forest classifier to identify aero piston
engine conditions and failure modes from operational telemetry.

Target Classes:
  - NORMAL
  - INJECTOR_ABNORMALITY
  - COOLING_PROBLEM
  - LUBRICATION_PROBLEM
  - MISFIRE
  - SENSOR_ANOMALY

Author: AeroTwin-UAV Architecture Team
"""

import os
import sys
import json
import datetime
import numpy as np
import pandas as pd
import joblib

import sklearn
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    classification_report,
    confusion_matrix
)

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import seaborn as sns

# Ensure standard UTF-8 console output on Windows
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass


# -----------------------------------------------------------------------------
# Configuration & Feature Definitions
# -----------------------------------------------------------------------------
RANDOM_SEED = 42

INPUT_FEATURES = [
    'rpm',
    'throttle',
    'altitude',
    'ambient_temperature',
    'humidity',
    'wind_speed',
    'cht',
    'egt',
    'oil_pressure',
    'oil_temperature',
    'vibration',
    'fuel_flow',
    'engine_load'
]

FORBIDDEN_FEATURES = [
    'engine_health',
    'fault_type',
    'fault_severity',
    'anomaly_score',
    'rul_hours',
    'mission_risk'
]

TARGET_COLUMN = 'fault_type'

EXPECTED_CLASSES = [
    'NORMAL',
    'INJECTOR_ABNORMALITY',
    'COOLING_PROBLEM',
    'LUBRICATION_PROBLEM',
    'MISFIRE',
    'SENSOR_ANOMALY'
]


def main():
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    data_dir = os.path.join(base_dir, 'data', 'synthetic')
    models_dir = os.path.join(base_dir, 'models')
    figures_dir = os.path.join(base_dir, 'docs', 'figures')

    os.makedirs(models_dir, exist_ok=True)
    os.makedirs(figures_dir, exist_ok=True)

    train_path = os.path.join(data_dir, 'train.csv')
    val_path = os.path.join(data_dir, 'validation.csv')
    test_path = os.path.join(data_dir, 'test.csv')

    print("\n" + "=" * 75)
    print(" AEROTWIN-UAV: AI FAULT PREDICTION MODEL TRAINING (BASELINE RF)")
    print("=" * 75)
    print(f"[*] Training Data:   {train_path}")
    print(f"[*] Validation Data: {val_path}")
    print(f"[*] Test Data:       {test_path}")

    # 1. Load Partitions
    if not (os.path.exists(train_path) and os.path.exists(val_path) and os.path.exists(test_path)):
        print("[!] Missing synthetic dataset partitions. Run scripts/generate_dataset.py first.")
        sys.exit(1)

    train_df = pd.read_csv(train_path)
    val_df = pd.read_csv(val_path)
    test_df = pd.read_csv(test_path)

    # 2. Strict Engine-Level Data Leakage Verification
    train_engs = set(train_df['engine_id'].unique())
    val_engs = set(val_df['engine_id'].unique())
    test_engs = set(test_df['engine_id'].unique())

    tv_leakage = train_engs.intersection(val_engs)
    tt_leakage = train_engs.intersection(test_engs)
    vt_leakage = val_engs.intersection(test_engs)

    print("\n[*] Verifying partition exclusivity (Data Leakage Audit)...")
    if tv_leakage or tt_leakage or vt_leakage:
        print("[!] CRITICAL ERROR: Engine-level data leakage detected!")
        if tv_leakage:
            print(f"    Train & Validation Overlap: {tv_leakage}")
        if tt_leakage:
            print(f"    Train & Test Overlap: {tt_leakage}")
        if vt_leakage:
            print(f"    Validation & Test Overlap: {vt_leakage}")
        sys.exit(1)
    else:
        print(f"[OK] Data leakage check PASSED (Train: {len(train_engs)} engs, Val: {len(val_engs)} engs, Test: {len(test_engs)} engs).")

    # 3. Preprocessing & Integrity Checks
    print("\n[*] Performing feature and target preprocessing audits...")
    for name, df in [('Train', train_df), ('Validation', val_df), ('Test', test_df)]:
        # Verify required input features
        for f in INPUT_FEATURES:
            if f not in df.columns:
                print(f"[!] Missing required feature '{f}' in {name} dataset!")
                sys.exit(1)

        # Verify no forbidden target leakage features were accidentally included
        for forbidden in FORBIDDEN_FEATURES:
            if forbidden in INPUT_FEATURES:
                print(f"[!] Target leakage feature '{forbidden}' is in INPUT_FEATURES list!")
                sys.exit(1)

        # Check NaN and Infinite values
        if df[INPUT_FEATURES].isna().any().any():
            print(f"[!] NaN values detected in {name} features!")
            sys.exit(1)

        if np.isinf(df[INPUT_FEATURES].values).any():
            print(f"[!] Infinite values detected in {name} features!")
            sys.exit(1)

    print(f"[OK] Preprocessing checks passed for {len(INPUT_FEATURES)} numerical telemetry features.")

    # Extract X, y
    X_train = train_df[INPUT_FEATURES].astype(np.float64)
    y_train = train_df[TARGET_COLUMN].astype(str)

    X_val = val_df[INPUT_FEATURES].astype(np.float64)
    y_val = val_df[TARGET_COLUMN].astype(str)

    X_test = test_df[INPUT_FEATURES].astype(np.float64)
    y_test = test_df[TARGET_COLUMN].astype(str)

    print(f"[*] Training matrices:   X_train={X_train.shape}, y_train={y_train.shape}")
    print(f"[*] Validation matrices: X_val={X_val.shape}, y_val={y_val.shape}")
    print(f"[*] Test matrices:       X_test={X_test.shape}, y_test={y_test.shape}")

    # 4. Train Random Forest Classifier
    print("\n[*] Training Random Forest Classifier (n_estimators=200, random_state=42, class_weight='balanced')...")
    start_time = datetime.datetime.now()

    rf = RandomForestClassifier(
        n_estimators=200,
        max_depth=22,
        min_samples_split=4,
        min_samples_leaf=2,
        class_weight='balanced',
        random_state=RANDOM_SEED,
        n_jobs=-1
    )
    rf.fit(X_train, y_train)

    train_duration = (datetime.datetime.now() - start_time).total_seconds()
    print(f"[OK] Model training completed in {train_duration:.2f} seconds.")

    # 5. Evaluate on Validation Set
    print("\n[*] Evaluating on Validation Dataset...")
    y_val_pred = rf.predict(X_val)

    val_acc = accuracy_score(y_val, y_val_pred)
    val_prec_macro = precision_score(y_val, y_val_pred, average='macro', zero_division=0)
    val_rec_macro = recall_score(y_val, y_val_pred, average='macro', zero_division=0)
    val_f1_macro = f1_score(y_val, y_val_pred, average='macro', zero_division=0)

    val_prec_weighted = precision_score(y_val, y_val_pred, average='weighted', zero_division=0)
    val_rec_weighted = recall_score(y_val, y_val_pred, average='weighted', zero_division=0)
    val_f1_weighted = f1_score(y_val, y_val_pred, average='weighted', zero_division=0)

    print(f"    Validation Accuracy:          {val_acc * 100:.2f}%")
    print(f"    Validation Macro F1:          {val_f1_macro:.4f} (Precision: {val_prec_macro:.4f}, Recall: {val_rec_macro:.4f})")
    print(f"    Validation Weighted F1:       {val_f1_weighted:.4f} (Precision: {val_prec_weighted:.4f}, Recall: {val_rec_weighted:.4f})")

    # 6. Evaluate on Test Set
    print("\n[*] Evaluating on Final Unseen Test Dataset...")
    y_test_pred = rf.predict(X_test)

    test_acc = accuracy_score(y_test, y_test_pred)
    test_prec_macro = precision_score(y_test, y_test_pred, average='macro', zero_division=0)
    test_rec_macro = recall_score(y_test, y_test_pred, average='macro', zero_division=0)
    test_f1_macro = f1_score(y_test, y_test_pred, average='macro', zero_division=0)

    test_prec_weighted = precision_score(y_test, y_test_pred, average='weighted', zero_division=0)
    test_rec_weighted = recall_score(y_test, y_test_pred, average='weighted', zero_division=0)
    test_f1_weighted = f1_score(y_test, y_test_pred, average='weighted', zero_division=0)

    print(f"    Test Accuracy:                {test_acc * 100:.2f}%")
    print(f"    Test Macro F1:                {test_f1_macro:.4f} (Precision: {test_prec_macro:.4f}, Recall: {test_rec_macro:.4f})")
    print(f"    Test Weighted F1:             {test_f1_weighted:.4f} (Precision: {test_prec_weighted:.4f}, Recall: {test_rec_weighted:.4f})")

    # Classification Report
    class_names = sorted(list(set(y_train.unique()).union(set(y_test.unique()))))
    cls_report = classification_report(y_test, y_test_pred, target_names=class_names, digits=4, output_dict=True)
    cls_report_text = classification_report(y_test, y_test_pred, target_names=class_names, digits=4)
    print("\n=== Detailed Test Classification Report ===")
    print(cls_report_text)

    # 7. Feature Importance Analysis & Plot
    print("[*] Computing Feature Importances...")
    importances = rf.feature_importances_
    feat_series = pd.Series(importances, index=INPUT_FEATURES).sort_values(ascending=True)

    # Dark theme figure
    sns.set_theme(style="darkgrid")
    plt.rcParams.update({
        'figure.facecolor': '#0d131f',
        'axes.facecolor': '#131b2e',
        'axes.edgecolor': '#2a3b5c',
        'axes.labelcolor': '#e2e8f0',
        'xtick.color': '#94a3b8',
        'ytick.color': '#94a3b8',
        'text.color': '#e2e8f0',
        'font.size': 10
    })

    fig, ax = plt.subplots(figsize=(10, 6))
    bars = ax.barh(feat_series.index, feat_series.values, color='#06b6d4', edgecolor='#0f172a')
    ax.set_title("AeroTwin-UAV Fault Classifier: Random Forest Feature Importance", fontsize=12, fontweight='bold', pad=15)
    ax.set_xlabel("Relative Gini Importance Score", fontsize=11)
    ax.set_ylabel("Telemetry Feature", fontsize=11)

    for bar in bars:
        w = bar.get_width()
        ax.text(w + 0.005, bar.get_y() + bar.get_height() / 2, f"{w:.3f}",
                va='center', ha='left', fontsize=9, color='#94a3b8', fontweight='semibold')

    ax.set_xlim(0, max(feat_series.values) * 1.18)
    plt.tight_layout()
    fig_feat_path = os.path.join(figures_dir, '08_fault_feature_importance.png')
    fig.savefig(fig_feat_path, dpi=200)
    plt.close(fig)
    print(f"[OK] Saved: {fig_feat_path}")

    # 8. Confusion Matrix Plot
    print("\n[*] Generating Confusion Matrix Visualization...")
    cm = confusion_matrix(y_test, y_test_pred, labels=class_names)
    cm_norm = cm.astype('float') / cm.sum(axis=1)[:, np.newaxis]

    fig, ax = plt.subplots(figsize=(9, 8))
    sns.heatmap(
        cm_norm,
        annot=True,
        fmt=".2%",
        cmap="Blues",
        xticklabels=class_names,
        yticklabels=class_names,
        square=True,
        cbar_kws={'shrink': 0.8},
        ax=ax,
        annot_kws={'size': 9, 'weight': 'semibold'}
    )
    ax.set_title("AeroTwin-UAV Fault Classifier: Test Confusion Matrix", fontsize=12, fontweight='bold', pad=15)
    ax.set_xlabel("Predicted Fault Condition", fontsize=11, labelpad=10)
    ax.set_ylabel("Ground Truth Condition", fontsize=11, labelpad=10)
    plt.xticks(rotation=30, ha='right', fontsize=9)
    plt.yticks(rotation=0, fontsize=9)
    plt.tight_layout()
    fig_cm_path = os.path.join(figures_dir, '09_fault_confusion_matrix.png')
    fig.savefig(fig_cm_path, dpi=200)
    plt.close(fig)
    print(f"[OK] Saved: {fig_cm_path}")

    # 9. Save Model File and Metadata
    model_output_path = os.path.join(models_dir, 'fault_classifier.joblib')
    metadata_output_path = os.path.join(models_dir, 'fault_classifier_metadata.json')

    print(f"\n[*] Saving model binary to: {model_output_path}...")
    joblib.dump(rf, model_output_path, compress=3)

    metadata = {
        "model_name": "AeroTwin-UAV AI Fault Prediction Model",
        "model_type": "RandomForestClassifier",
        "version": "0.1.0",
        "framework": "scikit-learn",
        "trained_at_utc": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "random_seed": RANDOM_SEED,
        "libraries": {
            "scikit_learn": sklearn.__version__,
            "joblib": joblib.__version__,
            "numpy": np.__version__,
            "pandas": pd.__version__
        },
        "features": INPUT_FEATURES,
        "forbidden_features_excluded": FORBIDDEN_FEATURES,
        "target": TARGET_COLUMN,
        "classes": class_names,
        "hyperparameters": {
            "n_estimators": 200,
            "max_depth": 22,
            "min_samples_split": 4,
            "min_samples_leaf": 2,
            "class_weight": "balanced",
            "random_state": RANDOM_SEED
        },
        "datasets": {
            "train_path": "data/synthetic/train.csv",
            "val_path": "data/synthetic/validation.csv",
            "test_path": "data/synthetic/test.csv",
            "train_rows": len(train_df),
            "val_rows": len(val_df),
            "test_rows": len(test_df),
            "train_engines": len(train_engs),
            "val_engines": len(val_engs),
            "test_engines": len(test_engs)
        },
        "data_leakage_audit": {
            "status": "PASS",
            "train_val_overlap": len(tv_leakage),
            "train_test_overlap": len(tt_leakage),
            "val_test_overlap": len(vt_leakage)
        },
        "validation_metrics": {
            "accuracy": round(float(val_acc), 4),
            "precision_macro": round(float(val_prec_macro), 4),
            "recall_macro": round(float(val_rec_macro), 4),
            "f1_macro": round(float(val_f1_macro), 4),
            "precision_weighted": round(float(val_prec_weighted), 4),
            "recall_weighted": round(float(val_rec_weighted), 4),
            "f1_weighted": round(float(val_f1_weighted), 4)
        },
        "test_metrics": {
            "accuracy": round(float(test_acc), 4),
            "precision_macro": round(float(test_prec_macro), 4),
            "recall_macro": round(float(test_rec_macro), 4),
            "f1_macro": round(float(test_f1_macro), 4),
            "precision_weighted": round(float(test_prec_weighted), 4),
            "recall_weighted": round(float(test_rec_weighted), 4),
            "f1_weighted": round(float(test_f1_weighted), 4),
            "per_class": cls_report
        },
        "feature_importances": feat_series.sort_values(ascending=False).to_dict(),
        "disclaimer": (
            "This model is trained and evaluated on physics-inspired synthetic aero piston engine telemetry "
            "created for the AeroTwin-UAV software research prototype. It is not certified for operational flight hardware."
        )
    }

    with open(metadata_output_path, 'w', encoding='utf-8') as f:
        json.dump(metadata, f, indent=2)

    print(f"[OK] Saved metadata to: {metadata_output_path}")

    # 10. Print Formatted Completion Summary
    top_features = feat_series.sort_values(ascending=False).head(5).index.tolist()

    print("\n" + "=" * 75)
    print(" FAULT PREDICTION MODEL COMPLETE")
    print("=" * 75)
    print("Model:")
    print("Random Forest")
    print("\nClasses:")
    for c in EXPECTED_CLASSES:
        print(f"  - {c}")
    print(f"\nTraining engines:\n{len(train_engs)}")
    print(f"\nValidation engines:\n{len(val_engs)}")
    print(f"\nTest engines:\n{len(test_engs)}")
    print("\nValidation metrics:")
    print(f"Accuracy:  {val_acc * 100:.2f}%")
    print(f"Precision: {val_prec_macro:.4f} (macro) | {val_prec_weighted:.4f} (weighted)")
    print(f"Recall:    {val_rec_macro:.4f} (macro) | {val_rec_weighted:.4f} (weighted)")
    print(f"F1:        {val_f1_macro:.4f} (macro) | {val_f1_weighted:.4f} (weighted)")
    print("\nTest metrics:")
    print(f"Accuracy:  {test_acc * 100:.2f}%")
    print(f"Precision: {test_prec_macro:.4f} (macro) | {test_prec_weighted:.4f} (weighted)")
    print(f"Recall:    {test_rec_macro:.4f} (macro) | {test_rec_weighted:.4f} (weighted)")
    print(f"F1:        {test_f1_macro:.4f} (macro) | {test_f1_weighted:.4f} (weighted)")
    print("\nTop important features:")
    for rank, feat in enumerate(top_features, 1):
        print(f"  {rank}. {feat:<20} (importance: {feat_series[feat]:.4f})")
    print("\nData leakage:\nPASS")
    print(f"\nModel saved:\nmodels/fault_classifier.joblib")
    print("=" * 75 + "\n")


if __name__ == '__main__':
    main()
