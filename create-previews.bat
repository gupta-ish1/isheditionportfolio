@echo off
setlocal EnableDelayedExpansion

:: ===================================================================
:: ISH EDITION - Automated Video Preview Generator
:: Generates 7-second muted H.264 previews for portfolio references
:: ===================================================================

echo =======================================================
echo       ISH EDITION - VIDEO PREVIEW GENERATOR
echo =======================================================
echo.

:: Check if FFmpeg is installed and accessible
where ffmpeg >nul 2>nul
if errorlevel 1 (
    echo [ERROR] FFmpeg was not found in your system PATH.
    echo Please ensure FFmpeg is installed and available in PATH.
    echo.
    pause
    exit /b 1
)

:: Set canonical paths for input and output directories
set "SCRIPT_DIR=%~dp0"
set "INPUT_DIR=%SCRIPT_DIR%assets\videos\original"
set "OUTPUT_DIR=%SCRIPT_DIR%assets\videos\preview"

:: Canonicalize paths (removes trailing backslashes and resolves relative segments)
for %%I in ("%INPUT_DIR%") do set "INPUT_DIR=%%~fI"
for %%I in ("%OUTPUT_DIR%") do set "OUTPUT_DIR=%%~fI"

:: Verify input directory exists
if not exist "%INPUT_DIR%" (
    echo [ERROR] Input directory not found: "%INPUT_DIR%"
    echo Please verify that the folder 'assets\videos\original' exists.
    echo.
    pause
    exit /b 1
)

:: Ensure base output directory exists
if not exist "%OUTPUT_DIR%" mkdir "%OUTPUT_DIR%"

echo Input Directory:  "%INPUT_DIR%"
echo Output Directory: "%OUTPUT_DIR%"
echo.
echo Scanning category subfolders and generating previews...
echo =======================================================
echo.

:: Initialize processing counters
set /a TOTAL=0
set /a SUCCESS=0
set /a FAILED=0

:: Recursively scan all category folders for video files
for /R "%INPUT_DIR%" %%F in (*.mp4 *.mov *.mkv *.avi *.webm) do (
    if exist "%%~fF" (
        set /a TOTAL+=1

        :: Extract source directory and relative path from INPUT_DIR
        set "FILE_DIR=%%~dpF"
        set "REL_PATH=!FILE_DIR:%INPUT_DIR%=!"
        set "DEST_DIR=%OUTPUT_DIR%!REL_PATH!"

        :: Create matching category subfolder in preview directory if needed
        if not exist "!DEST_DIR!" mkdir "!DEST_DIR!"

        echo [!TOTAL!] Processing: "!REL_PATH!%%~nxF"

        :: Run FFmpeg to generate 7-second muted preview
        ffmpeg -y -ss 0 -i "%%~fF" -t 7 ^
            -vf "scale=720:720:force_original_aspect_ratio=decrease:force_divisible_by=2" ^
            -c:v libx264 -preset veryfast -crf 26 ^
            -an -movflags +faststart ^
            "!DEST_DIR!%%~nF-preview.mp4"

        :: Track success or failure
        if errorlevel 1 (
            echo    --^> [FAILED] Error generating preview for %%~nxF
            set /a FAILED+=1
        ) else (
            echo    --^> [SUCCESS] Saved to "!DEST_DIR!%%~nF-preview.mp4"
            set /a SUCCESS+=1
        )
        echo.
    )
)

:: Summary Report
echo =======================================================
echo                 PROCESSING COMPLETE
echo =======================================================
echo Total Videos Processed: %TOTAL%
echo Successfully Created:   %SUCCESS%
echo Failed:                 %FAILED%
echo =======================================================
echo.
pause
