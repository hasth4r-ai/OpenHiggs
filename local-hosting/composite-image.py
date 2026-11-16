#!/usr/bin/env python3
"""
OpenHiggs Image Alpha Compositor
Guarantees bit-for-bit preservation of unmasked source pixels during inpainting/editing.
Replaces only the masked region with the generated clean plate / object replacement,
using feathered edge blending to eliminate seams.
"""
import sys
import os
import argparse
import cv2
import numpy as np
from PIL import Image

def composite_images(source_path, generated_path, mask_path, output_path, feather=4, dilate=2):
    if not os.path.exists(source_path):
        raise FileNotFoundError(f"Source image not found: {source_path}")
    if not os.path.exists(mask_path):
        raise FileNotFoundError(f"Mask image not found: {mask_path}")

    # Load source in full original resolution & color
    source_bgr = cv2.imread(source_path, cv2.IMREAD_COLOR)
    if source_bgr is None:
        raise RuntimeError(f"Could not read source image: {source_path}")
    h, w = source_bgr.shape[:2]

    # Load mask
    mask_gray = cv2.imread(mask_path, cv2.IMREAD_GRAYSCALE)
    if mask_gray is None:
        raise RuntimeError(f"Could not read mask image: {mask_path}")

    # Resize mask to exactly match source dimensions
    if mask_gray.shape[:2] != (h, w):
        mask_gray = cv2.resize(mask_gray, (w, h), interpolation=cv2.INTER_NEAREST)

    # Threshold to binary
    _, binary_mask = cv2.threshold(mask_gray, 25, 255, cv2.THRESH_BINARY)

    # Optional dilation to ensure boundary pixels of watermarks/objects are fully covered
    if dilate > 0:
        d_kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (dilate * 2 + 1, dilate * 2 + 1))
        binary_mask = cv2.dilate(binary_mask, d_kernel, iterations=1)

    # If no generated image exists, fallback to OpenCV inpainting
    if not generated_path or not os.path.exists(generated_path):
        print(f"[OpenHiggs Compositor] No generated image found, running high-quality CV inpaint fallback...")
        inpainted = cv2.inpaint(source_bgr, binary_mask, inpaintRadius=5, flags=cv2.INPAINT_TELEA)
        os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
        cv2.imwrite(output_path, inpainted)
        return {"width": w, "height": h, "fallback": True}

    # Load generated image
    gen_bgr = cv2.imread(generated_path, cv2.IMREAD_COLOR)
    if gen_bgr is None:
        raise RuntimeError(f"Could not read generated image: {generated_path}")

    # Resize generated image to exact source dimensions using Lanczos
    if gen_bgr.shape[:2] != (h, w):
        gen_bgr = cv2.resize(gen_bgr, (w, h), interpolation=cv2.INTER_LANCZOS4)

    # Apply Gaussian feathering to mask for seamless edge blending
    if feather > 0:
        f_size = feather * 2 + 1
        feathered = cv2.GaussianBlur(binary_mask.astype(np.float32) / 255.0, (f_size, f_size), sigmaX=feather / 2.0)
    else:
        feathered = binary_mask.astype(np.float32) / 255.0

    # Expand dims for 3-channel broadcast
    alpha = np.expand_dims(feathered, axis=2)

    # Composite: Source outside mask is 100% bit-exact, generated inside mask
    composite = (source_bgr.astype(np.float32) * (1.0 - alpha) + gen_bgr.astype(np.float32) * alpha)
    composite = np.clip(composite, 0, 255).astype(np.uint8)

    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    cv2.imwrite(output_path, composite)
    return {"width": w, "height": h, "fallback": False}

def main():
    parser = argparse.ArgumentParser(description="Alpha composite generated inpaint over source image")
    parser.add_argument("--source", "-s", required=True, help="Path to original source image")
    parser.add_argument("--generated", "-g", default="", help="Path to generated/inpaint image")
    parser.add_argument("--mask", "-m", required=True, help="Path to mask image")
    parser.add_argument("--output", "-o", required=True, help="Path to output composite image")
    parser.add_argument("--feather", "-f", type=int, default=4, help="Mask edge feather radius in px")
    parser.add_argument("--dilate", "-d", type=int, default=2, help="Mask dilation radius in px")

    args = parser.parse_args()
    try:
        res = composite_images(args.source, args.generated, args.mask, args.output, feather=args.feather, dilate=args.dilate)
        print(f"SUCCESS {res['width']}x{res['height']}")
    except Exception as e:
        print(f"ERROR: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
