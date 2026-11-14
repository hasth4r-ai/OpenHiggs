#!/usr/bin/env python3
"""
OpenHiggs Mask Preprocessor
Fills hollow contours, closes gaps, applies convex hull closure, and dilates
to turn line-art / outline masks into solid, artifact-free deletion mattes.
"""
import sys
import os
import argparse
import cv2
import numpy as np

def process_mask_video(input_path, output_path, expand=16, close_size=45, fill_holes=True):
    cap = cv2.VideoCapture(input_path)
    if not cap.isOpened():
        raise RuntimeError(f"Could not open input video: {input_path}")

    fps = cap.get(cv2.CAP_PROP_FPS) or 24.0
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    # Scale kernel sizes relative to 1080p
    scale = max(1.0, min(w, h) / 1080.0)
    c_size = int(round(close_size * scale))
    if c_size % 2 == 0:
        c_size += 1
    
    e_size = int(round(expand * scale))
    if e_size % 2 == 0:
        e_size += 1

    kernel_close = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (max(3, c_size), max(3, c_size)))
    kernel_dilate = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (max(3, e_size), max(3, e_size)))

    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(output_path, fourcc, fps, (w, h), False)

    frame_idx = 0
    while True:
        ret, frame = cap.read()
        if not ret:
            break

        if len(frame.shape) == 3:
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        else:
            gray = frame

        # Threshold to binary
        _, thresh = cv2.threshold(gray, 40, 255, cv2.THRESH_BINARY)
        non_zero = cv2.countNonZero(thresh)

        if non_zero > 0 and fill_holes:
            # Morphological close to bridge stroke gaps
            closed = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel_close)
            # Find external boundary contours
            contours, _ = cv2.findContours(closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            filled = np.zeros_like(thresh)
            min_area = int(100 * (scale ** 2))

            for c in contours:
                area = cv2.contourArea(c)
                if area > min_area:
                    # Fill convex hull to eliminate hollow interiors / strokes
                    hull = cv2.convexHull(c)
                    cv2.drawContours(filled, [hull], -1, 255, -1)
                else:
                    cv2.drawContours(filled, [c], -1, 255, -1)

            # Apply dilation for edge margin
            if expand > 0:
                filled = cv2.dilate(filled, kernel_dilate, iterations=1)
        else:
            filled = thresh

        out.write(filled)
        frame_idx += 1

    cap.release()
    out.release()
    return frame_idx

def main():
    parser = argparse.ArgumentParser(description="Preprocess mask video to solid matte")
    parser.add_argument("--input", "-i", required=True, help="Input mask video")
    parser.add_argument("--output", "-o", required=True, help="Output mask video")
    parser.add_argument("--expand", "-e", type=int, default=16, help="Expansion in pixels")
    parser.add_argument("--close", "-c", type=int, default=45, help="Morphological close size")
    parser.add_argument("--no-fill", action="store_true", help="Do not fill contours")

    args = parser.parse_args()
    frames = process_mask_video(args.input, args.output, expand=args.expand, close_size=args.close, fill_holes=not args.no_fill)
    print(f"Successfully processed {frames} mask frames to {args.output}")

if __name__ == "__main__":
    main()
