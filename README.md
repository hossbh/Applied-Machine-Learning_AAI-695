# Applied Machine Learning (AAI-695)

Hands-on machine learning, implemented both from first principles in NumPy and with scikit-learn and TensorFlow. The work progresses from curve fitting to a backpropagation neural network. It ends with a project that predicts the material category of 3D CAD parts.

## Notebooks

| Notebook | What it does | Key result |
|---|---|---|
| [Polynomial Regression and Model Order](01_polynomial.ipynb) | Fits polynomials of order 1–8 to noisy data with `numpy.polyfit`, then studies how noise level and sample size affect accuracy. | Error falls sharply up to order 3 and then levels off. More noise and fewer samples both degrade the fit noticeably. |
| [Linear Regression: Normal Equation vs Gradient Descent](02_linear%20regression.ipynb) | Finds linear-regression coefficients with the closed-form normal equation and with batch and stochastic gradient descent, implemented from scratch. | Batch gradient descent reached a test MSE of 6.6, against 73.9 for the stochastic version. |
| [Decision Trees, Pruning and Random Forests: Titanic Survival](03_decision%20tree.ipynb) | Predicts Titanic survival from class, sex, age and family aboard. | Both the pruned tree and the random forest reach 78 % test accuracy. |
| [Neural Network from Scratch: MNIST Digits](04_neural%20network.ipynb) | A two-hidden-layer (128–64) neural network written in NumPy that classifies handwritten digits. | **97.6 % accuracy** on the 10,000-image MNIST test set. |
| [K-means Clustering from Scratch](05_K-means%20clustering.ipynb) | Implements K-means in NumPy on synthetic 2D data, then clusters MNIST images and compares K with Mini-Batch K-means. | Cluster-based digit labelling improves with K, from 52 % accuracy at K = 10 up to the best result at K = 256. |
| [Diabetes Prediction with a Keras Neural Network](06_diabetes.ipynb) | A dense neural network that predicts diabetes onset from eight clinical measurements in the Pima Indians dataset. | The model reaches 64.9 % test accuracy. |
| [CAD Material Prediction, Phase 1: Data Cleaning](07_MC1_%20Data%20Cleaning.ipynb) | Extracts and cleans part-level features from the Autodesk Fusion 360 Gallery assembly dataset to build a tabular training set. | Produces the cleaned dataset (`datacl.csv`) used in Phase 2. |
| [CAD Material Prediction, Phase 2: Model Comparison](07_MC2%20_Prediction%20Model.ipynb) | Predicts the material category of 3D CAD parts and compares four classifiers. | Random forest performs best, reaching **81 % accuracy** after tuning. |

## Tech stack

Python 3 · Jupyter · `numpy` · `pandas` · `matplotlib` · `seaborn` · `scikit-learn` · `tensorflow` · `tqdm` · `backoff`

## Run it

```bash
pip install -r requirements.txt
jupyter notebook
```

**Data:** the datasets are not included in this repository. You need `Titanic.csv`, the MNIST dataset in IDX `.gz` format, `pima-indians-diabetes.csv` and the Autodesk Fusion 360 Gallery assembly dataset (the cleaned table is `datacl.csv`). Place them next to the notebooks before running.

## About

This work was written by **Hossein Basereh** as part of graduate coursework (AAI-695 Applied Machine Learning) and is shared as a portfolio of applied analysis. If you are taking a similar course, please follow your institution's academic-integrity policy.

## Licence

Copyright © 2023-2026 Hossein Basereh. The code is released under the [MIT License](LICENSE): you may reuse it with attribution, and it is provided "as is", without warranty. Assignment prompts quoted in the notebooks and any third-party datasets remain the property of their original authors and are not covered by this licence.
