LAN Computer Control

1. Extract this folder on the Linux laptop.
2. Run:
   ./start_lan_control.sh
3. Open the printed http://192.168.1.x:8001 address on your phone.
4. Default PIN: 1234. Change it in start_lan_control.sh.

IMPORTANT:
- This is a powerful remote shell. Commands execute on the laptop.
- Use only on your trusted LAN.
- Do NOT port-forward port 8001 to the Internet.
- This first version uses HTTP and a simple PIN.
- Ordinary shell commands work. A full interactive PTY/WebSocket terminal is a better next version for programs such as Antigravity that need true interactive terminal behavior.
