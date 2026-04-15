#!/usr/bin/env python3
"""
Debug manager access to admin endpoints
"""

import requests
import json

BASE_URL = "https://profile-builder-280.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

ADMIN_EMAIL = "sysdrummatic@gmail.com"
ADMIN_PASSWORD = "AdminPass123!"
MANAGER_EMAIL = "manager@test.com"
MANAGER_PASSWORD = "ManagerPass123!"

def debug_manager_access():
    print("=== Debugging Manager Access ===")
    
    # Get admin token
    response = requests.post(f"{API_BASE}/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    
    if response.status_code == 200:
        admin_data = response.json()
        admin_token = admin_data["token"]
        print(f"Admin login successful: {admin_data['user']}")
        
        # Get manager token
        response = requests.post(f"{API_BASE}/auth/login", json={
            "email": MANAGER_EMAIL,
            "password": MANAGER_PASSWORD
        })
        
        if response.status_code == 200:
            manager_data = response.json()
            manager_token = manager_data["token"]
            manager_id = manager_data["user"]["id"]
            print(f"Manager login successful: {manager_data['user']}")
            
            # Change manager role to MANAGER
            response = requests.put(f"{API_BASE}/admin/users/{manager_id}/role", 
                                  json={"role": "MANAGER"},
                                  headers={"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"})
            
            if response.status_code == 200:
                print(f"Role change successful: {response.json()}")
                
                # Get fresh token for manager after role change
                response = requests.post(f"{API_BASE}/auth/login", json={
                    "email": MANAGER_EMAIL,
                    "password": MANAGER_PASSWORD
                })
                
                if response.status_code == 200:
                    new_manager_data = response.json()
                    new_manager_token = new_manager_data["token"]
                    print(f"New manager login: {new_manager_data['user']}")
                    
                    # Test manager access to admin/users
                    response = requests.get(f"{API_BASE}/admin/users",
                                          headers={"Authorization": f"Bearer {new_manager_token}"})
                    
                    print(f"Manager admin/users access: Status {response.status_code}")
                    if response.status_code == 200:
                        data = response.json()
                        print(f"Retrieved {len(data['users'])} users")
                    else:
                        print(f"Response: {response.text}")
                        
                else:
                    print(f"New manager login failed: {response.status_code} - {response.text}")
            else:
                print(f"Role change failed: {response.status_code} - {response.text}")
        else:
            print(f"Manager login failed: {response.status_code} - {response.text}")
    else:
        print(f"Admin login failed: {response.status_code} - {response.text}")

if __name__ == "__main__":
    debug_manager_access()