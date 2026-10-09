#!/usr/bin/env python3
"""
BrSE OS Desktop Agent (Proof of Concept)
Cho phép AI bao trùm toàn bộ hệ điều hành (VSCode, Word, Excel, Desktop...).
Cách hoạt động:
1. Chạy ngầm dưới background.
2. Lắng nghe phím tắt toàn cục (Global Hotkey), ví dụ: Ctrl+Alt+Space.
3. Khi bấm phím tắt, copy text đang bôi đen (từ bất kỳ app nào).
4. Gửi lên BrSE OS API proxy (localhost:3010).
5. Hiển thị kết quả bằng một cửa sổ popup (Tkinter) trên màn hình.

Yêu cầu: pip install keyboard pyperclip requests
"""

import os
import sys
import threading
import time
import tkinter as tk
from tkinter import scrolledtext

try:
    import keyboard
    import pyperclip
    import requests
except ImportError:
    print("Vui lòng cài đặt thư viện: pip install keyboard pyperclip requests")
    sys.exit(1)

API_URL = os.environ.get("BRSE_DESKTOP_API_URL", "http://127.0.0.1:3010/api/ai/chat")
SECRET_TOKEN = os.environ.get("BRSE_API_SECRET", "").strip()

class FloatingWidget(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("BrSE AI Desktop")
        self.geometry("450x350+100+100")
        self.overrideredirect(True) # Bỏ viền cửa sổ
        self.attributes("-topmost", True) # Luôn nằm trên cùng
        self.configure(bg="#1a1b26") # Tokyo Night Theme
        
        # Header (để kéo thả)
        self.header = tk.Frame(self, bg="#16161e", height=30, cursor="fleur")
        self.header.pack(fill=tk.X)
        self.header.bind("<ButtonPress-1>", self.start_move)
        self.header.bind("<B1-Motion>", self.do_move)
        
        lbl_title = tk.Label(self.header, text="✨ BrSE OS Desktop", bg="#16161e", fg="#7aa2f7", font=("Segoe UI", 10, "bold"))
        lbl_title.pack(side=tk.LEFT, padx=10, pady=5)
        
        btn_close = tk.Button(self.header, text="✕", bg="#16161e", fg="#a9b1d6", bd=0, command=self.withdraw)
        btn_close.pack(side=tk.RIGHT, padx=10)
        
        # Content
        self.text_area = scrolledtext.ScrolledText(self, bg="#24283b", fg="#c0caf5", font=("Segoe UI", 11), bd=0, padx=10, pady=10)
        self.text_area.pack(fill=tk.BOTH, expand=True, padx=1, pady=(0,1))
        
        # Bottom Actions
        self.footer = tk.Frame(self, bg="#16161e", height=40)
        self.footer.pack(fill=tk.X)
        btn_copy = tk.Button(self.footer, text="📋 Copy", bg="#7aa2f7", fg="white", bd=0, command=self.copy_result)
        btn_copy.pack(side=tk.RIGHT, padx=10, pady=5)
        
        self.withdraw() # Ẩn đi khi mới chạy

    def start_move(self, event):
        self.x = event.x
        self.y = event.y

    def do_move(self, event):
        deltax = event.x - self.x
        deltay = event.y - self.y
        x = self.winfo_x() + deltax
        y = self.winfo_y() + deltay
        self.geometry(f"+{x}+{y}")
        
    def copy_result(self):
        pyperclip.copy(self.text_area.get(1.0, tk.END).strip())

    def show_loading(self, original_text):
        self.text_area.delete(1.0, tk.END)
        self.text_area.insert(tk.END, f"Đang phân tích đoạn văn bản:\n{original_text[:50]}...\n\nXin chờ AI...")
        # Lấy vị trí chuột hiện tại để hiển thị popup ngay cạnh chuột
        x, y = self.winfo_pointerxy()
        self.geometry(f"+{x+10}+{y+10}")
        self.deiconify()

    def update_result(self, result):
        self.text_area.delete(1.0, tk.END)
        self.text_area.insert(tk.END, result)

# Global App Instance
app = None

def call_ai(text):
    headers = {"Content-Type": "application/json"}
    if SECRET_TOKEN:
        headers["X-BrSE-Token"] = SECRET_TOKEN
    payload = {"message": f"Hãy đóng vai BrSE. Dịch và giải thích đoạn văn bản sau, kèm phiên âm Hiragana nếu là tiếng Nhật:\n{text}"}
    try:
        res = requests.post(API_URL, json=payload, headers=headers, timeout=15)
        res.raise_for_status()
        data = res.json()
        app.update_result(data.get("reply") or data.get("response") or "Không có dữ liệu trả về.")
    except Exception as e:
        app.update_result(f"Lỗi khi gọi AI: {e}")

def on_hotkey_pressed():
    # Giả lập phím Ctrl+C để copy text đang bôi đen
    keyboard.send('ctrl+c')
    time.sleep(0.1) # Đợi clipboard update
    
    text = pyperclip.paste().strip()
    if text:
        app.show_loading(text)
        # Chạy AI ở luồng riêng để không block UI
        threading.Thread(target=call_ai, args=(text,), daemon=True).start()

def main():
    global app
    app = FloatingWidget()
    
    # Lắng nghe phím tắt toàn cục
    hotkey = "ctrl+alt+space"
    keyboard.add_hotkey(hotkey, on_hotkey_pressed)
    print(f"BrSE Desktop Agent is running! Bôi đen chữ ở bất kỳ đâu và bấm {hotkey} để gọi AI.")
    
    app.mainloop()

if __name__ == "__main__":
    main()
