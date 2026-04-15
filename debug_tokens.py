#!/usr/bin/env python3
"""
Debug script to investigate token and role issues
"""

import requests
import json

BASE_URL = "https://profile-builder-280.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

ADMIN_EMAIL = "sysdrummatic@gmail.com"
ADMIN_PASSWORD = "AdminPass123!"
RECRUITER_EMAIL = "recruiter@test.com"
RECRUITER_PASSWORD = "RecruiterPass123!"

def debug_tokens():
    print("=== Debugging Token and Role Issues ===")
    
    # Get admin token
    response = requests.post(f"{API_BASE}/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    
    if response.status_code == 200:
        admin_data = response.json()
        admin_token = admin_data["token"]
        print(f"Admin login successful: {admin_data['user']}")
        
        # Get recruiter token
        response = requests.post(f"{API_BASE}/auth/login", json={
            "email": RECRUITER_EMAIL,
            "password": RECRUITER_PASSWORD
        })
        
        if response.status_code == 200:
            recruiter_data = response.json()
            recruiter_token = recruiter_data["token"]
            recruiter_id = recruiter_data["user"]["id"]
            print(f"Recruiter login successful: {recruiter_data['user']}")
            
            # Change recruiter role to RECRUITER
            response = requests.put(f"{API_BASE}/admin/users/{recruiter_id}/role", 
                                  json={"role": "RECRUITER"},
                                  headers={"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"})
            
            if response.status_code == 200:
                print(f"Role change successful: {response.json()}")
                
                # Get fresh token for recruiter after role change
                response = requests.post(f"{API_BASE}/auth/login", json={
                    "email": RECRUITER_EMAIL,
                    "password": RECRUITER_PASSWORD
                })
                
                if response.status_code == 200:
                    new_recruiter_data = response.json()
                    new_recruiter_token = new_recruiter_data["token"]
                    print(f"New recruiter login: {new_recruiter_data['user']}")
                    
                    # Test recruiter CVs access with new token
                    response = requests.get(f"{API_BASE}/recruiter/cvs",
                                          headers={"Authorization": f"Bearer {new_recruiter_token}"})
                    
                    print(f"Recruiter CVs access: Status {response.status_code}")
                    print(f"Response: {response.text}")
                    
                    # Test auth/me to verify token contains correct role
                    response = requests.get(f"{API_BASE}/auth/me",
                                          headers={"Authorization": f"Bearer {new_recruiter_token}"})
                    
                    if response.status_code == 200:
                        print(f"Auth/me for recruiter: {response.json()}")
                    else:
                        print(f"Auth/me failed: {response.status_code} - {response.text}")
                        
                else:
                    print(f"New recruiter login failed: {response.status_code} - {response.text}")
            else:
                print(f"Role change failed: {response.status_code} - {response.text}")
        else:
            print(f"Recruiter login failed: {response.status_code} - {response.text}")
    else:
        print(f"Admin login failed: {response.status_code} - {response.text}")

if __name__ == "__main__":
    debug_tokens()