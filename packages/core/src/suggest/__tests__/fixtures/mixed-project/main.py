# Entry point for Python
import os
import sys
from pathlib import Path
from typing import Optional
from utils import helper
from config import load_config


def main():
    config = load_config()
    helper(config)
    print("Running main")


if __name__ == "__main__":
    main()
