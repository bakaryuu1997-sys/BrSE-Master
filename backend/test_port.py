import socket

def check_port(host, port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(1)
        try:
            s.connect((host, port))
            return True
        except OSError:
            return False

if __name__ == "__main__":
    print(f"3011: {check_port('127.0.0.1', 3011)}")
    print(f"20128: {check_port('127.0.0.1', 20128)}")
