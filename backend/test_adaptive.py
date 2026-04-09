import numpy as np
from backend.adaptation import adaptive_layer

# fake image features
image1 = {
    "color": np.random.rand(192).tolist(),
    "shape": np.random.rand(9).tolist(),
    "imageHash": "abcdef1234567890"
}

image2 = {
    "color": np.random.rand(192).tolist(),
    "shape": np.random.rand(9).tolist(),
    "imageHash": "abcdef1234567890"
}

# fake predictions and user corrections
pred1 = np.array([1.0]*13)
corr1 = np.array([2.0]*13)  # user says it should be +1 everywhere

pred2 = np.array([0.5]*13)

print("=== Step 1: Check memory update ===")
adaptive_layer.update(pred1, corr1, image1)
print("Memory size:", len(adaptive_layer.memory))
print("Stored diff:", adaptive_layer.memory[0]["diff"])

print("\n=== Step 2: Check adjustment ===")
adjusted = adaptive_layer.adjust(pred2, image2)
print("Predicted params:", pred2)
print("Adjusted params:", adjusted)
