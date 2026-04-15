#!/usr/bin/env python3
"""
Final test with correct admin email
"""

import requests
import json

BASE_URL = "https://profile-builder-280.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

def test_with_correct_admin():
    print("=== Testing with Correct Admin Email ===")
    
    # Test with the special admin email
    print("1. Testing with sysdrummatic@gmail.com...")
    response = requests.post(f"{API_BASE}/auth/register", json={
        "name": "System Admin",
        "email": "sysdrummatic@gmail.com",
        "password": "SystemAdmin123!"
    })
    
    if response.status_code == 200:
        admin_data = response.json()
        print(f"✅ Admin registered with role: {admin_data['user']['role']}")
        admin_token = admin_data["token"]
        
        # Test admin functionality
        response = requests.get(f"{API_BASE}/admin/users",
                              headers={"Authorization": f"Bearer {admin_token}"})
        
        if response.status_code == 200:
            users_data = response.json()
            print(f"✅ Admin can access user list: {len(users_data['users'])} users")
        else:
            print(f"❌ Admin access failed: {response.status_code}")
            
    elif response.status_code == 409:
        print("ℹ️ Admin already exists, testing login...")
        response = requests.post(f"{API_BASE}/auth/login", json={
            "email": "sysdrummatic@gmail.com",
            "password": "AdminPass123!"  # From previous test
        })
        
        if response.status_code == 200:
            admin_data = response.json()
            print(f"✅ Admin login successful with role: {admin_data['user']['role']}")
            admin_token = admin_data["token"]
            
            # Test admin functionality
            response = requests.get(f"{API_BASE}/admin/users",
                                  headers={"Authorization": f"Bearer {admin_token}"})
            
            if response.status_code == 200:
                users_data = response.json()
                print(f"✅ Admin can access user list: {len(users_data['users'])} users")
            else:
                print(f"❌ Admin access failed: {response.status_code}")
        else:
            print(f"❌ Admin login failed: {response.status_code}")
    else:
        print(f"❌ Admin registration failed: {response.status_code}")

if __name__ == "__main__":
    test_with_correct_admin()