@echo off
setlocal
title OpenHiggs - MiniMax H3 Image Inference Server
cd /d "%~dp0\.."

echo ========================================================
echo   OpenHiggs - MiniMax H3 Image Local Inference Server
echo   Model: MiniMax-H3-Image (33.1B DiT)
echo   Hardware: NVIDIA RTX 5070 Ti (16 GB VRAM)
echo   Endpoint: http://127.0.0.1:30000/v1/images/generations
echo   Cache Path: T:\PICTORIAL_ARTIST\ADITH\OPENHIGGS_MODELS
echo ========================================================
echo.

set PYTHON_EXE=C:\pinokio\api\wan.git\app\venv\Scripts\python.exe
if not exist "%PYTHON_EXE%" (
    set PYTHON_EXE=python
)

"%PYTHON_EXE%" "%~dp0\..\openhiggs\engine\serve_minimax_h3_image.py"

pause
