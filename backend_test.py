#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for CV Manager Application
Tests all API endpoints with proper authentication and role-based access control
"""

import requests
import json
import uuid
import time
from datetime import datetime

# Configuration
BASE_URL = "https://profile-builder-280.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

# Test data
ADMIN_EMAIL = "sysdrummatic@gmail.com"
ADMIN_PASSWORD = "AdminPass123!"
ADMIN_NAME = "System Admin"

MANAGER_EMAIL = "manager@test.com"
MANAGER_PASSWORD = "ManagerPass123!"
MANAGER_NAME = "Test Manager"

RECRUITER_EMAIL = "recruiter@test.com"
RECRUITER_PASSWORD = "RecruiterPass123!"
RECRUITER_NAME = "Test Recruiter"

USER_EMAIL = "user@test.com"
USER_PASSWORD = "UserPass123!"
USER_NAME = "Test User"

# Global variables for tokens and user IDs
admin_token = None
manager_token = None
recruiter_token = None
user_token = None
admin_user_id = None
manager_user_id = None
recruiter_user_id = None
user_user_id = None
test_cv_id = None

def print_test_result(test_name, success, details=""):
    """Print formatted test results"""
    status = "✅ PASS" if success else "❌ FAIL"
    print(f"{status} {test_name}")
    if details:
        print(f"   Details: {details}")
    print()

def make_request(method, endpoint, data=None, token=None, expected_status=None):
    """Make HTTP request with proper headers"""
    url = f"{API_BASE}/{endpoint}"
    headers = {"Content-Type": "application/json"}
    
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    try:
        if method == "GET":
            response = requests.get(url, headers=headers, timeout=10)
        elif method == "POST":
            response = requests.post(url, headers=headers, json=data, timeout=10)
        elif method == "PUT":
            response = requests.put(url, headers=headers, json=data, timeout=10)
        elif method == "DELETE":
            response = requests.delete(url, headers=headers, timeout=10)
        else:
            raise ValueError(f"Unsupported method: {method}")
        
        # Check expected status if provided
        if expected_status and response.status_code != expected_status:
            return False, f"Expected status {expected_status}, got {response.status_code}: {response.text}"
        
        return True, response
    except Exception as e:
        return False, f"Request failed: {str(e)}"

def test_user_registration():
    """Test user registration endpoint"""
    global admin_token, manager_token, recruiter_token, user_token
    global admin_user_id, manager_user_id, recruiter_user_id, user_user_id
    
    print("=== Testing User Registration ===")
    
    # Test admin registration (should get ADMIN role)
    success, response = make_request("POST", "auth/register", {
        "name": ADMIN_NAME,
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    }, expected_status=200)
    
    if success:
        data = response.json()
        if "token" in data and "user" in data and data["user"]["role"] == "ADMIN":
            admin_token = data["token"]
            admin_user_id = data["user"]["id"]
            print_test_result("Admin Registration", True, f"Admin user created with role: {data['user']['role']}")
        else:
            print_test_result("Admin Registration", False, f"Invalid response structure or role: {data}")
    else:
        print_test_result("Admin Registration", False, response)
    
    # Test manager registration
    success, response = make_request("POST", "auth/register", {
        "name": MANAGER_NAME,
        "email": MANAGER_EMAIL,
        "password": MANAGER_PASSWORD
    }, expected_status=200)
    
    if success:
        data = response.json()
        if "token" in data and "user" in data:
            manager_token = data["token"]
            manager_user_id = data["user"]["id"]
            print_test_result("Manager Registration", True, f"Manager user created with role: {data['user']['role']}")
        else:
            print_test_result("Manager Registration", False, f"Invalid response structure: {data}")
    else:
        print_test_result("Manager Registration", False, response)
    
    # Test recruiter registration
    success, response = make_request("POST", "auth/register", {
        "name": RECRUITER_NAME,
        "email": RECRUITER_EMAIL,
        "password": RECRUITER_PASSWORD
    }, expected_status=200)
    
    if success:
        data = response.json()
        if "token" in data and "user" in data:
            recruiter_token = data["token"]
            recruiter_user_id = data["user"]["id"]
            print_test_result("Recruiter Registration", True, f"Recruiter user created with role: {data['user']['role']}")
        else:
            print_test_result("Recruiter Registration", False, f"Invalid response structure: {data}")
    else:
        print_test_result("Recruiter Registration", False, response)
    
    # Test standard user registration
    success, response = make_request("POST", "auth/register", {
        "name": USER_NAME,
        "email": USER_EMAIL,
        "password": USER_PASSWORD
    }, expected_status=200)
    
    if success:
        data = response.json()
        if "token" in data and "user" in data:
            user_token = data["token"]
            user_user_id = data["user"]["id"]
            print_test_result("Standard User Registration", True, f"Standard user created with role: {data['user']['role']}")
        else:
            print_test_result("Standard User Registration", False, f"Invalid response structure: {data}")
    else:
        print_test_result("Standard User Registration", False, response)
    
    # Test duplicate registration
    success, response = make_request("POST", "auth/register", {
        "name": USER_NAME,
        "email": USER_EMAIL,
        "password": USER_PASSWORD
    }, expected_status=409)
    
    print_test_result("Duplicate Registration Prevention", success, "Should prevent duplicate email registration")
    
    # Test missing fields
    success, response = make_request("POST", "auth/register", {
        "email": "incomplete@test.com"
    }, expected_status=400)
    
    print_test_result("Registration Validation", success, "Should require all fields")

def test_user_login():
    """Test user login endpoint"""
    print("=== Testing User Login ===")
    
    # Test valid login
    success, response = make_request("POST", "auth/login", {
        "email": USER_EMAIL,
        "password": USER_PASSWORD
    }, expected_status=200)
    
    if success:
        data = response.json()
        if "token" in data and "user" in data:
            print_test_result("Valid Login", True, f"Login successful for user: {data['user']['email']}")
        else:
            print_test_result("Valid Login", False, f"Invalid response structure: {data}")
    else:
        print_test_result("Valid Login", False, response)
    
    # Test invalid password
    success, response = make_request("POST", "auth/login", {
        "email": USER_EMAIL,
        "password": "wrongpassword"
    }, expected_status=401)
    
    print_test_result("Invalid Password", success, "Should reject wrong password")
    
    # Test non-existent user
    success, response = make_request("POST", "auth/login", {
        "email": "nonexistent@test.com",
        "password": "password"
    }, expected_status=401)
    
    print_test_result("Non-existent User", success, "Should reject non-existent user")
    
    # Test missing fields
    success, response = make_request("POST", "auth/login", {
        "email": USER_EMAIL
    }, expected_status=400)
    
    print_test_result("Login Validation", success, "Should require all fields")

def test_password_reset():
    """Test password reset endpoint"""
    print("=== Testing Password Reset ===")
    
    new_password = "NewPassword123!"
    
    # Test valid password reset
    success, response = make_request("POST", "auth/reset-password", {
        "email": USER_EMAIL,
        "newPassword": new_password
    }, expected_status=200)
    
    if success:
        data = response.json()
        if "message" in data:
            print_test_result("Valid Password Reset", True, f"Password reset successful: {data['message']}")
            
            # Test login with new password
            success, response = make_request("POST", "auth/login", {
                "email": USER_EMAIL,
                "password": new_password
            }, expected_status=200)
            
            if success:
                global user_token
                user_token = response.json()["token"]
                print_test_result("Login with New Password", True, "Can login with new password")
            else:
                print_test_result("Login with New Password", False, "Cannot login with new password")
        else:
            print_test_result("Valid Password Reset", False, f"Invalid response: {data}")
    else:
        print_test_result("Valid Password Reset", False, response)
    
    # Test reset for non-existent user
    success, response = make_request("POST", "auth/reset-password", {
        "email": "nonexistent@test.com",
        "newPassword": "password123"
    }, expected_status=404)
    
    print_test_result("Reset Non-existent User", success, "Should reject non-existent user")
    
    # Test missing fields
    success, response = make_request("POST", "auth/reset-password", {
        "email": USER_EMAIL
    }, expected_status=400)
    
    print_test_result("Reset Validation", success, "Should require all fields")

def test_auth_me():
    """Test get current user endpoint"""
    print("=== Testing Auth Me ===")
    
    # Test with valid token
    success, response = make_request("GET", "auth/me", token=user_token, expected_status=200)
    
    if success:
        data = response.json()
        if "user" in data and data["user"]["email"] == USER_EMAIL:
            print_test_result("Valid Auth Me", True, f"Retrieved user: {data['user']['email']}")
        else:
            print_test_result("Valid Auth Me", False, f"Invalid user data: {data}")
    else:
        print_test_result("Valid Auth Me", False, response)
    
    # Test without token
    success, response = make_request("GET", "auth/me", expected_status=401)
    
    print_test_result("Auth Me Without Token", success, "Should require authentication")
    
    # Test with invalid token
    success, response = make_request("GET", "auth/me", token="invalid_token", expected_status=401)
    
    print_test_result("Auth Me Invalid Token", success, "Should reject invalid token")

def test_cv_operations():
    """Test CV CRUD operations"""
    global test_cv_id
    print("=== Testing CV Operations ===")
    
    # Test create CV
    cv_data = {
        "title": "Software Engineer CV",
        "data": {
            "personalInfo": {
                "firstName": "John",
                "lastName": "Doe",
                "email": "john.doe@example.com",
                "phone": "+1234567890",
                "address": "123 Main St, City, Country",
                "summary": "Experienced software engineer with 5+ years in web development"
            },
            "experience": [
                {
                    "company": "Tech Corp",
                    "position": "Senior Developer",
                    "startDate": "2020-01",
                    "endDate": "2024-01",
                    "description": "Led development of web applications"
                }
            ],
            "education": [
                {
                    "institution": "University of Technology",
                    "degree": "Bachelor of Computer Science",
                    "startDate": "2016-09",
                    "endDate": "2020-06"
                }
            ],
            "skills": ["JavaScript", "Python", "React", "Node.js"],
            "languages": [
                {"language": "English", "level": "Native"},
                {"language": "Spanish", "level": "Intermediate"}
            ]
        }
    }
    
    success, response = make_request("POST", "cv", cv_data, token=user_token, expected_status=201)
    
    if success:
        data = response.json()
        if "cv" in data and "id" in data["cv"]:
            test_cv_id = data["cv"]["id"]
            print_test_result("Create CV", True, f"CV created with ID: {test_cv_id}")
        else:
            print_test_result("Create CV", False, f"Invalid response structure: {data}")
    else:
        print_test_result("Create CV", False, response)
    
    # Test get user CVs
    success, response = make_request("GET", "cv", token=user_token, expected_status=200)
    
    if success:
        data = response.json()
        if "cvs" in data and len(data["cvs"]) > 0:
            print_test_result("Get User CVs", True, f"Retrieved {len(data['cvs'])} CVs")
        else:
            print_test_result("Get User CVs", False, f"No CVs found: {data}")
    else:
        print_test_result("Get User CVs", False, response)
    
    # Test get specific CV
    if test_cv_id:
        success, response = make_request("GET", f"cv/{test_cv_id}", token=user_token, expected_status=200)
        
        if success:
            data = response.json()
            if "cv" in data and data["cv"]["id"] == test_cv_id:
                print_test_result("Get Specific CV", True, f"Retrieved CV: {data['cv']['title']}")
            else:
                print_test_result("Get Specific CV", False, f"Invalid CV data: {data}")
        else:
            print_test_result("Get Specific CV", False, response)
    
    # Test update CV
    if test_cv_id:
        update_data = {
            "title": "Updated Software Engineer CV",
            "data": cv_data["data"]
        }
        
        success, response = make_request("PUT", f"cv/{test_cv_id}", update_data, token=user_token, expected_status=200)
        
        if success:
            data = response.json()
            if "cv" in data and data["cv"]["title"] == "Updated Software Engineer CV":
                print_test_result("Update CV", True, f"CV updated: {data['cv']['title']}")
            else:
                print_test_result("Update CV", False, f"Update failed: {data}")
        else:
            print_test_result("Update CV", False, response)
    
    # Test unauthorized access to CV
    success, response = make_request("GET", f"cv/{test_cv_id}", token=manager_token, expected_status=403)
    
    print_test_result("Unauthorized CV Access", success, "Should prevent access to other user's CV")
    
    # Test CV operations without authentication
    success, response = make_request("GET", "cv", expected_status=401)
    
    print_test_result("CV Operations Without Auth", success, "Should require authentication")

def test_admin_operations():
    """Test admin user management operations"""
    print("=== Testing Admin Operations ===")
    
    # Test get all users (admin)
    success, response = make_request("GET", "admin/users", token=admin_token, expected_status=200)
    
    if success:
        data = response.json()
        if "users" in data and len(data["users"]) >= 4:  # At least 4 users we created
            print_test_result("Admin Get Users", True, f"Retrieved {len(data['users'])} users")
        else:
            print_test_result("Admin Get Users", False, f"Insufficient users: {data}")
    else:
        print_test_result("Admin Get Users", False, response)
    
    # Test change user role (admin only)
    if manager_user_id:
        success, response = make_request("PUT", f"admin/users/{manager_user_id}/role", 
                                       {"role": "MANAGER"}, token=admin_token, expected_status=200)
        
        if success:
            data = response.json()
            if "message" in data and "user" in data:
                print_test_result("Admin Change Role", True, f"Role changed: {data['message']}")
            else:
                print_test_result("Admin Change Role", False, f"Invalid response: {data}")
        else:
            print_test_result("Admin Change Role", False, response)
    
    # Test unauthorized role change (non-admin)
    if manager_user_id:
        success, response = make_request("PUT", f"admin/users/{manager_user_id}/role", 
                                       {"role": "ADMIN"}, token=user_token, expected_status=403)
        
        print_test_result("Unauthorized Role Change", success, "Should prevent non-admin from changing roles")
    
    # Test admin access without authentication
    success, response = make_request("GET", "admin/users", expected_status=401)
    
    print_test_result("Admin Access Without Auth", success, "Should require authentication")
    
    # Test manager access to admin endpoints
    success, response = make_request("GET", "admin/users", token=manager_token, expected_status=200)
    
    print_test_result("Manager Access to Admin", success, "Manager should have access to user list")

def test_user_deletion():
    """Test user deletion with role restrictions"""
    print("=== Testing User Deletion ===")
    
    # Create a test user to delete
    test_user_email = "deletetest@test.com"
    success, response = make_request("POST", "auth/register", {
        "name": "Delete Test User",
        "email": test_user_email,
        "password": "DeleteTest123!"
    }, expected_status=200)
    
    if success:
        delete_user_id = response.json()["user"]["id"]
        
        # Test admin can delete user
        success, response = make_request("DELETE", f"admin/users/{delete_user_id}", 
                                       token=admin_token, expected_status=200)
        
        if success:
            data = response.json()
            if "message" in data:
                print_test_result("Admin Delete User", True, f"User deleted: {data['message']}")
            else:
                print_test_result("Admin Delete User", False, f"Invalid response: {data}")
        else:
            print_test_result("Admin Delete User", False, response)
    
    # Test unauthorized deletion
    if user_user_id:
        success, response = make_request("DELETE", f"admin/users/{user_user_id}", 
                                       token=recruiter_token, expected_status=403)
        
        print_test_result("Unauthorized User Deletion", success, "Should prevent unauthorized deletion")
    
    # Test self-deletion prevention
    success, response = make_request("DELETE", f"admin/users/{admin_user_id}", 
                                   token=admin_token, expected_status=400)
    
    print_test_result("Self-Deletion Prevention", success, "Should prevent self-deletion")

def test_recruiter_operations():
    """Test recruiter CV browsing operations"""
    print("=== Testing Recruiter Operations ===")
    
    # First, change recruiter role to RECRUITER
    if recruiter_user_id:
        success, response = make_request("PUT", f"admin/users/{recruiter_user_id}/role", 
                                       {"role": "RECRUITER"}, token=admin_token, expected_status=200)
        
        if success:
            print_test_result("Set Recruiter Role", True, "Recruiter role assigned")
        else:
            print_test_result("Set Recruiter Role", False, response)
    
    # Test recruiter can browse all CVs
    success, response = make_request("GET", "recruiter/cvs", token=recruiter_token, expected_status=200)
    
    if success:
        data = response.json()
        if "cvs" in data:
            print_test_result("Recruiter Browse CVs", True, f"Retrieved {len(data['cvs'])} CVs")
        else:
            print_test_result("Recruiter Browse CVs", False, f"Invalid response: {data}")
    else:
        print_test_result("Recruiter Browse CVs", False, response)
    
    # Test unauthorized access to recruiter endpoints
    success, response = make_request("GET", "recruiter/cvs", token=user_token, expected_status=403)
    
    print_test_result("Unauthorized Recruiter Access", success, "Should prevent non-recruiter access")
    
    # Test recruiter access without authentication
    success, response = make_request("GET", "recruiter/cvs", expected_status=401)
    
    print_test_result("Recruiter Access Without Auth", success, "Should require authentication")

def test_edge_cases():
    """Test various edge cases and error conditions"""
    print("=== Testing Edge Cases ===")
    
    # Test invalid CV ID
    success, response = make_request("GET", "cv/invalid-uuid", token=user_token, expected_status=404)
    
    print_test_result("Invalid CV ID", success, "Should handle invalid CV ID")
    
    # Test invalid user ID in admin operations
    success, response = make_request("DELETE", "admin/users/invalid-uuid", 
                                   token=admin_token, expected_status=404)
    
    print_test_result("Invalid User ID", success, "Should handle invalid user ID")
    
    # Test invalid role assignment
    if user_user_id:
        success, response = make_request("PUT", f"admin/users/{user_user_id}/role", 
                                       {"role": "INVALID_ROLE"}, token=admin_token, expected_status=400)
        
        print_test_result("Invalid Role Assignment", success, "Should reject invalid roles")
    
    # Test malformed JSON
    try:
        url = f"{API_BASE}/auth/login"
        headers = {"Content-Type": "application/json"}
        response = requests.post(url, headers=headers, data="invalid json", timeout=10)
        success = response.status_code >= 400
        print_test_result("Malformed JSON", success, "Should handle malformed JSON")
    except:
        print_test_result("Malformed JSON", True, "Request properly rejected")

def cleanup_test_data():
    """Clean up test data"""
    print("=== Cleaning Up Test Data ===")
    
    # Delete test CV
    if test_cv_id and user_token:
        success, response = make_request("DELETE", f"cv/{test_cv_id}", token=user_token, expected_status=200)
        print_test_result("Delete Test CV", success, "Test CV cleaned up")

def run_all_tests():
    """Run all backend tests"""
    print("🚀 Starting Comprehensive Backend API Testing")
    print("=" * 60)
    print(f"Base URL: {BASE_URL}")
    print(f"API Base: {API_BASE}")
    print("=" * 60)
    
    try:
        # Core authentication tests
        test_user_registration()
        test_user_login()
        test_password_reset()
        test_auth_me()
        
        # CV operations tests
        test_cv_operations()
        
        # Admin operations tests
        test_admin_operations()
        test_user_deletion()
        
        # Recruiter operations tests
        test_recruiter_operations()
        
        # Edge cases and error handling
        test_edge_cases()
        
        # Cleanup
        cleanup_test_data()
        
        print("=" * 60)
        print("✅ All backend tests completed!")
        print("=" * 60)
        
    except Exception as e:
        print(f"❌ Test execution failed: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    run_all_tests()