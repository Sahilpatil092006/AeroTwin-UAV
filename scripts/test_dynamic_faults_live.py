import urllib.request
import json
import time

def check_fleet(sample_num):
    print(f"\n==================== FLEET SAMPLE {sample_num} (t={time.strftime('%X')}) ====================")
    url = "http://127.0.0.1:8000/api/uav/all"
    req = urllib.request.urlopen(url, timeout=5)
    data = json.loads(req.read().decode())
    uavs = data.get("uavs", [])
    for u in uavs:
        uav_id = u.get("uav_id")
        fault_type = u.get("fault_type")
        severity = u.get("severity")
        component = u.get("affected_component")
        status = u.get("status")
        duration = u.get("fault_duration")
        next_change = u.get("next_fault_change")
        tel = u.get("engine_telemetry", {})
        cht = tel.get("cht")
        oil_p = tel.get("oil_pressure")
        rpm = tel.get("rpm")
        print(f"[{uav_id}] State: {fault_type:<22} | Comp: {str(component):<32} | Status: {status:<7} | Sev: {severity:<8} | Dur: {duration}s | CHT: {cht}C | OilP: {oil_p}bar | RPM: {rpm}")

if __name__ == "__main__":
    check_fleet(1)
    print("\nWaiting 25 seconds to observe simulated dynamic state transitions...")
    time.sleep(25)
    check_fleet(2)
