#!/usr/bin/env python3
from http.server import HTTPServer, SimpleHTTPRequestHandler
import ssl
import webbrowser
import os
import time
import threading

class CORSRequestHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        # 添加CORS头，允许API请求
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        SimpleHTTPRequestHandler.end_headers(self)
    
    def do_OPTIONS(self):
        # 处理预检请求
        self.send_response(200)
        self.end_headers()

def run_server(port=8000):
    try:
        server_address = ('localhost', port)
        httpd = HTTPServer(server_address, CORSRequestHandler)
        
        print(f"服务器已启动: http://localhost:{port}")
        print("按 Ctrl+C 停止服务器")
        
        httpd.serve_forever()
        
    except KeyboardInterrupt:
        print("\n关闭服务器...")
        httpd.server_close()
    except Exception as e:
        print(f"发生错误: {e}")

if __name__ == '__main__':
    run_server() 