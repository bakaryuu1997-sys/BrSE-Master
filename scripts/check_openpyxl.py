import sys
try:
    import openpyxl
    print("openpyxl is available, version:", openpyxl.__version__)
except ImportError:
    print("openpyxl is NOT available in", sys.executable)
