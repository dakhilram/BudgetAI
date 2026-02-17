#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime, timedelta
import uuid

class BudgetPlannerAPITester:
    def __init__(self, base_url="https://expense-ai-31.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_user_email = f"test_{uuid.uuid4().hex[:8]}@example.com"
        self.test_user_password = "TestPass123!"
        self.test_user_name = "Test User"

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None):
        """Run a single API test"""
        url = f"{self.base_url}/api{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {method} {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, params=params)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    if isinstance(response_data, dict) and len(str(response_data)) < 200:
                        print(f"   Response: {response_data}")
                except:
                    pass
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Response text: {response.text[:200]}")

            return success, response.json() if response.content else {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test API health check"""
        return self.run_test("Health Check", "GET", "/", 200)

    def test_register(self):
        """Test user registration"""
        success, response = self.run_test(
            "User Registration",
            "POST",
            "/auth/register",
            200,
            data={
                "email": self.test_user_email,
                "password": self.test_user_password,
                "name": self.test_user_name
            }
        )
        if success and 'token' in response:
            self.token = response['token']
            self.user_id = response['user']['id']
            print(f"   Registered user: {self.test_user_email}")
            return True
        return False

    def test_login(self):
        """Test user login"""
        success, response = self.run_test(
            "User Login",
            "POST",
            "/auth/login",
            200,
            data={
                "email": self.test_user_email,
                "password": self.test_user_password
            }
        )
        if success and 'token' in response:
            self.token = response['token']
            self.user_id = response['user']['id']
            return True
        return False

    def test_get_me(self):
        """Test get current user"""
        success, response = self.run_test("Get Current User", "GET", "/auth/me", 200)
        return success and response.get('email') == self.test_user_email

    def test_categories(self):
        """Test categories endpoints"""
        # Get categories
        success, categories = self.run_test("Get Categories", "GET", "/categories", 200)
        if not success:
            return False
        
        print(f"   Found {len(categories)} default categories")
        
        # Create custom category
        success, new_category = self.run_test(
            "Create Category",
            "POST",
            "/categories",
            200,
            data={
                "name": "Test Category",
                "color": "#ff0000",
                "icon": "test"
            }
        )
        if not success:
            return False
        
        category_id = new_category.get('id')
        if not category_id:
            print("❌ No category ID returned")
            return False
        
        # Update category (should fail for default categories, but work for custom)
        success, _ = self.run_test(
            "Update Category",
            "PUT",
            f"/categories/{category_id}",
            200,
            data={
                "name": "Updated Test Category",
                "color": "#00ff00",
                "icon": "updated"
            }
        )
        if not success:
            return False
        
        # Delete category
        success, _ = self.run_test("Delete Category", "DELETE", f"/categories/{category_id}", 200)
        return success

    def test_transactions(self):
        """Test transaction endpoints"""
        # Create income transaction
        income_data = {
            "type": "income",
            "amount": 5000.0,
            "category": "Salary",
            "description": "Monthly salary",
            "date": datetime.now().strftime('%Y-%m-%d'),
            "notes": "Test income"
        }
        success, income_transaction = self.run_test(
            "Create Income Transaction",
            "POST",
            "/transactions",
            200,
            data=income_data
        )
        if not success:
            return False
        
        income_id = income_transaction.get('id')
        
        # Create expense transaction
        expense_data = {
            "type": "expense",
            "amount": 150.0,
            "category": "Food",
            "description": "Groceries",
            "date": datetime.now().strftime('%Y-%m-%d'),
            "notes": "Weekly shopping"
        }
        success, expense_transaction = self.run_test(
            "Create Expense Transaction",
            "POST",
            "/transactions",
            200,
            data=expense_data
        )
        if not success:
            return False
        
        expense_id = expense_transaction.get('id')
        
        # Get all transactions
        success, transactions = self.run_test("Get All Transactions", "GET", "/transactions", 200)
        if not success or len(transactions) < 2:
            print(f"❌ Expected at least 2 transactions, got {len(transactions) if success else 0}")
            return False
        
        # Get single transaction
        success, transaction = self.run_test(
            "Get Single Transaction",
            "GET",
            f"/transactions/{income_id}",
            200
        )
        if not success:
            return False
        
        # Update transaction
        success, updated_transaction = self.run_test(
            "Update Transaction",
            "PUT",
            f"/transactions/{expense_id}",
            200,
            data={"amount": 200.0, "description": "Updated groceries"}
        )
        if not success:
            return False
        
        # Search transactions
        success, search_results = self.run_test(
            "Search Transactions",
            "GET",
            "/transactions",
            200,
            params={"search": "groceries", "type": "expense"}
        )
        if not success:
            return False
        
        # Delete transaction
        success, _ = self.run_test("Delete Transaction", "DELETE", f"/transactions/{expense_id}", 200)
        return success

    def test_budgets(self):
        """Test budget endpoints"""
        current_month = datetime.now().strftime('%Y-%m')
        
        # Create budget
        budget_data = {
            "category": "Food",
            "amount": 500.0,
            "month": current_month
        }
        success, budget = self.run_test(
            "Create Budget",
            "POST",
            "/budgets",
            200,
            data=budget_data
        )
        if not success:
            return False
        
        budget_id = budget.get('id')
        
        # Get budgets
        success, budgets = self.run_test(
            "Get Budgets",
            "GET",
            "/budgets",
            200,
            params={"month": current_month}
        )
        if not success or len(budgets) < 1:
            print(f"❌ Expected at least 1 budget, got {len(budgets) if success else 0}")
            return False
        
        # Update budget
        success, updated_budget = self.run_test(
            "Update Budget",
            "PUT",
            f"/budgets/{budget_id}",
            200,
            data={"amount": 600.0}
        )
        if not success:
            return False
        
        # Delete budget
        success, _ = self.run_test("Delete Budget", "DELETE", f"/budgets/{budget_id}", 200)
        return success

    def test_dashboard(self):
        """Test dashboard endpoint"""
        current_month = datetime.now().strftime('%Y-%m')
        success, dashboard = self.run_test(
            "Get Dashboard",
            "GET",
            "/dashboard",
            200,
            params={"month": current_month}
        )
        
        if success:
            required_fields = ['total_income', 'total_expenses', 'balance', 'total_budget']
            for field in required_fields:
                if field not in dashboard:
                    print(f"❌ Missing dashboard field: {field}")
                    return False
            print(f"   Dashboard data: Income=${dashboard.get('total_income', 0)}, Expenses=${dashboard.get('total_expenses', 0)}")
        
        return success

    def test_analytics(self):
        """Test analytics endpoint"""
        start_month = (datetime.now() - timedelta(days=90)).strftime('%Y-%m')
        end_month = datetime.now().strftime('%Y-%m')
        
        success, analytics = self.run_test(
            "Get Analytics",
            "GET",
            "/analytics",
            200,
            params={"start_month": start_month, "end_month": end_month}
        )
        
        if success:
            required_fields = ['category_breakdown', 'monthly_trend']
            for field in required_fields:
                if field not in analytics:
                    print(f"❌ Missing analytics field: {field}")
                    return False
        
        return success

    def test_ai_insights_non_pro(self):
        """Test AI insights for non-pro user (should fail)"""
        success, response = self.run_test(
            "AI Insights (Non-Pro)",
            "POST",
            "/ai/insights",
            403,  # Should be forbidden
            data={"months": 3}
        )
        return success  # Success means we got the expected 403

    def test_export_csv(self):
        """Test CSV export"""
        success, _ = self.run_test(
            "Export CSV",
            "GET",
            "/export/csv",
            200,
            params={"month": datetime.now().strftime('%Y-%m')}
        )
        return success

    def test_pin_operations(self):
        """Test PIN operations"""
        # Set PIN
        success, _ = self.run_test(
            "Set PIN",
            "PUT",
            "/auth/pin",
            200,
            data={"pin": "1234"}
        )
        if not success:
            return False
        
        # Verify PIN
        success, _ = self.run_test(
            "Verify PIN",
            "POST",
            "/auth/verify-pin",
            200,
            data={"pin": "1234"}
        )
        if not success:
            return False
        
        # Verify wrong PIN
        success, _ = self.run_test(
            "Verify Wrong PIN",
            "POST",
            "/auth/verify-pin",
            401,  # Should fail
            data={"pin": "9999"}
        )
        return success  # Success means we got expected 401

def main():
    print("🚀 Starting Budget Planner API Tests")
    print("=" * 50)
    
    tester = BudgetPlannerAPITester()
    
    # Test sequence
    tests = [
        ("Health Check", tester.test_health_check),
        ("User Registration", tester.test_register),
        ("User Login", tester.test_login),
        ("Get Current User", tester.test_get_me),
        ("Categories CRUD", tester.test_categories),
        ("Transactions CRUD", tester.test_transactions),
        ("Budgets CRUD", tester.test_budgets),
        ("Dashboard Data", tester.test_dashboard),
        ("Analytics Data", tester.test_analytics),
        ("AI Insights (Non-Pro)", tester.test_ai_insights_non_pro),
        ("CSV Export", tester.test_export_csv),
        ("PIN Operations", tester.test_pin_operations),
    ]
    
    failed_tests = []
    
    for test_name, test_func in tests:
        print(f"\n📋 Running {test_name} tests...")
        try:
            if not test_func():
                failed_tests.append(test_name)
                print(f"❌ {test_name} tests failed")
            else:
                print(f"✅ {test_name} tests passed")
        except Exception as e:
            failed_tests.append(test_name)
            print(f"❌ {test_name} tests failed with exception: {e}")
    
    # Print summary
    print("\n" + "=" * 50)
    print(f"📊 Test Summary:")
    print(f"   Total API calls: {tester.tests_run}")
    print(f"   Successful calls: {tester.tests_passed}")
    print(f"   Failed calls: {tester.tests_run - tester.tests_passed}")
    print(f"   Success rate: {(tester.tests_passed / tester.tests_run * 100):.1f}%")
    
    if failed_tests:
        print(f"\n❌ Failed test categories: {', '.join(failed_tests)}")
        return 1
    else:
        print(f"\n✅ All test categories passed!")
        return 0

if __name__ == "__main__":
    sys.exit(main())