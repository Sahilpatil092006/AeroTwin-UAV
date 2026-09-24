import urllib.request
import json
import time

def check_live_rtb():
    print("=" * 70)
    print(f"LIVE RTB DECISION ENGINE EVALUATION ({time.strftime('%X')})")
    print("=" * 70)
    for uav in ['UAV-001', 'UAV-002', 'UAV-003', 'UAV-004', 'UAV-005']:
        url = f"http://127.0.0.1:8000/api/rtb/status?uav_id={uav}"
        res = urllib.request.urlopen(url, timeout=5)
        d = json.loads(res.read().decode())
        active = d.get('rtb_active')
        reason = d.get('trigger_reason')
        status = d.get('status')
        dest = d.get('destination', '').replace('_', ' ')
        
        if active:
            print(f"[RTB ACTIVE]   [{uav}] EMERGENCY RTB ACTIVE")
            print(f"    Reason:      {reason}")
            print(f"    Destination: {dest}")
            print(f"    Status:      RETURNING TO BASE")
        else:
            print(f"[RTB INACTIVE] [{uav}] RTB INACTIVE (STANDBY) -> Alert Suppressed")
    print("=" * 70)

if __name__ == '__main__':
    check_live_rtb()
    print("\nWaiting 25 seconds for dynamic engine fault transitions...")
    time.sleep(25)
    check_live_rtb()
