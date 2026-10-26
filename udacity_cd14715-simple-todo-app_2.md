# 🔍 Code Review Report

## Summary

| Metric | Value |
|--------|-------|
| **Overall Score** | 15/100 |
| **Files Reviewed** | 1 |
| **Critical Issues** | 3 |
| **High Priority Tests** | 6 |
| **Refactoring Opportunities** | 4 |

## 🎯 Top Recommendations

1. 🚨 **security**: SQL injection vulnerability in searchTodos function. User input 'keyword' is directly interpolated into SQL query using template literals without parameterization or escaping.
   - Files: src/todo.ts

2. 🚨 **security**: SQL injection vulnerability in searchTodosByStatus function. User input 'completed' is concatenated directly into SQL query without validation or parameterization.
   - Files: src/todo.ts

3. 🚨 **security**: SQL injection vulnerability in getTodosByUser function. User input 'userId' is directly interpolated into SQL query using template literals without parameterization or sanitization.
   - Files: src/todo.ts

4. 🚨 **test coverage**: Test with malicious input like keyword = "'; DROP TABLE todos; --" to ensure proper escaping or use parameterized queries
   - Files: src/todo.ts

5. 🚨 **test coverage**: Test with malicious input like completed = "1 OR 1=1" to verify input handling and implement parameterized queries
   - Files: src/todo.ts

## 📁 File Details

### 📄 `src/todo.ts`

**Quality Score:** 15/100 | **Coverage:** ~0%

#### Issues (3)
  - Line 119: `critical` SQL injection vulnerability in searchTodos function. User input 'keyword' is directly interpolated into SQL query using template literals without parameterization or escaping.
  - Line 127: `critical` SQL injection vulnerability in searchTodosByStatus function. User input 'completed' is concatenated directly into SQL query without validation or parameterization.
  - Line 136: `critical` SQL injection vulnerability in getTodosByUser function. User input 'userId' is directly interpolated into SQL query using template literals without parameterization or sanitization.


#### Test Gaps (6)
  - `searchTodos` (critical priority)
  - `searchTodosByStatus` (critical priority)

  *...and 4 more*

#### Refactoring Opportunities (4)
  - **pattern-improvement**: Replace vulnerable SQL string interpolation with parameterized query to prevent SQL injection attacks
  - **pattern-improvement**: Replace vulnerable string concatenation with parameterized query and convert status to boolean type

  *...and 2 more*

---

*Generated at 2026-10-26T10:39:27.353Z • Duration: 64712ms*
